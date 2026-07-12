(() => {
    /** 
     * COLISCONNECT PREMIUM AUTOCOMPLETE (2025 Standard)
     * Remplace le système de datalist natif par une expérience fluide, stylisée et robuste.
     * Supporte : filtrage intelligent (substring + accents), navigation clavier, design premium.
     **/

    // Injection des styles Premium
    const style = document.createElement('style');
    style.textContent = `
        .cc-autocomplete-container {
            position: absolute;
            z-index: 2147483647;
            background: rgba(10, 15, 20, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(19, 236, 200, 0.3);
            border-radius: 12px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.6), 0 0 15px rgba(19, 236, 200, 0.1);
            max-height: 280px;
            overflow-y: auto;
            margin-top: 4px;
            scrollbar-width: thin;
            scrollbar-color: #13ecc8 transparent;
            animation: ccFadeIn 0.15s ease-out;
        }
        .cc-autocomplete-container::-webkit-scrollbar { width: 6px; }
        .cc-autocomplete-container::-webkit-scrollbar-thumb { background: #13ecc8; border-radius: 10px; }
        
        .cc-autocomplete-item {
            padding: 12px 16px;
            color: #f0f7f6;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .cc-autocomplete-item:last-child { border-bottom: none; }
        .cc-autocomplete-item:hover, .cc-autocomplete-item.is-selected {
            background: rgba(19, 236, 200, 0.15);
            color: #13ecc8;
            padding-left: 20px;
        }
        @keyframes ccFadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    function normalize(text) {
        return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function isCountrySelect(input) {
        const listId = String(input.getAttribute("list") || "");
        const id = String(input.id || "");
        const name = String(input.name || "");
        const placeholder = String(input.getAttribute("placeholder") || "");
        const labelText = String(input.closest("label")?.textContent || "");
        const explicit = input.dataset.countrySelect === "true" || input.classList.contains("country-select-input");
        const countryList = /country|pays|destination-list|demande-country|offer-country/i.test(listId);
        const countryField = /country|origin|destination|departure|dest|est-origin|est-dest|demande/i.test(`${id} ${name}`);
        const countryCopy = /pays|destination|arriv|depart|départ|choisir un pays/i.test(`${placeholder} ${labelText}`);
        return explicit || (countryList && (countryField || countryCopy));
    }

    function attach(input) {
        const listId = input.getAttribute("list");
        if (!listId || input.dataset.ccAutoAttached === "true") return;

        const datalist = document.getElementById(listId);
        if (!datalist) return;
        const countrySelect = isCountrySelect(input);

        // Détachement du système natif pour éviter les conflits
        input.removeAttribute("list");
        input.setAttribute("autocomplete", "off");
        input.dataset.ccAutoAttached = "true";
        if (countrySelect) {
            input.dataset.countrySelect = "true";
            input.readOnly = true;
            input.setAttribute("aria-haspopup", "listbox");
            input.setAttribute("role", "combobox");
        }

        let container = null;
        let originalOptions = [];
        let selectedIndex = -1;
        let isSelecting = false;

        const syncOptions = () => {
            const current = Array.from(datalist.options).map(o => o.value);
            if (current.length > originalOptions.length || originalOptions.length === 0) {
                originalOptions = current;
            }
        };

        const closeMenu = () => {
            if (container) {
                container.remove();
                container = null;
                selectedIndex = -1;
            }
        };

        const selectItem = (val) => {
            isSelecting = true;
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            isSelecting = false;
            closeMenu();
        };

        const renderItems = (query = "") => {
            syncOptions();
            const normQuery = normalize(query);

            const filtered = normQuery === ""
                ? originalOptions
                : originalOptions.filter(opt => normalize(opt).includes(normQuery));

            if (filtered.length === 0) {
                closeMenu();
                return;
            }

            if (!container) {
                container = document.createElement('div');
                container.className = 'cc-autocomplete-container';
                document.body.appendChild(container);

                // Empêcher la perte de focus de l'input lors du clic dans le container
                container.addEventListener('mousedown', (e) => e.preventDefault());
            }

            // Positionnement dynamique
            const rect = input.getBoundingClientRect();
            container.style.width = rect.width + 'px';
            container.style.left = (rect.left + window.scrollX) + 'px';
            container.style.top = (rect.bottom + window.scrollY) + 'px';

            container.innerHTML = filtered.map((opt, idx) => {
                const selectedClass = idx === selectedIndex ? 'is-selected' : '';
                return `<div class="cc-autocomplete-item ${selectedClass}" data-value="${opt}">${opt}</div>`;
            }).join("");

            const items = container.querySelectorAll('.cc-autocomplete-item');
            items.forEach((item, idx) => {
                item.addEventListener('click', () => selectItem(item.dataset.value));
            });

            // Scrolling auto pour l'élément sélectionné
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        };

        input.addEventListener('input', (e) => {
            if (countrySelect && !isSelecting) {
                input.value = "";
                selectedIndex = -1;
                renderItems("");
                return;
            }
            selectedIndex = -1;
            renderItems(e.target.value);
        });

        input.addEventListener('focus', () => {
            syncOptions();
            renderItems(countrySelect ? "" : input.value);
        });

        input.addEventListener('click', () => {
            if (!countrySelect) return;
            syncOptions();
            renderItems("");
        });

        input.addEventListener('blur', () => {
            // Un petit délai pour permettre au clic sur un item de passer
            setTimeout(closeMenu, 200);
        });

        input.addEventListener('keydown', (e) => {
            if (countrySelect && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                renderItems("");
                return;
            }
            if (!container) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    renderItems(countrySelect ? "" : input.value);
                }
                return;
            }
            const items = container.querySelectorAll('.cc-autocomplete-item');

            if (e.key === "ArrowDown") {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                renderItems(countrySelect ? "" : input.value);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                renderItems(countrySelect ? "" : input.value);
            } else if (e.key === "Enter") {
                if (selectedIndex > -1 && items[selectedIndex]) {
                    e.preventDefault();
                    selectItem(items[selectedIndex].dataset.value);
                }
            } else if (e.key === "Escape") {
                closeMenu();
            }
        });
    }

    const scan = () => document.querySelectorAll("input[list]").forEach(attach);

    // Bootstrap
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scan);
    } else {
        scan();
    }

    // Dynamic Watcher
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true });
})();
