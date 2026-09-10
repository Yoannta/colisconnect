(() => {
    const state = {
        offers: [],
        userCurrency: 'EUR',
        filterProfileType: 'traveler',
        mobilePrimaryMode: 'traveler',
        demands: [],
        filterVerified: false,
        filterWeight10: false,
        filterUrgent: false,
        sortBy: 'date'
    };

    const convertCurrency = window.CCCommon.convertCurrency;
    const formatAmount = window.CCCommon.formatAmount;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;

    const els = {
        offersList: document.getElementById("offers-list")
    };

    function getInitials(name) {
        if (!name) return "CC";
        const parts = name.split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    function queryOfferFilters() {
        const origin = document.getElementById("res-origin")?.value?.trim() || "";
        const destination = document.getElementById("res-dest")?.value?.trim() || "";
        const minKg = parseInt(document.getElementById("res-weight")?.value || "1", 10);
        return { destination, origin, minKg };
    }

    async function loadOffers() {
        if (!els.offersList) return;
        els.offersList.innerHTML = '<div class="loading-state">Actualisation des offres...</div>';

        const filters = queryOfferFilters();
        const params = new URLSearchParams({
            pageSize: "100",
            minKg: String(filters.minKg)
        });
        if (filters.destination) params.set("destination", filters.destination);
        if (filters.origin) params.set("origin", filters.origin);

        const payload = await window.CCCommon.api(`/api/offers?${params.toString()}`, { auth: false });
        state.offers = Array.isArray(payload?.items) ? payload.items : [];
        renderOffers();
    }

    function syncProfileTypeButtons() {
        const activeType = state.filterProfileType;
        document.querySelectorAll("[data-profile-type]").forEach((btn) => {
            const type = btn.getAttribute("data-profile-type");
            if (!type || type === "client") return;
            const isActive = type === activeType;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            const cb = btn.querySelector(".sub-check");
            if (cb) cb.checked = isActive;
        });
    }

    function syncMobilePrimaryButtons() {
        const buttons = document.querySelectorAll("[data-mobile-mode]");
        const profileBlock = document.querySelector(".results-mobile-profile-block");
        buttons.forEach((btn) => {
            const mode = btn.getAttribute("data-mobile-mode");
            const isActive = mode === state.mobilePrimaryMode;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        // Le bloc "Type de transporteur" (étiquette + switch Simple/Cargo)
        // n'apparaît QUE sur l'onglet "Chercher un voyageur" (traveler)
        if (profileBlock) {
            profileBlock.classList.toggle("hidden", state.mobilePrimaryMode !== "traveler");
        }
    }

    function setProfileType(profileType) {
        state.filterProfileType = profileType;
        syncProfileTypeButtons();
        const headLine = document.getElementById("results-headline");
        if (headLine) {
            headLine.innerHTML = profileType === "cargo"
                ? "<span class=\"kc-title-accent\">Cargo</span> disponibles"
                : "<span class=\"kc-title-accent\">Voyageurs</span> disponibles";
        }
        renderOffers();
    }

    function setMobilePrimaryMode(mode) {
        state.mobilePrimaryMode = mode;
        syncMobilePrimaryButtons();
        // Le titre change selon la section
        const headLine = document.getElementById("results-headline");
        if (headLine) {
            if (mode === "demand") {
                headLine.innerHTML = "<span class=\"kc-title-accent\">Demandes</span> de transport";
            } else if (state.filterProfileType === "cargo") {
                headLine.innerHTML = "<span class=\"kc-title-accent\">Cargo</span> disponibles";
            } else {
                headLine.innerHTML = "<span class=\"kc-title-accent\">Voyageurs</span> disponibles";
            }
        }
        // La liste change : offres (voyageur) ou demandes (voyageur qui cherche des clients)
        if (mode === "demand") {
            renderDemands();
        } else {
            renderOffers();
        }
    }

    async function loadDemands() {
        if (!els.offersList) return;
        els.offersList.innerHTML = '<div class="loading-state">Chargement des demandes...</div>';
        let items = [];
        try {
            if (window.ccSupabase) {
                const { data, error } = await window.ccSupabase
                    .from("parcel_requests")
                    .select("*")
                    .eq("status", "pending")
                    .order("created_at", { ascending: false });
                if (error) throw error;
                items = data || [];
            } else {
                const payload = await window.CCCommon.api("/api/parcel-requests", { auth: false });
                items = Array.isArray(payload?.items) ? payload.items : [];
            }
        } catch (err) {
            console.warn("Impossible de charger les demandes:", err);
            items = [];
        }
        state.demands = items;
        renderDemands();
    }

    function renderDemands() {
        if (!els.offersList) return;
        const items = state.demands || [];
        if (!items.length) {
            els.offersList.innerHTML =
                '<div class="empty-state">Aucune demande en ce moment.<br>Revenez plus tard !</div>';
            return;
        }
        const esc = (s) => window.CCCommon?.escapeHtml ? window.CCCommon.escapeHtml(String(s ?? "")) : String(s ?? "");
        els.offersList.innerHTML = items.map((d) => {
            const orName = esc(d.origin || "");
            const destName = esc(d.destination || "");
            const orCity = d.origin_city ? esc(d.origin_city) : "";
            const destCity = d.destination_city ? esc(d.destination_city) : "";

            // Date limite courte en français (ex: "25 sept. 2026")
            let limitDate = "";
            if (d.needed_by_date) {
                try {
                    const dl = new Date(String(d.needed_by_date).slice(0, 10) + "T00:00:00");
                    if (!isNaN(dl.getTime())) {
                        limitDate = dl.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                    }
                } catch (e) { /* fallback */ }
                if (!limitDate) limitDate = esc(String(d.needed_by_date).slice(0, 10));
            }

            const hasDesc = !!(d.description && String(d.description).trim());
            const descTxt = esc(d.description);
            const fmtNum = (n) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
            const budgetCur = esc(d.currency || "XOF");

            // Partie « envoyer » d'un colis : <span class="cc3-demand-hl">12 kilo de valise</span>
            const mkItemSendHl = (it) => {
                const noun = it.item_type ? String(it.item_type).trim().toLowerCase() : "";
                const hasW = it.weight_kg != null && it.weight_kg !== "";
                const hasQ = it.quantity != null && it.quantity !== "";
                if (hasW) return `<span class="cc3-demand-hl">${esc(it.weight_kg)} kilo${noun ? ` de ${esc(noun)}` : ""}</span>`;
                if (hasQ) {
                    const q = Number(it.quantity);
                    // « 2 ordinateurs » (pluriel simple, sauf nom déjà terminé par s/x/z)
                    const nounTxt = noun ? (q > 1 && !/[sxz]$/i.test(noun) ? `${noun}s` : noun) : "colis";
                    return `<span class="cc3-demand-hl">${esc(it.quantity)} ${esc(nounTxt)}</span>`;
                }
                return "";
            };
            // Partie « prix » d'un colis : <span class="cc3-demand-hl">20 EUR</span>
            // Le montant saisi vaut pour le LOT complet (« combien pour 12 kg ? ») -> jamais de « /kg »
            const mkItemPriceHl = (it) => {
                const raw = (it.max_price_per_kg != null && it.max_price_per_kg !== "") ? it.max_price_per_kg
                    : (it.max_price_total != null && it.max_price_total !== "") ? it.max_price_total
                    : null;
                return raw === null ? "" : `<span class="cc3-demand-hl">${fmtNum(raw)} ${budgetCur}</span>`;
            };
            // Phrase complète d'un colis (multi) : même tournure que la carte simple
            // « Je veux envoyer 12 kilo de valise et je peux payer environ 20 EUR »
            const mkItemSentence = (it) => {
                const s = mkItemSendHl(it);
                const p = mkItemPriceHl(it);
                if (s && p) return `Je veux envoyer ${s} et je peux payer environ ${p}`;
                if (s) return `Je veux envoyer ${s}`;
                if (p) return `Je peux payer environ ${p}`;
                return "";
            };

            // items (jsonb multi-colis) prioritaire ; sinon scalaires des anciennes demandes
            const sentences = (Array.isArray(d.items) && d.items.length) ? d.items.map(mkItemSentence).filter(Boolean) : [];
            const isMulti = sentences.length > 1;

            // Au-delà de 2 phrases : la carte ne grandit pas, on affiche « … » + « Voir plus »
            const VISIBLE_SENTENCES = 2;
            let phraseTxt = "";
            let demandLines = "";
            if (isMulti) {
                const restN = sentences.length - VISIBLE_SENTENCES;
                const visible = sentences.slice(0, VISIBLE_SENTENCES).map((s, i, arr) =>
                    `<span class="cc3-demand-sentence">${s}${restN > 0 && i === arr.length - 1 ? '<span class="cc3-demand-ellipsis" aria-hidden="true">…</span>' : ""}</span>`
                ).join("");
                const extra = restN > 0
                    ? sentences.slice(VISIBLE_SENTENCES).map((s) => `<span class="cc3-demand-sentence cc3-demand-extra">${s}</span>`).join("")
                    : "";
                demandLines = `<span class="cc3-demand-lines">${visible}${extra}</span>`;
                if (restN > 0) demandLines += `<button type="button" class="cc3-demand-more" data-count="${restN}">Voir plus (${restN})</button>`;
            } else {
                // Phrase classique pour un seul colis (identique à l'ancienne)
                const it = (Array.isArray(d.items) && d.items.length === 1) ? d.items[0] : d;
                const sendHl = mkItemSendHl(it);
                const priceHl = mkItemPriceHl(it);
                phraseTxt = sendHl
                    ? `Je veux envoyer ${sendHl}` + (priceHl ? ` et je peux payer environ ${priceHl}` : "")
                    : (priceHl ? `Je peux payer environ ${priceHl}` : "");
            }

            return (
`<div class="offer-wrap">
  <article class="cc3-card">
    <img class="cc3-planet cc3-dark" src="assets/card-image-version/planet-route-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-planet cc3-light" src="assets/card-image-version/planet-route-light-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-dark" src="assets/card-image-version/bottom-city-watermark.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-light" src="assets/card-image-version/bottom-city-watermark-light.png" alt="" aria-hidden="true">

    <section class="cc3-route">
      <div class="cc3-flag-shell"><span class="cc3-flag" data-demande-flag data-cc-o="${orName}" data-role="origin" aria-hidden="true"></span></div>
      <div class="cc3-place">
        <span class="cc3-label">From</span>
        <span class="cc3-country">${orName || "—"}</span>
        ${orCity ? `<span class="cc3-city">${orCity}</span>` : ""}
      </div>
      <svg class="cc3-flight" viewBox="0 0 184 60" aria-hidden="true">
        <path d="M2 47C50 11 105 8 181 45"></path>
        <g class="cc3-plane" transform="translate(86 2) rotate(9)">
          <path d="M25.5 22.2 3.2 30.8 0 26.6l16.2-12.7L0 1.2 3.2-3l22.3 8.7L38.6-6.8c3.2-3 7.2-3.3 8.6-1.5 1.5 1.9-.1 5.5-3.3 8.5L34.3 10.7l18.2 7.1-3.4 4.1-24.4-3.7-11.2 11.6-4-2.6 8.1-13.1z"></path>
        </g>
      </svg>
      <div class="cc3-place cc3-place-to">
        <span class="cc3-label">To</span>
        <span class="cc3-country">${destName || "—"}</span>
        ${destCity ? `<span class="cc3-city">${destCity}</span>` : ""}
      </div>
      <div class="cc3-flag-shell cc3-flag-shell-sn"><span class="cc3-flag" data-demande-flag data-cc-d="${destName}" data-role="dest" aria-hidden="true"></span></div>
    </section>

    <div class="cc3-rule"></div>

    <section class="cc3-details">
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="9" width="28" height="25" rx="3"></rect><path d="M12 4v10M28 4v10M6 17h28"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">Date limite</span>
          <span class="cc3-value">${limitDate ? `<span class="cc3-gold">${limitDate}</span>` : "Non précisée"}</span>
        </div>
      </div>
      ${phraseTxt || demandLines || hasDesc ? `
      <div class="cc3-detail cc3-demand-phrase">
        ${phraseTxt ? `<p class="cc3-demand-phrase-txt">${phraseTxt}</p>` : ""}
        ${demandLines ? `<div class="cc3-demand-multi">${demandLines}</div>` : ""}
        ${hasDesc ? `<p class="cc3-demand-desc">${descTxt}</p>` : ""}
      </div>` : ""}
    </section>
  </article>
</div>`);
        }).join("\n");

        // Drapeaux : les demandes ne stockent pas de code pays -> résolution async (avec cache) sur le nom
        hydrateDemandeFlags();

        // « Voir plus » : révèle les phrases supplémentaires masquées d'une demande multi-colis
        els.offersList.querySelectorAll(".cc3-demand-more").forEach((btn) => {
            btn.addEventListener("click", () => {
                const lines = btn.closest(".cc3-demand-multi")?.querySelector(".cc3-demand-lines");
                if (!lines) return;
                const isOpen = lines.classList.toggle("is-expanded");
                btn.textContent = isOpen ? "Voir moins" : `Voir plus (${btn.dataset.count || ""})`;
            });
        });
    }

    function hydrateDemandeFlags() {
        if (!els.offersList) return;
        const flagEls = els.offersList.querySelectorAll(".cc3-flag[data-demande-flag]");
        if (!flagEls.length || !window.CCCommon?._getCountryCode) return;
        flagEls.forEach((el) => {
            const country = el.dataset.role === "dest" ? el.dataset.ccD : el.dataset.ccO;
            if (!country) return;
            window.CCCommon._getCountryCode(country)
                .then((code) => {
                    if (el.isConnected && /^[A-Za-z]{2}$/.test(String(code || ""))) {
                        el.classList.add("fi", "fis", "fi-" + String(code).toLowerCase());
                    }
                })
                .catch(() => { /* pays inconnu -> drapeau laissé vide */ });
        });
    }

    function renderOffers() {
        if (!els.offersList) return;

        // 1. Filtrer les offres selon l'onglet actif et les filtres optionnels
        let filteredOffers = state.offers.filter(offer => {
            const mode = String(offer.mode || "").trim();
            if (state.filterProfileType === 'traveler') {
                if (mode !== "") return false;
            } else if (state.filterProfileType === 'cargo') {
                if (mode === "") return false;
            }

            // Filtre : Voyageurs vérifiés
            if (state.filterVerified && !offer.ownerIsVerified) {
                return false;
            }

            // Filtre : > 10 kg
            if (state.filterWeight10 && (offer.availableKg || 0) <= 10) {
                return false;
            }

            // Filtre : Départ proche (dans les 7 prochains jours)
            if (state.filterUrgent) {
                const depart = new Date(offer.departureDate);
                const today = new Date();
                const diffTime = depart - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0 || diffDays > 7) {
                    return false;
                }
            }

            // Filtre : Date limite (le départ doit être inférieur ou égal à la date choisie)
            const dateLimitStr = document.getElementById("res-date")?.value || "";
            if (dateLimitStr) {
                const limitDate = new Date(dateLimitStr);
                const departDate = new Date(offer.departureDate);
                if (!isNaN(limitDate.getTime()) && !isNaN(departDate.getTime())) {
                    if (departDate > limitDate) return false;
                }
            }

            return true;
        });

        // 2. Trier les offres
        const isSort = document.getElementById("sort-select")?.value || state.sortBy;
        filteredOffers.sort((a, b) => {
            if (isSort === 'price') {
                const priceA = convertCurrency(Number(a.pricePerKg || 0), a.baseCurrency || 'EUR', state.userCurrency);
                const priceB = convertCurrency(Number(b.pricePerKg || 0), b.baseCurrency || 'EUR', state.userCurrency);
                return priceA - priceB;
            } else {
                const dateA = new Date(a.departureDate || 0);
                const dateB = new Date(b.departureDate || 0);
                return dateA - dateB;
            }
        });

        // 3. Rendu
        if (!filteredOffers.length) {
            els.offersList.innerHTML = `
                <div class="empty-card empty-state">
                    <p class="empty-title">Aucune offre correspondante.</p>
                    <p class="empty-sub">Créez une demande de transport, si un voyageur est intéressé il vous contactera.</p>
                    <button type="button" id="btn-faire-demande-trajet">Faire une demande de trajet</button>
                </div>`;
            setTimeout(() => {
                document.getElementById("btn-faire-demande-trajet")?.addEventListener("click", () => {
                    document.getElementById("demande-trajet-modal")?.classList.remove("hidden");
                    window.resetDemandeWizard?.();
                });
            }, 50);
            return;
        }

        els.offersList.innerHTML = filteredOffers
            .map((offer) => {
                const initials = getInitials(offer.ownerName);
                const isVerified = Boolean(offer.ownerIsVerified);

                const originCountry = offer.origin || "Origine";
                const destCountry = offer.destination || "Arrivée";
                const originCity = String(offer.city_origin || offer.cityOrigin || "").trim();
                const destCity = String(offer.city_destination || offer.cityDestination || "").trim();
                const departureDate = String(offer.departureDate || "-");
                let formattedDate = departureDate;
                try {
                    const d = new Date(departureDate);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                    }
                } catch (e) { /* fallback */ }

                const pricePerKgRaw = Number(offer.pricePerKg || 0);
                const baseCur = offer.baseCurrency || 'EUR';
                const userCur = state.userCurrency;
                const convertedPrice = convertCurrency(pricePerKgRaw, baseCur, userCur);
                const availableKg = offer.availableKg || 0;

                const priceDisplay = formatAmount(convertedPrice, userCur);
                const offerMode = String(offer.mode || "").trim();

                // [CARGO] Dates supplémentaires (jsonb) : triées puis formatées en chips courtes
                let extraDateValues = [];
                try {
                    const raw = offer.extraDates || offer.extra_dates || [];
                    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
                    extraDateValues = (Array.isArray(arr) ? arr : [])
                        .map((s) => String(s || "").trim())
                        .filter(Boolean)
                        .sort();
                } catch (e) { extraDateValues = []; }
                const fmtExtraDate = (iso) => {
                    try {
                        const d = new Date(iso);
                        if (!isNaN(d.getTime())) return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    } catch (e) { /* fallback */ }
                    return iso;
                };
                const extraDateChips = extraDateValues.map(fmtExtraDate);

                // Colis acceptés / refusés
                const colisAcceptes = String(offer.colis_types || offer.colisTypes || "").trim();
                const colisRefuses = String(offer.refused_colis_types || offer.refusedColisTypes || "").trim();
                const hasColisInfo = colisAcceptes || colisRefuses;

                // Prix spéciaux (JSONB ou chaîne JSON)
                let specialPrices = [];
                try {
                    const sp = offer.special_prices || offer.specialPrices || [];
                    specialPrices = Array.isArray(sp) ? sp : JSON.parse(sp || "[]");
                } catch (e) { specialPrices = []; }
                const validSpecial = specialPrices.filter((p) => p && p.type && Number(p.price) > 0);
                const specialPriceDisplay = (price) => formatAmount(convertCurrency(Number(price), baseCur, userCur), userCur);
                // Unité lisible : "par kilo" ou "par <type de colis>" (ex: 100 yuan par ordinateur)
                const specialUnitLabel = (p) => (p.mode === "qty" ? ` par ${window.CCCommon.escapeHtml(p.type)}` : " par kilo");
                // Une ligne de prix spécial : nom à gauche, prix en évidence, unité SOUS le prix
                // (noms > 14 caractères : classe "long" → taille réduite + wrap, pour ne jamais déborder sur le prix)
                const specialRow = (p) => `
        <div class="cc3-special-item">
          <span class="cc3-special-type${p.type && p.type.length > 14 ? " cc3-type-long" : ""}">${window.CCCommon.escapeHtml(p.type)}</span>
          <span class="cc3-special-price">${specialPriceDisplay(p.price)}</span>
          <span class="cc3-special-unit">${specialUnitLabel(p).trim()}</span>
        </div>`;
                // Articles refusés : chaîne "A, B (précision), C" → liste {name, note?}
                const refusesItems = colisRefuses
                    .split(",")
                    .map((s) => {
                        const t = s.trim();
                        if (!t) return null;
                        const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                        return m ? { name: m[1].trim(), note: m[2].trim() } : { name: t, note: "" };
                    })
                    .filter(Boolean);
                const refusedRow = (r) => `
        <div class="cc3-refused-item">
          <span class="cc3-refused-name${r.name && r.name.length > 14 ? " cc3-refused-long" : ""}">${window.CCCommon.escapeHtml(r.name)}</span>
          ${r.note ? `<span class="cc3-refused-note">${window.CCCommon.escapeHtml(r.note)}</span>` : ""}
        </div>`;
                // La zone (2 colonnes) n'existe que si au moins un des deux côtés a du contenu
                const hasSpecialZone = validSpecial.length > 0 || refusesItems.length > 0;
                // Label du bouton accordéon : jamais mensonger selon le contenu
                const accordionLabel = validSpecial.length > 0 && refusesItems.length > 0
                    ? "Prix spéciaux et articles refusés"
                    : (validSpecial.length > 0 ? "Prix spéciaux" : "Articles refusés");

                const profilePhoto = String(offer.ownerProfilePhoto || offer.ownerAvatar || offer.avatar || "").trim();
                const profileLabel = offerMode === "" ? "Voyageur" : "Transporteur Pro";
                const profileIcon = offerMode === "" ? (isVerified ? "verified" : "person") : "local_shipping";

                // Badge date : Aujourd'hui / Demain / date complète (style Kinetic)
                let badgeDate = formattedDate;
                try {
                    const d = new Date(departureDate);
                    const today = new Date();
                    const tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    if (!isNaN(d.getTime())) {
                        if (d.toDateString() === today.toDateString()) badgeDate = "Aujourd'hui";
                        else if (d.toDateString() === tomorrow.toDateString()) badgeDate = "Demain";
                    }
                } catch (e) { /* fallback */ }

                // Code IATA : 3 premières lettres du pays (FRA, SEN...)
                const iata = (name) => (String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '') || '???').slice(0, 3);
                const codeFrom = iata(originCountry);
                const codeDest = iata(destCountry);
                // [FLAGS] Codes ISO stockés dans l'offre (option B) -> classe flag-icons fi-{code} 1x1
                const ccCode = (v) => (/^[A-Za-z]{2}$/.test(String(v || "")) ? String(v).toLowerCase() : "");
                const ccOrigin = ccCode(offer.originCountryCode || offer.origin_country_code);
                const ccDest = ccCode(offer.destCountryCode || offer.destination_country_code);
                const flagCls = (c) => (c ? ` fi fis fi-${c}` : "");
                const routeIcon = offerMode === "" ? "flight_takeoff" : "local_shipping";

                // Nom scindé (prénom + reste) pour le style "Yoann *Tato*"
                const nameParts = String(offer.ownerName || "Voyageur").split(/\s+/).filter(Boolean);
                const firstName = nameParts[0] || "Voyageur";
                const lastName = nameParts.slice(1).join(" ") || "";
                // Date courte pour la colonne DÉPART (ex: "21 août")
                let shortDate = formattedDate;
                try {
                    const d = new Date(departureDate);
                    if (!isNaN(d.getTime())) {
                        shortDate = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    }
                } catch (e) { /* fallback */ }

                // [CARGO] Cellule Départ : la date principale + les dates supplémentaires
                // alignées sur UNE même ligne (un seul logo ; « · » entre les dates et
                // « et » devant la DERNIÈRE pour la lisibilité). Dès qu'il y a PLUSIEURS
                // dates, le label passe de « Départ » à « J'ai des voyages le : »
                const dateLine = (txt) => `<span class="cc3-gold cc3-date-line">${window.CCCommon.escapeHtml(txt)}</span>`;
                const departValueHtml = extraDateChips.length
                    ? `<span class="cc3-value cc3-value-dates">${dateLine(shortDate)}${extraDateChips.map(dateLine).join("")}</span>`
                    : `<span class="cc3-value"><span class="cc3-gold">${window.CCCommon.escapeHtml(shortDate)}</span></span>`;

                return `
<div class="offer-wrap">
  <article class="cc3-card">
    <img class="cc3-planet cc3-dark" src="assets/card-image-version/planet-route-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-planet cc3-light" src="assets/card-image-version/planet-route-light-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-dark" src="assets/card-image-version/bottom-city-watermark.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-light" src="assets/card-image-version/bottom-city-watermark-light.png" alt="" aria-hidden="true">

    <section class="cc3-route">
      <div class="cc3-flag-shell"><span class="cc3-flag${flagCls(ccOrigin)}" aria-hidden="true"></span></div>
      <div class="cc3-place">
        <span class="cc3-label">From</span>
        <span class="cc3-country">${window.CCCommon.escapeHtml(originCountry)}</span>
        ${originCity ? `<span class="cc3-city">${window.CCCommon.escapeHtml(originCity)}</span>` : ""}
      </div>
      <svg class="cc3-flight" viewBox="0 0 184 60" aria-hidden="true">
        <path d="M2 47C50 11 105 8 181 45"></path>
        <g class="cc3-plane" transform="translate(86 2) rotate(9)">
          <path d="M25.5 22.2 3.2 30.8 0 26.6l16.2-12.7L0 1.2 3.2-3l22.3 8.7L38.6-6.8c3.2-3 7.2-3.3 8.6-1.5 1.5 1.9-.1 5.5-3.3 8.5L34.3 10.7l18.2 7.1-3.4 4.1-24.4-3.7-11.2 11.6-4-2.6 8.1-13.1z"></path>
        </g>
      </svg>
      <div class="cc3-place cc3-place-to">
        <span class="cc3-label">To</span>
        <span class="cc3-country">${window.CCCommon.escapeHtml(destCountry)}</span>
        ${destCity ? `<span class="cc3-city">${window.CCCommon.escapeHtml(destCity)}</span>` : ""}
      </div>
      <div class="cc3-flag-shell cc3-flag-shell-sn"><span class="cc3-flag${flagCls(ccDest)}" aria-hidden="true"></span></div>
    </section>

    <div class="cc3-rule"></div>

    <section class="cc3-details${extraDateChips.length ? " cc3-details--multi" : ""}">
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="9" width="28" height="25" rx="3"></rect><path d="M12 4v10M28 4v10M6 17h28"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">${extraDateChips.length ? "J'ai des voyages le :" : "Départ"}</span>
          ${departValueHtml}
        </div>
      </div>
      ${offerMode === "" ? `
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="13" width="24" height="22" rx="4"></rect><path d="M14 13v-3a6 6 0 0 1 12 0v3M20 19v9"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">Disponibilité</span>
          <span class="cc3-value">${availableKg} <span class="cc3-kg">kg</span></span>
        </div>
      </div>` : ""}
      <div class="cc3-detail cc3-detail-price">
        <div class="cc3-price-source" aria-hidden="true">
          <span class="cc3-d-label">Prix / kg</span>
          <span class="cc3-price">${window.CCCommon.escapeHtml(priceDisplay)}</span>
          <span class="cc3-inclusive">all inclusive</span>
        </div>
        <div class="water-lens" aria-label="Prix par kilogramme: ${window.CCCommon.escapeHtml(priceDisplay)} all inclusive">
          <div class="water-lens__content">
            <div class="cc3-detail-txt">
              <span class="cc3-d-label">Prix / kg</span>
              <span class="cc3-price">${window.CCCommon.escapeHtml(priceDisplay)}</span>
              <span class="cc3-inclusive">all inclusive</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${hasSpecialZone ? `
    <!-- ACCORDÉON : un bouton déplie tous les prix spéciaux PUIS les articles refusés -->
    <section class="cc3-special-grid">
      <button type="button" class="cc3-special-toggle cc3-special-toggle-gold" data-cc-expand="special" aria-expanded="false">
        <span class="cc3-toggle-label">${accordionLabel}</span>
        <svg class="cc3-toggle-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"></path></svg>
      </button>
      <div class="cc3-accordion-body">
        ${validSpecial.length ? `
        <div class="cc3-special-list">
          ${validSpecial.map(specialRow).join("")}
        </div>` : ""}
        ${refusesItems.length ? `
        <div class="cc3-refused-block">
          <div class="cc3-refused-head">
            <span class="cc3-section-icon cc3-section-icon-refused" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="20" cy="20" r="13.5"></circle>
                <path d="M11 11l18 18"></path>
              </svg>
            </span>
            <div class="cc3-refused-label">Articles refusés</div>
          </div>
          <div class="cc3-refused-list">
            ${refusesItems.map(refusedRow).join("")}
          </div>
        </div>` : ""}
      </div>
    </section>` : ""}

    <footer class="cc3-foot">
      <div class="cc3-profile">
        ${profilePhoto ? `<img class="cc3-avatar cc3-avatar-img" src="${window.CCCommon.escapeHtml(profilePhoto)}" alt="">` : `<span class="cc3-avatar">${window.CCCommon.escapeHtml(initials)}</span>`}
        <div class="cc3-profile-txt">
          <div class="cc3-name-line">
            <span class="cc3-name">${window.CCCommon.escapeHtml(firstName)} <em>${window.CCCommon.escapeHtml(lastName)}</em></span>
            ${isVerified ? `<svg class="cc3-shield" viewBox="0 0 36 40" aria-hidden="true"><path d="M18 2.5 32 8v10.3c0 8.5-5.7 15.2-14 18.9C9.7 33.5 4 26.8 4 18.3V8l14-5.5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"></path><path d="M15.6 22.4 12 18.8l-2 2 5.6 5.6L26.8 15.2l-2-2z" fill="currentColor"></path></svg>` : ""}
          </div>
          <span class="cc3-meta">${window.CCCommon.escapeHtml(profileLabel)}</span>
        </div>
      </div>
      <button class="cc3-cta" type="button" data-reserve-offer="${offer.id}" aria-label="Contacter ${window.CCCommon.escapeHtml(offer.ownerName || "ce voyageur")}">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M23.7 8C14 8 6.1 14.5 6.1 22.5c0 4.7 2.8 8.9 7.1 11.5l-1.1 6.1 7-3.7c1.5.4 3 .6 4.6.6 9.7 0 17.6-6.5 17.6-14.5S33.4 8 23.7 8z"></path></svg>
        <span>Contacter</span>
      </button>
    </footer>
  </article>
</div>`;
            })
            .join("\n");
    }

    async function startReservation(offerId) {
        const offer = state.offers.find((item) => Number(item.id) === Number(offerId));
        if (!offer) return;

        const target = `chat.html?offerId=${encodeURIComponent(String(offer.id))}`;
        if (!window.CCCommon.requireAuth(target)) return;

        const user = window.CCCommon.state?.user;
        if (user && !user.profile_type) {
            try {
                const response = await window.CCCommon.api('/users/me/profile', {
                    method: 'PATCH',
                    body: { profileType: 'client' }
                });
                if (response.success) {
                    window.CCCommon.state.user.profile_type = 'client';
                }
            } catch (err) {
                console.warn("Erreur lors de la mise à jour automatique vers 'client':", err);
            }
        }

        window.location.href = target;
    }

    function initCustomCurrencyDropdown() {
        const currencyListEl = document.getElementById("currency-options-list");
        const searchInput = document.getElementById("currency-search-input");
        const triggerBtn = document.getElementById("currency-trigger-btn");
        const valSpan = document.getElementById("current-currency-val");
        const menuEl = document.getElementById("currency-dropdown-menu");

        if (!triggerBtn || !menuEl) return;

        const exchangeRates = window.CCCommon?.EXCHANGE_RATES || {};

        const CUR_DETAILS = {
            EUR: { symbol: '€', name: 'Euro' },
            XOF: { symbol: 'FCFA', name: 'Franc CFA (BCEAO)' },
            USD: { symbol: '$', name: 'Dollar US' },
            CAD: { symbol: '$', name: 'Dollar Canadien' },
            GBP: { symbol: '£', name: 'Livre Sterling' },
            CHF: { symbol: 'CHF', name: 'Franc Suisse' },
            CNY: { symbol: '¥', name: 'Yuan Chinois' },
            JPY: { symbol: '¥', name: 'Yen Japonais' },
            XAF: { symbol: 'FCFA', name: 'Franc CFA (BEAC)' },
            MAD: { symbol: 'DH', name: 'Dirham Marocain' },
            DZD: { symbol: 'DA', name: 'Dinar Algérien' },
            TND: { symbol: 'DT', name: 'Dinar Tunisien' },
            NGN: { symbol: '₦', name: 'Naira Nigérian' },
            GHS: { symbol: 'GH₵', name: 'Cedi Ghanéen' },
            ZAR: { symbol: 'R', name: 'Rand Sud-Africain' },
            INR: { symbol: '₹', name: 'Roupie Indienne' },
            BRL: { symbol: 'R$', name: 'Réal Brésilien' },
            MXN: { symbol: '$', name: 'Peso Mexicain' },
            TRY: { symbol: '₺', name: 'Lire Turque' },
            RUB: { symbol: '₽', name: 'Rouble Russe' }
        };

        // Si les taux Supabase ne sont pas encore chargés, utiliser CUR_DETAILS comme fallback
        const rateKeys = Object.keys(exchangeRates);
        const hasRealRates = rateKeys.length > 2;
        const sortedCurrencies = hasRealRates
            ? rateKeys.sort()
            : Object.keys(CUR_DETAILS).sort();

        function renderCurrencyList(filterText = "") {
            if (!currencyListEl) return;
            const normalizedFilter = filterText.toLowerCase().trim();

            const matchedCurrencies = sortedCurrencies.filter(cur => {
                if (!normalizedFilter) return true;
                const detail = CUR_DETAILS[cur];
                const name = detail ? detail.name.toLowerCase() : "";
                return cur.toLowerCase().includes(normalizedFilter) || name.includes(normalizedFilter);
            });

            if (matchedCurrencies.length === 0) {
                currencyListEl.innerHTML = `<li style="padding: 10px 16px; color: var(--muted); font-size: 13px; text-align: center;">Aucun résultat</li>`;
                return;
            }

            currencyListEl.innerHTML = matchedCurrencies
                .map(cur => {
                    const detail = CUR_DETAILS[cur];
                    const activeClass = state.userCurrency === cur ? "active" : "";
                    const nameLabel = detail ? detail.name : `Devise ${cur}`;
                    return `<li class="currency-dropdown-item ${activeClass}" data-value="${cur}">
                        <span class="currency-item-code">${cur}</span>
                        <span class="currency-item-name">${nameLabel}</span>
                    </li>`;
                })
                .join("\n");
        }

        // Toggle dropdown open/close
        triggerBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menuEl.classList.toggle("hidden");
            if (!menuEl.classList.contains("hidden")) {
                if (searchInput) {
                    searchInput.value = "";
                    searchInput.focus();
                }
                renderCurrencyList("");
            }
        });

        // Prevent closing dropdown when clicking inside search input or search container
        searchInput?.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        searchInput?.addEventListener("input", (e) => {
            renderCurrencyList(e.target.value);
        });

        // Choice selection handler
        currencyListEl?.addEventListener("click", (e) => {
            const item = e.target.closest(".currency-dropdown-item");
            if (!item) return;
            const val = item.getAttribute("data-value");
            if (val) {
                state.userCurrency = val;
                if (valSpan) valSpan.textContent = val;
                menuEl.classList.add("hidden");
                renderOffers();
            }
        });

        // Close on click outside
        document.addEventListener("click", (e) => {
            if (!e.target.closest("#custom-currency-dropdown")) {
                menuEl.classList.add("hidden");
            }
        });

        // Initialize display value
        if (state.userCurrency && valSpan) {
            valSpan.textContent = state.userCurrency;
        }
    }

    function bindEvents() {
        initCustomCurrencyDropdown();

        if (els.offersList) {
            els.offersList.addEventListener("click", (event) => {
                const button = event.target.closest("button[data-reserve-offer]");
                if (!button) return;
                const offerId = Number(button.getAttribute("data-reserve-offer"));
                startReservation(offerId).catch((error) => {
                    if (error?.code === "PROFILE_COMPLETION_REQUIRED") {
                        window.CCCommon.openProfileCompletionGate("results.html");
                    } else {
                        alert(error.message || "Impossible de contacter ce voyageur.");
                    }
                });
            });
        }

        // Profil type Filters
        document.querySelectorAll('[data-profile-type="traveler"]').forEach((btn) => {
            btn.addEventListener("click", () => setProfileType("traveler"));
        });
        document.querySelectorAll('[data-profile-type="cargo"]').forEach((btn) => {
            btn.addEventListener("click", () => setProfileType("cargo"));
        });
        syncProfileTypeButtons();

        document.querySelectorAll("[data-mobile-mode]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const mode = btn.getAttribute("data-mobile-mode");
                if (mode === "traveler") {
                    setMobilePrimaryMode("traveler");
                } else if (mode === "demand") {
                    setMobilePrimaryMode("demand");
                    loadDemands();
                }
            });
        });
        syncMobilePrimaryButtons();

        // Bouton Rechercher de la nouvelle barre
        document.getElementById("new-search-btn")?.addEventListener("click", () => {
            loadOffers().catch(err => console.warn(err));
        });

        // Sort Select
        document.getElementById("sort-select")?.addEventListener("change", (e) => {
            state.sortBy = e.target.value;
            renderOffers();
        });

        // Pill Toggles
        const togglePill = (id, stateKey) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener("click", () => {
                state[stateKey] = !state[stateKey];

                // Toggle active styling
                if (state[stateKey]) {
                    btn.className = "flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary text-primary bg-primary/10 text-sm whitespace-nowrap transition-colors duration-200 active:scale-95 cursor-pointer";
                } else {
                    btn.className = "flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 text-on-surface-variant hover:text-primary hover:border-primary/50 hover:bg-surface-variant text-sm whitespace-nowrap transition-all duration-200 active:scale-95 bg-transparent cursor-pointer";
                }
                renderOffers();
            });
        };

        togglePill("pill-verified", "filterVerified");
        togglePill("pill-weight", "filterWeight10");
        togglePill("pill-urgent", "filterUrgent");

    }

    async function bootstrap() {
        await window.CCCommon.init("results");
        if (!window.CCCommon.requireAuth()) return;

        const user = window.CCCommon.state?.user;
        const userCountry = user?.country || user?.location;
        if (userCountry) {
            state.userCurrency = COUNTRY_CURRENCIES[userCountry] || 'EUR';
        }
        const valSpan = document.getElementById("current-currency-val");
        if (valSpan) {
            valSpan.textContent = state.userCurrency;
        }

        // Remplir le datalist des pays pour la modale
        const demandeList = document.getElementById("demande-country-list");
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        if (demandeList && countryOptions.length) {
            demandeList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }
        // Setup autocomplete pays pour la barre de recherche
        if (window.CCCommon.setupCountryInput) {
            ["res-origin", "res-dest", "mf-origin", "mf-dest"].forEach(id => {
                const el = document.getElementById(id);
                if (el) window.CCCommon.setupCountryInput(el);
            });
        }

        // Setup autocomplete ville pour les champs ville déjà présents dans le HTML
        if (window.CCCommon.setupAllCountryInputs) {
            // Les champs ville sont déjà dans le HTML, on configure leur autocomplete
            const cityOrig = document.getElementById("city-demande-origin");
            const countryOrig = document.getElementById("demande-origin");
            if (cityOrig && countryOrig && window.CCCommon.setupCityAutocomplete) {
                window.CCCommon.setupCityAutocomplete(cityOrig, countryOrig);
            }
            const cityDest = document.getElementById("city-demande-destination");
            const countryDest = document.getElementById("demande-destination");
            if (cityDest && countryDest && window.CCCommon.setupCityAutocomplete) {
                window.CCCommon.setupCityAutocomplete(cityDest, countryDest);
            }
        }
        syncProfileTypeButtons();
        syncMobilePrimaryButtons();
        bindEvents();
        await loadOffers();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });

    // Evenements de la modale demande de trajet (toujours attachee, meme hors bootstrap)
    document.addEventListener("DOMContentLoaded", () => {
        // Toggle "Voir plus / Cacher" des prix spéciaux — attaché ici (indépendant de l'auth,
        // car bootstrap s'arrête sur requireAuth() avant bindEvents pour les visiteurs)
        const specialList = document.getElementById("offers-list");
        if (specialList) {
            specialList.addEventListener("click", (event) => {
                const toggle = event.target.closest("[data-cc-expand]");
                if (!toggle) return;
                const col = toggle.closest(".cc3-special-grid");
                if (!col) return;
                const expanded = col.classList.toggle("expanded");
                toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
                toggle.classList.toggle("is-expanded", expanded);
            });
        }
        document.getElementById("close-demande-modal")?.addEventListener("click", () => {
            document.getElementById("demande-trajet-modal")?.classList.add("hidden");
        });
        document.getElementById("demande-trajet-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("demande-trajet-modal")) {
                document.getElementById("demande-trajet-modal")?.classList.add("hidden");
            }
        });
        // « Pas de date limite » : choix explicite, mémorisé.
        // Règle (Yoyo) : étape 1 = une date limite OU ce choix, sinon on ne continue pas.
        const dmdNoDateBtn = document.getElementById("demande-no-date-btn");
        const dmdDateInput = document.getElementById("demande-date");
        let dmdNoDate = false;
        function applyNoDateChoice() {
            dmdNoDateBtn?.classList.toggle("active", dmdNoDate);
        }
        dmdNoDateBtn?.addEventListener("click", () => {
            dmdNoDate = !dmdNoDate;
            if (dmdNoDate && dmdDateInput) dmdDateInput.value = "";
            dmdDateInput?.classList.remove("dmd-invalid");
            dmdShowError("");
            applyNoDateChoice();
        });
        dmdDateInput?.addEventListener("change", () => {
            if ((dmdDateInput.value || "").trim()) { dmdNoDate = false; applyNoDateChoice(); }
            dmdDateInput.classList.remove("dmd-invalid");
            dmdShowError("");
        });

        // ===== WIZARD DEMANDE : 3 étapes (Trajet → Colis & prix → Description) =====
        const dmdStepError = document.getElementById("demande-step-error");
        const dmdNextBtn = document.getElementById("demande-next-btn");
        const dmdPrevBtn = document.getElementById("demande-prev-btn");
        const dmdSubmitBtn = document.getElementById("demande-submit-btn");
        let demandeStep = 1;

        // ── Multi-colis : chaque colis = un cadre (nom, mode, combien, montant) ──
        const colisZone = document.getElementById("demande-colis-rows");
        const dmdAddColisBtn = document.getElementById("demande-add-colis-btn");

        const getColisBoxes = () => (colisZone ? Array.from(colisZone.querySelectorAll(".dmd-colis-box")) : []);

        // Nom du colis saisi librement (première lettre en minuscule pour « Combien de X ? »)
        const getBoxNom = (box) => {
            const raw = (box.querySelector(".dmd-colis-nom")?.value || "").trim().replace(/\s+/g, " ");
            return raw ? raw.replace(/^./, (c) => c.toLowerCase()) : "";
        };
        const getBoxMode = (box) => box.querySelector(".dmd-price-mode-btn.active")?.dataset?.mode || "per_kg";

        // Affiche kg ou quantité selon le mode, adapte le libellé (« Combien de X ? ») et
        // le placeholder du montant (« pour 5 kilos » / « pour 5 document »)
        function refreshBoxUi(box) {
            if (!box) return;
            const isKg = getBoxMode(box) === "per_kg";
            const kgField = box.querySelector(".dmd-kg-field");
            const qtyField = box.querySelector(".dmd-qty-field");
            if (kgField) kgField.style.display = isKg ? "" : "none";
            if (qtyField) qtyField.style.display = isKg ? "none" : "";
            const nom = getBoxNom(box);
            const qtyLabel = box.querySelector(".dmd-qty-label");
            if (qtyLabel) qtyLabel.textContent = nom ? `Combien de ${nom} ?` : "Combien de colis ?";
            const priceInput = box.querySelector(".dmd-price-input");
            if (!priceInput) return;
            const raw = (isKg ? box.querySelector(".dmd-kg-input")?.value : box.querySelector(".dmd-qty-input")?.value) || "";
            const v = Number(raw);
            const vOk = Boolean(raw) && isFinite(v) && v > 0;
            if (!vOk) {
                priceInput.placeholder = "Ex: 2500";
            } else if (isKg) {
                priceInput.placeholder = `pour ${v} kilo${v > 1 ? "s" : ""}`;
            } else {
                priceInput.placeholder = `pour ${v} ${nom || "colis"}`;
            }
            // Libellé dynamique : « Combien proposez-vous pour 12 kg de vêtements ? » /
            // « Combien proposez-vous pour 2 ordinateurs ? » (le montant = prix du lot complet)
            const priceLabel = box.querySelector(".dmd-price-label");
            if (priceLabel) {
                const vTxt = Number.isInteger(v) ? String(v) : v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
                if (!vOk) {
                    priceLabel.textContent = "Combien proposez-vous ?";
                } else if (isKg) {
                    priceLabel.textContent = `Combien proposez-vous pour ${vTxt} kg${nom ? ` de ${nom}` : ""} ?`;
                } else {
                    const q = v > 1 && nom && !/[sxz]$/i.test(nom) ? `${nom}s` : nom;
                    priceLabel.textContent = `Combien proposez-vous pour ${vTxt} ${q || "colis"} ?`;
                }
            }
        }

        // Re-numérote « Colis 1 / Colis 2 … » et masque la croix quand il ne reste qu'un cadre
        function renumberColisBoxes() {
            const boxes = getColisBoxes();
            boxes.forEach((box, i) => {
                box.dataset.colis = String(i + 1);
                const t = box.querySelector(".dmd-colis-title");
                if (t) t.textContent = `Colis ${i + 1}`;
                const del = box.querySelector(".dmd-colis-del");
                if (del) del.style.display = boxes.length > 1 ? "" : "none";
            });
        }

        // « Ajouter un autre colis » : clone du premier cadre, champs vidés, mode par kilo
        function addColisBox() {
            const first = getColisBoxes()[0];
            if (!first || !colisZone) return;
            const clone = first.cloneNode(true);
            clone.querySelectorAll("input").forEach((inp) => { inp.value = ""; });
            clone.querySelectorAll(".dmd-price-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "per_kg"));
            colisZone.appendChild(clone);
            renumberColisBoxes();
            refreshBoxUi(clone);
            clone.querySelector(".dmd-colis-nom")?.focus();
        }

        function removeColisBox(box) {
            if (!box || getColisBoxes().length <= 1) return;
            box.remove();
            renumberColisBoxes();
        }

        function dmdShowError(msg) {
            if (!dmdStepError) return;
            dmdStepError.textContent = msg;
            dmdStepError.classList.toggle("show", Boolean(msg));
        }

        function dmdGoTo(step) {
            demandeStep = step;
            document.querySelectorAll("#demande-form .dmd-step").forEach((sec) => {
                sec.classList.toggle("active", Number(sec.dataset.step) === step);
            });
            document.querySelectorAll("#demande-wizard-progress .dmd-progress-step").forEach((el) => {
                const n = Number(el.dataset.dstep);
                el.classList.toggle("active", n === step);
                el.classList.toggle("done", n < step);
                const dot = el.querySelector(".dmd-progress-dot");
                if (dot) dot.textContent = n < step ? "✓" : String(n);
            });
            document.querySelectorAll("#demande-wizard-progress .dmd-progress-line i").forEach((bar, idx) => {
                bar.style.width = (idx + 1 < step) ? "100%" : "0%";
            });
            const isLast = step >= 3;
            if (dmdNextBtn) dmdNextBtn.style.display = isLast ? "none" : "";
            if (dmdSubmitBtn) dmdSubmitBtn.style.display = isLast ? "" : "none";
            if (dmdPrevBtn) dmdPrevBtn.style.visibility = step <= 1 ? "hidden" : "visible";
            dmdShowError("");
        }

        window.resetDemandeWizard = () => {
            try {
                // revenir à un seul cadre vierge (mode par kilo)
                const boxes = getColisBoxes();
                boxes.slice(1).forEach((b) => b.remove());
                const first = getColisBoxes()[0];
                if (first) {
                    first.querySelectorAll("input").forEach((inp) => { inp.value = ""; });
                    first.querySelectorAll(".dmd-price-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "per_kg"));
                    renumberColisBoxes();
                    refreshBoxUi(first);
                }
                dmdNoDate = false;
                applyNoDateChoice();
                document.querySelectorAll("#demande-form .dmd-invalid").forEach((el) => el.classList.remove("dmd-invalid"));
                dmdGoTo(1);
            } catch (e) { /* modale absente */ }
        };

        if (colisZone) {
            // Bascule par kilo/par quantité + suppression d'un cadre (délégation)
            colisZone.addEventListener("click", (e) => {
                const modeBtn = e.target.closest(".dmd-price-mode-btn");
                if (modeBtn) {
                    const box = modeBtn.closest(".dmd-colis-box");
                    if (!box) return;
                    box.querySelectorAll(".dmd-price-mode-btn").forEach((b) => b.classList.remove("active"));
                    modeBtn.classList.add("active");
                    refreshBoxUi(box);
                    return;
                }
                const delBtn = e.target.closest(".dmd-colis-del");
                if (delBtn) {
                    removeColisBox(delBtn.closest(".dmd-colis-box"));
                    return;
                }
            });
            // Nom + champ « combien » pilotent en direct libellé et placeholder du montant
            colisZone.addEventListener("input", (e) => {
                const box = e.target.closest(".dmd-colis-box");
                if (!box) return;
                if (e.target.classList.contains("dmd-colis-nom") ||
                    e.target.classList.contains("dmd-kg-input") ||
                    e.target.classList.contains("dmd-qty-input")) {
                    refreshBoxUi(box);
                }
            });
        }
        dmdAddColisBtn?.addEventListener("click", addColisBox);
        // État initial : libellé + placeholder cohérents avec les champs déjà remplis
        getColisBoxes().forEach(refreshBoxUi);

        // Devise affichée sur chaque cadre
        (function setDemandeCurrency() {
            const cur = state.userCurrency || window.CCCommon?.getUserCurrency?.() || "XOF";
            document.querySelectorAll(".dmd-colis-cur").forEach((tag) => { tag.textContent = cur; });
        })();

        dmdNextBtn?.addEventListener("click", () => {
            if (demandeStep === 1) {
                // Etape 1 (trajet) : AUCUN champ optionnel ici -> pays + ville (depart et arrivee)
                // obligatoires, et pour la date : une date limite OU « Pas de date limite » (Yoyo).
                const readVal = (id) => (document.getElementById(id)?.value || "").trim();
                const missing = [];
                if (!readVal("demande-origin")) missing.push({ id: "demande-origin", label: "le pays de depart" });
                if (!readVal("city-demande-origin")) missing.push({ id: "city-demande-origin", label: "la ville de depart" });
                if (!readVal("demande-destination")) missing.push({ id: "demande-destination", label: "le pays d'arrivee" });
                if (!readVal("city-demande-destination")) missing.push({ id: "city-demande-destination", label: "la ville d'arrivee" });
                if (!readVal("demande-date") && !dmdNoDate) {
                    missing.push({ id: "demande-date", label: "la date limite (ou touchez « Pas de date limite »)" });
                }
                document.querySelectorAll("#demande-form .dmd-invalid").forEach((el) => el.classList.remove("dmd-invalid"));
                if (missing.length) {
                    missing.forEach((m) => document.getElementById(m.id)?.classList.add("dmd-invalid"));
                    document.getElementById(missing[0].id)?.focus?.();
                    dmdShowError(missing.length === 1
                        ? `Indiquez ${missing[0].label} pour continuer.`
                        : `A completer : ${missing.map((m) => m.label).join(", ")}.`);
                    return;
                }
                dmdShowError("");
                dmdGoTo(2);
            } else if (demandeStep === 2) {
                // Validation : chaque cadre a son « combien » (kg ou quantité) ; le montant reste optionnel
                const boxes = getColisBoxes();
                if (!boxes.length) { dmdShowError("Ajoutez au moins un colis."); return; }
                for (let i = 0; i < boxes.length; i++) {
                    const box = boxes[i];
                    const isKg = getBoxMode(box) === "per_kg";
                    const raw = (isKg ? box.querySelector(".dmd-kg-input")?.value : box.querySelector(".dmd-qty-input")?.value) || "";
                    const val = Number(raw);
                    if (!raw || !isFinite(val) || val <= 0 || (!isKg && !Number.isInteger(val))) {
                        dmdShowError(isKg
                            ? `Indiquez le poids du colis n°${i + 1} (en kilos).`
                            : `Indiquez combien de colis pour le colis n°${i + 1}.`);
                        return;
                    }
                    const priceRaw = box.querySelector(".dmd-price-input")?.value;
                    if (priceRaw !== undefined && String(priceRaw).trim() !== "" &&
                        (!isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
                        dmdShowError(`Le montant propose du colis n°${i + 1} n'est pas valide.`);
                        return;
                    }
                }
                dmdGoTo(3);
            }
        });

        dmdPrevBtn?.addEventListener("click", () => {
            if (demandeStep > 1) dmdGoTo(demandeStep - 1);
        });

        document.getElementById("demande-submit-btn")?.addEventListener("click", async () => {
            const origin = document.getElementById("demande-origin")?.value?.trim();
            const destination = document.getElementById("demande-destination")?.value?.trim();
            const villeDepart = document.getElementById("city-demande-origin")?.value?.trim();
            const villeArrivee = document.getElementById("city-demande-destination")?.value?.trim();
            const description = document.getElementById("demande-description")?.value?.trim();
            const dateLimite = document.getElementById("demande-date")?.value || null;
            // Un objet de colis par cadre : chaque colis garde son propre mode et son propre prix
            const boxes = getColisBoxes();
            const items = boxes.map((box) => {
                const isKg = getBoxMode(box) === "per_kg";
                const nomRaw = getBoxNom(box);
                const valRaw = (isKg ? box.querySelector(".dmd-kg-input") : box.querySelector(".dmd-qty-input"))?.value;
                const valNum = Number(valRaw);
                const priceRaw = box.querySelector(".dmd-price-input")?.value;
                const hasPrice = priceRaw !== undefined && String(priceRaw).trim() !== "";
                const priceVal = hasPrice ? Number(priceRaw) : null;
                return {
                    item_type: nomRaw || null,
                    price_mode: hasPrice ? (isKg ? "per_kg" : "total") : null,
                    weight_kg: isKg ? valNum : null,
                    quantity: isKg ? null : valNum,
                    max_price_per_kg: hasPrice && isKg ? priceVal : null,
                    max_price_total: hasPrice && !isKg ? priceVal : null
                };
            });
            const first = items[0] || {};
            const firstOk = (first.weight_kg != null && first.weight_kg > 0) || (first.quantity != null && first.quantity > 0);
            if (!origin || !destination || !description || !items.length || !firstOk) {
                alert("Veuillez remplir tous les champs.");
                return;
            }
            const feedback = document.getElementById("demande-feedback");
            const submitBtn = document.getElementById("demande-submit-btn");
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }
                if (dmdPrevBtn) dmdPrevBtn.style.visibility = "hidden";
                if (window.ccSupabase) {
                    const userId = window.CCCommon.state?.user?.id;
                    if (!userId) {
                        alert("Vous devez etre connecte pour faire une demande.");
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
                        return;
                    }
                    const { error } = await window.ccSupabase.from("parcel_requests").insert({
                        user_id: userId,
                        title: `Demande ${origin} -> ${destination}`,
                        origin,
                        destination,
                        weight_kg: first.weight_kg ?? null,
                        quantity: first.quantity ?? null,
                        needed_by_date: dateLimite || null,
                        currency: state.userCurrency || window.CCCommon.getUserCurrency?.(),
                        origin_city: villeDepart || null,
                        destination_city: villeArrivee || null,
                        description,
                        item_type: first.item_type || null,
                        price_mode: first.price_mode,
                        max_price_per_kg: first.max_price_per_kg ?? null,
                        max_price_total: first.max_price_total ?? null,
                        items,
                        status: "pending"
                    });
                    if (error) throw error;
                } else {
                    // Dégradé sans Supabase : l'API historique ne porte qu'un colis (le premier)
                    if (items.length > 1) console.warn("Mode API historique : seul le premier colis de la demande est envoye.");
                    await window.CCCommon.api("/api/parcel-requests", { method: "POST", body: { origin, destination, kg: first.weight_kg ?? null, quantity: first.quantity ?? null, description, dateLimite } });
                }
                console.log("Demande de trajet inseree avec succes!");
                if (feedback) feedback.classList.remove("hidden");
                if (submitBtn) submitBtn.classList.add("hidden");
                setTimeout(() => {
                    document.getElementById("demande-trajet-modal")?.classList.add("hidden");
                }, 1500);
            } catch (err) {
                console.error("Erreur soumission demande:", err);
                alert("Erreur: " + (err.message || "Impossible de soumettre la demande."));
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
            }
        });
    });

    // ===== MOBILE FILTER LOGIC =====
    const mobileFilter = {
        active: {},
        overlay: document.getElementById("mobile-filter-overlay"),
        sheet: document.getElementById("mobile-filter-sheet"),
        weightSheet: document.getElementById("slider-weight-sheet"),
        weightOverlay: document.getElementById("slider-weight-overlay"),

        init() {
            document.getElementById("mobile-filter-trigger")?.addEventListener("click", () => this.open());
            document.getElementById("mf-close")?.addEventListener("click", () => this.close());
            this.overlay?.addEventListener("click", () => this.close());

            // Miroirs mf → desktop : synchro sur "input" ET "change" (le helper pays
            // setupCountryInput dispatch "change" au clic sur une suggestion — sans quoi
            // le choix dans le sheet ne copierait pas la valeur vers res-origin/res-dest)
            const mfOrigin = document.getElementById("mf-origin");
            if (mfOrigin) {
                const syncOrigin = (e) => {
                    document.getElementById("res-origin").value = e.target.value;
                };
                mfOrigin.addEventListener("input", syncOrigin);
                mfOrigin.addEventListener("change", syncOrigin);
            }
            const mfDest = document.getElementById("mf-dest");
            if (mfDest) {
                const syncDest = (e) => {
                    document.getElementById("res-dest").value = e.target.value;
                };
                mfDest.addEventListener("input", syncDest);
                mfDest.addEventListener("change", syncDest);
            }
            document.getElementById("mf-date")?.addEventListener("change", (e) => {
                document.getElementById("res-date").value = e.target.value;
            });

            const syncFromDesktop = () => {
                document.getElementById("mf-origin").value = document.getElementById("res-origin")?.value || "";
                document.getElementById("mf-dest").value = document.getElementById("res-dest")?.value || "";
                document.getElementById("mf-date").value = document.getElementById("res-date")?.value || "";
            };
            const origOpen = this.open.bind(this);
            this.open = () => { syncFromDesktop(); origOpen(); };

            document.getElementById("mf-apply")?.addEventListener("click", () => {
                this.syncToDesktop();
                this.close();
                if (typeof loadOffers === "function") loadOffers();
            });

            // « Effacer tout » : vide les filtres actifs + les champs du sheet ET leurs
            // miroirs desktop, puis recharge les offres (le sheet reste ouvert)
            document.getElementById("mf-clear-all")?.addEventListener("click", () => {
                this.active = {};
                this.renderActiveTags();
                ["mf-origin", "mf-dest", "mf-date"].forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
                ["res-origin", "res-dest", "res-date"].forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
                if (typeof loadOffers === "function") loadOffers();
            });

            const weightInput = document.getElementById("slider-weight-input");
            weightInput?.addEventListener("input", () => {
                document.getElementById("slider-weight-value").textContent = Number(weightInput.value) + " kg";
            });
            document.getElementById("slider-weight-ok")?.addEventListener("click", () => {
                this.active.weight = Number(weightInput.value);
                document.getElementById("mf-chip-weight").classList.add("is-active");
                this.renderActiveTags();
                this.closeWeightSlider();
            });
            document.getElementById("slider-weight-cancel")?.addEventListener("click", () => this.closeWeightSlider());
            this.weightOverlay?.addEventListener("click", () => this.closeWeightSlider());
        },

        open() { this.overlay?.classList.add("is-open"); this.sheet?.classList.add("is-open"); },
        close() { this.overlay?.classList.remove("is-open"); this.sheet?.classList.remove("is-open"); },

        openWeightSlider() {
            this.weightOverlay?.classList.add("is-open"); this.weightSheet?.classList.add("is-open");
            const val = this.active.weight || 11;
            document.getElementById("slider-weight-input").value = val;
            document.getElementById("slider-weight-value").textContent = val + " kg";
        },
        closeWeightSlider() { this.weightOverlay?.classList.remove("is-open"); this.weightSheet?.classList.remove("is-open"); },

        renderActiveTags() {
            const container = document.getElementById("mf-tags");
            const entries = Object.entries(this.active).filter(([, v]) => v !== false && v !== undefined);
            const labels = { verified: "Voyageurs vérifiés", urgent: "Départ proche", weight: "", price: "" };
            container.innerHTML = entries.map(([key, val]) => {
                const label = key === "weight" ? "Poids min: " + val + " kg"
                    : key === "price" ? "Prix max: " + Number(val).toLocaleString("fr-FR") + " CFA/kg"
                    : labels[key] || key;
                return `<span class="mfa-tag">${label}<button data-remove="${key}">&times;</button></span>`;
            }).join("");
            container.querySelectorAll("button[data-remove]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    delete this.active[btn.dataset.remove];
                    document.querySelector(`.mf-chip[data-chip="${btn.dataset.remove}"]`)?.classList.remove("is-active");
                    this.renderActiveTags();
                });
            });
        },

        syncToDesktop() {
            document.getElementById("res-origin").value = document.getElementById("mf-origin")?.value || "";
            document.getElementById("res-dest").value = document.getElementById("mf-dest")?.value || "";
            document.getElementById("res-date").value = document.getElementById("mf-date")?.value || "";
            if (typeof state !== "undefined") {
                state.filterVerified = !!this.active.verified;
                state.filterWeight10 = (this.active.weight || 0) >= 10;
                state.filterUrgent = !!this.active.urgent;
            }
            if (this.active.weight) document.getElementById("res-weight").value = this.active.weight;
        }
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
        mobileFilter.init();
    } else {
        document.addEventListener("DOMContentLoaded", () => mobileFilter.init());
    }
})();
