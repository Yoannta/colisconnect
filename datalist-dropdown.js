(() => {
    const overlay = document.createElement("div");
    overlay.className = "datalist-dropdown-overlay";
    overlay.style.display = "none";
    document.body.appendChild(overlay);

    let activeInput = null;

    function buildList(input) {
        const listId = input.getAttribute("list");
        if (!listId) return [];
        const datalist = document.getElementById(listId);
        if (!datalist) return [];
        return Array.from(datalist.options).map((option) => ({
            label: option.value || option.textContent,
            value: option.value || option.textContent
        })).filter((item) => item.value);
    }

    function showOverlay(input) {
        const items = buildList(input);
        if (!items.length) return;
        overlay.innerHTML = "";
        items.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "datalist-dropdown-item";
            button.textContent = item.label;
            button.addEventListener("click", () => {
                input.value = item.value;
                hideOverlay();
                input.dispatchEvent(new Event("input", { bubbles: true }));
            });
            overlay.appendChild(button);
        });
        const rect = input.getBoundingClientRect();
        overlay.style.display = "grid";
        overlay.style.left = `${Math.round(rect.left)}px`;
        overlay.style.top = `${Math.round(rect.bottom + window.scrollY)}px`;
        overlay.style.width = `${Math.round(rect.width)}px`;
        activeInput = input;
    }

    function hideOverlay() {
        overlay.style.display = "none";
        activeInput = null;
    }

    document.addEventListener("click", (event) => {
        if (!activeInput) return;
        if (event.target === activeInput || overlay.contains(event.target)) return;
        hideOverlay();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideOverlay();
    });

    function attach(input) {
        input.addEventListener("focus", () => showOverlay(input));
        input.addEventListener("mousedown", (event) => {
            event.preventDefault();
            showOverlay(input);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const inputs = document.querySelectorAll("input[list]");
        inputs.forEach(attach);
    });
})();
