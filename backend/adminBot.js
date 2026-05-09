/**
 * adminBot.js — ColisConnect Admin Assistant v2 (ReAct Multi-Step)
 *
 * Architecture : Boucle ReAct (Reason + Act)
 * Le bot peut enchaîner plusieurs appels d'outils de façon autonome avant
 * de synthétiser une réponse finale pour l'administrateur.
 *
 * Exemple : "Supprime Yoann"
 *   → Étape 1 : find_user(query="Yoann") → { id: 42 }
 *   → Étape 2 : delete_user(user_id: 42) → "Supprimé"
 *   → Synthèse : "L'utilisateur Yoann (ID 42) a été supprimé."
 */

const https = require("https");

const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MAX_REACT_STEPS = 5; // Sécurité anti-boucle infinie

// ─── System Prompt (synchronisé avec le vrai code) ────────────────────────── */
const SYSTEM_PROMPT = `Tu es "ColisConnect Admin Assistant", un assistant administrateur IA.

🚨 RÈGLES ABSOLUES 🚨
1. ZERO HALLUCINATION : Ne fournis jamais de données sans avoir utilisé un outil.
2. PAS D'INVENTION : Ne crée jamais de faux IDs, faux noms ou fausses stats.
3. CHAINAGE AUTORISÉ : Tu peux appeler plusieurs outils en séquence. Par exemple, pour
   "supprime Yoann", tu dois D'ABORD appeler find_user pour obtenir son ID, PUIS delete_user.
4. FORMAT UNIQUE : Pour tout appel d'outil, réponds UNIQUEMENT avec ce JSON (rien d'autre) :
   {"action":"call","tool":"NOM_OUTIL","params":{...}}
5. RÉPONSE FINALE : Quand tu as tous les résultats nécessaires, réponds en français naturel.

─── OUTILS DISPONIBLES ───────────────────────────────────────────────────────

📊 STATISTIQUES & RECHERCHE
• {"action":"call","tool":"get_stats","params":{}}
  → Stats globales : nb users, offres, réservations, revenus.

• {"action":"call","tool":"find_user","params":{"query":"nom ou email"}}
  → Cherche un utilisateur par nom ou email. Retourne les détails complets + ID.

• {"action":"call","tool":"list_users","params":{"limit":20}}
  → Liste les derniers inscrits.

• {"action":"call","tool":"search_user_offers","params":{"query":"nom ou email"}}
  → Retourne toutes les offres publiées par un utilisateur (cherche par nom/email).

• {"action":"call","tool":"count_user_offers","params":{"user_id":ID}}
  → Compte le nombre d'offres d'un utilisateur. Nécessite un user_id numérique.

• {"action":"call","tool":"list_recent_offers","params":{"limit":10}}
  → Liste les dernières offres (ID, route, propriétaire).

• {"action":"call","tool":"list_recent_chats","params":{"limit":10}}
  → Liste les dernières conversations (ID, statut, participants).

• {"action":"call","tool":"get_problematic_chats","params":{"limit":10}}
  → Liste les chats signalés à haut risque par la modération IA.

• {"action":"call","tool":"get_chat_transcript","params":{"thread_id":ID}}
  → Retourne le transcript complet d'une conversation.

👤 ACTIONS UTILISATEURS (nécessitent un user_id numérique)
• {"action":"call","tool":"suspend_user","params":{"user_id":ID}}
• {"action":"call","tool":"unsuspend_user","params":{"user_id":ID}}
• {"action":"call","tool":"make_admin","params":{"user_id":ID}}
• {"action":"call","tool":"approve_user","params":{"user_id":ID}}
• {"action":"call","tool":"force_logout","params":{"user_id":ID}}
• {"action":"call","tool":"delete_user","params":{"user_id":ID}}
• {"action":"call","tool":"ban_user","params":{"user_id":ID,"reason":"motif"}}
  → Bannissement définitif (bloque user + email).

📦 ACTIONS OFFRES (nécessitent un offer_id numérique)
• {"action":"call","tool":"delete_offer","params":{"offer_id":ID}}
• {"action":"call","tool":"hide_offer","params":{"offer_id":ID}}

💬 ACTIONS CHATS (nécessitent un thread_id)
• {"action":"call","tool":"suspend_chat","params":{"thread_id":ID}}
• {"action":"call","tool":"delete_chat","params":{"thread_id":ID}}

📋 RÉSERVATIONS
• {"action":"call","tool":"force_reservation_status","params":{"res_id":ID,"status":"confirmé|annulé|complété"}}

🗑️ MAINTENANCE
• {"action":"call","tool":"delete_test_data","params":{}}
  → Supprime tous les comptes et offres de test (emails contenant "test").

─── STRATÉGIE DE RAISONNEMENT ────────────────────────────────────────────────
Si l'admin donne un NOM (pas un ID), tu DOIS d'abord appeler find_user ou search_user_offers
pour obtenir l'ID, AVANT de faire toute action. Ne suppose jamais un ID.`;

