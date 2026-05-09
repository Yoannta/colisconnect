(() => {
    const state = {
        token: localStorage.getItem("cc_token") || "",
        user: null
    };

    const els = {
        userChip: document.getElementById("approvals-user-chip"),
        loginBtn: document.getElementById("approvals-login-btn"),
        logoutBtn: document.getElementById("approvals-logout-btn"),
        refreshBtn: document.getElementById("approvals-refresh-btn"),
        count: document.getElementById("approvals-count"),
        guard: document.getElementById("approvals-guard"),
        guardLoginBtn: document.getElementById("approvals-guard-login-btn"),
        content: document.getElementById("approvals-content"),
        body: document.getElementById("approvals-body"),
        toast: document.getElementById("approvals-toast")
    };

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function fmtDateTime(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }

    function statusPill(label, ok = false) {
        return `<span class="status-badge ${ok ? "ok" : "warn"}">${escapeHtml(label)}</span>`;
    }

    function showToast(message) {
        if (!els.toast) return;
        els.toast.textContent = message;
        els.toast.classList.remove("hidden");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
    }

    function setGuardMode(enabled) {
        els.guard?.classList.toggle("hidden", !enabled);
        els.content?.classList.toggle("hidden", enabled);
    }

    function buildApiCandidates(path) {
        const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${path}`;
        const candidates = [];
        const fallbackBase = localStorage.getItem("cc_api_base") || "http://127.0.0.1:8080";

        if (window.location.protocol !== "file:") candidates.push(normalizedPath);

        const origins = [fallbackBase, "http://127.0.0.1:8080", "http://localhost:8080", "http://127.0.0.1:8090", "http://localhost:8090"];
        for (const origin of origins) {
            if (!origin) continue;
            const url = `${origin.replace(/\/$/, "")}${normalizedPath}`;
            if (!candidates.includes(url)) candidates.push(url);
        }
        return candidates;
    }

    async function api(path, options = {}) {
        const method = options.method || "GET";
        const headers = {};
        const config = { method, headers };
        if (options.auth !== false && state.token) headers.Authorization = `Bearer ${state.token}`;
        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            config.body = JSON.stringify(options.body);
        }

        const candidates = buildApiCandidates(path);
        for (const url of candidates) {
            let response;
            try {
                response = await fetch(url, config);
            } catch {
                continue;
            }
            const raw = await response.text();
            let data = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = { error: raw || `HTTP ${response.status}` };
            }
            if (!response.ok) {
                const err = new Error(data?.error || data?.message || `HTTP ${response.status}`);
                err.status = response.status;
                throw err;
            }
            return data;
        }
        throw new Error("Impossible de joindre le backend.");
    }

    function setSession(token, user) {
        state.token = token || "";
        state.user = user || null;
        if (state.token) localStorage.setItem("cc_token", state.token);
        else localStorage.removeItem("cc_token");
    }

    function updateAuthUi() {
        const authed = Boolean(state.user && state.token);
        if (els.userChip) {
            els.userChip.classList.toggle("hidden", !authed);
            els.userChip.textContent = authed ? `${state.user.fullName || state.user.email} (${state.user.role})` : "";
        }
        els.loginBtn?.classList.toggle("hidden", authed);
        els.logoutBtn?.classList.toggle("hidden", !authed);
    }

    function formatMissingFields(fields) {
        const rows = Array.isArray(fields) ? fields : [];
        const labels = [];
        if (rows.includes("phoneNumber")) labels.push("tel");
        if (rows.includes("identityDocument")) labels.push("piece");
        if (rows.includes("profilePhoto")) labels.push("photo");
        return labels.join(", ");
    }

    function renderSectionActions(item, section) {
        const isIdentity = section === "identityDocument";
        const hasDoc = isIdentity ? Boolean(item.hasIdentityDocument) : Boolean(item.hasProfilePhoto);
        const isApproved = isIdentity ? Boolean(item.identityDocumentApproved) : Boolean(item.profilePhotoApproved);

        if (!hasDoc) {
            return `<span class="admin-note">Aucune piece</span>`;
        }

        return `<div class="admin-actions">
<button class="btn ghost sm" data-preview-id="${escapeHtml(item.id)}" data-preview-type="${isIdentity ? "identity" : "photo"}">Voir</button>
<button class="btn primary sm" data-review-id="${escapeHtml(item.id)}" data-section="${isIdentity ? "identityDocument" : "profilePhoto"}" data-decision="approve" ${isApproved ? "disabled" : ""}>Approuver</button>
<button class="btn danger sm" data-review-id="${escapeHtml(item.id)}" data-section="${isIdentity ? "identityDocument" : "profilePhoto"}" data-decision="reject">Annuler</button>
</div>
${isApproved ? statusPill("Approuve", true) : statusPill("En attente", false)}`;
    }

    function renderRows(resp) {
        const items = Array.isArray(resp?.items) ? resp.items : [];
        if (els.count) els.count.textContent = String(items.length);
        if (!els.body) return;
        if (!items.length) {
            els.body.innerHTML = '<tr><td colspan="8">Aucune approbation en attente.</td></tr>';
            return;
        }

        els.body.innerHTML = items.map((item) => {
            const pct = Number(item.profileCompletionPercent || 25);
            const missing = formatMissingFields(item.profileCompletionMissing);
            const global = Number(item.isVerified) === 1 ? statusPill("Verifie", true) : statusPill("En attente", false);
            return `<tr>
<td>#${escapeHtml(item.id)}</td>
<td>${escapeHtml(item.fullName)}</td>
<td>${escapeHtml(item.email)}</td>
<td>${escapeHtml(pct)}%${missing ? `<br><span class="admin-note">manque: ${escapeHtml(missing)}</span>` : ""}</td>
<td>${renderSectionActions(item, "identityDocument")}</td>
<td>${renderSectionActions(item, "profilePhoto")}</td>
<td>${escapeHtml(fmtDateTime(item.lastSeenAt))}</td>
<td>${global}</td>
</tr>`;
        }).join("\n");
    }

    async function openDocumentPreview(userId, type) {
        const payload = await api(`/api/admin/users/${encodeURIComponent(userId)}/document?type=${encodeURIComponent(type)}`);
        const dataUrl = String(payload?.dataUrl || "").trim();
        if (!dataUrl) throw new Error("Document indisponible.");

        const popup = window.open("", "_blank", "width=980,height=760");
        if (!popup) throw new Error("Popup bloquee par le navigateur.");
        const title = type === "identity" ? "CNI / Passeport" : "Photo";
        popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;background:#050709;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:96vw;max-height:95vh;border-radius:12px;border:1px solid rgba(255,255,255,.2);}</style>
</head><body><img src="${dataUrl}" alt="${title}"></body></html>`);
        popup.document.close();
    }

    async function reviewSection(userId, section, decision) {
        let reason = "";
        if (decision === "reject") {
            reason = String(window.prompt("Motif (optionnel):", "Document non conforme") || "").trim();
        }
        await api(`/api/admin/users/${encodeURIComponent(userId)}/review-section`, {
            method: "PATCH",
            body: { section, decision, reason }
        });
    }

    async function loadPendingApprovals() {
        if (!state.user || String(state.user.role || "").toLowerCase() !== "admin") {
            setGuardMode(true);
            return;
        }
        setGuardMode(false);
        const rows = await api("/api/admin/users/pending-approvals");
        renderRows(rows || { items: [] });
    }

    async function restoreSession() {
        if (!state.token) {
            state.user = null;
            updateAuthUi();
            setGuardMode(true);
            return;
        }
        try {
            const me = await api("/api/auth/me");
            setSession(state.token, me.user);
        } catch {
            setSession("", null);
        }
        updateAuthUi();
    }

    function bindEvents() {
        els.loginBtn?.addEventListener("click", () => {
            localStorage.setItem("cc_next", "approvals.html");
            window.location.href = "auth.html";
        });

        els.guardLoginBtn?.addEventListener("click", () => {
            localStorage.setItem("cc_next", "approvals.html");
            window.location.href = "auth.html";
        });

        els.logoutBtn?.addEventListener("click", async () => {
            try {
                await api("/api/auth/logout", { method: "POST" });
            } catch {
                // ignore
            }
            setSession("", null);
            updateAuthUi();
            setGuardMode(true);
            window.location.href = "index.html";
        });

        els.refreshBtn?.addEventListener("click", () => {
            loadPendingApprovals().catch((error) => showToast(error.message || "Chargement impossible."));
        });

        els.body?.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const previewBtn = target.closest("[data-preview-id]");
            if (previewBtn) {
                const id = Number(previewBtn.getAttribute("data-preview-id"));
                const type = String(previewBtn.getAttribute("data-preview-type") || "identity");
                openDocumentPreview(id, type).catch((error) => showToast(error.message || "Apercu impossible."));
                return;
            }

            const reviewBtn = target.closest("[data-review-id]");
            if (!reviewBtn) return;
            const id = Number(reviewBtn.getAttribute("data-review-id"));
            const section = String(reviewBtn.getAttribute("data-section") || "");
            const decision = String(reviewBtn.getAttribute("data-decision") || "");
            if (!id || !section || !decision) return;

            const ask = decision === "approve" ? "Valider cette section ?" : "Refuser cette section ?";
            if (!window.confirm(ask)) return;

            reviewSection(id, section, decision)
                .then(() => {
                    const label = section === "identityDocument" ? "CNI/Passeport" : "Photo";
                    showToast(decision === "approve" ? `${label} approuve.` : `${label} annule et utilisateur notifie.`);
                    return loadPendingApprovals();
                })
                .catch((error) => showToast(error.message || "Action impossible."));
        });
    }

    async function bootstrap() {
        bindEvents();
        await restoreSession();
        await loadPendingApprovals();
    }

    bootstrap().catch((error) => showToast(error.message || "Initialisation impossible."));
})();
