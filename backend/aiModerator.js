/**
 * aiModerator.js — ColisConnect AI Moderation Worker
 *
 * Analyses chat conversations using DeepSeek API every N minutes.
 * Detects fraud attempts, off-platform payments, and generates summaries.
 *
 * Requires: DEEPSEEK_API_KEY in .env
 * Optional: AI_MODERATION_INTERVAL_MS (default: 600000 = 10min)
 *            AI_MODERATION_BATCH (default: 20 conversations per cycle)
 */

const https = require("https");

const INTERVAL_MS = Number(process.env.AI_MODERATION_INTERVAL_MS || 1_800_000); // 30min
const BATCH_SIZE = Number(process.env.AI_MODERATION_BATCH || 10);
const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `Tu es un modérateur IA pour ColisConnect, une plateforme de livraison entre voyageurs et expéditeurs.
Analyze les messages entre un client et un voyageur.
Retourne UNIQUEMENT un JSON valide (sans markdown, sans texte autour) avec exactement ces champs :
{
  "summary": "<Résumé de la situation en 1-2 phrases max>",
  "risk_level": "<none|low|medium|high>",
  "flags": ["<raison1>", "<raison2>"]
}

Niveaux de risque :
- none: Conversation normale, tout va bien.
- low: Légère ambiguïté mais rien d'alarmant.
- medium: Tension, mécontentement, ou comportement suspect modéré.
- high: Tentative de contourner la plateforme (paiement externe, WhatsApp, email, conflit grave, menace).

Exemples de flags : "tentative_paiement_externe", "partage_contact", "conflit_client", "colis_perdu", "voyageur_non_reactif", "menace", "arnaque_suspectee"`;

/** ─── HTTP utility: POST to DeepSeek API ─────────────────────────────────── */
function callDeepSeek(messages) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages,
            temperature: 0.2,
            max_tokens: 256,
            response_format: { type: "json_object" }
        });

        const url = new URL(DEEPSEEK_API_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
                "Content-Length": Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed?.choices?.[0]?.message?.content;
                    if (!content) return reject(new Error("DeepSeek: empty response"));
                    resolve(JSON.parse(content));
                } catch (e) {
                    reject(new Error(`DeepSeek parse error: ${e.message}`));
                }
            });
        });

        req.on("error", reject);
        req.setTimeout(15_000, () => { req.destroy(new Error("DeepSeek: timeout 15s")); });
        req.write(body);
        req.end();
    });
}

/** ─── Analyze a single conversation ─────────────────────────────────────── */
async function analyzeConversation(threadId, messages) {
    if (!messages || messages.length === 0) return null;

    const formatted = messages.map(m => {
        const sender = m.sender_type === "system" ? "Système" :
            m.sender_type === "traveler" ? "Voyageur" : "Client";
        return `[${sender}]: ${String(m.text || "").slice(0, 200)}`;
    }).join("\n");

    const userMessage = `Conversation ID: ${threadId}\n\nMessages (${messages.length}) :\n${formatted}`;

    try {
        const result = await callDeepSeek([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage }
        ]);

        // Sanitize and validate the response
        return {
            summary: String(result.summary || "").slice(0, 500),
            risk_level: ["none", "low", "medium", "high"].includes(result.risk_level)
                ? result.risk_level
                : "low",
            flags: Array.isArray(result.flags)
                ? result.flags.map(f => String(f).slice(0, 60)).slice(0, 10)
                : []
        };
    } catch (err) {
        console.error(`[AI Moderator] analyzeConversation(${threadId}) failed:`, err.message);
        return null;
    }
}

