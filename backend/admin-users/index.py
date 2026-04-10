"""
Admin Users API: list users, create, block/unblock.
GET  / — список пользователей
POST / body: {"name": "...", "email": "...", "password": "...", "plan": "free|pro|business"}
PUT  / body: {"action": "block"|"unblock", "user_id": "..."}
"""
import json
import os
import hashlib
import hmac
import base64
import time
import secrets
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
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ---- GET / — list users ----
    if method == 'GET':
        cur.execute(f"""
            SELECT
                u.id, u.email, u.name, u.is_admin, u.created_at,
                COALESCE(s.plan, 'free')     AS plan,
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
        users = [{
            'id': str(r['id']),
            'email': r['email'],
            'name': r['name'] or r['email'].split('@')[0],
            'is_admin': r['is_admin'],
            'plan': r['plan'],
            'status': r['subscription_status'],
            'registered_at': r['created_at'].isoformat() if r['created_at'] else None,
            'last_seen': r['last_seen'].isoformat() if r['last_seen'] else None,
            'active_connections': int(r['active_connections'] or 0),
        } for r in rows]
        return resp(200, {'users': users})

    # ---- PUT / — block/unblock ----
    if method == 'PUT':
        body    = json.loads(event.get('body') or '{}')
        action  = body.get('action', '')
        user_id = body.get('user_id', '')

        if action not in ('block', 'unblock', 'set_plan') or not user_id:
            conn.close()
            return resp(400, {'error': 'action and user_id required'})

        if action == 'set_plan':
            new_plan = body.get('plan', 'free')
            if new_plan not in ('free', 'pro', 'business'):
                conn.close()
                return resp(400, {'error': 'plan must be free|pro|business'})
            cur.execute(
                f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status)
                    VALUES (%s, %s, 'active')
                    ON CONFLICT (user_id) DO UPDATE SET plan = %s""",
                (user_id, new_plan, new_plan)
            )
            conn.commit()
            conn.close()
            return resp(200, {'ok': True, 'plan': new_plan})

        new_status = 'blocked' if action == 'block' else 'active'
        cur.execute(
            f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status)
                VALUES (%s, 'free', %s)
                ON CONFLICT (user_id) DO UPDATE SET status = %s""",
            (user_id, new_status, new_status)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'status': new_status})

    # ---- POST / — create user ----
    if method == 'POST':
        body     = json.loads(event.get('body') or '{}')
        email    = (body.get('email') or '').strip().lower()
        name     = (body.get('name') or '').strip()
        password = body.get('password') or ''
        plan     = body.get('plan', 'free')

        if not email or not password:
            conn.close()
            return resp(400, {'error': 'Email and password required'})
        if len(password) < 6:
            conn.close()
            return resp(400, {'error': 'Password must be at least 6 characters'})
        if plan not in ('free', 'pro', 'business'):
            plan = 'free'

        # Check duplicate
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return resp(409, {'error': 'User with this email already exists'})

        # Hash password
        salt    = secrets.token_hex(16)
        dk      = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 260000)
        pw_hash = f'pbkdf2:sha256:260000:{salt}:{base64.b64encode(dk).decode()}'

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, name, password_hash, is_admin) VALUES (%s, %s, %s, false) RETURNING id",
            (email, name or email.split('@')[0], pw_hash)
        )
        new_id = str(cur.fetchone()['id'])

        # Create subscription
        cur.execute(
            f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status) VALUES (%s, %s, 'active')",
            (new_id, plan)
        )
        conn.commit()
        conn.close()
        return resp(201, {'ok': True, 'id': new_id})

    conn.close()
    return resp(405, {'error': 'Method not allowed'})