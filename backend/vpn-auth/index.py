"""
VPN User Auth API.
POST / body: {"action": "login"|"register"|"forgot"|"reset"|"verify"|"resend_verify", ...}
GET  / — проверить токен (me)
"""
import json
import os
import hashlib
import hmac as hmac_lib
import base64
import time
import secrets
import smtplib
import ssl
from email.mime.text import MIMEText
from email.utils import formataddr
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ['JWT_SECRET']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
}

RATE_LIMIT_IP = 10       # max failed attempts per IP per 15 min
RATE_LIMIT_EMAIL = 5     # max failed attempts per email per 15 min
RATE_WINDOW_SEC = 15 * 60


def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def make_jwt(payload: dict) -> str:
    header = b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    body = b64url(json.dumps(payload).encode())
    sig = b64url(hmac_lib.new(JWT_SECRET.encode(), f'{header}.{body}'.encode(), hashlib.sha256).digest())
    return f'{header}.{body}.{sig}'


def verify_jwt(token: str):
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


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def send_email(to_email: str, subject: str, body_html: str) -> bool:
    host = os.environ.get('SMTP_HOST', '')
    port = int(os.environ.get('SMTP_PORT', '0') or 0)
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    from_addr = os.environ.get('SMTP_FROM', user) or user
    if not host or not port or not user or not password:
        print(f'[email] SMTP not configured, would send to={to_email} subject={subject}')
        return False
    msg = MIMEText(body_html, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('NEXTVPN', from_addr))
    msg['To'] = to_email
    try:
        if port == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=10) as s:
                s.login(user, password)
                s.sendmail(from_addr, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=10) as s:
                s.starttls(context=ssl.create_default_context())
                s.login(user, password)
                s.sendmail(from_addr, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f'[email] send error: {e}')
        return False


def check_rate_limit(cur, ip: str, email: str) -> bool:
    """True если можно, False если превышено."""
    if ip:
        cur.execute(
            f"SELECT COUNT(*) AS c FROM {SCHEMA}.auth_attempts "
            f"WHERE ip_address = %s AND success = false AND created_at > now() - interval '15 minutes'",
            (ip,)
        )
        if cur.fetchone()['c'] >= RATE_LIMIT_IP:
            return False
    if email:
        cur.execute(
            f"SELECT COUNT(*) AS c FROM {SCHEMA}.auth_attempts "
            f"WHERE email = %s AND success = false AND created_at > now() - interval '15 minutes'",
            (email,)
        )
        if cur.fetchone()['c'] >= RATE_LIMIT_EMAIL:
            return False
    return True


def log_attempt(cur, ip: str, email: str, action: str, success: bool):
    cur.execute(
        f"INSERT INTO {SCHEMA}.auth_attempts (ip_address, email, action, success) VALUES (%s, %s, %s, %s)",
        (ip, email or None, action, success)
    )


