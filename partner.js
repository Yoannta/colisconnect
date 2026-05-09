document.addEventListener("DOMContentLoaded", async () => {
    const CCCommon = window.CCCommon;
    if (!CCCommon) return;

    const els = {
        partnerCode: document.getElementById("partner-code"),
        copyBtn: document.getElementById("copy-code-btn"),
        statTrips: document.getElementById("stat-trips"),
        statConversions: document.getElementById("stat-conversions"),
        statEarnings: document.getElementById("stat-earnings"),
        referralTbody: document.getElementById("referral-tbody"),
        userChip: document.getElementById("user-chip"),
        logoutBtn: document.getElementById("logout-btn")
    };

    let currentUser = null;

    async function init() {
        // Garantit que la session est restauree avant de verifier l'auth
        const user = await CCCommon.init("partner");

        if (!user) {
            // requireAuth a deja ete appele par init() si PROTECTED_PAGES inclut partner.html
            // Mais ajoutons une securite au cas ou :
            if (!CCCommon.requireAuth()) return;
        }

        currentUser = CCCommon.state.user;
        if (!currentUser) return;

        // Redirect standard users who are NOT partners
        if (String(currentUser.role || "").toLowerCase() !== "partner" && String(currentUser.role || "").toLowerCase() !== "admin") {
            window.location.href = "dashboard.html";
            return;
        }

        els.userChip.textContent = currentUser.fullName || currentUser.email;

        if (!currentUser.referralCode) {
            showActivationUI();
        } else {
            els.partnerCode.textContent = currentUser.referralCode;
            fetchStats();
        }

        bindEvents();
    }

    function showActivationUI() {
        const container = document.querySelector(".partner-code-box");
        container.innerHTML = `
            <div style="flex: 1;">
                <p class="stat-label">Devenez partenaire ColisConnect</p>
                <p style="margin-top: 5px; font-size: 0.95rem; color: var(--muted);">Générez votre code unique pour commencer à parrainer des trajets.</p>
            </div>
            <button class="copy-btn" id="activate-partner-btn">Activer mon compte</button>
        `;

        document.getElementById("activate-partner-btn").addEventListener("click", activatePartner);
    }

    async function activatePartner() {
        try {
            const res = await CCCommon.api("/api/partner/activate", { method: "POST" });
            if (res.referralCode) {
                window.location.reload();
            }
        } catch (err) {
            alert("Erreur lors de l'activation : " + err.message);
        }
    }

    async function fetchStats() {
        try {
            const stats = await CCCommon.api("/api/partner/stats");
            renderStats(stats);
        } catch (err) {
            console.error("Failed to fetch partner stats", err);
        }
    }

    function renderStats(stats) {
        els.statTrips.textContent = stats.tripsCount || 0;
        els.statConversions.textContent = stats.conversionsCount || 0;
        els.statEarnings.textContent = stats.totalEarnings + "€";

        if (stats.activity && stats.activity.length > 0) {
            els.referralTbody.innerHTML = stats.activity.map(act => {
                const dateStr = new Date(act.date).toLocaleDateString("fr-FR");
                let statusBadge = act.status;
                if (act.status === "colisconnect_paye") statusBadge = '<span class="status-pill verified">Payé</span>';
                if (act.status === "pending") statusBadge = '<span class="status-pill status-pending">Initié</span>';

                return `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${CCCommon.escapeHtml(act.clientName)}</td>
                        <td>${CCCommon.escapeHtml(act.offerTitle)}</td>
                        <td>${statusBadge}</td>
                        <td style="font-weight: 700; color: var(--emerald-bright);">+${act.commission}€</td>
                    </tr>
                `;
            }).join("");
        }
    }

    function bindEvents() {
        if (els.copyBtn) {
            els.copyBtn.addEventListener("click", () => {
                const code = els.partnerCode.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = els.copyBtn.textContent;
                    els.copyBtn.textContent = "Copié !";
                    setTimeout(() => els.copyBtn.textContent = originalText, 2000);
                });
            });
        }

        if (els.logoutBtn) {
            els.logoutBtn.addEventListener("click", async () => {
                await CCCommon.api("/api/auth/logout", { method: "POST" });
                window.location.href = "index.html";
            });
        }
    }

    init();
});
