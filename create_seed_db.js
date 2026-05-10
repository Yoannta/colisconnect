/**
 * Seed script: creates a fresh colisconnect.sqlite with one admin user.
 * Run with: node create_seed_db.js
 */
const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");
const path = require("path");

const DB_FILE = path.join(__dirname, "backend", "seed.sqlite");

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

// Bootstrap schema
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  kyc_status TEXT NOT NULL DEFAULT 'not_started',
  phone_number TEXT NOT NULL DEFAULT '',
  identity_document TEXT NOT NULL DEFAULT '',
  profile_photo TEXT NOT NULL DEFAULT '',
  identity_document_approved INTEGER NOT NULL DEFAULT 0,
  profile_photo_approved INTEGER NOT NULL DEFAULT 0,
  identity_rejection_reason TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL DEFAULT '',
  stripe_account_id TEXT NOT NULL DEFAULT '',
  payment_qr_code TEXT NOT NULL DEFAULT '',
  alipay_qr TEXT NOT NULL DEFAULT '',
  wechat_qr TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  flight_number TEXT NOT NULL DEFAULT '',
  available_kg INTEGER NOT NULL,
  price_per_kg INTEGER NOT NULL,
  description TEXT,
  rating REAL NOT NULL DEFAULT 5,
  reviews INTEGER NOT NULL DEFAULT 0,
  is_verified INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parcel_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  needed_by_date TEXT NOT NULL,
  weight_kg INTEGER NOT NULL,
  max_price_per_kg INTEGER NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  offer_id INTEGER NOT NULL,
  parcel_request_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  proposed_price_per_kg INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  FOREIGN KEY (parcel_request_id) REFERENCES parcel_requests(id) ON DELETE CASCADE,
  UNIQUE(user_id, offer_id, parcel_request_id)
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  reservation_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  offer_owner_id INTEGER NOT NULL,
  last_message_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  warning_sent_at TEXT,
  delete_after_at TEXT,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_user_id INTEGER,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_inbox_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  section TEXT NOT NULL DEFAULT 'general',
  text TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_by_admin_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_type TEXT NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
`);

// Insert the admin user
const now = new Date().toISOString();
const passwordHash = hashPassword("DIH000474272");
const referralCode = "ADMIN-" + crypto.randomBytes(3).toString("hex").toUpperCase();

try {
    db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified, kyc_status, referral_code, created_at)
        VALUES (?, ?, ?, 'admin', 1, 1, 'approved', ?, ?)
    `).run("Yoann Tato", "yoann.tato@gmail.com", passwordHash, referralCode, now);
    console.log("✅ Admin user created: yoann.tato@gmail.com");
} catch (e) {
    console.log("⚠️ User might already exist:", e.message);
}

db.close();
console.log("✅ Seed DB ready at: backend/seed.sqlite");
console.log("→ Now rename it to: backend/colisconnect.sqlite");