def handler(event: dict, context) -> dict:
    """Auth endpoints: login, register, forgot/reset password, verify email."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()

    if method == 'GET':
        payload = verify_jwt(token)
        if not payload:
            return resp(401, {'error': 'Unauthorized'})
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT u.id, u.email, u.name, u.email_verified, "
            f"       COALESCE(s.plan,'free') AS plan, "
            f"       COALESCE(s.status,'active') AS sub_status, "
            f"       s.expires_at "
            f"FROM {SCHEMA}.users u "
            f"LEFT JOIN {SCHEMA}.subscriptions s ON s.user_id = u.id "
            f"WHERE u.id = %s",
            (payload['sub'],)
        )
        u = cur.fetchone()
        conn.close()
        if not u:
            return resp(401, {'error': 'User not found'})
        sub_status = u['sub_status']
        if u['expires_at'] and u['expires_at'].timestamp() < time.time() and u['plan'] != 'free':
            sub_status = 'expired'
        return resp(200, {
            'id': str(u['id']), 'email': u['email'],
            'name': u['name'] or u['email'].split('@')[0],
            'plan': u['plan'], 'sub_status': sub_status,
            'email_verified': u['email_verified'],
            'expires_at': u['expires_at'].isoformat() if u['expires_at'] else None,
        })

    if method != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    # ---- login ----
    if action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        if not email or not password:
            return resp(400, {'error': 'Email и пароль обязательны'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if not check_rate_limit(cur, ip, email):
            conn.close()
            return resp(429, {'error': 'Слишком много попыток. Попробуйте через 15 минут.'})

        cur.execute(f"SELECT id, email, name, password_hash FROM {SCHEMA}.users WHERE email = %s", (email,))
        u = cur.fetchone()

        if not u or not check_password(password, u['password_hash']):
            log_attempt(cur, ip, email, 'login', False)
            conn.commit()
            conn.close()
            return resp(401, {'error': 'Неверный email или пароль'})

        cur.execute(
            f"SELECT status FROM {SCHEMA}.subscriptions WHERE user_id = %s",
            (str(u['id']),)
        )
        sub = cur.fetchone()
        if sub and sub['status'] == 'blocked':
            log_attempt(cur, ip, email, 'login_blocked', False)
            conn.commit()
            conn.close()
            return resp(403, {'error': 'Аккаунт заблокирован. Свяжитесь с поддержкой.'})

        exp = int(time.time()) + 86400 * 30
        jwt = make_jwt({'sub': str(u['id']), 'email': u['email'], 'exp': exp})

        log_attempt(cur, ip, email, 'login', True)
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
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        name = (body.get('name') or '').strip()

        if not email or '@' not in email:
            return resp(400, {'error': 'Укажите корректный email'})
        if len(password) < 6:
            return resp(400, {'error': 'Пароль минимум 6 символов'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if not check_rate_limit(cur, ip, email):
            conn.close()
            return resp(429, {'error': 'Слишком много попыток. Попробуйте позже.'})

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

        cur.execute(
            f"INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status) VALUES (%s, 'free', 'active') ON CONFLICT (user_id) DO NOTHING",
            (new_id,)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address) VALUES (%s, 'register', %s)",
            (new_id, ip)
        )

        # Verify email token
        verify_token = secrets.token_urlsafe(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.email_verification_tokens (user_id, token_hash, expires_at) "
            f"VALUES (%s, %s, now() + interval '7 days')",
            (new_id, hash_token(verify_token))
        )

        conn.commit()
        conn.close()

        site_url = os.environ.get('SITE_URL', '').rstrip('/')
        verify_url = f'{site_url}/?verify_email={verify_token}' if site_url else ''
        if verify_url:
            send_email(
                email,
                'Подтвердите ваш email — NEXTVPN',
                f'<p>Здравствуйте!</p><p>Спасибо за регистрацию в NEXTVPN.</p>'
                f'<p>Подтвердите email, перейдя по ссылке:</p>'
                f'<p><a href="{verify_url}">{verify_url}</a></p>'
                f'<p>Ссылка действует 7 дней.</p>'
            )

        exp = int(time.time()) + 86400 * 30
        jwt = make_jwt({'sub': new_id, 'email': email, 'exp': exp})
        return resp(201, {'token': jwt, 'name': name or email.split('@')[0], 'email': email})

    # ---- forgot password ----
    if action == 'forgot':
        email = (body.get('email') or '').strip().lower()
        if not email:
            return resp(400, {'error': 'Email обязателен'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if not check_rate_limit(cur, ip, email):
            conn.close()
            return resp(429, {'error': 'Слишком много запросов. Попробуйте позже.'})

        cur.execute(f"SELECT id, email FROM {SCHEMA}.users WHERE email = %s", (email,))
        u = cur.fetchone()

        if u:
            reset_token = secrets.token_urlsafe(32)
            cur.execute(
                f"INSERT INTO {SCHEMA}.password_reset_tokens (user_id, token_hash, expires_at) "
                f"VALUES (%s, %s, now() + interval '1 hour')",
                (str(u['id']), hash_token(reset_token))
            )
            cur.execute(
                f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address) VALUES (%s, 'password_reset_request', %s)",
                (str(u['id']), ip)
            )
            conn.commit()

            site_url = os.environ.get('SITE_URL', '').rstrip('/')
            reset_url = f'{site_url}/?reset_token={reset_token}' if site_url else ''
            if reset_url:
                send_email(
                    email,
                    'Сброс пароля — NEXTVPN',
                    f'<p>Здравствуйте!</p>'
                    f'<p>Вы запросили сброс пароля в NEXTVPN.</p>'
                    f'<p>Перейдите по ссылке, чтобы задать новый пароль:</p>'
                    f'<p><a href="{reset_url}">{reset_url}</a></p>'
                    f'<p>Ссылка действует 1 час. Если вы не запрашивали сброс — просто проигнорируйте письмо.</p>'
                )

        log_attempt(cur, ip, email, 'forgot', True)
        conn.commit()
        conn.close()
        return resp(200, {'ok': True, 'message': 'Если email зарегистрирован — инструкции отправлены'})

    # ---- reset password ----
    if action == 'reset':
        reset_token = body.get('token') or ''
        new_password = body.get('password') or ''
        if not reset_token or len(new_password) < 6:
            return resp(400, {'error': 'Нужен токен и новый пароль минимум 6 символов'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, user_id, expires_at, used_at FROM {SCHEMA}.password_reset_tokens WHERE token_hash = %s",
            (hash_token(reset_token),)
        )
        row = cur.fetchone()
        if not row or row['used_at'] or row['expires_at'].timestamp() < time.time():
            conn.close()
            return resp(400, {'error': 'Токен недействителен или истёк'})

        pw_hash = hash_password(new_password)
        cur.execute(
            f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s",
            (pw_hash, str(row['user_id']))
        )
        cur.execute(
            f"UPDATE {SCHEMA}.password_reset_tokens SET used_at = now() WHERE id = %s",
            (str(row['id']),)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, ip_address) VALUES (%s, 'password_reset_done', %s)",
            (str(row['user_id']), ip)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # ---- verify email ----
    if action == 'verify':
        verify_token = body.get('token') or ''
        if not verify_token:
            return resp(400, {'error': 'Токен обязателен'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, user_id, expires_at, used_at FROM {SCHEMA}.email_verification_tokens WHERE token_hash = %s",
            (hash_token(verify_token),)
        )
        row = cur.fetchone()
        if not row or row['used_at'] or row['expires_at'].timestamp() < time.time():
            conn.close()
            return resp(400, {'error': 'Токен недействителен или истёк'})

        cur.execute(
            f"UPDATE {SCHEMA}.users SET email_verified = true WHERE id = %s",
            (str(row['user_id']),)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.email_verification_tokens SET used_at = now() WHERE id = %s",
            (str(row['id']),)
        )
        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # ---- resend verification ----
    if action == 'resend_verify':
        payload = verify_jwt(token)
        if not payload:
            return resp(401, {'error': 'Unauthorized'})

        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT id, email, email_verified FROM {SCHEMA}.users WHERE id = %s", (payload['sub'],))
        u = cur.fetchone()
        if not u:
            conn.close()
            return resp(404, {'error': 'User not found'})
        if u['email_verified']:
            conn.close()
            return resp(200, {'ok': True, 'already_verified': True})

        verify_token = secrets.token_urlsafe(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.email_verification_tokens (user_id, token_hash, expires_at) "
            f"VALUES (%s, %s, now() + interval '7 days')",
            (str(u['id']), hash_token(verify_token))
        )
        conn.commit()
        conn.close()

        site_url = os.environ.get('SITE_URL', '').rstrip('/')
        verify_url = f'{site_url}/?verify_email={verify_token}' if site_url else ''
        if verify_url:
            send_email(
                u['email'],
                'Подтвердите ваш email — NEXTVPN',
                f'<p>Здравствуйте!</p>'
                f'<p>Подтвердите email, перейдя по ссылке:</p>'
                f'<p><a href="{verify_url}">{verify_url}</a></p>'
                f'<p>Ссылка действует 7 дней.</p>'
            )
        return resp(200, {'ok': True})

    return resp(400, {'error': 'Неизвестное действие'})
