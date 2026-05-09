(() => {
    function attach(input) {
        const listId = input.getAttribute("list");
        if (!listId || input.dataset.datalistPatched === "true") return;
        input.dataset.datalistPatched = "true";
        input.setAttribute("autocomplete", "off");

        input.addEventListener("mousedown", () => {
            if (document.activeElement !== input) {
                setTimeout(() => {
                    input.select();
                    if (typeof input.showPicker === "function") {
                        try { input.showPicker(); } catch (e) { }
                    }
                }, 10);
            }
        });

        input.addEventListener("focus", () => {
            if (!input.value && typeof input.showPicker === "function") {
                try { input.showPicker(); } catch (e) { }
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("input[list]").forEach(attach);
    });
})();
