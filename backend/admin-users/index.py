"""
Admin Users API: list users, block/unblock.
GET  /       — список пользователей с подпиской
PUT  /{id}/block   — заблокировать
PUT  /{id}/unblock — разблокировать
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
        header, body, sig = parts
        expected = b64url(hmac.new(JWT_SECRET.encode(), f'{header}.{body}'.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + '=='))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def require_admin(event: dict) -> dict | None:
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()
    payload = verify_jwt(token)
    if not payload or not payload.get('is_admin'):
        return None
    return payload

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if not require_admin(event):
        return resp(401, {'error': 'Unauthorized'})

    method = event.get('httpMethod', 'GET')
    path   = event.get('path', '/')

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ---- GET / — list users ----
    if method == 'GET':
        cur.execute(f"""
            SELECT
                u.id, u.email, u.name, u.is_admin, u.created_at,
                COALESCE(s.plan, 'free')   AS plan,
                COALESCE(s.status, 'active') AS subscription_status,
                s.expires_at,
                COUNT(cs.id) FILTER (WHERE cs.status = 'active') AS active_connections,
                MAX(al.created_at) AS last_seen
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.subscriptions s ON s.user_id = u.id
            LEFT JOIN {SCHEMA}.connection_sessions cs ON cs.user_id = u.id
            LEFT JOIN {SCHEMA}.audit_logs al ON al.user_id = u.id
            GROUP BY u.id, s.plan, s.status, s.expires_at
            ORDER BY u.created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()

        users = []
        for r in rows:
            users.append({
                'id': str(r['id']),
                'email': r['email'],
                'name': r['name'] or r['email'].split('@')[0],
                'is_admin': r['is_admin'],
                'plan': r['plan'],
                'status': r['subscription_status'],
                'registered_at': r['created_at'].isoformat() if r['created_at'] else None,
                'last_seen': r['last_seen'].isoformat() if r['last_seen'] else None,
                'active_connections': int(r['active_connections'] or 0),
            })
        return resp(200, {'users': users})

    # ---- PUT /{id}/block or /unblock ----
    parts = [p for p in path.split('/') if p]
    if method == 'PUT' and len(parts) >= 2:
        user_id = parts[-2]
        action  = parts[-1]  # 'block' or 'unblock'

        if action not in ('block', 'unblock'):
            conn.close()
            return resp(400, {'error': 'Invalid action'})

        new_status = 'blocked' if action == 'block' else 'active'

        # Upsert subscription status
        cur.execute(
            f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status)
                VALUES (%s, 'free', %s)
                ON CONFLICT (user_id) DO UPDATE SET status = %s""",
            (user_id, new_status, new_status)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'status': new_status})

    conn.close()
    return resp(404, {'error': 'Not found'})
