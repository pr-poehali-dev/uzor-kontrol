"""
Admin authentication: login, logout, verify token.
Все действия через POST / с полем action: login | logout | me
GET / с заголовком X-Authorization — проверка токена
"""
import json
import os
import hashlib
import hmac
import base64
import time
import psycopg2

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
}

def response(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def make_jwt(payload: dict) -> str:
    header = b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    body   = b64url(json.dumps(payload).encode())
    sig    = b64url(hmac.new(JWT_SECRET.encode(), f'{header}.{body}'.encode(), hashlib.sha256).digest())
    return f'{header}.{body}.{sig}'

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

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def check_password(plain: str, hashed: str) -> bool:
    if hashed.startswith('pbkdf2:'):
        parts = hashed.split(':')
        if len(parts) != 5:
            return False
        _, _, iterations, salt, stored = parts
        dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), int(iterations))
        return base64.b64encode(dk).decode() == stored
    try:
        import bcrypt
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')
    auth = event.get('headers', {}).get('X-Authorization', '')
    token_str = auth.removeprefix('Bearer ').strip()

    # ---- GET / — verify token (me) ----
    if method == 'GET':
        payload = verify_jwt(token_str)
        if not payload:
            return response(401, {'error': 'Unauthorized'})
        t_hash = hash_token(token_str)
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT revoked FROM {SCHEMA}.admin_sessions WHERE token_hash = %s", (t_hash,))
        row = cur.fetchone()
        conn.close()
        if not row or row[0]:
            return response(401, {'error': 'Session revoked'})
        return response(200, {
            'id': payload['sub'],
            'email': payload['email'],
            'name': payload.get('name', ''),
            'is_admin': payload.get('is_admin', False),
        })

    if method != 'POST':
        return response(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    # ---- login ----
    if action == 'login':
        email    = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        if not email or not password:
            return response(400, {'error': 'Email and password required'})

        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"SELECT id, email, name, password_hash, is_admin FROM {SCHEMA}.users WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            return response(401, {'error': 'Invalid credentials'})

        uid, db_email, name, pw_hash, is_admin = row

        if not is_admin:
            return response(403, {'error': 'Admin access required'})

        if not check_password(password, pw_hash):
            return response(401, {'error': 'Invalid credentials'})

        exp   = int(time.time()) + 86400
        token = make_jwt({'sub': str(uid), 'email': db_email, 'name': name or db_email, 'is_admin': is_admin, 'exp': exp})
        t_hash = hash_token(token)

        conn2 = get_conn()
        cur2  = conn2.cursor()
        cur2.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (user_id, token_hash, ip_address) VALUES (%s, %s, %s)",
            (str(uid), t_hash, ip)
        )
        cur2.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address, meta) VALUES (%s, 'admin_login', %s, %s)",
            (str(uid), ip, json.dumps({'email': db_email}))
        )
        conn2.commit()
        conn2.close()

        return response(200, {'token': token, 'name': name or db_email, 'email': db_email})

    # ---- logout ----
    if action == 'logout':
        if token_str:
            t_hash = hash_token(token_str)
            conn = get_conn()
            cur  = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.admin_sessions SET revoked = true WHERE token_hash = %s", (t_hash,))
            conn.commit()
            conn.close()
        return response(200, {'ok': True})

    return response(400, {'error': 'Unknown action. Use: login, logout'})
