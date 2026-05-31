const AUTH_TOKEN_KEY = "cc_auth_token";
const API_BASE_KEY = "cc_api_base";
const mockApi = window.MockApi || {};
const hasHttpRuntime = ["http:", "https:"].includes(window.location.protocol);


if (window.location.protocol === "file:") {
    const fileName = window.location.pathname.split("/").pop() || "index.html";
    const target = `http://127.0.0.1:8080/${fileName}${window.location.search || ""}${window.location.hash || ""}`;
    window.location.replace(target);
}

const protectedPages = new Set([
    "results.html",
    "post_trip.html",
    "chat.html",
    "dashboard.html",
    "admin.html"
]);

const state = {
    search: {
        originCountry: "",
        destinationCountry: "",
        maxPrice: null,
        dateLimit: "",
        hasSearched: false,
        offers: []
    },
    chat: {
        conversations: [],
        activeId: null
    },
    authUser: null,
    revealObserver: null
};

const COUNTRY_OPTIONS = [
    "France", "Belgique", "Suisse", "Espagne", "Italie", "Portugal", "Allemagne",
    "Royaume-Uni", "Pays-Bas", "Luxembourg", "Cote d'Ivoire", "Senegal", "Mali",
    "Burkina Faso", "Niger", "Togo", "Benin", "Cameroun", "Gabon", "Congo",
    "Republique Democratique du Congo", "Ghana", "Guinee", "Maroc", "Algerie",
    "Tunisie", "Egypte", "Etats-Unis", "Canada", "Emirats Arabes Unis"
];

const COUNTRY_ALIAS = {
    "cote d'ivoire": "cote d'ivoire",
    "cote divoire": "cote d'ivoire",
    "ivory coast": "cote d'ivoire",
    "usa": "etats-unis",
    "u.s.a": "etats-unis",
    "united states": "etats-unis",
    "uk": "royaume-uni",
    "u.k": "royaume-uni"
};

const CITY_TO_COUNTRY = {
    paris: "france",
    lyon: "france",
    marseille: "france",
    bruxelles: "belgique",
    abidjan: "cote d'ivoire",
    dakar: "senegal",
    casablanca: "maroc",
    bamako: "mali",
    lome: "togo",
    cotonou: "benin",
    accra: "ghana",
    douala: "cameroun",
    libreville: "gabon"
};

function normalizeBase(base) {
    return String(base || "").trim().replace(/\/+$/, "");
}

function resolveApiBases() {
    const bases = [];
    const stored = normalizeBase(localStorage.getItem(API_BASE_KEY));
    if (stored) {
        bases.push(stored);
    }

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        bases.push(normalizeBase(window.location.origin));
    }

    bases.push("http://127.0.0.1:8080");
    return [...new Set(bases.filter(Boolean))];
}


function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function pageFile() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function pageTarget() {
    return `${pageFile()}${window.location.search || ""}${window.location.hash || ""}`;
}

function pageFileFromHref(href) {
    const url = new URL(href, window.location.href);
    return (url.pathname.split("/").pop() || "index.html").toLowerCase();
}

function buildAuthUrl(returnTo, mode = "login") {
    const safe = returnTo || pageTarget();
    const query = `?returnTo=${encodeURIComponent(safe)}`;
    return mode === "register" ? `auth.html${query}#register` : `auth.html${query}`;
}

function redirectToAuth(returnTo, mode = "login") {
    window.location.href = buildAuthUrl(returnTo, mode);
}

function token() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    state.authUser = null;
}

function fmtDate(value) {
    const d = new Date(value || "");
    if (Number.isNaN(d.getTime())) return value || "Date non precisee";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function reservationStatusLabel(status) {
    const map = {
        pending: "En attente",
        accepted: "Acceptee",
        refused: "Refusee",
        canceled: "Annulee",
        in_transit: "En transit",
        delivered: "Livree",
        agreed: "Accordee"
    };
    return map[String(status || "").toLowerCase()] || String(status || "");
}

function reservationStatusBadge(status) {
    const key = String(status || "pending").toLowerCase();
    const label = reservationStatusLabel(key);
    const icon = key === "agreed" ? '<ion-icon name="checkmark-circle"></ion-icon> ' : "";
    return `<span class="status-chip status-${escapeHtml(key)}">${icon}${escapeHtml(label)}</span>`;
}

function statusChip(status, label) {
    const key = String(status || "pending").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const text = label || status || "inconnu";
    return `<span class="status-chip status-${escapeHtml(key)}">${escapeHtml(text)}</span>`;
}

function canonicalCountry(value) {
    const normalized = normalizeText(value);
    return COUNTRY_ALIAS[normalized] || normalized;
}

function locationCountry(location) {
    const normalized = normalizeText(location);
    if (!normalized) return "";

    const cityEntries = Object.entries(CITY_TO_COUNTRY);
    for (const [city, country] of cityEntries) {
        if (normalized.includes(city)) {
            return country;
        }
    }

    const countryMatches = COUNTRY_OPTIONS
        .map((country) => canonicalCountry(country))
        .find((country) => normalized.includes(country));
    if (countryMatches) {
        return countryMatches;
    }

    return normalized;
}

function matchesCountry(location, selectedCountry) {
    const wanted = canonicalCountry(selectedCountry);
    if (!wanted) return true;
    const locationNorm = normalizeText(location);
    return locationNorm.includes(wanted) || locationCountry(location) === wanted;
}

function isValidCountrySelection(value) {
    if (!value) return true;
    const wanted = canonicalCountry(value);
    return COUNTRY_OPTIONS.map((item) => canonicalCountry(item)).includes(wanted);
}

function showAdminLinks(user) {
    const isAdmin = Boolean(user && user.role === "admin");
    document.querySelectorAll("[data-admin-link]").forEach((node) => {
        node.hidden = !isAdmin;
    });
}

async function api(path, options = {}, withAuth = false) {
    // [SUPABASE BRIDGE UNIVERSEL]
    if (window.ccSupabase) {
        // On redirige vers le bridge moderne de standalone-common s'il existe
        if (window.CCCommon && window.CCCommon.api) {
            return window.CCCommon.api(path, { ...options, auth: withAuth });
        }
    }

    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (withAuth) {
        const t = token();
        if (!t) throw new Error("AUTH_REQUIRED");
        headers.Authorization = `Bearer ${t}`;
    }

    const bases = resolveApiBases();
    let lastHttpError = null;
    let sawAuth401 = false;

    for (const base of bases) {
        const url = `${base}/api${path}`;
        try {
            const res = await fetch(url, { ...options, headers });
            const raw = await res.text();
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }

            if (!res.ok) {
                if (res.status === 401 && withAuth) {
                    sawAuth401 = true;
                    continue;
                }
                lastHttpError = new Error(body && body.error ? body.error : `Erreur ${res.status}`);
                continue;
            }

            localStorage.setItem(API_BASE_KEY, base);
            return body;
        } catch (error) {
            // try next base
        }
    }

    if (sawAuth401 && withAuth) {
        clearToken();
        throw new Error("AUTH_REQUIRED");
    }

    if (lastHttpError) {
        throw lastHttpError;
    }

    throw new Error("Impossible de contacter le serveur. Lancez http://127.0.0.1:8080");
}

async function currentUser(force = false) {
    if (!force && state.authUser) return state.authUser;
    if (!token()) {
        state.authUser = null;
        return null;
    }
    if (!hasHttpRuntime) {
        state.authUser = { id: 1, fullName: "Local", email: "local@example.com", role: "user" };
        return state.authUser;
    }
    try {
        const me = await api("/auth/me", {}, true);
        state.authUser = me.user;
        return state.authUser;
    } catch (error) {
        if (error && error.message === "AUTH_REQUIRED") {
            clearToken();
        }
        return null;
    }
}