// ─── HTTP utility ─────────────────────────────────────────────────────────── */
function callDeepSeek(messages) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages,
            temperature: 0.05,
            max_tokens: 512
        });
        const url = new URL(DEEPSEEK_API_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY || ""}`,
                "Content-Length": Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed?.choices?.[0]?.message?.content || "");
                } catch (e) { reject(e); }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// ─── Tool Implementations ─────────────────────────────────────────────────── */
const Tools = {

    // ── Stats & Recherche ──────────────────────────────────────────────────
    get_stats: (db) => {
        const u = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
        const o = db.prepare("SELECT COUNT(*) as c FROM offers").get().c;
        let r = 0, rev = 0;
        try { r = db.prepare("SELECT COUNT(*) as c FROM reservations").get().c; } catch { }
        try { rev = db.prepare("SELECT COALESCE(SUM(commission_amount),0) as t FROM payments WHERE status='confirmed'").get().t; } catch { }
        return `Statistiques ColisConnect :\n- Utilisateurs : ${u}\n- Offres publiées : ${o}\n- Réservations : ${r}\n- Revenus confirmés : ${rev} ¥`;
    },

    find_user: (db, params) => {
        const q = params?.query || "";
        const rows = db.prepare(
            "SELECT id, full_name, email, role, is_suspended, is_verified, created_at FROM users WHERE email LIKE ? OR full_name LIKE ? LIMIT 5"
        ).all(`%${q}%`, `%${q}%`);
        if (!rows.length) return "Aucun utilisateur trouvé pour : " + q;
        return rows.map(u =>
            `ID ${u.id} | Nom: ${u.full_name} | Email: ${u.email} | Role: ${u.role} | Actif: ${u.is_active ? "oui" : "non (suspendu)"} | Vérifié: ${u.is_verified ? "oui" : "non"} | Inscrit: ${u.created_at}`
        ).join("\n");
    },

    list_users: (db, params) => {
        const rows = db.prepare(
            "SELECT id, full_name, email, role, is_active FROM users ORDER BY created_at DESC LIMIT ?"
        ).all(params?.limit || 20);
        return rows.map(r => `- ID ${r.id}: ${r.full_name} (${r.email}) [${r.role}]${!r.is_active ? " ⚠️ suspendu" : ""}`).join("\n");
    },

    search_user_offers: (db, params) => {
        const q = params?.query || "";
        const rows = db.prepare(
            `SELECT o.id, o.origin, o.destination, o.departure_date, o.price_per_kg, o.available_kg, u.full_name
             FROM offers o JOIN users u ON o.user_id = u.id
             WHERE u.email LIKE ? OR u.full_name LIKE ?
             ORDER BY o.created_at DESC LIMIT 50`
        ).all(`%${q}%`, `%${q}%`);
        if (!rows.length) return "Aucune offre trouvée pour l'utilisateur : " + q;
        const name = rows[0].full_name || q;
        return `Offres de "${name}" (${rows.length} trouvée(s)) :\n` +
            rows.map(r => `- #${r.id}: ${r.origin} → ${r.destination} | ${r.departure_date} | ${r.price_per_kg}¥/kg | ${r.available_kg}kg dispo`).join("\n");
    },

    count_user_offers: (db, params) => {
        const id = params?.user_id;
        const u = db.prepare("SELECT full_name FROM users WHERE id = ?").get(id);
        if (!u) return "Utilisateur ID " + id + " introuvable.";
        const count = db.prepare("SELECT COUNT(*) as c FROM offers WHERE user_id = ?").get(id).c;
        return `${u.full_name} a publié ${count} offre(s).`;
    },

    list_recent_offers: (db, params) => {
        // Pas de JOIN pour éviter les erreurs — on fait deux requêtes simples
        const offers = db.prepare(
            "SELECT id, origin, destination, departure_date, price_per_kg, available_kg, user_id FROM offers ORDER BY created_at DESC LIMIT ?"
        ).all(params?.limit || 10);
        if (!offers.length) return "Aucune offre sur la plateforme.";
        return offers.map(o => {
            let ownerName = "inconnu";
            try {
                const u = db.prepare("SELECT full_name FROM users WHERE id = ?").get(o.user_id);
                if (u) ownerName = u.full_name;
            } catch { }
            return `- #${o.id}: ${o.origin} → ${o.destination} | Départ: ${o.departure_date} | ${o.price_per_kg}¥/kg | ${o.available_kg}kg | Par: ${ownerName}`;
        }).join("\n");
    },

    list_recent_chats: (db, params) => {
        // chat_threads uses last_message_at, not updated_at
        const rows = db.prepare(
            "SELECT id, is_suspended, last_message_at FROM chat_threads ORDER BY last_message_at DESC LIMIT ?"
        ).all(params?.limit || 10);
        if (!rows.length) return "Aucune conversation trouvée.";
        return rows.map(r => `- Thread ID: ${r.id} | Suspendu: ${r.is_suspended ? "oui" : "non"} | Dernier msg: ${r.last_message_at}`).join("\n");
    },

    get_problematic_chats: (db, params) => {
        const rows = db.prepare(
            "SELECT thread_id, risk_level, summary, created_at FROM ai_moderation_logs WHERE risk_level='high' ORDER BY created_at DESC LIMIT ?"
        ).all(params?.limit || 10);
        if (!rows.length) return "Aucun chat à haut risque détecté.";
        return rows.map(r => `- Thread ${r.thread_id} | Risque: ${r.risk_level} | ${r.summary || "Pas de résumé"}`).join("\n");
    },

    get_chat_transcript: (db, params) => {
        // chat_messages uses 'text' (not 'content') and 'sender_user_id' (not 'sender_id')
        const m = db.prepare(
            "SELECT sender_user_id, sender_type, text, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC"
        ).all(params?.thread_id);
        if (!m.length) return "Conversation vide ou introuvable.";
        return m.map(msg => `[${msg.sender_type === 'system' ? 'Système' : 'User ' + msg.sender_user_id} @ ${msg.created_at}]: ${msg.text}`).join("\n");
    },

    // ── Actions Utilisateurs ──────────────────────────────────────────────
    // NOTE : la table users utilise is_active (0 = suspendu, 1 = actif), pas is_suspended
    suspend_user: (db, params) => {
        const info = db.prepare("SELECT full_name FROM users WHERE id = ?").get(params?.user_id);
        if (!info) return "Utilisateur ID " + params?.user_id + " introuvable.";
        db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(params?.user_id);
        return `✅ Utilisateur ${info.full_name} suspendu (compte désactivé).`;
    },

    unsuspend_user: (db, params) => {
        const info = db.prepare("SELECT full_name FROM users WHERE id = ?").get(params?.user_id);
        if (!info) return "Utilisateur ID " + params?.user_id + " introuvable.";
        db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(params?.user_id);
        return `✅ Suspension levée pour ${info.full_name} (compte réactivé).`;
    },

    make_admin: (db, params) => {
        const info = db.prepare("SELECT full_name FROM users WHERE id = ?").get(params?.user_id);
        if (!info) return "Utilisateur ID " + params?.user_id + " introuvable.";
        db.prepare("UPDATE users SET role = 'admin', is_verified = 1 WHERE id = ?").run(params?.user_id);
        return `✅ ${info.full_name} est maintenant administrateur et vérifié.`;
    },

    approve_user: (db, params) => {
        const info = db.prepare("SELECT full_name FROM users WHERE id = ?").get(params?.user_id);
        if (!info) return "Utilisateur ID " + params?.user_id + " introuvable.";
        // approve = marquer identity_document_approved + recalcul is_verified
        db.prepare("UPDATE users SET identity_document_approved = 1, is_verified = 1 WHERE id = ?").run(params?.user_id);
        return `✅ ${info.full_name} approuvé et vérifié.`;
    },

    force_logout: (db, params) => {
        const res = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(params?.user_id);
        return `✅ ${res.changes} session(s) de l'utilisateur ID ${params?.user_id} invalidée(s).`;
    },

    delete_user: (db, params) => {
        const info = db.prepare("SELECT full_name, email FROM users WHERE id = ?").get(params?.user_id);
        if (!info) return "Utilisateur ID " + params?.user_id + " introuvable.";
        db.prepare("DELETE FROM users WHERE id = ?").run(params?.user_id);
        return `✅ Utilisateur ${info.full_name} (${info.email}) supprimé définitivement.`;
    },

    ban_user: (db, params) => {
        const id = params?.user_id;
        const u = db.prepare("SELECT full_name, email FROM users WHERE id = ?").get(id);
        if (!u) return "Utilisateur ID " + id + " introuvable.";
        try {
            db.prepare(
                "INSERT OR REPLACE INTO auth_blocks (block_type, value, reason, expires_at, created_by, created_at) VALUES ('email', ?, ?, '2099-12-31', 1, ?)"
            ).run(u.email, params?.reason || "Banni par admin", new Date().toISOString());
        } catch (e) {
            return `Erreur lors du bannissement : ${e.message}`;
        }
        // Désactiver le compte (is_active = 0)
        db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(id);
        return `🚫 ${u.full_name} (${u.email}) banni définitivement. Motif : ${params?.reason || "Non précisé"}.`;
    },

    // ── Actions Offres ────────────────────────────────────────────────────
    delete_offer: (db, params) => {
        const o = db.prepare("SELECT origin, destination FROM offers WHERE id = ?").get(params?.offer_id);
        if (!o) return "Offre #" + params?.offer_id + " introuvable.";
        db.prepare("DELETE FROM offers WHERE id = ?").run(params?.offer_id);
        return `✅ Offre #${params?.offer_id} (${o.origin} → ${o.destination}) supprimée.`;
    },

    hide_offer: (db, params) => {
        const o = db.prepare("SELECT origin, destination FROM offers WHERE id = ?").get(params?.offer_id);
        if (!o) return "Offre #" + params?.offer_id + " introuvable.";
        // offers uses 'status' column (no is_hidden)
        db.prepare("UPDATE offers SET status = 'hidden' WHERE id = ?").run(params?.offer_id);
        return `✅ Offre #${params?.offer_id} (${o.origin} → ${o.destination}) masquée de la recherche.`;
    },

    // ── Actions Chats ─────────────────────────────────────────────────────
    // chat_threads uses is_suspended column (added via ensureColumn)
    suspend_chat: (db, params) => {
        db.prepare("UPDATE chat_threads SET is_suspended = 1, suspended_at = ? WHERE id = ?")
            .run(new Date().toISOString(), params?.thread_id);
        return `✅ Conversation ${params?.thread_id} suspendue.`;
    },

    delete_chat: (db, params) => {
        db.prepare("DELETE FROM chat_messages WHERE thread_id = ?").run(params?.thread_id);
        db.prepare("DELETE FROM chat_threads WHERE id = ?").run(params?.thread_id);
        return `✅ Conversation ${params?.thread_id} et ses messages supprimés.`;
    },

    // ── Réservations ──────────────────────────────────────────────────────
    force_reservation_status: (db, params) => {
        const res = db.prepare("UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?")
            .run(params?.status, new Date().toISOString(), params?.res_id);
        if (!res.changes) return "Réservation #" + params?.res_id + " introuvable.";
        return `✅ Réservation #${params?.res_id} → statut "${params?.status}".`;
    },

    // ── Maintenance ───────────────────────────────────────────────────────
    delete_test_data: (db) => {
        const users = db.prepare("SELECT id FROM users WHERE email LIKE '%test%' OR full_name LIKE '%test%'").all();
        const offers = db.prepare("SELECT id FROM offers WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR full_name LIKE '%test%')").all();
        db.prepare("DELETE FROM offers WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%' OR full_name LIKE '%test%')").run();
        db.prepare("DELETE FROM users WHERE email LIKE '%test%' OR full_name LIKE '%test%'").run();
        return `🗑️ Données de test supprimées : ${users.length} utilisateur(s) et ${offers.length} offre(s).`;
    }
};