/** ─── Main moderation cycle ─────────────────────────────────────────────── */
async function runCycle(db) {
    if (!db) return;

    let conversations;
    try {
        // Pick conversations with new messages since last AI check, ordered by most recent
        conversations = db.prepare(`
            SELECT ct.id, ct.reservation_id, ct.last_message_at, ct.last_ai_check_at
            FROM chat_threads ct
            WHERE ct.is_suspended = 0
              AND (ct.last_ai_check_at IS NULL OR ct.last_message_at > ct.last_ai_check_at)
            ORDER BY ct.last_message_at DESC
            LIMIT ?
        `).all(BATCH_SIZE);
    } catch (err) {
        console.error("[AI Moderator] Failed to query conversations:", err.message);
        return;
    }

    if (!conversations || conversations.length === 0) return;

    console.log(`[AI Moderator] Cycle started — ${conversations.length} conversation(s) to check.`);

    for (const conv of conversations) {
        try {
            // ── Optimisation tokens : on n'envoie que les nouveaux messages ──
            // Les "nouveaux" sont ceux postés APRÈS le dernier check IA.
            // Si < 30 nouveaux → on ajoute 5 messages de contexte précédents.
            // Si >= 30 nouveaux → comportement classique (30 derniers).

            const baseQuery = `
                SELECT text, sender_type, created_at
                FROM chat_messages
                WHERE thread_id = ?
                  AND message_type = 'text'
                  AND sender_type IN ('user', 'traveler', 'system')
            `;

            let chron;

            if (conv.last_ai_check_at) {
                // Récupère uniquement les messages depuis le dernier check
                const newMessages = db.prepare(
                    baseQuery + " AND created_at > ? ORDER BY created_at ASC"
                ).all(conv.id, conv.last_ai_check_at);

                if (newMessages.length >= 30) {
                    // Trop de nouveaux messages : on garde les 30 derniers (classique)
                    chron = newMessages.slice(-30);
                } else {
                    // Peu de nouveaux messages : on ajoute jusqu'à 5 messages de contexte
                    const context = db.prepare(
                        baseQuery + " AND created_at <= ? ORDER BY created_at DESC LIMIT 5"
                    ).all(conv.id, conv.last_ai_check_at).reverse();
                    chron = [...context, ...newMessages];
                }
            } else {
                // Premier check : aucun historique, on prend les 30 derniers
                chron = db.prepare(
                    baseQuery + " ORDER BY created_at DESC LIMIT 30"
                ).all(conv.id).reverse();
            }

            const tokenCount = chron.length;
            console.log(`[AI Moderator] Thread ${conv.id}: ${tokenCount} msg(s) envoyés à l'IA.`);

            const result = await analyzeConversation(conv.id, chron);
            const now = new Date().toISOString();

            // Always update last_ai_check_at
            db.prepare("UPDATE chat_threads SET last_ai_check_at = ? WHERE id = ?")
                .run(now, conv.id);

            if (!result) continue;

            // Only log if there's at least some signal (avoid polluting with "none")
            if (result.risk_level !== "none") {
                db.prepare(`
                    INSERT INTO ai_moderation_logs (thread_id, reservation_id, summary, risk_level, flags, is_dismissed, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, ?)
                `).run(
                    conv.id,
                    conv.reservation_id,
                    result.summary,
                    result.risk_level,
                    JSON.stringify(result.flags),
                    now
                );

                if (result.risk_level === "high") {
                    console.warn(`[AI Moderator] ⚠️  HIGH RISK detected on thread ${conv.id}: ${result.flags.join(", ")}`);
                }
            } else {
                // Still log "none" summaries occasionally for admin review (low noise)
                // Only log 1/10 "none" to keep the table clean
                if (Math.random() < 0.1) {
                    db.prepare(`
                        INSERT INTO ai_moderation_logs (thread_id, reservation_id, summary, risk_level, flags, is_dismissed, created_at)
                        VALUES (?, ?, ?, ?, ?, 1, ?)
                    `).run(conv.id, conv.reservation_id, result.summary, "none", "[]", now);
                }
            }

            // Small delay between API calls to avoid rate limiting
            await new Promise(res => setTimeout(res, 500));

        } catch (err) {
            console.error(`[AI Moderator] Error processing thread ${conv.id}:`, err.message);
        }
    }

    console.log(`[AI Moderator] Cycle complete.`);
}

// ─── Immediate Targeted Check (détecteur passif événementiel) ──────────────
// Fenêtre ciblée sur le message suspect : 10 avant + 1 cible + 5 après ≤ 16 msgs.
// Cooldown 5 min par thread pour éviter les doublons en rafale.
const _triggerCooldown = new Map();
const TRIGGER_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Déclenche un check IA ciblé sur les messages autour d'un message suspect.
 * @param {object} db       - Instance DatabaseSync
 * @param {string} threadId - ID du thread
 * @param {string} messageId - ID du message suspect (pivot de la fenêtre)
 * @param {string} reason   - Raison du déclenchement
 */
