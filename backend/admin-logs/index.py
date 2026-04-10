"""
Admin Logs API: audit_logs + connection_sessions.
GET /         — audit logs
GET /sessions — connection sessions
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    path = event.get('path', '/')
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ---- GET /sessions ----
    if path.endswith('/sessions'):
        cur.execute(f"""
            SELECT
                cs.id, cs.status, cs.start_time, cs.end_time,
                cs.bytes_in, cs.bytes_out,
                u.email AS user_email,
                s.name  AS server_name, s.flag AS server_flag
            FROM {SCHEMA}.connection_sessions cs
            JOIN {SCHEMA}.users   u ON u.id = cs.user_id
            JOIN {SCHEMA}.servers s ON s.id = cs.server_id
            ORDER BY cs.start_time DESC
            LIMIT 200
        """)
        rows = cur.fetchall()
        conn.close()
        sessions = [{
            'id': str(r['id']),
            'status': r['status'],
            'start_time': r['start_time'].isoformat(),
            'end_time': r['end_time'].isoformat() if r['end_time'] else None,
            'bytes_in': r['bytes_in'],
            'bytes_out': r['bytes_out'],
            'user': r['user_email'],
            'server': r['server_name'],
            'flag': r['server_flag'],
        } for r in rows]
        return resp(200, {'sessions': sessions})

    # ---- GET / — audit logs ----
    cur.execute(f"""
        SELECT
            al.id, al.action, al.resource, al.ip_address,
            al.meta, al.created_at,
            u.email AS user_email
        FROM {SCHEMA}.audit_logs al
        LEFT JOIN {SCHEMA}.users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT 500
    """)
    rows = cur.fetchall()
    conn.close()

    logs = [{
        'id': str(r['id']),
        'action': r['action'],
        'resource': r['resource'],
        'ip': r['ip_address'],
        'meta': r['meta'],
        'timestamp': r['created_at'].isoformat(),
        'user': r['user_email'],
    } for r in rows]
    return resp(200, {'logs': logs})
