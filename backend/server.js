const http = require("http");
const path = require("path");
const fsp = require("fs/promises");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = path.resolve(__dirname, "..");
const DB_FILE = path.join(__dirname, "colisconnect.sqlite");
const AVIATIONSTACK_ACCESS_KEY = String(process.env.AVIATIONSTACK_ACCESS_KEY || "").trim();

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const LOGIN_MAX_ATTEMPTS = 6;

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

const loginRateLimiter = new Map();
const KNOWN_FLIGHTS = [
    { number: "AF750", origin: "France", destination: "Cote d'Ivoire", dates: ["2026-03-15", "2026-03-22", "2026-03-29"] },
    { number: "SN281", origin: "Belgique", destination: "Cote d'Ivoire", dates: ["2026-03-18", "2026-03-25"] },
    { number: "AF718", origin: "France", destination: "Senegal", dates: ["2026-03-20", "2026-03-27"] },
    { number: "AT789", origin: "France", destination: "Maroc", dates: ["2026-03-22", "2026-03-29"] },
    { number: "HF531", origin: "France", destination: "Cote d'Ivoire", dates: ["2026-03-26", "2026-04-02"] },
    { number: "IB602", origin: "Espagne", destination: "France", dates: ["2026-03-19", "2026-03-26"] },
    { number: "LH1034", origin: "Allemagne", destination: "France", dates: ["2026-03-21", "2026-03-28"] },
    { number: "EK073", origin: "Emirats Arabes Unis", destination: "France", dates: ["2026-03-17", "2026-03-24"] },
    { number: "AC872", origin: "Canada", destination: "France", dates: ["2026-03-16", "2026-03-23"] }
];
const CHAT_WARNING_AFTER_MS = 1000 * 60 * 60 * 24 * 3;
const CHAT_DELETION_AFTER_WARNING_MS = 1000 * 60 * 60 * 24 * 2;

function nowIso() {
    return new Date().toISOString();
}

function toSafeText(value, maxLen = 300) {
    return String(value || "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLen);
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function normalizeFlightNumber(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/\s+/g, "")
        .trim();
}

async function verifyFlightWithAviationStack(flightNumber, departureDate) {
    if (!AVIATIONSTACK_ACCESS_KEY) return null;

    const params = new URLSearchParams({
        access_key: AVIATIONSTACK_ACCESS_KEY,
        flight_iata: flightNumber,
        limit: "10"
    });

    if (departureDate) {
        params.set("flight_date", departureDate);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, {
            signal: controller.signal
        });
        if (!response.ok) {
            return { exists: false, error: "Service de verification de vol indisponible." };
        }

        const payload = await response.json();
        if (payload && payload.error) {
            return { exists: false, error: "Verification externe indisponible (cle API invalide ou quota depasse)." };
        }

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const byDate = departureDate
            ? rows.filter((row) => String(row?.flight_date || "").slice(0, 10) === departureDate)
            : rows;

        if (!byDate.length) {
            return { exists: false, error: "Ce vol n'existe pas pour la date choisie." };
        }

        const first = byDate[0] || {};
        return {
            exists: true,
            flightNumber,
            source: "aviationstack",
            flight: {
                number: flightNumber,
                origin: first?.departure?.airport || "",
                destination: first?.arrival?.airport || "",
                date: String(first?.flight_date || departureDate || "")
            }
        };
    } catch {
        return { exists: false, error: "Service de verification de vol indisponible." };
    } finally {
        clearTimeout(timeout);
    }
}

async function verifyFlight(payload = {}) {
    const flightNumber = normalizeFlightNumber(payload.number || payload.flightNumber || "");
    if (!/^[A-Z]{2}\d{2,4}$/.test(flightNumber)) {
        return { exists: false, error: "Format du numero de vol invalide. Exemple: AF750." };
    }

    const departureDate = String(payload.departureDate || payload.date || "").slice(0, 10);

    if (AVIATIONSTACK_ACCESS_KEY) {
        return verifyFlightWithAviationStack(flightNumber, departureDate);
    }

    const flight = KNOWN_FLIGHTS.find((item) => item.number === flightNumber);
    if (!flight) {
        return { exists: false, error: "Ce vol n'existe pas." };
    }

    const origin = normalizeText(payload.origin);
    const destination = normalizeText(payload.destination);

    if (origin && normalizeText(flight.origin) !== origin) {
        return { exists: false, error: `Le vol ${flightNumber} n'est pas au depart de ${payload.origin}.` };
    }

    if (destination && normalizeText(flight.destination) !== destination) {
        return { exists: false, error: `Le vol ${flightNumber} n'arrive pas vers ${payload.destination}.` };
    }

    if (departureDate && Array.isArray(flight.dates) && !flight.dates.includes(departureDate)) {
        return { exists: false, error: `Le vol ${flightNumber} n'est pas programme pour la date choisie.` };
    }

    return { exists: true, flightNumber, flight };
}

function intRange(value, fallback, min, max) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    return Math.max(min, Math.min(max, rounded));
}

function getIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) return String(forwarded).split(",")[0].trim();
    return req.socket?.remoteAddress || "unknown";
}

function contentTypeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".js") return "application/javascript; charset=utf-8";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".svg") return "image/svg+xml";
    return "application/octet-stream";
}

function sendJson(res, status, payload) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
    });
    res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
    res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
    });
    res.end(text);
}

async function parseBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) throw new Error("Payload too large");
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
}

function requiredText(value, field, maxLen = 200) {
    const text = toSafeText(value, maxLen);
    if (!text) {
        const err = new Error(`${field} est requis.`);
        err.statusCode = 400;
        throw err;
    }
    return text;
}

