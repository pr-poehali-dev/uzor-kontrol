"""
One-time admin setup: set initial password.
POST / — set password for admin user (only works while no sessions exist)
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
    setup_key = body.get('setup_key', '')

    if setup_key != os.environ.get('ADMIN_SETUP_KEY', ''):
        return resp(403, {'error': 'Invalid setup key'})

    if len(password) < 8:
        return resp(400, {'error': 'Password must be at least 8 characters'})

    pw_hash = hash_password(password)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE is_admin = true RETURNING email",
        (pw_hash,)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()

    if not row:
        return resp(404, {'error': 'No admin user found'})

    return resp(200, {'ok': True, 'email': row[0], 'message': 'Admin password updated successfully'})
