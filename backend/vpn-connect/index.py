"""
Управление VPN-подключениями через WireGuard API.
GET  /?list=servers — список серверов
POST / body: {"action": "connect", "server_id": "..."} — создать/получить конфигурацию
POST / body: {"action": "disconnect", "server_id": "..."} — отключиться от сервера
GET  / — список активных конфигураций пользователя
"""
import json
import os
import hashlib
import hmac
import base64
import time
import urllib.request
import urllib.error
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

FRANKFURT_SERVER_ID = 'a383e9f8-a6a1-4c7b-b34f-5e206bb3e122'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
}


def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def verify_jwt(token: str):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        h, b, sig = parts
        expected = b64url(hmac.new(JWT_SECRET.encode(), f'{h}.{b}'.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(b + '=='))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_user(event: dict):
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()
    return verify_jwt(token)


def wg_request(method: str, server_ip: str, path: str, body=None) -> dict:
    api_key = os.environ.get('VPN_SERVER_1_API_KEY', '')
    url = f'http://{server_ip}:51821{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {api_key}')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ''
        raise Exception(f'WireGuard API error {e.code}: {error_body}')
    except urllib.error.URLError as e:
        raise Exception(f'WireGuard API недоступен: {e.reason}')


def get_server_ip(server_id: str):
    if server_id == FRANKFURT_SERVER_ID:
        return os.environ.get('VPN_SERVER_1_IP')
    return None


def is_server_available(server_id: str) -> bool:
    return get_server_ip(server_id) is not None


def check_subscription_active(cur, user_id: str) -> bool:
    """Проверяет что подписка активна и не истекла."""
    cur.execute(
        f"SELECT plan, status, expires_at FROM {SCHEMA}.subscriptions WHERE user_id = %s",
        (user_id,)
    )
    sub = cur.fetchone()
    if not sub:
        return True
    if sub['status'] == 'blocked':
        return False
    if sub['plan'] == 'free':
        return True
    if sub['expires_at'] and sub['expires_at'].timestamp() < time.time():
        return False
    return sub['status'] == 'active'


def check_server_allowed(cur, user_id: str, server_id: str) -> bool:
    """Free пользователь может только к первому (рекомендованному) серверу."""
    cur.execute(
        f"SELECT plan FROM {SCHEMA}.subscriptions WHERE user_id = %s",
        (user_id,)
    )
    sub = cur.fetchone()
    plan = sub['plan'] if sub else 'free'
    if plan in ('premium', 'pro'):
        return True
    cur.execute(
        f"SELECT id FROM {SCHEMA}.servers WHERE recommended = true AND status = 'online' ORDER BY name LIMIT 1"
    )
    rec = cur.fetchone()
    if rec and str(rec['id']) == server_id:
        return True
    cur.execute(
        f"SELECT id FROM {SCHEMA}.servers ORDER BY name LIMIT 1"
    )
    first = cur.fetchone()
    return first and str(first['id']) == server_id


def handle_list_servers(user_id: str) -> dict:
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        f"""SELECT s.id, s.name, s.country, s.city, s.flag, s.load, s.status, s.recommended,
                   COALESCE(h.latency_ms, 0) AS latency
            FROM {SCHEMA}.servers s
            LEFT JOIN LATERAL (
                SELECT latency_ms FROM {SCHEMA}.server_health
                WHERE server_id = s.id ORDER BY checked_at DESC LIMIT 1
            ) h ON true
            ORDER BY s.recommended DESC, s.name"""
    )
    rows = cur.fetchall()
    conn.close()
    servers = []
    for r in rows:
        sid = str(r['id'])
        servers.append({
            'id': sid,
            'name': r['name'],
            'country': r['country'],
            'city': r['city'],
            'flag': r['flag'],
            'latency': int(r['latency']) if r['latency'] else 0,
            'load': r['load'],
            'online': r['status'] == 'online',
            'recommended': r['recommended'],
            'available': is_server_available(sid),
        })
    return resp(200, {'servers': servers})


