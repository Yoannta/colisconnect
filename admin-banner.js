(() => {
    const BANNER_ID = "admin-rejection-banner";

    function createBanner() {
        if (document.getElementById(BANNER_ID)) return;
        const banner = document.createElement("div");
        banner.id = BANNER_ID;
        banner.className = "admin-alert hidden";
        banner.innerHTML = `
            <span class="admin-alert-icon">!</span>
            <span class="admin-alert-text">Votre CNI/Passeport a été refusé pour non-conformité. Veuillez en uploader un nouveau.</span>
            <button class="admin-alert-close" aria-label="Fermer">✕</button>
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
        if (window.CCCommon && window.CCCommon.state && window.CCCommon.state.token !== undefined) {
            fetchInbox();
        } else {
            setTimeout(waitForCCCommon, 300);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        createBanner();
        waitForCCCommon();
    });
})();
