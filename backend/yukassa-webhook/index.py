"""
ЮKassa Webhook: обработка уведомлений об оплате.
POST / — получить событие payment.succeeded → активировать подписку
"""
import json
import os
import hashlib
import base64
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def resp(status, body=''):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body) if body else ''}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')

    event_type = body.get('event', '')
    obj        = body.get('object', {})

    # Нас интересует только успешная оплата
    if event_type != 'payment.succeeded':
        return resp(200, {'ok': True, 'skipped': event_type})

    payment_id = obj.get('id', '')
    status     = obj.get('status', '')
    metadata   = obj.get('metadata', {})

    if status != 'succeeded' or not payment_id:
        return resp(200, {'ok': True})

    user_id = metadata.get('user_id', '')
    plan_id = metadata.get('plan_id', '')

    if not user_id or not plan_id:
        return resp(400, {'error': 'Missing metadata'})

    conn = get_conn()
    cur  = conn.cursor()

    # Обновляем заказ
    cur.execute(
        f"""UPDATE {SCHEMA}.orders
            SET status = 'paid', paid_at = now(), updated_at = now()
            WHERE order_number = %s AND status = 'pending'""",
        (payment_id,)
    )

    # Активируем подписку на 30 дней
    cur.execute(
        f"""INSERT INTO {SCHEMA}.subscriptions (user_id, plan, status, expires_at, updated_at)
            VALUES (%s, %s, 'active', now() + interval '30 days', now())
            ON CONFLICT (user_id) DO UPDATE
              SET plan = %s, status = 'active',
                  expires_at = now() + interval '30 days',
                  updated_at = now()""",
        (user_id, plan_id, plan_id)
    )

    # Audit log
    amount = obj.get('amount', {}).get('value', '0')
    cur.execute(
        f"""INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta)
            VALUES (%s, 'payment_success', %s)""",
        (user_id, json.dumps({'plan': plan_id, 'payment_id': payment_id, 'amount': amount, 'provider': 'yukassa'}))
    )

    conn.commit()
    conn.close()

    return resp(200, {'ok': True})