function openAuthGate(returnTo) {
    const gate = document.getElementById("auth-gate");
    const login = document.getElementById("auth-gate-login");
    const register = document.getElementById("auth-gate-register");
    if (!gate || !login || !register) return false;
    login.href = buildAuthUrl(returnTo, "login");
    register.href = buildAuthUrl(returnTo, "register");
    gate.hidden = false;
    return true;
}

async function guardCurrentPage() {
    if (!hasHttpRuntime) return true;
    const file = pageFile();
    if (!protectedPages.has(file)) return true;
    const t = token();
    if (!t) {
        redirectToAuth(pageTarget());
        return false;
    }

    if (file === "admin.html") {
        const user = await currentUser();
        if (!user || user.role !== "admin") {
            window.location.href = "dashboard.html";
            return false;
        }
    }

    return true;
}

function initProtectedLinkInterceptor() {
    document.addEventListener("click", async (event) => {
        const a = event.target.closest("a[href]");
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        const targetFile = pageFileFromHref(href);
        if (!protectedPages.has(targetFile)) return;

        const t = token();
        if (!t) {
            event.preventDefault();
            const u = new URL(href, window.location.href);
            const returnTo = `${u.pathname.split("/").pop() || "index.html"}${u.search || ""}${u.hash || ""}`;
            if (!openAuthGate(returnTo)) redirectToAuth(returnTo);
            return;
        }

        if (targetFile === "admin.html") {
            const user = await currentUser();
            if (!user || user.role !== "admin") {
                event.preventDefault();
                window.location.href = "dashboard.html";
            }
        }
    }, true);
}

function initDecisionGateway() {
    const actions = document.querySelectorAll("[data-action-target]");
    if (!actions.length) return;

    const gate = document.getElementById("auth-gate");
    const cancel = document.getElementById("auth-gate-cancel");
    const close = () => { if (gate) gate.hidden = true; };

    if (cancel) cancel.addEventListener("click", close);
    if (gate) {
        gate.addEventListener("click", (event) => {
            if (event.target === gate) close();
        });
    }

    actions.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const target = btn.getAttribute("data-action-target");
            if (!target) return;
            const targetFile = pageFileFromHref(target);
            const t = token();

            if (t) {
                if (targetFile === "admin.html") {
                    const user = await currentUser();
                    if (!user || user.role !== "admin") {
                        window.location.href = "dashboard.html";
                        return;
                    }
                }
                window.location.href = target;
                return;
            }

            if (!openAuthGate(target)) redirectToAuth(target);
        });
    });
}

 

function initYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
}

function initRevealObserver() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
        document.querySelectorAll("[data-animate]").forEach((n) => n.classList.add("is-visible"));
        return;
    }

    state.revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                state.revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18 });

    document.querySelectorAll("[data-animate]").forEach((node) => {
        state.revealObserver.observe(node);
    });
}

function initConversionWidgets() {
    const slots = document.getElementById("slot-count");
    const daily = document.getElementById("daily-requests");
    if (slots) slots.textContent = String(Math.max(5, 19 - new Date().getDate()));
    if (daily) daily.textContent = String(70 + new Date().getDate() * 3);
}

function initCountryDatalists() {
    const lists = document.querySelectorAll("datalist[data-country-list]");
    if (!lists.length) return;

    const optionsHtml = COUNTRY_OPTIONS
        .map((country) => `<option value="${escapeHtml(country)}"></option>`)
        .join("");

    lists.forEach((list) => {
        list.innerHTML = optionsHtml;
    });
}

async function initAuthButtons() {
    const login = document.querySelector("[data-auth-login]");
    const register = document.querySelector("[data-auth-register]");
    if (!login || !register) {
        showAdminLinks(null);
        return;
    }

    login.href = "auth.html";
    login.textContent = "Connexion";
    register.href = "auth.html#register";
    register.textContent = "Inscription";

    const user = await currentUser(true);
    showAdminLinks(user);
    if (!user) return;

    login.href = "dashboard.html";
    login.textContent = user.fullName;
    register.href = "#";
    register.textContent = "Deconnexion";
    register.addEventListener("click", async (event) => {
        event.preventDefault();
        try { await api("/auth/logout", { method: "POST" }, true); } catch {}
        clearToken();
        window.location.href = "index.html";
    });
}
async function searchOffers(filters = {}, scope = "public") {
    if (hasHttpRuntime) {
        const params = new URLSearchParams({
            destination: filters.destination || "",
            maxPrice: String(filters.maxPrice ?? ""),
            minKg: String(filters.minKg ?? ""),
            verifiedOnly: String(Boolean(filters.verifiedOnly)),
            scope,
            page: String(filters.page ?? 1),
            pageSize: String(filters.pageSize ?? 50)
        });
        return api(`/offers?${params.toString()}`, {}, scope === "mine");
    }

    const travelers = mockApi.searchTravelers ? await mockApi.searchTravelers(filters) : [];
    const items = travelers.map((t) => ({
        id: t.id,
        userId: t.id,
        ownerName: t.name,
        title: `Trajet vers ${t.destination}`,
        origin: "Non precise",
        destination: t.destination,
        departureDate: t.departureDate,
        availableKg: t.availableKg,
        pricePerKg: t.pricePerKg,
        flightNumber: t.flightNumber || "",
        rating: t.rating,
        reviews: t.reviews,
        isVerified: t.isVerified
    }));
    return { items, total: items.length, page: 1, pageSize: items.length };
}

async function createOffer(payload) {
    return hasHttpRuntime
        ? api("/offers", { method: "POST", body: JSON.stringify(payload) }, true)
        : (mockApi.createTrip ? mockApi.createTrip(payload) : payload);
}

async function deleteOffer(offerId) {
    return api(`/offers/${offerId}`, { method: "DELETE" }, true);
}

async function createParcelRequest(payload) {
    return hasHttpRuntime
        ? api("/parcel-requests", { method: "POST", body: JSON.stringify(payload) }, true)
        : { id: Date.now(), ...payload, status: "open" };
}

async function getParcelRequests(scope = "open", destination = "") {
    if (!hasHttpRuntime) return { items: [], total: 0, page: 1, pageSize: 0 };
    const params = new URLSearchParams({ scope, destination, page: "1", pageSize: "50" });
    return api(`/parcel-requests?${params.toString()}`, {}, scope === "mine");
}

async function createReservation(payload) {
    return api("/reservations", { method: "POST", body: JSON.stringify(payload) }, true);
}

async function getReservations(status = "") {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return api(`/reservations?${params.toString()}`, {}, true);
}

