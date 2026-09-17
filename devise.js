/* ============================================================================
   DEVISE — MODÈLE UNIQUE DU SITE  (Yoyo)
   ----------------------------------------------------------------------------
   Source de référence : le sélecteur de devise du formulaire de PUBLICATION DES
   OFFRES (post_trip.html). Ce fichier en fait LE modèle général du site.

   Trois briques, à utiliser partout (offres, demandes, dashboard, futures pages) :
     1. CCDevise.optionsForCountries(paysDepart, paysArrivee, opts)
            -> quelles devises proposer + leurs libellés (départ / arrivée / compte)
     2. CCDevise.picker(conteneur, opts)
            -> la liste déroulante (bouton arrondi + bulle) : look et
               comportement identiques sur toutes les pages
     3. CCDevise.symbol(code) / CCDevise.name(code)
            -> les libellés affichés ("FCFA", "EUR", ...)

   Règle : une nouvelle page qui doit choisir ou afficher une devise monte
   CCDevise.picker() (ou utilise symbol()). Aucun menu de devise ne doit être
   réécrit à la main quelque part : c'est ce qui évitait d'avoir plusieurs
   formats différents selon les formulaires.

   Le style de ce composant vit dans style.css, section
   "DEVISE — MODÈLE UNIQUE" (classes .cc-cur*), avec ses variantes mode clair.
   ========================================================================= */
