(() => {
    const feedback = document.getElementById("auth-feedback");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    function setFeedback(message = "", isError = true) {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.style.color = isError ? "#ffc8b7" : "#aef6d2";
    }

    async function submitLogin(event) {
        event.preventDefault();
        const email = String(document.getElementById("login-email")?.value || "").trim();
        const password = String(document.getElementById("login-password")?.value || "");

        const payload = await window.CCCommon.api("/api/auth/login", {
            method: "POST",
            auth: false,
            body: { email, password }
        });

        window.CCCommon.setSession(payload.token, payload.user);
        setFeedback("Connexion reussie.", false);

        const completion = window.CCCommon.getProfileCompletion(payload.user);
        if (completion.percent < 75 && payload.user?.role !== 'admin') {
            window.location.href = window.CCCommon.nextPath("verification.html");
        } else {
            window.location.href = window.CCCommon.nextPath("dashboard.html");
        }
    }

    async function submitRegister(event) {
        event.preventDefault();
        const fullName = String(document.getElementById("register-name")?.value || "").trim();
        const email = String(document.getElementById("register-email")?.value || "").trim();
        const password = String(document.getElementById("register-password")?.value || "");

        const role = String(document.getElementById("register-role")?.value || "user").trim();
        const country = String(document.getElementById("register-country")?.value || "").trim();

        const payload = await window.CCCommon.api("/api/auth/register", {
            method: "POST",
            auth: false,
            body: { fullName, email, password, role, country }
        });

        window.CCCommon.setSession(payload.token, payload.user);
        setFeedback("Inscription reussie.", false);

        const completion = window.CCCommon.getProfileCompletion(payload.user);
        if (completion.percent < 75 && role !== 'admin') {
            window.location.href = window.CCCommon.nextPath("verification.html");
        } else {
            window.location.href = window.CCCommon.nextPath("dashboard.html");
        }
    }

    function resetRegisterView() {
        document.getElementById("register-selection-panel")?.classList.remove("hidden");
        document.getElementById("register-fields-panel")?.classList.add("hidden");
        const roleBtn = document.getElementById("register-role");
        if (roleBtn) roleBtn.value = "user";
        document.querySelectorAll(".selection-card").forEach(c => c.classList.remove("is-active"));
    }

    async function bootstrap() {
        await window.CCCommon.init();

        if (window.CCCommon.state.user && window.CCCommon.state.token) {
            const completion = window.CCCommon.getProfileCompletion(window.CCCommon.state.user);
            if (completion.percent < 75 && window.CCCommon.state.user?.role !== 'admin') {
                window.location.href = window.CCCommon.nextPath("verification.html");
            } else {
                window.location.href = window.CCCommon.nextPath("dashboard.html");
            }
            return;
        }

        loginForm?.addEventListener("submit", (event) => {
            submitLogin(event).catch((error) => setFeedback(error.message || "Connexion impossible."));
        });

        registerForm?.addEventListener("submit", (event) => {
            submitRegister(event).catch((error) => setFeedback(error.message || "Inscription impossible."));
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

        // Populate country datalist
        const datalist = document.getElementById("country-datalist");
        const options = window.CCCommon.COUNTRY_OPTIONS;
        if (datalist && options) {
            datalist.innerHTML = options.map(c => `<option value="${c}">`).join("");
        }
    }

    bootstrap().catch((error) => {
        setFeedback(error.message || "Initialisation impossible.");
    });
})();
