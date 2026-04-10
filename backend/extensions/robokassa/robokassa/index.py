import json
import os
import hashlib
import hmac as hmac_lib
import base64
import time
import psycopg2
import random
from urllib.parse import urlencode
from datetime import datetime


SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
JWT_SECRET = os.environ.get('JWT_SECRET', '')
ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
}


def calculate_signature(*args) -> str:
    joined = ':'.join(str(a) for a in args)
    return hashlib.md5(joined.encode()).hexdigest()


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
    """
    Создание заказа и ссылки оплаты через Robokassa для подписки VPN.
    POST body: plan_id, user_email, user_name
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': '', 'isBase64Encoded': False}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': HEADERS, 'body': json.dumps({'error': 'Method not allowed'}), 'isBase64Encoded': False}

    # Auth
    auth = event.get('headers', {}).get('X-Authorization', '')
    token = auth.removeprefix('Bearer ').strip()
    user_payload = verify_jwt(token)
    if not user_payload:
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Unauthorized'}), 'isBase64Encoded': False}

    user_id = user_payload['sub']

    merchant_login = os.environ.get('ROBOKASSA_MERCHANT_LOGIN')
    password_1     = os.environ.get('ROBOKASSA_PASSWORD_1')
    if not merchant_login or not password_1:
        return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': 'Robokassa credentials not configured'}), 'isBase64Encoded': False}

    body    = json.loads(event.get('body') or '{}')
    plan_id = body.get('plan_id', '')

    conn = get_conn()
    cur  = conn.cursor()

    # Проверяем план
    cur.execute(f"SELECT id, name, price_rub FROM {SCHEMA}.plans WHERE id = %s AND active = true", (plan_id,))
    plan = cur.fetchone()
    if not plan:
        conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Invalid plan'}), 'isBase64Encoded': False}

    _, plan_name, price_rub = plan
    amount     = float(price_rub)
    amount_str = f"{amount:.2f}"

    # Получаем данные пользователя
    cur.execute(f"SELECT email, name FROM {SCHEMA}.users WHERE id = %s", (user_id,))
    u = cur.fetchone()
    user_email = u[0] if u else ''
    user_name  = u[1] or user_email.split('@')[0] if u else 'User'

    # Генерируем уникальный InvId
    for _ in range(10):
        robokassa_inv_id = random.randint(100000, 2147483647)
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders WHERE robokassa_inv_id = %s", (robokassa_inv_id,))
        if cur.fetchone()[0] == 0:
            break

    order_number = f"VPN-{datetime.now().strftime('%Y%m%d')}-{robokassa_inv_id}"

    # Success/Fail URL — сайт пользователя
    site_url    = body.get('site_url', '')
    success_url = f"{site_url}?payment=success" if site_url else ''
    fail_url    = f"{site_url}?payment=fail" if site_url else ''

    # Подпись
    if success_url and fail_url:
        signature = calculate_signature(
            merchant_login, amount_str, robokassa_inv_id,
            success_url, 'GET', fail_url, 'GET', password_1
        )
    else:
        signature = calculate_signature(merchant_login, amount_str, robokassa_inv_id, password_1)

    params = {
        'MerchantLogin':  merchant_login,
        'OutSum':         amount_str,
        'InvoiceID':      robokassa_inv_id,
        'SignatureValue': signature,
        'Email':          user_email,
        'Culture':        'ru',
        'Description':    f'Подписка {plan_name} — NEXTVPN',
    }
    if success_url:
        params['SuccessUrl2']       = success_url
        params['SuccessUrl2Method'] = 'GET'
    if fail_url:
        params['FailUrl2']       = fail_url
        params['FailUrl2Method'] = 'GET'

    payment_url = f"{ROBOKASSA_URL}?{urlencode(params)}"

    # Сохраняем заказ
    cur.execute(
        f"""INSERT INTO {SCHEMA}.orders
            (order_number, user_id, plan_id, user_name, user_email, amount, robokassa_inv_id, status, payment_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
            RETURNING id""",
        (order_number, user_id, plan_id, user_name, user_email, amount, robokassa_inv_id, payment_url)
    )
    order_id = cur.fetchone()[0]
    conn.commit()
    conn.close()

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps({
            'payment_url':       payment_url,
            'order_id':          order_id,
            'order_number':      order_number,
            'robokassa_inv_id':  robokassa_inv_id,
            'amount':            amount_str,
        }),
        'isBase64Encoded': False
    }
