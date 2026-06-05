(() => {
    const PROTECTED_VIEWS = new Set(["search", "propose", "messages"]);
    const PROFILE_REQUIRED_VIEWS = new Set(["propose"]);

    const state = {
        token: localStorage.getItem("cc_auth_token") || "",
        user: null,
        pendingView: null,
        pendingDestination: "",
        pendingProfileDestination: "",
        activeView: "home",
        offers: [],
        myRequests: [],
        conversations: [],
        activeThreadId: null
    };

    const els = {
        views: Array.from(document.querySelectorAll(".view")),
        navLinks: Array.from(document.querySelectorAll(".nav-link")),
        routeButtons: Array.from(document.querySelectorAll("[data-route]")),
        userChip: document.getElementById("user-chip"),
        adminLink: document.getElementById("admin-link"),
        partnerLink: document.getElementById("nav-partner-link"),
        authOpenBtn: document.getElementById("auth-open-btn"),
        logoutBtn: document.getElementById("logout-btn"),

        authModal: document.getElementById("auth-modal"),
        authModalCard: document.querySelector("#auth-modal .modal-card"),
        closeModalBtn: document.getElementById("close-modal-btn"),
        authGatePanel: document.getElementById("auth-gate-panel"),
        authFormPanel: document.getElementById("auth-form-panel"),
        gateLoginBtn: document.getElementById("gate-login-btn"),
        gateRegisterBtn: document.getElementById("gate-register-btn"),
        gateLaterBtn: document.getElementById("gate-later-btn"),
        authBackBtn: document.getElementById("auth-back-btn"),
        loginTab: document.getElementById("login-tab"),
        registerTab: document.getElementById("register-tab"),
        loginForm: document.getElementById("login-form"),
        registerForm: document.getElementById("register-form"),
        authFeedback: document.getElementById("auth-feedback"),
        profileModal: document.getElementById("profile-modal"),
        profileCloseBtn: document.getElementById("profile-close-btn"),
        profileLaterBtn: document.getElementById("profile-later-btn"),
        profileCompleteBtn: document.getElementById("profile-complete-btn"),
        profileModalMessage: document.getElementById("profile-modal-message"),

        offerFilterForm: document.getElementById("offer-filter-form"),
        refreshOffersBtn: document.getElementById("refresh-offers-btn"),
        offersList: document.getElementById("offers-list"),
        myRequestsList: document.getElementById("my-requests-list"),

        offerForm: document.getElementById("offer-form"),
        parcelRequestForm: document.getElementById("parcel-request-form"),

        refreshConversationsBtn: document.getElementById("refresh-conversations-btn"),
        conversationsList: document.getElementById("conversations-list"),
        chatMeta: document.getElementById("chat-meta"),
        messagesList: document.getElementById("messages-list"),
        messageForm: document.getElementById("message-form"),
        messageInput: document.getElementById("message-input"),

        toast: document.getElementById("toast")
    };

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function setAuthFeedback(message = "", isError = true) {
        if (!els.authFeedback) return;
        els.authFeedback.textContent = message;
        els.authFeedback.style.color = isError ? "#ffc8b7" : "#aef6d2";
    }

    function getProfileCompletion(user = state.user) {
        const completion = user?.profileCompletion;
        if (completion && typeof completion.percent === "number") {
            return {
                percent: Number(completion.percent) || 25,
                isComplete: Boolean(completion.isComplete),
                missingFields: Array.isArray(completion.missingFields) ? completion.missingFields : []
            };
        }

        const missingFields = [];
        if (String(user?.phoneNumber || "").trim().length < 8) missingFields.push("phoneNumber");
        if (!user?.hasIdentityDocument) missingFields.push("identityDocument");
        if (!user?.hasProfilePhoto) missingFields.push("profilePhoto");
        const completedSteps = 1 + (missingFields.includes("phoneNumber") ? 0 : 1) + (missingFields.includes("identityDocument") ? 0 : 1) + (missingFields.includes("profilePhoto") ? 0 : 1);
        return {
            percent: Math.round((completedSteps / 4) * 100),
            isComplete: missingFields.length === 0,
            missingFields
        };
    }

    function isProfileComplete(user = state.user) {
        return Boolean(getProfileCompletion(user).isComplete);
    }

    function isUserVerified(user = state.user) {
        return Boolean(user && (Number(user.isVerified) === 1 || user.isVerified === true));
    }

    function routeRequiresProfileCompletion(route) {
        return PROFILE_REQUIRED_VIEWS.has(String(route || "").toLowerCase());
    }

    function toVerificationPath(target = "dashboard.html") {
        const safeTarget = String(target || "dashboard.html").trim() || "dashboard.html";
        return `verification.html?next=${encodeURIComponent(safeTarget)}`;
    }

    function formatMissingProfileFields(missingFields = []) {
        const labels = [];
        if (missingFields.includes("phoneNumber")) labels.push("numero de telephone");
        if (missingFields.includes("identityDocument")) labels.push("piece justificative");
        if (missingFields.includes("profilePhoto")) labels.push("photo de profil");
        return labels;
    }

    function showToast(message) {
        if (!els.toast) return;
        els.toast.textContent = message;
        els.toast.classList.remove("hidden");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
            els.toast.classList.add("hidden");
        }, 2800);
    }

    function buildApiCandidates(path) {
        if (/^https?:\/\//i.test(path)) return [path];

        const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${path}`;
        const candidates = [];
        const fallbackBase = localStorage.getItem("cc_api_base") || "http://127.0.0.1:8080";

        if (window.location.protocol !== "file:") {
            candidates.push(normalizedPath);
        }

        const fallbackOrigins = [fallbackBase, "http://127.0.0.1:8080", "http://localhost:8080", "http://127.0.0.1:8090", "http://localhost:8090"];
        for (const origin of fallbackOrigins) {
            if (!origin) continue;
            const url = `${origin.replace(/\/$/, "")}${normalizedPath}`;
            if (!candidates.includes(url)) candidates.push(url);
        }

        return candidates;
    }

    function shouldTryNextCandidate(response, url, path) {
        if (!url.startsWith("http")) return response.status === 404 || response.status === 405;
        return false;
    }

    async function api(path, options = {}) {
        // [SUPABASE BRIDGE UNIVERSEL]
        if (window.CCCommon && window.CCCommon.api) {
            return window.CCCommon.api(path, options);
        }

        const method = options.method || "GET";
        const headers = {};
        const config = { method, headers };

        if (options.auth !== false && state.token) {
            headers.Authorization = `Bearer ${state.token}`;
        }

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            config.body = JSON.stringify(options.body);
        }

        const candidates = buildApiCandidates(path);
        let lastError = null;

        for (const url of candidates) {
            let response;
            try {
                response = await fetch(url, config);
            } catch (fetchError) {
                lastError = fetchError;
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
                const error = new Error(data?.error || `HTTP ${response.status}`);
                error.status = response.status;
                error.payload = data;
                throw error;
            }

            return data;
        }

        throw new Error("Impossible de joindre le serveur API.");
    }

    function setSession(token, user) {
        state.token = token || "";
        state.user = user || null;
        if (state.token) {
            localStorage.setItem("cc_auth_token", state.token);
        } else {
            localStorage.removeItem("cc_auth_token");
        }
        updateAuthUi();
    }

    function clearSession() {
        setSession("", null);
        state.myRequests = [];
        state.conversations = [];
        state.activeThreadId = null;
    }

    async function restoreSession() {
        if (!state.token) {
            updateAuthUi();
            return;
        }
        try {
            const me = await api("/api/auth/me");
            setSession(state.token, me.user);
        } catch {
            clearSession();
        }
    }

    function updateAuthUi() {
        const authed = Boolean(state.user && state.token);
        const isAdmin = authed && String(state.user.role || "").toLowerCase() === "admin";

        if (authed) {
            const isPartner = authed && String(state.user.role || "").toLowerCase() === "partner";
            els.userChip?.classList.remove("hidden");
            if (els.userChip) {
                els.userChip.textContent = state.user.fullName || state.user.email || "Connecte";
            }
            els.adminLink?.classList.toggle("hidden", !isAdmin);
            els.partnerLink?.classList.toggle("hidden", !isPartner);
            els.authOpenBtn?.classList.add("hidden");
            els.logoutBtn?.classList.remove("hidden");
        } else {
            els.userChip?.classList.add("hidden");
            if (els.userChip) els.userChip.textContent = "";
            els.adminLink?.classList.add("hidden");
            els.partnerLink?.classList.add("hidden");
            els.authOpenBtn?.classList.remove("hidden");
            els.logoutBtn?.classList.add("hidden");
        }

        // Sync mobile nav partner link
        const mobilePartnerLink = document.getElementById("mobile-partner-link");
        if (mobilePartnerLink) {
            const isPartner = authed && String(state.user.role || "").toLowerCase() === "partner";
            mobilePartnerLink.classList.toggle("hidden", !isPartner);
        }
    }

    function switchView(viewId) {
        console.log("Switching view to:", viewId);

        // Premium transition effect
        const currentActive = document.querySelector('.view.is-active');
        if (currentActive) {
            currentActive.style.opacity = '0';
            currentActive.style.transform = 'translateY(10px) scale(0.98)';
            setTimeout(() => {
                currentActive.classList.remove('is-active');
                activateNewView(viewId);
            }, 200);
        } else {
            activateNewView(viewId);
        }
    }

    function activateNewView(viewId) {
        const nextView = document.getElementById(`${viewId}-view`);
        if (!nextView) return;
        state.activeView = viewId;

        nextView.classList.add('is-active');
        nextView.style.opacity = '0';
        nextView.style.transform = 'translateY(10px) scale(0.98)';

        // Force reflow
        nextView.offsetHeight;

        nextView.style.transition = 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        nextView.style.opacity = '1';
        nextView.style.transform = 'translateY(0) scale(1)';

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('is-active', link.dataset.route === viewId);
        });

        // Specific view callbacks
        if (viewId === 'search') loadOffers();
        if (viewId === 'messages') loadConversations();
    }

    function setHash(view) {
        const next = `#${view}`;
        if (window.location.hash !== next) {
            window.history.replaceState({}, "", next);
        }
    }

    function routeDestination(route) {
        if (route === "search") return "results.html";
        if (route === "propose") return "post_trip.html";
        if (route === "messages") return "chat.html";
        return "";
    }

    function currentRouteFromHash() {
        const value = window.location.hash.replace("#", "").trim();
        if (!value) return "home";
        const known = new Set(["home", "search", "propose", "messages"]);
        return known.has(value) ? value : "home";
    }

    async function navigate(view, options = {}) {
        const target = view || "home";
        const skipGuard = Boolean(options.skipGuard);
        const destination = routeDestination(target);

        if (destination) {
            if (!state.user && !skipGuard) {
                state.pendingView = target;
                state.pendingDestination = destination;
                openAuthGate();
                return;
            }
            if (state.user && routeRequiresProfileCompletion(target) && !isUserVerified() && !skipGuard) {
                state.pendingProfileDestination = destination;
                openProfileCompletionModal(destination);
                return;
            }
            window.location.href = destination;
            return;
        }

        if (PROTECTED_VIEWS.has(target) && !state.user && !skipGuard) {
            state.pendingView = target;
            openAuthGate();
            switchView("home");
            setHash("home");
            return;
        }

        switchView(target);
        setHash(target);

        if (target === "search") {
            await loadSearchData();
        }

        if (target === "messages") {
            await loadConversations();
        }
    }

    function openAuthModal() {
        els.authModal?.classList.remove("hidden");
    }

    function closeAuthModal() {
        els.authModal?.classList.add("hidden");
        setAuthFeedback("");
    }

    function dismissAuthModal() {
        state.pendingView = null;
        state.pendingDestination = "";
        closeAuthModal();
    }

    function closeProfileModal() {
        els.profileModal?.classList.add("hidden");
    }

    function dismissProfileModal() {
        state.pendingProfileDestination = "";
        closeProfileModal();
    }

    function openProfileCompletionModal(target = "") {
        state.pendingProfileDestination = target || state.pendingProfileDestination || "dashboard.html";
        const completion = getProfileCompletion();
        const missing = formatMissingProfileFields(completion.missingFields);
        if (els.profileModalMessage) {
            if (isUserVerified()) {
                els.profileModalMessage.textContent = "Votre compte est deja verifie.";
            } else if (completion.percent >= 75) {
                els.profileModalMessage.textContent = "Votre dossier est en attente d'approbation admin. Vous pouvez aussi mettre a jour vos pieces.";
            } else {
                els.profileModalMessage.textContent = `Profil a ${completion.percent}%. Ajoutez: ${missing.join(", ")}.`;
            }
        }
        if (els.profileCompleteBtn) {
            els.profileCompleteBtn.textContent = completion.percent >= 75 ? "Mettre a jour mes infos" : "Completer maintenant";
        }
        els.profileModal?.classList.remove("hidden");
    }

    function setAuthModalExpanded(expanded) {
        els.authModalCard?.classList.toggle("modal-expanded", Boolean(expanded));
    }

    function openAuthGate() {
        if (!els.authGatePanel || !els.authFormPanel) return;
        els.authGatePanel.classList.remove("hidden");
        els.authFormPanel.classList.add("hidden");
        setAuthModalExpanded(false);
        setAuthFeedback("");
        openAuthModal();
    }

    function openAuthForms(mode = "login") {
        if (!els.authGatePanel || !els.authFormPanel) return;
        els.authGatePanel.classList.add("hidden");
        els.authFormPanel.classList.remove("hidden");
        switchAuthTab(mode);
        setAuthModalExpanded(true);
        setAuthFeedback("");
        openAuthModal();
    }

    function switchAuthTab(mode) {
        const loginMode = mode === "login";
        els.loginTab?.classList.toggle("is-active", loginMode);
        els.registerTab?.classList.toggle("is-active", !loginMode);
        els.loginForm?.classList.toggle("hidden", !loginMode);
        els.registerForm?.classList.toggle("hidden", loginMode);
        if (!loginMode) resetRegisterView();
    }

    function resetRegisterView() {
        document.getElementById("register-selection-panel")?.classList.remove("hidden");
        document.getElementById("register-fields-panel")?.classList.add("hidden");
        const roleBtn = document.getElementById("register-role");
        if (roleBtn) roleBtn.value = "user";
        document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("is-active"));
    }

    async function onAuthSuccess(payload) {
        setSession(payload.token, payload.user);
        closeAuthModal();
        showToast(`Bienvenue ${payload.user.fullName || "sur ColisConnect"}`);

        const pendingDestination = state.pendingDestination || "";
        const pending = state.pendingView || "home";
        state.pendingDestination = "";
        state.pendingView = null;

        if (routeRequiresProfileCompletion(pending) && !isUserVerified(payload.user)) {
            openProfileCompletionModal(pendingDestination || routeDestination(pending) || "dashboard.html");
            return;
        }

        if (pendingDestination) {
            window.location.href = pendingDestination;
            return;
        }

        await navigate(pending, { skipGuard: true });
    }

    async function submitLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        try {
            const payload = await api("/api/auth/login", {
                method: "POST",
                auth: false,
                body: {
                    email: String(formData.get("email") || "").trim(),
                    password: String(formData.get("password") || "")
                }
            });
            await onAuthSuccess(payload);
        } catch (error) {
            setAuthFeedback(error.message || "Connexion impossible.");
        }
    }

    async function submitRegister(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        try {
            const payload = await api("/api/auth/register", {
                method: "POST",
                auth: false,
                body: {
                    fullName: String(formData.get("fullName") || "").trim(),
                    email: String(formData.get("email") || "").trim(),
                    password: String(formData.get("password") || ""),
                    role: String(formData.get("userRole") || "user").trim()
                }
            });
            await onAuthSuccess(payload);
        } catch (error) {
            setAuthFeedback(error.message || "Inscription impossible.");
        }
    }

    async function logout() {
        try {
            if (state.token) {
                await api("/api/auth/logout", { method: "POST" });
            }
        } catch {
            // Continue local logout even if API fails.
        }

        clearSession();
        showToast("Session fermee.");

        if (PROTECTED_VIEWS.has(state.activeView)) {
            await navigate("home", { skipGuard: true });
        }

        renderMyRequests();
        renderConversations();
        renderMessages([]);
    }

    function queryOfferFilters() {
        const data = new FormData(els.offerFilterForm);
        const destination = String(data.get("destination") || "").trim();
        const minKg = Math.max(1, Number(data.get("minKg") || 1));
        const maxPrice = Math.max(1, Number(data.get("maxPrice") || 1000));

        return { destination, minKg, maxPrice };
    }

    async function loadOffers() {
        const filters = queryOfferFilters();
        const params = new URLSearchParams({
            pageSize: "100",
            destination: filters.destination,
            minKg: String(filters.minKg),
            maxPrice: String(filters.maxPrice)
        });

        const payload = await api(`/api/offers?${params.toString()}`, { auth: false });
        state.offers = Array.isArray(payload?.items) ? payload.items : [];
        renderOffers();
    }

    async function loadMyRequests() {
        if (!state.user) {
            state.myRequests = [];
            renderMyRequests();
            return;
        }

        const payload = await api("/api/parcel-requests?scope=mine&pageSize=100");
        const items = Array.isArray(payload?.items) ? payload.items : [];
        state.myRequests = items.filter((item) => ["open", "matched"].includes(String(item.status || "")));
        renderMyRequests();
    }

    async function loadSearchData() {
        try {
            await Promise.all([loadOffers(), loadMyRequests()]);
        } catch (error) {
            showToast(error.message || "Impossible de charger les donnees.");
        }
    }

    function renderOffers() {
        if (!els.offersList) return;

        if (!state.offers.length) {
            els.offersList.innerHTML = '<div class="empty-card">Aucune offre pour ce filtre.</div>';
            return;
        }

        els.offersList.innerHTML = state.offers
            .map((offer) => {
                const verified = offer.ownerIsVerified ? "Voyageur verifie" : "Voyageur non verifie";
                return `
<article class="offer-card">
    <div class="offer-card-head">
        <h4>${escapeHtml(offer.title || `Trajet vers ${offer.destination}`)}</h4>
        <span class="meta-pill">${escapeHtml(verified)}</span>
    </div>
    <p>Par <strong>${escapeHtml(offer.ownerName || "Voyageur")}</strong></p>
    <div class="offer-meta">
        <span class="meta-pill">${escapeHtml(offer.origin || "Depart")} -> ${escapeHtml(offer.destination || "Destination")}</span>
        <span class="meta-pill">Depart: ${escapeHtml(offer.departureDate || "-")}</span>
        <span class="meta-pill">${escapeHtml(String(offer.availableKg || 0))} kg libres</span>
        <span class="meta-pill">${escapeHtml(String(offer.pricePerKg || 0))} / kg</span>
    </div>
    <p>${escapeHtml(offer.description || "Pas de description")}</p>
    <div class="card-actions">
        <button class="btn primary" data-reserve-offer="${offer.id}" data-offer-destination="${escapeHtml(offer.destination || "")}">Contacter</button>
    </div>
</article>`;
            })
            .join("\n");
    }

    function renderMyRequests() {
        if (!els.myRequestsList) return;
        // Pour l'instant, pas de "demandes colis" côté client :
        // on ne montre plus de liste spécifique, uniquement la recherche et le contact direct.
        els.myRequestsList.innerHTML = '<div class="empty-card">Vous contactez directement les voyageurs depuis les offres.</div>';
    }

    async function startReservation(offerId) {
        if (!state.user) {
            state.pendingView = "search";
            openAuthGate();
            return;
        }
        const offer = state.offers.find((item) => Number(item.id) === Number(offerId));
        if (!offer) {
            showToast("Offre introuvable.");
            return;
        }

        try {
            // Pour l'instant, pas de système de réservation :
            // on se contente d'ouvrir la page de chat, en passant l'ID de l'offre.
            // Utilisation d'un chemin relatif pour fonctionner en mode fichier et en HTTP.
            const offerIdParam = encodeURIComponent(String(offer.id));
            window.location.href = `chat.html?offerId=${offerIdParam}`;
        } catch (error) {
            showToast(error.message || "Impossible d'ouvrir la conversation.");
        }
    }

    async function submitOffer(event) {
        event.preventDefault();

        if (!state.user) {
            state.pendingView = "propose";
            openAuthGate();
            return;
        }
        if (!isUserVerified()) {
            openProfileCompletionModal("post_trip.html");
            return;
        }

        const data = new FormData(event.currentTarget);
        const payload = {
            title: String(data.get("title") || "").trim(),
            origin: String(data.get("origin") || "").trim(),
            destination: String(data.get("destination") || "").trim(),
            departureDate: String(data.get("departureDate") || ""),
            availableKg: Number(data.get("availableKg") || 0),
            pricePerKg: Number(data.get("pricePerKg") || 0),
            description: String(data.get("description") || "").trim()
        };

        if (normalizeText(payload.origin) === normalizeText(payload.destination)) {
            showToast("Le pays de depart et d'arrivee ne peuvent pas etre identiques.");
            return;
        }

        try {
            const created = await api("/api/offers", { method: "POST", body: payload });
            event.currentTarget.reset();

            if (els.offerFilterForm && created?.destination) {
                const destinationInput = els.offerFilterForm.querySelector('input[name="destination"]');
                if (destinationInput) destinationInput.value = created.destination;
            }

            showToast("Offre publiee. Elle est visible dans la recherche.");
            await navigate("search", { skipGuard: true });
        } catch (error) {
            if (error?.code === "PROFILE_COMPLETION_REQUIRED" || error?.status === 403) {
                openProfileCompletionModal("post_trip.html");
                return;
            }
            showToast(error.message || "Publication de l'offre impossible.");
        }
    }

    async function loadConversations() {
        if (!state.user) {
            state.conversations = [];
            renderConversations();
            renderMessages([]);
            return;
        }

        try {
            const rows = await api("/api/conversations");
            state.conversations = Array.isArray(rows) ? rows : [];
            renderConversations();

            if (!state.activeThreadId && state.conversations.length) {
                state.activeThreadId = state.conversations[0].id;
            }

            if (state.activeThreadId) {
                await openThread(state.activeThreadId);
            } else {
                renderMessages([]);
                if (els.chatMeta) els.chatMeta.textContent = "Aucune conversation pour le moment.";
            }
        } catch (error) {
            showToast(error.message || "Impossible de charger les conversations.");
        }
    }

    function renderConversations() {
        if (!els.conversationsList) return;

        if (!state.user) {
            els.conversationsList.innerHTML = '<div class="empty-card">Connectez-vous pour acceder aux messages.</div>';
            return;
        }

        if (!state.conversations.length) {
            els.conversationsList.innerHTML = '<div class="empty-card">Aucune conversation ouverte.</div>';
            return;
        }

        els.conversationsList.innerHTML = state.conversations
            .map((thread) => {
                const active = thread.id === state.activeThreadId ? "is-active" : "";
                let statusLabel = "";
                if (thread.isOfferOwner && thread.status === "voyageur_paye") {
                    statusLabel = "payer colisconnect";
                }

                return `
<button class="conv-card ${active}" data-thread-id="${escapeHtml(thread.id)}">
    <strong>${escapeHtml(thread.travelerName || "Contact")}</strong>
    <p>${escapeHtml(thread.preview || "Aucun message")}</p>
    ${statusLabel ? `<p class="meta-pill">${escapeHtml(statusLabel)}</p>` : ""}
</button>`;
            })
            .join("\n");
    }

    async function openThread(threadId) {
        if (!threadId || !state.user) return;

        const selected = state.conversations.find((item) => item.id === threadId);
        state.activeThreadId = threadId;
        renderConversations();

        try {
            const messages = await api(`/api/conversations/${encodeURIComponent(threadId)}/messages`);
            renderMessages(messages);

            if (els.chatMeta) {
                if (selected) {
                    els.chatMeta.textContent = `${selected.travelerName} - offre: ${selected.offerTitle || "Trajet"}`;
                } else {
                    els.chatMeta.textContent = "Conversation chargee.";
                }
            }
        } catch (error) {
            showToast(error.message || "Impossible de charger les messages.");
        }
    }

    function renderMessages(messages) {
        if (!els.messagesList) return;
        const rows = Array.isArray(messages) ? messages : [];

        if (!rows.length) {
            els.messagesList.innerHTML = '<div class="empty-card">Pas encore de messages.</div>';
            return;
        }

        els.messagesList.innerHTML = rows
            .map((msg) => {
                const sender = String(msg.sender || "system");
                const css = sender === "user" ? "msg-user" : sender === "traveler" ? "msg-traveler" : "msg-system";
                return `<div class="msg ${css}">${escapeHtml(msg.text || "")}</div>`;
            })
            .join("\n");

        els.messagesList.scrollTop = els.messagesList.scrollHeight;
    }

    async function submitMessage(event) {
        event.preventDefault();

        if (!state.user) {
            state.pendingView = "messages";
            openAuthGate();
            return;
        }
        if (!isUserVerified()) {
            openProfileCompletionModal("chat.html");
            return;
        }

        const text = String(els.messageInput?.value || "").trim();
        if (!text) return;
        if (!state.activeThreadId) {
            showToast("Selectionnez une conversation.");
            return;
        }

        try {
            await api(`/api/conversations/${encodeURIComponent(state.activeThreadId)}/messages`, {
                method: "POST",
                body: { text }
            });
            if (els.messageInput) els.messageInput.value = "";
            await openThread(state.activeThreadId);
        } catch (error) {
            showToast(error.message || "Envoi impossible.");
        }
    }

    function bindEvents() {
        for (const button of els.routeButtons) {
            button.addEventListener("click", async () => {
                const route = button.dataset.route || "home";
                const protectedRoute = button.dataset.protected === "true";
                const destination = routeDestination(route);

                if (protectedRoute && !state.user) {
                    state.pendingView = route;
                    state.pendingDestination = destination || "";
                    openAuthGate();
                    return;
                }

                if (protectedRoute && state.user && routeRequiresProfileCompletion(route) && !isUserVerified()) {
                    openProfileCompletionModal(destination || "dashboard.html");
                    return;
                }

                await navigate(route, { skipGuard: false });
            });
        }

        els.authOpenBtn?.addEventListener("click", (e) => {
            if (state.user && state.token) return; // Dashboard click -> follow link
            e.preventDefault();
            openAuthForms("login");
        });
        els.logoutBtn?.addEventListener("click", () => {
            logout().catch(() => showToast("Erreur de deconnexion."));
        });

        els.closeModalBtn?.addEventListener("click", dismissAuthModal);
        els.gateLaterBtn?.addEventListener("click", dismissAuthModal);
        els.gateLoginBtn?.addEventListener("click", () => openAuthForms("login"));
        els.gateRegisterBtn?.addEventListener("click", () => openAuthForms("register"));
        els.authBackBtn?.addEventListener("click", openAuthGate);
        els.profileCloseBtn?.addEventListener("click", dismissProfileModal);
        els.profileLaterBtn?.addEventListener("click", dismissProfileModal);
        els.profileCompleteBtn?.addEventListener("click", () => {
            const target = state.pendingProfileDestination || "dashboard.html";
            state.pendingProfileDestination = "";
            if (isUserVerified()) {
                dismissProfileModal();
                return;
            }
            window.location.href = toVerificationPath(target);
        });

        els.loginTab?.addEventListener("click", () => switchAuthTab("login"));
        els.registerTab?.addEventListener("click", () => switchAuthTab("register"));

        els.loginForm?.addEventListener("submit", (event) => {
            submitLogin(event).catch(() => setAuthFeedback("Connexion impossible."));
        });

        els.registerForm?.addEventListener("submit", (event) => {
            submitRegister(event).catch(() => setAuthFeedback("Inscription impossible."));
        });

        // Role selection cards
        document.querySelectorAll(".selection-card").forEach(card => {
            card.addEventListener("click", () => {
                const role = card.dataset.role;
                const roleInput = document.getElementById("register-role");
                if (roleInput) roleInput.value = role;

                // Transition to fields
                document.getElementById("register-selection-panel")?.classList.add("hidden");
                document.getElementById("register-fields-panel")?.classList.remove("hidden");
            });
        });

        document.getElementById("register-back-to-role")?.addEventListener("click", resetRegisterView);
        document.getElementById("auth-back-btn")?.addEventListener("click", () => {
            // If we are in form, go back to selection
            const fields = document.getElementById("register-fields-panel");
            if (fields && !fields.classList.contains("hidden") && !els.registerForm.classList.contains("hidden")) {
                resetRegisterView();
            } else {
                openAuthGate();
            }
        });

        els.authModal?.addEventListener("click", (event) => {
            if (event.target === els.authModal) dismissAuthModal();
        });
        els.profileModal?.addEventListener("click", (event) => {
            if (event.target === els.profileModal) dismissProfileModal();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                dismissAuthModal();
                dismissProfileModal();
            }
        });

        els.offerFilterForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            loadOffers().catch((error) => showToast(error.message || "Filtrage impossible."));
        });

        els.refreshOffersBtn?.addEventListener("click", () => {
            loadSearchData().catch((error) => showToast(error.message || "Rafraichissement impossible."));
        });

        els.offersList?.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest("button[data-reserve-offer]");
            if (!button) return;

            const offerId = Number(button.getAttribute("data-reserve-offer"));
            startReservation(offerId).catch((error) => {
                showToast(error.message || "Reservation impossible.");
            });
        });

        els.offerForm?.addEventListener("submit", (event) => {
            submitOffer(event).catch((error) => showToast(error.message || "Erreur publication."));
        });

        els.parcelRequestForm?.addEventListener("submit", (event) => {
            submitParcelRequest(event).catch((error) => showToast(error.message || "Erreur publication."));
        });

        els.refreshConversationsBtn?.addEventListener("click", () => {
            loadConversations().catch((error) => showToast(error.message || "Rafraichissement impossible."));
        });

        els.conversationsList?.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest("[data-thread-id]");
            if (!button) return;
            const threadId = button.getAttribute("data-thread-id");
            if (!threadId) return;
            openThread(threadId).catch((error) => showToast(error.message || "Ouverture impossible."));
        });

        els.messageForm?.addEventListener("submit", (event) => {
            submitMessage(event).catch((error) => showToast(error.message || "Envoi impossible."));
        });

        window.addEventListener("hashchange", () => {
            const route = currentRouteFromHash();
            navigate(route).catch((error) => showToast(error.message || "Navigation impossible."));
        });
    }

    async function bootstrap() {
        if (window.CCCommon) await window.CCCommon.init("home");
        bindEvents();
        await restoreSession();

        const route = currentRouteFromHash();
        await navigate(route);
    }

    bootstrap().catch((error) => {
        showToast(error.message || "Initialisation impossible.");
    });
})();
