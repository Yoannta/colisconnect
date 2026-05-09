const http = require("http");
const https = require("https");
const { exec, spawn } = require("child_process");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, ".env") });
// ------------------------------------
// OCR Local retiré : utilisation de Qwen Vision (Alibaba Cloud)
// ------------------------------------

const fsp = require("fs/promises");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const { analyzeMessage, checkSuspiciousWords } = require("./messageFilter");
const aiModerator = require("./aiModerator");
const adminBot = require("./adminBot");
const { verifyPassportImage, verifyPaymentReceipt } = require("./identityVerifier");

const paystack = require("./paystackService");

const HOST = String(process.env.HOST || "0.0.0.0").trim() || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = path.resolve(__dirname, "..");

process.on('unhandledRejection', (reason, p) => {
    console.error('[CRITICAL] Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
});
const DB_FILE = path.join(__dirname, "colisconnect.sqlite");
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

async function verifyFlight(payload = {}) {
    const flightNumber = normalizeFlightNumber(payload.number || payload.flightNumber || "");
    if (!/^[A-Z]{2}\d{2,4}$/.test(flightNumber)) {
        return { exists: false, error: "Format du numero de vol invalide. Exemple: AF750." };
    }

    const departureDate = String(payload.departureDate || payload.date || "").slice(0, 10);

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
    const text = await parseBodyText(req);
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

async function parseBodyText(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) throw new Error("Payload too large");
        chunks.push(chunk);
    }
    if (!chunks.length) return "";
    return Buffer.concat(chunks).toString("utf-8");
}

async function parseRawBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) throw new Error("Payload too large");
        chunks.push(chunk);
    }
    if (!chunks.length) return { rawBody: "", json: {} };
    const rawBody = Buffer.concat(chunks).toString("utf-8");
    let json = {};
    try { json = JSON.parse(rawBody || "{}"); } catch (e) { }
    return { rawBody, json };
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

function normalizePhone(value) {
    const compact = String(value || "")
        .replace(/[^\d+]/g, "")
        .trim()
        .slice(0, 24);
    return compact;
}

function sanitizeImageDataUrl(value, fieldLabel) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const compact = raw.replace(/\s+/g, "");
    if (!compact.startsWith("data:image/") || !compact.includes(";base64,")) {
        const err = new Error(`${fieldLabel} invalide. Utilisez une image (PNG/JPG/WEBP).`);
        err.statusCode = 400;
        throw err;
    }
    if (compact.length > 3_500_000) {
        const err = new Error(`${fieldLabel} trop volumineux (max ~2.5MB).`);
        err.statusCode = 400;
        throw err;
    }
    return compact;
}

function computeProfileCompletion(row = {}) {
    const phoneValue = String(row.phoneNumber ?? row.phone_number ?? "").trim();
    const identityValue = String(row.identityDocument ?? row.identity_document ?? "").trim();
    const photoValue = String(row.profilePhoto ?? row.profile_photo ?? "").trim();
    const qrValue = String(row.paymentQrCode ?? row.payment_qr_code ?? "").trim();

    const hasPhone = phoneValue.length >= 8;
    const isRejected = row.identityRejectionReason || row.identity_rejection_reason;
    const hasIdentityDocument = (row.hasIdentityDocument !== undefined
        ? (row.hasIdentityDocument === true || Number(row.hasIdentityDocument) === 1)
        : Boolean(identityValue)) && !isRejected;
    const hasProfilePhoto = row.hasProfilePhoto !== undefined
        ? (row.hasProfilePhoto === true || Number(row.hasProfilePhoto) === 1)
        : Boolean(photoValue);
    const hasPaymentQrCode = row.hasPaymentQrCode !== undefined
        ? (row.hasPaymentQrCode === true || Number(row.hasPaymentQrCode) === 1)
        : Boolean(qrValue);

    const hasCountry = String(row.country || "").trim().length > 0;

    const missingFields = [];
    if (!hasPhone) missingFields.push("phoneNumber");
    if (!hasIdentityDocument) missingFields.push("identityDocument");
    if (!hasProfilePhoto) missingFields.push("profilePhoto");
    if (!hasCountry) missingFields.push("country");

    const completedSteps = 1 + (hasPhone ? 1 : 0) + (hasIdentityDocument ? 1 : 0) + (hasProfilePhoto ? 1 : 0) + (hasCountry ? 1 : 0);
    const percent = Math.round((completedSteps / 5) * 100);

    return {
        percent,
        isComplete: missingFields.length === 0,
        hasPhone,
        hasIdentityDocument,
        hasProfilePhoto,
        hasPaymentQrCode,
        hasCountry,
        missingFields
    };
}

function mapUserForClient(row = {}) {
    const completion = computeProfileCompletion(row);
    return {
        id: Number(row.id),
        fullName: row.fullName || "",
        email: row.email || "",
        role: row.role || "user",
        isActive: Number(row.isActive) === 1,
        isVerified: Number(row.isVerified) === 1,
        kycStatus: row.kycStatus || row.kyc_status || "not_started",
        identityDocumentApproved: Number(row.identityDocumentApproved) === 1,
        identityRejectionReason: row.identityRejectionReason || row.identity_rejection_reason || "",
        profilePhotoApproved: Number(row.profilePhotoApproved) === 1,
        phoneNumber: String(row.phoneNumber || ""),
        referralCode: String(row.referralCode ?? row.referral_code ?? ""),
        paymentQrCode: String(row.paymentQrCode ?? row.payment_qr_code ?? ""),
        alipayQr: String(row.alipayQr ?? row.alipay_qr ?? ""),
        wechatQr: String(row.wechatQr ?? row.wechat_qr ?? ""),
        hasIdentityDocument: completion.hasIdentityDocument,
        hasProfilePhoto: completion.hasProfilePhoto,
        hasPaymentQrCode: !!(row.paymentQrCode || row.payment_qr_code || row.alipay_qr || row.alipayQr),
        hasAlipayQr: !!(row.alipayQr || row.alipay_qr),
        hasWechatQr: !!(row.wechatQr || row.wechat_qr),
        country: row.country || "",
        profileCompletion: completion
    };
}