// ─── JSON parser tolerant ─────────────────────────────────────────────────── */
function parseToolCall(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[0]);
        // Format strict : {"action":"call","tool":"...","params":{}}
        if (parsed.action === "call" && parsed.tool) {
            return { tool: parsed.tool, params: parsed.params || {} };
        }
        // Format tolérant : {"tool":"...","query":"..."} ou {"tool":"...","limit":10}
        if (parsed.tool && !parsed.action) {
            const { tool, ...rest } = parsed;
            return { tool, params: rest };
        }
        return null;
    } catch {
        return null;
    }
}

// ─── Boucle ReAct principale ─────────────────────────────────────────────── */
async function processCommand(db, userMessage, history = []) {
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-8),
        { role: "user", content: userMessage }
    ];

    try {
        for (let step = 0; step < MAX_REACT_STEPS; step++) {
            const aiResponse = await callDeepSeek(messages);
            const toolCall = parseToolCall(aiResponse);

            // Si pas d'appel d'outil : c'est la réponse finale
            if (!toolCall) return aiResponse;

            const { tool, params } = toolCall;

            // Si l'outil n'existe pas : on informe le bot et on continue
            if (!Tools[tool]) {
                messages.push({ role: "assistant", content: aiResponse });
                messages.push({
                    role: "system",
                    content: `ERREUR : L'outil "${tool}" n'existe pas. Utilise uniquement les outils listés dans le System Prompt.`
                });
                continue;
            }

            // Exécuter l'outil
            let toolResult;
            try {
                toolResult = Tools[tool](db, params);
            } catch (err) {
                toolResult = `ERREUR lors de l'exécution de ${tool} : ${err.message}`;
            }

            // Injecter le résultat dans l'historique pour le prochain tour
            messages.push({ role: "assistant", content: aiResponse });
            messages.push({
                role: "system",
                content: `RÉSULTAT DE L'OUTIL "${tool}" :\n${toolResult}\n\nSi tu as besoin de faire une autre action, appelle le prochain outil. Sinon, réponds à l'administrateur en français naturel avec ce résultat.`
            });
        }

        // Sécurité : si on a épuisé les étapes, on demande une synthèse
        const finalSynthesis = await callDeepSeek([
            ...messages,
            { role: "system", content: "Tu as atteint le nombre maximum d'étapes. Résume ce qui a été accompli à l'administrateur en français." }
        ]);
        return finalSynthesis;

    } catch (err) {
        return "❌ Erreur système : " + err.message;
    }
}

module.exports = { processCommand };
