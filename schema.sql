-- Home Taste production database schema. Safe to run once on a new D1 database.
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  settings_json TEXT NOT NULL,
  categories_json TEXT NOT NULL,
  products_json TEXT NOT NULL,
  coupons_json TEXT NOT NULL,
  expenses_json TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  admin_password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE TABLE IF NOT EXISTS customers (
  phone TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
