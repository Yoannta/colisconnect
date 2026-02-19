<<<<<<< HEAD
﻿const AUTH_TOKEN_KEY = "cc_auth_token";
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

=======
﻿const AUTH_TOKEN_KEY = "cc_auth_token";
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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

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
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (withAuth) {
        const t = token();
        if (!t) throw new Error("AUTH_REQUIRED");
        headers.Authorization = `Bearer ${t}`;
    }

=======

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
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (withAuth) {
        const t = token();
        if (!t) throw new Error("AUTH_REQUIRED");
        headers.Authorization = `Bearer ${t}`;
    }

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
    const bases = resolveApiBases();
    let lastHttpError = null;
    let sawAuth401 = false;

    for (const base of bases) {
        const url = `${base}/api${path}`;
        try {
<<<<<<< HEAD
            const res = await fetch(url, { ...options, headers });
            const raw = await res.text();
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }
=======
            const res = await fetch(url, { ...options, headers });
            const raw = await res.text();
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a

            if (!res.ok) {
                if (res.status === 401 && withAuth) {
                    sawAuth401 = true;
                    continue;
                }
                lastHttpError = new Error(body && body.error ? body.error : `Erreur ${res.status}`);
                continue;
            }
<<<<<<< HEAD

            localStorage.setItem(API_BASE_KEY, base);
            return body;
=======

            localStorage.setItem(API_BASE_KEY, base);
            return body;
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

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
=======

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
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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

 
<<<<<<< HEAD

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
=======

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
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

    const travelers = mockApi.searchTravelers ? await mockApi.searchTravelers(filters) : [];
=======

    const travelers = mockApi.searchTravelers ? await mockApi.searchTravelers(filters) : [];
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

=======

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
async function createOffer(payload) {
    return hasHttpRuntime
        ? api("/offers", { method: "POST", body: JSON.stringify(payload) }, true)
        : (mockApi.createTrip ? mockApi.createTrip(payload) : payload);
}

async function deleteOffer(offerId) {
    return api(`/offers/${offerId}`, { method: "DELETE" }, true);
}
<<<<<<< HEAD

async function createParcelRequest(payload) {
    return hasHttpRuntime
        ? api("/parcel-requests", { method: "POST", body: JSON.stringify(payload) }, true)
        : { id: Date.now(), ...payload, status: "open" };
}

=======

async function createParcelRequest(payload) {
    return hasHttpRuntime
        ? api("/parcel-requests", { method: "POST", body: JSON.stringify(payload) }, true)
        : { id: Date.now(), ...payload, status: "open" };
}

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
async function getParcelRequests(scope = "open", destination = "") {
    if (!hasHttpRuntime) return { items: [], total: 0, page: 1, pageSize: 0 };
    const params = new URLSearchParams({ scope, destination, page: "1", pageSize: "50" });
    return api(`/parcel-requests?${params.toString()}`, {}, scope === "mine");
}
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
async function getConversations() {
    return hasHttpRuntime ? api("/conversations", {}, true) : [];
}

async function deleteConversation(conversationId) {
    return api(`/conversations/${conversationId}`, { method: "DELETE" }, true);
}

async function getMessages(id) {
    return hasHttpRuntime ? api(`/conversations/${id}/messages`, {}, true) : [];
}
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
async function getAdminOverview() { return api("/admin/overview", {}, true); }
async function getAdminPendingOffers() { return api("/admin/offers/pending-verification", {}, true); }
async function verifyAdminOffer(id) { return api(`/admin/offers/${id}/verify`, { method: "PATCH" }, true); }
async function getAdminReservations() { return api("/admin/reservations", {}, true); }
async function adminSuspendReservationChat(id, reason) {
    return api(`/admin/reservations/${id}/chat/suspend`, { method: "PATCH", body: JSON.stringify({ reason }) }, true);
}
async function adminDeleteReservationChat(id) { return api(`/admin/reservations/${id}/chat`, { method: "DELETE" }, true); }
async function adminSuspendAgreement(id) { return api(`/admin/reservations/${id}/agreement/suspend`, { method: "PATCH" }, true); }
async function getAdminFlags() { return api("/admin/flags", {}, true); }
async function createAdminFlag(payload) { return api("/admin/flags", { method: "POST", body: JSON.stringify(payload) }, true); }
async function resolveAdminFlag(id) { return api(`/admin/flags/${id}/resolve`, { method: "PATCH" }, true); }
<<<<<<< HEAD

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
=======

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
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD
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

=======
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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD
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

=======
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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
async function initChat() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("message-input");
    const list = document.getElementById("conversation-list");
    const agreeBtn = document.getElementById("chat-agree-btn");
    if (!form || !input || !list) return;
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || !state.chat.activeId) return;
<<<<<<< HEAD
        input.value = "";
        await sendMessage(state.chat.activeId, text);
        await loadConversation(state.chat.activeId);
=======
        input.value = "";
        await sendMessage(state.chat.activeId, text);
        await loadConversation(state.chat.activeId);
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

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

=======

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

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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
<<<<<<< HEAD

    const user = await currentUser();
    if (!user) {
        redirectToAuth(pageTarget());
        return;
    }
