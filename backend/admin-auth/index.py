"""
Admin authentication: login, logout, verify token.
POST /login  — принять email+password, вернуть JWT
POST /logout — отозвать токен
GET  /me     — проверить токен, вернуть профиль
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

def response(status, body, extra_headers=None):
    headers = {**CORS, 'Content-Type': 'application/json'}
    if extra_headers:
        headers.update(extra_headers)
    return {'statusCode': status, 'headers': headers, 'body': json.dumps(body)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

# --- Minimal JWT (HS256) ---
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

# --- bcrypt via hashlib workaround: use simple pbkdf2 for comparison ---
# Real bcrypt check — we use passlib-compatible hash stored in DB
def check_password(plain: str, hashed: str) -> bool:
    import hashlib as hl
    # Support both bcrypt (from DB seeds) and our pbkdf2
    if hashed.startswith('pbkdf2:'):
        _, _, iterations, salt, stored = hashed.split(':')
        dk = hl.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), int(iterations))
        return base64.b64encode(dk).decode() == stored
    # bcrypt fallback — try via crypt module
    try:
        import bcrypt
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def hash_password(plain: str) -> str:
    import hashlib as hl
    import secrets
    salt = secrets.token_hex(16)
    dk = hl.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return f'pbkdf2:sha256:260000:{salt}:{base64.b64encode(dk).decode()}'

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path   = event.get('path', '/')
    ip     = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')

    # ---- POST /login ----
    if method == 'POST' and path.endswith('/login'):
        body = json.loads(event.get('body') or '{}')
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

        # Issue JWT
        exp = int(time.time()) + 86400  # 24h
        token = make_jwt({'sub': str(uid), 'email': db_email, 'name': name, 'is_admin': is_admin, 'exp': exp})
        t_hash = hash_token(token)

        conn2 = get_conn()
        cur2  = conn2.cursor()
        cur2.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (user_id, token_hash, ip_address) VALUES (%s, %s, %s)",
            (str(uid), t_hash, ip)
        )
        # Log
        cur2.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address, meta) VALUES (%s, 'admin_login', %s, %s)",
            (str(uid), ip, json.dumps({'email': db_email}))
        )
        conn2.commit()
        conn2.close()

        return response(200, {'token': token, 'name': name, 'email': db_email})

    # ---- GET /me ----
    if method == 'GET' and path.endswith('/me'):
        auth = event.get('headers', {}).get('X-Authorization', '')
        token = auth.removeprefix('Bearer ').strip()
        payload = verify_jwt(token)
        if not payload:
            return response(401, {'error': 'Unauthorized'})

        t_hash = hash_token(token)
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(
            f"SELECT revoked FROM {SCHEMA}.admin_sessions WHERE token_hash = %s",
            (t_hash,)
        )
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

    # ---- POST /logout ----
    if method == 'POST' and path.endswith('/logout'):
        auth = event.get('headers', {}).get('X-Authorization', '')
        token = auth.removeprefix('Bearer ').strip()
        if token:
            t_hash = hash_token(token)
            conn = get_conn()
            cur  = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.admin_sessions SET revoked = true WHERE token_hash = %s",
                (t_hash,)
            )
            conn.commit()
            conn.close()
        return response(200, {'ok': True})

    # ---- POST /register (create admin) ----
    if method == 'POST' and path.endswith('/register'):
        # Only allow if no admin exists yet (first-time setup)
        conn = get_conn()
        cur  = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE is_admin = true")
        count = cur.fetchone()[0]
        conn.close()

        if count > 0:
            return response(403, {'error': 'Admin already exists'})

        body  = json.loads(event.get('body') or '{}')
        email = (body.get('email') or '').strip().lower()
        name  = (body.get('name') or 'Admin').strip()
        pw    = body.get('password') or ''

        if not email or len(pw) < 8:
            return response(400, {'error': 'Email and password (8+ chars) required'})

        pw_hash = hash_password(pw)
        conn2 = get_conn()
        cur2  = conn2.cursor()
        cur2.execute(
            f"INSERT INTO {SCHEMA}.users (email, name, password_hash, is_admin) VALUES (%s, %s, %s, true) RETURNING id",
            (email, name, pw_hash)
        )
        uid = cur2.fetchone()[0]
        conn2.commit()
        conn2.close()

        return response(201, {'ok': True, 'id': str(uid)})

    return response(404, {'error': 'Not found'})
