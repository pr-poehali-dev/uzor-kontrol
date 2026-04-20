"""
Maintenance job: автоотключение VPN у истёкших подписок + email-напоминания за 3 дня.
Защищено X-Cron-Secret или query ?secret=. Запускать раз в сутки.
"""
import json
import os
import time
import smtplib
import ssl
import urllib.request
from email.mime.text import MIMEText
from email.utils import formataddr
import psycopg2
import psycopg2.extras

SCHEMA = os.environ['MAIN_DB_SCHEMA']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Cron-Secret',
}


def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def send_email(to_email: str, subject: str, body_html: str) -> bool:
    host = os.environ.get('SMTP_HOST', '')
    port = int(os.environ.get('SMTP_PORT', '0') or 0)
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    from_addr = os.environ.get('SMTP_FROM', user) or user
    if not host or not port or not user or not password:
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
        print(f'[email] {e}')
        return False


def wg_delete_peer(public_key: str) -> bool:
    server_ip = os.environ.get('VPN_SERVER_1_IP', '')
    api_key = os.environ.get('VPN_SERVER_1_API_KEY', '')
    if not server_ip or not api_key or not public_key:
        return False
    try:
        data = json.dumps({'public_key': public_key}).encode()
        req = urllib.request.Request(
            f'http://{server_ip}:51821/peer', data=data, method='DELETE'
        )
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {api_key}')
        with urllib.request.urlopen(req, timeout=10):
            return True
    except Exception as e:
        print(f'[wg] {e}')
        return False


def handler(event: dict, context) -> dict:
    """Cron: отключение VPN у истёкших подписок и отправка напоминаний."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    cron_secret = os.environ.get('CRON_SECRET', '')
    if cron_secret:
        qs = event.get('queryStringParameters') or {}
        provided = event.get('headers', {}).get('X-Cron-Secret', '') or qs.get('secret', '')
        if provided != cron_secret:
            return resp(403, {'error': 'Forbidden'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        f"""UPDATE {SCHEMA}.subscriptions
            SET status = 'expired', updated_at = now()
            WHERE status = 'active' AND plan <> 'free'
              AND expires_at IS NOT NULL AND expires_at < now()
            RETURNING user_id"""
    )
    expired_users = [str(r['user_id']) for r in cur.fetchall()]

    disconnected = 0
    for uid in expired_users:
        cur.execute(
            f"SELECT public_key FROM {SCHEMA}.vpn_configs WHERE user_id = %s AND is_active = true",
            (uid,)
        )
        for row in cur.fetchall():
            if wg_delete_peer(row['public_key']):
                disconnected += 1
        cur.execute(
            f"UPDATE {SCHEMA}.vpn_configs SET is_active = false WHERE user_id = %s AND is_active = true",
            (uid,)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.audit_logs (user_id, action, meta) VALUES (%s, 'subscription_expired', %s)",
            (uid, json.dumps({'auto_disconnect': True}))
        )

    cur.execute(
        f"""SELECT s.user_id, s.expires_at, u.email, u.name
            FROM {SCHEMA}.subscriptions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.status = 'active' AND s.plan <> 'free'
              AND s.expires_at IS NOT NULL
              AND s.expires_at > now()
              AND s.expires_at <= now() + interval '3 days'
              AND s.expiry_notified_at IS NULL"""
    )
    reminders = cur.fetchall()
    notified = 0
    site_url = os.environ.get('SITE_URL', '').rstrip('/')
    now_ts = time.time()
    for r in reminders:
        days_left = max(1, int((r['expires_at'].timestamp() - now_ts) / 86400))
        subject = 'Подписка NEXTVPN скоро закончится'
        body_html = (
            f'<p>Здравствуйте, {r["name"] or "друг"}!</p>'
            f'<p>Ваша подписка NEXTVPN закончится через {days_left} дн. '
            f'({r["expires_at"].strftime("%d.%m.%Y")}).</p>'
            f'<p>Продлите подписку заранее, чтобы не прерывать доступ:</p>'
            f'<p><a href="{site_url}">{site_url or "Открыть приложение"}</a></p>'
        )
        if send_email(r['email'], subject, body_html):
            notified += 1
        cur.execute(
            f"UPDATE {SCHEMA}.subscriptions SET expiry_notified_at = now() WHERE user_id = %s",
            (str(r['user_id']),)
        )

    conn.commit()
    conn.close()

    return resp(200, {
        'expired_subscriptions': len(expired_users),
        'vpn_peers_disconnected': disconnected,
        'reminders_sent': notified,
    })