(function () {
    "use strict";

    const CARET =
        '<svg class="cc-cur-caret-svg" viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
        'stroke="currentColor" stroke-width="3" aria-hidden="true">' +
        '<polyline points="6 9 12 15 18 9"></polyline></svg>';

    const cc = () => window.CCCommon || {};
    const esc = (s) => (cc().escapeHtml ? cc().escapeHtml(String(s == null ? "" : s))
        : String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

    /** Acronyme lisible d'une devise : "XOF" -> "FCFA". */
    function symbol(code) {
        return cc().currencySymbol ? cc().currencySymbol(code) : String(code || "");
    }

    /** Nom complet d'une devise : "XOF" -> "Franc CFA (BCEAO)". */
    function name(code) {
        return cc().currencyName ? cc().currencyName(code) : String(code || "");
    }

    // ── Pays -> devise (accents/majuscules tolérés : "Côte d'Ivoire" = "cote divoire")
    let countryMap = null;
    function normKey(s) {
        return String(s || "").trim().toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    }

    function currencyOfCountry(raw) {
        const table = cc().COUNTRY_CURRENCIES || {};
        const v = String(raw || "").trim();
        if (!v) return "";
        if (table[v]) return table[v];
        if (!countryMap) {
            countryMap = {};
            Object.keys(table).forEach((k) => { countryMap[normKey(k)] = table[k]; });
        }
        return countryMap[normKey(v)] || "";
    }

    /** Deux devises peuvent partager le même acronyme (FCFA = XOF/XAF,
     *  "kr" = SEK/NOK/DKK) : dans ce cas seulement, on précise la zone. */
    function clarify(options) {
        const syms = options.map((o) => symbol(o.value));
        if (new Set(syms).size >= options.length) return options;
        return options.map((o) => {
            const full = name(o.value) || "";
            const court = (full.match(/\(([^)]+)\)\s*$/) || [null, full])[1];
            return { value: o.value, label: o.label + " (" + court + ")", name: full };
        });
    }

    /**
     * Devises à proposer pour un trajet : pays de départ d'abord, puis pays
     * d'arrivée s'il est différent.
     *   opts.fallback      : devise utilisée quand le pays est inconnu/vide
     *   opts.requireKnown  : true -> si AUCUN pays n'est reconnu, on ne propose
     *                        que la devise du compte (libellé "Devise du compte")
     * Retour : [{ value: "XOF", label: "Pays de départ" }, ...]
     */
    function optionsForCountries(origin, destination, opts) {
        const o = opts || {};
        const fb = o.fallback ? String(o.fallback).toUpperCase() : "";
        const dep = currencyOfCountry(origin);
        const dst = currencyOfCountry(destination);
        const list = [];
        if (o.requireKnown) {
            if (dep) list.push({ value: dep, label: "Pays de départ" });
            if (dst && dst !== dep) list.push({ value: dst, label: "Pays d'arrivée" });
            if (!list.length && fb) list.push({ value: fb, label: "Devise du compte" });
        } else {
            const d1 = dep || fb;
            const d2 = dst || fb;
            if (d1) list.push({ value: d1, label: "Pays de départ" });
            if (d2 && d2 !== d1) list.push({ value: d2, label: "Pays d'arrivée" });
        }
        return clarify(list);
    }

    /**
     * Monte LE sélecteur de devise dans un conteneur.
     *   conteneur       : élément hôte (ex. <div id="currency-selector-wrap">)
     *   opts.value      : devise de départ (sinon la valeur du champ caché)
     *   opts.options    : [{ value, label }] -> voir optionsForCountries()
     *   opts.inputId    : id d'un <input type="hidden"> à tenir à jour
     *   opts.btnId / opts.labelId / opts.popId : ids à conserver (compatibilité)
     *   opts.placeholder: texte quand aucune devise (défaut "Devise")
     *   opts.onChange   : appelé quand l'utilisateur choisit une devise
     * Retour : { el, get(), set(code), setOptions(list), open(), close() }
     */
    function picker(host, opts) {
        if (!host) return null;
        const o = opts || {};
        let options = Array.isArray(o.options) ? o.options.slice() : [];
        const hidden = o.inputId ? document.getElementById(o.inputId) : null;
        const placeholder = o.placeholder || "Devise";
        let current = String(o.value || (hidden && hidden.value) || "").toUpperCase();

        host.classList.add("cc-cur");
        host.innerHTML =
            '<button type="button" class="cc-cur-btn" aria-haspopup="listbox" aria-expanded="false"' +
            (o.btnId ? ' id="' + o.btnId + '"' : "") + ' title="Choisir la devise">' +
                '<span class="cc-cur-val"' + (o.labelId ? ' id="' + o.labelId + '"' : "") + ">" +
                    esc(placeholder) + "</span>" + CARET +
            "</button>" +
            '<div class="cc-cur-pop hidden" role="listbox"' +
            (o.popId ? ' id="' + o.popId + '"' : "") + "></div>";

        const btn = host.querySelector(".cc-cur-btn");
        const label = host.querySelector(".cc-cur-val");
        const pop = host.querySelector(".cc-cur-pop");

        const close = () => {
            pop.hidden = true;
            pop.classList.add("hidden");
            btn.setAttribute("aria-expanded", "false");
        };
        const open = () => {
            // Une seule bulle ouverte à la fois sur la page
            document.querySelectorAll(".cc-cur-pop").forEach((p) => {
                if (p === pop) return;
                p.hidden = true;
                p.classList.add("hidden");
                p.parentElement?.querySelector(".cc-cur-btn")?.setAttribute("aria-expanded", "false");
            });
            pop.hidden = false;
            pop.classList.remove("hidden");
            btn.setAttribute("aria-expanded", "true");
        };

        const paint = () => {
            if (options.length) {
                pop.innerHTML = options.map((opt) => (
                    '<button type="button" class="cc-cur-opt" role="option" data-value="' + esc(opt.value) +
                    '" aria-selected="' + (opt.value === current) + '">' +
                        '<span class="cc-cur-opt-sym">' + esc(symbol(opt.value)) + "</span>" +
                        '<span class="cc-cur-opt-lbl">' + esc(opt.label || "") + "</span>" +
                    "</button>"
                )).join("");
            } else {
                pop.innerHTML = '<div class="cc-cur-empty">Devise indisponible</div>';
            }
            const known = options.some((opt) => opt.value === current);
            label.textContent = (current && known) ? symbol(current) : placeholder;
            if (hidden) hidden.value = current;
        };

        const apply = (code, notify) => {
            current = String(code || "").toUpperCase();
            paint();
            if (notify && typeof o.onChange === "function") o.onChange(current);
        };

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pop.hidden || pop.classList.contains("hidden")) open(); else close();
        });
        pop.addEventListener("click", (e) => {
            const opt = e.target.closest(".cc-cur-opt");
            if (!opt) return;
            e.preventDefault();
            e.stopPropagation();
            apply(opt.dataset.value, true);
            close();
        });
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".cc-cur")) close();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
        });

        paint();

        const api = {
            el: host,
            get: () => current,
            set: (code) => apply(code, false),
            /**
             * Remplace la liste ; si la devise affichée n'y est plus, on recale.
             * opts.keepEmpty (à la création) : tant que l'utilisateur n'a rien
             * choisi on laisse « Devise » au lieu de sélectionner la 1re devise
             * (comportement du formulaire des offres).
             */
            setOptions(list) {
                options = Array.isArray(list) ? list.slice() : [];
                if (!options.some((opt) => opt.value === current)) {
                    if (!(current === "" && o.keepEmpty)) {
                        current = (options[0] && options[0].value) || "";
                    }
                }
                paint();
                return current;
            },
            open: open,
            close: close
        };
        host.__ccDevisePicker = api;
        return api;
    }

    window.CCDevise = {
        picker: picker,
        optionsForCountries: optionsForCountries,
        currencyOfCountry: currencyOfCountry,
        symbol: symbol,
        name: name
    };

    // Aussi exposé dans CCCommon : "CCCommon.currencyPicker" reste le nom attendu.
    if (window.CCCommon) {
        window.CCCommon.currencyPicker = picker;
        window.CCCommon.currencyOptionsForCountries = optionsForCountries;
        window.CCCommon.currencyOfCountry = currencyOfCountry;
        window.CCCommon.CCDevise = window.CCDevise;
    }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   FEUILLE DE STYLE DU MODÈLE UNIQUE
   Injectée automatiquement par ce fichier : toute page qui charge devise.js
   affiche donc la devise exactement comme le formulaire de publication des
   offres. Aucune page ne doit redéfinir .cc-cur-* (voir style.css).
   ═══════════════════════════════════════════════════════════════════════════ */
