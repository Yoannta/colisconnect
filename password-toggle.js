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