async function updateReservationStatus(id, status) {
    return api(`/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, true);
}

async function getConversations() {
    return hasHttpRuntime ? api("/conversations", {}, true) : [];
}

async function deleteConversation(conversationId) {
    return api(`/conversations/${conversationId}`, { method: "DELETE" }, true);
}

async function getMessages(id) {
    return hasHttpRuntime ? api(`/conversations/${id}/messages`, {}, true) : [];
}

async function getOrCreateConversationByReservation(reservationId) {
    return hasHttpRuntime
        ? api("/conversations/by-reservation", { method: "POST", body: JSON.stringify({ reservationId }) }, true)
        : { id: `th_${reservationId}`, reservationId };
}

async function sendMessage(conversationId, text) {
    return hasHttpRuntime
        ? api(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ text }) }, true)
        : { id: Date.now(), text };
}

async function getAdminOverview() { return api("/admin/overview", {}, true); }
async function getAdminAnalyticsDaily(days = 14) { return api(`/admin/analytics/daily?days=${encodeURIComponent(days)}`, {}, true); }

async function getAdminUsers(q = "") {
    const params = new URLSearchParams({ q, page: "1", pageSize: "100" });
    return api(`/admin/users?${params.toString()}`, {}, true);
}
async function adminSetUserStatus(id, isActive) { return api(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }, true); }
async function adminSetUserRole(id, role) { return api(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }, true); }
async function adminForceUserLogout(id) { return api(`/admin/users/${id}/sessions`, { method: "DELETE" }, true); }
async function adminDeleteUser(id) { return api(`/admin/users/${id}`, { method: "DELETE" }, true); }

async function getAdminOffers(q = "") {
    const params = new URLSearchParams({ q, page: "1", pageSize: "120" });
    return api(`/admin/offers?${params.toString()}`, {}, true);
}
async function getAdminPendingOffers() { return api("/admin/offers/pending-verification", {}, true); }
async function verifyAdminOffer(id) { return api(`/admin/offers/${id}/verify`, { method: "PATCH" }, true); }
async function adminSetOfferStatus(id, status) { return api(`/admin/offers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, true); }
async function adminDeleteOffer(id) { return api(`/admin/offers/${id}`, { method: "DELETE" }, true); }

