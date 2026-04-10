"""
Admin Servers API: list servers with health, toggle status.
GET / — все серверы
PUT / body: {"action": "toggle", "server_id": "..."}
"""
import json
import os
import hashlib
import hmac
import base64
import time
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def verify_jwt(token: str) -> dict | None:
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

def require_admin(event: dict) -> bool:
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()
    payload = verify_jwt(token)
    return bool(payload and payload.get('is_admin'))

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if not require_admin(event):
        return resp(401, {'error': 'Unauthorized'})

    method = event.get('httpMethod', 'GET')
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ---- GET / — list servers ----
    if method == 'GET':
        cur.execute(f"""
            SELECT
                s.id, s.name, s.country, s.city, s.flag, s.ip,
                s.load, s.status, s.recommended, s.created_at,
                COALESCE(sh.latency, 0)    AS latency,
                COALESCE(sh.uptime, 100.0) AS uptime,
                COALESCE(sh.last_check, now()) AS last_check,
                COUNT(cs.id) FILTER (WHERE cs.status = 'active') AS connections
            FROM {SCHEMA}.servers s
            LEFT JOIN {SCHEMA}.server_health sh ON sh.server_id = s.id
            LEFT JOIN {SCHEMA}.connection_sessions cs ON cs.server_id = s.id
            GROUP BY s.id, sh.latency, sh.uptime, sh.last_check
            ORDER BY s.name
        """)
        rows = cur.fetchall()
        conn.close()
        servers = [{
            'id': str(r['id']),
            'name': r['name'],
            'country': r['country'],
            'city': r['city'],
            'flag': r['flag'],
            'ip': r['ip'],
            'load': r['load'],
            'status': r['status'],
            'recommended': r['recommended'],
            'latency': r['latency'],
            'uptime': float(r['uptime']),
            'last_check': r['last_check'].isoformat() if r['last_check'] else None,
            'connections': int(r['connections'] or 0),
            'bandwidth': round(int(r['connections'] or 0) * 0.003, 1),
        } for r in rows]
        return resp(200, {'servers': servers})

    # ---- PUT / — toggle server ----
    if method == 'PUT':
        body      = json.loads(event.get('body') or '{}')
        server_id = body.get('server_id', '')

        if not server_id:
            conn.close()
            return resp(400, {'error': 'server_id required'})

        cur.execute(f"SELECT status FROM {SCHEMA}.servers WHERE id = %s", (server_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return resp(404, {'error': 'Server not found'})

        new_status = 'maintenance' if row['status'] == 'online' else 'online'
        cur.execute(f"UPDATE {SCHEMA}.servers SET status = %s WHERE id = %s", (new_status, server_id))
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'status': new_status})

    conn.close()
    return resp(405, {'error': 'Method not allowed'})
