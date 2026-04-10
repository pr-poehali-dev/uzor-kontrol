"""
ЮKassa: создание платежа.
POST / — создать платёж, вернуть confirmation_url
Body: { plan_id: string }
Header: X-Authorization: Bearer <jwt>
"""
import json
import os
import uuid
import hashlib
import hmac as hmac_lib
import base64
import time
import psycopg2
import psycopg2.extras
from urllib.request import urlopen, Request
from urllib.error import HTTPError

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
JWT_SECRET = os.environ.get('JWT_SECRET', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        expected = b64url(hmac_lib.new(JWT_SECRET.encode(), f'{h}.{b}'.encode(), hashlib.sha256).digest())
        if not hmac_lib.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(b + '=='))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    # Auth
    auth = event.get('headers', {}).get('X-Authorization', '')
    user = verify_jwt(auth.removeprefix('Bearer ').strip())
    if not user:
        return resp(401, {'error': 'Unauthorized'})

    shop_id   = os.environ.get('YUKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YUKASSA_SECRET_KEY', '')
    if not shop_id or not secret_key:
        return resp(500, {'error': 'ЮKassa credentials not configured'})

    body    = json.loads(event.get('body') or '{}')
    plan_id = body.get('plan_id', '')

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Проверяем план
    cur.execute(f"SELECT id, name, price_rub FROM {SCHEMA}.plans WHERE id = %s AND active = true", (plan_id,))
    plan = cur.fetchone()
    if not plan:
        conn.close()
        return resp(400, {'error': 'Invalid plan'})

    # Данные пользователя
    cur.execute(f"SELECT email, name FROM {SCHEMA}.users WHERE id = %s", (user['sub'],))
    u = cur.fetchone()
    user_email = u['email'] if u else ''

    amount_rub  = plan['price_rub']
    idempotency = str(uuid.uuid4())
    return_url  = body.get('return_url', os.environ.get('SITE_URL', 'https://example.com') + '?payment=success')

    # Создаём платёж в ЮKassa
    payment_body = json.dumps({
        'amount': {'value': f'{amount_rub:.2f}', 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'return_url': return_url},
        'capture': True,
        'description': f'Подписка {plan["name"]} — NEXTVPN',
        'metadata': {'user_id': user['sub'], 'plan_id': plan_id},
        'receipt': {
            'email': user_email,
            'items': [{
                'description': f'Подписка {plan["name"]} на 30 дней',
                'quantity': '1.00',
                'amount': {'value': f'{amount_rub:.2f}', 'currency': 'RUB'},
                'vat_code': 1,
                'payment_mode': 'full_payment',
                'payment_subject': 'service',
            }]
        }
    }).encode()

    credentials = base64.b64encode(f'{shop_id}:{secret_key}'.encode()).decode()
    req = Request(
        'https://api.yookassa.ru/v3/payments',
        data=payment_body,
        headers={
            'Content-Type':    'application/json',
            'Idempotence-Key': idempotency,
            'Authorization':   f'Basic {credentials}',
        },
        method='POST'
    )

    try:
        with urlopen(req) as r:
            yk_data = json.loads(r.read().decode())
    except HTTPError as e:
        err = e.read().decode()
        conn.close()
        return resp(502, {'error': f'ЮKassa error: {err}'})

    yk_payment_id    = yk_data['id']
    confirmation_url = yk_data['confirmation']['confirmation_url']

    # Сохраняем заказ
    cur.execute(
        f"""INSERT INTO {SCHEMA}.orders
            (order_number, user_id, plan_id, user_name, user_email, amount, status, payment_url)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s)
            RETURNING id""",
        (yk_payment_id, user['sub'], plan_id,
         u['name'] or user_email if u else user_email,
         user_email, amount_rub, confirmation_url)
    )
    conn.commit()
    conn.close()

    return resp(200, {
        'payment_id':        yk_payment_id,
        'confirmation_url':  confirmation_url,
        'amount_rub':        amount_rub,
        'plan_id':           plan_id,
        'plan_name':         plan['name'],
    })
