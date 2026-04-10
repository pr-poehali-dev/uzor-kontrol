CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id uuid REFERENCES t_p61243683_uzor_kontrol.users(id),
    plan_id text REFERENCES t_p61243683_uzor_kontrol.plans(id),
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    robokassa_inv_id INTEGER UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_robokassa_inv_id ON t_p61243683_uzor_kontrol.orders(robokassa_inv_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON t_p61243683_uzor_kontrol.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON t_p61243683_uzor_kontrol.orders(user_id);
