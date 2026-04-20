"""
ЮKassa Webhook: обработка уведомлений об оплате.
POST / — получить событие payment.succeeded → активировать подписку
"""
import json
import os
import ipaddress
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
}


def resp(status, body=''):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body) if body else ''}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


YUKASSA_RANGES = [
    '185.71.76.0/27', '185.71.77.0/27', '77.75.153.0/25',
    '77.75.156.11/32', '77.75.156.35/32', '77.75.154.128/25',
    '2a02:5180::/32',
]


def is_trusted_ip(ip: str) -> bool:
    """Корректная проверка CIDR через ipaddress."""
    if not ip:
        return False
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for cidr in YUKASSA_RANGES:
        try:
            net = ipaddress.ip_network(cidr, strict=False)
            if addr.version == net.version and addr in net:
                return True
        except ValueError:
            continue
    return False


def handler(event: dict, context) -> dict:
    """Webhook от ЮKassa: активирует подписку на 30 дней при успешной оплате."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    source_ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '')
    webhook_secret = os.environ.get('WEBHOOK_SECRET', '')
    provided = event.get('headers', {}).get('X-Webhook-Secret', '')

    auth_ok = False
    if webhook_secret and provided == webhook_secret:
        auth_ok = True
    elif is_trusted_ip(source_ip):
        auth_ok = True

    if not auth_ok:
        return resp(403, {'error': 'Forbidden'})

    body = json.loads(event.get('body') or '{}')

    event_type = body.get('event', '')
    obj = body.get('object', {})

    if event_type != 'payment.succeeded':
        return resp(200, {'ok': True, 'skipped': event_type})

    payment_id = obj.get('id', '')
    status = obj.get('status', '')
    metadata = obj.get('metadata', {})

    if status != 'succeeded' or not payment_id:
        return resp(200, {'ok': True})

    user_id = metadata.get('user_id', '')
    plan_id = metadata.get('plan_id', '')

    if not user_id or not plan_id:
        return resp(400, {'error': 'Missing metadata'})

    if plan_id == 'free':
        return resp(400, {'error': 'Free plan cannot be paid'})

    conn = get_conn()
    cur = conn.cursor()

    # Идемпотентность: если заказ уже paid — молча возвращаем ok
    cur.execute(
        f"SELECT status FROM {SCHEMA}.orders WHERE order_number = %s",
        (payment_id,)
    )
    row = cur.fetchone()
    if row and row[0] == 'paid':
        conn.close()
        return resp(200, {'ok': True, 'duplicate': True})

    cur.execute(
        f"""UPDATE {SCHEMA}.orders
            SET status = 'paid', paid_at = now(), updated_at = now()
            WHERE order_number = %s AND status = 'pending'""",
        (payment_id,)
    )

    cur.execute(
        f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, expires_at, updated_at)
            VALUES (%s, %s, 'active',
              CASE WHEN (SELECT expires_at FROM {SCHEMA}.subscriptions WHERE user_id = %s) > now()
                   THEN (SELECT expires_at FROM {SCHEMA}.subscriptions WHERE user_id = %s) + interval '30 days'
                   ELSE now() + interval '30 days'
              END,
              now())
            ON CONFLICT (user_id) DO UPDATE
              SET plan = EXCLUDED.plan,
                  status = 'active',
                  expires_at = CASE
                    WHEN {SCHEMA}.subscriptions.expires_at > now()
                    THEN {SCHEMA}.subscriptions.expires_at + interval '30 days'
                    ELSE now() + interval '30 days' END,
                  updated_at = now(),
                  expiry_notified_at = NULL""",
        (user_id, plan_id, user_id, user_id)
    )

    amount = obj.get('amount', {}).get('value', '0')
    cur.execute(
        f"""INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta)
            VALUES (%s, 'payment_success', %s)""",
        (user_id, json.dumps({'plan': plan_id, 'payment_id': payment_id, 'amount': amount, 'provider': 'yukassa'}))
    )

    conn.commit()
    conn.close()

    return resp(200, {'ok': True})
