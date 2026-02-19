<<<<<<< HEAD
﻿const AUTH_TOKEN_KEY = "cc_auth_token";
const API_BASE_KEY = "cc_api_base";

if (window.location.protocol === "file:") {
    const fileName = window.location.pathname.split("/").pop() || "auth.html";
    const target = `http://127.0.0.1:8080/${fileName}${window.location.search || ""}${window.location.hash || ""}`;
    window.location.replace(target);
}

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

function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("returnTo");
    if (!url) return "index.html";
    return url.startsWith("/") || url.includes("http") ? "index.html" : url;
}

function setFeedback(message, isError = false) {
    const node = document.getElementById("auth-feedback");
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? "#fecaca" : "#86efac";
}

async function backendFetch(path, options = {}, withAuth = false) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (withAuth) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const bases = resolveApiBases();
    let lastHttpError = null;
    let sawAuth401 = false;

    for (const base of bases) {
        const url = `${base}/api${path}`;
        try {
            const response = await fetch(url, { ...options, headers });
            const raw = await response.text();
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }

=======
﻿const AUTH_TOKEN_KEY = "cc_auth_token";
const API_BASE_KEY = "cc_api_base";

if (window.location.protocol === "file:") {
    const fileName = window.location.pathname.split("/").pop() || "auth.html";
    const target = `http://127.0.0.1:8080/${fileName}${window.location.search || ""}${window.location.hash || ""}`;
    window.location.replace(target);
}

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

function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("returnTo");
    if (!url) return "index.html";
    return url.startsWith("/") || url.includes("http") ? "index.html" : url;
}

function setFeedback(message, isError = false) {
    const node = document.getElementById("auth-feedback");
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? "#fecaca" : "#86efac";
}

async function backendFetch(path, options = {}, withAuth = false) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (withAuth) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const bases = resolveApiBases();
    let lastHttpError = null;
    let sawAuth401 = false;

    for (const base of bases) {
        const url = `${base}/api${path}`;
        try {
            const response = await fetch(url, { ...options, headers });
            const raw = await response.text();
            let body = null;
            try {
                body = raw ? JSON.parse(raw) : null;
            } catch {
                body = null;
            }

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
            if (!response.ok) {
                if (response.status === 401 && withAuth) {
                    sawAuth401 = true;
                    continue;
                }
                const errorMessage = body && body.error ? body.error : `Erreur ${response.status}`;
                lastHttpError = new Error(errorMessage);
                continue;
            }
<<<<<<< HEAD

            localStorage.setItem(API_BASE_KEY, base);
            return body;
        } catch {
            // Try next candidate base.
        }
    }

=======

            localStorage.setItem(API_BASE_KEY, base);
            return body;
        } catch {
            // Try next candidate base.
        }
    }

>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
    if (sawAuth401 && withAuth) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        throw new Error("AUTH_REQUIRED");
    }

    if (lastHttpError) {
        throw lastHttpError;
    }
<<<<<<< HEAD

    throw new Error("Impossible de contacter le serveur. Lancez http://127.0.0.1:8080");
}

function setLoggedInView(user) {
    const panel = document.getElementById("account-panel");
    const text = document.getElementById("account-text");
    if (panel && text) {
        panel.hidden = false;
        text.textContent = `${user.fullName} (${user.email})`;
    }

    const loginLink = document.querySelector("[data-auth-login]");
    const registerLink = document.querySelector("[data-auth-register]");
    if (loginLink) {
        loginLink.textContent = user.fullName;
        loginLink.href = "auth.html";
    }
    if (registerLink) {
        registerLink.textContent = "Déconnexion";
        registerLink.href = "#";
        registerLink.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
                await backendFetch("/auth/logout", { method: "POST" }, true);
            } catch {
                // ignore
            }
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = "index.html";
        });
    }

    document.querySelectorAll("[data-admin-link]").forEach((node) => {
        node.hidden = user.role !== "admin";
    });
}