def handle_connect(user_id: str, server_id: str) -> dict:
    server_ip = get_server_ip(server_id)
    if not server_ip:
        return resp(400, {'error': 'Этот сервер пока не подключен. Попробуйте другой.'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if not check_subscription_active(cur, user_id):
        conn.close()
        return resp(402, {'error': 'Подписка истекла или заблокирована. Продлите подписку в разделе Тарифы.'})

    if not check_server_allowed(cur, user_id, server_id):
        conn.close()
        return resp(403, {'error': 'Этот сервер доступен только на Premium/Pro тарифах.'})

    cur.execute(f"SELECT id, name FROM {SCHEMA}.servers WHERE id = %s", (server_id,))
    server = cur.fetchone()
    if not server:
        conn.close()
        return resp(404, {'error': 'Сервер не найден'})

    cur.execute(
        f"SELECT client_ip, public_key, config_text, created_at FROM {SCHEMA}.vpn_configs "
        f"WHERE user_id = %s AND server_id = %s AND is_active = true",
        (user_id, server_id)
    )
    existing = cur.fetchone()
    if existing:
        conn.close()
        return resp(200, {
            'config': existing['config_text'],
            'client_ip': existing['client_ip'],
            'qr_data': existing['config_text'],
        })

    wg_resp = wg_request('POST', server_ip, '/peer', {'user_id': user_id})

    client_ip = wg_resp.get('client_ip', '')
    public_key = wg_resp.get('public_key', '')
    config_text = wg_resp.get('config', '')

    cur.execute(
        f"INSERT INTO {SCHEMA}.vpn_configs (user_id, server_id, client_ip, public_key, config_text, is_active) "
        f"VALUES (%s, %s, %s, %s, %s, true)",
        (user_id, server_id, client_ip, public_key, config_text)
    )
    cur.execute(
        f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta) VALUES (%s, 'vpn_connect', %s)",
        (user_id, json.dumps({'server_id': server_id, 'server_name': server['name']}))
    )
    conn.commit()
    conn.close()

    return resp(200, {
        'config': config_text,
        'client_ip': client_ip,
        'qr_data': config_text,
    })


def handle_disconnect(user_id: str, server_id: str) -> dict:
    server_ip = get_server_ip(server_id)
    if not server_ip:
        return resp(400, {'error': 'Этот сервер пока не подключен к VPN'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        f"SELECT public_key FROM {SCHEMA}.vpn_configs "
        f"WHERE user_id = %s AND server_id = %s AND is_active = true",
        (user_id, server_id)
    )
    config = cur.fetchone()
    if not config:
        conn.close()
        return resp(404, {'error': 'Активная конфигурация не найдена'})

    try:
        wg_request('DELETE', server_ip, '/peer', {'public_key': config['public_key']})
    except Exception:
        pass

    cur.execute(
        f"UPDATE {SCHEMA}.vpn_configs SET is_active = false "
        f"WHERE user_id = %s AND server_id = %s AND is_active = true",
        (user_id, server_id)
    )
    conn.commit()
    conn.close()

    return resp(200, {'ok': True})


def handle_list(user_id: str) -> dict:
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        f"SELECT server_id, client_ip, config_text, created_at FROM {SCHEMA}.vpn_configs "
        f"WHERE user_id = %s AND is_active = true ORDER BY created_at DESC",
        (user_id,)
    )
    rows = cur.fetchall()
    conn.close()

    configs = [{
        'server_id': str(r['server_id']),
        'client_ip': r['client_ip'],
        'config': r['config_text'],
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows]

    return resp(200, {'configs': configs})


def handler(event: dict, context) -> dict:
    """VPN connect / disconnect / list servers / list configs."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    user = get_user(event)
    if not user:
        return resp(401, {'error': 'Unauthorized'})

    user_id = user['sub']
    qs = event.get('queryStringParameters') or {}

    if method == 'GET':
        if qs.get('list') == 'servers':
            return handle_list_servers(user_id)
        return handle_list(user_id)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')
        server_id = body.get('server_id', '')

        if not server_id:
            return resp(400, {'error': 'server_id обязателен'})

        if action == 'connect':
            return handle_connect(user_id, server_id)

        if action == 'disconnect':
            return handle_disconnect(user_id, server_id)

        return resp(400, {'error': 'Неизвестное действие. Допустимые: connect, disconnect'})

    return resp(405, {'error': 'Method not allowed'})
