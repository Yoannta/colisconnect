/* ============================================================
   results.js — place de marché ColisConnect (refonte 2026-11-02)
   -----------------------------------------------------------------
   Un seul état appliqué (state.filters) alimente :
     - la barre de recherche desktop
     - la feuille de filtres mobile (brouillon + Appliquer)
     - les pastilles, les chips et le tri
   Un seul point de rendu par section : renderOffers() / renderDemands().
   Les cartes viennent de results-card.js (aucun template inline).
   ============================================================ */
(() => {
    "use strict";

    const CC = window.CCCommon;
    const $ = (id) => document.getElementById(id);
    const esc = (value) => (CC && CC.escapeHtml
        ? CC.escapeHtml(String(value === undefined || value === null ? "" : value))
        : String(value === undefined || value === null ? "" : value)
            .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
    const mq = window.matchMedia("(max-width: 768px)");
    const isMobile = () => mq.matches;

    const state = {
        section: "traveler",              // traveler | cargo | demand
        subSection: "traveler",           // dernier choix Simple / Cargo de la famille Offres
        currency: "EUR",
        filters: {
            origin: "",
            destination: "",
            date: "",
            minKg: null,
            verified: false,
            urgent: false,
            sort: "date",
            demandCapacity: null
        },
        offers: [],
        demands: [],
        offersLoaded: false,
        demandsLoaded: false,
        visibleOffers: 20,
        offersPageSize: 20,
        loading: { offers: false, demands: false },
        error: { offers: "", demands: "" },
        seq: { offers: 0, demands: 0 },
        lastFocus: null,
        sheetDraft: null,
        sheetDirty: false,
        demandDirty: false,
        demandTrigger: null,
        editingDemandId: null,
        demandStep: 1,
        confirmResolve: null,
        toastTimer: null
    };

    if (!CC) {
        console.error("results.js : CCCommon absent (standalone-common.js non chargé).");
        return;
    }

    const els = {
        shell: $("results-shell"),
        headline: $("results-headline"),
        subtitle: $("results-subtitle"),
        counter: $("results-counter"),
        demandCreate: $("demand-create-btn"),
        demandCreateMobile: $("demand-create-mobile-btn"),
        currencyTrigger: $("currency-trigger-btn"),
        currencyValue: $("current-currency-val"),
        currencyMenu: $("currency-menu"),
        currencySearch: $("currency-search-input"),
        currencyList: $("currency-options-list"),
        desktopTabs: [$("tab-traveler"), $("tab-cargo"), $("tab-demand")],
        mobileTabs: [$("mobile-tab-traveler"), $("mobile-tab-demand")],
        subSwitch: $("sub-switch"),
        searchPanel: $("search-panel"),
        searchForm: $("search-form"),
        searchOrigin: $("search-origin"),
        searchDest: $("search-dest"),
        searchDate: $("search-date"),
        searchWeight: $("search-weight"),
        searchCapacity: $("search-capacity"),
        searchWeightError: $("search-weight-error"),
        searchCapacityError: $("search-capacity-error"),
        searchWeightField: $("search-weight-field"),
        searchCapacityField: $("search-capacity-field"),
        searchOptions: $("search-options"),
        searchSubmit: $("search-submit"),
        searchClear: $("search-clear"),
        sortSelect: $("sort-select"),
        pillVerified: $("pill-verified"),
        pillWeight: $("pill-weight"),
        pillUrgent: $("pill-urgent"),
        activeFilters: $("active-filters"),
        activeChips: $("active-chips"),
        clearAllFilters: $("clear-all-filters"),
        offlineBanner: $("offline-banner"),
        offlineRetry: $("offline-retry"),
        resultsPanel: $("results-panel"),
        progress: $("results-progress"),
        list: $("offers-list"),
        loadMore: $("load-more-btn"),
        loadMoreStatus: $("load-more-status"),
        floating: $("mobile-filter-trigger"),
        sheet: $("mobile-filter-sheet"),
        sheetOverlay: $("mobile-filter-overlay"),
        sheetClose: $("mf-close"),
        sheetBody: $("mf-body"),
        sheetDraftNote: $("mf-draft-note"),
        mfOrigin: $("mf-origin"),
        mfDest: $("mf-dest"),
        mfDate: $("mf-date"),
        mfWeight: $("mf-weight"),
        mfWeightError: $("mf-weight-error"),
        mfWeightRange: $("mf-weight-range"),
        mfWeightRangeWrap: $("mf-weight-range-wrap"),
        mfWeightField: $("mf-weight-field"),
        mfCapacity: $("mf-capacity"),
        mfCapacityError: $("mf-capacity-error"),
        mfCapacityField: $("mf-capacity-field"),
        mfVerified: $("mf-verified"),
        mfUrgent: $("mf-urgent"),
        mfConfidence: $("mf-confidence"),
        mfUrgentSection: $("mf-urgent-section"),
        mfSortSection: $("mf-sort-section"),
        mfTags: $("mf-tags"),
        mfApply: $("mf-apply"),
        mfClearAll: $("mf-clear-all"),
        demandModal: $("demand-modal"),
        demandForm: $("demand-form"),
        demandTitle: $("demand-modal-title"),
        demandClose: $("demand-close"),
        demandOrigin: $("demand-origin"),
        demandCityOrigin: $("demand-city-origin"),
        demandDestination: $("demand-destination"),
        demandCityDestination: $("demand-city-destination"),
        demandDate: $("demand-date"),
        demandColisRows: $("demand-colis-rows"),
        demandAddColis: $("demand-add-colis"),
        demandError: $("demand-error"),
        demandPrev: $("demand-prev"),
        demandNext: $("demand-next"),
        demandSubmit: $("demand-submit"),
        demandFeedback: $("demand-feedback"),
        confirm: $("cc-confirm"),
        confirmTitle: $("cc-confirm-title"),
        confirmText: $("cc-confirm-text"),
        confirmCancel: $("cc-confirm-cancel"),
        confirmOk: $("cc-confirm-ok"),
        toast: $("cc-toast"),
        themeToggle: $("theme-toggle"),
        themeIcon: $("theme-toggle-icon")
    };

    // ─────────────────────────────────────────────────────────────
    // Utilitaires
    // ─────────────────────────────────────────────────────────────
    const normalize = (value) => String(value || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    function todayISO() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${now.getFullYear()}-${month}-${day}`;
    }

    function dateOnly(value) {
        return String(value || "").slice(0, 10);
    }

    function validDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function shortFr(value) {
        const date = validDate(value);
        if (!date) return "";
        return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }

    function currentUserId() {
        return CC.state?.user?.id || "";
    }

    function userCurrency() {
        return state.currency || CC.getUserCurrency?.() || "EUR";
    }

    // C-28 : un seul controle de poids, une seule validation. Vide = « Tous ».
    function validateKgField(input, errorEl) {
        if (!input) return true;
        const raw = String(input.value || "").trim();
        let message = "";
        if (raw !== "") {
            const value = Number(raw);
            if (!Number.isFinite(value)) message = "Nombre attendu";
            else if (value < 1) message = "Indiquez au moins 1 kg";
        }
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.hidden = !message;
        }
        input.classList.toggle("is-invalid", Boolean(message));
        if (message && errorEl) input.setAttribute("aria-describedby", errorEl.id);
        else input.removeAttribute("aria-describedby");
        return !message;
    }

    function clearKgErrors() {
        [
            [els.searchWeight, els.searchWeightError],
            [els.searchCapacity, els.searchCapacityError],
            [els.mfWeight, els.mfWeightError],
            [els.mfCapacity, els.mfCapacityError]
        ].forEach(([input, errorEl]) => {
            if (errorEl) {
                errorEl.textContent = "";
                errorEl.hidden = true;
            }
            input?.classList.remove("is-invalid");
            input?.removeAttribute("aria-describedby");
        });
    }

    function validateActiveSearchNumber() {
        return state.section === "demand"
            ? validateKgField(els.searchCapacity, els.searchCapacityError)
            : validateKgField(els.searchWeight, els.searchWeightError);
    }

    function validateActiveSheetNumber() {
        return state.section === "demand"
            ? validateKgField(els.mfCapacity, els.mfCapacityError)
            : validateKgField(els.mfWeight, els.mfWeightError);
    }

    // Acronyme affiché dans le sélecteur (pas le symbole du montant) :
    // EUR, USD, FCFA, DZD — jamais « EUR - Euro » en petit (CA-55).
    function currencyAcronym(code) {
        const key = String(code || "").toUpperCase();
        return key === "XOF" || key === "XAF" ? "FCFA" : key;
    }

    function showToast(message, type = "success") {
        if (!els.toast) return;
        const node = document.createElement("div");
        node.className = `cc-toast ${type === "error" ? "cc-toast--error" : "cc-toast--success"}`;
        node.setAttribute("role", type === "error" ? "alert" : "status");
        node.innerHTML = `<span>${esc(message)}</span><button type="button" aria-label="Fermer">&times;</button>`;
        node.querySelector("button")?.addEventListener("click", () => node.remove());
        els.toast.appendChild(node);
        // C-37 : le succes disparait seul (4 s) ; l'erreur reste jusqu'a action.
        if (type !== "error") window.setTimeout(() => node.remove(), 4000);
    }

    // ─────────────────────────────────────────────────────────────
    // Libellés et compteurs
    // ─────────────────────────────────────────────────────────────
    const SECTION_META = {
        traveler: {
            title: "Voyageurs disponibles",
            subtitle: "Comparez les voyageurs qui partent vers votre destination.",
            loading: "Chargement des voyageurs…",
            refresh: "Actualisation des offres…",
            empty: "voyageur"
        },
        cargo: {
            title: "Cargo disponibles",
            subtitle: "Comparez les transporteurs cargo et leurs unités de prix.",
            loading: "Chargement du cargo…",
            refresh: "Actualisation des offres…",
            empty: "cargo"
        },
        demand: {
            title: "Demandes de transport",
            subtitle: "Trouvez un expéditeur qui a besoin de vous.",
            loading: "Chargement des demandes…",
            refresh: "Actualisation des demandes…",
            empty: "demande"
        }
    };

    function counterLabel(count) {
        if (state.section === "demand") return `${count} demande${count > 1 ? "s" : ""}`;
        if (state.section === "cargo") return `${count} cargo${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`;
        return `${count} voyageur${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`;
    }

    function setCounter(html) {
        if (!els.counter) return;
        const offline = navigator.onLine === false
            ? ' <span class="cc-offline-badge">hors ligne</span>'
            : "";
        els.counter.innerHTML = html + offline;
    }

    function setCounterCount(count) {
        setCounter(count === 0 ? "Aucun résultat" : esc(counterLabel(count)));
    }

    // Le titre et le sous-titre suivent la section dès le premier instant,
    // y compris pendant le squelette et l'erreur (CA-03, C-03).
    function syncHeadline() {
        const meta = SECTION_META[state.section] || SECTION_META.traveler;
        if (els.headline) els.headline.textContent = meta.title;
        if (els.subtitle) {
            els.subtitle.textContent = meta.subtitle;
            els.subtitle.hidden = isMobile() && state.section === "demand";
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Chips de filtres (état appliqué ou brouillon de feuille)
    // ─────────────────────────────────────────────────────────────
    function chipsFor(filters, section) {
        const chips = [];
        if (filters.origin) chips.push({ key: "origin", label: `Départ : ${filters.origin}` });
        if (filters.destination) chips.push({ key: "destination", label: `Arrivée : ${filters.destination}` });
        if (filters.date) chips.push({ key: "date", label: `Date : ${shortFr(filters.date) || filters.date}` });
        if (section !== "demand" && filters.minKg !== null && filters.minKg !== undefined) {
            chips.push({ key: "minKg", label: `${filters.minKg} kg et +` });
        }
        if (section !== "demand" && filters.verified) chips.push({ key: "verified", label: "Voyageurs vérifiés" });
        if (section !== "demand" && filters.urgent) chips.push({ key: "urgent", label: "Départ proche" });
        if (section === "demand" && filters.demandCapacity !== null && filters.demandCapacity !== undefined) {
            chips.push({ key: "demandCapacity", label: `Capacité : ${filters.demandCapacity} kg` });
        }
        if (section !== "demand" && filters.sort && filters.sort !== "date") {
            chips.push({ key: "sort", label: "Tri : Prix croissant" });
        }
        return chips;
    }

    function chipsHtml(chips, attrName) {
        return chips.map((chip) => `
          <span class="cc-chip">
            <span>${esc(chip.label)}</span>
            <button type="button" class="cc-chip-remove" ${attrName}="${esc(chip.key)}" aria-label="Retirer le filtre ${esc(chip.label)}">&times;</button>
          </span>`).join("");
    }

    function renderActiveChips() {
        if (!els.activeFilters || !els.activeChips) return;
        const chips = chipsFor(state.filters, state.section);
        els.activeFilters.hidden = chips.length === 0;
        els.activeChips.innerHTML = chipsHtml(chips, "data-remove-filter");
    }

    function renderSheetChips() {
        if (!els.mfTags || !state.sheetDraft) return;
        const chips = chipsFor(state.sheetDraft, state.section);
        els.mfTags.innerHTML = chips.length
            ? chipsHtml(chips, "data-remove-draft")
            : '<span class="cc-muted cc-small">Aucun filtre actif</span>';
    }

    // ─────────────────────────────────────────────────────────────
    // Recherche : état ↔ champs
    // ─────────────────────────────────────────────────────────────
    function readSearchFields() {
        const filters = state.filters;
        filters.origin = els.searchOrigin?.value.trim() || "";
        filters.destination = els.searchDest?.value.trim() || "";
        filters.date = els.searchDate?.value || "";
        if (state.section === "demand") {
            const capacity = Number(els.searchCapacity?.value);
            filters.demandCapacity = els.searchCapacity?.value && Number.isFinite(capacity) && capacity > 0
                ? capacity : null;
        } else {
            const kg = Number(els.searchWeight?.value);
            filters.minKg = els.searchWeight?.value && Number.isFinite(kg) && kg > 0 ? kg : null;
        }
    }

    function syncSearchFields() {
        if (els.searchOrigin) els.searchOrigin.value = state.filters.origin;
        if (els.searchDest) els.searchDest.value = state.filters.destination;
        if (els.searchDate) els.searchDate.value = state.filters.date;
        if (els.searchWeight) els.searchWeight.value = state.filters.minKg ?? "";
        if (els.searchCapacity) els.searchCapacity.value = state.filters.demandCapacity ?? "";
        if (els.sortSelect) els.sortSelect.value = state.filters.sort || "date";
        clearKgErrors();
        syncPills();
    }

    function syncPills() {
        const weightOn = state.filters.minKg !== null && state.filters.minKg !== undefined && state.filters.minKg >= 10;
        if (els.pillVerified) els.pillVerified.setAttribute("aria-pressed", state.filters.verified ? "true" : "false");
        if (els.pillWeight) els.pillWeight.setAttribute("aria-pressed", weightOn ? "true" : "false");
        if (els.pillUrgent) els.pillUrgent.setAttribute("aria-pressed", state.filters.urgent ? "true" : "false");
    }

    function setBusy(busy) {
        if (els.list) els.list.setAttribute("aria-busy", busy ? "true" : "false");
        if (els.progress) els.progress.hidden = !busy;
        if (els.searchSubmit) {
            els.searchSubmit.classList.toggle("is-loading", Boolean(busy));
            els.searchSubmit.setAttribute("aria-busy", busy ? "true" : "false");
        }
        if (els.loadMore) els.loadMore.disabled = Boolean(busy);
    }

    // ─────────────────────────────────────────────────────────────
    // Chargement des données
    // ─────────────────────────────────────────────────────────────
    function skeletonHtml(count = 3) {
        return Array.from({ length: count }, () => `
          <div class="cc-skeleton-card" aria-hidden="true">
            <div class="cc-skeleton cc-skeleton-route"></div>
            <div class="cc-skeleton cc-skeleton-meta"></div>
            <div class="cc-skeleton cc-skeleton-foot"></div>
          </div>`).join("");
    }

    function renderSkeleton(section) {
        if (!els.list) return;
        const key = SECTION_META[section] ? section : state.section;
        const meta = SECTION_META[key] || SECTION_META.traveler;
        syncHeadline();
        // Le nombre visible de squelettes est réglé par les media queries du
        // breakpoint 768 (3 / 2 / 1) : aucun second seuil en JS.
        els.list.innerHTML = `<p class="cc-sr-only" role="status">${esc(meta.loading)}</p>${skeletonHtml(3)}`;
        setCounter("Chargement…");
    }

    async function loadOffers() {
        if (!els.list) return;
        const seq = ++state.seq.offers;
        state.loading.offers = true;
        state.error.offers = "";
        const hasData = state.offers.length > 0;
        if (!hasData) renderSkeleton(state.section);
        else {
            setBusy(true);
            setCounter(SECTION_META[state.section === "cargo" ? "cargo" : "traveler"].refresh);
        }

        readSearchFields();
        // S-17 : aucun pageSize factice. La source renvoie la liste complète ;
        // « Afficher plus » pagine localement, sans troncature silencieuse.
        const params = new URLSearchParams();
        if (state.filters.origin) params.set("origin", state.filters.origin);
        if (state.filters.destination) params.set("destination", state.filters.destination);
        if (state.filters.minKg !== null) params.set("minKg", String(state.filters.minKg));

        try {
            const payload = await CC.api(`/api/offers?${params.toString()}`, { auth: false });
            if (seq !== state.seq.offers) return;
            const items = Array.isArray(payload?.items) ? payload.items
                : Array.isArray(payload) ? payload : [];
            state.offers = items;
            state.offersLoaded = true;
            state.visibleOffers = state.offersPageSize;
            if (state.section !== "demand") renderOffers();
        } catch (error) {
            if (seq !== state.seq.offers) return;
            console.error("Chargement des offres impossible :", error);
            state.error.offers = error?.message || "Erreur réseau";
            if (state.section !== "demand") renderOffersError();
        } finally {
            if (seq === state.seq.offers) {
                state.loading.offers = false;
                setBusy(false);
            }
        }
    }

    async function loadDemands() {
        if (!els.list) return;
        const seq = ++state.seq.demands;
        state.loading.demands = true;
        state.error.demands = "";
        if (!state.demands.length) renderSkeleton("demand");
        else {
            setBusy(true);
            setCounter(SECTION_META.demand.refresh);
        }

        let items = [];
        try {
            if (window.ccSupabase) {
                const ownerColumns = CC.state?.user
                    ? "*, owner:profiles!parcel_requests_user_id_fkey(full_name, is_verified, profile_type, profile_photo)"
                    : "*";
                const { data, error } = await window.ccSupabase
                    .from("parcel_requests")
                    .select(ownerColumns)
                    .eq("status", "pending")
                    .order("created_at", { ascending: false });
                if (error) throw error;
                items = data || [];
            } else {
                const payload = await CC.api("/api/parcel-requests", { auth: false });
                items = Array.isArray(payload?.items) ? payload.items
                    : Array.isArray(payload) ? payload : [];
            }
            if (seq !== state.seq.demands) return;
            state.demands = items;
            state.demandsLoaded = true;
            if (state.section === "demand") renderDemands();
        } catch (error) {
            if (seq !== state.seq.demands) return;
            console.warn("Chargement des demandes impossible :", error);
            state.error.demands = error?.message || "Erreur réseau";
            if (state.section === "demand") renderDemandsError();
        } finally {
            if (seq === state.seq.demands) {
                state.loading.demands = false;
                setBusy(false);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Filtrage et tri
    // ─────────────────────────────────────────────────────────────
    function offerMatches(offer, filters) {
        const mode = String(offer.mode || "").trim();
        if (state.subSection === "traveler" && mode !== "") return false;
        if (state.subSection === "cargo" && mode === "") return false;

        if (filters.origin) {
            const haystack = `${normalize(offer.origin)} ${normalize(offer.city_origin || offer.cityOrigin)}`;
            if (!haystack.includes(normalize(filters.origin))) return false;
        }
        if (filters.destination) {
            const haystack = `${normalize(offer.destination)} ${normalize(offer.city_destination || offer.cityDestination)}`;
            if (!haystack.includes(normalize(filters.destination))) return false;
        }
        if (filters.minKg !== null) {
            const available = Number(offer.availableKg ?? offer.available_kg);
            if (!Number.isFinite(available) || available < filters.minKg) return false;
        }
        if (filters.verified && !(offer.ownerIsVerified || offer.owner_is_verified)) return false;
        if (filters.urgent) {
            const departure = validDate(offer.departureDate || offer.departure_date);
            if (!departure) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const limit = new Date(today);
            limit.setDate(limit.getDate() + 7);
            if (departure < today || departure > new Date(limit.getTime() + 86399999)) return false;
        }
        if (filters.date) {
            const departure = validDate(offer.departureDate || offer.departure_date);
            const limit = validDate(filters.date);
            if (departure && limit && departure > new Date(limit.getTime() + 86399999)) return false;
        }
        return true;
    }

    function sortOffers(items, filters) {
        const sorted = [...items];
        if (filters.sort === "price") {
            const rates = CC.EXCHANGE_RATES || {};
            const price = (offer) => {
                const value = Number(offer.pricePerKg ?? offer.price_per_kg);
                if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
                const from = String(offer.baseCurrency || offer.base_currency || "EUR").toUpperCase();
                const to = userCurrency();
                if (from !== to && (!rates[from] || !rates[to])) return value;
                return CC.convertCurrency(value, from, to);
            };
            sorted.sort((a, b) => price(a) - price(b));
        } else {
            sorted.sort((a, b) => {
                const dateA = validDate(a.departureDate || a.departure_date);
                const dateB = validDate(b.departureDate || b.departure_date);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA - dateB;
            });
        }
        return sorted;
    }

    function demandMatches(demand, filters) {
        if (filters.origin) {
            const haystack = `${normalize(demand.origin)} ${normalize(demand.origin_city)}`;
            if (!haystack.includes(normalize(filters.origin))) return false;
        }
        if (filters.destination) {
            const haystack = `${normalize(demand.destination)} ${normalize(demand.destination_city)}`;
            if (!haystack.includes(normalize(filters.destination))) return false;
        }
        if (filters.date) {
            const limit = dateOnly(demand.needed_by_date || demand.neededByDate);
            if (limit && limit > filters.date) return false;
        }
        if (filters.demandCapacity !== null && filters.demandCapacity !== undefined) {
            const weight = Number(demand.weight_kg);
            if (!Number.isFinite(weight) || weight > filters.demandCapacity) return false;
        }
        return true;
    }

    function splitOwn(items) {
        const userId = currentUserId();
        const own = [];
        const others = [];
        items.forEach((item) => {
            const ownerId = item.user_id || item.userId || "";
            if (userId && String(ownerId).trim() !== "" && String(ownerId) === String(userId)) own.push(item);
            else others.push(item);
        });
        return { own, others };
    }

    function groupHtml(own, others, renderCard, ownLabel, otherLabel) {
        const groups = [];
        if (own.length) {
            groups.push(`<section class="cc-group" aria-label="${esc(ownLabel)}">
              <h2 class="cc-group-head">${esc(ownLabel)}</h2>
              <div class="cc-card-grid cc-card-grid--inner">${own.map(renderCard).join("")}</div>
            </section>`);
        }
        if (others.length) {
            const label = own.length ? otherLabel : (state.section === "demand" ? "Toutes les demandes" : "Toutes les offres");
            groups.push(`<section class="cc-group" aria-label="${esc(label)}">
              <h2 class="cc-group-head">${esc(label)}</h2>
              <div class="cc-card-grid cc-card-grid--inner">${others.map(renderCard).join("")}</div>
            </section>`);
        }
        return groups.join("");
    }

    // ─────────────────────────────────────────────────────────────
    // Rendu de la liste
    // ─────────────────────────────────────────────────────────────
    function flagsAfterRender() {
        if (!els.list || !CC._getCountryCode) return;
        els.list.querySelectorAll(".cc-flag[data-flag-country]").forEach((flag) => {
            if (flag.classList.contains("fi")) return;
            const country = flag.getAttribute("data-flag-country");
            if (!country) return;
            CC._getCountryCode(country)
                .then((code) => {
                    if (flag.isConnected && /^[A-Za-z]{2}$/.test(String(code || ""))) {
                        flag.classList.add("fi", "fis", `fi-${String(code).toLowerCase()}`);
                    }
                })
                .catch(() => { /* pays inconnu : drapeau laissé vide */ });
        });
    }

    function emptyStateHtml(kind) {
        const isDemand = state.section === "demand";
        if (kind === "filter") {
            return `
              <div class="cc-empty" role="status">
                <svg class="cc-empty-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="22" cy="22" r="13"></circle><path d="M31.5 31.5L40 40"></path><path d="M16 22h12"></path></svg>
                <h2>${isDemand ? "Aucune demande ne correspond à votre recherche." : "Aucune offre ne correspond à votre recherche."}</h2>
                <p>${isDemand ? "Modifiez vos filtres ou effacez-les pour voir toutes les demandes." : "Modifiez vos filtres ou effacez-les pour voir toutes les offres."}</p>
                <div class="cc-empty-actions">
                  <button type="button" class="cc-btn cc-btn-secondary" data-action="clear-filters">Effacer les filtres</button>
                </div>
              </div>`;
        }
        if (isDemand) {
            return `
              <div class="cc-empty" role="status">
                <svg class="cc-empty-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 8h20v34H14z"></path><path d="M18 4h12v8H18z"></path><path d="M20 20h8M20 28h8M20 36h5"></path></svg>
                <h2>Aucune demande en ce moment. Revenez plus tard !</h2>
                <p>Un expéditeur qui a besoin de vous publiera peut-être sa demande bientôt.</p>
                <div class="cc-empty-actions">
                  <button type="button" class="cc-btn cc-btn-primary" data-action="create-demand">Faire une demande de trajet</button>
                </div>
              </div>`;
        }
        return `
          <div class="cc-empty" role="status">
            <svg class="cc-empty-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 36l32-12-8 10-4 10-5-10z"></path><path d="M8 20l32-12-8 10-4 10-5-10z"></path></svg>
            <h2>Aucune offre publiée pour le moment.</h2>
            <p>Soyez le premier à proposer un trajet, ou publiez une demande pour que les voyageurs vous contactent.</p>
            <div class="cc-empty-actions">
              <a class="cc-btn cc-btn-secondary" href="post_trip.html">Publier un trajet</a>
              <button type="button" class="cc-btn cc-btn-primary" data-action="create-demand">Faire une demande de trajet</button>
            </div>
          </div>`;
    }

    function errorHtml(section) {
        const message = section === "demand" ? "Impossible de charger les demandes." : "Impossible de charger les offres.";
        const cause = navigator.onLine === false
            ? "hors ligne"
            : (state.error[section === "demand" ? "demands" : "offers"] || "Erreur réseau");
        return `
          <div class="cc-error-panel" role="alert">
            <svg class="cc-error-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3l13 24H3z"></path><path d="M16 11v7M16 23v.5"></path></svg>
            <div class="cc-error-text">
              <h2>${esc(message)}</h2>
              <p>Cause : ${esc(cause)}</p>
            </div>
            <button type="button" class="cc-btn cc-btn-secondary" data-action="retry">Réessayer</button>
          </div>`;
    }

    function renderOffersError() {
        if (!els.list) return;
        syncHeadline();
        els.list.innerHTML = errorHtml("offers");
        els.loadMore.hidden = true;
        els.loadMoreStatus.hidden = true;
        setCounter("Indisponible");
        setBusy(false);
    }

    function renderDemandsError() {
        if (!els.list) return;
        syncHeadline();
        els.list.innerHTML = errorHtml("demands");
        els.loadMore.hidden = true;
        els.loadMoreStatus.hidden = true;
        setCounter("Indisponible");
        setBusy(false);
    }

    function renderOffers() {
        if (!els.list) return;
        // Une réponse vide est un état vide, pas un chargement en cours : la
        // garde s'appuie sur offersLoaded, pas sur loading (sinon squelette infini).
        if (state.loading.offers && !state.offersLoaded) {
            renderSkeleton(state.section);
            return;
        }
        if (state.error.offers) {
            renderOffersError();
            return;
        }
        const everything = state.offers.filter((offer) => {
            const mode = String(offer.mode || "").trim();
            return state.subSection === "cargo" ? mode !== "" : mode === "";
        });
        const filtered = sortOffers(everything.filter((offer) => offerMatches(offer, state.filters)), state.filters);
        updateCounterAndTitle(filtered.length);

        if (!filtered.length) {
            els.list.innerHTML = emptyStateHtml(everything.length ? "filter" : "catalog");
            els.loadMore.hidden = true;
            els.loadMoreStatus.hidden = true;
            renderActiveChips();
            setBusy(false);
            return;
        }

        // « Afficher plus » pagine localement le résultat déjà filtré : aucune
        // troncature silencieuse, le compteur affiche le total filtré (C-40).
        const ordered = splitOwn(filtered);
        const allOrdered = ordered.own.concat(ordered.others);
        const visible = allOrdered.slice(0, state.visibleOffers);
        const { own, others } = splitOwn(visible);
        els.list.innerHTML = groupHtml(
            own,
            others,
            (offer) => window.CCResultsCard.offer(offer, { currency: userCurrency(), userId: currentUserId() }),
            "Mes publications",
            "Toutes les offres"
        );
        flagsAfterRender();
        renderActiveChips();
        updateLoadMore(visible.length, filtered.length);
        setBusy(false);
    }

    function renderDemands() {
        if (!els.list) return;
        if (state.loading.demands && !state.demandsLoaded) {
            renderSkeleton("demand");
            return;
        }
        if (state.error.demands) {
            renderDemandsError();
            return;
        }
        const filtered = (state.demands || []).filter((demand) => demandMatches(demand, state.filters));
        updateCounterAndTitle(filtered.length);
        if (!filtered.length) {
            els.list.innerHTML = emptyStateHtml(state.demands.length ? "filter" : "catalog");
            els.loadMore.hidden = true;
            els.loadMoreStatus.hidden = true;
            renderActiveChips();
            setBusy(false);
            return;
        }
        const { own, others } = splitOwn(filtered);
        els.list.innerHTML = groupHtml(
            own,
            others,
            (demand) => window.CCResultsCard.demand(demand, { currency: userCurrency(), userId: currentUserId() }),
            "Mes demandes",
            "Toutes les demandes"
        );
        flagsAfterRender();
        renderActiveChips();
        els.loadMore.hidden = true;
        els.loadMoreStatus.hidden = true;
        setBusy(false);
    }

    function updateCounterAndTitle(filteredCount) {
        syncHeadline();
        setCounterCount(filteredCount);
    }

    function updateLoadMore(displayed, total) {
        if (!els.loadMore) return;
        const more = displayed < total;
        els.loadMore.hidden = !more;
        els.loadMore.disabled = state.loading.offers;
        els.loadMore.textContent = `${displayed} offres affichées sur ${total} — Afficher plus`;
        if (els.loadMoreStatus) els.loadMoreStatus.hidden = more;
    }

    // ─────────────────────────────────────────────────────────────
    // Sections
    // ─────────────────────────────────────────────────────────────
    function sectionFromTab(tab) {
        return tab === "cargo" ? "cargo" : tab === "demand" ? "demand" : "traveler";
    }

    function setSection(section, { focus = false } = {}) {
        if (!SECTION_META[section]) return;
        state.section = section;
        if (section !== "demand") state.subSection = section;
        syncSectionUi();
        renderActiveChips();

        if (section === "demand") {
            if (!state.demandsLoaded && !state.loading.demands) loadDemands();
            else renderDemands();
        } else {
            state.visibleOffers = state.offersPageSize;
            if (!state.offersLoaded && !state.loading.offers) loadOffers();
            else renderOffers();
        }
        if (focus) {
            const target = section === "demand" ? els.desktopTabs[2] : section === "cargo" ? els.desktopTabs[1] : els.desktopTabs[0];
            target?.focus();
        }
    }

    function syncSectionUi() {
        const section = state.section;
        const activeTab = section === "demand" ? "demand" : section === "cargo" ? "cargo" : "traveler";
        const tabIds = ["traveler", "cargo", "demand"];
        els.desktopTabs.forEach((tab, index) => {
            if (!tab) return;
            const selected = tabIds[index] === activeTab;
            tab.setAttribute("aria-selected", selected ? "true" : "false");
            tab.tabIndex = selected ? 0 : -1;
        });
        els.mobileTabs.forEach((tab, index) => {
            if (!tab) return;
            const selected = index === (section === "demand" ? 1 : 0);
            tab.setAttribute("aria-selected", selected ? "true" : "false");
            tab.tabIndex = selected ? 0 : -1;
        });

        // Sous-switch : famille Offres seulement
        if (els.subSwitch) {
            els.subSwitch.hidden = section === "demand";
            els.subSwitch.querySelectorAll('input[name="offer-sub"]').forEach((input) => {
                input.checked = input.value === (section === "demand" ? state.subSection : section);
            });
        }

        // Barre de recherche : variante demandes
        if (els.searchPanel) els.searchPanel.classList.toggle("cc-search-panel--demand", section === "demand");
        if (els.searchWeightField) els.searchWeightField.hidden = section === "demand";
        if (els.searchCapacityField) els.searchCapacityField.hidden = section !== "demand";
        if (els.searchOptions) els.searchOptions.hidden = section === "demand";
        if (els.demandCreate) els.demandCreate.hidden = section !== "demand";
        if (els.demandCreateMobile) els.demandCreateMobile.hidden = section !== "demand";
        if (els.resultsPanel) {
            const label = isMobile()
                ? (section === "demand" ? "mobile-tab-demand" : "mobile-tab-traveler")
                : (section === "demand" ? "tab-demand" : section === "cargo" ? "tab-cargo" : "tab-traveler");
            els.resultsPanel.setAttribute("aria-labelledby", label);
        }
        syncHeadline();
        syncSearchFields();
        syncSheetVariant();
    }

    function syncSheetVariant() {
        const demand = state.section === "demand";
        if (els.mfWeightField) els.mfWeightField.hidden = demand;
        if (els.mfWeightRangeWrap) els.mfWeightRangeWrap.hidden = demand;
        if (els.mfCapacityField) els.mfCapacityField.hidden = !demand;
        if (els.mfConfidence) els.mfConfidence.hidden = demand;
        if (els.mfUrgentSection) els.mfUrgentSection.hidden = demand;
        if (els.mfSortSection) els.mfSortSection.hidden = demand;
    }

    function reloadActive() {
        // Une recherche explicite relit la source : une demande créée depuis le
        // chargement initial doit apparaître (CA-18), comme une offre publiée.
        if (state.section === "demand") return loadDemands();
        return loadOffers();
    }

    function clearFilters({ keepSort = true } = {}) {
        const sort = keepSort ? state.filters.sort : "date";
        state.filters = {
            origin: "",
            destination: "",
            date: "",
            minKg: null,
            verified: false,
            urgent: false,
            sort,
            demandCapacity: null
        };
        syncSearchFields();
        syncPills();
        renderActiveChips();
        return reloadActive();
    }

    function updateFilter(key, value) {
        state.filters[key] = value;
        syncSearchFields();
        renderActiveChips();
    }

    function removeFilter(key) {
        if (key === "sort") state.filters.sort = "date";
        else if (key === "minKg") state.filters.minKg = null;
        else if (key === "demandCapacity") state.filters.demandCapacity = null;
        else if (key === "verified" || key === "urgent") state.filters[key] = false;
        else state.filters[key] = "";
        syncSearchFields();
        renderActiveChips();
        return reloadActive();
    }

    // ─────────────────────────────────────────────────────────────
    // Changement de section (onglets desktop / mobile / sous-switch)
    // ─────────────────────────────────────────────────────────────
    function bindSectionControls() {
        els.desktopTabs.forEach((tab, index) => {
            if (!tab) return;
            tab.addEventListener("click", () => setSection(sectionFromTab(["traveler", "cargo", "demand"][index]), { focus: false }));
            tab.addEventListener("keydown", (event) => {
                const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                let next = index;
                if (event.key === "ArrowLeft") next = (index - 1 + 3) % 3;
                if (event.key === "ArrowRight") next = (index + 1) % 3;
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = 2;
                const target = els.desktopTabs[next];
                target?.focus();
                setSection(["traveler", "cargo", "demand"][next]);
            });
        });
        els.mobileTabs.forEach((tab, index) => {
            if (!tab) return;
            tab.addEventListener("click", () => {
                if (index === 1) setSection("demand");
                else setSection(state.subSection);
            });
            tab.addEventListener("keydown", (event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "ArrowLeft" || event.key === "Home" ? 0 : 1;
                els.mobileTabs[next]?.focus();
                setSection(next === 1 ? "demand" : state.subSection);
            });
        });
        els.subSwitch?.querySelectorAll('input[name="offer-sub"]').forEach((input) => {
            input.addEventListener("change", () => {
                if (!input.checked) return;
                state.subSection = input.value === "cargo" ? "cargo" : "traveler";
                if (state.section !== "demand") setSection(state.subSection);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Recherche, pastilles, tri, chips
    // ─────────────────────────────────────────────────────────────
    function bindSearchControls() {
        els.searchForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!validateActiveSearchNumber()) {
                (state.section === "demand" ? els.searchCapacity : els.searchWeight)?.focus();
                return;
            }
            readSearchFields();
            renderActiveChips();
            reloadActive();
        });
        els.searchClear?.addEventListener("click", () => clearFilters());
        els.clearAllFilters?.addEventListener("click", () => clearFilters());
        [els.searchWeight, els.searchCapacity].forEach((input) => {
            if (!input) return;
            input.addEventListener("input", () => {
                const errorEl = input === els.searchWeight ? els.searchWeightError : els.searchCapacityError;
                validateKgField(input, errorEl);
            });
        });
        els.offlineRetry?.addEventListener("click", () => {
            if (navigator.onLine === false) {
                showToast("Toujours hors ligne. Vérifiez votre connexion.", "error");
                return;
            }
            reloadActive();
        });

        els.pillVerified?.addEventListener("click", () => {
            readSearchFields();
            state.filters.verified = !state.filters.verified;
            syncPills();
            renderActiveChips();
            reloadActive();
        });
        els.pillUrgent?.addEventListener("click", () => {
            readSearchFields();
            state.filters.urgent = !state.filters.urgent;
            syncPills();
            renderActiveChips();
            reloadActive();
        });
        els.pillWeight?.addEventListener("click", () => {
            readSearchFields();
            const active = state.filters.minKg !== null && state.filters.minKg >= 10;
            state.filters.minKg = active ? null : 10;
            syncSearchFields();
            renderActiveChips();
            reloadActive();
        });
        els.sortSelect?.addEventListener("change", () => {
            readSearchFields();
            state.filters.sort = els.sortSelect.value === "price" ? "price" : "date";
            renderActiveChips();
            if (state.section === "demand") renderDemands();
            else {
                state.visibleOffers = state.offersPageSize;
                renderOffers();
            }
        });

        els.activeChips?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-remove-filter]");
            if (!button) return;
            removeFilter(button.getAttribute("data-remove-filter"));
        });

        els.list?.addEventListener("click", handleListClick);
        els.loadMore?.addEventListener("click", () => {
            if (!els.loadMore || els.loadMore.disabled) return;
            state.visibleOffers += state.offersPageSize;
            renderOffers();
        });
    }

    function handleListClick(event) {
        const action = event.target.closest("[data-action]");
        if (action) {
            const name = action.getAttribute("data-action");
            if (name === "create-demand") openDemandModal();
            if (name === "clear-filters") clearFilters();
            if (name === "retry") reloadActive();
            return;
        }

        const accordion = event.target.closest("[data-cc-expand]");
        if (accordion) {
            const body = accordion.parentElement?.querySelector(".cc-accordion-body");
            const open = accordion.getAttribute("aria-expanded") === "true";
            accordion.setAttribute("aria-expanded", open ? "false" : "true");
            accordion.classList.toggle("is-open", !open);
            if (body) body.hidden = open;
            return;
        }

        const more = event.target.closest("[data-demand-more]");
        if (more) {
            const body = more.closest(".cc-demand-body");
            const lines = body?.querySelector(".cc-demand-lines");
            const open = more.getAttribute("aria-expanded") === "true";
            more.setAttribute("aria-expanded", open ? "false" : "true");
            lines?.classList.toggle("is-expanded", !open);
            more.textContent = open ? `Voir plus (${more.dataset.count || ""})` : "Voir moins";
            return;
        }

        const edit = event.target.closest("[data-edit-own-offer], [data-edit-own-demand]");
        if (edit) {
            const demandId = edit.getAttribute("data-edit-own-demand");
            const offerId = edit.getAttribute("data-edit-own-offer");
            if (demandId) openDemandeEditor(demandId);
            else if (offerId) window.location.href = `post_trip.html?editOffer=${encodeURIComponent(offerId)}`;
            return;
        }

        const removeDemand = event.target.closest("[data-delete-own-demand]");
        if (removeDemand) {
            deleteDemand(removeDemand.getAttribute("data-delete-own-demand"));
            return;
        }
        const removeOffer = event.target.closest("[data-delete-own-offer]");
        if (removeOffer) {
            deleteOffer(removeOffer.getAttribute("data-delete-own-offer"));
            return;
        }

        const contactDemand = event.target.closest("[data-contact-request]");
        if (contactDemand) {
            startDemandContact(contactDemand.getAttribute("data-contact-request"));
            return;
        }
        const contactOffer = event.target.closest("[data-reserve-offer]");
        if (contactOffer) {
            startReservation(contactOffer.getAttribute("data-reserve-offer"));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Contact, suppression
    // ─────────────────────────────────────────────────────────────
    async function startReservation(offerId) {
        const id = String(offerId || "").trim();
        if (!id) return;
        const target = `chat.html?offerId=${encodeURIComponent(id)}`;
        if (!CC.requireAuth(target)) return;
        const user = CC.state?.user;
        if (user && !user.profile_type) {
            try {
                const response = await CC.api("/users/me/profile", {
                    method: "PATCH",
                    body: { profileType: "client" }
                });
                if (response?.success) CC.state.user.profile_type = "client";
            } catch (error) {
                console.warn("Profil client non mis à jour :", error);
            }
        }
        window.location.href = target;
    }

    function startDemandContact(requestId) {
        const id = String(requestId || "").trim();
        if (!id) return;
        const demand = state.demands.find((item) => String(item.id) === id);
        if (demand && currentUserId() && String(demand.user_id) === String(currentUserId())) return;
        const target = `chat.html?requestId=${encodeURIComponent(id)}`;
        if (!CC.requireAuth(target)) return;
        window.location.href = target;
    }

    function maybeSessionExpired(error) {
        const message = String(error?.message || error || "");
        if (!/jwt|session|token|auth|401/i.test(message)) return false;
        openConfirm({
            title: "Votre session a expiré.",
            text: "Reconnectez-vous pour continuer.",
            okLabel: "Se reconnecter",
            danger: false
        }).then((ok) => {
            if (!ok) return;
            const next = encodeURIComponent(`${location.pathname}${location.search}`);
            window.location.href = `auth.html?next=${next}`;
        });
        return true;
    }

    function openConfirm({ title, text, okLabel = "Supprimer", danger = true }) {
        if (!els.confirm || !els.confirmTitle || !els.confirmText) return Promise.resolve(false);
        state.lastFocus = document.activeElement;
        els.confirmTitle.textContent = title;
        els.confirmText.textContent = text;
        els.confirmOk.textContent = okLabel;
        els.confirmOk.classList.toggle("cc-btn-danger", danger);
        els.confirmOk.classList.toggle("cc-btn-primary", !danger);
        els.confirm.hidden = false;
        els.confirmCancel?.focus();
        return new Promise((resolve) => { state.confirmResolve = resolve; });
    }

    function settleConfirm(value) {
        if (!els.confirm || els.confirm.hidden) return;
        els.confirm.hidden = true;
        const resolve = state.confirmResolve;
        state.confirmResolve = null;
        if (typeof resolve === "function") resolve(value);
        if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
    }

    async function deleteDemand(demandId) {
        const id = String(demandId || "").trim();
        if (!id) return;
        const ok = await openConfirm({
            title: "Supprimer cette demande ?",
            text: "Cette action est définitive. Les conversations liées seront supprimées.",
            okLabel: "Supprimer"
        });
        if (!ok) return;
        if (!window.ccSupabase) {
            showToast("Suppression indisponible : mode dégradé sans base de données.", "error");
            return;
        }
        const userId = currentUserId();
        if (!userId) {
            showToast("Vous devez être connecté pour supprimer votre demande.", "error");
            return;
        }
        try {
            const { data, error } = await window.ccSupabase
                .from("parcel_requests")
                .delete()
                .eq("id", id)
                .eq("user_id", userId)
                .select("id");
            if (error) throw error;
            if (!data || !data.length) {
                throw new Error("Suppression refusée par la base (aucune ligne supprimée). Droits manquants : politique RLS DELETE sur parcel_requests.");
            }
            state.demands = state.demands.filter((demand) => String(demand.id) !== id);
            renderDemands();
            showToast("Demande supprimée.");
        } catch (error) {
            console.error("Erreur suppression demande :", error);
            if (!maybeSessionExpired(error)) showToast(error?.message || "Suppression impossible.", "error");
        }
    }

    async function deleteOffer(offerId) {
        const id = String(offerId || "").trim();
        if (!id) return;
        const ok = await openConfirm({
            title: "Supprimer ce trajet ?",
            text: "Cette action est définitive. Les conversations liées seront supprimées.",
            okLabel: "Supprimer"
        });
        if (!ok) return;
        if (!window.ccSupabase) {
            showToast("Suppression indisponible : mode dégradé sans base de données.", "error");
            return;
        }
        try {
            const { data: deleted, error: deleteError } = await window.ccSupabase.rpc("cc_delete_own_offer", { p_offer_id: Number(id) });
            if (deleteError) throw deleteError;
            let done = deleted || 0;
            if (!done) {
                const { data: archived, error: archiveError } = await window.ccSupabase.rpc("cc_archive_own_offer", { p_offer_id: Number(id) });
                if (archiveError) throw archiveError;
                done = archived || 0;
            }
            if (!done) {
                throw new Error("Suppression refusée par la base (aucune ligne supprimée) : ce trajet n'a pas été trouvé, ou il ne vous appartient pas.");
            }
            // Nettoyage des données liées (au mieux, ne bloque jamais la suppression).
            try {
                const { data: reservations } = await window.ccSupabase.from("reservations").select("id").eq("offer_id", id);
                if (reservations && reservations.length) {
                    const reservationIds = reservations.map((row) => row.id);
                    const { data: threads } = await window.ccSupabase.from("chat_threads").select("id").in("reservation_id", reservationIds);
                    const threadIds = (threads || []).map((row) => row.id);
                    if (threadIds.length) {
                        await window.ccSupabase.from("chat_messages").delete().in("thread_id", threadIds);
                        await window.ccSupabase.from("chat_threads").delete().in("id", threadIds);
                    }
                    await window.ccSupabase.from("reservations").delete().in("id", reservationIds);
                }
                const { data: directThreads } = await window.ccSupabase.from("chat_threads").select("id").eq("offer_id", id);
                if (directThreads && directThreads.length) {
                    const threadIds = directThreads.map((row) => row.id);
                    await window.ccSupabase.from("chat_messages").delete().in("thread_id", threadIds);
                    await window.ccSupabase.from("chat_threads").delete().in("id", threadIds);
                }
            } catch (cleanupError) {
                console.warn("Nettoyage annexe partiel :", cleanupError);
            }
            state.offers = state.offers.filter((offer) => String(offer.id) !== id);
            renderOffers();
            showToast("Trajet supprimé.");
        } catch (error) {
            console.error("Erreur suppression trajet :", error);
            if (!maybeSessionExpired(error)) showToast(error?.message || "Suppression impossible.", "error");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Devise
    // ─────────────────────────────────────────────────────────────
    function currencyCodes() {
        const meta = CC.CURRENCY_META || {};
        const codes = Object.keys(meta);
        if (!codes.length) {
            const rates = CC.EXCHANGE_RATES || {};
            return Object.keys(rates).length ? Object.keys(rates) : ["EUR"];
        }
        return codes.sort((a, b) => a.localeCompare(b));
    }

    function currencyOptions(filter = "") {
        const needle = normalize(filter);
        const rates = CC.EXCHANGE_RATES || {};
        const hasRates = Object.keys(rates).length > 1;
        return currencyCodes()
            .filter((code) => {
                if (!needle) return true;
                const name = CC.currencyName?.(code) || "";
                return normalize(code).includes(needle) || normalize(name).includes(needle);
            })
            .map((code) => ({
                code,
                acronym: currencyAcronym(code),
                name: CC.currencyName?.(code) || `Devise ${code}`,
                missingRate: hasRates && !rates[code]
            }));
    }

    function renderCurrencyOptions(filter = "") {
        if (!els.currencyList) return;
        const options = currencyOptions(filter);
        if (!options.length) {
            els.currencyList.innerHTML = '<li class="cc-currency-empty" role="presentation">Aucun résultat</li>';
            return;
        }
        els.currencyList.innerHTML = options.map((option) => `
          <li role="option" id="cc-cur-opt-${esc(option.code)}" class="cc-currency-option${option.code === state.currency ? " is-selected" : ""}"
              data-value="${esc(option.code)}" aria-selected="${option.code === state.currency ? "true" : "false"}" tabindex="-1">
            <span class="cc-currency-option-code">${esc(option.acronym)}</span>
            <span class="cc-currency-option-name">${esc(option.name)}</span>
            ${option.missingRate ? '<span class="cc-warn-badge">Taux indisponible</span>' : ""}
            ${option.code === state.currency ? '<svg class="cc-currency-check" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"></path></svg>' : ""}
          </li>`).join("");
    }

    function openCurrencyMenu() {
        if (!els.currencyMenu || !els.currencyTrigger) return;
        els.currencyMenu.hidden = false;
        els.currencyTrigger.setAttribute("aria-expanded", "true");
        if (els.currencySearch) {
            els.currencySearch.value = "";
            els.currencySearch.focus();
        }
        renderCurrencyOptions("");
    }

    function closeCurrencyMenu({ focusTrigger = false } = {}) {
        if (!els.currencyMenu) return;
        els.currencyMenu.hidden = true;
        els.currencyTrigger?.setAttribute("aria-expanded", "false");
        if (focusTrigger) els.currencyTrigger?.focus();
    }

    function selectCurrency(code) {
        if (!code) return;
        state.currency = code;
        CC.saveCurrencyChoice?.(code);
        if (els.currencyValue) els.currencyValue.textContent = currencyAcronym(code);
        closeCurrencyMenu({ focusTrigger: true });
        if (state.section === "demand") renderDemands();
        else renderOffers();
    }

    function bindCurrency() {
        els.currencyTrigger?.addEventListener("click", () => {
            if (els.currencyMenu?.hidden) openCurrencyMenu();
            else closeCurrencyMenu({ focusTrigger: true });
        });
        els.currencyTrigger?.addEventListener("keydown", (event) => {
            if (["Enter", " ", "ArrowDown"].includes(event.key)) {
                event.preventDefault();
                openCurrencyMenu();
            }
            if (event.key === "Escape") closeCurrencyMenu({ focusTrigger: true });
        });
        els.currencySearch?.addEventListener("input", () => renderCurrencyOptions(els.currencySearch.value));
        els.currencySearch?.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                els.currencyList?.querySelector('[role="option"]')?.focus();
            }
            if (event.key === "Escape") {
                event.preventDefault();
                closeCurrencyMenu({ focusTrigger: true });
            }
        });
        els.currencyList?.addEventListener("click", (event) => {
            const option = event.target.closest('[role="option"]');
            if (option) selectCurrency(option.getAttribute("data-value"));
        });
        els.currencyList?.addEventListener("focusin", (event) => {
            const option = event.target.closest('[role="option"]');
            if (!option) return;
            els.currencyList.setAttribute("aria-activedescendant", option.id);
        });
        els.currencyList?.addEventListener("keydown", (event) => {
            const options = Array.from(els.currencyList.querySelectorAll('[role="option"]'));
            const index = options.indexOf(document.activeElement);
            if (event.key === "ArrowDown") {
                event.preventDefault();
                options[Math.min(index + 1, options.length - 1)]?.focus();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                if (index <= 0) els.currencySearch?.focus();
                else options[index - 1]?.focus();
            } else if (event.key === "Home") {
                event.preventDefault();
                options[0]?.focus();
            } else if (event.key === "End") {
                event.preventDefault();
                options[options.length - 1]?.focus();
            } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (index >= 0) selectCurrency(options[index].getAttribute("data-value"));
            } else if (event.key === "Escape") {
                event.preventDefault();
                closeCurrencyMenu({ focusTrigger: true });
            }
        });
        document.addEventListener("click", (event) => {
            if (!event.target.closest("#currency-wrap")) closeCurrencyMenu();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Feuille de filtres (brouillon)
    // ─────────────────────────────────────────────────────────────
    function openSheet() {
        if (!els.sheet || !els.sheetOverlay) return;
        state.lastFocus = document.activeElement;
        state.sheetDraft = {
            origin: state.filters.origin,
            destination: state.filters.destination,
            date: state.filters.date,
            minKg: state.filters.minKg,
            verified: state.filters.verified,
            urgent: state.filters.urgent,
            sort: state.filters.sort,
            demandCapacity: state.filters.demandCapacity
        };
        state.sheetDirty = false;
        syncSheetFromDraft();
        els.sheetOverlay.hidden = false;
        els.sheet.hidden = false;
        document.documentElement.classList.add("cc-sheet-open");
        setBackgroundInert(true);
        setSheetDraftUi();
        els.sheetClose?.focus();
    }

    function closeSheet({ apply = false, restoreFocus = true } = {}) {
        if (!els.sheet || !els.sheetOverlay) return;
        if (apply && state.sheetDraft) {
            state.filters = { ...state.sheetDraft };
            syncSearchFields();
            renderActiveChips();
        }
        els.sheet.hidden = true;
        els.sheetOverlay.hidden = true;
        document.documentElement.classList.remove("cc-sheet-open");
        setBackgroundInert(false);
        state.sheetDraft = null;
        state.sheetDirty = false;
        if (restoreFocus && state.lastFocus && typeof state.lastFocus.focus === "function") {
            state.lastFocus.focus();
        }
        state.lastFocus = null;
        if (apply) reloadActive();
    }

    function syncSheetFromDraft() {
        const draft = state.sheetDraft;
        if (!draft) return;
        if (els.mfOrigin) els.mfOrigin.value = draft.origin || "";
        if (els.mfDest) els.mfDest.value = draft.destination || "";
        if (els.mfDate) els.mfDate.value = draft.date || "";
        if (els.mfWeight) els.mfWeight.value = draft.minKg ?? "";
        if (els.mfWeightRange) els.mfWeightRange.value = String(Math.min(100, draft.minKg ?? 0));
        if (els.mfCapacity) els.mfCapacity.value = draft.demandCapacity ?? "";
        if (els.mfVerified) els.mfVerified.checked = Boolean(draft.verified);
        if (els.mfUrgent) els.mfUrgent.checked = Boolean(draft.urgent);
        const sort = els.sheet?.querySelector(`input[name="mf-sort"][value="${draft.sort === "price" ? "price" : "date"}"]`);
        if (sort) sort.checked = true;
        validateKgField(els.mfWeight, els.mfWeightError);
        validateKgField(els.mfCapacity, els.mfCapacityError);
        renderSheetChips();
        setSheetDraftUi();
    }

    function readSheetDraft() {
        if (!state.sheetDraft) return;
        state.sheetDraft.origin = els.mfOrigin?.value.trim() || "";
        state.sheetDraft.destination = els.mfDest?.value.trim() || "";
        state.sheetDraft.date = els.mfDate?.value || "";
        if (state.section === "demand") {
            const capacity = Number(els.mfCapacity?.value);
            state.sheetDraft.demandCapacity = els.mfCapacity?.value && Number.isFinite(capacity) && capacity > 0 ? capacity : null;
        } else {
            const kg = Number(els.mfWeight?.value);
            state.sheetDraft.minKg = els.mfWeight?.value && Number.isFinite(kg) && kg > 0 ? kg : null;
        }
        state.sheetDraft.verified = Boolean(els.mfVerified?.checked);
        state.sheetDraft.urgent = Boolean(els.mfUrgent?.checked);
        const sort = els.sheet?.querySelector('input[name="mf-sort"]:checked');
        state.sheetDraft.sort = sort?.value === "price" ? "price" : "date";
    }

    function markSheetDirty() {
        readSheetDraft();
        state.sheetDirty = true;
        renderSheetChips();
        setSheetDraftUi();
    }

    function setSheetDraftUi() {
        if (!els.sheetDraftNote) return;
        els.sheetDraftNote.hidden = !state.sheetDirty;
    }

    function clearSheetDraft() {
        if (!state.sheetDraft) return;
        state.sheetDraft = {
            origin: "",
            destination: "",
            date: "",
            minKg: null,
            verified: false,
            urgent: false,
            sort: "date",
            demandCapacity: null
        };
        state.sheetDirty = true;
        syncSheetFromDraft();
        setSheetDraftUi();
    }

    function setBackgroundInert(inert) {
        if (!("inert" in HTMLElement.prototype)) return;
        [$("results-shell"), $("site-header-root"), $("mobile-bottom-nav-root"), els.floating].forEach((element) => {
            if (element) element.inert = Boolean(inert);
        });
    }

    function focusableIn(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => !element.hidden && element.offsetParent !== null);
    }

    function trapFocus(event, container) {
        if (event.key !== "Tab") return;
        const focusables = focusableIn(container);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bindSheet() {
        els.floating?.addEventListener("click", openSheet);
        els.sheetClose?.addEventListener("click", () => closeSheet());
        els.sheetOverlay?.addEventListener("click", () => closeSheet());
        els.sheet?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSheet();
                return;
            }
            trapFocus(event, els.sheet);
        });
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (els.sheet && !els.sheet.hidden) {
                event.preventDefault();
                closeSheet();
            }
        });
        ["input", "change"].forEach((type) => {
            els.sheetBody?.addEventListener(type, (event) => {
                if (!event.target.closest("input, select, textarea")) return;
                markSheetDirty();
            });
        });

        els.mfWeight?.addEventListener("input", () => {
            const value = Number(els.mfWeight.value);
            if (els.mfWeightRange) els.mfWeightRange.value = String(Number.isFinite(value) && value > 0 ? Math.min(100, value) : 0);
        });
        els.mfWeightRange?.addEventListener("input", () => {
            const value = Number(els.mfWeightRange.value);
            if (els.mfWeight) els.mfWeight.value = value > 0 ? String(value) : "";
            validateKgField(els.mfWeight, els.mfWeightError);
        });

        els.mfClearAll?.addEventListener("click", clearSheetDraft);
        els.mfApply?.addEventListener("click", () => {
            if (!validateActiveSheetNumber()) {
                (state.section === "demand" ? els.mfCapacity : els.mfWeight)?.focus();
                return;
            }
            readSheetDraft();
            closeSheet({ apply: true, restoreFocus: true });
        });
        [els.mfWeight, els.mfCapacity].forEach((input) => {
            if (!input) return;
            input.addEventListener("input", () => {
                const errorEl = input === els.mfWeight ? els.mfWeightError : els.mfCapacityError;
                validateKgField(input, errorEl);
            });
        });
        els.mfTags?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-remove-draft]");
            if (!button || !state.sheetDraft) return;
            const key = button.getAttribute("data-remove-draft");
            if (key === "sort") state.sheetDraft.sort = "date";
            else if (key === "minKg") state.sheetDraft.minKg = null;
            else if (key === "demandCapacity") state.sheetDraft.demandCapacity = null;
            else if (key === "verified" || key === "urgent") state.sheetDraft[key] = false;
            else state.sheetDraft[key] = "";
            state.sheetDirty = true;
            syncSheetFromDraft();
            setSheetDraftUi();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Modale de demande de trajet
    // ─────────────────────────────────────────────────────────────
    function getColisBoxes() {
        return els.demandColisRows
            ? Array.from(els.demandColisRows.querySelectorAll(".cc-colis-box"))
            : [];
    }

    function getBoxName(box) {
        const raw = (box.querySelector(".cc-colis-nom")?.value || "").trim().replace(/\s+/g, " ");
        return raw ? raw.replace(/^./, (char) => char.toLowerCase()) : "";
    }

    function getBoxMode(box) {
        return box.querySelector(".cc-seg-btn.active")?.dataset.mode || "per_kg";
    }

    function boxCurrency(box) {
        return box.dataset.currency || CC.getUserCurrency?.() || state.currency || "EUR";
    }

    function setBoxCurrency(box, code) {
        if (!box || !code) return;
        box.dataset.currency = code;
        if (box.__ccPicker) box.__ccPicker.set(code);
    }

    function refreshBoxUi(box) {
        if (!box) return;
        const isKg = getBoxMode(box) === "per_kg";
        const kgField = box.querySelector(".cc-kg-field");
        const qtyField = box.querySelector(".cc-qty-field");
        if (kgField) kgField.hidden = !isKg;
        if (qtyField) qtyField.hidden = isKg;
        const name = getBoxName(box);
        const qtyLabel = box.querySelector(".cc-qty-label");
        if (qtyLabel) {
            qtyLabel.textContent = name ? `Combien de ${name} ?` : "Combien de colis ?";
            box.querySelector(".cc-qty-input")?.setAttribute("aria-label", qtyLabel.textContent);
        }
        const priceInput = box.querySelector(".cc-price-input");
        if (!priceInput) return;
        const raw = (isKg ? box.querySelector(".cc-kg-input")?.value : box.querySelector(".cc-qty-input")?.value) || "";
        const amount = Number(raw);
        const valid = Boolean(raw) && Number.isFinite(amount) && amount > 0;
        if (!valid) priceInput.placeholder = "Ex. 2500";
        else if (isKg) priceInput.placeholder = `pour ${amount} kilo${amount > 1 ? "s" : ""}`;
        else priceInput.placeholder = `pour ${amount} ${name || "colis"}`;
        const priceLabel = box.querySelector(".cc-price-label");
        if (!priceLabel) return;
        const amountText = Number.isInteger(amount) ? String(amount) : amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
        if (!valid) priceLabel.textContent = "Combien proposez-vous ?";
        else if (isKg) priceLabel.textContent = `Combien proposez-vous pour ${amountText} kg${name ? ` de ${name}` : ""} ?`;
        else {
            const plural = amount > 1 && name && !/[sxz]$/i.test(name) ? `${name}s` : name;
            priceLabel.textContent = `Combien proposez-vous pour ${amountText} ${plural || "colis"} ?`;
        }
        priceInput.setAttribute("aria-label", priceLabel.textContent);
    }

    function renumberBoxes() {
        const boxes = getColisBoxes();
        boxes.forEach((box, index) => {
            box.dataset.colis = String(index + 1);
            const title = box.querySelector(".cc-colis-title");
            if (title) title.textContent = `Colis ${index + 1}`;
            const remove = box.querySelector(".cc-colis-del");
            if (remove) remove.hidden = boxes.length <= 1;
        });
    }

    function createBox() {
        const first = getColisBoxes()[0];
        if (!first || !els.demandColisRows) return null;
        const clone = first.cloneNode(true);
        clone.querySelectorAll("input").forEach((input) => { input.value = ""; });
        clone.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
        clone.querySelectorAll(".cc-seg-btn").forEach((button) => {
            const active = button.dataset.mode === "per_kg";
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        clone.querySelectorAll(".cc-cur-picker").forEach((host) => { host.innerHTML = ""; });
        delete clone.__ccPicker;
        delete clone.dataset.currency;
        els.demandColisRows.appendChild(clone);
        renumberBoxes();
        attachBoxPicker(clone);
        refreshBoxUi(clone);
        syncDemandCurrencies();
        return clone;
    }

    function removeBox(box) {
        if (!box || getColisBoxes().length <= 1) return;
        box.remove();
        renumberBoxes();
    }

    function attachBoxPicker(box) {
        const host = box?.querySelector(".cc-cur-picker");
        if (!host || !window.CCDevise || box.__ccPicker) return box?.__ccPicker;
        box.__ccPicker = window.CCDevise.picker(host, {
            value: box.dataset.currency || "",
            placeholder: "Devise",
            onChange: (code) => { box.dataset.currency = code; }
        });
        return box.__ccPicker;
    }

    function demandCurrencyOptions() {
        const origin = els.demandOrigin?.value;
        const destination = els.demandDestination?.value;
        if (window.CCDevise?.optionsForCountries) {
            return window.CCDevise.optionsForCountries(origin, destination, {
                requireKnown: true,
                fallback: CC.getUserCurrency?.() || state.currency
            });
        }
        return [];
    }

    function syncDemandCurrencies() {
        const options = demandCurrencyOptions();
        const allowed = options.map((option) => option.value);
        getColisBoxes().forEach((box) => {
            const picker = attachBoxPicker(box);
            if (!picker) return;
            const current = boxCurrency(box);
            const list = current && !allowed.includes(current)
                ? [{ value: current, label: "Devise choisie" }].concat(options)
                : options;
            picker.setOptions(list);
            if (!picker.get()) picker.set(allowed[0] || current || "");
        });
    }

    function showDemandError(message, field) {
        if (els.demandError) {
            els.demandError.textContent = message;
            els.demandError.hidden = !message;
        }
        if (field) {
            field.classList.add("is-invalid");
            field.focus?.();
        }
    }

    function clearDemandError() {
        if (els.demandError) {
            els.demandError.textContent = "";
            els.demandError.hidden = true;
        }
        els.demandForm?.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
    }

    function goToStep(step) {
        state.demandStep = step;
        els.demandForm?.querySelectorAll(".cc-step").forEach((section) => {
            section.classList.toggle("active", Number(section.dataset.step) === step);
        });
        els.demandModal?.querySelectorAll(".cc-wizard-step").forEach((element) => {
            const number = Number(element.dataset.dstep);
            element.classList.toggle("active", number === step);
            element.classList.toggle("done", number < step);
            const dot = element.querySelector(".cc-wizard-dot");
            if (dot) dot.textContent = number < step ? "✓" : String(number);
        });
        els.demandModal?.querySelectorAll(".cc-wizard-line i").forEach((bar) => {
            bar.style.width = step >= 2 ? "100%" : "0%";
        });
        if (els.demandNext) els.demandNext.hidden = step >= 2;
        if (els.demandSubmit) els.demandSubmit.hidden = step < 2;
        if (els.demandPrev) els.demandPrev.hidden = step <= 1;
        clearDemandError();
    }

    function resetDemandForm() {
        state.editingDemandId = null;
        state.demandStep = 1;
        state.demandDirty = false;
        if (els.demandTitle) els.demandTitle.textContent = "Demande de trajet";
        if (els.demandSubmit) {
            els.demandSubmit.textContent = "Faire la demande";
            els.demandSubmit.disabled = false;
            els.demandSubmit.hidden = true;
        }
        if (els.demandFeedback) els.demandFeedback.hidden = true;
        [els.demandOrigin, els.demandCityOrigin, els.demandDestination, els.demandCityDestination, els.demandDate]
            .forEach((input) => {
                if (!input) return;
                input.value = "";
                input.classList.remove("is-invalid");
            });
        const boxes = getColisBoxes();
        boxes.slice(1).forEach((box) => box.remove());
        const first = getColisBoxes()[0];
        if (first) {
            first.querySelectorAll("input").forEach((input) => { input.value = ""; });
            first.querySelectorAll(".cc-seg-btn").forEach((button) => {
                const active = button.dataset.mode === "per_kg";
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            first.querySelectorAll(".cc-cur-picker").forEach((host) => { host.innerHTML = ""; });
            delete first.__ccPicker;
            delete first.dataset.currency;
            refreshBoxUi(first);
        }
        renumberBoxes();
        clearDemandError();
        goToStep(1);
        attachBoxPicker(first);
        syncDemandCurrencies();
    }

    function openDemandModal() {
        if (!els.demandModal) return;
        state.lastFocus = document.activeElement;
        state.demandTrigger = document.activeElement;
        resetDemandForm();
        els.demandModal.hidden = false;
        document.documentElement.classList.add("cc-modal-open");
        setBackgroundInert(true);
        els.demandOrigin?.focus();
    }

    function closeDemandModal({ force = false } = {}) {
        if (!els.demandModal || els.demandModal.hidden) return;
        const close = () => {
            els.demandModal.hidden = true;
            document.documentElement.classList.remove("cc-modal-open");
            setBackgroundInert(false);
            state.demandDirty = false;
            const restore = state.demandTrigger || state.lastFocus;
            if (restore && typeof restore.focus === "function" && document.contains(restore)) restore.focus();
            state.demandTrigger = null;
            state.lastFocus = null;
        };
        if (force || !state.demandDirty) {
            close();
            return;
        }
        openConfirm({
            title: "Abandonner cette demande ?",
            text: "Les informations saisies ne seront pas enregistrées.",
            okLabel: "Abandonner"
        }).then((ok) => { if (ok) close(); });
    }

    function validateStep1() {
        clearDemandError();
        const origin = els.demandOrigin?.value.trim() || "";
        const destination = els.demandDestination?.value.trim() || "";
        if (!origin) {
            showDemandError("Indiquez le pays de départ pour continuer.", els.demandOrigin);
            return false;
        }
        if (!destination) {
            showDemandError("Indiquez le pays d'arrivée pour continuer.", els.demandDestination);
            return false;
        }
        if (normalize(origin) === normalize(destination)) {
            showDemandError("Le pays de départ et le pays d'arrivée doivent être différents.", els.demandDestination);
            return false;
        }
        const date = els.demandDate?.value || "";
        if (date && date < todayISO()) {
            showDemandError("La date limite doit être aujourd'hui ou plus tard.", els.demandDate);
            return false;
        }
        return true;
    }

    function validateColisStep() {
        clearDemandError();
        const boxes = getColisBoxes();
        if (!boxes.length) {
            showDemandError("Ajoutez au moins un colis.");
            return false;
        }
        for (let index = 0; index < boxes.length; index += 1) {
            const box = boxes[index];
            const isKg = getBoxMode(box) === "per_kg";
            const valueField = box.querySelector(isKg ? ".cc-kg-input" : ".cc-qty-input");
            const raw = valueField?.value || "";
            const value = Number(raw);
            if (!raw || !Number.isFinite(value) || value <= 0 || (!isKg && !Number.isInteger(value))) {
                showDemandError(isKg
                    ? `Indiquez le poids du colis n°${index + 1} (en kilos).`
                    : `Indiquez combien de colis pour le colis n°${index + 1}.`, valueField);
                return false;
            }
            const priceField = box.querySelector(".cc-price-input");
            const priceRaw = priceField?.value;
            if (priceRaw !== undefined && String(priceRaw).trim() !== "" && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
                showDemandError(`Le montant proposé du colis n°${index + 1} n'est pas valide.`, priceField);
                return false;
            }
            if (!boxCurrency(box)) {
                showDemandError(`Choisissez une devise pour le colis n°${index + 1}.`);
                return false;
            }
        }
        return true;
    }

    function buildDemandPayload() {
        const boxes = getColisBoxes();
        const items = boxes.map((box) => {
            const isKg = getBoxMode(box) === "per_kg";
            const name = getBoxName(box);
            const rawValue = (isKg ? box.querySelector(".cc-kg-input") : box.querySelector(".cc-qty-input"))?.value;
            const value = Number(rawValue);
            const priceRaw = box.querySelector(".cc-price-input")?.value;
            const hasPrice = priceRaw !== undefined && String(priceRaw).trim() !== "";
            const price = hasPrice ? Number(priceRaw) : null;
            return {
                currency: boxCurrency(box),
                item_type: name || null,
                price_mode: hasPrice ? (isKg ? "per_kg" : "total") : null,
                weight_kg: isKg ? value : null,
                quantity: isKg ? null : value,
                max_price_per_kg: hasPrice && isKg ? price : null,
                max_price_total: hasPrice && !isKg ? price : null
            };
        });
        const first = items[0] || {};
        const origin = els.demandOrigin?.value.trim() || "";
        const destination = els.demandDestination?.value.trim() || "";
        const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0);
        const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        return {
            title: `Demande ${origin} -> ${destination}`,
            origin,
            destination,
            origin_city: els.demandCityOrigin?.value.trim() || null,
            destination_city: els.demandCityDestination?.value.trim() || null,
            weight_kg: totalWeight > 0 ? totalWeight : null,
            quantity: totalQuantity > 0 ? totalQuantity : null,
            needed_by_date: els.demandDate?.value || null,
            currency: first.currency || state.currency || CC.getUserCurrency?.(),
            item_type: first.item_type || null,
            price_mode: first.price_mode,
            max_price_per_kg: first.max_price_per_kg ?? null,
            max_price_total: first.max_price_total ?? null,
            items
        };
    }

    async function submitDemand() {
        if (!validateStep1()) {
            goToStep(1);
            return;
        }
        if (!validateColisStep()) return;
        const payload = buildDemandPayload();
        const submit = els.demandSubmit;
        const originalLabel = state.editingDemandId ? "Enregistrer" : "Faire la demande";
        try {
            clearDemandError();
            if (submit) {
                submit.disabled = true;
                submit.textContent = "Envoi…";
            }
            if (window.ccSupabase) {
                const userId = currentUserId();
                if (!userId) throw new Error("Vous devez être connecté pour faire une demande.");
                const result = state.editingDemandId
                    ? await window.ccSupabase.from("parcel_requests")
                        .update(payload)
                        .eq("id", state.editingDemandId)
                        .eq("user_id", userId)
                        .select("id")
                    : await window.ccSupabase.from("parcel_requests")
                        .insert({ user_id: userId, ...payload, status: "pending" })
                        .select("id");
                if (result.error) throw result.error;
                if (!result.data || !result.data.length) {
                    throw new Error(state.editingDemandId
                        ? "Modification non enregistrée : la base n'a mis à jour aucune ligne (droits RLS UPDATE manquants)."
                        : "Demande non enregistrée : la base n'a créé aucune ligne (droits RLS INSERT manquants).");
                }
            } else {
                if (payload.items.length > 1) console.warn("Mode API historique : seul le premier colis est envoyé.");
                await CC.api("/api/parcel-requests", {
                    method: "POST",
                    body: {
                        origin: payload.origin,
                        destination: payload.destination,
                        kg: payload.items[0]?.weight_kg ?? null,
                        quantity: payload.items[0]?.quantity ?? null,
                        currency: payload.items[0]?.currency || null,
                        dateLimite: payload.needed_by_date
                    }
                });
            }
            state.demandDirty = false;
            if (els.demandFeedback) els.demandFeedback.hidden = false;
            if (submit) submit.hidden = true;
            if (els.demandPrev) els.demandPrev.hidden = true;
            state.demandsLoaded = false;
            if (state.section === "demand") await loadDemands();
            window.setTimeout(() => closeDemandModal({ force: true }), 1500);
        } catch (error) {
            console.error("Erreur soumission demande :", error);
            if (submit) {
                submit.disabled = false;
                submit.textContent = originalLabel;
            }
            if (maybeSessionExpired(error)) return;
            showDemandError(error?.message || "Impossible de soumettre la demande. Réessayez.");
        }
    }

    function openDemandeEditor(demandId) {
        const demand = state.demands.find((item) => String(item.id) === String(demandId));
        if (!demand || !els.demandModal) return;
        state.lastFocus = document.activeElement;
        state.demandTrigger = document.activeElement;
        resetDemandForm();
        state.editingDemandId = demand.id;
        if (els.demandOrigin) els.demandOrigin.value = demand.origin || "";
        if (els.demandCityOrigin) els.demandCityOrigin.value = demand.origin_city || "";
        if (els.demandDestination) els.demandDestination.value = demand.destination || "";
        if (els.demandCityDestination) els.demandCityDestination.value = demand.destination_city || "";
        if (els.demandDate) els.demandDate.value = demand.needed_by_date ? String(demand.needed_by_date).slice(0, 10) : "";

        const items = Array.isArray(demand.items) && demand.items.length ? demand.items : [{
            item_type: demand.item_type,
            weight_kg: demand.weight_kg,
            quantity: demand.quantity,
            price_mode: demand.price_mode,
            max_price_per_kg: demand.max_price_per_kg,
            max_price_total: demand.max_price_total,
            currency: demand.currency
        }];
        while (getColisBoxes().length < items.length) createBox();
        getColisBoxes().forEach((box, index) => {
            const item = items[index];
            if (!item) return;
            const hasKg = item.weight_kg !== null && item.weight_kg !== undefined;
            const hasQty = item.quantity !== null && item.quantity !== undefined;
            const isKg = item.price_mode === "per_kg" || (hasKg && !hasQty);
            box.querySelectorAll(".cc-seg-btn").forEach((button) => {
                const active = button.dataset.mode === (isKg ? "per_kg" : "total");
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            const name = box.querySelector(".cc-colis-nom");
            if (name) name.value = item.item_type || "";
            const kg = box.querySelector(".cc-kg-input");
            if (kg) kg.value = hasKg ? item.weight_kg : "";
            const qty = box.querySelector(".cc-qty-input");
            if (qty) qty.value = hasQty ? item.quantity : "";
            const price = box.querySelector(".cc-price-input");
            const priceValue = isKg ? item.max_price_per_kg : item.max_price_total;
            if (price) price.value = priceValue === null || priceValue === undefined ? "" : priceValue;
            if (item.currency) setBoxCurrency(box, item.currency);
            refreshBoxUi(box);
        });
        renumberBoxes();
        syncDemandCurrencies();
        if (els.demandTitle) els.demandTitle.textContent = "Modifier ma demande";
        if (els.demandSubmit) {
            els.demandSubmit.textContent = "Enregistrer";
            els.demandSubmit.disabled = false;
            els.demandSubmit.hidden = true;
        }
        state.demandDirty = false;
        goToStep(1);
        els.demandModal.hidden = false;
        document.documentElement.classList.add("cc-modal-open");
        els.demandOrigin?.focus();
    }

    function bindDemandModal() {
        [els.demandCreate, els.demandCreateMobile].forEach((button) => {
            button?.addEventListener("click", openDemandModal);
        });
        els.demandClose?.addEventListener("click", () => closeDemandModal());
        els.demandModal?.querySelectorAll("[data-demand-close]").forEach((element) => {
            element.addEventListener("click", () => closeDemandModal());
        });
        els.demandModal?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeDemandModal();
                return;
            }
            if (event.key === "Tab") trapFocus(event, els.demandModal.querySelector(".cc-demand-card"));
        });
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (!els.demandModal || els.demandModal.hidden) return;
            if (els.confirm && !els.confirm.hidden) return;
            event.preventDefault();
            closeDemandModal();
        });
        els.demandForm?.addEventListener("input", (event) => {
            if (event.target.closest("input, select, textarea")) state.demandDirty = true;
        });
        els.demandForm?.addEventListener("change", (event) => {
            if (event.target.closest("input, select, textarea")) state.demandDirty = true;
        });
        els.demandOrigin?.addEventListener("input", syncDemandCurrencies);
        els.demandOrigin?.addEventListener("change", syncDemandCurrencies);
        els.demandDestination?.addEventListener("input", syncDemandCurrencies);
        els.demandDestination?.addEventListener("change", syncDemandCurrencies);

        els.demandColisRows?.addEventListener("click", (event) => {
            const modeButton = event.target.closest(".cc-seg-btn");
            if (modeButton) {
                const box = modeButton.closest(".cc-colis-box");
                box?.querySelectorAll(".cc-seg-btn").forEach((button) => {
                    const active = button === modeButton;
                    button.classList.toggle("active", active);
                    button.setAttribute("aria-pressed", active ? "true" : "false");
                });
                refreshBoxUi(box);
                state.demandDirty = true;
                return;
            }
            const remove = event.target.closest(".cc-colis-del");
            if (remove) {
                removeBox(remove.closest(".cc-colis-box"));
                state.demandDirty = true;
            }
        });
        els.demandColisRows?.addEventListener("input", (event) => {
            const box = event.target.closest(".cc-colis-box");
            if (!box) return;
            event.target.classList.remove("is-invalid");
            refreshBoxUi(box);
        });
        els.demandAddColis?.addEventListener("click", () => {
            createBox();
            state.demandDirty = true;
            getColisBoxes().slice(-1)[0]?.querySelector(".cc-colis-nom")?.focus();
        });
        els.demandPrev?.addEventListener("click", () => {
            if (state.demandStep > 1) goToStep(state.demandStep - 1);
        });
        els.demandNext?.addEventListener("click", () => {
            if (state.demandStep === 1 && validateStep1()) goToStep(2);
        });
        els.demandForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            if (state.demandStep === 1) {
                if (validateStep1()) goToStep(2);
                return;
            }
            submitDemand();
        });

        els.confirmCancel?.addEventListener("click", () => settleConfirm(false));
        els.confirmOk?.addEventListener("click", () => settleConfirm(true));
        els.confirm?.querySelectorAll("[data-confirm-cancel]").forEach((element) => {
            element.addEventListener("click", () => settleConfirm(false));
        });
        els.confirm?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                settleConfirm(false);
                return;
            }
            if (event.key === "Tab") trapFocus(event, els.confirm.querySelector(".cc-confirm-card"));
        });

        getColisBoxes().forEach((box) => {
            attachBoxPicker(box);
            refreshBoxUi(box);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Thème, réseau, préremplissage URL
    // ─────────────────────────────────────────────────────────────
    function bindCalmMode() {
        // Le bouton est injecté par shared-header.js : on l'attache ici pour que le
        // Mode Calme reste fonctionnel et mémorisé (CA-75).
        let toggle = null;
        const attach = () => {
            toggle = document.getElementById("calm-mode-toggle");
            if (!toggle || toggle.__ccBound) return;
            toggle.__ccBound = true;
            toggle.addEventListener("click", () => {
                const calm = document.body.classList.toggle("is-calm");
                try { localStorage.setItem("calm-mode", calm ? "true" : "false"); } catch (e) { /* stockage indisponible */ }
                toggle.setAttribute("aria-pressed", calm ? "true" : "false");
            });
        };
        attach();
        window.addEventListener("load", attach);
        try {
            if (localStorage.getItem("calm-mode") === "true") document.body.classList.add("is-calm");
        } catch (e) { /* stockage indisponible */ }
    }

    function bindTheme() {
        if (!els.themeToggle) return;
        const updateIcon = () => {
            const light = document.body.classList.contains("light");
            if (!els.themeIcon) return;
            els.themeIcon.innerHTML = light
                ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>'
                : '<path d="M20 14.5A8 8 0 0 1 9.5 4 8.4 8.4 0 1 0 20 14.5z"></path>';
            els.themeToggle.setAttribute("aria-label", light ? "Passer au thème sombre" : "Passer au thème clair");
        };
        updateIcon();
        els.themeToggle.addEventListener("click", () => {
            const light = document.body.classList.toggle("light");
            try { localStorage.setItem("cc-theme", light ? "light" : "dark"); } catch (e) { /* stockage indisponible */ }
            document.documentElement.classList.toggle("cc-theme-light", light);
            updateIcon();
        });
    }

    function bindNetwork() {
        const update = () => {
            if (els.offlineBanner) els.offlineBanner.hidden = navigator.onLine !== false;
            if (els.list) els.list.querySelectorAll(".cc-card").forEach((card) => card.classList.toggle("is-offline", navigator.onLine === false));
            // Une erreur affichée pendant la coupure nomme la cause « hors ligne ».
            if (navigator.onLine === false) {
                if (state.section === "demand" && state.error.demands) renderDemandsError();
                else if (state.section !== "demand" && state.error.offers) renderOffersError();
            }
            renderActiveChips();
            if (!els.counter) return;
            const text = els.counter.textContent || "";
            if (navigator.onLine === false && !text.includes("hors ligne")) {
                els.counter.innerHTML = `${esc(text)} <span class="cc-offline-badge">hors ligne</span>`;
            } else if (navigator.onLine !== false) {
                els.counter.innerHTML = esc(text.replace(/\s*hors ligne\s*$/, ""));
            }
        };
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        update();
    }

    function applyUrlPrefill() {
        const params = new URLSearchParams(window.location.search);
        const origin = params.get("origin") || "";
        const destination = params.get("destination") || params.get("dest") || "";
        const date = params.get("date") || "";
        const weight = params.get("weight") || params.get("minKg") || "";
        if (origin) state.filters.origin = origin;
        if (destination) state.filters.destination = destination;
        if (date) state.filters.date = date;
        if (weight) {
            const kg = Number(weight);
            if (Number.isFinite(kg) && kg > 0) state.filters.minKg = kg;
        }
        const section = params.get("section");
        if (section === "demand") state.section = "demand";
        if (section === "cargo") { state.section = "cargo"; state.subSection = "cargo"; }
        syncSearchFields();
    }

    // ─────────────────────────────────────────────────────────────
    // Démarrage
    // ─────────────────────────────────────────────────────────────
    async function boot() {
        bindSectionControls();
        bindSearchControls();
        bindSheet();
        bindDemandModal();
        bindCurrency();
        bindTheme();
        bindCalmMode();
        bindNetwork();

        if (els.floating) els.floating.hidden = true;

        try {
            await CC.init("results");
        } catch (error) {
            console.error("Initialisation impossible :", error);
            showToast("Initialisation impossible. Rechargez la page.", "error");
            return;
        }
        if (!CC.requireAuth()) return;

        state.currency = CC.getUserCurrency?.() || "EUR";
        if (els.currencyValue) els.currencyValue.textContent = currencyAcronym(state.currency);

        const countryOptions = CC.COUNTRY_OPTIONS || [];
        const datalist = $("demand-country-list");
        if (datalist && countryOptions.length) {
            datalist.innerHTML = countryOptions.map((country) => `<option value="${esc(country)}">`).join("");
        }
        if (CC.setupCountryInput) {
            ["search-origin", "search-dest", "mf-origin", "mf-dest", "demand-origin", "demand-destination"]
                .forEach((id) => {
                    const input = $(id);
                    if (input) CC.setupCountryInput(input);
                });
        }
        if (CC.setupCityAutocomplete) {
            const cityOrigin = $("demand-city-origin");
            const cityDestination = $("demand-city-destination");
            if (cityOrigin && els.demandOrigin) CC.setupCityAutocomplete(cityOrigin, els.demandOrigin);
            if (cityDestination && els.demandDestination) CC.setupCityAutocomplete(cityDestination, els.demandDestination);
        }

        applyUrlPrefill();
        syncSectionUi();

        try { await CC.loadExchangeRates?.(); } catch (error) { /* taux indisponibles : montants d'origine */ }

        if (els.shell) els.shell.hidden = false;
        if (els.floating) els.floating.hidden = false;
        renderActiveChips();
        if (mq.addEventListener) {
            mq.addEventListener("change", () => {
                if (!els.shell || els.shell.hidden) return;
                syncSectionUi();
                if (state.section === "demand") {
                    if (state.demandsLoaded) renderDemands();
                } else if (state.offersLoaded) {
                    renderOffers();
                }
            });
        }

        if (state.section === "demand") await loadDemands();
        else await loadOffers();
    }

    boot().catch((error) => {
        console.error("results.js : démarrage impossible", error);
        showToast(error?.message || "Initialisation impossible.", "error");
    });
})();
