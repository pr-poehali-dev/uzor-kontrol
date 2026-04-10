import json
import os
import hashlib
import psycopg2
from urllib.parse import parse_qs

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/plain'
}


def calculate_signature(*args) -> str:
    joined = ':'.join(str(a) for a in args)
    return hashlib.md5(joined.encode()).hexdigest().upper()


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """
    Result URL webhook от Robokassa.
    При успешной оплате активирует подписку пользователя на 30 дней.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': '', 'isBase64Encoded': False}

    password_2 = os.environ.get('ROBOKASSA_PASSWORD_2')
    if not password_2:
        return {'statusCode': 500, 'headers': HEADERS, 'body': 'Config error', 'isBase64Encoded': False}

    # Парсим параметры
    params = {}
    body = event.get('body', '')
    if body:
        if event.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        parsed = parse_qs(body)
        params = {k: v[0] for k, v in parsed.items()}
    if not params:
        params = event.get('queryStringParameters') or {}

    out_sum         = params.get('OutSum', '')
    inv_id          = params.get('InvId', '')
    signature_value = params.get('SignatureValue', '').upper()

    if not out_sum or not inv_id or not signature_value:
        return {'statusCode': 400, 'headers': HEADERS, 'body': 'Missing params', 'isBase64Encoded': False}

    # Проверяем подпись
    expected = calculate_signature(out_sum, inv_id, password_2)
    if signature_value != expected:
        return {'statusCode': 400, 'headers': HEADERS, 'body': 'Invalid signature', 'isBase64Encoded': False}

    conn = get_conn()
    cur  = conn.cursor()

    # Обновляем статус заказа
    cur.execute(
        f"""UPDATE {SCHEMA}.orders
            SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE robokassa_inv_id = %s AND status = 'pending'
            RETURNING id, user_id, plan_id, order_number""",
        (int(inv_id),)
    )
    row = cur.fetchone()

    if not row:
        # Уже оплачен?
        cur.execute(f"SELECT status FROM {SCHEMA}.orders WHERE robokassa_inv_id = %s", (int(inv_id),))
        ex = cur.fetchone()
        conn.close()
        if ex and ex[0] == 'paid':
            return {'statusCode': 200, 'headers': HEADERS, 'body': f'OK{inv_id}', 'isBase64Encoded': False}
        return {'statusCode': 404, 'headers': HEADERS, 'body': 'Order not found', 'isBase64Encoded': False}

    order_id, user_id, plan_id, order_number = row

    # Активируем подписку на 30 дней
    cur.execute(
        f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, expires_at, updated_at)
            VALUES (%s, %s, 'active', now() + interval '30 days', now())
            ON CONFLICT (user_id) DO UPDATE
              SET plan = %s, status = 'active',
                  expires_at = now() + interval '30 days',
                  updated_at = now()""",
        (str(user_id), plan_id, plan_id)
    )

    # Пишем в audit_log
    cur.execute(
        f"""INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta)
            VALUES (%s, 'payment_success', %s)""",
        (str(user_id), json.dumps({'plan': plan_id, 'order': order_number, 'inv_id': int(inv_id)}))
    )

    conn.commit()
    conn.close()

    return {'statusCode': 200, 'headers': HEADERS, 'body': f'OK{inv_id}', 'isBase64Encoded': False}