async function getAdminReservations() { return api("/admin/reservations", {}, true); }
async function adminSetReservationStatus(id, status, reason) {
    return api(`/admin/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }, true);
}
async function adminSuspendReservationChat(id, reason) {
    return api(`/admin/reservations/${id}/chat/suspend`, { method: "PATCH", body: JSON.stringify({ reason }) }, true);
}
async function adminResumeReservationChat(id) { return api(`/admin/reservations/${id}/chat/resume`, { method: "PATCH" }, true); }
async function adminDeleteReservationChat(id) { return api(`/admin/reservations/${id}/chat`, { method: "DELETE" }, true); }
async function adminSuspendAgreement(id) { return api(`/admin/reservations/${id}/agreement/suspend`, { method: "PATCH" }, true); }

async function getAdminConversations() { return api("/admin/conversations", {}, true); }
async function adminSuspendConversation(id, reason) { return api(`/admin/conversations/${id}/suspend`, { method: "PATCH", body: JSON.stringify({ reason }) }, true); }
async function adminResumeConversation(id) { return api(`/admin/conversations/${id}/resume`, { method: "PATCH" }, true); }
async function adminDeleteConversationByAdmin(id) { return api(`/admin/conversations/${id}`, { method: "DELETE" }, true); }

async function getAdminSecurityBlocks() { return api("/admin/security/blocks", {}, true); }
async function getAdminLoginRate() { return api("/admin/security/login-rate", {}, true); }
async function createAdminSecurityBlock(payload) { return api("/admin/security/blocks", { method: "POST", body: JSON.stringify(payload) }, true); }
async function deleteAdminSecurityBlock(id) { return api(`/admin/security/blocks/${id}`, { method: "DELETE" }, true); }

async function getAdminAuditLog(limit = 120) { return api(`/admin/audit-log?limit=${encodeURIComponent(limit)}`, {}, true); }

function syncResultsQueryState() {
    const params = new URLSearchParams(window.location.search);
    const origin = params.get("originCountry") || "";
    const destination = params.get("destCountry") || params.get("dest") || "";
    const maxPrice = Number(params.get("maxPrice"));
    const dateLimit = params.get("dateLimit") || "";

    if (origin) state.search.originCountry = origin;
    if (destination) state.search.destinationCountry = destination;
    if (Number.isFinite(maxPrice) && maxPrice > 0) state.search.maxPrice = maxPrice;
    if (dateLimit) state.search.dateLimit = dateLimit;

    const originInput = document.getElementById("country-origin");
    const destinationInput = document.getElementById("country-destination");
    const dateInput = document.getElementById("date-limit");
    const priceInput = document.getElementById("max-price-input");

    if (originInput) originInput.value = state.search.originCountry;
    if (destinationInput) destinationInput.value = state.search.destinationCountry;
    if (dateInput) dateInput.value = state.search.dateLimit;
    if (priceInput && Number.isFinite(state.search.maxPrice)) priceInput.value = String(state.search.maxPrice);
}

function renderOfferCard(offer) {
    const reserveLabel = "Contacter";

    return `
        <article class="traveler-card">
            <div class="traveler-head">
                <img src="https://i.pravatar.cc/150?u=${escapeHtml(offer.userId)}" class="traveler-avatar" alt="${escapeHtml(offer.ownerName)}">
                <div>
                    <h3 class="traveler-name">${escapeHtml(offer.ownerName)}</h3>
                    <p class="traveler-rating">${Number(offer.rating || 5).toFixed(1)} / 5 · ${escapeHtml(offer.reviews || 0)} avis</p>
                </div>
                <div class="price-block">
                    <p class="price-main">${escapeHtml(offer.pricePerKg)}EUR</p>
                    <p class="price-sub">par kilo</p>
                </div>
            </div>
            <div class="traveler-route">
                <span><ion-icon name="airplane-outline"></ion-icon> Depart: <strong>${escapeHtml(offer.origin)}</strong></span>
                <span><ion-icon name="location-outline"></ion-icon> Destination: <strong>${escapeHtml(offer.destination)}</strong></span>
                <span><ion-icon name="calendar-outline"></ion-icon> ${escapeHtml(fmtDate(offer.departureDate))}</span>
            </div>
            <div class="traveler-footer">
                <div>
                    <span class="badge-capacity"><ion-icon name="cube-outline"></ion-icon> ${escapeHtml(offer.availableKg)} kg dispos</span>
                </div>
                <button type="button" class="btn btn-primary reserve-offer-btn" data-offer-id="${escapeHtml(offer.id)}">${reserveLabel}</button>
            </div>
        </article>
    `;
}

function buildParcelRequestFromSearch(offer) {
    const fallbackDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const origin = offer.origin;
    const destination = offer.destination;
    const dateLimit = state.search.dateLimit || offer.departureDate || fallbackDate;
    const maxPrice = Number.isFinite(state.search.maxPrice) && state.search.maxPrice > 0
        ? Math.round(state.search.maxPrice)
        : Number(offer.pricePerKg || 10);

    return {
        title: `Demande vers ${destination}`,
        origin,
        destination,
        neededByDate: String(dateLimit).slice(0, 10),
        weightKg: 1,
        maxPricePerKg: Math.max(1, maxPrice),
        description: `Demande generee depuis la page des offres. Filtre depart=${state.search.originCountry || "-"}, destination=${state.search.destinationCountry || "-"}.`
    };
}

async function contactOffer(offerId) {
    const user = await currentUser();
    if (!user) {
        if (!openAuthGate(pageTarget())) redirectToAuth(pageTarget());
        return;
    }

    const offer = state.search.offers.find((item) => Number(item.id) === Number(offerId));
    if (!offer) {
        alert("Offre introuvable.");
        return;
    }

    try {
        const requestPayload = buildParcelRequestFromSearch(offer);
        const parcelRequest = await createParcelRequest(requestPayload);
        const reservation = await createReservation({
            offerId: offer.id,
            parcelRequestId: parcelRequest.id,
            proposedPricePerKg: offer.pricePerKg
        });
        const thread = await getOrCreateConversationByReservation(reservation.id);
        const prefill = "Bonjour, je suis interesse par votre offre.";
        window.location.href = `chat.html?thread=${encodeURIComponent(thread.id)}&reservation=${encodeURIComponent(reservation.id)}&prefill=${encodeURIComponent(prefill)}`;
    } catch (error) {
        alert(error.message || "Impossible de contacter ce proposeur.");
    }
}

async function renderOffers() {
    const container = document.getElementById("traveler-list");
    if (!container) return;

    container.innerHTML = '<div class="empty-state glass-panel"><p>Chargement des offres...</p></div>';

    const response = await searchOffers({
        destination: "",
        maxPrice: Number.isFinite(state.search.maxPrice) && state.search.maxPrice > 0 ? state.search.maxPrice : 100000,
        minKg: 1,
        verifiedOnly: false
    });

    let offers = response.items || [];
    offers = offers.filter((offer) => matchesCountry(offer.origin, state.search.originCountry));
    offers = offers.filter((offer) => matchesCountry(offer.destination, state.search.destinationCountry));

    if (state.search.dateLimit) {
        const limit = new Date(state.search.dateLimit);
        if (!Number.isNaN(limit.getTime())) {
            offers = offers.filter((offer) => {
                const departure = new Date(offer.departureDate);
                if (Number.isNaN(departure.getTime())) return true;
                return departure.getTime() <= limit.getTime();
            });
        }
    }

    if (Number.isFinite(state.search.maxPrice) && state.search.maxPrice > 0) {
        offers = offers.filter((offer) => Number(offer.pricePerKg) <= state.search.maxPrice);
    }

    state.search.offers = offers;
    const count = document.getElementById("search-count");
    if (count) count.textContent = String(state.search.offers.length);

    if (!state.search.offers.length) {
        container.innerHTML = '<div class="empty-state glass-panel"><h3>Aucune offre</h3><p>Ajustez vos filtres.</p></div>';
        return;
    }

    container.innerHTML = state.search.offers.map(renderOfferCard).join("");
    container.querySelectorAll(".reserve-offer-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const offerId = Number(button.getAttribute("data-offer-id"));
            button.disabled = true;
            const t = button.textContent;
            button.textContent = "Traitement...";
            try { await contactOffer(offerId); } finally { button.disabled = false; button.textContent = t; }
        });
    });
}

function initResultsFilters() {
    const originInput = document.getElementById("country-origin");
    const destinationInput = document.getElementById("country-destination");
    const dateInput = document.getElementById("date-limit");
    const priceInput = document.getElementById("max-price-input");
    const searchBtn = document.getElementById("search-submit");
    const form = document.getElementById("offer-filter-form");

    if (!originInput || !destinationInput || !priceInput || !searchBtn) {
        return;
    }

    const applyFilterState = () => {
        state.search.originCountry = originInput.value.trim();
        state.search.destinationCountry = destinationInput.value.trim();
        state.search.dateLimit = dateInput ? dateInput.value : "";
        const maxPrice = Number(priceInput.value);
        state.search.maxPrice = Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null;
    };

    const runSearch = async () => {
        applyFilterState();

        if (!state.search.originCountry || !state.search.destinationCountry) {
            alert("Selectionnez le pays de depart et le pays d'arrivee.");
            return;
        }

        if (!isValidCountrySelection(state.search.originCountry) || !isValidCountrySelection(state.search.destinationCountry)) {
            alert("Choisissez les pays depuis la liste proposee.");
            return;
        }

        state.search.hasSearched = true;
        const params = new URLSearchParams();
        if (state.search.originCountry) params.set("originCountry", state.search.originCountry);
        if (state.search.destinationCountry) params.set("destCountry", state.search.destinationCountry);
        if (state.search.dateLimit) params.set("dateLimit", state.search.dateLimit);
        if (state.search.maxPrice) params.set("maxPrice", String(state.search.maxPrice));
        history.replaceState(null, "", `results.html${params.toString() ? `?${params.toString()}` : ""}`);

        await renderOffers();
    };

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            await runSearch();
        });
    }

    searchBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await runSearch();
    });
}
function initTripForm() {
    const form = document.getElementById("trip-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const user = await currentUser();
        if (!user) {
            redirectToAuth(pageTarget());
            return;
        }

        const submit = form.querySelector("button[type='submit']");
        if (submit) {
            submit.disabled = true;
            submit.textContent = "Publication...";
        }

        try {
            const departureCountry = document.getElementById("departure")?.value?.trim() || "";
            const destinationCountry = document.getElementById("destination")?.value?.trim() || "";
            const departureDate = document.getElementById("date-depart")?.value || "";
            if (!isValidCountrySelection(departureCountry) || !isValidCountrySelection(destinationCountry)) {
                alert("Choisissez le pays de depart et d'arrivee depuis la liste.");
                return;
            }

            const created = await createOffer({
                title: `Trajet ${departureCountry} -> ${destinationCountry}`,
                origin: departureCountry,
                destination: destinationCountry,
                departureDate,
                availableKg: Number(document.getElementById("kilos")?.value || 0),
                pricePerKg: Number(document.getElementById("price")?.value || 0),
                description: document.getElementById("description")?.value?.trim() || ""
            });
            alert(`Offre publiee vers ${created.destination}.`);
            window.location.href = "dashboard.html";
        } catch (error) {
            alert(error.message || "Erreur publication.");
        } finally {
            if (submit) {
                submit.disabled = false;
                submit.textContent = "Publier mon trajet";
            }
        }
    });
}

function renderConversationList() {
    const list = document.getElementById("conversation-list");
    if (!list) return;
    if (!state.chat.conversations.length) {
        list.innerHTML = '<p class="empty-chat-note">Aucune conversation.</p>';
        return;
    }
    list.innerHTML = state.chat.conversations
        .map((c) => `
            <article class="conversation-item ${c.id === state.chat.activeId ? "active" : ""}" data-conversation-id="${escapeHtml(c.id)}">
                <img src="${escapeHtml(c.travelerAvatar || "https://i.pravatar.cc/150?u=default")}" alt="${escapeHtml(c.travelerName || "Contact")}">
                <div>
                    <h4>${escapeHtml(c.travelerName || "Contact")}</h4>
                    <p>${escapeHtml(c.preview || "Nouvelle conversation")}</p>
                </div>
            </article>
        `)
        .join("");
}

function renderChatHeader(conversation) {
    const avatar = document.getElementById("chat-user-avatar");
    const name = document.getElementById("chat-user-name");
    const status = document.getElementById("chat-user-status");
    if (!avatar || !name || !status || !conversation) return;

    avatar.src = conversation.travelerAvatar || "https://i.pravatar.cc/150?u=default";
    name.textContent = conversation.travelerName || "Contact";
    const statusLabel = reservationStatusLabel(conversation.status);
    const suspendedInfo = conversation.isSuspended ? `Suspendue${conversation.suspendedReason ? ` (${conversation.suspendedReason})` : ""}` : "";
    status.textContent = [conversation.offerTitle || "Conversation", statusLabel ? `Statut: ${statusLabel}` : "", suspendedInfo].filter(Boolean).join(" | ");

    const agreeBtn = document.getElementById("chat-agree-btn");
    if (agreeBtn) {
        const canAgree = Boolean(conversation.canMarkAgreed) && String(conversation.status || "") === "pending" && !conversation.isSuspended;
        agreeBtn.hidden = !canAgree;
        agreeBtn.disabled = !canAgree;
    }

    const input = document.getElementById("message-input");
    const submitBtn = document.querySelector("#chat-form button[type='submit']");
    if (input && submitBtn) {
        const isSuspended = Boolean(conversation.isSuspended);
        input.disabled = isSuspended;
        submitBtn.disabled = isSuspended;
        input.placeholder = isSuspended ? "Conversation suspendue par l'administration." : "Ecrivez votre message...";
    }
}

function renderMessages(messages) {
    const container = document.getElementById("message-container");
    if (!container) return;
    if (!messages.length) {
        container.innerHTML = '<p class="empty-chat-note">Aucun message.</p>';
        return;
    }

    container.innerHTML = messages
        .map((msg) => {
            const sender = msg.sender || "traveler";
            let cls = "message-received";
            if (sender === "user") cls = "message-sent";
            if (sender === "system") cls = "message-system";
            return `<div class="message-bubble ${cls}">${escapeHtml(msg.text)}</div>`;
        })
        .join("");
    container.scrollTop = container.scrollHeight;
}

async function loadConversation(id) {
    state.chat.activeId = id;
    renderConversationList();
    const messages = await getMessages(id);
    renderMessages(messages);
    const c = state.chat.conversations.find((x) => x.id === id);
    if (c) renderChatHeader(c);
}

async function initChat() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("message-input");
    const list = document.getElementById("conversation-list");
    const agreeBtn = document.getElementById("chat-agree-btn");
    if (!form || !input || !list) return;

    const user = await currentUser();
    if (!user) {
        list.innerHTML = '<p class="empty-chat-note">Connectez-vous pour acceder a vos messages.</p>';
        input.disabled = true;
        form.querySelector("button[type='submit']")?.setAttribute("disabled", "true");
        setTimeout(() => redirectToAuth(pageTarget()), 450);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const reservation = Number(params.get("reservation"));
    const thread = params.get("thread");
    const prefill = (params.get("prefill") || "").trim();
    if (reservation > 0) {
        try { await getOrCreateConversationByReservation(reservation); } catch {}
    }

    state.chat.conversations = await getConversations();
    const targetThread = thread && state.chat.conversations.find((c) => c.id === thread);
    state.chat.activeId = targetThread ? targetThread.id : (state.chat.conversations[0]?.id || null);

    renderConversationList();
    if (state.chat.activeId) await loadConversation(state.chat.activeId);

    if (prefill && state.chat.activeId) {
        const marker = `prefill_sent_${state.chat.activeId}_${prefill}`;
        if (!sessionStorage.getItem(marker)) {
            await sendMessage(state.chat.activeId, prefill);
            sessionStorage.setItem(marker, "1");
            await loadConversation(state.chat.activeId);
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("prefill");
            history.replaceState(null, "", cleanUrl.toString());
        }
    }

    list.addEventListener("click", async (event) => {
        const item = event.target.closest("[data-conversation-id]");
        if (!item) return;
        const id = item.getAttribute("data-conversation-id");
        if (!id || id === state.chat.activeId) return;
        await loadConversation(id);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || !state.chat.activeId) return;
        input.value = "";
        await sendMessage(state.chat.activeId, text);
        await loadConversation(state.chat.activeId);
        state.chat.conversations = await getConversations();
        renderConversationList();
    });

    if (agreeBtn && !agreeBtn.dataset.bound) {
        agreeBtn.dataset.bound = "true";
        agreeBtn.addEventListener("click", async () => {
            const active = state.chat.conversations.find((item) => item.id === state.chat.activeId);
            if (!active || !active.reservationId) return;
            if (!active.canMarkAgreed || String(active.status || "") !== "pending") return;
            const confirmed = window.confirm("Confirmer l'accord avec ce proposeur ?");
            if (!confirmed) return;

            const previous = agreeBtn.innerHTML;
            agreeBtn.disabled = true;
            agreeBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Validation...';
            try {
                await updateReservationStatus(active.reservationId, "agreed");
                state.chat.conversations = await getConversations();
                const next = state.chat.conversations.find((item) => item.id === state.chat.activeId) || state.chat.conversations[0] || null;
                if (next) {
                    await loadConversation(next.id);
                } else {
                    renderConversationList();
                }
                alert("Accord confirme.");
            } catch (error) {
                agreeBtn.disabled = false;
                agreeBtn.innerHTML = previous;
                alert(error.message || "Impossible de confirmer l'accord.");
            }
        });
    }
}

function reservationActions(item, user) {
    const out = [];
    const owner = Number(item.offerOwnerId) === Number(user.id);
    const requester = Number(item.requesterId) === Number(user.id);
    if (item.status === "pending") {
        if (owner) out.push(["accepted", "Accepter"], ["refused", "Refuser"]);
        if (requester) out.push(["canceled", "Annuler"]);
    }
    if (item.status === "accepted") {
        if (owner) out.push(["in_transit", "En transit"]);
        if (requester) out.push(["canceled", "Annuler"]);
    }
    if (item.status === "in_transit" && requester) out.push(["delivered", "Confirmer livre"]);
    return out;
}

function renderList(containerId, items, empty, mapFn) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = items.length ? items.map(mapFn).join("") : `<p class="empty-chat-note">${escapeHtml(empty)}</p>`;
}

async function listAllMineOffers() {
    if (!hasHttpRuntime) return [];
    const filters = { destination: "", maxPrice: 10000, minKg: 1, verifiedOnly: false };
    const all = [];
    const pageSize = 100;
    for (let page = 1; page <= 30; page += 1) {
        const response = await searchOffers({ ...filters, page, pageSize }, "mine");
        const items = Array.isArray(response?.items) ? response.items : [];
        all.push(...items);
        if (items.length < pageSize) break;
    }
    return all;
}

async function initDashboard() {
    const userNode = document.getElementById("dashboard-user");
    if (!userNode) return;

    const user = await currentUser();
    if (!user) {
        redirectToAuth(pageTarget());
        return;
    }

    userNode.textContent = `${user.fullName} (${user.email})`;

    const renderOffers = (offers) => {
        renderList("dash-offers", offers, "Aucune offre publiee.", (item) => {
            const description = item.description ? `<p class="dash-offer-desc">${escapeHtml(item.description)}</p>` : "";
            return `<article class="dash-item">
                <header>
                    <h4>${escapeHtml(item.title)}</h4>
                    <div class="dash-offer-head-actions">
                        <button type="button" class="btn btn-danger-icon" data-delete-offer="${escapeHtml(item.id)}" title="Supprimer l'offre" aria-label="Supprimer l'offre">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </header>
                <p>${escapeHtml(item.origin)} -> ${escapeHtml(item.destination)}</p>
                <p>${escapeHtml(fmtDate(item.departureDate))} · ${escapeHtml(item.availableKg)} kg · ${escapeHtml(item.pricePerKg)} EUR/kg</p>
                ${description}
                <p class="dash-offer-meta">Ref #${escapeHtml(item.id)} · Publiee le ${escapeHtml(fmtDate(item.createdAt))}</p>
            </article>`;
        });
    };

    const loadOffers = async () => {
        try {
            const offers = await listAllMineOffers();
            renderOffers(offers);
        } catch (error) {
            renderList("dash-offers", [], "Impossible de charger vos offres pour le moment.", () => "");
        }
    };

    const loadConversations = async () => {
        try {
            const conversations = await getConversations();
            renderList("dash-conversations", conversations || [], "Aucune conversation.", (item) => `<article class="dash-item"><header><h4>${escapeHtml(item.travelerName || "Contact")}</h4><div class="dash-offer-head-actions"><button type="button" class="btn btn-danger-icon" data-delete-conversation="${escapeHtml(item.id)}" title="Supprimer la conversation" aria-label="Supprimer la conversation"><ion-icon name="trash-outline"></ion-icon></button></div></header><p>${escapeHtml(item.offerTitle || "")}</p><a class="btn btn-secondary btn-sm" href="chat.html?thread=${encodeURIComponent(item.id)}">Continuer</a></article>`);
        } catch (error) {
            renderList("dash-conversations", [], "Impossible de charger les conversations.", () => "");
        }
    };

    await Promise.all([loadOffers(), loadConversations()]);

    const offersList = document.getElementById("dash-offers");
    if (offersList && !offersList.dataset.bound) {
        offersList.dataset.bound = "true";
        offersList.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-delete-offer]");
            if (!button) return;
            const offerId = Number(button.getAttribute("data-delete-offer"));
            if (!offerId) return;
            const confirmed = window.confirm("Supprimer cette offre de place ?");
            if (!confirmed) return;
            const previous = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon>';
            try {
                await deleteOffer(offerId);
                await loadOffers();
            } catch (error) {
                button.disabled = false;
                button.innerHTML = previous;
                alert(error.message || "Impossible de supprimer cette offre.");
            }
        });
    }

    const conversationsList = document.getElementById("dash-conversations");
    if (conversationsList && !conversationsList.dataset.bound) {
        conversationsList.dataset.bound = "true";
        conversationsList.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-delete-conversation]");
            if (!button) return;
            const conversationId = String(button.getAttribute("data-delete-conversation") || "");
            if (!conversationId) return;
            const confirmed = window.confirm("Supprimer cette conversation et tous ses messages ?");
            if (!confirmed) return;
            const previous = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon>';
            try {
                await deleteConversation(conversationId);
                await loadConversations();
            } catch (error) {
                button.disabled = false;
                button.innerHTML = previous;
                alert(error.message || "Impossible de supprimer cette conversation.");
            }
        });
    }
}

async function initAdmin() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const user = await currentUser();
    if (!user || user.role !== "admin") {
        root.innerHTML = '<div class="glass-panel table-shell"><p>Acces admin reserve.</p></div>';
        return;
    }

    const adminState = { userQuery: "", offerQuery: "" };

    const fmtDateTime = (value) => {
        const d = new Date(value || "");
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("fr-FR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const parseDetailText = (raw) => {
        if (!raw) return "-";
        try {
            const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            const entries = Object.entries(obj || {}).slice(0, 4);
            if (!entries.length) return "-";
            return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" | ");
        } catch {
            return String(raw);
        }
    };

    const offerStatusLabel = (status) => {
        const map = { active: "Active", hidden: "Masquee", canceled: "Annulee" };
        return map[String(status || "").toLowerCase()] || String(status || "-");
    };

    const renderMetrics = (overview) => {
        const metrics = document.getElementById("admin-metrics");
        if (!metrics) return;
        const cards = [
            ["Utilisateurs", overview.users],
            ["Users actifs", overview.activeUsers],
            ["Users suspendus", overview.suspendedUsers],
            ["Offres", overview.offers],
            ["Offres actives", overview.activeOffers],
            ["Offres masquees", overview.hiddenOffers],
            ["Conversations", overview.conversations],
            ["Chats suspendus", overview.suspendedConversations],
            ["Reservations", overview.reservations],
            ["Accords", overview.agreedReservations],
            ["Rate offre->chat", `${overview.offerToChatRate}%`],
            ["Rate chat->accord", `${overview.chatToAgreementRate}%`]
        ];
        metrics.innerHTML = cards.map(([k, v]) => `<article class="metric-card"><h4>${escapeHtml(k)}</h4><strong>${escapeHtml(v)}</strong></article>`).join("");
    };

    const renderAnalytics = (analytics) => {
        const node = document.getElementById("admin-analytics");
        if (!node) return;
        const points = Array.isArray(analytics?.points) ? analytics.points : [];
        if (!points.length) {
            node.innerHTML = '<p class="empty-chat-note">Aucune donnee.</p>';
            return;
        }
        const build = (key, title) => {
            const values = points.map((p) => Number(p?.[key] || 0));
            const latest = values[values.length - 1] || 0;
            const total = values.reduce((sum, v) => sum + v, 0);
            const max = Math.max(1, ...values);
            const width = Math.max(5, Math.round((latest / max) * 100));
            return `<article class="trend-card"><h4>${escapeHtml(title)}</h4><strong>${escapeHtml(latest)}</strong><div class="trend-track"><span class="trend-fill" style="width:${escapeHtml(width)}%"></span></div><p>14j: ${escapeHtml(total)}</p></article>`;
        };
        node.innerHTML = [build("users", "Nouveaux users"), build("offers", "Nouvelles offres"), build("conversations", "Nouveaux chats"), build("agreements", "Nouveaux accords")].join("");
    };

    const renderUsers = (items) => {
        const body = document.getElementById("admin-users");
        if (!body) return;
        body.innerHTML = items.length ? items.map((item) => {
            const active = Number(item.isActive) === 1;
            const isAdmin = String(item.role) === "admin";
            const activity = [`Offres:${item.offersCount || 0}`, `Chats:${item.conversationsCount || 0}`, `Derniere connexion:${fmtDateTime(item.lastSeenAt)}`].join(" | ");
            return `<tr><td>#${escapeHtml(item.id)}</td><td>${escapeHtml(item.fullName)}</td><td>${escapeHtml(item.email)}</td><td>${statusChip(item.role, isAdmin ? "Admin" : "User")}</td><td>${statusChip(active ? "active" : "pending", active ? "Actif" : "Suspendu")}</td><td>${escapeHtml(activity)}</td><td><div class="admin-actions"><button class="btn btn-secondary btn-sm" data-admin-user-toggle="${escapeHtml(item.id)}" data-target-active="${active ? 0 : 1}">${active ? "Suspendre" : "Activer"}</button><button class="btn btn-secondary btn-sm" data-admin-user-role="${escapeHtml(item.id)}" data-target-role="${isAdmin ? "user" : "admin"}">${isAdmin ? "Retirer admin" : "Rendre admin"}</button><button class="btn btn-secondary btn-sm" data-admin-user-logout="${escapeHtml(item.id)}">Forcer logout</button><button class="btn btn-danger-icon" data-admin-user-delete="${escapeHtml(item.id)}" title="Supprimer user" aria-label="Supprimer user"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`;
        }).join("") : '<tr><td colspan="7">Aucun utilisateur.</td></tr>';
    };

    const renderOffers = (items) => {
        const body = document.getElementById("admin-offers");
        if (!body) return;
        body.innerHTML = items.length ? items.map((item) => {
            const status = String(item.status || "").toLowerCase();
            const statusAction = status === "active" ? "hidden" : "active";
            const statusActionLabel = status === "active" ? "Masquer" : "Reactiver";
            const verifyBtn = item.isVerified ? '<span class="status-chip status-verified">Verifiee</span>' : `<button class="btn btn-secondary btn-sm" data-admin-offer-verify="${escapeHtml(item.id)}">Verifier</button>`;
            return `<tr><td>#${escapeHtml(item.id)}</td><td>${escapeHtml(item.ownerName)}</td><td>${escapeHtml(item.origin)} -> ${escapeHtml(item.destination)}</td><td>${escapeHtml(fmtDate(item.departureDate))}</td><td>${escapeHtml(item.pricePerKg)} EUR</td><td>${statusChip(status, offerStatusLabel(status))}</td><td>${verifyBtn}</td><td><div class="admin-actions"><button class="btn btn-secondary btn-sm" data-admin-offer-status="${escapeHtml(item.id)}" data-target-status="${escapeHtml(statusAction)}">${statusActionLabel}</button><button class="btn btn-secondary btn-sm" data-admin-offer-status="${escapeHtml(item.id)}" data-target-status="canceled">Annuler</button><button class="btn btn-danger-icon" data-admin-offer-delete="${escapeHtml(item.id)}" title="Supprimer offre" aria-label="Supprimer offre"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`;
        }).join("") : '<tr><td colspan="8">Aucune offre.</td></tr>';
    };

    const renderReservations = (items) => {
        const body = document.getElementById("admin-reservations");
        if (!body) return;
        body.innerHTML = items.length ? items.map((item) => {
            const suspendBtn = item.chatThreadId ? `<button class="btn btn-secondary btn-sm" data-admin-suspend-chat="${item.id}" ${item.chatSuspended ? "hidden" : ""}>Suspendre chat</button>` : `<span class="text-muted">Pas de chat</span>`;
            const resumeBtn = item.chatThreadId && item.chatSuspended ? `<button class="btn btn-secondary btn-sm" data-admin-resume-chat="${item.id}">Reactiver chat</button>` : "";
            const deleteBtn = item.chatThreadId ? `<button class="btn btn-secondary btn-sm" data-admin-delete-chat="${item.id}">Supprimer chat</button>` : "";
            const suspendAgreementBtn = String(item.status || "") === "agreed" ? `<button class="btn btn-secondary btn-sm" data-admin-suspend-agreement="${item.id}">Suspendre accord</button>` : "";
            return `<tr><td>#${item.id}</td><td>${escapeHtml(item.requesterName)}</td><td>${escapeHtml(item.offerOwnerName)}</td><td>${escapeHtml(item.destination)}</td><td>${reservationStatusBadge(item.status)}</td><td>${escapeHtml(item.proposedPricePerKg || "-")}</td><td><div class="admin-actions">${suspendBtn}${resumeBtn}${deleteBtn}${suspendAgreementBtn}<button class="btn btn-primary btn-sm" data-admin-force-status="${item.id}">Forcer statut</button></div></td></tr>`;
        }).join("") : '<tr><td colspan="7">Aucune reservation.</td></tr>';
    };

    const renderConversations = (items) => {
        const body = document.getElementById("admin-conversations");
        if (!body) return;
        body.innerHTML = items.length ? items.map((item) => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.requesterName)} / ${escapeHtml(item.offerOwnerName)}</td><td>#${escapeHtml(item.reservationId)} · ${reservationStatusBadge(item.reservationStatus)}</td><td>${escapeHtml(item.messageCount)}</td><td>${item.isSuspended ? statusChip("pending", "Suspendue") : statusChip("active", "Active")}</td><td>${escapeHtml(item.preview || "")}</td><td><div class="admin-actions">${item.isSuspended ? `<button class="btn btn-secondary btn-sm" data-admin-conversation-resume="${escapeHtml(item.id)}">Reactiver</button>` : `<button class="btn btn-secondary btn-sm" data-admin-conversation-suspend="${escapeHtml(item.id)}">Suspendre</button>`}<button class="btn btn-danger-icon" data-admin-conversation-delete="${escapeHtml(item.id)}" title="Supprimer conversation" aria-label="Supprimer conversation"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`).join("") : '<tr><td colspan="7">Aucune conversation.</td></tr>';
    };

    const renderSecurity = (blocks, rate) => {
        const body = document.getElementById("admin-blocks");
        if (body) {
            body.innerHTML = blocks.length ? blocks.map((item) => `<tr><td>#${escapeHtml(item.id)}</td><td>${escapeHtml(item.blockType)}</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(fmtDateTime(item.expiresAt))}</td><td><button class="btn btn-secondary btn-sm" data-admin-block-delete="${escapeHtml(item.id)}">Debloquer</button></td></tr>`).join("") : '<tr><td colspan="6">Aucun blocage actif.</td></tr>';
        }
        const rateNode = document.getElementById("admin-security-rate");
        if (rateNode) {
            const items = Array.isArray(rate?.items) ? rate.items : [];
            const active = items.filter((item) => Number(item.retrySeconds || 0) > 0).length;
            rateNode.textContent = `Rate limit login: ${escapeHtml(rate?.keys || 0)} cles suivies, ${escapeHtml(active)} blocages actifs.`;
        }
    };

    const renderAudit = (items) => {
        const body = document.getElementById("admin-audit-log");
        if (!body) return;
        body.innerHTML = items.length ? items.map((item) => `<tr><td>${escapeHtml(fmtDateTime(item.createdAt))}</td><td>${escapeHtml(item.adminName)} (${escapeHtml(item.adminEmail)})</td><td>${escapeHtml(item.actionType)}</td><td>${escapeHtml(item.entityType)}:${escapeHtml(item.entityId || "-")}</td><td>${escapeHtml(parseDetailText(item.details))}</td></tr>`).join("") : '<tr><td colspan="5">Aucune action admin.</td></tr>';
    };

    const load = async () => {
        const [overview, analytics, usersResp, offersResp, reservations, conversations, blocks, rate, audit] = await Promise.all([
            getAdminOverview(),
            getAdminAnalyticsDaily(14),
            getAdminUsers(adminState.userQuery),
            getAdminOffers(adminState.offerQuery),
            getAdminReservations(),
            getAdminConversations(),
            getAdminSecurityBlocks(),
            getAdminLoginRate(),
            getAdminAuditLog(120)
        ]);
        renderMetrics(overview);
        renderAnalytics(analytics);
        renderUsers(Array.isArray(usersResp?.items) ? usersResp.items : []);
        renderOffers(Array.isArray(offersResp?.items) ? offersResp.items : []);
        renderReservations(Array.isArray(reservations) ? reservations : []);
        renderConversations(Array.isArray(conversations) ? conversations : []);
        renderSecurity(Array.isArray(blocks) ? blocks : [], rate || {});
        renderAudit(Array.isArray(audit) ? audit : []);
    };

    await load();

    const userSearchForm = document.getElementById("admin-user-search-form");
    if (userSearchForm && !userSearchForm.dataset.bound) {
        userSearchForm.dataset.bound = "true";
        userSearchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            adminState.userQuery = (document.getElementById("admin-user-search")?.value || "").trim();
            await load();
        });
    }

    const offerSearchForm = document.getElementById("admin-offer-search-form");
    if (offerSearchForm && !offerSearchForm.dataset.bound) {
        offerSearchForm.dataset.bound = "true";
        offerSearchForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            adminState.offerQuery = (document.getElementById("admin-offer-search")?.value || "").trim();
            await load();
        });
    }

    const usersBody = document.getElementById("admin-users");
    if (usersBody && !usersBody.dataset.bound) {
        usersBody.dataset.bound = "true";
        usersBody.addEventListener("click", async (event) => {
            const toggleBtn = event.target.closest("[data-admin-user-toggle]");
            if (toggleBtn) {
                const id = Number(toggleBtn.getAttribute("data-admin-user-toggle"));
                const target = Number(toggleBtn.getAttribute("data-target-active")) === 1;
                if (!id) return;
                await adminSetUserStatus(id, target);
                await load();
                return;
            }

            const roleBtn = event.target.closest("[data-admin-user-role]");
            if (roleBtn) {
                const id = Number(roleBtn.getAttribute("data-admin-user-role"));
                const role = String(roleBtn.getAttribute("data-target-role") || "");
                if (!id || !role) return;
                await adminSetUserRole(id, role);
                await load();
                return;
            }

            const logoutBtn = event.target.closest("[data-admin-user-logout]");
            if (logoutBtn) {
                const id = Number(logoutBtn.getAttribute("data-admin-user-logout"));
                if (!id) return;
                if (!window.confirm("Forcer la deconnexion de cet utilisateur ?")) return;
                await adminForceUserLogout(id);
                await load();
                return;
            }

            const deleteBtn = event.target.closest("[data-admin-user-delete]");
            if (deleteBtn) {
                const id = Number(deleteBtn.getAttribute("data-admin-user-delete"));
                if (!id) return;
                if (!window.confirm("Supprimer cet utilisateur ? Action irreversible.")) return;
                await adminDeleteUser(id);
                await load();
            }
        });
    }

    const offersBody = document.getElementById("admin-offers");
    if (offersBody && !offersBody.dataset.bound) {
        offersBody.dataset.bound = "true";
        offersBody.addEventListener("click", async (event) => {
            const verifyBtn = event.target.closest("[data-admin-offer-verify]");
            if (verifyBtn) {
                const id = Number(verifyBtn.getAttribute("data-admin-offer-verify"));
                if (!id) return;
                await verifyAdminOffer(id);
                await load();
                return;
            }

            const statusBtn = event.target.closest("[data-admin-offer-status]");
            if (statusBtn) {
                const id = Number(statusBtn.getAttribute("data-admin-offer-status"));
                const status = String(statusBtn.getAttribute("data-target-status") || "");
                if (!id || !status) return;
                await adminSetOfferStatus(id, status);
                await load();
                return;
            }

            const deleteBtn = event.target.closest("[data-admin-offer-delete]");
            if (deleteBtn) {
                const id = Number(deleteBtn.getAttribute("data-admin-offer-delete"));
                if (!id) return;
                if (!window.confirm("Supprimer definitivement cette offre ?")) return;
                await adminDeleteOffer(id);
                await load();
            }
        });
    }

    const reservationBody = document.getElementById("admin-reservations");
    if (reservationBody && !reservationBody.dataset.bound) {
        reservationBody.dataset.bound = "true";
        reservationBody.addEventListener("click", async (event) => {
            const suspendBtn = event.target.closest("[data-admin-suspend-chat]");
            if (suspendBtn) {
                const id = Number(suspendBtn.getAttribute("data-admin-suspend-chat"));
                if (!id) return;
                const reason = window.prompt("Raison de suspension du chat:", "Verification admin en cours");
                if (!reason) return;
                await adminSuspendReservationChat(id, reason);
                await load();
                return;
            }

            const resumeBtn = event.target.closest("[data-admin-resume-chat]");
            if (resumeBtn) {
                const id = Number(resumeBtn.getAttribute("data-admin-resume-chat"));
                if (!id) return;
                await adminResumeReservationChat(id);
                await load();
                return;
            }

            const deleteBtn = event.target.closest("[data-admin-delete-chat]");
            if (deleteBtn) {
                const id = Number(deleteBtn.getAttribute("data-admin-delete-chat"));
                if (!id) return;
                if (!window.confirm("Supprimer definitivement ce chat ?")) return;
                await adminDeleteReservationChat(id);
                await load();
                return;
            }

            const suspendAgreementBtn = event.target.closest("[data-admin-suspend-agreement]");
            if (suspendAgreementBtn) {
                const id = Number(suspendAgreementBtn.getAttribute("data-admin-suspend-agreement"));
                if (!id) return;
                if (!window.confirm("Suspendre cet accord ?")) return;
                await adminSuspendAgreement(id);
                await load();
                return;
            }

            const forceBtn = event.target.closest("[data-admin-force-status]");
            if (forceBtn) {
                const id = Number(forceBtn.getAttribute("data-admin-force-status"));
                if (!id) return;
                const target = String(window.prompt("Nouveau statut (pending, accepted, refused, canceled, in_transit, delivered, agreed):", "pending") || "").trim().toLowerCase();
                const allowed = new Set(["pending", "accepted", "refused", "canceled", "in_transit", "delivered", "agreed"]);
                if (!allowed.has(target)) {
                    alert("Statut invalide.");
                    return;
                }
                const reason = String(window.prompt("Motif admin:", "Mise a jour admin") || "").trim();
                if (!reason) return;
                await adminSetReservationStatus(id, target, reason);
                await load();
            }
        });
    }

    const conversationsBody = document.getElementById("admin-conversations");
    if (conversationsBody && !conversationsBody.dataset.bound) {
        conversationsBody.dataset.bound = "true";
        conversationsBody.addEventListener("click", async (event) => {
            const suspendBtn = event.target.closest("[data-admin-conversation-suspend]");
            if (suspendBtn) {
                const id = String(suspendBtn.getAttribute("data-admin-conversation-suspend") || "");
                if (!id) return;
                const reason = window.prompt("Raison de suspension:", "verification admin en cours");
                if (!reason) return;
                await adminSuspendConversation(id, reason);
                await load();
                return;
            }

            const resumeBtn = event.target.closest("[data-admin-conversation-resume]");
            if (resumeBtn) {
                const id = String(resumeBtn.getAttribute("data-admin-conversation-resume") || "");
                if (!id) return;
                await adminResumeConversation(id);
                await load();
                return;
            }

            const deleteBtn = event.target.closest("[data-admin-conversation-delete]");
            if (deleteBtn) {
                const id = String(deleteBtn.getAttribute("data-admin-conversation-delete") || "");
                if (!id) return;
                if (!window.confirm("Supprimer cette conversation ?")) return;
                await adminDeleteConversationByAdmin(id);
                await load();
            }
        });
    }

    const blockForm = document.getElementById("admin-block-form");
    if (blockForm && !blockForm.dataset.bound) {
        blockForm.dataset.bound = "true";
        blockForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = {
                blockType: document.getElementById("admin-block-type")?.value || "email",
                value: document.getElementById("admin-block-value")?.value?.trim() || "",
                reason: document.getElementById("admin-block-reason")?.value?.trim() || "",
                durationHours: Number(document.getElementById("admin-block-duration")?.value || 24)
            };
            if (!payload.value || !payload.reason || !payload.durationHours) {
                alert("Remplissez tous les champs de blocage.");
                return;
            }
            await createAdminSecurityBlock(payload);
            document.getElementById("admin-block-value").value = "";
            document.getElementById("admin-block-reason").value = "";
            document.getElementById("admin-block-duration").value = "24";
            await load();
        });
    }

    const blocksBody = document.getElementById("admin-blocks");
    if (blocksBody && !blocksBody.dataset.bound) {
        blocksBody.dataset.bound = "true";
        blocksBody.addEventListener("click", async (event) => {
            const btn = event.target.closest("[data-admin-block-delete]");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-admin-block-delete"));
            if (!id) return;
            await deleteAdminSecurityBlock(id);
            await load();
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await guardCurrentPage();
    if (!allowed) return;

    initYear();
    await initAuthButtons();
    initProtectedLinkInterceptor();
    initRevealObserver();
    initDecisionGateway();
    initConversionWidgets();
    initCountryDatalists();

    const file = pageFile();
    if (file === "results.html") {
        syncResultsQueryState();
        initResultsFilters();
        try {
            await renderOffers();
        } catch (error) {
            const container = document.getElementById("traveler-list");
            if (container) container.innerHTML = `<div class="empty-state glass-panel"><h3>Erreur</h3><p>${escapeHtml(error.message || "inconnue")}</p></div>`;
        }
    }
    if (file === "post_trip.html") initTripForm();
    if (file === "chat.html") await initChat();
    if (file === "dashboard.html") await initDashboard();
    if (file === "admin.html") await initAdmin();
});
