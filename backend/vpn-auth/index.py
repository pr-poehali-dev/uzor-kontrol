"""
VPN User Auth API.
POST / body: {"action": "login"|"register"|"me", ...}
GET  / — проверить токен (me)
"""
import json
import os
import hashlib
import hmac as hmac_lib
import base64
import time
import secrets
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def make_jwt(payload: dict) -> str:
    header = b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    body   = b64url(json.dumps(payload).encode())
    sig    = b64url(hmac_lib.new(JWT_SECRET.encode(), f'{header}.{body}'.encode(), hashlib.sha256).digest())
    return f'{header}.{body}.{sig}'

def verify_jwt(token: str) -> dict | None:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        h, b, sig = parts
        expected = b64url(hmac_lib.new(JWT_SECRET.encode(), f'{h}.{b}'.encode(), hashlib.sha256).digest())
        if not hmac_lib.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(b + '=='))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def hash_password(plain: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return f'pbkdf2:sha256:260000:{salt}:{base64.b64encode(dk).decode()}'

def check_password(plain: str, hashed: str) -> bool:
    if hashed.startswith('pbkdf2:'):
        parts = hashed.split(':')
        if len(parts) != 5:
            return False
        _, _, iters, salt, stored = parts
        dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), int(iters))
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
    ip     = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')
    auth   = event.get('headers', {}).get('X-Authorization', '')
    token  = auth.removeprefix('Bearer ').strip()

    # ---- GET / — проверить токен ----
    if method == 'GET':
        payload = verify_jwt(token)
        if not payload:
            return resp(401, {'error': 'Unauthorized'})
        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, email, name, COALESCE(s.plan,'free') AS plan, COALESCE(s.status,'active') AS sub_status "
            f"FROM {SCHEMA}.users u "
            f"LEFT JOIN {SCHEMA}.subscriptions s ON s.user_id = u.id "
            f"WHERE u.id = %s",
            (payload['sub'],)
        )
        u = cur.fetchone()
        conn.close()
        if not u:
            return resp(401, {'error': 'User not found'})
        return resp(200, {
            'id': str(u['id']), 'email': u['email'],
            'name': u['name'] or u['email'].split('@')[0],
            'plan': u['plan'], 'sub_status': u['sub_status'],
        })

    if method != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    body   = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    # ---- login ----
    if action == 'login':
        email    = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        if not email or not password:
            return resp(400, {'error': 'Email и пароль обязательны'})

        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT id, email, name, password_hash FROM {SCHEMA}.users WHERE email = %s", (email,))
        u = cur.fetchone()

        if not u or not check_password(password, u['password_hash']):
            conn.close()
            return resp(401, {'error': 'Неверный email или пароль'})

        exp   = int(time.time()) + 86400 * 30  # 30 дней
        jwt   = make_jwt({'sub': str(u['id']), 'email': u['email'], 'exp': exp})

        cur.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address) VALUES (%s, 'login', %s)",
            (str(u['id']), ip)
        )
        conn.commit()
        conn.close()

        return resp(200, {
            'token': jwt,
            'name': u['name'] or u['email'].split('@')[0],
            'email': u['email'],
        })

    # ---- register ----
    if action == 'register':
        email    = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        name     = (body.get('name') or '').strip()

        if not email or len(password) < 6:
            return resp(400, {'error': 'Email обязателен, пароль минимум 6 символов'})

        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return resp(409, {'error': 'Пользователь с таким email уже существует'})

        pw_hash = hash_password(password)
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, name, password_hash, is_admin) VALUES (%s, %s, %s, false) RETURNING id",
            (email, name or email.split('@')[0], pw_hash)
        )
        new_id = str(cur.fetchone()['id'])

        # Создаём бесплатную подписку
        cur.execute(
            f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status) VALUES (%s, 'free', 'active') ON CONFLICT (user_id) DO NOTHING",
            (new_id,)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address) VALUES (%s, 'register', %s)",
            (new_id, ip)
        )
        conn.commit()
        conn.close()

        # Автологин после регистрации
        exp = int(time.time()) + 86400 * 30
        jwt = make_jwt({'sub': new_id, 'email': email, 'exp': exp})
        return resp(201, {'token': jwt, 'name': name or email.split('@')[0], 'email': email})

    return resp(400, {'error': 'Неизвестное действие'})
