"""
Subscriptions & Payments API.
GET  /         — текущая подписка + список планов
POST /checkout — создать платёж (mock)
GET  /status   — проверить статус платежа ?payment_id=...
POST /webhook  — обработать webhook от платёжной системы (заглушка)
"""
import json
import os
import uuid
import hashlib
import hmac
import base64
import time
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']
JWT_SECRET = os.environ.get('JWT_SECRET', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

def get_user(event: dict) -> dict | None:
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()
    return verify_jwt(token)

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs     = event.get('queryStringParameters') or {}
    path   = event.get('path', '/')

    # ---- POST /webhook — только для внутреннего использования, требует webhook_secret ----
    if method == 'POST' and path.endswith('/webhook'):
        body = json.loads(event.get('body') or '{}')
        # Проверяем секретный ключ webhook
        webhook_secret = os.environ.get('WEBHOOK_SECRET', '')
        provided_secret = event.get('headers', {}).get('X-Webhook-Secret', '')
        if webhook_secret and provided_secret != webhook_secret:
            return resp(403, {'error': 'Forbidden'})
        payment_id = body.get('payment_id', '')
        new_status = body.get('status', '')
        if not payment_id or new_status not in ('paid', 'failed', 'cancelled'):
            return resp(400, {'error': 'payment_id and status required'})

        conn = get_conn()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT * FROM {SCHEMA}.payments WHERE id = %s", (payment_id,))
        payment = cur.fetchone()
        if not payment:
            conn.close()
            return resp(404, {'error': 'Payment not found'})

        cur.execute(
            f"UPDATE {SCHEMA}.payments SET status = %s, paid_at = CASE WHEN %s = 'paid' THEN now() ELSE NULL END WHERE id = %s",
            (new_status, new_status, payment_id)
        )

        if new_status == 'paid':
            plan_id = payment['plan_id']
            user_id = str(payment['user_id'])
            cur.execute(f"""
                INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, expires_at, updated_at)
                VALUES (%s, %s, 'active', now() + interval '30 days', now())
                ON CONFLICT (user_id) DO UPDATE
                  SET plan = %s, status = 'active',
                      expires_at = now() + interval '30 days',
                      updated_at = now()
            """, (user_id, plan_id, plan_id))

            cur.execute(
                f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta) VALUES (%s, 'payment_success', %s)",
                (user_id, json.dumps({'plan': plan_id, 'amount': payment['amount_rub']}))
            )

        conn.commit()
        conn.close()
        return resp(200, {'ok': True})

    # Остальные роуты требуют авторизации
    user = get_user(event)
    if not user:
        return resp(401, {'error': 'Unauthorized'})

    user_id = user['sub']
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ---- GET / — текущая подписка + планы ----
    if method == 'GET' and not path.endswith('/status'):
        # Планы
        cur.execute(f"SELECT * FROM {SCHEMA}.plans WHERE active = true ORDER BY price_rub")
        plans = [{
            'id': r['id'],
            'name': r['name'],
            'price_rub': r['price_rub'],
            'features': r['features'],
            'server_limit': r['server_limit'],
        } for r in cur.fetchall()]

        # Текущая подписка
        cur.execute(
            f"SELECT * FROM {SCHEMA}.subscriptions WHERE user_id = %s",
            (user_id,)
        )
        sub = cur.fetchone()

        # Последний платёж
        cur.execute(
            f"SELECT * FROM {SCHEMA}.payments WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        )
        last_payment = cur.fetchone()
        conn.close()

        subscription = None
        if sub:
            is_expired = sub['expires_at'] and sub['expires_at'].timestamp() < time.time()
            subscription = {
                'plan': sub['plan'],
                'status': 'expired' if is_expired else sub['status'],
                'expires_at': sub['expires_at'].isoformat() if sub['expires_at'] else None,
            }

        return resp(200, {
            'plans': plans,
            'subscription': subscription or {'plan': 'free', 'status': 'active', 'expires_at': None},
            'last_payment': {
                'id': str(last_payment['id']),
                'status': last_payment['status'],
                'plan_id': last_payment['plan_id'],
                'amount_rub': last_payment['amount_rub'],
                'created_at': last_payment['created_at'].isoformat(),
            } if last_payment else None,
        })

    # ---- GET /status?payment_id=... ----
    if method == 'GET' and path.endswith('/status'):
        payment_id = qs.get('payment_id', '')
        if not payment_id:
            conn.close()
            return resp(400, {'error': 'payment_id required'})

        cur.execute(
            f"SELECT status, plan_id, amount_rub FROM {SCHEMA}.payments WHERE id = %s AND user_id = %s",
            (payment_id, user_id)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return resp(404, {'error': 'Payment not found'})

        return resp(200, {'status': row['status'], 'plan_id': row['plan_id'], 'amount_rub': row['amount_rub']})

    # ---- POST /checkout — создать платёж ----
    if method == 'POST':
        body    = json.loads(event.get('body') or '{}')
        plan_id = body.get('plan_id', '')

        if plan_id == 'free':
            conn.close()
            return resp(400, {'error': 'Бесплатный план не требует оплаты'})

        cur.execute(f"SELECT * FROM {SCHEMA}.plans WHERE id = %s AND active = true", (plan_id,))
        plan = cur.fetchone()
        if not plan:
            conn.close()
            return resp(400, {'error': 'Invalid plan'})

        if plan['price_rub'] <= 0:
            conn.close()
            return resp(400, {'error': 'Этот план нельзя оплатить'})

        payment_id = str(uuid.uuid4())
        cur.execute(
            f"INSERT INTO {SCHEMA}.payments (id, user_id, plan_id, amount_rub, status, provider) VALUES (%s, %s, %s, %s, 'pending', 'mock')",
            (payment_id, user_id, plan_id, plan['price_rub'])
        )
        conn.commit()
        conn.close()

        # Mock: возвращаем URL оплаты (в реальной интеграции — ссылка на платёжную страницу)
        mock_pay_url = f"https://pay.mock.example/checkout/{payment_id}"

        return resp(201, {
            'payment_id': payment_id,
            'amount_rub': plan['price_rub'],
            'plan_id': plan_id,
            'plan_name': plan['name'],
            'pay_url': mock_pay_url,
            'provider': 'mock',
        })

    conn.close()
    return resp(404, {'error': 'Not found'})