const CC_CUR_CSS = `
/* ═══════════════════════════════════════════════════════════════════════════
   DEVISE — MODÈLE UNIQUE DU SITE  (voir devise.js › CCDevise.picker())
   Valeurs copiées du sélecteur du formulaire de PUBLICATION DES OFFRES, promu
   modèle général : bouton « pill » or + bulle de choix (Yoyo, 2026-09).
   Toute page qui doit montrer/choisir une devise monte CCDevise.picker() et
   n'écrit plus jamais son propre menu.
   ═══════════════════════════════════════════════════════════════════════════ */
.cc-cur {
    position: relative;
    display: inline-flex;
    align-items: center;
}
.cc-cur-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 179, 71, 0.1);
    border: 1px solid rgba(255, 179, 71, 0.3);
    border-radius: 20px;
    color: #ffb347;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.3;
    padding: 6px 14px;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s;
}
.cc-cur-btn:hover { background: rgba(255, 179, 71, 0.18); border-color: rgba(255, 179, 71, 0.45); }
.cc-cur-btn[aria-expanded="true"] { background: rgba(255, 179, 71, 0.22); border-color: rgba(255, 179, 71, 0.5); }
.cc-cur-btn:focus-visible { outline: 2px solid rgba(255, 179, 71, 0.6); outline-offset: 2px; }
.cc-cur-val { white-space: nowrap; }
.cc-cur-caret-svg { flex: none; }
.cc-cur-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 150px;
    max-height: 260px;
    overflow-y: auto;
    z-index: 1200;
    padding: 8px;
    border-radius: 12px;
    background: #14161c;
    border: 1px solid rgba(255, 179, 71, 0.35);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    animation: fadeInSlide 0.2s ease-out;
}
.cc-cur-pop.hidden, .cc-cur-pop[hidden] { display: none !important; }
.cc-cur-opt {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    margin: 0 0 4px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #f0f7f6;
    font-family: inherit;
    font-size: 0.82rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
}
.cc-cur-opt:last-child { margin-bottom: 0; }
.cc-cur-opt:hover { background: rgba(255, 179, 71, 0.14); }
.cc-cur-opt[aria-selected="true"] { background: rgba(255, 179, 71, 0.1); }
.cc-cur-opt-sym { flex-shrink: 0; font-weight: 800; color: #ffb347; }
.cc-cur-opt-lbl {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.85;
    font-size: 0.76rem;
}
.cc-cur-empty { padding: 8px 10px; font-size: 0.76rem; color: #8a8f98; }
/* Le séparateur vertical vient de l'en-tête du formulaire des offres. */
body.post-trip-page .cc-cur { padding-left: 12px; border-left: 1px solid rgba(255, 255, 255, 0.1); }
/* ── Mode clair : mêmes valeurs pour toutes les pages ── */
body.results-page.light .cc-cur-btn,
body.post-trip-page.light .cc-cur-btn,
body.dashboard-page.light .cc-cur-btn,
body.chat-page.light .cc-cur-btn,
body.home-page.light .cc-cur-btn,
body.light .cc-cur-btn {
    background: rgba(184, 134, 11, 0.12);
    border-color: rgba(184, 134, 11, 0.4);
    color: #8a6d1f;
}
body.results-page.light .cc-cur-pop,
body.post-trip-page.light .cc-cur-pop,
body.dashboard-page.light .cc-cur-pop,
body.chat-page.light .cc-cur-pop,
body.home-page.light .cc-cur-pop,
body.light .cc-cur-pop {
    background: #fdfaf4;
    border-color: rgba(184, 134, 11, 0.3);
    box-shadow: 0 18px 40px rgba(58, 47, 30, 0.18);
}
body.results-page.light .cc-cur-opt,
body.post-trip-page.light .cc-cur-opt,
body.dashboard-page.light .cc-cur-opt,
body.chat-page.light .cc-cur-opt,
body.home-page.light .cc-cur-opt,
body.light .cc-cur-opt {
    color: #3a2f1e;
}
body.results-page.light .cc-cur-opt:hover,
body.post-trip-page.light .cc-cur-opt:hover,
body.dashboard-page.light .cc-cur-opt:hover,
body.chat-page.light .cc-cur-opt:hover,
body.home-page.light .cc-cur-opt:hover,
body.light .cc-cur-opt:hover {
    background: rgba(58, 47, 30, 0.06);
}
body.results-page.light .cc-cur-opt-sym,
body.post-trip-page.light .cc-cur-opt-sym,
body.dashboard-page.light .cc-cur-opt-sym,
body.chat-page.light .cc-cur-opt-sym,
body.home-page.light .cc-cur-opt-sym,
body.light .cc-cur-opt-sym {
    color: #8a6d1f;
}`;

if (typeof document !== "undefined" && !document.getElementById("cc-devise-css")) {
    const styleEl = document.createElement("style");
    styleEl.id = "cc-devise-css";
    styleEl.textContent = CC_CUR_CSS;
    (document.head || document.documentElement).appendChild(styleEl);
}
