"""
Admin Dashboard: реальная статистика из БД одним запросом.
GET / — stats, servers, recent logs, charts data
"""
import json
import os
import hashlib
import hmac
import base64
import time
from datetime import datetime, timezone, timedelta
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}

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

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # --- Stats ---
    cur.execute(f"SELECT COUNT(*) AS total FROM {SCHEMA}.users WHERE is_admin = false")
    total_users = cur.fetchone()['total']

    cur.execute(f"SELECT COUNT(*) AS cnt FROM {SCHEMA}.users WHERE is_admin = false AND created_at >= now() - interval '7 days'")
    new_users_week = cur.fetchone()['cnt']

    cur.execute(f"SELECT COUNT(*) AS cnt FROM {SCHEMA}.connection_sessions WHERE status = 'active'")
    active_connections = cur.fetchone()['cnt']

    cur.execute(f"SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'online') AS online FROM {SCHEMA}.servers")
    srv = cur.fetchone()
    total_servers  = srv['total']
    online_servers = srv['online']

    cur.execute(f"SELECT ROUND(AVG(load)) AS avg_load FROM {SCHEMA}.servers WHERE status = 'online'")
    avg_load_row = cur.fetchone()
    avg_load = int(avg_load_row['avg_load'] or 0)

    cur.execute(f"""
        SELECT COUNT(*) AS cnt FROM {SCHEMA}.audit_logs
        WHERE action LIKE '%error%' AND created_at >= now() - interval '24 hours'
    """)
    errors_24h = cur.fetchone()['cnt']

    # --- Servers with health ---
    cur.execute(f"""
        SELECT s.id, s.name, s.country, s.city, s.flag, s.ip, s.load, s.status, s.recommended,
               COALESCE(sh.latency, 0)    AS latency,
               COALESCE(sh.uptime, 100.0) AS uptime,
               COUNT(cs.id) FILTER (WHERE cs.status = 'active') AS connections
        FROM {SCHEMA}.servers s
        LEFT JOIN {SCHEMA}.server_health sh ON sh.server_id = s.id
        LEFT JOIN {SCHEMA}.connection_sessions cs ON cs.server_id = s.id
        GROUP BY s.id, sh.latency, sh.uptime
        ORDER BY s.load DESC
    """)
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
        'connections': int(r['connections'] or 0),
    } for r in cur.fetchall()]

    # --- Server load chart (bar) ---
    server_load_chart = [
        {'name': s['name'], 'load': s['load'], 'flag': s['flag']}
        for s in servers if s['status'] == 'online'
    ]

    # --- Server latency chart ---
    server_latency_chart = sorted(
        [{'name': s['name'], 'latency': s['latency']} for s in servers if s['status'] == 'online'],
        key=lambda x: x['latency']
    )

    # --- Subscriptions breakdown ---
    cur.execute(f"""
        SELECT COALESCE(plan, 'free') AS plan, COUNT(*) AS cnt
        FROM {SCHEMA}.subscriptions
        GROUP BY plan
    """)
    subs_rows = cur.fetchall()
    subs = {r['plan']: int(r['cnt']) for r in subs_rows}
    plan_chart = [
        {'name': 'Free',     'value': subs.get('free', 0)},
        {'name': 'Pro',      'value': subs.get('pro', 0)},
        {'name': 'Business', 'value': subs.get('business', 0)},
    ]

    # --- Activity by hour (last 24h) from audit_logs ---
    cur.execute(f"""
        SELECT
            date_trunc('hour', created_at) AS hour,
            COUNT(*) AS events
        FROM {SCHEMA}.audit_logs
        WHERE created_at >= now() - interval '24 hours'
        GROUP BY hour
        ORDER BY hour
    """)
    activity_raw = {r['hour'].strftime('%H:00'): int(r['events']) for r in cur.fetchall()}

    # Fill all 24 hours
    now_utc = datetime.now(timezone.utc)
    activity_chart = []
    for i in range(23, -1, -1):
        h = (now_utc - timedelta(hours=i)).strftime('%H:00')
        activity_chart.append({'time': h, 'events': activity_raw.get(h, 0)})

    # --- Recent logs ---
    cur.execute(f"""
        SELECT al.action, al.ip_address, al.created_at, al.meta,
               u.email AS user_email
        FROM {SCHEMA}.audit_logs al
        LEFT JOIN {SCHEMA}.users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT 8
    """)
    recent_logs = [{
        'action': r['action'],
        'ip': r['ip_address'],
        'timestamp': r['created_at'].isoformat(),
        'user': r['user_email'],
        'meta': r['meta'],
    } for r in cur.fetchall()]

    conn.close()

    return resp(200, {
        'stats': {
            'total_users': int(total_users),
            'new_users_week': int(new_users_week),
            'active_connections': int(active_connections),
            'total_servers': int(total_servers),
            'online_servers': int(online_servers),
            'avg_load': avg_load,
            'errors_24h': int(errors_24h),
        },
        'servers': servers,
        'charts': {
            'server_load': server_load_chart,
            'server_latency': server_latency_chart,
            'plans': plan_chart,
            'activity': activity_chart,
        },
        'recent_logs': recent_logs,
    })
