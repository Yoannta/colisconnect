// responsive.js 
(() => {
    const MOBILE_BREAKPOINT = 800;

    function updateMode() {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const doc = document.documentElement;
        doc.classList.toggle("mobile-mode", isMobile);
        doc.classList.toggle("desktop-mode", !isMobile);
        doc.classList.add("mode-ready");
    }

    window.addEventListener("resize", updateMode);
    // Execute immediately in case the inline script was missed or for resizing
    updateMode();
})();
 
// password-toggle.js 
(() => {
    const TOGGLE_CLASS = "password-visibility-toggle";

    function createToggle(input) {
        const wrapper = input.parentElement;
        if (!wrapper) return;
        if (wrapper.classList.contains("password-wrapper")) {
            const existing = wrapper.querySelector(`.${TOGGLE_CLASS}`);
            if (existing) return;
        } else {
            wrapper.classList.add("password-wrapper");
            input.style.paddingRight = "44px";
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = TOGGLE_CLASS;
        button.setAttribute("aria-label", "Afficher le mot de passe");
        button.innerHTML = "<svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true'><path stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M1 12s4-6 11-6 11 6 11 6-4 6-11 6-11-6-11-6z'></path><circle cx='12' cy='12' r='3' fill='currentColor'></circle></svg>";
        button.addEventListener("click", () => {
            const isVisible = input.type === "text";
            input.type = isVisible ? "password" : "text";
            button.classList.toggle("visible", !isVisible);
            button.setAttribute("aria-label", isVisible ? "Afficher le mot de passe" : "Masquer le mot de passe");
        });
        wrapper.appendChild(button);
    }

    function attachToggles(root = document) {
        const inputs = root.querySelectorAll("input[type='password']");
        inputs.forEach((input) => {
            if (input.dataset.toggleAttached === "true") return;
            input.dataset.toggleAttached = "true";
            createToggle(input);
        });
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                attachToggles(node);
            });
        });
    });

    document.addEventListener("DOMContentLoaded", () => {
        attachToggles();
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
 
// admin-banner.js 
(() => {
    const BANNER_ID = "admin-rejection-banner";
    const MAX_ATTEMPTS = 12;
    const RETRY_DELAY = 300;
    let attempts = 0;

    function createBanner() {
        if (document.getElementById(BANNER_ID)) return;
        const banner = document.createElement("div");
        banner.id = BANNER_ID;
        banner.className = "admin-alert hidden";
        banner.innerHTML = `
            <span class="admin-alert-icon">!</span>
            <span class="admin-alert-text">Votre CNI/Passeport a été refusé pour non-conformité. Veuillez en uploader un nouveau.</span>
            <button class="admin-alert-close" aria-label="Fermer">✓</button>
        `;
        document.body?.appendChild(banner);
        banner.querySelector(".admin-alert-close")?.addEventListener("click", () => {
            banner.classList.add("hidden");
        });
    }

    function showBanner(text) {
        const banner = document.getElementById(BANNER_ID);
        if (!banner) return;
        const textEl = banner.querySelector(".admin-alert-text");
        if (textEl) textEl.textContent = text;
        banner.classList.remove("hidden");
    }

    async function fetchInbox() {
        if (!window.CCCommon || !window.CCCommon.state || !window.CCCommon.state.token) return;
        try {
            const payload = await window.CCCommon.api("/api/admin/inbox");
            const items = Array.isArray(payload?.items) ? payload.items : [];
            const rejection = items.find((item) => {
                const section = String(item.section || "").toLowerCase();
                const text = String(item.text || "").toLowerCase();
                return (section === "identitydocument" || section === "profilephoto") &&
                    /non-conform|non conforme|non-conformité|refus/i.test(text);
            });
            if (rejection) {
                const message = rejection.text || "Votre document a été rejeté. Veuillez uploader une version conforme.";
                showBanner(message);
            }
        } catch {
            // ignore
        }
    }

    function waitForCCCommon() {
        if (++attempts > MAX_ATTEMPTS) return;
        if (window.CCCommon && window.CCCommon.state && window.CCCommon.state.token !== undefined) {
            fetchInbox();
            return;
        }
        setTimeout(waitForCCCommon, RETRY_DELAY);
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (!localStorage.getItem("cc_token")) return;
        createBanner();
        waitForCCCommon();
    });
})();
