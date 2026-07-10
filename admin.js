
(() => {
    const state = {
        token: localStorage.getItem("cc_auth_token") || "",
        user: null,
        usersQuery: "",
        offersQuery: "",
        offersPendingOnly: false,
        loading: false,
        loadingAi: false
    };

    const els = {
        userChip: document.getElementById("admin-user-chip"),
        loginBtn: document.getElementById("admin-login-btn"),
        logoutBtn: document.getElementById("admin-logout-btn"),
        guard: document.getElementById("admin-guard"),
        content: document.getElementById("admin-content"),

        refreshBtn: document.getElementById("admin-refresh-btn"),
        approvalsCard: document.getElementById("admin-approvals-card"),
        approvalsBadge: document.getElementById("admin-approvals-badge"),
        approvalsNote: document.getElementById("admin-approvals-note"),
        stats: document.getElementById("admin-stats"),
        daysInput: document.getElementById("admin-days"),
        reloadAnalyticsBtn: document.getElementById("admin-reload-analytics-btn"),
        analytics: document.getElementById("admin-analytics"),

        usersQ: document.getElementById("admin-users-q"),
        usersSearchBtn: document.getElementById("admin-users-search-btn"),
        usersBody: document.getElementById("admin-users-body"),

        offersQ: document.getElementById("admin-offers-q"),
        offersSearchBtn: document.getElementById("admin-offers-search-btn"),
        offersPendingBtn: document.getElementById("admin-offers-pending-btn"),
        offersBody: document.getElementById("admin-offers-body"),

        reservationsBody: document.getElementById("admin-reservations-body"),
        conversationsBody: document.getElementById("admin-conversations-body"),

        blockType: document.getElementById("admin-block-type"),
        blockValue: document.getElementById("admin-block-value"),
        blockReason: document.getElementById("admin-block-reason"),
        blockDuration: document.getElementById("admin-block-duration"),
        blockCreateBtn: document.getElementById("admin-block-create-btn"),
        blocksBody: document.getElementById("admin-blocks-body"),
        loginRateNote: document.getElementById("admin-login-rate-note"),

        flagEntityType: document.getElementById("admin-flag-entity-type"),
        flagEntityId: document.getElementById("admin-flag-entity-id"),
        flagReason: document.getElementById("admin-flag-reason"),
        flagCreateBtn: document.getElementById("admin-flag-create-btn"),
        flagsBody: document.getElementById("admin-flags-body"),

        auditBody: document.getElementById("admin-audit-body"),
        toast: document.getElementById("admin-toast"),
        platformQrInput: document.getElementById("admin-platform-qr-input"),
        platformQrPreview: document.getElementById("admin-platform-qr-preview"),
        platformQrSaveBtn: document.getElementById("admin-platform-qr-save-btn"),

        totalCommission: document.getElementById("admin-total-commission"),
        totalVolume: document.getElementById("admin-total-volume"),
        transactionsList: document.getElementById("admin-transactions-list"),
        refreshFinanceBtn: document.getElementById("admin-refresh-finance"),

        aiBadge: document.getElementById("admin-ai-badge"),
        aiLogsBody: document.getElementById("admin-ai-logs-body"),
        aiRefreshBtn: document.getElementById("admin-ai-refresh-btn"),

        aiChatHistory: document.getElementById("admin-ai-chat-history"),
        aiChatInput: document.getElementById("admin-ai-input"),
        aiChatSendBtn: document.getElementById("admin-ai-send-btn")
    };

    const sectionTitles = {
        dashboard: "Tableau de bord",
        users: "Gestion des Utilisateurs",
        offers: "Gestion des Offres",
        moderation: "Modération & Flags",
        "ai-moderation": "Modération IA (DeepSeek)",
        "ai-assistant": "Assistant IA (God Mode)",
        financials: "Finances & Transactions",
        security: "Sécurité & Blocages",
        audit: "Journal d'Audit"
    };

    function updateSection(sectionId) {
        document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
        const target = document.getElementById(`section-${sectionId}`);
        if (target) target.classList.add("active");
        document.querySelectorAll(".side-link").forEach(l => l.classList.toggle("active", l.dataset.section === sectionId));
        const titleEl = document.getElementById("current-section-title");
        if (titleEl) titleEl.textContent = sectionTitles[sectionId] || "Admin";
        const main = document.querySelector(".admin-main");
        if (main) main.scrollTop = 0;
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }

    function fmtDate(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
    }

    function fmtDateTime(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }

    function showToast(message) {
        if (!els.toast) return;
        els.toast.textContent = message;
        els.toast.classList.remove("hidden");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
    }

    function statusBadge(status) {
        const key = String(status || "").toLowerCase();
        const label = (key === "voyageur_paye") ? "Attente reversement" : (key === "colisconnect_paye") ? "Payé" : (key || "-");
        let cls = "";
        if (["active", "accepted", "agreed", "delivered", "ok", "resolved", "colisconnect_paye"].includes(key)) cls = "ok";
        if (["pending", "in_transit", "open", "matched", "hidden", "verified"].includes(key)) cls = "warn";
        if (["canceled", "refused", "suspended", "blocked", "unverified", "voyageur_paye"].includes(key)) cls = "danger";
        return `<span class="status-badge ${cls}">${escapeHtml(label)}</span>`;
    }

    function formatMissingFields(fields) {
        const rows = Array.isArray(fields) ? fields : [];
        const labels = [];
        if (rows.includes("phoneNumber")) labels.push("tel");
        if (rows.includes("identityDocument")) labels.push("piece");
        if (rows.includes("profilePhoto")) labels.push("photo");
        return labels.join(", ");
    }

    async function api(path, options = {}) {
        if (!window.CCCommon || !window.CCCommon.api) {
            throw new Error("Bridge CCCommon non initialisé.");
        }
        return window.CCCommon.api(path, { ...options, auth: options.auth !== false });
    }

    function setSession(token, user) {
        state.token = token || "";
        state.user = user || null;
        if (state.token) localStorage.setItem("cc_token", state.token);
        else localStorage.removeItem("cc_token");
        updateAuthUi();
    }

    function clearSession() {
        setSession("", null);
    }

    function updateAuthUi() {
        const authed = Boolean(state.user && state.token);
        if (authed) {
            if (els.userChip) {
                const role = String(state.user.role || "user").toLowerCase();
                els.userChip.textContent = `${state.user.fullName || state.user.email} (${role})`;
                els.userChip.classList.remove("hidden");
            }
            els.loginBtn?.classList.add("hidden");
            els.logoutBtn?.classList.remove("hidden");
        } else {
            if (els.userChip) {
                els.userChip.textContent = "";
                els.userChip.classList.add("hidden");
            }
            els.loginBtn?.classList.remove("hidden");
            els.logoutBtn?.classList.add("hidden");
        }
    }

    function setGuardMode(enabled) {
        els.guard?.classList.toggle("hidden", !enabled);
        els.content?.classList.toggle("hidden", enabled);
    }

    async function restoreSession() {
        if (!state.token) {
            setGuardMode(true);
            updateAuthUi();
            return;
        }
        try {
            const me = await api("/api/auth/me");
            setSession(state.token, me.user);
        } catch {
            clearSession();
            setGuardMode(true);
        }
    }

    function parseJsonText(value) {
        if (!value) return "";
        try {
            const parsed = JSON.parse(value);
            return Object.entries(parsed).map(([k, v]) => `${k}:${String(v)}`).join(" | ");
        } catch {
            return String(value);
        }
    }

    function renderOverview(overview) {
        if (!els.stats) return;
        const pendingApprovals = Number(overview.pendingApprovals || 0);
        const items = [
            ["Users", overview.users],
            ["Users actifs", overview.activeUsers],
            ["Users suspendus", overview.suspendedUsers],
            ["Approbations en attente", pendingApprovals],
            ["Offres", overview.offers],
            ["Offres actives", overview.activeOffers],
            ["Offres cachees", overview.hiddenOffers],
            ["Offres annulees", overview.canceledOffers],
            ["Demandes colis", overview.parcelRequests],
            ["Reservations", overview.reservations],
            ["Reservations pending", overview.pendingReservations],
            ["Accords", overview.agreedReservations],
            ["Conversations", overview.conversations],
            ["Chats suspendus", overview.suspendedConversations],
            ["Offres non verifiees", overview.unverifiedOffers],
            ["Flags ouverts", overview.openFlags],
            ["IP bloquees", overview.blockedIps],
            ["Emails bloques", overview.blockedEmails],
            ["Commissions Totales", `${overview.totalCommission || 0} ¥`],
            ["Volume P2P Total", `${overview.volumeP2P || 0} ¥`],
            ["Rate offre->chat", `${overview.offerToChatRate || 0}%`],
            ["Rate chat->accord", `${overview.chatToAgreementRate || 0}%`]
        ];
        els.stats.innerHTML = items.map(([label, value]) => `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 0)}</strong></article>`).join("\n");

        if (els.approvalsCard) {
            els.approvalsCard.classList.remove("hidden");
        }
        if (els.approvalsBadge) {
            els.approvalsBadge.textContent = String(pendingApprovals);
        }
        if (els.approvalsNote) {
            els.approvalsNote.textContent = pendingApprovals > 0
                ? `${pendingApprovals} approbation(s) utilisateur en attente.`
                : "Aucune approbation en attente.";
        }
    }

    function renderAnalytics(payload) {
        if (!els.analytics) return;
        const points = Array.isArray(payload?.points) ? payload.points : [];
        if (!points.length) {
            els.analytics.innerHTML = '<div class="empty-card">Aucune donnee.</div>';
            return;
        }
        els.analytics.innerHTML = points.map((item) => `<article class="mini-bar"><span class="day">${escapeHtml(item.day)}</span><span class="val">U:${escapeHtml(item.users)}</span><span class="val">O:${escapeHtml(item.offers)}</span><span class="val">C:${escapeHtml(item.conversations)}</span><span class="val">A:${escapeHtml(item.agreements)}</span></article>`).join("\n");
    }

    function renderUsers(resp) {
        if (!els.usersBody) return;
        const users = Array.isArray(resp?.items) ? resp.items : [];
        if (!users.length) {
            els.usersBody.innerHTML = '<tr><td colspan="8">Aucun utilisateur.</td></tr>';
            return;
        }
        const currentAdminEmail = String(state.user?.email || "").toLowerCase();
        const isSpecialApprover = currentAdminEmail === "yoann.tato@gmail.com";
        els.usersBody.innerHTML = users.map((u) => {
            const active = Number(u.isActive) === 1;
            const role = String(u.role || "user").toLowerCase();
            const completion = Number(u.profileCompletionPercent || 25);
            const isVerified = Boolean(u.isVerified);
            const missing = formatMissingFields(u.profileCompletionMissing);
            const activity = `Offres:${u.offersCount || 0} | Reserv:${u.reservationsCount || 0} | Chats:${u.conversationsCount || 0} | Last:${fmtDateTime(u.lastSeenAt)}`;

            const verifyBtn = isVerified
                ? `<button class="btn ghost sm" data-user-verify="${escapeHtml(u.id)}" data-target-verified="0">Desapprouver</button>`
                : `<button class="btn primary sm" data-user-verify="${escapeHtml(u.id)}" data-target-verified="1" title="Approuver utilisateur">Approuver</button>`;

            const currentProfileType = u.profileType || "";
            const profileTypeSelect = `
                <select class="admin-profile-type-select" data-user-id="${escapeHtml(u.id)}" style="background: rgba(15, 34, 72, 0.8); border: 1px solid var(--adm-border); color: #fff; border-radius: 4px; padding: 4px; font-size: 0.85rem; outline: none;">
                    <option value="" ${currentProfileType === "" ? "selected" : ""}>Aucun</option>
                    <option value="client" ${currentProfileType === "client" ? "selected" : ""}>Client</option>
                    <option value="traveler" ${currentProfileType === "traveler" ? "selected" : ""}>Voyageur</option>
                    <option value="cargo" ${currentProfileType === "cargo" ? "selected" : ""}>Cargo</option>
                </select>
                <div style="font-size: 0.75rem; color: var(--adm-text-soft); margin-top: 4px;">Complété: ${escapeHtml(completion)}%${missing ? ` (manque: ${escapeHtml(missing)})` : ""}</div>
            `;

            return `<tr>
<td>#${escapeHtml(u.id)}</td>
<td>${escapeHtml(u.fullName)}</td>
<td>${escapeHtml(u.country || "-")}</td>
<td>${escapeHtml(u.email || (u.id ? u.id.substring(0, 8) + "..." : "-"))}</td>
<td>${statusBadge(role)}</td>
<td>${statusBadge(active ? "active" : "suspended")} ${statusBadge(isVerified ? "verified" : "unverified")}</td>
<td>${profileTypeSelect}</td>
<td>${escapeHtml(activity)}</td>
<td><div class="admin-actions">
${verifyBtn}
<button class="btn ghost sm" data-user-toggle="${escapeHtml(u.id)}" data-target-active="${active ? 0 : 1}">${active ? "Suspendre" : "Activer"}</button>
<button class="btn ghost sm" data-user-role="${escapeHtml(u.id)}" data-target-role="${role === "admin" ? "user" : "admin"}">${role === "admin" ? "Retirer admin" : "Rendre admin"}</button>
<button class="btn ghost sm" data-user-logout="${escapeHtml(u.id)}">Forcer logout</button>
<button class="btn danger sm" data-user-delete="${escapeHtml(u.id)}">Supprimer</button>
</div></td>
</tr>`;
        }).join("\n");
    }

    function renderOffers(resp) {
        if (!els.offersBody) return;
        const offers = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : [];
        if (!offers.length) {
            els.offersBody.innerHTML = '<tr><td colspan="8">Aucune offre.</td></tr>';
            return;
        }
        els.offersBody.innerHTML = offers.map((o) => {
            const status = String(o.status || "active").toLowerCase();
            const isVerified = Boolean(o.isVerified);
            const nextStatus = status === "active" ? "hidden" : "active";
            return `<tr>
<td>#${escapeHtml(o.id)}</td>
<td>${escapeHtml(o.ownerName)}</td>
<td>${escapeHtml(o.origin)} -> ${escapeHtml(o.destination)}</td>
<td>${escapeHtml(fmtDate(o.departureDate))}</td>
<td>${escapeHtml(o.pricePerKg)} ${escapeHtml(o.baseCurrency || "EUR")}</td>
<td>${statusBadge(status)}</td>
<td>${isVerified ? statusBadge("verified") : '<button class="btn ghost sm" data-offer-verify="' + escapeHtml(o.id) + '">Verifier</button>'}</td>
<td><div class="admin-actions">
<button class="btn ghost sm" data-offer-status="${escapeHtml(o.id)}" data-target-status="${escapeHtml(nextStatus)}">${nextStatus === "hidden" ? "Cacher" : "Activer"}</button>
<button class="btn ghost sm" data-offer-status="${escapeHtml(o.id)}" data-target-status="canceled">Annuler</button>
<button class="btn danger sm" data-offer-delete="${escapeHtml(o.id)}">Supprimer</button>
</div></td>
</tr>`;
        }).join("\n");
    }

    function renderReservations(rows) {
        if (!els.reservationsBody) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            els.reservationsBody.innerHTML = '<tr><td colspan="7">Aucune reservation.</td></tr>';
            return;
        }
        els.reservationsBody.innerHTML = items.map((r) => {
            const chatLabel = r.chatThreadId ? (r.chatSuspended ? statusBadge("suspended") : statusBadge("active")) : statusBadge("none");
            const chatActions = r.chatThreadId
                ? `${Number(r.chatSuspended) === 1 ? `<button class="btn ghost sm" data-res-chat-resume="${r.id}">Reactiver chat</button>` : `<button class="btn ghost sm" data-res-chat-suspend="${r.id}">Suspendre chat</button>`}<button class="btn ghost sm" data-res-chat-delete="${r.id}">Supprimer chat</button>`
                : "";
            const agreementBtn = String(r.status || "") === "agreed" ? `<button class="btn ghost sm" data-res-agreement-suspend="${r.id}">Suspendre accord</button>` : "";
            return `<tr>
<td>#${escapeHtml(r.id)}</td>
<td>${escapeHtml(r.requesterName)}</td>
<td>${escapeHtml(r.offerOwnerName)}</td>
<td>${escapeHtml(r.destination)}</td>
<td>${statusBadge(r.status)}</td>
<td>${chatLabel}</td>
<td><div class="admin-actions">
<button class="btn primary sm" data-res-force-status="${r.id}">Forcer statut</button>
${chatActions}
${agreementBtn}
</div></td>
</tr>`;
        }).join("\n");
    }

    function renderConversations(rows) {
        if (!els.conversationsBody) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            els.conversationsBody.innerHTML = '<tr><td colspan="7">Aucune conversation.</td></tr>';
            return;
        }
        els.conversationsBody.innerHTML = items.map((c) => {
            const suspendAction = Number(c.isSuspended) === 1
                ? `<button class="btn ghost sm" data-thread-resume="${escapeHtml(c.id)}">Reactiver</button>`
                : `<button class="btn ghost sm" data-thread-suspend="${escapeHtml(c.id)}">Suspendre</button>`;
            return `<tr>
<td>${escapeHtml(c.id)}</td>
<td>#${escapeHtml(c.reservationId)}</td>
<td>${escapeHtml(c.requesterName)} / ${escapeHtml(c.offerOwnerName)}</td>
<td>${statusBadge(Number(c.isSuspended) === 1 ? "suspended" : "active")}</td>
<td>${escapeHtml(c.messageCount || 0)}</td>
<td>${escapeHtml(c.preview || "")}</td>
<td><div class="admin-actions">${suspendAction}<button class="btn danger sm" data-thread-delete="${escapeHtml(c.id)}">Supprimer</button></div></td>
</tr>`;
        }).join("\n");
    }

    function renderBlocks(rows, rate) {
        if (els.loginRateNote) {
            const keys = Number(rate?.keys || 0);
            els.loginRateNote.textContent = `Rate limiter actif: ${keys} cle(s) suivies.`;
        }
        if (!els.blocksBody) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            els.blocksBody.innerHTML = '<tr><td colspan="6">Aucun blocage actif.</td></tr>';
            return;
        }
        els.blocksBody.innerHTML = items.map((b) => `<tr>
<td>#${escapeHtml(b.id)}</td>
<td>${escapeHtml(b.blockType)}</td>
<td>${escapeHtml(b.value)}</td>
<td>${escapeHtml(b.reason)}</td>
<td>${escapeHtml(fmtDateTime(b.expiresAt))}</td>
<td><button class="btn ghost sm" data-block-delete="${escapeHtml(b.id)}">Debloquer</button></td>
</tr>`).join("\n");
    }

    function renderFlags(rows) {
        if (!els.flagsBody) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            els.flagsBody.innerHTML = '<tr><td colspan="6">Aucun flag.</td></tr>';
            return;
        }
        els.flagsBody.innerHTML = items.map((f) => {
            const action = String(f.status) === "open" ? `<button class="btn ghost sm" data-flag-resolve="${escapeHtml(f.id)}">Resoudre</button>` : "-";
            return `<tr>
<td>#${escapeHtml(f.id)}</td>
<td>${escapeHtml(f.entityType)}:${escapeHtml(f.entityId)}</td>
<td>${escapeHtml(f.reason)}</td>
<td>${statusBadge(f.status)}</td>
<td>${escapeHtml(fmtDateTime(f.createdAt))}</td>
<td>${action}</td>
</tr>`;
        }).join("\n");
    }

    function renderAudit(rows) {
        if (!els.auditBody) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            els.auditBody.innerHTML = '<tr><td colspan="5">Aucune action admin.</td></tr>';
            return;
        }
        els.auditBody.innerHTML = items.map((item) => `<tr>
<td>${escapeHtml(fmtDateTime(item.createdAt))}</td>
<td>${escapeHtml(item.adminName || "-")} (${escapeHtml(item.adminEmail || "-")})</td>
<td>${escapeHtml(item.actionType || "-")}</td>
<td>${escapeHtml(item.entityType || "-")}:${escapeHtml(item.entityId || "-")}</td>
<td>${escapeHtml(parseJsonText(item.details))}</td>
</tr>`).join("\n");
    }

    let revenueChart = null;
    function renderFinancials(data) {
        if (!data) return;
        if (els.totalCommission) els.totalCommission.textContent = `${data.monthly?.reduce((a, b) => a + (b.commission || 0), 0) || 0} ¥`;
        if (els.totalVolume) els.totalVolume.textContent = `${data.monthly?.reduce((a, b) => a + (b.volume || 0), 0) || 0} ¥`;

        if (els.transactionsList) {
            const txs = Array.isArray(data.recent) ? data.recent : [];
            if (!txs.length) {
                els.transactionsList.innerHTML = '<tr><td colspan="4">Aucune transaction.</td></tr>';
            } else {
                els.transactionsList.innerHTML = txs.map(t => `
                    <tr style="border-bottom: 1px solid var(--line);">
                        <td style="padding: 10px;">${fmtDate(t.created_at)}</td>
                        <td style="padding: 10px;">${statusBadge(t.type === 'commission' ? 'commission' : 'P2P')}</td>
                        <td style="padding: 10px;">${escapeHtml(t.requesterName || 'Inconnu')}</td>
                        <td style="padding: 10px; font-weight: bold;">${t.amount} ¥</td>
                    </tr>
                `).join("");
            }
        }

        const canvas = document.getElementById("admin-revenue-chart");
        if (canvas && data.monthly && typeof Chart !== 'undefined') {
            const sorted = [...data.monthly].reverse();
            const labels = sorted.map(m => m.month);
            const commissions = sorted.map(m => m.commission);
            const volumes = sorted.map(m => m.volume);

            if (revenueChart) revenueChart.destroy();
            revenueChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Commissions (¥)',
                            data: commissions,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Volume P2P (¥)',
                            data: volumes,
                            borderColor: '#3b82f6',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#94a3b8' } }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }
    }

    async function loadAll() {
        if (!state.user || String(state.user.role || "").toLowerCase() !== "admin") {
            setGuardMode(true);
            return;
        }
        if (state.loading) return;
        state.loading = true;

        try {
            setGuardMode(false);
            const days = Math.max(7, Math.min(60, Number(els.daysInput?.value || 14)));
            const usersParams = new URLSearchParams({ q: state.usersQuery, page: "1", pageSize: "120" });
            const offersData = state.offersPendingOnly
                ? await api("/api/admin/offers/pending-verification")
                : await api(`/api/admin/offers?${new URLSearchParams({ q: state.offersQuery, page: "1", pageSize: "160" }).toString()}`);

            const [overview, analytics, users, reservations, conversations, blocks, rate, flags, audit, platformQrData, financeData, aiLogs] = await Promise.all([
                api("/api/admin/overview"),
                api(`/api/admin/analytics/daily?days=${encodeURIComponent(days)}`),
                api(`/api/admin/users?${usersParams.toString()}`),
                api("/api/admin/reservations"),
                api("/api/admin/conversations"),
                api("/api/admin/security/blocks"),
                api("/api/admin/security/login-rate"),
                api("/api/admin/flags"),
                api("/api/admin/audit-log?limit=160"),
                api("/api/settings/platform-qr"),
                api("/api/admin/financials/stats"),
                api("/api/admin/ai-moderation/logs")
            ]);

            renderOverview(overview || {});
            renderAnalytics(analytics || {});
            renderUsers(users || { items: [] });
            renderOffers(offersData || { items: [] });
            renderReservations(Array.isArray(reservations) ? reservations : []);
            renderConversations(Array.isArray(conversations) ? conversations : []);
            renderBlocks(Array.isArray(blocks) ? blocks : [], rate || {});
            renderFlags(Array.isArray(flags) ? flags : []);
            renderAudit(Array.isArray(audit) ? audit : []);
            renderFinancials(financeData);
            renderAiLogs(aiLogs || []);

            if (platformQrData?.qrCode && els.platformQrPreview) {
                els.platformQrPreview.innerHTML = `<img src="${platformQrData.qrCode}" alt="QR Code ColisConnect">`;
            }
        } catch (error) {
            if (error?.status === 401 || error?.status === 403) setGuardMode(true);
            showToast(error.message || "Erreur chargement admin.");
        } finally {
            state.loading = false;
        }
    }

    async function refreshAfterAction(action, successMessage) {
        try {
            await action();
            if (successMessage) showToast(successMessage);
            await loadAll();
        } catch (error) {
            showToast(error.message || "Action impossible.");
        }
    }

    function renderAiLogs(logs) {
        if (!els.aiLogsBody) return;
        const items = Array.isArray(logs) ? logs : [];
        if (items.length === 0) {
            els.aiLogsBody.innerHTML = '<tr><td colspan="6">Aucune alerte IA récente.</td></tr>';
            els.aiBadge?.classList.add("hidden");
            return;
        }

        const highRiskCount = items.filter(l => String(l.risk_level || "").toLowerCase() === 'high' && !l.is_dismissed).length;
        if (els.aiBadge) {
            els.aiBadge.textContent = highRiskCount;
            els.aiBadge.classList.toggle("hidden", highRiskCount === 0);
        }

        els.aiLogsBody.innerHTML = items.map(log => {
            const riskLevel = String(log.risk_level || "medium").toLowerCase();
            const riskClass = riskLevel === 'high' ? 'danger' : (riskLevel === 'medium' ? 'warn' : 'ok');
            let flags = [];
            try {
                flags = Array.isArray(log.flags) ? log.flags : JSON.parse(log.flags || "[]");
            } catch {
                flags = [];
            }
            const threadLabel = log.thread_id ? `#${String(log.thread_id).slice(0, 8)}` : "-";
            const chatHref = log.reservation_id ? `chat.html?reservationId=${encodeURIComponent(log.reservation_id)}` : "chat.html";

            return `
                <tr style="${log.is_dismissed ? 'opacity: 0.6;' : ''}">
                    <td>${fmtDate(log.created_at)}</td>
                    <td>
                        <a href="${chatHref}" class="btn ghost sm">${escapeHtml(threadLabel)}</a>
                    </td>
                    <td><span class="status-badge ${riskClass}">${escapeHtml(riskLevel.toUpperCase())}</span></td>
                    <td style="max-width: 300px; white-space: normal;">${escapeHtml(log.summary || "Alerte anti-contact")}</td>
                    <td>${flags.map(f => `<span class="user-chip" style="font-size:0.65rem; margin-right:4px;">${escapeHtml(f)}</span>`).join("")}</td>
                    <td>
                        <button class="btn ${log.is_dismissed ? 'ghost' : 'secondary'} sm" onclick='window.adminDismissAiLog(${JSON.stringify(String(log.id || ""))}, ${!log.is_dismissed})'>
                            ${log.is_dismissed ? 'Restaurer' : 'Ignorer'}
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    window.adminDismissAiLog = async (id, dismissed) => {
        try {
            await api(`/api/admin/ai-moderation/logs/${id}`, {
                method: "PATCH",
                body: { is_dismissed: dismissed }
            });
            await loadAll();
        } catch (e) {
            showToast(e.message || "Erreur action IA.");
        }
    };

    const aiHistory = [];

    async function sendAiMessage() {
        const text = String(els.aiChatInput?.value || "").trim();
        if (!text || state.loadingAi) return;

        state.loadingAi = true;

        // Add user message to UI
        appendAiMessage("user", text);
        els.aiChatInput.value = "";

        // Add placeholder bubble for bot
        const loadingId = "bot-loading-" + Date.now();
        const loadingDiv = document.createElement("div");
        loadingDiv.id = loadingId;
        loadingDiv.className = "ai-chat-loading";
        loadingDiv.innerHTML = '<div class="dot-flashing"></div> Analyse en cours...';
        els.aiChatHistory.appendChild(loadingDiv);
        els.aiChatHistory.scrollTop = els.aiChatHistory.scrollHeight;

        try {
            const res = await api("/api/admin/bot/chat", {
                method: "POST",
                body: { message: text, history: aiHistory }
            });

            loadingDiv.remove();

            if (res.response) {
                appendAiMessage("bot", res.response);
                aiHistory.push({ role: "user", content: text });
                aiHistory.push({ role: "assistant", content: res.response });
                if (aiHistory.length > 20) aiHistory.shift();
            } else {
                appendAiMessage("bot", "Désolé, je ne peux pas répondre pour le moment.");
            }
        } catch (err) {
            loadingDiv.remove();
            appendAiMessage("bot", "Erreur réseau : " + err.message);
        } finally {
            state.loadingAi = false;
        }
    }

    function appendAiMessage(role, text) {
        if (!els.aiChatHistory) return;
        const msgDiv = document.createElement("div");
        msgDiv.className = `ai-message ${role}`;
        msgDiv.innerHTML = `<div class="msg-bubble">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
        els.aiChatHistory.appendChild(msgDiv);
        els.aiChatHistory.scrollTop = els.aiChatHistory.scrollHeight;
    }

    function bindEvents() {
        els.loginBtn?.addEventListener("click", () => {
            localStorage.setItem("cc_next", "admin.html");
            window.location.href = "auth.html";
        });

        els.logoutBtn?.addEventListener("click", async () => {
            try {
                if (state.token) await api("/api/auth/logout", { method: "POST" });
            } catch {
                // Continue local cleanup.
            }
            clearSession();
            setGuardMode(true);
            window.location.href = "index.html";
        });

        els.refreshBtn?.addEventListener("click", () => loadAll().catch((e) => showToast(e.message || "Erreur.")));
        els.reloadAnalyticsBtn?.addEventListener("click", () => loadAll().catch((e) => showToast(e.message || "Erreur analytics.")));
        els.refreshFinanceBtn?.addEventListener("click", () => loadAll().catch((e) => showToast(e.message || "Erreur finances.")));
        els.aiRefreshBtn?.addEventListener("click", () => loadAll().catch((e) => showToast(e.message || "Erreur IA.")));

        els.aiChatSendBtn?.addEventListener("click", sendAiMessage);
        els.aiChatInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendAiMessage();
        });

        let usersSearchTimeout;
        els.usersQ?.addEventListener("input", () => {
            clearTimeout(usersSearchTimeout);
            usersSearchTimeout = setTimeout(() => {
                state.usersQuery = String(els.usersQ?.value || "").trim();
                loadAll().catch((e) => showToast(e.message || "Erreur recherche users."));
            }, 300);
        });

        els.usersSearchBtn?.addEventListener("click", () => {
            state.usersQuery = String(els.usersQ?.value || "").trim();
            loadAll().catch((e) => showToast(e.message || "Erreur recherche users."));
        });

        els.offersSearchBtn?.addEventListener("click", () => {
            state.offersPendingOnly = false;
            state.offersQuery = String(els.offersQ?.value || "").trim();
            loadAll().catch((e) => showToast(e.message || "Erreur recherche offres."));
        });

        els.offersPendingBtn?.addEventListener("click", () => {
            state.offersPendingOnly = !state.offersPendingOnly;
            if (els.offersPendingBtn) els.offersPendingBtn.textContent = state.offersPendingOnly ? "Voir toutes" : "Verifier en attente";
            loadAll().catch((e) => showToast(e.message || "Erreur offres pending."));
        });

        els.blockCreateBtn?.addEventListener("click", () => {
            const blockType = String(els.blockType?.value || "email");
            const value = String(els.blockValue?.value || "").trim();
            const reason = String(els.blockReason?.value || "").trim();
            const durationHours = Number(els.blockDuration?.value || 24);
            if (!value || !reason) {
                showToast("Valeur et motif requis.");
                return;
            }
            refreshAfterAction(() => api("/api/admin/security/blocks", { method: "POST", body: { blockType, value, reason, durationHours } }), "Blocage enregistre.")
                .then(() => {
                    if (els.blockValue) els.blockValue.value = "";
                    if (els.blockReason) els.blockReason.value = "";
                });
        });

        els.flagCreateBtn?.addEventListener("click", () => {
            const entityType = String(els.flagEntityType?.value || "").trim();
            const entityId = Number(els.flagEntityId?.value || 0);
            const reason = String(els.flagReason?.value || "").trim();
            if (!entityType || !entityId || !reason) {
                showToast("entityType, entityId et reason sont requis.");
                return;
            }
            refreshAfterAction(() => api("/api/admin/flags", { method: "POST", body: { entityType, entityId, reason } }), "Flag cree.")
                .then(() => {
                    if (els.flagReason) els.flagReason.value = "";
                });
        });

        els.usersBody?.addEventListener("click", (event) => {
            const target = event.target;


            const verify = target.closest("[data-user-verify]");
            if (verify) {
                const id = verify.getAttribute("data-user-verify");
                const isVerified = Number(verify.getAttribute("data-target-verified")) === 1;
                const ask = isVerified
                    ? "Approuver cet utilisateur ?"
                    : "Desapprouver cet utilisateur ?";
                if (!window.confirm(ask)) return;
                refreshAfterAction(() => api(`/api/admin/users/${id}/verify`, { method: "PATCH", body: { isVerified } }), isVerified ? "Utilisateur approuve." : "Utilisateur desapprouve.");
                return;
            }

            const toggle = target.closest("[data-user-toggle]");
            if (toggle) {
                const id = toggle.getAttribute("data-user-toggle");
                const isActive = Number(toggle.getAttribute("data-target-active"));
                refreshAfterAction(() => api(`/api/admin/users/${id}/status`, { method: "PATCH", body: { isActive } }), "Statut utilisateur mis a jour.");
                return;
            }

            const role = target.closest("[data-user-role]");
            if (role) {
                const id = role.getAttribute("data-user-role");
                const nextRole = String(role.getAttribute("data-target-role") || "user");
                refreshAfterAction(() => api(`/api/admin/users/${id}/role`, { method: "PATCH", body: { role: nextRole } }), "Role utilisateur mis a jour.");
                return;
            }

            const logout = target.closest("[data-user-logout]");
            if (logout) {
                const id = logout.getAttribute("data-user-logout");
                refreshAfterAction(() => api(`/api/admin/users/${id}/sessions`, { method: "DELETE" }), "Sessions utilisateur supprimees.");
                return;
            }

            const remove = target.closest("[data-user-delete]");
            if (remove) {
                const id = remove.getAttribute("data-user-delete");
                if (!window.confirm("Supprimer cet utilisateur ?")) return;
                refreshAfterAction(() => api(`/api/admin/users/${id}`, { method: "DELETE" }), "Utilisateur supprime.");
            }
        });

        els.usersBody?.addEventListener("change", async (event) => {
            const select = event.target.closest(".admin-profile-type-select");
            if (!select) return;
            const userId = select.getAttribute("data-user-id");
            const newProfileType = select.value || null;
            try {
                await api(`/api/admin/users/${userId}/profile-type`, { method: "PATCH", body: { profileType: newProfileType } });
                showToast(`Type de profil mis à jour : ${newProfileType || "Aucun"}`);
            } catch (err) {
                showToast(err.message || "Erreur mise à jour du type de profil.");
            }
        });

        els.offersBody?.addEventListener("click", (event) => {
            const target = event.target;


            const verify = target.closest("[data-offer-verify]");
            if (verify) {
                const id = Number(verify.getAttribute("data-offer-verify"));
                refreshAfterAction(() => api(`/api/admin/offers/${id}/verify`, { method: "PATCH" }), "Offre verifiee.");
                return;
            }

            const status = target.closest("[data-offer-status]");
            if (status) {
                const id = Number(status.getAttribute("data-offer-status"));
                const targetStatus = String(status.getAttribute("data-target-status") || "active");
                refreshAfterAction(() => api(`/api/admin/offers/${id}/status`, { method: "PATCH", body: { status: targetStatus } }), "Statut offre mis a jour.");
                return;
            }

            const remove = target.closest("[data-offer-delete]");
            if (remove) {
                const id = Number(remove.getAttribute("data-offer-delete"));
                if (!window.confirm("Supprimer cette offre ?")) return;
                refreshAfterAction(() => api(`/api/admin/offers/${id}`, { method: "DELETE" }), "Offre supprimee.");
            }
        });

        els.reservationsBody?.addEventListener("click", (event) => {
            const target = event.target;


            const forceStatus = target.closest("[data-res-force-status]");
            if (forceStatus) {
                const id = Number(forceStatus.getAttribute("data-res-force-status"));
                const targetStatus = String(window.prompt("Nouveau statut (pending|accepted|refused|canceled|in_transit|delivered|agreed):", "pending") || "").trim();
                if (!targetStatus) return;
                const reason = String(window.prompt("Motif admin:", "Mise a jour admin") || "").trim() || "Mise a jour admin";
                refreshAfterAction(() => api(`/api/admin/reservations/${id}/status`, { method: "PATCH", body: { status: targetStatus, reason } }), "Reservation mise a jour.");
                return;
            }

            const chatSuspend = target.closest("[data-res-chat-suspend]");
            if (chatSuspend) {
                const id = Number(chatSuspend.getAttribute("data-res-chat-suspend"));
                const reason = String(window.prompt("Raison suspension chat:", "verification admin en cours") || "").trim() || "verification admin en cours";
                refreshAfterAction(() => api(`/api/admin/reservations/${id}/chat/suspend`, { method: "PATCH", body: { reason } }), "Chat suspendu.");
                return;
            }

            const chatResume = target.closest("[data-res-chat-resume]");
            if (chatResume) {
                const id = Number(chatResume.getAttribute("data-res-chat-resume"));
                refreshAfterAction(() => api(`/api/admin/reservations/${id}/chat/resume`, { method: "PATCH" }), "Chat reactive.");
                return;
            }

            const chatDelete = target.closest("[data-res-chat-delete]");
            if (chatDelete) {
                const id = Number(chatDelete.getAttribute("data-res-chat-delete"));
                if (!window.confirm("Supprimer le chat de cette reservation ?")) return;
                refreshAfterAction(() => api(`/api/admin/reservations/${id}/chat`, { method: "DELETE" }), "Chat supprime.");
                return;
            }

            const agreement = target.closest("[data-res-agreement-suspend]");
            if (agreement) {
                const id = Number(agreement.getAttribute("data-res-agreement-suspend"));
                refreshAfterAction(() => api(`/api/admin/reservations/${id}/agreement/suspend`, { method: "PATCH" }), "Accord suspendu.");
            }
        });

        els.conversationsBody?.addEventListener("click", (event) => {
            const target = event.target;


            const suspend = target.closest("[data-thread-suspend]");
            if (suspend) {
                const id = String(suspend.getAttribute("data-thread-suspend") || "");
                const reason = String(window.prompt("Raison suspension:", "verification admin en cours") || "").trim() || "verification admin en cours";
                refreshAfterAction(() => api(`/api/admin/conversations/${encodeURIComponent(id)}/suspend`, { method: "PATCH", body: { reason } }), "Conversation suspendue.");
                return;
            }

            const resume = target.closest("[data-thread-resume]");
            if (resume) {
                const id = String(resume.getAttribute("data-thread-resume") || "");
                refreshAfterAction(() => api(`/api/admin/conversations/${encodeURIComponent(id)}/resume`, { method: "PATCH" }), "Conversation reactivee.");
                return;
            }

            const remove = target.closest("[data-thread-delete]");
            if (remove) {
                const id = String(remove.getAttribute("data-thread-delete") || "");
                if (!window.confirm("Supprimer cette conversation ?")) return;
                refreshAfterAction(() => api(`/api/admin/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }), "Conversation supprimee.");
            }
        });

        els.blocksBody?.addEventListener("click", (event) => {
            const target = event.target;

            const remove = target.closest("[data-block-delete]");
            if (!remove) return;
            const id = Number(remove.getAttribute("data-block-delete"));
            refreshAfterAction(() => api(`/api/admin/security/blocks/${id}`, { method: "DELETE" }), "Blocage retire.");
        });

        els.flagsBody?.addEventListener("click", (event) => {
            const target = event.target;

            const resolve = target.closest("[data-flag-resolve]");
            if (!resolve) return;
            const id = Number(resolve.getAttribute("data-flag-resolve"));
            refreshAfterAction(() => api(`/api/admin/flags/${id}/resolve`, { method: "PATCH" }), "Flag resolu.");
        });

        els.platformQrInput?.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                if (els.platformQrPreview) {
                    els.platformQrPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                }
                if (els.platformQrSaveBtn) els.platformQrSaveBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });

        els.platformQrSaveBtn?.addEventListener("click", async () => {
            const img = els.platformQrPreview?.querySelector("img");
            if (!img || !img.src.startsWith("data:image/")) {
                showToast("Veuillez choisir une image valide.");
                return;
            }
            try {
                els.platformQrSaveBtn.disabled = true;
                await api("/api/admin/settings/platform-qr", { method: "POST", body: { qrCode: img.src } });
                showToast("QR code plateforme mis à jour.");
            } catch (error) {
                showToast(error.message || "Erreur mise à jour QR code.");
                els.platformQrSaveBtn.disabled = false;
            }
        });

        // Mobile Drawer Logic
        const menuToggle = document.getElementById("admin-menu-toggle");
        const sidebar = document.querySelector(".admin-sidebar");

        // Create overlay if not present
        let overlay = document.querySelector(".admin-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "admin-overlay";
            document.body.appendChild(overlay);
        }

        const closeDrawer = () => {
            sidebar?.classList.remove("sidebar-open");
            overlay?.classList.remove("active");
        };

        menuToggle?.addEventListener("click", () => {
            sidebar?.classList.toggle("sidebar-open");
            overlay?.classList.toggle("active");
        });

        overlay?.addEventListener("click", closeDrawer);

        // Sidebar Links
        document.querySelectorAll(".side-link").forEach(link => {
            link.addEventListener("click", () => {
                const section = link.dataset.section;
                if (section) updateSection(section);
                closeDrawer(); // Close drawer on link click for mobile
            });
        });
    }

    async function bootstrap() {
        bindEvents();
        await restoreSession();
        const isAdmin = Boolean(state.user && String(state.user.role || "").toLowerCase() === "admin");
        if (!isAdmin) {
            setGuardMode(true);
            return;
        }
        await loadAll();
    }

    bootstrap().catch((error) => {
        showToast(error.message || "Initialisation admin impossible.");
    });
})();