async function loadCurrentUser() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
        const result = await backendFetch("/auth/me", {}, true);
        if (result && result.user) {
            setLoggedInView(result.user);
        }
=======

    throw new Error("Impossible de contacter le serveur. Lancez http://127.0.0.1:8080");
}

function setLoggedInView(user) {
    const panel = document.getElementById("account-panel");
    const text = document.getElementById("account-text");
    if (panel && text) {
        panel.hidden = false;
        text.textContent = `${user.fullName} (${user.email})`;
    }

    const loginLink = document.querySelector("[data-auth-login]");
    const registerLink = document.querySelector("[data-auth-register]");
    if (loginLink) {
        loginLink.textContent = user.fullName;
        loginLink.href = "auth.html";
    }
    if (registerLink) {
        registerLink.textContent = "Déconnexion";
        registerLink.href = "#";
        registerLink.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
                await backendFetch("/auth/logout", { method: "POST" }, true);
            } catch {
                // ignore
            }
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = "index.html";
        });
    }

    document.querySelectorAll("[data-admin-link]").forEach((node) => {
        node.hidden = user.role !== "admin";
    });
}

async function loadCurrentUser() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
        const result = await backendFetch("/auth/me", {}, true);
        if (result && result.user) {
            setLoggedInView(result.user);
        }
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
    } catch (error) {
        if (error && error.message === "AUTH_REQUIRED") {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            document.querySelectorAll("[data-admin-link]").forEach((node) => {
                node.hidden = true;
            });
        }
    }
}
<<<<<<< HEAD

function bindForms() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const logoutBtn = document.getElementById("logout-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            try {
                const result = await backendFetch("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                localStorage.setItem(AUTH_TOKEN_KEY, result.token);
                setFeedback("Connexion réussie.");
                window.location.href = getReturnUrl();
            } catch (error) {
                setFeedback(error.message, true);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const fullName = document.getElementById("register-name").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const password = document.getElementById("register-password").value;

            try {
                const result = await backendFetch("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ fullName, email, password })
                });
                localStorage.setItem(AUTH_TOKEN_KEY, result.token);
                setFeedback("Compte créé avec succès.");
                window.location.href = getReturnUrl();
            } catch (error) {
                setFeedback(error.message, true);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await backendFetch("/auth/logout", { method: "POST" }, true);
            } catch {
                // ignore
            }
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = "index.html";
        });
    }
}

function openRegisterFromHash() {
    if (window.location.hash !== "#register") return;
    const card = document.getElementById("register-card");
    if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll("[data-animate]").forEach((node) => node.classList.add("is-visible"));
    bindForms();
    openRegisterFromHash();
    await loadCurrentUser();
});
=======

function bindForms() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const logoutBtn = document.getElementById("logout-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            try {
                const result = await backendFetch("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                localStorage.setItem(AUTH_TOKEN_KEY, result.token);
                setFeedback("Connexion réussie.");
                window.location.href = getReturnUrl();
            } catch (error) {
                setFeedback(error.message, true);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const fullName = document.getElementById("register-name").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const password = document.getElementById("register-password").value;

            try {
                const result = await backendFetch("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ fullName, email, password })
                });
                localStorage.setItem(AUTH_TOKEN_KEY, result.token);
                setFeedback("Compte créé avec succès.");
                window.location.href = getReturnUrl();
            } catch (error) {
                setFeedback(error.message, true);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await backendFetch("/auth/logout", { method: "POST" }, true);
            } catch {
                // ignore
            }
            localStorage.removeItem(AUTH_TOKEN_KEY);
            window.location.href = "index.html";
        });
    }
}

function openRegisterFromHash() {
    if (window.location.hash !== "#register") return;
    const card = document.getElementById("register-card");
    if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll("[data-animate]").forEach((node) => node.classList.add("is-visible"));
    bindForms();
    openRegisterFromHash();
    await loadCurrentUser();
});
>>>>>>> 3cd5b03ac341107952511772ee29f9fbb136fe7a
