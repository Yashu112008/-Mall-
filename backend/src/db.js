const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'mall.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','staff')),
  active INTEGER NOT NULL DEFAULT 1,
  token_version INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  floor INTEGER NOT NULL,
  category TEXT NOT NULL,
  area_sqft REAL NOT NULL,
  monthly_rent REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('occupied','vacant','maintenance')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  lease_start TEXT,
  lease_end TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('paid','pending','overdue')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS parking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_number TEXT NOT NULL,
  slot TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car','bike','other')),
  entry_time TEXT NOT NULL,
  exit_time TEXT,
  fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('parked','exited')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Create the first admin only when there are no users yet
if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(
    process.env.ADMIN_NAME || 'Admin',
    process.env.ADMIN_EMAIL.toLowerCase(),
    bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12),
    'admin'
  );
  console.log('First admin created:', process.env.ADMIN_EMAIL);
}

module.exports = db;