=======

    const user = await currentUser();
    if (!user) {
        redirectToAuth(pageTarget());
        return;
    }
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a

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
<<<<<<< HEAD

async function initAdmin() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const user = await currentUser();
    if (!user || user.role !== "admin") {
        root.innerHTML = '<div class="glass-panel table-shell"><p>Acces admin reserve.</p></div>';
        return;
    }

    const load = async () => {
        const [overview, pendingOffers, reservations, flags] = await Promise.all([
            getAdminOverview(),
            getAdminPendingOffers(),
            getAdminReservations(),
            getAdminFlags()
        ]);

        const metrics = document.getElementById("admin-metrics");
        if (metrics) {
            metrics.innerHTML = [
                ["Utilisateurs", overview.users],
                ["Offres", overview.offers],
                ["Demandes", overview.parcelRequests],
                ["Reservations", overview.reservations],
                ["Pending reservations", overview.pendingReservations],
                ["Offres non verifiees", overview.unverifiedOffers],
                ["Flags ouverts", overview.openFlags]
            ].map(([k, v]) => `<article class="metric-card"><h4>${escapeHtml(k)}</h4><strong>${escapeHtml(v)}</strong></article>`).join("");
        }

        const pendingBody = document.getElementById("admin-pending-offers");
        if (pendingBody) {
            pendingBody.innerHTML = pendingOffers.length ? pendingOffers.map((item) => `<tr><td>#${item.id}</td><td>${escapeHtml(item.ownerName)}</td><td>${escapeHtml(item.origin)} -> ${escapeHtml(item.destination)}</td><td>${escapeHtml(item.availableKg)} kg</td><td>${escapeHtml(item.pricePerKg)} EUR/kg</td><td><button class="btn btn-primary btn-sm" data-verify-offer="${item.id}">Verifier</button></td></tr>`).join("") : '<tr><td colspan="6">Aucune offre en attente.</td></tr>';
        }

=======

async function initAdmin() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const user = await currentUser();
    if (!user || user.role !== "admin") {
        root.innerHTML = '<div class="glass-panel table-shell"><p>Acces admin reserve.</p></div>';
        return;
    }

    const load = async () => {
        const [overview, pendingOffers, reservations, flags] = await Promise.all([
            getAdminOverview(),
            getAdminPendingOffers(),
            getAdminReservations(),
            getAdminFlags()
        ]);

        const metrics = document.getElementById("admin-metrics");
        if (metrics) {
            metrics.innerHTML = [
                ["Utilisateurs", overview.users],
                ["Offres", overview.offers],
                ["Demandes", overview.parcelRequests],
                ["Reservations", overview.reservations],
                ["Pending reservations", overview.pendingReservations],
                ["Offres non verifiees", overview.unverifiedOffers],
                ["Flags ouverts", overview.openFlags]
            ].map(([k, v]) => `<article class="metric-card"><h4>${escapeHtml(k)}</h4><strong>${escapeHtml(v)}</strong></article>`).join("");
        }

        const pendingBody = document.getElementById("admin-pending-offers");
        if (pendingBody) {
            pendingBody.innerHTML = pendingOffers.length ? pendingOffers.map((item) => `<tr><td>#${item.id}</td><td>${escapeHtml(item.ownerName)}</td><td>${escapeHtml(item.origin)} -> ${escapeHtml(item.destination)}</td><td>${escapeHtml(item.availableKg)} kg</td><td>${escapeHtml(item.pricePerKg)} EUR/kg</td><td><button class="btn btn-primary btn-sm" data-verify-offer="${item.id}">Verifier</button></td></tr>`).join("") : '<tr><td colspan="6">Aucune offre en attente.</td></tr>';
        }

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
        const reservationBody = document.getElementById("admin-reservations");
        if (reservationBody) {
            reservationBody.innerHTML = reservations.length ? reservations.map((item) => {
                const suspendBtn = item.chatThreadId
                    ? `<button class="btn btn-secondary btn-sm" data-admin-suspend-chat="${item.id}" ${item.chatSuspended ? "disabled" : ""}>${item.chatSuspended ? "Chat suspendu" : "Suspendre chat"}</button>`
                    : `<span class="text-muted">Pas de chat</span>`;
                const deleteBtn = item.chatThreadId
                    ? `<button class="btn btn-secondary btn-sm" data-admin-delete-chat="${item.id}">Supprimer chat</button>`
                    : "";
                const suspendAgreementBtn = String(item.status || "") === "agreed"
                    ? `<button class="btn btn-secondary btn-sm" data-admin-suspend-agreement="${item.id}">Suspendre accord</button>`
                    : "";
                return `<tr>
                    <td>#${item.id}</td>
                    <td>${escapeHtml(item.requesterName)}</td>
                    <td>${escapeHtml(item.offerOwnerName)}</td>
                    <td>${escapeHtml(item.destination)}</td>
                    <td>${reservationStatusBadge(item.status)}</td>
                    <td>${escapeHtml(item.proposedPricePerKg || "-")}</td>
                    <td><div class="admin-actions">${suspendBtn}${deleteBtn}${suspendAgreementBtn}</div></td>
                </tr>`;
            }).join("") : '<tr><td colspan="7">Aucune reservation.</td></tr>';
        }
<<<<<<< HEAD

        const flagBody = document.getElementById("admin-flags");
        if (flagBody) {
            flagBody.innerHTML = flags.length ? flags.map((item) => `<tr><td>#${item.id}</td><td>${escapeHtml(item.entityType)}:${escapeHtml(item.entityId)}</td><td>${escapeHtml(item.reason)}</td><td><span class="status-chip status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.status === "open" ? `<button class="btn btn-secondary btn-sm" data-resolve-flag="${item.id}">Resoudre</button>` : "-"}</td></tr>`).join("") : '<tr><td colspan="5">Aucun flag.</td></tr>';
        }
    };

    await load();

    const pendingBody = document.getElementById("admin-pending-offers");
    if (pendingBody && !pendingBody.dataset.bound) {
        pendingBody.dataset.bound = "true";
        pendingBody.addEventListener("click", async (event) => {
            const btn = event.target.closest("[data-verify-offer]");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-verify-offer"));
            if (!id) return;
            await verifyAdminOffer(id);
            await load();
        });
    }

    const flagBody = document.getElementById("admin-flags");
    if (flagBody && !flagBody.dataset.bound) {
        flagBody.dataset.bound = "true";
        flagBody.addEventListener("click", async (event) => {
            const btn = event.target.closest("[data-resolve-flag]");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-resolve-flag"));
            if (!id) return;
            await resolveAdminFlag(id);
            await load();
        });
=======

        const flagBody = document.getElementById("admin-flags");
        if (flagBody) {
            flagBody.innerHTML = flags.length ? flags.map((item) => `<tr><td>#${item.id}</td><td>${escapeHtml(item.entityType)}:${escapeHtml(item.entityId)}</td><td>${escapeHtml(item.reason)}</td><td><span class="status-chip status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${item.status === "open" ? `<button class="btn btn-secondary btn-sm" data-resolve-flag="${item.id}">Resoudre</button>` : "-"}</td></tr>`).join("") : '<tr><td colspan="5">Aucun flag.</td></tr>';
        }
    };

    await load();

    const pendingBody = document.getElementById("admin-pending-offers");
    if (pendingBody && !pendingBody.dataset.bound) {
        pendingBody.dataset.bound = "true";
        pendingBody.addEventListener("click", async (event) => {
            const btn = event.target.closest("[data-verify-offer]");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-verify-offer"));
            if (!id) return;
            await verifyAdminOffer(id);
            await load();
        });
    }

    const flagBody = document.getElementById("admin-flags");
    if (flagBody && !flagBody.dataset.bound) {
        flagBody.dataset.bound = "true";
        flagBody.addEventListener("click", async (event) => {
            const btn = event.target.closest("[data-resolve-flag]");
            if (!btn) return;
            const id = Number(btn.getAttribute("data-resolve-flag"));
            if (!id) return;
            await resolveAdminFlag(id);
            await load();
        });
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
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

            const deleteBtn = event.target.closest("[data-admin-delete-chat]");
            if (deleteBtn) {
                const id = Number(deleteBtn.getAttribute("data-admin-delete-chat"));
                if (!id) return;
                const confirmed = window.confirm("Supprimer definitivement ce chat pour les deux utilisateurs ?");
                if (!confirmed) return;
                await adminDeleteReservationChat(id);
                await load();
                return;
            }

            const suspendAgreementBtn = event.target.closest("[data-admin-suspend-agreement]");
            if (suspendAgreementBtn) {
                const id = Number(suspendAgreementBtn.getAttribute("data-admin-suspend-agreement"));
                if (!id) return;
                const confirmed = window.confirm("Suspendre cet accord et remettre la reservation en attente ?");
                if (!confirmed) return;
                await adminSuspendAgreement(id);
                await load();
            }
        });
    }
<<<<<<< HEAD

    const flagForm = document.getElementById("admin-flag-form");
    if (flagForm && !flagForm.dataset.bound) {
        flagForm.dataset.bound = "true";
        flagForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = {
                entityType: document.getElementById("flag-entity-type")?.value?.trim() || "offer",
                entityId: Number(document.getElementById("flag-entity-id")?.value || 0),
                reason: document.getElementById("flag-reason")?.value?.trim() || ""
            };
            if (!payload.entityId || !payload.reason) {
                alert("Remplissez entity id et motif.");
                return;
            }
            await createAdminFlag(payload);
            flagForm.reset();
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
=======

    const flagForm = document.getElementById("admin-flag-form");
    if (flagForm && !flagForm.dataset.bound) {
        flagForm.dataset.bound = "true";
        flagForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = {
                entityType: document.getElementById("flag-entity-type")?.value?.trim() || "offer",
                entityId: Number(document.getElementById("flag-entity-id")?.value || 0),
                reason: document.getElementById("flag-reason")?.value?.trim() || ""
            };
            if (!payload.entityId || !payload.reason) {
                alert("Remplissez entity id et motif.");
                return;
            }
            await createAdminFlag(payload);
            flagForm.reset();
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
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
