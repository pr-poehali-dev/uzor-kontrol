"""
One-time admin password reset.
POST / — set password for admin user
Body: {"password": "...", "email": "admin@nextvpn.io"}
"""
import json
import os
import hashlib
import base64
import secrets
import psycopg2

SCHEMA = os.environ['MAIN_DB_SCHEMA']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def hash_password(plain: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 260000)
    return f'pbkdf2:sha256:260000:{salt}:{base64.b64encode(dk).decode()}'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'Method not allowed'})

    body = json.loads(event.get('body') or '{}')
    password = body.get('password', '')
    confirm_email = body.get('email', '')

    if confirm_email != 'admin@nextvpn.io':
        return resp(403, {'error': 'Email confirmation required'})

    if len(password) < 8:
        return resp(400, {'error': 'Password must be at least 8 characters'})

    pw_hash = hash_password(password)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE email = %s AND is_admin = true RETURNING email",
        (pw_hash, confirm_email)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()

    if not row:
        return resp(404, {'error': 'Admin user not found'})

    return resp(200, {'ok': True, 'email': row[0]})