function getUserById(userId) {
    return db.prepare(`
        SELECT
            id,
            full_name AS fullName,
            email,
            role,
            is_active AS isActive,
            is_verified AS isVerified,
            phone_number AS phoneNumber,
            identity_document AS identityDocument,
            profile_photo AS profilePhoto,
            identity_document_approved AS identityDocumentApproved,
            profile_photo_approved AS profilePhotoApproved,
            identity_rejection_reason AS identityRejectionReason,
            kyc_status AS kycStatus,
            referral_code AS referralCode,
            stripe_account_id AS stripeAccountId,
            payment_qr_code AS paymentQrCode,
            alipay_qr AS alipayQr,
            wechat_qr AS wechatQr,
            country
        FROM users
        WHERE id = ?
    `).get(Number(userId));
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
        SELECT
            users.id,
            users.full_name AS fullName,
            users.email,
            users.role,
            users.is_active AS isActive,
            users.is_verified AS isVerified,
            users.phone_number AS phoneNumber,
            users.identity_document AS identityDocument,
            users.profile_photo AS profilePhoto,
            users.identity_document_approved AS identityDocumentApproved,
            users.profile_photo_approved AS profilePhotoApproved,
            users.identity_rejection_reason AS identityRejectionReason,
            users.referral_code AS referralCode,
            users.payment_qr_code AS paymentQrCode,
            users.alipay_qr AS alipayQr,
            users.wechat_qr AS wechatQr,
            users.country,
            sessions.token
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
    `).get(token, nowIso());
    if (!row || !row.isActive) return null;
    db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token = ?").run(nowIso(), token);
    const user = mapUserForClient(row);
    user.token = row.token;
    return user;
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

function ensureUserVerifiedForSensitiveAction(user, res) {
    if (!user) return false;
    if (String(user.role || "").toLowerCase() === "admin") return true;
    if (Number(user.isVerified) === 1 || user.isVerified === true) return true;
    const completion = user.profileCompletion || computeProfileCompletion(user);
    const pendingApproval = Number(completion.percent || 0) >= 75;
    sendJson(res, 403, {
        error: pendingApproval ? "APPROVAL_PENDING" : "PROFILE_COMPLETION_REQUIRED",
        code: pendingApproval ? "APPROVAL_PENDING" : "PROFILE_COMPLETION_REQUIRED",
        message: pendingApproval
            ? "Votre dossier est en attente d'approbation admin."
            : "Profil incomplet. Ajoutez telephone, piece justificative et photo.",
        isVerified: false,
        profileCompletion: completion
    });
    return false;
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

function safeJson(value) {
    try {
        return JSON.stringify(value || {});
    } catch {
        return "{}";
    }
}

function recordAdminAudit(adminId, actionType, entityType, entityId, details = {}) {
    if (!adminId || !actionType || !entityType) return;
    db.prepare(`
        INSERT INTO admin_audit_log(admin_user_id,action_type,entity_type,entity_id,details,created_at)
        VALUES (?,?,?,?,?,?)
    `).run(
        Number(adminId),
        toSafeText(actionType, 80),
        toSafeText(entityType, 80),
        String(entityId ?? ""),
        safeJson(details),
        nowIso()
    );
}

function pushAdminInboxMessage(userId, section, text, adminId = null) {
    const safeText = toSafeText(text, 1200);
    const safeSection = toSafeText(section, 80) || "general";
    if (!userId || !safeText) return;
    db.prepare(`
        INSERT INTO admin_inbox_messages(user_id,section,text,is_read,created_by_admin_id,created_at)
        VALUES (?,?,?,0,?,?)
    `).run(Number(userId), safeSection, safeText, adminId ? Number(adminId) : null, nowIso());
}

async function notifyAdminNtfy(message, title = "ColisConnect Alert", clickUrl = "") {
    const isWindows = process.platform === "win32";
    const topic = "colisconnect_admin_alerts_yoann";

    if (isWindows) {
        // --- MÉTHODE LOCALE (Windows / PowerShell) ---
        // Utilisée pour contourner les blocages réseau spécifiques à Node sur Windows local
        console.log(`[ntfy] Envoi via PowerShell (OS détecté: ${process.platform})`);
        return new Promise((resolve) => {
            const msg = message.replace(/"/g, '""');
            const headTitle = title.replace(/"/g, '""');
            const clickHeader = clickUrl ? `; "Click"="${clickUrl}"` : "";
            const psCommand = `Invoke-RestMethod -Method Post -Uri "https://ntfy.sh/${topic}" -Body ([System.Text.Encoding]::UTF8.GetBytes("${msg}")) -Headers @{"Title"="${headTitle}"${clickHeader}}`;

            exec(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, (error) => {
                if (error) {
                    console.error("[ntfy] Erreur via PowerShell");
                    resolve(false);
                } else {
                    console.log("[ntfy] Succès (PowerShell)");
                    resolve(true);
                }
            });
        });
    } else {
        // --- MÉTHODE SERVEUR (Linux / Standard) ---
        // Utilisée pour la production sur un serveur d'hébergement classique
        console.log(`[ntfy] Envoi via HTTPS natif (OS détecté: ${process.platform})`);
        return new Promise((resolve) => {
            const options = {
                hostname: "ntfy.sh",
                port: 443,
                path: `/${topic}`,
                method: "POST",
                headers: {
                    "Title": title,
                    "Priority": "high",
                    "Tags": "bell,package",
                    "Content-Type": "text/plain; charset=utf-8"
                }
            };
            if (clickUrl) options.headers["Click"] = clickUrl;

            const req = https.request(options, (res) => {
                res.on("data", () => { });
                res.on("end", () => {
                    console.log(`[ntfy] Succès (HTTPS Natif) - Code: ${res.statusCode}`);
                    resolve(true);
                });
            });
            req.on("error", (err) => {
                console.error("[ntfy] Erreur HTTPS Natif:", err.message);
                resolve(false);
            });
            req.write(Buffer.from(message, "utf-8"));
            req.end();
        });
    }
}

function recomputeUserVerification(userId) {
    const row = db.prepare(`
        SELECT
            id, full_name, email, role,
            is_active AS isActive,
            phone_number AS phoneNumber,
            identity_document AS identityDocument,
            profile_photo AS profilePhoto,
            identity_document_approved AS identityApproved,
            profile_photo_approved AS photoApproved,
            referral_code AS referralCode,
            stripe_account_id AS stripeAccountId,
            payment_qr_code AS paymentQrCode
        FROM users
        WHERE id = ?
    `).get(Number(userId));

    if (!row) return null;

    if (String(row.role || "").toLowerCase() === "admin") {
        db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(Number(userId));
        row.isVerified = 1;
    } else {
        const verified = Number(row.isActive) === 1 && Number(row.identityApproved) === 1;
        db.prepare("UPDATE users SET is_verified = ? WHERE id = ?").run(verified ? 1 : 0, Number(userId));
        row.isVerified = verified ? 1 : 0;
    }

    return mapUserForClient(row);
}

function normalizeBlockType(value) {
    const key = String(value || "").toLowerCase().trim();
    return key === "ip" || key === "email" ? key : null;
}

function purgeExpiredAuthBlocks() {
    db.prepare("DELETE FROM auth_blocks WHERE expires_at <= ?").run(nowIso());
}

function findActiveAuthBlock(type, value) {
    const blockType = normalizeBlockType(type);
    const key = toSafeText(value, 220);
    if (!blockType || !key) return null;
    return db.prepare(`
        SELECT id, block_type AS blockType, value, reason, expires_at AS expiresAt
        FROM auth_blocks
        WHERE block_type = ? AND value = ? AND expires_at > ?
        LIMIT 1
    `).get(blockType, key, nowIso());
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
    pending: ["voyageur_paye", "canceled"],
    voyageur_paye: ["colisconnect_paye", "canceled"],
    colisconnect_paye: ["canceled"],
    canceled: []
};

function sanitizeReservationStatus(value) {
    const allowed = new Set(["pending", "voyageur_paye", "colisconnect_paye", "canceled"]);
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

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_type TEXT NOT NULL,
  value TEXT NOT NULL,
  reason TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(block_type, value),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'commission' or 'payment'
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'canceled'
  created_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_reservation ON transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

CREATE TABLE IF NOT EXISTS admin_inbox_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  section TEXT NOT NULL DEFAULT 'general',
  text TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_destination ON offers(destination);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_requests_destination ON parcel_requests(destination);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON chat_threads(last_message_at);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_blocks_expiry ON auth_blocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_user_created_at ON admin_inbox_messages(user_id, created_at);

CREATE TABLE IF NOT EXISTS ai_moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  reservation_id INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT 'none',
  flags TEXT NOT NULL DEFAULT '[]',
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_thread ON ai_moderation_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_risk ON ai_moderation_logs(risk_level, is_dismissed, created_at);
`);

    ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'user'");
    ensureColumn("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
    ensureColumn("users", "is_verified", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("users", "phone_number", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("users", "identity_document", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("users", "profile_photo", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("users", "identity_document_approved", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("users", "profile_photo_approved", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("users", "identity_rejection_reason", "TEXT");
    ensureColumn("users", "kyc_status", "TEXT DEFAULT 'not_started'");
    ensureColumn("users", "payment_qr_code", "TEXT");
    ensureColumn("users", "alipay_qr", "TEXT");
    ensureColumn("users", "wechat_qr", "TEXT");
    ensureColumn("chat_threads", "last_ai_check_at", "TEXT");
    ensureColumn("sessions", "last_seen_at", "TEXT");
    ensureColumn("offers", "flight_number", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("offers", "payment_method", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("offers", "payment_qr", "TEXT NOT NULL DEFAULT ''");
    ensureColumn("chat_threads", "is_suspended", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("chat_threads", "suspended_at", "TEXT");
    ensureColumn("chat_threads", "suspended_reason", "TEXT");
    ensureColumn("chat_threads", "warning_sent_at", "TEXT");
    ensureColumn("chat_threads", "delete_after_at", "TEXT");
    ensureColumn("chat_threads", "deleted_by_buyer", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("chat_threads", "deleted_by_seller", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("chat_messages", "message_type", "TEXT NOT NULL DEFAULT 'text'");
    // Flutterwave payment tracking
    ensureColumn("reservations", "payment_provider", "TEXT");
    ensureColumn("reservations", "payment_tx_id", "TEXT");
    ensureColumn("chat_messages", "visible_to", "TEXT NOT NULL DEFAULT 'all'");
    db.prepare("UPDATE users SET is_verified=1 WHERE role='admin'").run();

    // Drop legacy chat tables from v1 that can keep broken FKs to missing `travelers`.
    const hasLegacyConversations = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'").get();
    const hasLegacyMessages = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get();
    if (hasLegacyMessages || hasLegacyConversations) {
        db.exec("DROP TABLE IF EXISTS messages;");
        db.exec("DROP TABLE IF EXISTS conversations;");
    }

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
        ownerIsVerified: Boolean(Number(row.ownerIsVerified || 0)),
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
        createdAt: row.createdAt,
        paymentMethod: row.paymentMethod || "",
        paymentQr: row.paymentQr || "",
        baseCurrency: row.baseCurrency || "EUR"
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
    // The client (non-owner) needs the offer owner's payment QR to pay the traveler
    const travelerPaymentQr = !isOfferOwner ? (row.offerOwnerPaymentQr || "") : "";
    return {
        id: row.id,
        reservationId: row.reservationId,
        travelerName: counterpartName || "Contact",
        travelerAvatar: counterpartAvatar || "https://i.pravatar.cc/150?u=default",
        status: row.reservationStatus,
        isOfferOwner,
        canMarkAgreed,
        isSuspended,
        suspendedReason: row.threadSuspendedReason || "",
        lastMessageAt: row.lastMessageAt,
        preview: row.preview || "Aucun message",
        offerTitle: row.offerTitle,
        requestTitle: row.requestTitle,
        travelerPaymentQr,
        reservation: {
            id: row.reservationId,
            status: row.reservationStatus,
            proposedPricePerKg: row.proposedPricePerKg || null,
            weightKg: row.weightKg || 1
        }
    };
}

function mapAdminConversation(row) {
    return {
        id: row.id,
        reservationId: row.reservationId,
        requesterId: row.requesterId,
        offerOwnerId: row.offerOwnerId,
        requesterName: row.requesterName,
        offerOwnerName: row.offerOwnerName,
        reservationStatus: row.reservationStatus,
        isSuspended: Boolean(Number(row.isSuspended || 0)),
        suspendedReason: row.suspendedReason || "",
        lastMessageAt: row.lastMessageAt,
        createdAt: row.createdAt,
        messageCount: Number(row.messageCount || 0),
        preview: row.preview || "",
        offerTitle: row.offerTitle || "",
        destination: row.destination || ""
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

    if (req.method === "GET" && pathname === "/api/settings/platform-qr") {
        const row = db.prepare("SELECT value FROM system_settings WHERE key = 'platform_qr_code'").get();
        sendJson(res, 200, { qrCode: row?.value || "" });
        return;
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
        const body = await parseBody(req);
        const fullName = requiredText(body.fullName, "fullName", 120);
        const email = requiredText(body.email, "email", 180).toLowerCase();
        const password = String(body.password || "");

        const country = toSafeText(body.country || "", 120);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: "Email invalide." });
        if (password.length < 8) return sendJson(res, 400, { error: "Mot de passe minimum 8 caracteres." });
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return sendJson(res, 409, { error: "Cet email existe deja." });

        const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
        let role = adminExists ? "user" : "admin";
        if (adminExists && body.role === "partner") {
            role = "partner";
        }

        const result = db.prepare(
            "INSERT INTO users(full_name,email,password_hash,role,country,is_active,is_verified,created_at) VALUES (?,?,?,?,?,1,0,?)"
        ).run(fullName, email, hashPassword(password), role, country, nowIso());

        const userId = Number(result.lastInsertRowid);
        const token = createSession(userId);
        const user = mapUserForClient(getUserById(userId));

        sendJson(res, 201, { token, user });
        return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
        const body = await parseBody(req);
        const email = toSafeText(body.email, 180).toLowerCase();
        const password = String(body.password || "");
        if (!email || !password) return sendJson(res, 400, { error: "email et mot de passe requis." });

        purgeExpiredAuthBlocks();
        const ip = getIp(req);
        const ipBlock = findActiveAuthBlock("ip", ip);
        if (ipBlock) {
            return sendJson(res, 403, { error: `Connexion bloquee (IP). Motif: ${ipBlock.reason}` });
        }
        const emailBlock = findActiveAuthBlock("email", email);
        if (emailBlock) {
            return sendJson(res, 403, { error: `Connexion bloquee (email). Motif: ${emailBlock.reason}` });
        }

        const rate = checkLoginRate(req, email);
        if (!rate.allowed) return sendJson(res, 429, { error: `Trop de tentatives. Reessayez dans ${rate.retry}s.` });

        const user = db.prepare(
            `SELECT
                id,
                full_name AS fullName,
                email,
                password_hash AS passwordHash,
                role,
                is_active AS isActive,
                is_verified AS isVerified,
                phone_number AS phoneNumber,
                identity_document AS identityDocument,
                profile_photo AS profilePhoto,
                identity_document_approved AS identityDocumentApproved,
                profile_photo_approved AS profilePhotoApproved,
                kyc_status AS kycStatus
            FROM users
            WHERE email = ?`
        ).get(email);
        if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
            addFailedRateAttempt(rate.key);
            return sendJson(res, 401, { error: "Identifiants invalides." });
        }

        clearRateAttempts(rate.key);
        const token = createSession(user.id);
        sendJson(res, 200, { ok: true, token, user: mapUserForClient(user) });

        return;
    }

    if (req.method === "POST" && pathname === "/api/me/payment-qrs") {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);

        const alipayQr = body.alipayQr ? sanitizeImageDataUrl(body.alipayQr, "QR Alipay") : null;
        const wechatQr = body.wechatQr ? sanitizeImageDataUrl(body.wechatQr, "QR WeChat") : null;

        const updates = [];
        const args = [];

        if (alipayQr !== null) {
            updates.push("alipay_qr = ?");
            args.push(alipayQr);
        }
        if (wechatQr !== null) {
            updates.push("wechat_qr = ?");
            args.push(wechatQr);
        }

        if (!updates.length) {
            return sendJson(res, 400, { error: "Aucun QR code fourni." });
        }
        if (Object.prototype.hasOwnProperty.call(body, "country")) {
            const country = toSafeText(body.country || "", 120);
            updates.push("country = ?");
            args.push(country);
        }

        if (updates.length > 0) {
            args.push(user.id);
            db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...args);
        }
        const updated = getUserById(user.id);
        sendJson(res, 200, { ok: true, user: mapUserForClient(updated) });
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

    if (req.method === "PATCH" && pathname === "/api/users/me/profile") {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);

        const updates = [];
        const args = [];

        if (Object.prototype.hasOwnProperty.call(body, "phoneNumber")) {
            const phoneNumber = normalizePhone(body.phoneNumber);
            if (phoneNumber && phoneNumber.replace(/\D/g, "").length < 8) {
                return sendJson(res, 400, { error: "Numero de telephone invalide." });
            }
            updates.push("phone_number = ?");
            args.push(phoneNumber);
        }

        if (Object.prototype.hasOwnProperty.call(body, "identityDocumentData")) {
            const identityDocument = sanitizeImageDataUrl(body.identityDocumentData, "Piece justificative");
            updates.push("identity_document = ?");
            args.push(identityDocument);

            // [KYC ASYNC] Mise à jour du statut en 'pending' et traitement tâche de fond
            db.prepare("UPDATE users SET kyc_status = 'pending', identity_document_approved = 0, is_verified = 0 WHERE id = ?").run(user.id);

            // Correction locale pour éviter les conflits dans le background
            const userIdConst = user.id;
            const userNameConst = user.fullName || "Utilisateur";

            setTimeout(async () => {
                console.log(`[KYC Background] Début analyse pour User#${userIdConst}`);
                try {
                    const verdict = await verifyPassportImage(identityDocument);
                    const t = nowIso();

                    if (verdict && verdict.is_approved && (verdict.confidence || 0) >= 0.8) {
                        // APPROBATION AUTOMATIQUE (Haute confiance)
                        db.prepare("UPDATE users SET identity_document_approved = 1, is_verified = 1, kyc_status = 'approved', identity_rejection_reason = NULL WHERE id = ?").run(userIdConst);
                        pushAdminInboxMessage(userIdConst, "sécurité", "Félicitations ! Votre pièce d'identité a été validée automatiquement. Votre compte est maintenant vérifié.");
                        console.log(`[KYC Background] ✅ APPROUVÉ pour User#${userIdConst} (Confiance: ${verdict.confidence})`);
                    } else if (verdict && verdict.is_passport) {
                        // REVUE MANUELLE (Doute ou suspicion de faux/scan/écrans)
                        db.prepare("UPDATE users SET kyc_status = 'manual_review' WHERE id = ?").run(userIdConst);
                        pushAdminInboxMessage(userIdConst, "sécurité", "Votre document est en cours de revue manuelle par nos services de sécurité. Vous serez informé du résultat sous 24h.");
                        console.log(`[KYC Background] 👁️ REVUE MANUELLE pour User#${userIdConst} (Motif: ${verdict.reason})`);

                        notifyAdminNtfy(
                            `Revue KYC Requise: ${userNameConst}`,
                            `L'IA a un doute sur le document (Confiance: ${verdict.confidence || 'N/A'}). Motif: ${verdict.reason}`,
                            "medium"
                        ).catch(() => { });
                    } else {
                        // REJET AUTOMATIQUE
                        const reason = verdict?.reason || "Document non conforme ou illisible.";
                        db.prepare("UPDATE users SET kyc_status = 'rejected', identity_rejection_reason = ? WHERE id = ?").run(reason, userIdConst);
                        pushAdminInboxMessage(userIdConst, "sécurité", `Votre document d'identité a été rejeté : ${reason}. Veuillez soumettre une photo nette du document original.`);
                        console.log(`[KYC Background] ❌ REJETÉ pour User#${userIdConst} (Motif: ${reason})`);
                    }
                } catch (err) {
                    console.error(`[KYC Background] Erreur critique pour User#${userIdConst}:`, err.message);
                }
            }, 100); // Petit délai pour laisser la requête s'achever proprement
        }

        if (Object.prototype.hasOwnProperty.call(body, "profilePhotoData")) {
            const profilePhoto = sanitizeImageDataUrl(body.profilePhotoData, "Photo de profil");
            updates.push("profile_photo = ?");
            args.push(profilePhoto);
            updates.push("profile_photo_approved = 0");
        }

        if (Object.prototype.hasOwnProperty.call(body, "paymentQrCodeData")) {
            const paymentQrCode = sanitizeImageDataUrl(body.paymentQrCodeData, "QR Code de paiement");
            updates.push("payment_qr_code = ?");
            args.push(paymentQrCode);
        }

        if (Object.prototype.hasOwnProperty.call(body, "country")) {
            const country = toSafeText(body.country || "", 120);
            updates.push("country = ?");
            args.push(country);
        }

        if (updates.length) {
            db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...args, Number(user.id));

            const refreshed = recomputeUserVerification(user.id);
            if (refreshed && refreshed.profileCompletion.percent >= 75 && !refreshed.isVerified) {
                const appUrl = "https://nonservile-niki-unasking.ngrok-free.dev/approvals.html";
                // Suppression du await pour éviter de bloquer la réponse pendant 6s sur Windows
                notifyAdminNtfy(
                    `Profil de ${refreshed.fullName} complet à ${refreshed.profileCompletion.percent}%. Cliquez pour verifier.`,
                    "Attente Approbation",
                    appUrl
                ).catch(() => { });
            }
        }

        const refreshed = mapUserForClient(getUserById(user.id));
        sendJson(res, 200, { ok: true, user: refreshed });
        return;
    }

    if (req.method === "GET" && pathname === "/api/me/notification-counts") {
        const user = requireAuth(req, res);
        if (!user) return;

        // Count unread admin messages
        const adminUnread = db.prepare(
            "SELECT COUNT(*) AS c FROM admin_inbox_messages WHERE user_id = ? AND is_read = 0"
        ).get(user.id)?.c || 0;

        // Count conversations with at least one message newer than last time user was in thread.
        // Simple heuristic: count threads where last_message_at is recent and the last sender is not the current user.
        const chatUnread = db.prepare(`
            SELECT COUNT(*) AS c
            FROM chat_threads
            INNER JOIN chat_messages ON chat_messages.thread_id = chat_threads.id
            WHERE (chat_threads.user_id = ? OR chat_threads.offer_owner_id = ?)
              AND chat_messages.id = (
                  SELECT id FROM chat_messages m2
                  WHERE m2.thread_id = chat_threads.id
                  ORDER BY m2.created_at DESC LIMIT 1
              )
              AND chat_messages.sender_user_id != ?
              AND chat_messages.sender_user_id IS NOT NULL
              AND chat_threads.last_message_at > datetime('now', '-30 days')
        `).get(user.id, user.id, user.id)?.c || 0;

        sendJson(res, 200, {
            chatUnread: Number(chatUnread),
            adminUnread: Number(adminUnread),
            total: Number(chatUnread) + Number(adminUnread)
        });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/inbox") {
        const user = requireAuth(req, res);
        if (!user) return;
        const items = db.prepare(`
            SELECT
                admin_inbox_messages.id,
                admin_inbox_messages.section,
                admin_inbox_messages.text,
                admin_inbox_messages.is_read AS isRead,
                admin_inbox_messages.created_at AS createdAt,
                users.full_name AS adminName
            FROM admin_inbox_messages
            LEFT JOIN users ON users.id = admin_inbox_messages.created_by_admin_id
            WHERE admin_inbox_messages.user_id = ?
            ORDER BY admin_inbox_messages.created_at DESC
            LIMIT 120
        `).all(user.id).map((row) => ({
            id: row.id,
            section: row.section || "general",
            text: row.text || "",
            isRead: Number(row.isRead) === 1,
            createdAt: row.createdAt,
            adminName: row.adminName || "Administration"
        }));

        // Marquer tous les messages admin comme lus pour dédouaner la notification
        try {
            db.prepare("UPDATE admin_inbox_messages SET is_read = 1 WHERE user_id = ? AND is_read = 0").run(user.id);
        } catch (e) {
            console.error("Erreur mark-as-read admin inbox:", e);
        }

        sendJson(res, 200, { items });
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
                offers.id, offers.user_id AS userId, users.full_name AS ownerName, users.is_verified AS ownerIsVerified,
                offers.title, offers.origin, offers.destination,
                offers.departure_date AS departureDate, offers.flight_number AS flightNumber, offers.available_kg AS availableKg,
                offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified,
                offers.status, offers.created_at AS createdAt,
                offers.payment_method AS paymentMethod, offers.payment_qr AS paymentQr,
                offers.base_currency AS baseCurrency
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
        console.log("[DEBUG] Début POST /api/offers");
        const user = requireAuth(req, res);
        console.log("[DEBUG] User auth:", user ? user.id : "null");
        if (!user) return;
        if (!ensureUserVerifiedForSensitiveAction(user, res)) return;

        console.log("[DEBUG] Parsing body...");
        const body = await parseBody(req);
        console.log("[DEBUG] Body reçu:", JSON.stringify(body).slice(0, 100));

        const title = requiredText(body.title || `Trajet vers ${body.destination || "destination"}`, "title", 140);
        const origin = requiredText(body.origin || body.departure || "Non precise", "origin", 140);
        const destination = requiredText(body.destination, "destination", 140);
        const departureDate = requiredText(body.departureDate || body.date || "", "departureDate", 40);
        const availableKg = intRange(body.availableKg || body.kilos, 0, 1, 1000);
        const pricePerKg = intRange(body.pricePerKg || body.price, 0, 1, 10000);
        const description = toSafeText(body.description, 700);

        console.log(`[DEBUG] Données validées: ${origin} -> ${destination}, ${availableKg}kg`);

        // [MULTI-CURRENCY] Monnaie choisie par le voyageur (ex: EUR, XOF, CNY...)
        const { getCurrencyByCountry } = require('./currencyRegistry');
        const baseCurrency = toSafeText(body.baseCurrency || getCurrencyByCountry(origin), 10);
        console.log("[DEBUG] Monnaie de base:", baseCurrency);

        console.log(`[DEBUG] Comparaison: '${origin}' vs '${destination}'`);
        if (normalizeText(origin) === normalizeText(destination)) {
            sendJson(res, 400, { error: "Le pays de depart et d'arrivee ne peuvent pas etre identiques." });
            return;
        }

        console.log("[DEBUG] Validation KG/Prix...");
        if (availableKg <= 0 || pricePerKg <= 0) return sendJson(res, 400, { error: "availableKg et pricePerKg doivent etre > 0." });

        console.log("[DEBUG] Préparation paymentMethod...");
        const paymentMethod = toSafeText(body.paymentMethod || "", 20);

        // On ne tente de sanitizer que si on a une vraie chaîne qui ressemble à une image
        let paymentQr = "";
        if (body.paymentQr && typeof body.paymentQr === "string" && body.paymentQr.startsWith("data:image")) {
            paymentQr = sanitizeImageDataUrl(body.paymentQr, "QR de paiement");
        }

        const partnerReferralCode = toSafeText(body.referralCode || "", 50);

        console.log("[DEBUG] Préparation timestamp...");

        const t = nowIso();
        console.log("[DEBUG] INSERT -> User:", user.id, "T:", t);
        const result = db.prepare(`
            INSERT INTO offers(
                user_id,title,origin,destination,departure_date,flight_number,available_kg,price_per_kg,description,
                payment_method,payment_qr,partner_referral_code,base_currency,rating,reviews,is_verified,status,created_at,updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,5,0,1,'active',?,?)
        `).run(user.id, title, origin, destination, departureDate, "", availableKg, pricePerKg, description, paymentMethod, paymentQr, partnerReferralCode, baseCurrency, t, t);

        const row = db.prepare(`
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName, users.is_verified AS ownerIsVerified,
                offers.title, offers.origin, offers.destination,
                offers.departure_date AS departureDate, offers.flight_number AS flightNumber, offers.available_kg AS availableKg,
                offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified,
                offers.status, offers.created_at AS createdAt,
                offers.payment_method AS paymentMethod, offers.payment_qr AS paymentQr,
                offers.partner_referral_code AS partnerReferralCode,
                offers.base_currency AS baseCurrency
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
        if (!ensureUserVerifiedForSensitiveAction(user, res)) return;
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
        if (!ensureUserVerifiedForSensitiveAction(user, res)) return;
        const body = await parseBody(req);
        const offerId = intRange(body.offerId, 0, 1, 1_000_000_000);
        const requestId = intRange(body.parcelRequestId, 0, 1, 1_000_000_000);

        const offer = db.prepare("SELECT id,user_id AS ownerId,origin,destination,price_per_kg AS pricePerKg,base_currency AS baseCurrency,status FROM offers WHERE id=?").get(offerId);
        if (!offer || offer.status !== "active") return sendJson(res, 404, { error: "Offre introuvable ou inactive." });
        const reqRow = db.prepare("SELECT id,user_id AS userId,destination,status FROM parcel_requests WHERE id=?").get(requestId);
        if (!reqRow || reqRow.userId !== user.id) return sendJson(res, 404, { error: "Demande introuvable." });
        if (!["open", "matched"].includes(reqRow.status)) return sendJson(res, 400, { error: "Demande non disponible." });
        if (normalizeText(offer.destination) !== normalizeText(reqRow.destination)) return sendJson(res, 400, { error: "Destination incompatible." });

        // [MULTI-CURRENCY] Calcul du split 50/50 bifurqué avec gel du taux
        const { getCurrencyByCountry } = require('./currencyRegistry');
        const { calculateBifurcatedPayment } = require('./currencyService');
        const splitType = body.paymentSplitType === '50_50' ? '50_50' : 'full';
        const pricePerKg = offer.pricePerKg; // Fixe, pas de negociation
        const numKg = Math.max(1, Number(body.numKg) || 1);
        const totalAmount = pricePerKg * numKg;
        const departureCurrency = offer.baseCurrency || getCurrencyByCountry(offer.origin);
        const arrivalCurrency = getCurrencyByCountry(offer.destination);
        let splitData = {};
        if (splitType === '50_50') {
            splitData = await calculateBifurcatedPayment(totalAmount, departureCurrency, departureCurrency, arrivalCurrency);
        }

        const t = nowIso();
        let reservationId = null;
        try {
            const ins = db.prepare(`
                INSERT INTO reservations(user_id,offer_id,parcel_request_id,status,proposed_price_per_kg,
                    payment_split_type,frozen_rate,start_amount,start_currency,end_amount,end_currency,
                    departure_country,arrival_country,created_at,updated_at)
                VALUES (?,?,?,'pending',?,?,?,?,?,?,?,?,?,?,?)
            `).run(
                user.id, offer.id, reqRow.id, pricePerKg,
                splitType,
                splitData?.split ? 1 : null,
                splitData?.split?.start?.amount || null,
                splitData?.split?.start?.currency || null,
                splitData?.split?.end?.amount || null,
                splitData?.split?.end?.currency || null,
                offer.origin,
                offer.destination,
                t, t
            );
            reservationId = Number(ins.lastInsertRowid);
            db.prepare("UPDATE parcel_requests SET status='matched', updated_at=? WHERE id=?").run(t, reqRow.id);
        } catch (err) {
            console.error('[Reservation] Erreur insertion:', err.message);
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



    // ---- Pay Commission (Step 1 of Split P2P) ----
    const payCommissionMatch = pathname.match(/^\/api\/reservations\/(\d+)\/pay-commission$/);
    if (payCommissionMatch && req.method === "POST") {
        const user = requireAuth(req, res);

        if (!user) return;
        const reservationId = Number(payCommissionMatch[1]);
        const body = await parseBody(req);
        const receiptData = String(body?.receiptData || "").trim();
        if (!receiptData || !receiptData.startsWith("data:image/")) {
            return sendJson(res, 400, { error: "Capture de paiement invalide." });
        }
        if (receiptData.length > 4_000_000) {
            return sendJson(res, 400, { error: "Image trop lourde (max ~3MB)." });
        }

        const reservation = db.prepare(`
            SELECT id, status, user_id AS requesterId
            FROM reservations 
            WHERE id = ?
        `).get(reservationId);



        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        if (Number(reservation.requesterId) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Seul le client peut soumettre ce paiement." });
        }
        if (!["agreed", "pending", "commission_payee"].includes(String(reservation.status || ""))) {
            return sendJson(res, 400, { error: `Statut actuel (${reservation.status}) ne permet pas ce paiement.` });
        }

        // Get the thread for this reservation
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id = ?").get(reservationId);
        if (!thread) return sendJson(res, 404, { error: "Conversation liee introuvable." });



        // ---- [V2: Vérification Gemini] ----
        try {
            // Le montant attendu est celui déclaré par l'utilisateur (déjà calculé à 12% dans le chat)
            const expectedCommission = Number(body.amount || 0);
            const verdict = await verifyPaymentReceipt(receiptData);

            if (!verdict.is_valid) {
                return sendJson(res, 400, {
                    error: "Veuillez uploader un vrai reçu",
                    code: "RECEIPT_INVALID"
                });
            }

            const diff = expectedCommission - verdict.amount;
            if (diff > 1) {
                return sendJson(res, 400, {
                    error: "Montant incorrect",
                    code: "AMOUNT_MISMATCH",
                    detail: `Vous avez envoyé ${verdict.amount} au lieu de ${expectedCommission}. Veuillez envoyer le reste qui est ${diff.toFixed(2)}.`
                });
            }

            console.log(`[Gemini Payment] Paiement validé (${verdict.amount} EUR)`);


        } catch (err) {
            console.error("[Gemini Payment] Erreur analyse :", err.message);
            // En cas d'erreur technique de l'IA, on laisse passer pour ne pas bloquer le business, 
            // mais on loggue l'erreur pour review.
        }

        const t = nowIso();
        // Post receipt in chat as a system message visible to admin

        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at) VALUES (?,?,'system',?,?,'payment_receipt','all',?)")
            .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`, thread.id, user.id, receiptData, t);
        // Mark the system message with annotation
        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at) VALUES (?,?,'system',NULL,?,'text','all',?)")
            .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000) + 1}`, thread.id, "✅ Capture de paiement commission reçue.", t);

        // Record as transaction
        db.prepare("INSERT INTO transactions(reservation_id, type, amount, status, created_at) VALUES (?, 'commission', ?, 'completed', ?)")
            .run(reservationId, Number(body.amount || 0), t);

        // Advance reservation status
        db.prepare("UPDATE reservations SET status='commission_payee', updated_at=? WHERE id=?").run(t, reservationId);
        db.prepare("UPDATE chat_threads SET last_message_at=? WHERE id=?").run(t, thread.id);

        notifyAdminNtfy(
            "💰 Commission reçue",
            `Un client a payé la commission pour la réservation #${reservationId}.`,
            "high"
        ).catch(() => { });

        sendJson(res, 200, { ok: true, status: "commission_payee" });
        return;
    }

    // ---- Pay Traveler (Step 2 of Split P2P) ----
    const payTravelerMatch = pathname.match(/^\/api\/reservations\/(\d+)\/pay-traveler$/);
    if (payTravelerMatch && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;
        const reservationId = Number(payTravelerMatch[1]);
        const body = await parseBody(req);
        const receiptData = String(body?.receiptData || "").trim();
        if (!receiptData || !receiptData.startsWith("data:image/")) {
            return sendJson(res, 400, { error: "Capture de paiement invalide." });
        }
        if (receiptData.length > 4_000_000) {
            return sendJson(res, 400, { error: "Image trop lourde (max ~3MB)." });
        }

        const reservation = db.prepare(`
            SELECT reservations.id, reservations.status, reservations.user_id AS requesterId, offers.user_id AS offerOwnerId
            FROM reservations INNER JOIN offers ON offers.id = reservations.offer_id
            WHERE reservations.id = ?
        `).get(reservationId);
        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        if (Number(reservation.requesterId) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Seul le client peut soumettre ce paiement." });
        }
        if (String(reservation.status || "") !== "commission_payee") {
            return sendJson(res, 400, { error: "Veuillez d'abord payer la commission ColisConnect (étape 1)." });
        }

        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id = ?").get(reservationId);
        if (!thread) return sendJson(res, 404, { error: "Conversation liee introuvable." });

        const t = nowIso();
        // Post receipt in chat - visible to both parties so the traveler sees it
        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at) VALUES (?,?,'user',?,?,'payment_receipt','all',?)")
            .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`, thread.id, user.id, receiptData, t);
        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at) VALUES (?,?,'system',NULL,?,'text','all',?)")
            .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000) + 1}`, thread.id, "✅ Capture de paiement voyageur envoyée. Le voyageur peut maintenant confirmer la réception.", t);
        // Note: traveler payouts are internal P2P so the system doesn't "hold" money
        // but it tracks it for reporting.
        db.prepare("INSERT INTO transactions(reservation_id, type, amount, status, created_at) VALUES (?, 'payment', ?, 'completed', ?)")
            .run(reservationId, Number(body.amount || 0), t);

        db.prepare("UPDATE reservations SET status='voyageur_paye', updated_at=? WHERE id=?").run(t, reservationId);
        db.prepare("UPDATE chat_threads SET last_message_at=? WHERE id=?").run(t, thread.id);
        sendJson(res, 200, { ok: true, status: "voyageur_paye" });
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

        let thread = db.prepare("SELECT id,reservation_id AS reservationId, user_id AS buyerId, offer_owner_id AS sellerId FROM chat_threads WHERE reservation_id = ?").get(reservationId);
        if (!thread) {
            const id = `th_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const t = nowIso();
            db.prepare("INSERT INTO chat_threads(id,reservation_id,user_id,offer_owner_id,last_message_at,created_at) VALUES (?,?,?,?,?,?)")
                .run(id, reservationId, reservation.requesterId, reservation.offerOwnerId, t, t);
            db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,created_at) VALUES (?,?, 'system', NULL, ?, ?)")
                .run(`msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`, id, "Conversation liee a la reservation.", t);
            thread = { id, reservationId };
        } else {
            // Restore visibility if it was deleted
            const isBuyer = Number(thread.buyerId) === Number(user.id);
            const isSeller = Number(thread.sellerId) === Number(user.id);
            if (isBuyer) db.prepare("UPDATE chat_threads SET deleted_by_buyer = 0 WHERE id = ?").run(thread.id);
            if (isSeller) db.prepare("UPDATE chat_threads SET deleted_by_seller = 0 WHERE id = ?").run(thread.id);
        }
        sendJson(res, 200, thread);
        return;
    }

    if (req.method === "POST" && pathname === "/api/conversations/by-offer") {
        const user = requireAuth(req, res);
        if (!user) return;
        if (!ensureUserVerifiedForSensitiveAction(user, res)) return;
        const body = await parseBody(req);
        const offerId = Number(body.offerId);

        if (!offerId) return sendJson(res, 400, { error: "ID Offre invalide." });

        const offer = db.prepare(`
            SELECT id, user_id AS offerOwnerId, origin, destination, departure_date AS departureDate,
                   price_per_kg AS pricePerKg, available_kg AS availableKg, status
            FROM offers
            WHERE id = ?
        `).get(offerId);

        if (!offer) return sendJson(res, 404, { error: "Offre introuvable." });
        if (offer.status !== "active") return sendJson(res, 400, { error: "Cette offre n'est plus disponible." });
        if (Number(offer.offerOwnerId) === Number(user.id)) {
            return sendJson(res, 400, { error: "Vous ne pouvez pas ouvrir une conversation avec votre propre offre." });
        }

        const t = nowIso();
        const fallbackDate = (offer.departureDate || t).slice(0, 10);

        try {
            // Manual check for existing thread to avoid creating billions of parcel requests
            const existing = db.prepare(`
                SELECT chat_threads.id, chat_threads.reservation_id AS reservationId
                FROM chat_threads
                INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
                WHERE reservations.user_id = ? AND reservations.offer_id = ? AND reservations.status = 'pending'
                LIMIT 1
            `).get(user.id, offer.id);

            if (existing) {
                return sendJson(res, 200, { id: existing.id, reservationId: existing.reservationId });
            }

            // Create technical record
            const parcelResult = db.prepare(`
                INSERT INTO parcel_requests(user_id,title,origin,destination,needed_by_date,weight_kg,max_price_per_kg,description,status,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,? ,?,?)
            `).run(
                user.id,
                `Contact pour offre #${offer.id}`,
                offer.origin || "Origine",
                offer.destination || "Destination",
                fallbackDate,
                1,
                Number(offer.pricePerKg || 0),
                `Demande de contact`,
                "open",
                t,
                t
            );
            const parcelRequestId = Number(parcelResult.lastInsertRowid);

            const reservationResult = db.prepare(`
                INSERT INTO reservations(user_id,offer_id,parcel_request_id,status,proposed_price_per_kg,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?)
            `).run(user.id, offer.id, parcelRequestId, "pending", Number(offer.pricePerKg || 0), t, t);
            const reservationId = Number(reservationResult.lastInsertRowid);

            const threadId = `th_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            db.prepare("INSERT INTO chat_threads(id,reservation_id,user_id,offer_owner_id,last_message_at,created_at) VALUES (?,?,?,?,?,?)")
                .run(threadId, reservationId, user.id, offer.offerOwnerId, t, t);

            db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,created_at) VALUES (?,?,'system',NULL,?,?)")
                .run(`msg_${Date.now()}_rev`, threadId, "Conversation ouverte. Discutez des details de l'envoi ici.", t);

            sendJson(res, 200, { id: threadId, reservationId: reservationId });
        } catch (err) {
            console.error("[API] by-offer error:", err);
            sendJson(res, 500, { error: "Impossible d'ouvrir la conversation.", details: err.message });
        }
        return;
    }



    // ─── CRM Voyageur : mes trajets avec leurs réservations ───
    if (req.method === "GET" && pathname === "/api/my/trips") {
        const user = requireAuth(req, res);
        if (!user) return;

        const trips = db.prepare(`
            SELECT
                offers.id, offers.title, offers.origin, offers.destination,
                offers.departure_date AS departureDate, offers.available_kg AS availableKg,
                offers.price_per_kg AS pricePerKg, offers.status
            FROM offers
            WHERE offers.user_id = ?
            ORDER BY offers.created_at DESC
        `).all(user.id);

        const result = trips.map((trip) => {
            const bookings = db.prepare(`
                SELECT
                    reservations.id AS reservationId,
                    reservations.status AS reservationStatus,
                    reservations.created_at AS bookedAt,
                    parcel_requests.weight_kg AS weightKg,
                    reservations.proposed_price_per_kg AS pricePerKg,
                    users.full_name AS clientName,
                    users.email AS clientEmail
                FROM reservations
                INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
                INNER JOIN users ON users.id = reservations.user_id
                WHERE reservations.offer_id = ?
                ORDER BY reservations.created_at DESC
            `).all(trip.id);

            const totalKgBooked = bookings.reduce((sum, b) => sum + Number(b.weightKg || 0), 0);
            const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.weightKg || 0) * Number(b.pricePerKg || 0)), 0);

            return {
                id: trip.id,
                title: trip.title,
                origin: trip.origin,
                destination: trip.destination,
                departureDate: trip.departureDate,
                availableKg: trip.availableKg,
                pricePerKg: trip.pricePerKg,
                status: trip.status,
                totalKgBooked,
                totalRevenue,
                bookings: bookings.map((b) => ({
                    reservationId: b.reservationId,
                    clientName: b.clientName,
                    weightKg: b.weightKg,
                    pricePerKg: b.pricePerKg,
                    totalPrice: Number(b.weightKg || 0) * Number(b.pricePerKg || 0),
                    status: b.reservationStatus,
                    bookedAt: b.bookedAt
                }))
            };
        });

        sendJson(res, 200, { items: result });
        return;
    }

    if (req.method === "POST" && pathname === "/api/partner/activate") {

        const user = requireAuth(req, res);
        if (!user) return;
        if (String(user.role).toLowerCase() !== "partner" && String(user.role).toLowerCase() !== "admin") {
            return sendJson(res, 403, { error: "Acces reserve aux partenaires." });
        }
        if (user.referralCode) return sendJson(res, 400, { error: "Code de parrainage deja actif." });

        const code = "PART-" + crypto.randomBytes(4).toString("hex").toUpperCase();
        db.prepare("UPDATE users SET referral_code = ? WHERE id = ?").run(code, user.id);
        sendJson(res, 200, { success: true, referralCode: code });
        return;
    }

    if (req.method === "GET" && pathname === "/api/partner/stats") {
        const user = requireAuth(req, res);
        if (!user) return;
        if (String(user.role).toLowerCase() !== "partner" && String(user.role).toLowerCase() !== "admin") {
            return sendJson(res, 403, { error: "Acces reserve aux partenaires." });
        }
        if (!user.referralCode) return sendJson(res, 403, { error: "Compte partenaire non active." });

        const offersList = db.prepare(`
            SELECT id, title, origin, destination, departure_date AS departureDate, status
            FROM offers
            WHERE partner_referral_code = ?
        `).all(user.referralCode);

        const offerIds = offersList.map((o) => o.id);
        let activity = [];
        let totalEarnings = 0;

        if (offerIds.length > 0) {
            const placeholders = offerIds.map(() => "?").join(",");
            const reservations = db.prepare(`
                SELECT
                    reservations.id,
                    reservations.created_at AS createdAt,
                    reservations.status,
                    reservations.proposed_price_per_kg AS price,
                    users.full_name AS clientName,
                    offers.title AS offerTitle
                FROM reservations
                INNER JOIN users ON users.id = reservations.user_id
                INNER JOIN offers ON offers.id = reservations.offer_id
                WHERE reservations.offer_id IN (${placeholders})
                ORDER BY reservations.created_at DESC
            `).all(...offerIds);

            activity = reservations.map((r) => {
                // Commission simple de 10% pour l'exemple
                const commission = r.status === "colisconnect_paye" ? (r.price * 0.1) : 0;
                if (commission > 0) totalEarnings += commission;
                return {
                    date: r.createdAt,
                    clientName: r.clientName,
                    offerTitle: r.offerTitle,
                    status: r.status,
                    commission: commission.toFixed(2)
                };
            });
        }

        sendJson(res, 200, {
            referralCode: user.referralCode,
            tripsCount: offersList.length,
            conversionsCount: activity.length,
            totalEarnings: totalEarnings.toFixed(2),
            activity
        });
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
                reservations.status AS reservationStatus,
                reservations.proposed_price_per_kg AS proposedPricePerKg,
                offers.title AS offerTitle, parcel_requests.title AS requestTitle,
                parcel_requests.weight_kg AS weightKg,
                reservations.user_id AS requesterId,
                offers.user_id AS offerOwnerId,
                requester.full_name AS requesterName, ('https://i.pravatar.cc/150?u=' || requester.id) AS requesterAvatar,
                owner.full_name AS offerOwnerName, ('https://i.pravatar.cc/150?u=' || owner.id) AS offerOwnerAvatar,
                offers.payment_qr AS offerOwnerPaymentQr,
                (SELECT text FROM chat_messages WHERE thread_id = chat_threads.id ORDER BY created_at DESC LIMIT 1) AS preview
            FROM chat_threads
            INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN parcel_requests ON parcel_requests.id = reservations.parcel_request_id
            INNER JOIN users requester ON requester.id = reservations.user_id
            INNER JOIN users owner ON owner.id = offers.user_id
            WHERE (chat_threads.user_id = ? AND chat_threads.deleted_by_buyer = 0)
               OR (chat_threads.offer_owner_id = ? AND chat_threads.deleted_by_seller = 0)
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

        const isAdmin = user.role === "admin";
        const isBuyer = Number(thread.userId) === Number(user.id);
        const isSeller = Number(thread.ownerId) === Number(user.id);

        if (!isBuyer && !isSeller && !isAdmin) {
            return sendJson(res, 403, { error: "Acces refuse." });
        }

        if (isAdmin) {
            db.prepare("DELETE FROM chat_threads WHERE id = ?").run(threadId);
        } else if (isBuyer) {
            db.prepare("UPDATE chat_threads SET deleted_by_buyer = 1 WHERE id = ?").run(threadId);
        } else if (isSeller) {
            db.prepare("UPDATE chat_threads SET deleted_by_seller = 1 WHERE id = ?").run(threadId);
        }

        // Hard delete if both users flagged it as deleted
        db.prepare("DELETE FROM chat_threads WHERE id = ? AND deleted_by_buyer = 1 AND deleted_by_seller = 1").run(threadId);

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
                cm.id,
                CASE
                    WHEN cm.sender_type='system' THEN 'system'
                    WHEN cm.sender_user_id=? THEN 'user'
                    ELSE 'traveler'
                END AS sender,
                cm.text,
                cm.message_type AS messageType,
                cm.visible_to AS visibleTo,
                cm.created_at AS createdAt
            FROM chat_messages cm
            INNER JOIN chat_threads ct ON ct.id = cm.thread_id
            WHERE cm.thread_id=?
              AND (
                cm.visible_to='all'
                OR (cm.visible_to='offer_owner' AND ct.offer_owner_id = ?)
                OR (cm.visible_to='requester' AND ct.user_id = ?)
              )
            ORDER BY cm.created_at ASC
        `).all(user.id, threadId, user.id, user.id);
        sendJson(res, 200, messages);
        return;
    }

    if (messagesMatch && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;
        if (!ensureUserVerifiedForSensitiveAction(user, res)) return;
        const threadId = messagesMatch[1];
        const thread = db.prepare("SELECT id,user_id AS userId,offer_owner_id AS ownerId,is_suspended AS isSuspended FROM chat_threads WHERE id = ?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (![thread.userId, thread.ownerId].includes(user.id) && user.role !== "admin") return sendJson(res, 403, { error: "Acces refuse." });
        if (Number(thread.isSuspended) === 1) return sendJson(res, 403, { error: "Conversation suspendue par l'administration." });

        const body = await parseBody(req);
        const text = toSafeText(body.text, 1000);
        if (!text) return sendJson(res, 400, { error: "Message vide." });

        // ── Anti-Leak Filter ──────────────────────────────────────────────
        const filterResult = analyzeMessage(text);
        if (filterResult.blocked) {
            // Log the attempt as a moderation flag
            try {
                db.prepare(
                    "INSERT INTO moderation_flags(entity_type,entity_id,reason,status,created_by,created_at) VALUES ('user',?,?,?,?,?)"
                ).run(user.id, `[AUTO] ${filterResult.type}: partage coordonnees dans conversation ${threadId}`, "open", user.id, nowIso());

                // Count flags for this user in last 24h
                const recentFlags = db.prepare(
                    "SELECT COUNT(*) AS c FROM moderation_flags WHERE entity_type='user' AND entity_id=? AND created_at > datetime('now','-1 day') AND reason LIKE '[AUTO]%'"
                ).get(user.id)?.c || 0;

                if (recentFlags >= 3) {
                    // Auto-suspend the user
                    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(user.id);
                    // Notify admin
                    notifyAdminNtfy(
                        `🚨 Compte suspendu automatiquement`,
                        `${user.fullName || user.email} a tenté de partager des coordonnées ${recentFlags} fois en 24h. Compte suspendu.`,
                        "max"
                    ).catch(() => { });
                } else if (recentFlags === 1) {
                    // Notify admin on first attempt
                    notifyAdminNtfy(
                        `⚠️ Tentative fuite données`,
                        `${user.fullName || user.email} a essayé de partager : ${filterResult.type} dans une conversation.`,
                        "high"
                    ).catch(() => { });
                }
            } catch {
                // Don't let flag logging crash the response
            }
            return sendJson(res, 403, {
                error: "Votre message contient des informations de contact personnelles. Utilisez ColisConnect pour tous vos échanges. Cette tentative a été enregistrée.",
                code: "CONTACT_INFO_BLOCKED",
                violationType: filterResult.type
            });
        }
        // ─────────────────────────────────────────────────────────────────

        const createdAt = nowIso();
        const senderType = thread.ownerId === user.id ? "offer_owner" : "user";
        const id = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        db.prepare("INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at) VALUES (?,?,?,?,?,'text','all',?)")
            .run(id, threadId, senderType, user.id, text, createdAt);
        db.prepare("UPDATE chat_threads SET last_message_at = ?, deleted_by_buyer = 0, deleted_by_seller = 0 WHERE id = ?").run(createdAt, threadId);

        // ─── Détecteur passif (ne bloque PAS le message) ─────────────
        // Si un mot suspect est détecté, déclenche un check IA immédiat
        // en arrière-plan (async, non-bloquant pour l'utilisateur).
        const suspiciousCheck = checkSuspiciousWords(text);
        if (suspiciousCheck.suspicious) {
            console.log(`[Passive Detector] Mot suspect dans thread ${threadId} : ${suspiciousCheck.reason}`);
            aiModerator.triggerImmediateCheck(db, threadId, id, suspiciousCheck.reason)
                .catch(e => console.error("[Passive Detector] Erreur trigger:", e.message));
        }

        sendJson(res, 201, { id, sender: senderType === "user" ? "user" : "traveler", text, messageType: "text", createdAt });
        return;
    }

    const paymentMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/payment$/);
    if (paymentMatch && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;
        const threadId = paymentMatch[1];

        const thread = db.prepare(`
            SELECT
                chat_threads.id,
                chat_threads.user_id AS requesterId,
                chat_threads.offer_owner_id AS ownerId,
                chat_threads.reservation_id AS reservationId,
                offers.payment_qr AS ownerPaymentQr,
                offers.payment_method AS ownerPaymentMethod,
                offers.price_per_kg AS pricePerKg,
                requester.full_name AS requesterName,
                owner.full_name AS travelerName
            FROM chat_threads
            INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN users requester ON requester.id = chat_threads.user_id
            INNER JOIN users owner ON owner.id = chat_threads.offer_owner_id
            WHERE chat_threads.id = ?
        `).get(threadId);

        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (Number(thread.requesterId) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Seul le contacteur peut confirmer un paiement." });
        }

        const body = await parseBody(req);
        const receiptImage = body.receiptImage ? sanitizeImageDataUrl(body.receiptImage, "Capture de recu") : "";
        const amountPaid = Math.max(0, Number(body.amountPaid || 0));

        if (!receiptImage) return sendJson(res, 400, { error: "Capture du recu requise." });
        if (!amountPaid) return sendJson(res, 400, { error: "Montant paye requis." });

        const createdAt = nowIso();

        const receiptMsgId = buildMessageId();
        db.prepare(`
            INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at)
            VALUES (?,?,'user',?,?,'payment_receipt','all',?)
        `).run(receiptMsgId, threadId, user.id, receiptImage, createdAt);

        const commission = Math.round(amountPaid * 0.10 * 100) / 100;
        const reversalMsgId = buildMessageId();
        const platformQrPlaceholder = "PLATFORM_QR_PENDING";
        const reversalText = JSON.stringify({
            type: "reversal_request",
            commission,
            amountPaid,
            platformQrPlaceholder
        });
        const laterAt = new Date(Date.parse(createdAt) + 1).toISOString();
        db.prepare(`
            INSERT INTO chat_messages(id,thread_id,sender_type,sender_user_id,text,message_type,visible_to,created_at)
            VALUES (?,?,'system',NULL,?,'reversal_request','offer_owner',?)
        `).run(reversalMsgId, threadId, reversalText, laterAt);

        db.prepare("UPDATE chat_threads SET last_message_at = ? WHERE id = ?").run(laterAt, threadId);

        // Update reservation status to 'voyageur_paye'
        db.prepare("UPDATE reservations SET status = 'voyageur_paye', updated_at = ? WHERE id = ?").run(createdAt, thread.reservationId);

        // Notify admin via ntfy (RED ALERT - Waiting for reversal)
        const travelerName = thread.travelerName || "Voyageur";
        const requesterName = thread.requesterName || "Client";
        const ntfyMessage = `🚨 PAIEMENT RECU: ${requesterName} a payé ${amountPaid} EUR. Le voyageur (${travelerName}) doit reverser ${commission} EUR.`;
        const ntfyTitle = "🔴 ATTENTE REVERSEMENT";
        const ntfyUrl = "https://nonservile-niki-unasking.ngrok-free.dev/admin.html"; // Admin dashboard

        try {
            await notifyAdminNtfy(ntfyMessage, ntfyTitle, ntfyUrl);
        } catch (err) {
            console.error("[ntfy] Failed to send payment alert:", err.message);
        }

        sendJson(res, 201, { ok: true, receiptMsgId, reversalMsgId, commission, status: "voyageur_paye" });
        return;
    }

    const reversalMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/reversal-confirm$/);
    if (reversalMatch && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;
        const threadId = reversalMatch[1];

        const thread = db.prepare(`
            SELECT id, reservation_id, offer_owner_id FROM chat_threads WHERE id = ?
        `).get(threadId);

        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        if (Number(thread.offer_owner_id) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Seul le voyageur peut confirmer son reversement." });
        }

        const t = nowIso();
        db.prepare("UPDATE reservations SET status = 'colisconnect_paye', updated_at = ? WHERE id = ?").run(t, thread.reservation_id);

        // Add a system message to confirm reversal
        const msgId = buildMessageId();
        db.prepare(`
            INSERT INTO chat_messages(id,thread_id,sender_type,text,message_type,created_at)
            VALUES (?,?,'system','Le voyageur a confirmé le reversement de la commission.','text',?)
        `).run(msgId, threadId, t);

        db.prepare("UPDATE chat_threads SET last_message_at = ? WHERE id = ?").run(t, threadId);

        sendJson(res, 200, { ok: true, status: "colisconnect_paye" });
        return;
    }

    if (req.method === "POST" && pathname === "/api/admin/settings/platform-qr") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const body = await parseBody(req);
        const qrCode = String(body?.qrCode || "").trim();
        if (!qrCode.startsWith("data:image/")) {
            return sendJson(res, 400, { error: "Format d'image invalide." });
        }
        const t = nowIso();
        db.prepare("INSERT INTO system_settings(key, value, updated_at) VALUES ('platform_qr_code', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
            .run(qrCode, t);

        db.prepare("INSERT INTO admin_audit_log(admin_id, action_type, entity_type, entity_id, details, created_at) VALUES (?, 'update_setting', 'system_settings', 'platform_qr_code', ?, ?)")
            .run(admin.id, JSON.stringify({ old: "...", new: "updated" }), t);

        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/overview") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        purgeExpiredAuthBlocks();
        const now = Date.now();
        let activeRateLimit = 0;
        for (const item of loginRateLimiter.values()) {
            if (item?.blockedUntil && Number(item.blockedUntil) > now) activeRateLimit += 1;
        }
        const users = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
        const offers = db.prepare("SELECT COUNT(*) AS c FROM offers").get().c;
        const conversations = db.prepare("SELECT COUNT(*) AS c FROM chat_threads").get().c;
        const agreedReservations = db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE status='agreed'").get().c;
        const offerToChatRate = offers > 0 ? Math.round((conversations / offers) * 1000) / 10 : 0;
        const chatToAgreementRate = conversations > 0 ? Math.round((agreedReservations / conversations) * 1000) / 10 : 0;

        sendJson(res, 200, {
            users,
            activeUsers: db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_active=1").get().c,
            suspendedUsers: db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_active=0").get().c,
            pendingApprovals: db.prepare(`
                SELECT COUNT(*) AS c
                FROM users
                WHERE role IN ('user', 'partner')
                  AND is_verified=0
                  AND is_active=1
                  AND (
                    (identity_document_approved=0 AND LENGTH(TRIM(identity_document)) > 0)
                    OR (profile_photo_approved=0 AND LENGTH(TRIM(profile_photo)) > 0)
                    OR (
                      25
                      + CASE WHEN LENGTH(TRIM(phone_number)) >= 8 THEN 25 ELSE 0 END
                      + CASE WHEN LENGTH(TRIM(identity_document)) > 0 THEN 25 ELSE 0 END
                      + CASE WHEN LENGTH(TRIM(profile_photo)) > 0 THEN 25 ELSE 0 END
                    ) >= 75
                  )
            `).get().c,
            offers,
            activeOffers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE status='active'").get().c,
            hiddenOffers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE status='hidden'").get().c,
            canceledOffers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE status='canceled'").get().c,
            parcelRequests: db.prepare("SELECT COUNT(*) AS c FROM parcel_requests").get().c,
            reservations: db.prepare("SELECT COUNT(*) AS c FROM reservations").get().c,
            pendingReservations: db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE status='pending'").get().c,
            agreedReservations,
            unverifiedOffers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE is_verified=0").get().c,
            conversations,
            suspendedConversations: db.prepare("SELECT COUNT(*) AS c FROM chat_threads WHERE is_suspended=1").get().c,
            blockedIps: db.prepare("SELECT COUNT(*) AS c FROM auth_blocks WHERE block_type='ip'").get().c,
            blockedEmails: db.prepare("SELECT COUNT(*) AS c FROM auth_blocks WHERE block_type='email'").get().c,
            totalCommission: db.prepare("SELECT SUM(amount) AS s FROM transactions WHERE type='commission'").get().s || 0,
            volumeP2P: db.prepare("SELECT SUM(amount) AS s FROM transactions WHERE type='payment'").get().s || 0,
            rateLimitKeys: loginRateLimiter.size,
            rateLimitActive: activeRateLimit,
            offerToChatRate,
            chatToAgreementRate
        });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/financials/stats") {
        const admin = requireAdmin(req, res);
        if (!admin) return;

        const monthly = db.prepare(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                SUM(CASE WHEN type='commission' THEN amount ELSE 0 END) as commission,
                SUM(CASE WHEN type='payment' THEN amount ELSE 0 END) as volume,
                COUNT(*) as txCount
            FROM transactions
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `).all();

        const recent = db.prepare(`
            SELECT t.*, u.full_name as requesterName
            FROM transactions t
            LEFT JOIN reservations r ON r.id = t.reservation_id
            LEFT JOIN users u ON u.id = r.user_id
            ORDER BY t.created_at DESC
            LIMIT 50
        `).all();

        sendJson(res, 200, { monthly, recent });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/ai-moderation/logs") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const logs = db.prepare(`
            SELECT aml.*, r.user_id as client_id, u.full_name as client_name
            FROM ai_moderation_logs aml
            LEFT JOIN reservations r ON r.id = aml.reservation_id
            LEFT JOIN users u ON u.id = r.user_id
            ORDER BY aml.created_at DESC
            LIMIT 200
        `).all();
        sendJson(res, 200, logs);
        return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/admin/ai-moderation/logs/")) {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const id = Number(pathname.split("/").pop());
        const { is_dismissed } = await parseBody(req);
        db.prepare("UPDATE ai_moderation_logs SET is_dismissed = ? WHERE id = ?").run(is_dismissed ? 1 : 0, id);
        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === "POST" && pathname === "/api/admin/bot/chat") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const { message, history } = await parseBody(req);
        if (!message) return sendJson(res, 400, { error: "Message vide." });
        const response = await adminBot.processCommand(db, message, history || []);
        sendJson(res, 200, { response });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/analytics/daily") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const days = intRange(requestUrl.searchParams.get("days"), 14, 7, 60);
        const points = [];
        for (let i = days - 1; i >= 0; i -= 1) {
            const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const like = `${day}%`;
            points.push({
                day,
                users: db.prepare("SELECT COUNT(*) AS c FROM users WHERE created_at LIKE ?").get(like).c,
                offers: db.prepare("SELECT COUNT(*) AS c FROM offers WHERE created_at LIKE ?").get(like).c,
                conversations: db.prepare("SELECT COUNT(*) AS c FROM chat_threads WHERE created_at LIKE ?").get(like).c,
                agreements: db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE status='agreed' AND updated_at LIKE ?").get(like).c
            });
        }
        sendJson(res, 200, { days, points });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/users") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const { page, pageSize, offset } = paginationFromQuery(requestUrl.searchParams);
        const q = toSafeText(requestUrl.searchParams.get("q") || "", 140);
        const like = `%${q}%`;
        const rows = db.prepare(`
            SELECT
                users.id,
                users.full_name AS fullName,
                users.email,
                users.role,
                users.is_active AS isActive,
                users.is_verified AS isVerified,
                users.phone_number AS phoneNumber,
                CASE WHEN LENGTH(TRIM(users.identity_document)) > 0 THEN 1 ELSE 0 END AS hasIdentityDocument,
                CASE WHEN LENGTH(TRIM(users.profile_photo)) > 0 THEN 1 ELSE 0 END AS hasProfilePhoto,
                users.identity_document_approved AS identityDocumentApproved,
                users.profile_photo_approved AS profilePhotoApproved,
                users.country,
                users.created_at AS createdAt,
                (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = users.id) AS lastSeenAt,
                (SELECT COUNT(*) FROM offers WHERE user_id = users.id) AS offersCount,
                (SELECT COUNT(*) FROM reservations WHERE user_id = users.id) AS reservationsCount,
                (SELECT COUNT(*) FROM chat_threads WHERE user_id = users.id OR offer_owner_id = users.id) AS conversationsCount
            FROM users
            WHERE (? = '' OR users.full_name LIKE ? OR users.email LIKE ?)
            ORDER BY users.created_at DESC
            LIMIT ? OFFSET ?
        `).all(q, like, like, pageSize, offset);
        const items = rows.map((row) => {
            const completion = computeProfileCompletion(row);
            const hasPendingDoc = (row.hasIdentityDocument && !row.identityDocumentApproved) ||
                (row.hasProfilePhoto && !row.profilePhotoApproved);
            const isHighCompletion = completion.percent >= 75;

            return {
                ...row,
                isVerified: Number(row.isVerified) === 1,
                identityDocumentApproved: Number(row.identityDocumentApproved) === 1,
                profilePhotoApproved: Number(row.profilePhotoApproved) === 1,
                profileCompletionPercent: completion.percent,
                profileCompletionMissing: completion.missingFields,
                approvalEligible: isHighCompletion,
                approvalPending: (hasPendingDoc || isHighCompletion) && Number(row.isVerified) !== 1
            };
        });
        sendJson(res, 200, { items, page, pageSize, total: items.length });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/users/pending-approvals") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                users.id,
                users.full_name AS fullName,
                users.email,
                users.role,
                users.is_active AS isActive,
                users.is_verified AS isVerified,
                users.phone_number AS phoneNumber,
                CASE WHEN LENGTH(TRIM(users.identity_document)) > 0 THEN 1 ELSE 0 END AS hasIdentityDocument,
                CASE WHEN LENGTH(TRIM(users.profile_photo)) > 0 THEN 1 ELSE 0 END AS hasProfilePhoto,
                users.identity_document_approved AS identityDocumentApproved,
                users.profile_photo_approved AS profilePhotoApproved,
                users.created_at AS createdAt,
                (SELECT MAX(last_seen_at) FROM sessions WHERE user_id = users.id) AS lastSeenAt
            FROM users
            WHERE users.role IN ('user', 'partner')
              AND users.is_active = 1
              AND users.is_verified = 0
              AND (users.identity_rejection_reason IS NULL)
            ORDER BY users.created_at DESC
            LIMIT 300
        `).all();

        const items = rows
            .map((row) => {
                const completion = computeProfileCompletion(row);
                // Un utilisateur est en attente s'il a un document non approuvé OU s'il a atteint le score de 75%
                const hasPendingDoc = (row.hasIdentityDocument && !row.identityDocumentApproved) ||
                    (row.hasProfilePhoto && !row.profilePhotoApproved);
                const isHighCompletion = completion.percent >= 75;

                return {
                    ...row,
                    isVerified: Number(row.isVerified) === 1,
                    hasIdentityDocument: Number(row.hasIdentityDocument) === 1,
                    hasProfilePhoto: Number(row.hasProfilePhoto) === 1,
                    identityDocumentApproved: Number(row.identityDocumentApproved) === 1,
                    profilePhotoApproved: Number(row.profilePhotoApproved) === 1,
                    profileCompletionPercent: completion.percent,
                    profileCompletionMissing: completion.missingFields,
                    approvalEligible: isHighCompletion,
                    approvalPending: hasPendingDoc || isHighCompletion
                };
            })
            .filter((row) => row.approvalPending);

        sendJson(res, 200, { items, total: items.length });
        return;
    }

    const adminUserDocumentMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/document$/);
    if (adminUserDocumentMatch && req.method === "GET") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserDocumentMatch[1]);
        const type = String(requestUrl.searchParams.get("type") || "").toLowerCase();
        const row = db.prepare("SELECT id,identity_document AS identityDocument,profile_photo AS profilePhoto FROM users WHERE id=?").get(userId);
        if (!row) return sendJson(res, 404, { error: "Utilisateur introuvable." });

        let dataUrl = "";
        if (type === "identity") dataUrl = String(row.identityDocument || "");
        if (type === "photo") dataUrl = String(row.profilePhoto || "");
        if (!["identity", "photo"].includes(type)) {
            return sendJson(res, 400, { error: "Type document invalide (identity/photo)." });
        }
        if (!dataUrl) return sendJson(res, 404, { error: "Aucun document pour cette section." });
        sendJson(res, 200, { userId, type, dataUrl });
        return;
    }

    const adminUserSectionReviewMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/review-section$/);
    if (adminUserSectionReviewMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserSectionReviewMatch[1]);
        const body = await parseBody(req);
        const section = String(body?.section || "").trim();
        const decision = String(body?.decision || "").trim().toLowerCase();
        const reason = toSafeText(body?.reason || "", 220);
        if (!["identityDocument", "profilePhoto"].includes(section)) {
            return sendJson(res, 400, { error: "Section invalide." });
        }
        if (!["approve", "reject"].includes(decision)) {
            return sendJson(res, 400, { error: "Decision invalide (approve/reject)." });
        }

        const target = db.prepare(`
            SELECT
                id,
                full_name AS fullName,
                email,
                role,
                is_active AS isActive,
                is_verified AS isVerified,
                phone_number AS phoneNumber,
                identity_document AS identityDocument,
                profile_photo AS profilePhoto,
                identity_document_approved AS identityDocumentApproved,
                profile_photo_approved AS profilePhotoApproved
            FROM users
            WHERE id=?
        `).get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });
        if (String(target.role || "").toLowerCase() === "admin") {
            return sendJson(res, 400, { error: "Action indisponible pour un compte admin." });
        }

        const completion = computeProfileCompletion(target);
        // Suppression de la contrainte de 75% pour l'admin

        const t = nowIso();
        if (section === "identityDocument") {
            if (decision === "approve") {
                if (!String(target.identityDocument || "").trim()) {
                    return sendJson(res, 400, { error: "Aucun document CNI/Passeport disponible." });
                }
                db.prepare("UPDATE users SET identity_document_approved=1 WHERE id=?").run(userId);
                recordAdminAudit(admin.id, "user_identity_approve", "user", userId, { email: target.email });
            } else {
                db.prepare("UPDATE users SET identity_document='', identity_document_approved=0, is_verified=0 WHERE id=?").run(userId);
                const text = "Votre piece CNI/Passeport ne correspond pas. Veuillez la remplacer avec un document valide.";
                pushAdminInboxMessage(userId, "identityDocument", text, admin.id);
                recordAdminAudit(admin.id, "user_identity_reject", "user", userId, { email: target.email, reason: reason || "piece invalide" });
            }
        } else if (section === "profilePhoto") {
            if (decision === "approve") {
                if (!String(target.profilePhoto || "").trim()) {
                    return sendJson(res, 400, { error: "Aucune photo disponible." });
                }
                db.prepare("UPDATE users SET profile_photo_approved=1 WHERE id=?").run(userId);
                recordAdminAudit(admin.id, "user_photo_approve", "user", userId, { email: target.email });
            } else {
                db.prepare("UPDATE users SET profile_photo='', profile_photo_approved=0, is_verified=0 WHERE id=?").run(userId);
                const text = "Votre photo de profil ne correspond pas. Veuillez uploader une photo claire et recente.";
                pushAdminInboxMessage(userId, "profilePhoto", text, admin.id);
                recordAdminAudit(admin.id, "user_photo_reject", "user", userId, { email: target.email, reason: reason || "photo invalide" });
            }
        }

        recomputeUserVerification(userId);
        const refreshed = getUserById(userId);
        const verificationRow = db.prepare(`
            SELECT identity_document_approved AS identityDocumentApproved, profile_photo_approved AS profilePhotoApproved, is_verified AS isVerified
            FROM users
            WHERE id=?
        `).get(userId);
        sendJson(res, 200, {
            ok: true,
            id: userId,
            section,
            decision,
            at: t,
            isVerified: Number(verificationRow?.isVerified || 0) === 1,
            identityDocumentApproved: Number(verificationRow?.identityDocumentApproved || 0) === 1,
            profilePhotoApproved: Number(verificationRow?.profilePhotoApproved || 0) === 1,
            profileCompletion: computeProfileCompletion(refreshed || {})
        });
        return;
    }

    const adminUserVerifyMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/verify$/);
    if (adminUserVerifyMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserVerifyMatch[1]);
        const body = await parseBody(req);
        const nextVerified = Number(body?.isVerified) === 1 || body?.isVerified === true;

        const target = db.prepare(`
            SELECT
                id,
                full_name AS fullName,
                email,
                role,
                is_active AS isActive,
                is_verified AS isVerified,
                phone_number AS phoneNumber,
                identity_document AS identityDocument,
                profile_photo AS profilePhoto,
                identity_document_approved AS identityDocumentApproved,
                profile_photo_approved AS profilePhotoApproved
            FROM users
            WHERE id=?
        `).get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });

        const completion = computeProfileCompletion(target);
        // Suppression de la contrainte de 75% pour l'admin

        if (nextVerified) {
            // On autorise l'approbation forcée même sans documents approuvés individuellement
            db.prepare("UPDATE users SET is_verified=1 WHERE id=?").run(userId);
        } else {
            db.prepare("UPDATE users SET is_verified=0, identity_document_approved=0, profile_photo_approved=0 WHERE id=?").run(userId);
        }
        recordAdminAudit(admin.id, nextVerified ? "user_verify" : "user_unverify", "user", userId, {
            email: target.email,
            profileCompletionPercent: completion.percent
        });
        sendJson(res, 200, { ok: true, id: userId, isVerified: nextVerified });
        return;
    }

    const adminUserStatusMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/);
    if (adminUserStatusMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserStatusMatch[1]);
        const body = await parseBody(req);
        const isActive = Number(body?.isActive) === 1 || body?.isActive === true;
        const target = db.prepare("SELECT id,role,is_active AS isActive,email FROM users WHERE id=?").get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });
        if (Number(target.id) === Number(admin.id) && !isActive) {
            return sendJson(res, 400, { error: "Vous ne pouvez pas suspendre votre propre compte admin." });
        }
        if (String(target.role) === "admin" && !isActive) {
            const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND is_active=1").get().c;
            if (admins <= 1) return sendJson(res, 400, { error: "Au moins un admin actif est requis." });
        }
        db.prepare("UPDATE users SET is_active=? WHERE id=?").run(isActive ? 1 : 0, userId);
        if (!isActive) db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
        recordAdminAudit(admin.id, isActive ? "user_activate" : "user_suspend", "user", userId, { email: target.email });
        sendJson(res, 200, { ok: true, id: userId, isActive });
        return;
    }

    const adminUserRoleMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
    if (adminUserRoleMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserRoleMatch[1]);
        const body = await parseBody(req);
        const role = String(body?.role || "").toLowerCase();
        if (!["user", "admin"].includes(role)) return sendJson(res, 400, { error: "Role invalide." });
        const target = db.prepare("SELECT id,role,email FROM users WHERE id=?").get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });
        if (String(target.role) === "admin" && role === "user") {
            const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c;
            if (admins <= 1) return sendJson(res, 400, { error: "Au moins un admin doit rester admin." });
        }
        db.prepare("UPDATE users SET role=? WHERE id=?").run(role, userId);
        recordAdminAudit(admin.id, "user_role_update", "user", userId, { from: target.role, to: role, email: target.email });
        sendJson(res, 200, { ok: true, id: userId, role });
        return;
    }

    const adminUserSessionsMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/sessions$/);
    if (adminUserSessionsMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserSessionsMatch[1]);
        const target = db.prepare("SELECT id,email FROM users WHERE id=?").get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });
        const result = db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
        recordAdminAudit(admin.id, "user_force_logout", "user", userId, { email: target.email, sessionsDeleted: result.changes || 0 });
        sendJson(res, 200, { ok: true, id: userId, sessionsDeleted: result.changes || 0 });
        return;
    }

    const adminUserDeleteMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (adminUserDeleteMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const userId = Number(adminUserDeleteMatch[1]);
        if (Number(userId) === Number(admin.id)) return sendJson(res, 400, { error: "Suppression de votre compte admin interdite." });
        const target = db.prepare("SELECT id,role,email FROM users WHERE id=?").get(userId);
        if (!target) return sendJson(res, 404, { error: "Utilisateur introuvable." });
        if (String(target.role) === "admin") {
            const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c;
            if (admins <= 1) return sendJson(res, 400, { error: "Impossible de supprimer le dernier admin." });
        }
        db.prepare("DELETE FROM users WHERE id=?").run(userId);
        recordAdminAudit(admin.id, "user_delete", "user", userId, { email: target.email });
        sendJson(res, 200, { ok: true, id: userId });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/offers/pending-verification") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName, users.is_verified AS ownerIsVerified,
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

    if (req.method === "GET" && pathname === "/api/admin/offers") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const { page, pageSize, offset } = paginationFromQuery(requestUrl.searchParams);
        const q = toSafeText(requestUrl.searchParams.get("q") || "", 160);
        const like = `%${q}%`;
        const rows = db.prepare(`
            SELECT
                offers.id, offers.user_id AS userId, users.full_name AS ownerName, users.is_verified AS ownerIsVerified,
                offers.title, offers.origin, offers.destination, offers.departure_date AS departureDate, offers.flight_number AS flightNumber,
                offers.available_kg AS availableKg, offers.price_per_kg AS pricePerKg, offers.description,
                offers.rating, offers.reviews, offers.is_verified AS isVerified, offers.status, offers.created_at AS createdAt
            FROM offers
            INNER JOIN users ON users.id = offers.user_id
            WHERE (? = '' OR users.full_name LIKE ? OR offers.origin LIKE ? OR offers.destination LIKE ? OR offers.title LIKE ?)
            ORDER BY offers.created_at DESC
            LIMIT ? OFFSET ?
        `).all(q, like, like, like, like, pageSize, offset).map(mapOffer);
        sendJson(res, 200, { items: rows, page, pageSize, total: rows.length });
        return;
    }

    const verifyOfferMatch = pathname.match(/^\/api\/admin\/offers\/(\d+)\/verify$/);
    if (verifyOfferMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const offerId = Number(verifyOfferMatch[1]);
        db.prepare("UPDATE offers SET is_verified=1, updated_at=? WHERE id=?").run(nowIso(), offerId);
        recordAdminAudit(admin.id, "offer_verify", "offer", offerId, {});
        sendJson(res, 200, { ok: true, offerId, verified: true });
        return;
    }

    const adminOfferStatusMatch = pathname.match(/^\/api\/admin\/offers\/(\d+)\/status$/);
    if (adminOfferStatusMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const offerId = Number(adminOfferStatusMatch[1]);
        const body = await parseBody(req);
        const status = String(body?.status || "").toLowerCase();
        if (!["active", "hidden", "canceled"].includes(status)) return sendJson(res, 400, { error: "Statut offre invalide." });
        const offer = db.prepare("SELECT id,status,title FROM offers WHERE id=?").get(offerId);
        if (!offer) return sendJson(res, 404, { error: "Offre introuvable." });
        db.prepare("UPDATE offers SET status=?, updated_at=? WHERE id=?").run(status, nowIso(), offerId);
        recordAdminAudit(admin.id, "offer_status_update", "offer", offerId, { from: offer.status, to: status, title: offer.title });
        sendJson(res, 200, { ok: true, id: offerId, status });
        return;
    }

    const adminOfferDeleteMatch = pathname.match(/^\/api\/admin\/offers\/(\d+)$/);
    if (adminOfferDeleteMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const offerId = Number(adminOfferDeleteMatch[1]);
        const offer = db.prepare("SELECT id,title,status FROM offers WHERE id=?").get(offerId);
        if (!offer) return sendJson(res, 404, { error: "Offre introuvable." });
        db.prepare("DELETE FROM offers WHERE id=?").run(offerId);
        recordAdminAudit(admin.id, "offer_delete", "offer", offerId, { title: offer.title, status: offer.status });
        sendJson(res, 200, { ok: true, id: offerId });
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

    const adminReservationStatusMatch = pathname.match(/^\/api\/admin\/reservations\/(\d+)\/status$/);
    if (adminReservationStatusMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const reservationId = Number(adminReservationStatusMatch[1]);
        const body = await parseBody(req);
        const target = sanitizeReservationStatus(String(body?.status || ""));
        const reason = toSafeText(body?.reason || "Mise a jour admin", 280);
        if (!target) return sendJson(res, 400, { error: "Statut invalide." });
        const reservation = db.prepare("SELECT id,status,parcel_request_id AS parcelRequestId FROM reservations WHERE id=?").get(reservationId);
        if (!reservation) return sendJson(res, 404, { error: "Reservation introuvable." });
        const t = nowIso();
        db.prepare("UPDATE reservations SET status=?, updated_at=? WHERE id=?").run(target, t, reservationId);
        if (["canceled", "refused"].includes(target)) {
            db.prepare("UPDATE parcel_requests SET status='open', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        } else if (["agreed", "delivered"].includes(target)) {
            db.prepare("UPDATE parcel_requests SET status='closed', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        } else {
            db.prepare("UPDATE parcel_requests SET status='matched', updated_at=? WHERE id=?").run(t, reservation.parcelRequestId);
        }
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id=?").get(reservationId);
        if (thread) {
            pushSystemMessage(thread.id, `Statut reservation mis a jour par admin: ${target}. Motif: ${reason}.`, t);
            if (target === "agreed") db.prepare("UPDATE chat_threads SET warning_sent_at=NULL, delete_after_at=NULL WHERE id=?").run(thread.id);
        }
        recordAdminAudit(admin.id, "reservation_status_force", "reservation", reservationId, { from: reservation.status, to: target, reason });
        sendJson(res, 200, { ok: true, id: reservationId, status: target, updatedAt: t });
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
        recordAdminAudit(admin.id, "chat_suspend", "conversation", thread.id, { reservationId, reason });
        sendJson(res, 200, { ok: true, reservationId, threadId: thread.id, suspended: true });
        return;
    }

    const adminResumeChatMatch = pathname.match(/^\/api\/admin\/reservations\/(\d+)\/chat\/resume$/);
    if (adminResumeChatMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const reservationId = Number(adminResumeChatMatch[1]);
        const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id=?").get(reservationId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable pour cette reservation." });
        const t = nowIso();
        db.prepare("UPDATE chat_threads SET is_suspended=0, suspended_reason='', suspended_at=NULL WHERE id=?").run(thread.id);
        pushSystemMessage(thread.id, "Conversation reactivee par l'administration.", t);
        recordAdminAudit(admin.id, "chat_resume", "conversation", thread.id, { reservationId });
        sendJson(res, 200, { ok: true, reservationId, threadId: thread.id, suspended: false });
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
        recordAdminAudit(admin.id, "chat_delete", "conversation", thread.id, { reservationId });
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
        recordAdminAudit(admin.id, "agreement_suspend", "reservation", reservationId, {});
        sendJson(res, 200, { ok: true, reservationId: reservation.id, status: "pending", updatedAt: t });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/conversations") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const rows = db.prepare(`
            SELECT
                chat_threads.id,
                chat_threads.reservation_id AS reservationId,
                chat_threads.user_id AS requesterId,
                chat_threads.offer_owner_id AS offerOwnerId,
                chat_threads.is_suspended AS isSuspended,
                chat_threads.suspended_reason AS suspendedReason,
                chat_threads.last_message_at AS lastMessageAt,
                chat_threads.created_at AS createdAt,
                reservations.status AS reservationStatus,
                offers.title AS offerTitle,
                offers.destination AS destination,
                requester.full_name AS requesterName,
                owner.full_name AS offerOwnerName,
                (SELECT COUNT(*) FROM chat_messages WHERE thread_id = chat_threads.id) AS messageCount,
                (SELECT text FROM chat_messages WHERE thread_id = chat_threads.id ORDER BY created_at DESC LIMIT 1) AS preview
            FROM chat_threads
            INNER JOIN reservations ON reservations.id = chat_threads.reservation_id
            INNER JOIN offers ON offers.id = reservations.offer_id
            INNER JOIN users requester ON requester.id = chat_threads.user_id
            INNER JOIN users owner ON owner.id = chat_threads.offer_owner_id
            ORDER BY chat_threads.last_message_at DESC
            LIMIT 300
        `).all().map(mapAdminConversation);
        sendJson(res, 200, rows);
        return;
    }

    const adminConversationSuspendMatch = pathname.match(/^\/api\/admin\/conversations\/([^/]+)\/suspend$/);
    if (adminConversationSuspendMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const threadId = adminConversationSuspendMatch[1];
        const body = await parseBody(req);
        const reason = toSafeText(body.reason || "verification admin en cours", 280);
        const thread = db.prepare("SELECT id,reservation_id AS reservationId FROM chat_threads WHERE id=?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        const t = nowIso();
        db.prepare("UPDATE chat_threads SET is_suspended=1, suspended_at=?, suspended_reason=? WHERE id=?").run(t, reason, threadId);
        pushSystemMessage(threadId, `Conversation suspendue par l'administration. Raison: ${reason}.`, t);
        recordAdminAudit(admin.id, "chat_suspend", "conversation", threadId, { reservationId: thread.reservationId, reason });
        sendJson(res, 200, { ok: true, id: threadId, suspended: true });
        return;
    }

    const adminConversationResumeMatch = pathname.match(/^\/api\/admin\/conversations\/([^/]+)\/resume$/);
    if (adminConversationResumeMatch && req.method === "PATCH") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const threadId = adminConversationResumeMatch[1];
        const thread = db.prepare("SELECT id,reservation_id AS reservationId FROM chat_threads WHERE id=?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        const t = nowIso();
        db.prepare("UPDATE chat_threads SET is_suspended=0, suspended_reason='', suspended_at=NULL WHERE id=?").run(threadId);
        pushSystemMessage(threadId, "Conversation reactivee par l'administration.", t);
        recordAdminAudit(admin.id, "chat_resume", "conversation", threadId, { reservationId: thread.reservationId });
        sendJson(res, 200, { ok: true, id: threadId, suspended: false });
        return;
    }

    const adminConversationDeleteMatch = pathname.match(/^\/api\/admin\/conversations\/([^/]+)$/);
    if (adminConversationDeleteMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const threadId = adminConversationDeleteMatch[1];
        const thread = db.prepare("SELECT id,reservation_id AS reservationId FROM chat_threads WHERE id=?").get(threadId);
        if (!thread) return sendJson(res, 404, { error: "Conversation introuvable." });
        db.prepare("DELETE FROM chat_threads WHERE id=?").run(threadId);
        recordAdminAudit(admin.id, "chat_delete", "conversation", threadId, { reservationId: thread.reservationId });
        sendJson(res, 200, { ok: true, id: threadId, deleted: true });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/security/blocks") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        purgeExpiredAuthBlocks();
        const rows = db.prepare(`
            SELECT
                auth_blocks.id,
                auth_blocks.block_type AS blockType,
                auth_blocks.value,
                auth_blocks.reason,
                auth_blocks.expires_at AS expiresAt,
                auth_blocks.created_at AS createdAt,
                users.full_name AS createdByName
            FROM auth_blocks
            INNER JOIN users ON users.id = auth_blocks.created_by
            ORDER BY auth_blocks.created_at DESC
            LIMIT 300
        `).all();
        sendJson(res, 200, rows);
        return;
    }

    if (req.method === "POST" && pathname === "/api/admin/security/blocks") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const body = await parseBody(req);
        const blockType = normalizeBlockType(body.blockType);
        let value = toSafeText(body.value, 220);
        const reason = requiredText(body.reason, "reason", 240);
        const durationHours = intRange(body.durationHours, 24, 1, 24 * 30);
        if (!blockType) return sendJson(res, 400, { error: "Type de blocage invalide (ip/email)." });
        if (blockType === "email") value = value.toLowerCase();
        if (!value) return sendJson(res, 400, { error: "Valeur de blocage requise." });
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
        db.prepare(`
            INSERT INTO auth_blocks(block_type,value,reason,expires_at,created_by,created_at)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(block_type, value) DO UPDATE SET
                reason=excluded.reason,
                expires_at=excluded.expires_at,
                created_by=excluded.created_by,
                created_at=excluded.created_at
        `).run(blockType, value, reason, expiresAt, admin.id, nowIso());
        recordAdminAudit(admin.id, "security_block_create", "auth_block", `${blockType}:${value}`, { reason, durationHours, expiresAt });
        sendJson(res, 201, { ok: true, blockType, value, reason, expiresAt });
        return;
    }

    const adminSecurityBlockDeleteMatch = pathname.match(/^\/api\/admin\/security\/blocks\/(\d+)$/);
    if (adminSecurityBlockDeleteMatch && req.method === "DELETE") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const blockId = Number(adminSecurityBlockDeleteMatch[1]);
        const row = db.prepare("SELECT id,block_type AS blockType,value FROM auth_blocks WHERE id=?").get(blockId);
        if (!row) return sendJson(res, 404, { error: "Blocage introuvable." });
        db.prepare("DELETE FROM auth_blocks WHERE id=?").run(blockId);
        recordAdminAudit(admin.id, "security_block_delete", "auth_block", blockId, { blockType: row.blockType, value: row.value });
        sendJson(res, 200, { ok: true, id: blockId });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/security/login-rate") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const now = Date.now();
        const rows = [];
        for (const [key, item] of loginRateLimiter.entries()) {
            const blocked = Number(item?.blockedUntil || 0);
            rows.push({
                key,
                count: Number(item?.count || 0),
                blockedUntil: blocked > now ? new Date(blocked).toISOString() : null,
                retrySeconds: blocked > now ? Math.ceil((blocked - now) / 1000) : 0
            });
        }
        sendJson(res, 200, { keys: rows.length, items: rows.slice(0, 200) });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/audit-log") {
        const admin = requireAdmin(req, res);
        if (!admin) return;
        const limit = intRange(requestUrl.searchParams.get("limit"), 120, 20, 500);
        const rows = db.prepare(`
            SELECT
                admin_audit_log.id,
                admin_audit_log.action_type AS actionType,
                admin_audit_log.entity_type AS entityType,
                admin_audit_log.entity_id AS entityId,
                admin_audit_log.details,
                admin_audit_log.created_at AS createdAt,
                users.full_name AS adminName,
                users.email AS adminEmail
            FROM admin_audit_log
            INNER JOIN users ON users.id = admin_audit_log.admin_user_id
            ORDER BY admin_audit_log.created_at DESC
            LIMIT ?
        `).all(limit);
        sendJson(res, 200, rows);
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
        recordAdminAudit(admin.id, "flag_create", "moderation_flag", Number(result.lastInsertRowid), { entityType, entityId, reason });
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
        recordAdminAudit(admin.id, "flag_resolve", "moderation_flag", flagId, {});
        sendJson(res, 200, { ok: true, flagId, status: "resolved" });
        return;
    }


    if (req.method === "GET" && pathname === "/api/miracle/status") {
        try {
            const statusContent = await fsp.readFile(path.join(__dirname, "status.json"), "utf8");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(statusContent);
        } catch (err) {
            sendJson(res, 200, { thought: "En attente...", progress: 0, task: "Serveur actif", active: true });
        }
        return;
    }

    if (req.method === "POST" && pathname === "/api/miracle/command") {
        const body = await parseBody(req);
        const command = body.command ? body.command.toUpperCase() : "";

        if (command) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] MOBILE: ${command}\n`;
            await fsp.appendFile(path.join(__dirname, "remote", "commands.txt"), logEntry);
            console.log("📡 Miracle Command Received:", command);

            // AUTO-PILOT LOGIC
            let aiResponse = "Message reçu ! Je l'analyse...";
            let progress = 50;
            let taskName = "Traitement en cours";

            if (command.includes("TEST")) {
                aiResponse = "Test réussi ! Ton pont mobile est ultra-rapide. OK 🚀";
                progress = 100;
                taskName = "Test validé";
            } else if (command.includes("STATUS") || command.includes("ETAT")) {
                aiResponse = "Le système est stable. Ngrok est actif et opérationnel.";
                progress = 100;
                taskName = "Diagnostic complet";
            }

            // Update status immediately for the phone
            const statusUpdate = {
                thought: aiResponse,
                progress: progress,
                task: taskName,
                active: true,
                lastUpdate: timestamp
            };
            await fsp.writeFile(path.join(__dirname, "status.json"), JSON.stringify(statusUpdate, null, 2));

            sendJson(res, 200, { ok: true, autoResponse: aiResponse });
        } else {
            sendJson(res, 400, { error: "Commande vide" });
        }
        return;
    }

    if (req.method === "GET" && pathname === "/miracle") {
        try {
            const html = await fsp.readFile(path.join(__dirname, "public", "miracle.html"), "utf8");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
        } catch (err) {
            sendText(res, 404, "Dashboard Miracle introuvable.");
        }
        return;
    }

    // ====== PAYSTACK PAYMENT ROUTES ======

    // Route 1 : Initier un paiement Paystack (commission 12%)
    if (pathname === "/api/payments/paystack/initiate" && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = await parseBody(req);
        const reservationId = Number(body.reservationId || 0);
        if (!reservationId) return sendJson(res, 400, { error: "reservationId requis." });

        // Récupérer la réservation et ses détails
        const reservation = db.prepare(`
            SELECT 
                r.id, r.status, r.proposed_price_per_kg AS pricePerKg, r.user_id AS requesterId,
                pr.weight_kg AS weightKg,
                requester.email AS email, requester.full_name AS fullName
            FROM reservations r
            INNER JOIN parcel_requests pr ON pr.id = r.parcel_request_id
            INNER JOIN users requester ON requester.id = r.user_id
            WHERE r.id = ?
        `).get(reservationId);

        if (!reservation) return sendJson(res, 404, { error: "Réservation introuvable." });
        if (Number(reservation.requesterId) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Action non autorisée." });
        }
        if (!["agreed", "pending"].includes(String(reservation.status || ""))) {
            return sendJson(res, 400, { error: `Statut (${reservation.status}) ne permet pas ce paiement.` });
        }

        // Calcul du montant total en EUR puis 12% de commission
        const totalEUR = (reservation.pricePerKg || 0) * (reservation.weightKg || 1);
        const commissionEUR = Math.round(totalEUR * 0.12 * 100) / 100;

        const reference = `CC-RES-${reservationId}-${Date.now()}`;
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
        const callbackUrl = `${frontendUrl}/chat.html?payment_success=1&resId=${reservationId}`;

        try {
            const result = await paystack.initiateTransaction({
                amountEUR: commissionEUR,
                email: reservation.email,
                reference,
                callbackUrl,
                metadata: { reservationId }
            });

            // Sauvegarder la référence de transaction
            db.prepare("UPDATE reservations SET payment_tx_id=?, payment_provider='paystack' WHERE id=?")
                .run(reference, reservationId);

            return sendJson(res, 200, {
                ok: true,
                paymentLink: result.authorizationUrl,
                reference
            });
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // Route de découverte des moyens de paiement par pays
    if (pathname === "/api/payments/methods" && req.method === "GET") {
        const country = requestUrl.searchParams.get("country");
        if (!country) return sendJson(res, 400, { error: "Paramètre country requis." });

        try {
            // Force reload for fresh registry data
            delete require.cache[require.resolve('./paymentRouter')];
            const router = require('./paymentRouter');
            const data = router.getAvailableMethods(country);
            return sendJson(res, 200, data);
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // ====== SMART PAYMENT ROUTER ======

    // Route unique d'initiation (Choisira automatiquement l'agrégateur)
    if (pathname === "/api/payments/initiate" && req.method === "POST") {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = await parseBody(req);
        const reservationId = Number(body.reservationId || 0);
        if (!reservationId) return sendJson(res, 400, { error: "reservationId requis." });

        // Récupérer les détails de la réservation et du pays de départ (depuis offre si absent dans résa)
        const reservation = db.prepare(`
            SELECT 
                r.id, r.status, r.proposed_price_per_kg AS pricePerKg, r.user_id AS requesterId,
                COALESCE(r.departure_country, o.origin) AS departureCountry,
                pr.weight_kg AS weightKg,
                requester.email AS email, requester.full_name AS fullName,
                requester.phone_number AS phoneNumber,
                o.payment_qr AS travelerPayoutNumber
            FROM reservations r
            INNER JOIN offers o ON o.id = r.offer_id
            INNER JOIN parcel_requests pr ON pr.id = r.parcel_request_id
            INNER JOIN users requester ON requester.id = r.user_id
            WHERE r.id = ?
        `).get(reservationId);

        if (!reservation) return sendJson(res, 404, { error: "Réservation introuvable." });
        if (Number(reservation.requesterId) !== Number(user.id)) {
            return sendJson(res, 403, { error: "Action non autorisée." });
        }

        // Calcul du montant TOTAL en EUR (Prix fixe * Kilos)
        const totalEUR = (reservation.pricePerKg || 0) * (reservation.weightKg || 1);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
        const callbackUrl = `${frontendUrl}/chat.html?payment_success=1&resId=${reservationId}`;

        try {
            const router = require('./paymentRouter');
            const paymentResult = await router.initiateSmartPayment({
                reservationId,
                departureCountry: reservation.departureCountry,
                amountEUR: totalEUR, // On paie le TOTAL
                customerEmail: reservation.email,
                customerName: reservation.fullName,
                phoneNumber: reservation.phoneNumber,
                travelerPayoutNumber: reservation.travelerPayoutNumber,
                callbackUrl
            });

            // Sauvegarder la référence et le provider choisi
            const reference = `CC-RES-${reservationId}-${Date.now()}`;
            db.prepare("UPDATE reservations SET payment_tx_id=?, payment_provider=? WHERE id=?")
                .run(reference, paymentResult.provider.toLowerCase(), reservationId);

            return sendJson(res, 200, {
                ok: true,
                paymentLink: paymentResult.paymentLink,
                provider: paymentResult.provider,
                currency: paymentResult.currency,
                amount: paymentResult.amount
            });
        } catch (err) {
            console.error("[Payment Error]", err);
            return sendJson(res, 500, { error: err.message });
        }
    }

    // Webhooks agrégateurs (FedaPay)
    if (pathname === "/api/payments/fedapay/webhook" && req.method === "POST") {
        const body = await parseBody(req);
        let txStatus = body.entity?.status;
        let description = body.entity?.description || "";

        if (txStatus === "approved" || txStatus === "successful") {
            const match = description.match(/Resa #(\d+)/);
            if (match) {
                const resId = Number(match[1]);
                const reservation = db.prepare("SELECT id, status FROM reservations WHERE id=?").get(resId);
                if (reservation && reservation.status !== "commission_payee") {
                    const t = nowIso();
                    db.prepare("UPDATE reservations SET status='commission_payee', updated_at=? WHERE id=?")
                        .run(t, reservation.id);
                    const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id = ?").get(reservation.id);
                    if (thread) {
                        db.prepare(`
                            INSERT INTO chat_messages (thread_id, sender_id, sender_type, message_type, text, created_at)
                            VALUES (?, 0, 'system', 'text', ?, ?)
                        `).run(thread.id, `✅ Paiement réussi via FedaPay (Mobile Money). Le voyageur a été informé et vous pouvez coordonner la remise du colis.`, t);
                    }
                    console.log(`[FedaPay Webhook] ✅ Paiement validé pour résa #${reservation.id}`);
                }
            }
        }
        return sendJson(res, 200, { received: true });
    }

    // Route 2 : Webhook Paystack (confirmation de paiement)
    if (pathname === "/api/payments/paystack/webhook" && req.method === "POST") {
        const body = await parseBody(req);
        const signature = req.headers["x-paystack-signature"];

        // Vérification de l'authenticité
        if (!paystack.verifyWebhookSignature(body, signature)) {
            console.warn("[Paystack Webhook] Signature invalide.");
            return sendJson(res, 401, { error: "Signature invalide." });
        }

        const event = body.event;
        const data = body.data;

        if (event === "charge.success" && data.status === "success") {
            const reference = data.reference;
            const reservation = db.prepare("SELECT id, status FROM reservations WHERE payment_tx_id = ?").get(reference);

            if (reservation && reservation.status !== "commission_payee") {
                const t = nowIso();
                db.prepare("UPDATE reservations SET status='commission_payee', updated_at=? WHERE id=?")
                    .run(t, reservation.id);

                // Message système automatique
                const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id = ?").get(reservation.id);
                if (thread) {
                    db.prepare(`
                        INSERT INTO chat_messages (thread_id, sender_id, sender_type, message_type, text, created_at)
                        VALUES (?, 0, 'system', 'text', ?, ?)
                    `).run(thread.id, `✅ Commission réglée via Paystack (Réf: ${reference}). Le voyageur a été informé et vous pouvez coordonner la remise du colis.`, t);
                }
                console.log(`[Paystack Webhook] ✅ Paiement validé pour résa #${reservation.id}`);
            }
        }

        return sendJson(res, 200, { received: true });
    }

    // Route 3 : Webhook Genius Pay (Côte d'Ivoire)
    if (pathname === "/api/payments/webhook/genius" && req.method === "POST") {
        const bodyText = await parseBodyText(req); // On a besoin du texte brut pour le hash
        const body = JSON.parse(bodyText);

        const signature = req.headers["x-webhook-signature"];
        const timestamp = req.headers["x-webhook-timestamp"];
        const secret = process.env.GENIUS_WEBHOOK_SECRET;

        // 1. Vérification de la signature (Sécurité)
        if (secret && signature && timestamp) {
            const crypto = require('crypto');
            const dataToVerify = timestamp + "." + bodyText;
            const expectedSignature = crypto.createHmac('sha256', secret).update(dataToVerify).digest('hex');

            if (expectedSignature !== signature) {
                console.warn("[GeniusPay Webhook] Signature invalide détectée !");
                return sendJson(res, 401, { error: "Invalid signature" });
            }

            // 2. Vérification du timestamp (Protection Replay Attack - 5 min)
            const now = Math.floor(Date.now() / 1000);
            if (Math.abs(now - Number(timestamp)) > 300) {
                console.warn("[GeniusPay Webhook] Timestamp trop ancien (Replay Attack ?)");
                return sendJson(res, 400, { error: "Timestamp expired" });
            }
        }

        const event = body.event;
        const data = body.data || {};

        if (event === "payment.success" && data.status === "completed") {
            const resId = data.metadata?.orderId;
            const payoutAmount = data.metadata?.payoutAmount;
            const travelerPhone = data.metadata?.travelerPayoutNumber;

            if (resId) {
                const reservation = db.prepare("SELECT id, status FROM reservations WHERE id=?").get(resId);
                // Utilisation du statut standard 'commission_payee' pour compatibilité
                if (reservation && reservation.status !== "commission_payee") {
                    const t = nowIso();
                    db.prepare("UPDATE reservations SET status='commission_payee', updated_at=? WHERE id=?")
                        .run(t, reservation.id);

                    // --- AUTOMATISATION DU REVERSEMENT VOYAGEUR ---
                    if (payoutAmount && travelerPhone) {
                        console.log(`[GeniusPay Webhook] 💸 Tentative de reversement de ${payoutAmount} XOF vers ${travelerPhone}...`);
                        const geniusPay = require('./geniusPayService');
                        geniusPay.createTransfer({
                            amount: payoutAmount,
                            phoneNumber: travelerPhone,
                            reservationId: resId,
                            description: `Reversement ColisConnect #${resId}`
                        }).then(payoutResult => {
                            if (payoutResult.success) {
                                console.log(`[GeniusPay Webhook] ✅ Reversement réussi pour résa #${resId}`);
                            } else {
                                console.error(`[GeniusPay Webhook] ❌ Échec reversement :`, payoutResult.message);
                            }
                        });
                    }

                    const thread = db.prepare("SELECT id FROM chat_threads WHERE reservation_id = ?").get(reservation.id);
                    if (thread) {
                        db.prepare(`
                            INSERT INTO chat_messages (thread_id, sender_id, sender_type, message_type, text, created_at)
                            VALUES (?, 0, 'system', 'text', ?, ?)
                        `).run(thread.id, `✅ Paiement réussi via Genius Pay (Wave/Orange/MTN/Moov). Référence: ${reference}. Le voyageur a été informé.`, t);
                    }
                    console.log(`[GeniusPay Webhook] ✅ Paiement validé pour résa #${reservation.id}`);
                }
            }
        }
        return sendJson(res, 200, { received: true });
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
    aiModerator.start(db);
});