function ensureColumn(table, column, def) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((c) => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = String(stored || "").split(":");
    if (!salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

function createSession(userId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions(token,user_id,created_at,expires_at,last_seen_at) VALUES (?,?,?,?,?)")
        .run(token, userId, now.toISOString(), expiresAt.toISOString(), now.toISOString());
    return token;
}

function getBearerToken(req) {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) return null;
    return header.slice(7).trim() || null;
}

function getAuthUser(req) {
    const token = getBearerToken(req);
    if (!token) return null;
    const row = db.prepare(`
        SELECT users.id, users.full_name AS fullName, users.email, users.role, users.is_active AS isActive, sessions.token
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
    `).get(token, nowIso());
    if (!row || !row.isActive) return null;
    db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token = ?").run(nowIso(), token);
    return row;
}

function requireAuth(req, res) {
    const user = getAuthUser(req);
    if (!user) {
        sendJson(res, 401, { error: "AUTH_REQUIRED" });
        return null;
    }
    return user;
}

function requireAdmin(req, res) {
    const user = requireAuth(req, res);
    if (!user) return null;
    if (user.role !== "admin") {
        sendJson(res, 403, { error: "ADMIN_REQUIRED" });
        return null;
    }
    return user;
}

function paginationFromQuery(params) {
    const page = intRange(params.get("page"), 1, 1, 10000);
    const pageSize = intRange(params.get("pageSize"), 20, 1, 100);
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
}

function rateKey(req, email) {
    return `${getIp(req)}::${email}`;
}

function checkLoginRate(req, email) {
    const key = rateKey(req, email);
    const now = Date.now();
    const item = loginRateLimiter.get(key);
    if (!item) return { allowed: true, key };
    if (item.blockedUntil && now < item.blockedUntil) {
        return { allowed: false, retry: Math.ceil((item.blockedUntil - now) / 1000), key };
    }
    if (now - item.windowStart > LOGIN_WINDOW_MS) {
        loginRateLimiter.delete(key);
        return { allowed: true, key };
    }
    return { allowed: true, key };
}

function addFailedRateAttempt(key) {
    const now = Date.now();
    const item = loginRateLimiter.get(key);
    if (!item || now - item.windowStart > LOGIN_WINDOW_MS) {
        loginRateLimiter.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
    }
    item.count += 1;
    if (item.count >= LOGIN_MAX_ATTEMPTS) item.blockedUntil = now + LOGIN_WINDOW_MS;
    loginRateLimiter.set(key, item);
}

function clearRateAttempts(key) {
    loginRateLimiter.delete(key);
}

function logRequest(req, statusCode, durationMs) {
    console.log(
        JSON.stringify({
            ts: nowIso(),
            method: req.method,
            path: req.url,
            ip: getIp(req),
            status: statusCode,
            durationMs
        })
    );
}

function buildMessageId() {
    return `msg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function pushSystemMessage(threadId, text, createdAt = nowIso()) {
    const safeText = toSafeText(text, 1000);
    if (!safeText || !threadId) return;
    db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,created_at) VALUES (?,?, 'system', NULL, ?, ?)")
        .run(buildMessageId(), threadId, safeText, createdAt);
    db.prepare("UPDATE chat_threads SET last_message_at=? WHERE id=?").run(createdAt, threadId);
}

function runChatLifecycleSweep() {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const rows = db.prepare(`
        SELECT
            chat_threads.id,
            chat_threads.created_at AS createdAt,
            chat_threads.warning_sent_at AS warningSentAt,
            chat_threads.delete_after_at AS deleteAfterAt,
            reservations.status AS reservationStatus
        FROM chat_threads
        INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
    `).all();

    for (const row of rows) {
        const reservationStatus = String(row.reservationStatus || "");
        if (reservationStatus === "agreed") {
            if (row.warningSentAt || row.deleteAfterAt) {
                db.prepare("UPDATE chat_threads SET warning_sent_at=NULL, delete_after_at=NULL WHERE id=?").run(row.id);
            }
            continue;
        }

        if (!row.warningSentAt) {
            const createdAtMs = Date.parse(row.createdAt || "");
            if (Number.isFinite(createdAtMs) && nowMs - createdAtMs >= CHAT_WARNING_AFTER_MS) {
                const deleteAfterAt = new Date(nowMs + CHAT_DELETION_AFTER_WARNING_MS).toISOString();
                pushSystemMessage(
                    row.id,
                    "Avertissement systeme: cette conversation est en attente depuis plus de 3 jours. Sans accord, elle sera supprimee dans 2 jours."
                );
                db.prepare("UPDATE chat_threads SET warning_sent_at=?, delete_after_at=? WHERE id=?")
                    .run(now, deleteAfterAt, row.id);
            }
            continue;
        }

        const deleteAtMs = Date.parse(row.deleteAfterAt || "");
        if (Number.isFinite(deleteAtMs) && nowMs >= deleteAtMs) {
            db.prepare("DELETE FROM chat_threads WHERE id=?").run(row.id);
        }
    }
}

const reservationTransitions = {
    pending: ["accepted", "refused", "canceled", "agreed"],
    accepted: ["in_transit", "canceled"],
    agreed: [],
    refused: [],
    canceled: [],
    in_transit: ["delivered"],
    delivered: []
};

function sanitizeReservationStatus(value) {
    const allowed = new Set(["pending", "accepted", "refused", "canceled", "in_transit", "delivered", "agreed"]);
    return allowed.has(value) ? value : null;
}

function canTransition(current, next) {
    return (reservationTransitions[current] || []).includes(next);
}

function actorCanTransition(reservation, actor, target) {
    const isRequester = reservation.requesterId === actor.id;
    const isOwner = reservation.offerOwnerId === actor.id;
    if (actor.role === "admin") return true;
    if (target === "accepted" || target === "refused" || target === "in_transit") return isOwner;
    if (target === "canceled" || target === "delivered" || target === "agreed") return isRequester;
    return false;
}

function bootstrapSchema() {
    db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
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
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS moderation_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by INTEGER NOT NULL,
  resolved_by INTEGER,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_destination ON offers(destination);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_requests_destination ON parcel_requests(destination);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON chat_threads(last_message_at);
`);

    ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'user'");
    ensureColumn("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
    ensureColumn("sessions", "last_seen_at", "TEXT");
    ensureColumn("offers", "flight_number", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("chat_threads", "is_suspended", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("chat_threads", "suspended_at", "TEXT");
    ensureColumn("chat_threads", "suspended_reason", "TEXT");
    ensureColumn("chat_threads", "warning_sent_at", "TEXT");
    ensureColumn("chat_threads", "delete_after_at", "TEXT");

    const hasLegacyTravelers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='travelers'").get();
    const offersCount = db.prepare("SELECT COUNT(*) AS c FROM offers").get().c;
    if (false && hasLegacyTravelers && offersCount === 0) {
        const rows = db.prepare(`
            SELECT
                user_id AS userId,
                name,
                destination,
                departure_date AS departureDate,
                available_kg AS availableKg,
                price_per_kg AS pricePerKg,
                rating,
                reviews,
                is_verified AS isVerified,
                created_at AS createdAt
            FROM travelers
        `).all();
        const insert = db.prepare(`
            INSERT INTO offers(
                user_id,title,origin,destination,departure_date,available_kg,price_per_kg,description,
                rating,reviews,is_verified,status,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?, ?,?,?,?,'active',?,?)
        `);
        for (const row of rows) {
            const t = row.createdAt || nowIso();
            insert.run(
                row.userId || 1,
                `Trajet vers ${row.destination}`,
                "Non précisé",
                row.destination,
                row.departureDate,
                row.availableKg,
                row.pricePerKg,
                `Migré depuis ancien modèle (${row.name || "voyageur"})`,
                row.rating || 5,
                row.reviews || 0,
                row.isVerified ? 1 : 0,
                t,
                t
            );
        }
    }
}

function seedDataIfEmpty() {
    const users = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    if (users === 0) {
        db.prepare("INSERT INTO users(full_name,email,password_hash,role,is_active,created_at) VALUES (?,?,?,?,1,?)")
            .run("Admin ColisConnect", "admin@colisconnect.local", hashPassword("Admin123!"), "admin", nowIso());
    }
}

bootstrapSchema();
seedDataIfEmpty();
try {
    runChatLifecycleSweep();
} catch (error) {
    console.error("chat_sweep_startup_error", String(error?.message || error));
}
const chatSweepTimer = setInterval(() => {
    try {
        runChatLifecycleSweep();
    } catch (error) {
        console.error("chat_sweep_interval_error", String(error?.message || error));
    }
}, 30 * 60 * 1000);
if (typeof chatSweepTimer.unref === "function") chatSweepTimer.unref();

function mapOffer(row) {
    return {
        id: row.id,
        userId: row.userId,
        ownerName: row.ownerName,
        title: row.title,
        origin: row.origin,
        destination: row.destination,
        departureDate: row.departureDate,
        flightNumber: row.flightNumber || "",
        availableKg: row.availableKg,
        pricePerKg: row.pricePerKg,
        description: row.description,
        rating: Number(row.rating),
        reviews: row.reviews,
        isVerified: Boolean(row.isVerified),
        status: row.status,
        createdAt: row.createdAt
    };
}

function mapRequest(row) {
    return {
        id: row.id,
        userId: row.userId,
        requesterName: row.requesterName,
        title: row.title,
        origin: row.origin,
        destination: row.destination,
        neededByDate: row.neededByDate,
        weightKg: row.weightKg,
        maxPricePerKg: row.maxPricePerKg,
        description: row.description,
        status: row.status,
        createdAt: row.createdAt
    };
}

function mapReservation(row) {
    return {
        id: row.id,
        requesterId: row.requesterId,
        offerOwnerId: row.offerOwnerId,
        offerId: row.offerId,
        parcelRequestId: row.parcelRequestId,
        status: row.status,
        proposedPricePerKg: row.proposedPricePerKg,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        offerTitle: row.offerTitle,
        requestTitle: row.requestTitle,
        destination: row.destination,
        departureDate: row.departureDate,
        neededByDate: row.neededByDate,
        requesterName: row.requesterName,
        offerOwnerName: row.offerOwnerName,
        chatThreadId: row.chatThreadId || null,
        chatSuspended: Boolean(Number(row.chatSuspended || 0)),
        chatSuspendedReason: row.chatSuspendedReason || ""
    };
}

function mapThread(row, viewerId) {
    const isOfferOwner = Number(viewerId) === Number(row.offerOwnerId);
    const counterpartName = isOfferOwner ? row.requesterName : row.offerOwnerName;
    const counterpartAvatar = isOfferOwner ? row.requesterAvatar : row.offerOwnerAvatar;
    const isSuspended = Boolean(Number(row.threadSuspended || 0));
    const canMarkAgreed = !isOfferOwner && String(row.reservationStatus || "") === "pending" && !isSuspended;
    return {
        id: row.id,
        reservationId: row.reservationId,
        travelerName: counterpartName || "Contact",
        travelerAvatar: counterpartAvatar || "https://i.pravatar.cc/150?u=default",
        status: row.reservationStatus,
        canMarkAgreed,
        isSuspended,
        suspendedReason: row.threadSuspendedReason || "",
        lastMessageAt: row.lastMessageAt,
        preview: row.preview || "Aucun message",
        offerTitle: row.offerTitle,
        requestTitle: row.requestTitle
    };
}

async function handleApi(req, res, requestUrl) {
    if (req.method === "OPTIONS") {
        sendText(res, 204, "");
        return;
    }

    const pathname = requestUrl.pathname;

    if (req.method === "GET" && pathname === "/api/health") {
        sendJson(res, 200, { ok: true, db: "sqlite", version: "v2", now: nowIso() });
        return;
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
        const body = await parseBody(req);
        const fullName = requiredText(body.fullName, "fullName", 120);
        const email = requiredText(body.email, "email", 180).toLowerCase();
        const password = String(body.password || "");

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: "Email invalide." });
        if (password.length < 8) return sendJson(res, 400, { error: "Mot de passe minimum 8 caracteres." });
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return sendJson(res, 409, { error: "Cet email existe deja." });

        const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
        const role = adminExists ? "user" : "admin";
        const result = db.prepare(
            "INSERT INTO users(full_name,email,password_hash,role,is_active,created_at) VALUES (?,?,?,?,1,?)"
        ).run(fullName, email, hashPassword(password), role, nowIso());

        const userId = Number(result.lastInsertRowid);
        const token = createSession(userId);
        sendJson(res, 201, { token, user: { id: userId, fullName, email, role } });
        return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
        const body = await parseBody(req);
        const email = toSafeText(body.email, 180).toLowerCase();
        const password = String(body.password || "");
        if (!email || !password) return sendJson(res, 400, { error: "email et mot de passe requis." });

        const rate = checkLoginRate(req, email);
        if (!rate.allowed) return sendJson(res, 429, { error: `Trop de tentatives. Reessayez dans ${rate.retry}s.` });

        const user = db.prepare(
            "SELECT id,full_name AS fullName,email,password_hash AS passwordHash,role,is_active AS isActive FROM users WHERE email = ?"
        ).get(email);
        if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
            addFailedRateAttempt(rate.key);
            return sendJson(res, 401, { error: "Identifiants invalides." });
        }

        clearRateAttempts(rate.key);
        const token = createSession(user.id);
        sendJson(res, 200, { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
        return;
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
        const user = requireAuth(req, res);
        if (!user) return;
        sendJson(res, 200, { user });
        return;
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
        const token = getBearerToken(req);
        if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === "GET" && (pathname === "/api/offers" || pathname === "/api/travelers")) {
        const { page, pageSize, offset } = paginationFromQuery(requestUrl.searchParams);
        const destination = normalizeText(requestUrl.searchParams.get("destination") || "");
        const maxPrice = intRange(requestUrl.searchParams.get("maxPrice"), 10000, 1, 10000);
        const minKg = intRange(requestUrl.searchParams.get("minKg"), 1, 1, 1000);
        const verifiedOnly = String(requestUrl.searchParams.get("verifiedOnly") || "false") === "true";
        const scope = String(requestUrl.searchParams.get("scope") || "public");

        let viewer = null;
        if (scope === "mine") {
            viewer = requireAuth(req, res);
            if (!viewer) return;
        }

        let query = `
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName,
                offers.title, offers.origin, offers.destination,
                offers.departure_date AS departureDate, offers.flight_number AS flightNumber, offers.available_kg AS availableKg,
                offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified,
                offers.status, offers.created_at AS createdAt
            FROM offers
            INNER JOIN users ON users.id = offers.user_id
            WHERE offers.status='active'
              AND offers.price_per_kg <= ?
              AND offers.available_kg >= ?
        `;
        const args = [maxPrice, minKg];
        if (scope === "mine") {
            query += " AND offers.user_id = ?";
            args.push(viewer.id);
        }
        if (verifiedOnly) query += " AND offers.is_verified = 1";
        query += " ORDER BY offers.created_at DESC LIMIT ? OFFSET ?";
        args.push(pageSize, offset);

        const items = db.prepare(query).all(...args).map(mapOffer).filter((o) => normalizeText(o.destination).includes(destination));
        sendJson(res, 200, { items, page, pageSize, total: items.length });
        return;
    }

    if (req.method === "POST" && (pathname === "/api/offers" || pathname === "/api/trips")) {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        const title = requiredText(body.title || `Trajet vers ${body.destination || "destination"}`, "title", 140);
        const origin = requiredText(body.origin || body.departure || "Non precise", "origin", 140);
        const destination = requiredText(body.destination, "destination", 140);
        const departureDate = requiredText(body.departureDate || body.date || "", "departureDate", 40);
        const availableKg = intRange(body.availableKg || body.kilos, 0, 1, 1000);
        const pricePerKg = intRange(body.pricePerKg || body.price, 0, 1, 10000);
        const description = toSafeText(body.description, 700);
        if (availableKg <= 0 || pricePerKg <= 0) return sendJson(res, 400, { error: "availableKg et pricePerKg doivent etre > 0." });

        const t = nowIso();
        const result = db.prepare(`
            INSERT INTO offers(
                user_id,title,origin,destination,departure_date,flight_number,available_kg,price_per_kg,description,
                rating,reviews,is_verified,status,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?,?, ?,5,0,1,'active',?,?)
        `).run(user.id, title, origin, destination, departureDate, "", availableKg, pricePerKg, description, t, t);

        const row = db.prepare(`
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName,
                offers.title, offers.origin, offers.destination,
                offers.departure_date AS departureDate, offers.flight_number AS flightNumber, offers.available_kg AS availableKg,
                offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified,
                offers.status, offers.created_at AS createdAt
            FROM offers
            INNER JOIN users ON users.id = offers.user_id
            WHERE offers.id = ?
        `).get(Number(result.lastInsertRowid));
        sendJson(res, 201, mapOffer(row));
        return;
    }

    const deleteOfferMatch = pathname.match(/^\/api\/offers\/(\d+)$/);
    if (deleteOfferMatch && req.method === "DELETE") {
        const user = requireAuth(req, res);
        if (!user) return;
        const offerId = Number(deleteOfferMatch[1]);
        const offer = db.prepare("SELECT id,user_id AS userId,status FROM offers WHERE id=?").get(offerId);
        if (!offer) {
            sendJson(res, 404, { error: "Offre introuvable." });
            return;
        }
        if (Number(offer.userId) !== Number(user.id) && user.role !== "admin") {
            sendJson(res, 403, { error: "Action non autorisee." });
            return;
        }
        if (offer.status !== "active") {
            sendJson(res, 200, { ok: true, id: offerId, status: offer.status });
            return;
        }
        db.prepare("UPDATE offers SET status='canceled', updated_at=? WHERE id=?").run(nowIso(), offerId);
        sendJson(res, 200, { ok: true, id: offerId, status: "canceled" });
        return;
    }

    if (req.method === "POST" && pathname === "/api/parcel-requests") {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        const title = requiredText(body.title || "Demande d'envoi", "title", 140);
        const origin = requiredText(body.origin || "Non precise", "origin", 140);
        const destination = requiredText(body.destination, "destination", 140);
        const neededByDate = requiredText(body.neededByDate || body.date || "", "neededByDate", 40);
        const weightKg = intRange(body.weightKg || body.weight, 0, 1, 1000);
        const maxPricePerKg = intRange(body.maxPricePerKg || body.maxPrice, 0, 1, 10000);
        const description = toSafeText(body.description, 700);
        if (weightKg <= 0 || maxPricePerKg <= 0) return sendJson(res, 400, { error: "weightKg et maxPricePerKg doivent etre > 0." });

        const t = nowIso();
        const result = db.prepare(`
            INSERT INTO parcel_requests(
                user_id,title,origin,destination,needed_by_date,weight_kg,max_price_per_kg,description,status,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?,?,'open',?,?)
        `).run(user.id, title, origin, destination, neededByDate, weightKg, maxPricePerKg, description, t, t);

        const row = db.prepare(`
            SELECT
                parcel_requests.id, parcel_requests.user_id AS userId, users.full_name AS requesterName,
                parcel_requests.title, parcel_requests.origin, parcel_requests.destination,
                parcel_requests.needed_by_date AS neededByDate, parcel_requests.weight_kg AS weightKg,
                parcel_requests.max_price_per_kg AS maxPricePerKg, parcel_requests.description,
                parcel_requests.status, parcel_requests.created_at AS createdAt
            FROM parcel_requests
            INNER JOIN users ON users.id = parcel_requests.user_id
            WHERE parcel_requests.id = ?
        `).get(Number(result.lastInsertRowid));
        sendJson(res, 201, mapRequest(row));
        return;
    }

    if (req.method === "GET" && pathname === "/api/parcel-requests") {
        const { page, pageSize, offset } = paginationFromQuery(requestUrl.searchParams);
        const scope = String(requestUrl.searchParams.get("scope") || "open");
        const destination = normalizeText(requestUrl.searchParams.get("destination") || "");

        let viewer = null;
        if (scope === "mine") {
            viewer = requireAuth(req, res);
            if (!viewer) return;
        }

        let query = `
            SELECT
                parcel_requests.id, parcel_requests.user_id AS userId, users.full_name AS requesterName,
                parcel_requests.title, parcel_requests.origin, parcel_requests.destination,
                parcel_requests.needed_by_date AS neededByDate, parcel_requests.weight_kg AS weightKg,
                parcel_requests.max_price_per_kg AS maxPricePerKg, parcel_requests.description,
                parcel_requests.status, parcel_requests.created_at AS createdAt
            FROM parcel_requests
            INNER JOIN users ON users.id = parcel_requests.user_id
            WHERE parcel_requests.status IN ('open','matched')
        `;
        const args = [];
        if (scope === "mine") {
            query += " AND parcel_requests.user_id = ?";
            args.push(viewer.id);
        }
        query += " ORDER BY parcel_requests.created_at DESC LIMIT ? OFFSET ?";
        args.push(pageSize, offset);
        const items = db.prepare(query).all(...args).map(mapRequest).filter((r) => normalizeText(r.destination).includes(destination));
        sendJson(res, 200, { items, page, pageSize, total: items.length });
        return;
    }

    if (req.method === "POST" && pathname === "/api/reservations") {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        const offerId = intRange(body.offerId, 0, 1, 1_000_000_000);
        const requestId = intRange(body.parcelRequestId, 0, 1, 1_000_000_000);

        const offer = db.prepare("SELECT id,user_id AS ownerId,destination,price_per_kg AS pricePerKg,status FROM offers WHERE id=?").get(offerId);
        if (!offer || offer.status !== "active") return sendJson(res, 404, { error: "Offre introuvable ou inactive." });
        const reqRow = db.prepare("SELECT id,user_id AS userId,destination,status FROM parcel_requests WHERE id=?").get(requestId);
        if (!reqRow || reqRow.userId !== user.id) return sendJson(res, 404, { error: "Demande introuvable." });
        if (!["open", "matched"].includes(reqRow.status)) return sendJson(res, 400, { error: "Demande non disponible." });
        if (normalizeText(offer.destination) !== normalizeText(reqRow.destination)) return sendJson(res, 400, { error: "Destination incompatible." });

        const t = nowIso();
        let reservationId = null;
        try {
            const ins = db.prepare(`
                INSERT INTO reservations(user_id,offer_id,parcel_request_id,status,proposed_price_per_kg,created_at,updated_at)
                VALUES (?,?,?,'pending',?,?,?)
            `).run(user.id, offer.id, reqRow.id, intRange(body.proposedPricePerKg || offer.pricePerKg, offer.pricePerKg, 1, 100000), t, t);
            reservationId = Number(ins.lastInsertRowid);
            db.prepare("UPDATE parcel_requests SET status='matched', updated_at=? WHERE id=?").run(t, reqRow.id);
        } catch {
            return sendJson(res, 409, { error: "Reservation deja existante." });
        }

        const row = db.prepare(`
            SELECT
                reservations.id, reservations.user_id AS requesterId, offers.user_id AS offerOwnerId,
                reservations.offer_id AS offerId, reservations.parcel_request_id AS parcelRequestId,
                reservations.status, reservations.proposed_price_per_kg AS proposedPricePerKg,
                reservations.created_at AS createdAt, reservations.updated_at AS updatedAt,
                offers.title AS offerTitle, parcel_requests.title AS requestTitle,
                offers.destination, offers.departure_date AS departureDate, parcel_requests.needed_by_date AS neededByDate,
                requester.full_name AS requesterName, owner.full_name AS offerOwnerName
            FROM reservations
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
            INNER JOIN users requester ON requester.id = reservations.user_id
            INNER JOIN users owner ON owner.id = offers.user_id
            WHERE reservations.id = ?
        `).get(reservationId);
        sendJson(res, 201, mapReservation(row));
        return;
    }

    if (req.method === "GET" && pathname === "/api/reservations") {
        const user = requireAuth(req, res);
        if (!user) return;
        const { page, pageSize, offset } = paginationFromQuery(requestUrl.searchParams);
        const status = sanitizeReservationStatus(String(requestUrl.searchParams.get("status") || ""));

        let query = `
            SELECT
                reservations.id, reservations.user_id AS requesterId, offers.user_id AS offerOwnerId,
                reservations.offer_id AS offerId, reservations.parcel_request_id AS parcelRequestId,
                reservations.status, reservations.proposed_price_per_kg AS proposedPricePerKg,
                reservations.created_at AS createdAt, reservations.updated_at AS updatedAt,
                offers.title AS offerTitle, parcel_requests.title AS requestTitle,
                offers.destination, offers.departure_date AS departureDate, parcel_requests.needed_by_date AS neededByDate,
                requester.full_name AS requesterName, owner.full_name AS offerOwnerName
            FROM reservations
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
            INNER JOIN users requester ON requester.id = reservations.user_id
            INNER JOIN users owner ON owner.id = offers.user_id
            WHERE (reservations.user_id = ? OR offers.user_id = ?)
        `;
        const args = [user.id, user.id];
        if (status) {
            query += " AND reservations.status = ?";
            args.push(status);
        }
        query += " ORDER BY reservations.updated_at DESC LIMIT ? OFFSET ?";
        args.push(pageSize, offset);
        const items = db.prepare(query).all(...args).map(mapReservation);
        sendJson(res, 200, { items, page, pageSize, total: items.length });
        return;
    }

    const reservationStatusMatch = pathname.match(/^\/api\/reservations\/(\d+)\/status$/);
    if (reservationStatusMatch && req.method === "PATCH") {
        const user = requireAuth(req, res);
        if (!user) return;
        const reservationId = Number(reservationStatusMatch[1]);
        const body = await parseBody(req);
        const target = sanitizeReservationStatus(String(body.status || ""));
        if (!target) return sendJson(res, 400, { error: "Statut invalide." });

        const reservation = db.prepare(`
            SELECT reservations.id,reservations.status,reservations.user_id AS requesterId,offers.user_id AS offerOwnerId,reservations.parcel_request_id AS parcelRequestId
            FROM reservations
            INNER JOIN offers ON offers.id = reservations.offer_id
            WHERE reservations.id = ?
        `).get(reservationId);
        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        if (!canTransition(reservation.status, target)) return sendJson(res, 400, { error: `Transition ${reservation.status} -> ${target} impossible.` });
        if (!actorCanTransition(reservation, user, target)) return sendJson(res, 403, { error: "Action non autorisee." });

        const t = nowIso();
        db.prepare("UPDATE reservations SET status=?, updated_at=? WHERE id=?").run(target, t, reservation.id);
        if (["canceled", "refused"].includes(target)) {
            db.prepare("UPDATE parcel_requests SET status='open', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        }
        if (target === "delivered") {
            db.prepare("UPDATE parcel_requests SET status='closed', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        }
        if (target === "agreed") {
            db.prepare("UPDATE parcel_requests SET status='closed', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        }
        sendJson(res, 200, { ok: true, id: reservation.id, status: target, updatedAt: t });
        return;
    }

    if (req.method === "POST" && pathname === "/api/conversations/by-reservation") {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        const reservationId = intRange(body.reservationId, 0, 1, 1_000_000_000);

        const reservation = db.prepare(`
            SELECT reservations.id,reservations.user_id AS requesterId,offers.user_id AS offerOwnerId
            FROM reservations
            INNER JOIN offers ON offers.id = reservations.offer_id
            WHERE reservations.id = ?
        `).get(reservationId);
        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        if (![reservation.requesterId, reservation.offerOwnerId].includes(user.id) && user.role !== "admin") {
            return sendJson(res, 403, { error: "Acces refuse." });
        }

        let thread = db.prepare("SELECT id,reservation_id AS reservationId FROM chat_threads WHERE reservation_id = ?").get(reservationId);
        if (!thread) {
            const id = `th_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const t = nowIso();
            db.prepare("INSERT INTO chat_threads(id,reservation_id,user_id,offer_owner_id,last_message_at,created_at) VALUES (?,?,?,?,?,?)")
                .run(id, reservationId, reservation.requesterId, reservation.offerOwnerId, t, t);
            db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,created_at) VALUES (?,?, 'system', NULL, ?, ?)")
                .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`, id, "Conversation liee a la reservation.", t);
            thread = { id, reservationId };
        }
        sendJson(res, 200, thread);
        return;
    }

    if (req.method === "GET" && pathname === "/api/conversations") {
        const user = requireAuth(req, res);
        if (!user) return;
        const rows = db.prepare(`
            SELECT
                chat_threads.id, chat_threads.reservation_id AS reservationId, chat_threads.last_message_at AS lastMessageAt,
                chat_threads.is_suspended AS threadSuspended,
                chat_threads.suspended_reason AS threadSuspendedReason,
                reservations.status AS reservationStatus, offers.title AS offerTitle, parcel_requests.title AS requestTitle,
                reservations.user_id AS requesterId,
                offers.user_id AS offerOwnerId,
                requester.full_name AS requesterName, ('https://i.pravatar.cc/150?u=' || requester.id) AS requesterAvatar,
                owner.full_name AS offerOwnerName, ('https://i.pravatar.cc/150?u=' || owner.id) AS offerOwnerAvatar,
                (SELECT text FROM chat_messages WHERE thread_id = chat_threads.id ORDER BY created_at DESC LIMIT 1) AS preview
            FROM chat_threads
            INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
            INNER JOIN users requester ON requester.id = reservations.user_id
            INNER JOIN users owner ON owner.id = offers.user_id
            WHERE chat_threads.user_id = ? OR chat_threads.offer_owner_id = ?
            ORDER BY chat_threads.last_message_at DESC
        `).all(user.id, user.id).map((row) => mapThread(row, user.id));
        sendJson(res, 200, rows);
        return;
    }

    const deleteConversationMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
    if (deleteConversationMatch && req.method === "DELETE") {
        const user = requireAuth(req, res);
        if (!user) return;
        const threadId = deleteConversationMatch[1];
        const thread = db.prepare("SELECT id,user_id AS userId,offer_owner_id AS ownerId FROM chat_threads WHERE id = ?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (![thread.userId, thread.ownerId].includes(user.id) && user.role !== "admin") {
            return sendJson(res, 403, { error: "Acces refuse." });
        }
        db.prepare("DELETE FROM chat_threads WHERE id = ?").run(threadId);
        sendJson(res, 200, { ok: true, id: threadId });
        return;
    }

    const messagesMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (messagesMatch && req.method === "GET") {
        const user = requireAuth(req, res);
        if (!user) return;
        const threadId = messagesMatch[1];
        const thread = db.prepare("SELECT id,user_id AS userId,offer_owner_id AS ownerId FROM chat_threads WHERE id = ?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (![thread.userId, thread.ownerId].includes(user.id) && user.role !== "admin") return sendJson(res, 403, { error: "Acces refuse." });

        const messages = db.prepare(`
            SELECT
                id,
                CASE
                    WHEN sender_type='system' THEN 'system'
                    WHEN sender_user_id=? THEN 'user'
                    ELSE 'traveler'
                END AS sender,
                text,
                created_at AS createdAt
            FROM chat_messages
            WHERE thread_id=?
            ORDER BY created_at ASC
        `).all(user.id, threadId);
        sendJson(res, 200, messages);
        return;
    }

    if (messagesMatch && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;
        const threadId = messagesMatch[1];
        const thread = db.prepare("SELECT id,user_id AS userId,offer_owner_id AS ownerId,is_suspended AS isSuspended FROM chat_threads WHERE id = ?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (![thread.userId, thread.ownerId].includes(user.id) && user.role !== "admin") return sendJson(res, 403, { error: "Acces refuse." });
        if (Number(thread.isSuspended) === 1) return sendJson(res, 403, { error: "Conversation suspendue par l'administration." });

        const body = await parseBody(req);
        const text = toSafeText(body.text, 1000);
        if (!text) return sendJson(res, 400, { error: "Message vide." });
        const createdAt = nowIso();
        const senderType = thread.ownerId === user.id ? "offer_owner" : "user";
        const id = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,created_at) VALUES (?,?,?,?,?,?)")
            .run(id, threadId, senderType, user.id, text, createdAt);
        db.prepare("UPDATE chat_threads SET last_message_at = ? WHERE id = ?").run(createdAt, threadId);
        sendJson(res, 201, { id, sender: senderType === "user" ? "user" : "traveler", text, createdAt });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/overview") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        sendJson(res, 200, {
            users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
            offers: db.prepare("SELECT COUNT(*) AS c FROM offers").get().c,
            parcelRequests: db.prepare("SELECT COUNT(*) AS c FROM parcel_requests").get().c,
            reservations: db.prepare("SELECT COUNT(*) AS c FROM reservations").get().c,
            pendingReservations: db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE status='pending'").get().c,
            unverifiedOffers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE is_verified=0").get().c,
            openFlags: db.prepare("SELECT COUNT(*) AS c FROM moderation_flags WHERE status='open'").get().c
        });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/offers/pending-verification") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName,
                offers.title, offers.origin, offers.destination, offers.departure_date AS departureDate, offers.flight_number AS flightNumber,
                offers.available_kg AS availableKg, offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified, offers.status, offers.created_at AS createdAt
            FROM offers
            INNER JOIN users ON users.id = offers.user_id
            WHERE offers.is_verified = 0
            ORDER BY offers.created_at DESC
        `).all().map(mapOffer);
        sendJson(res, 200, rows);
        return;
    }

    const verifyOfferMatch = pathname.match(/^\/api\/admin\/offers\/(\d+)\/verify$/);
    if (verifyOfferMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const offerId = Number(verifyOfferMatch[1]);
        db.prepare("UPDATE offers SET is_verified=1, updated_at=? WHERE id=?").run(nowIso(), offerId);
        sendJson(res, 200, { ok: true, offerId, verified: true });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/reservations") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                reservations.id, reservations.user_id AS requesterId, offers.user_id AS offerOwnerId,
                reservations.offer_id AS offerId, reservations.parcel_request_id AS parcelRequestId,
                reservations.status, reservations.proposed_price_per_kg AS proposedPricePerKg,
                reservations.created_at AS createdAt, reservations.updated_at AS updatedAt,
                offers.title AS offerTitle, parcel_requests.title AS requestTitle,
                offers.destination, offers.departure_date AS departureDate, parcel_requests.needed_by_date AS neededByDate,
                requester.full_name AS requesterName, owner.full_name AS offerOwnerName,
                chat_threads.id AS chatThreadId, chat_threads.is_suspended AS chatSuspended, chat_threads.suspended_reason AS chatSuspendedReason
            FROM reservations
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
            INNER JOIN users requester ON requester.id = reservations.user_id
            INNER JOIN users owner ON owner.id = offers.user_id
            LEFT JOIN chat_threads ON chat_threads.reservation_id = reservations.id
            ORDER BY reservations.updated_at DESC
            LIMIT 200
        `).all().map(mapReservation);
        sendJson(res, 200, rows);
        return;
    }

    const adminSuspendChatMatch = pathname.match(/^\/api\/admin\/reservations\/(\d+)\/chat\/suspend$/);
    if (adminSuspendChatMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const reservationId = Number(adminSuspendChatMatch[1]);
        const body = await parseBody(req);
        const reason = toSafeText(body.reason || "verification admin en cours", 280);
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id=?").get(reservationId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable pour cette reservation." });
        const t = nowIso();
        db.prepare("UPDATE chat_threads SET is_suspended=1, suspended_at=?, suspended_reason=? WHERE id=?").run(t, reason, thread.id);
        pushSystemMessage(thread.id, `Conversation suspendue par l'administration. Raison: ${reason}.`, t);
        sendJson(res, 200, { ok: true, reservationId, threadId: thread.id, suspended: true });
        return;
    }

    const adminDeleteChatMatch = pathname.match(/^\/api\/admin\/reservations\/(\d+)\/chat$/);
    if (adminDeleteChatMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const reservationId = Number(adminDeleteChatMatch[1]);
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id=?").get(reservationId);
        if (!thread) {
            sendJson(res, 200, { ok: true, reservationId, deleted: false });
            return;
        }
        db.prepare("DELETE FROM chat_threads WHERE id=?").run(thread.id);
        sendJson(res, 200, { ok: true, reservationId, deleted: true, threadId: thread.id });
        return;
    }

    const adminSuspendAgreementMatch = pathname.match(/^\/api\/admin\/reservations\/(\d+)\/agreement\/suspend$/);
    if (adminSuspendAgreementMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const reservationId = Number(adminSuspendAgreementMatch[1]);
        const reservation = db.prepare("SELECT id,status,parcel_request_id AS parcelRequestId FROM reservations WHERE id=?").get(reservationId);
        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        if (String(reservation.status) !== "agreed") {
            return sendJson(res, 400, { error: "La reservation n'est pas en statut accordee." });
        }
        const t = nowIso();
        db.prepare("UPDATE reservations SET status='pending', updated_at=? WHERE id=?").run(t, reservation.id);
        db.prepare("UPDATE parcel_requests SET status='matched', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id=?").get(reservation.id);
        if (thread) {
            pushSystemMessage(thread.id, "Accord suspendu par l'administration. Le statut revient a En attente.", t);
            db.prepare("UPDATE chat_threads SET warning_sent_at=NULL, delete_after_at=NULL WHERE id=?").run(thread.id);
        }
        sendJson(res, 200, { ok: true, reservationId: reservation.id, status: "pending", updatedAt: t });
        return;
    }

    if (req.method === "POST" && pathname === "/api/admin/flags") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const body = await parseBody(req);
        const entityType = requiredText(body.entityType, "entityType", 60);
        const entityId = intRange(body.entityId, 0, 1, 1_000_000_000);
        const reason = requiredText(body.reason, "reason", 400);
        const result = db.prepare(`
            INSERT INTO moderation_flags(entity_type,entity_id,reason,status,created_by,created_at)
            VALUES (?,? ,?,'open',?,?)
        `).run(entityType, entityId, reason, admin.id, nowIso());
        sendJson(res, 201, { id: Number(result.lastInsertRowid), entityType, entityId, reason, status: "open" });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/flags") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                moderation_flags.id,
                moderation_flags.entity_type AS entityType,
                moderation_flags.entity_id AS entityId,
                moderation_flags.reason,
                moderation_flags.status,
                moderation_flags.created_at AS createdAt,
                creator.full_name AS createdByName,
                resolver.full_name AS resolvedByName,
                moderation_flags.resolved_at AS resolvedAt
            FROM moderation_flags
            INNER JOIN users creator ON creator.id = moderation_flags.created_by
            LEFT JOIN users resolver ON resolver.id = moderation_flags.resolved_by
            ORDER BY moderation_flags.created_at DESC
            LIMIT 300
        `).all();
        sendJson(res, 200, rows);
        return;
    }

    const resolveFlagMatch = pathname.match(/^\/api\/admin\/flags\/(\d+)\/resolve$/);
    if (resolveFlagMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const flagId = Number(resolveFlagMatch[1]);
        db.prepare("UPDATE moderation_flags SET status='resolved', resolved_by=?, resolved_at=? WHERE id=?")
            .run(admin.id, nowIso(), flagId);
        sendJson(res, 200, { ok: true, flagId, status: "resolved" });
        return;
    }

    sendJson(res, 404, { error: "Route API introuvable." });
}

async function serveStatic(req, res, requestUrl) {
    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed");
        return;
    }
    let relativePath = decodeURIComponent(requestUrl.pathname);
    if (relativePath === "/") relativePath = "/index.html";

    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, "");
    const absolutePath = path.join(ROOT_DIR, safePath);
    if (!absolutePath.startsWith(ROOT_DIR)) return sendText(res, 403, "Forbidden");

    try {
        const stat = await fsp.stat(absolutePath);
        if (stat.isDirectory()) return sendText(res, 403, "Forbidden");
        const data = await fsp.readFile(absolutePath);
        res.writeHead(200, { "Content-Type": contentTypeFor(absolutePath) });
        if (req.method === "HEAD") return res.end();
        res.end(data);
    } catch {
        sendText(res, 404, "Not Found");
    }
}

const server = http.createServer(async (req, res) => {
    const started = Date.now();
    let statusCode = 500;
    const origWriteHead = res.writeHead.bind(res);
    res.writeHead = (code, ...args) => {
        statusCode = code;
        return origWriteHead(code, ...args);
    };

    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
        if (requestUrl.pathname.startsWith("/api/")) {
            await handleApi(req, res, requestUrl);
        } else {
            await serveStatic(req, res, requestUrl);
        }
    } catch (error) {
        statusCode = 500;
        sendJson(res, 500, { error: "Erreur interne du serveur.", detail: String(error.message || error) });
    } finally {
        logRequest(req, statusCode, Date.now() - started);
    }
});

server.listen(PORT, HOST, () => {
    console.log(`ColisConnect backend SQL v2: http://${HOST}:${PORT}`);
});