async function triggerImmediateCheck(db, threadId, messageId, reason = "passive_alert") {
    if (!db || !threadId) return;

    // Cooldown par thread
    const lastTrigger = _triggerCooldown.get(threadId);
    const now = Date.now();
    if (lastTrigger && (now - lastTrigger) < TRIGGER_COOLDOWN_MS) {
        console.log(`[AI Moderator] Cooldown actif — thread ${threadId} ignoré`);
        return;
    }
    _triggerCooldown.set(threadId, now);
    console.log(`[AI Moderator] ⚡ Check ciblé — thread ${threadId} | msg: ${messageId} | raison: ${reason}`);

    try {
        const colFilter = `AND message_type = 'text' AND sender_type IN ('user', 'traveler', 'system')`;

        // 10 messages antérieurs au message suspect (ordre chronologique)
        const before = db.prepare(
            `SELECT id, text, sender_type, created_at FROM chat_messages
             WHERE thread_id = ? AND id < ? ${colFilter}
             ORDER BY created_at DESC LIMIT 10`
        ).all(threadId, messageId).reverse();

        // Le message suspect lui-même
        const pivot = db.prepare(
            `SELECT id, text, sender_type, created_at FROM chat_messages WHERE id = ?`
        ).get(messageId);

        // 5 messages postérieurs au message suspect (ordre chronologique)
        const after = db.prepare(
            `SELECT id, text, sender_type, created_at FROM chat_messages
             WHERE thread_id = ? AND id > ? ${colFilter}
             ORDER BY created_at ASC LIMIT 5`
        ).all(threadId, messageId);

        const chron = [...before, ...(pivot ? [pivot] : []), ...after];
        if (!chron.length) return;

        console.log(`[AI Moderator] Fenêtre : ${before.length} avant + 1 pivot + ${after.length} après = ${chron.length} msgs.`);

        const result = await analyzeConversation(threadId, chron);
        const nowIso = new Date().toISOString();

        db.prepare("UPDATE chat_threads SET last_ai_check_at = ? WHERE id = ?")
            .run(nowIso, threadId);

        if (!result || result.risk_level === "none") {
            console.log(`[AI Moderator] Risque nul — thread ${threadId}.`);
            return;
        }

        const thread = db.prepare("SELECT reservation_id FROM chat_threads WHERE id = ?").get(threadId);
        db.prepare(
            `INSERT INTO ai_moderation_logs (thread_id, reservation_id, summary, risk_level, flags, is_dismissed, created_at)
             VALUES (?, ?, ?, ?, ?, 0, ?)`
        ).run(
            threadId,
            thread?.reservation_id ?? null,
            result.summary,
            result.risk_level,
            JSON.stringify(result.flags),
            nowIso
        );

        if (result.risk_level === "high") {
            console.warn(`[AI Moderator] 🚨 HIGH RISK — thread ${threadId}: ${result.flags.join(", ")}`);
        } else {
            console.log(`[AI Moderator] ⚠️  Risque ${result.risk_level} — thread ${threadId}`);
        }

    } catch (err) {
        console.error(`[AI Moderator] triggerImmediateCheck(${threadId}) failed:`, err.message);
    }
}

/** ─── Public API ────────────────────────────────────────────────────────── */
// Système 100% événementiel — aucun cycle de veille.
// Déclenché uniquement par le détecteur passif de mots suspects.

function start(db) {
    if (!process.env.DEEPSEEK_API_KEY) {
        console.warn("[AI Moderator] DEEPSEEK_API_KEY non définie — modération désactivée.");
        return;
    }
    console.log("[AI Moderator] Mode événementiel actif — déclenchement sur mots suspects uniquement. Aucun cycle de veille.");
}

function stop() {
    console.log("[AI Moderator] Arrêté.");
}

module.exports = { start, stop, analyzeConversation, runCycle, triggerImmediateCheck };
