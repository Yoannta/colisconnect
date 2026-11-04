(() => {
    const state = {
        offers: [],
        activeOffer: null,
        requests: [],
        currentView: null,
        conversations: [],
        loading: false,
        cargoOffersExpanded: false,
        cargoActiveOffers: [],
        // « Actives » ou « Archives » dans le panneau des demandes client.
        clientRequestsFilter: "active",
    };

    // Identifiant de la demande de trajet en cours de modification.
    // Doit vivre au niveau du module : le bouton « Enregistrer » est cable dans
    // bootstrap(), alors que la modale est ouverte depuis bindEvents(). Avec une
    // variable declaree dans bindEvents, l'enregistrement levait
    // « ReferenceError: _editParcelId is not defined » et ne sauvegardait rien.
    let editParcelId = null;

    // ===== Retours d'action sans alert()/confirm() natifs (S-05) =====
    let feedbackTimer = null;

    function ccNotify(message, isError = false) {
        const host = document.getElementById("dashboard-feedback");
        if (!host) { console.warn(message); return; }
        host.textContent = message || "";
        host.classList.remove("hidden", "is-error", "is-success");
        if (!message) { host.classList.add("hidden"); return; }
        host.classList.add(isError ? "is-error" : "is-success");
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => host.classList.add("hidden"), 6000);
    }

    // Remplace confirm() : promesse booleenne, focus initial sur « Annuler ».
    function ccConfirm(title, body, confirmLabel = "Supprimer") {
        return new Promise((resolve) => {
            const modal = document.getElementById("cc-confirm-modal");
            const titre = document.getElementById("cc-confirm-title");
            const corps = document.getElementById("cc-confirm-body");
            const ok = document.getElementById("cc-confirm-ok");
            const cancel = document.getElementById("cc-confirm-cancel");
            // Si la modale manque, on n'invente pas une confirmation : on refuse.
            if (!modal || !ok || !cancel) { resolve(false); return; }
            if (titre) titre.textContent = title || "Confirmer";
            if (corps) {
                corps.textContent = body || "";
                corps.classList.toggle("hidden", !body);
            }
            ok.textContent = confirmLabel;
            modal.classList.remove("hidden");
            const previous = document.activeElement;
            cancel.focus();
            const finish = (value) => {
                modal.classList.add("hidden");
                ok.removeEventListener("click", onOk);
                cancel.removeEventListener("click", onCancel);
                modal.removeEventListener("click", onBackdrop);
                document.removeEventListener("keydown", onKey);
                if (previous && typeof previous.focus === "function") previous.focus();
                resolve(value);
            };
            const onOk = () => finish(true);
            const onCancel = () => finish(false);
            const onBackdrop = (event) => { if (event.target === modal) finish(false); };
            const onKey = (event) => { if (event.key === "Escape") finish(false); };
            ok.addEventListener("click", onOk);
            cancel.addEventListener("click", onCancel);
            modal.addEventListener("click", onBackdrop);
            document.addEventListener("keydown", onKey);
        });
    }

    // Message d'erreur sous un formulaire de modale (C-22), sans alerte native.
    function setFormError(id, message) {
        const host = document.getElementById(id);
        if (!host) return;
        host.textContent = message || "";
        host.classList.toggle("hidden", !message);
    }

    const els = {
        dashboardUser: document.getElementById("dashboard-user"),
        refreshBtns: Array.from(document.querySelectorAll("[data-refresh-dashboard]")),
        manageOfferBtn: document.getElementById("manage-offer-btn"),
        editOfferBtn: document.getElementById("edit-offer-btn"),
        openMessagesBtn: document.getElementById("open-messages-btn"),
        activeOfferCard: document.getElementById("active-offer-card"),
        requestsList: document.getElementById("dash-conversations"),
        requestsCount: document.getElementById("dash-conversations-count"),
        statRemainingKg: document.getElementById("stat-remaining-kg"),
        statRemainingLabel: document.getElementById("stat-remaining-label"),
        statInterested: document.getElementById("stat-interested"),
        statInterestedLabel: document.getElementById("stat-interested-label"),
        statRevenue: document.getElementById("stat-revenue"),
        statRevenueLabel: document.getElementById("stat-revenue-label"),
        quickSummaryText: document.getElementById("quick-summary-text"),
        profileTypeBadge: document.getElementById("profile-type-badge"),
        userChip: document.getElementById("user-chip"),
        adminLink: document.getElementById("admin-link"),
        authOpenBtn: document.getElementById("auth-open-btn"),
        logoutBtn: document.getElementById("logout-btn"),
        offerModal: document.getElementById("offer-details-modal"),
        closeOfferModalBtn: document.getElementById("close-offer-modal"),
        offerModalTitle: document.getElementById("offer-modal-title"),
        offerModalSummary: document.getElementById("offer-modal-summary"),
        offerModalBadge: document.getElementById("offer-modal-badge"),
        offerEditForm: document.getElementById("offer-edit-form"),
        offerOrigin: document.getElementById("offer-origin"),
        offerDestination: document.getElementById("offer-destination"),
        offerCityOrigin: document.getElementById("city-offer-origin"),
        offerCityDestination: document.getElementById("city-offer-destination"),
        offerDepartureDate: document.getElementById("offer-departure-date"),
        offerAvailableKg: document.getElementById("offer-available-kg"),
        offerPricePerKg: document.getElementById("offer-price-per-kg"),
        offerBaseCurrency: document.getElementById("offer-base-currency"),
        saveOfferBtn: document.getElementById("save-offer-btn"),
        offerSaveFeedback: document.getElementById("offer-save-feedback"),
        // Client dashboard elements
        travelerView: document.getElementById("traveler-dashboard-view"),
        clientView: document.getElementById("client-dashboard-view"),
        clientRequestsList: document.getElementById("client-requests-list"),
        clientDiscussionsList: document.getElementById("client-discussions-list"),
        // Cargo dashboard elements
        cargoView: document.getElementById("cargo-dashboard-view"),
        cargoStatOffers: document.getElementById("cargo-stat-offers"),
        cargoStatRequests: document.getElementById("cargo-stat-requests"),
        cargoStatCapacity: document.getElementById("cargo-stat-capacity"),
        cargoOpsTable: document.getElementById("cargo-ops-table"),
        cargoFileList: document.getElementById("cargo-file-list"),
        cargoLimitBadge: document.getElementById("cargo-limit-badge"),
        cargoProgressFill: document.getElementById("cargo-progress-fill"),
        cargoLimitNote: document.getElementById("cargo-limit-note"),
        // Modale générique "Voir tous"
    };

    // [DEVISE] Sélecteur unique du site (voir devise.js)
    let offerCurrencyPicker = null;
    // Unité de prix de l'offre en cours d'édition (cargo) + montants par unité.
    let offerPriceUnit = "kg";
    let offerPriceByUnit = { kg: "", cbm: "" };
    function mountOfferCurrencyPicker() {
        const host = document.getElementById("offer-currency-picker");
        if (!host || !window.CCDevise || offerCurrencyPicker) return offerCurrencyPicker;
        offerCurrencyPicker = window.CCDevise.picker(host, {
            inputId: "offer-base-currency",
            placeholder: "Devise"
        });
        return offerCurrencyPicker;
    }

    // Met a jour les devises proposees quand l'itineraire change dans la modale.
    // Avant, les options etaient figees a l'ouverture et l'ancienne devise etait
    // enregistree meme apres un changement de pays.
    function refreshOfferCurrencyOptions() {
        if (!offerCurrencyPicker || !window.CCDevise) return;
        const current = String(els.offerBaseCurrency?.value || "").toUpperCase();
        const origin = String(els.offerOrigin?.value || "").trim();
        const destination = String(els.offerDestination?.value || "").trim();
        const opts = window.CCDevise.optionsForCountries(origin, destination, { fallback: getUserCurrency() });
        offerCurrencyPicker.setOptions(opts);
        // La devise doit SUIVRE le nouvel itineraire. Avant, l'ancienne devise
        // etait re-ajoutee dans la liste puis re-selectionnee : apres « France ->
        // Senegal », l'offre restait en EUR alors que l'option XOF etait proposee.
        // On ne conserve la selection que si elle reste valable pour ce trajet.
        const next = opts.some((o) => o.value === current) ? current : (opts[0]?.value || getUserCurrency());
        offerCurrencyPicker.set(next);
    }


    // [DEVISE] Sélecteur des demandes de trajet : mêmes règles que l'offre.
    // Deux instances distinctes (création et modification) pour ne pas mélanger
    // leurs listes quand les deux modales ont été ouvertes.
    let dashDemandeCurrencyPicker = null;
    let editParcelCurrencyPicker = null;

    function requestCurrencyIds(kind) {
        return kind === "edit"
            ? {
                host: "edit-parcel-currency-picker",
                input: "edit-parcel-currency",
                origin: "edit-parcel-origin",
                destination: "edit-parcel-destination"
            }
            : {
                host: "dash-demande-currency-picker",
                input: "dash-demande-currency",
                origin: "dash-demande-origin",
                destination: "dash-demande-destination"
            };
    }

    function mountRequestCurrencyPicker(kind) {
        const ids = requestCurrencyIds(kind);
        const existing = kind === "edit" ? editParcelCurrencyPicker : dashDemandeCurrencyPicker;
        const host = document.getElementById(ids.host);
        if (!host || !window.CCDevise || existing) return existing;
        const picker = window.CCDevise.picker(host, {
            inputId: ids.input,
            placeholder: "Devise"
        });
        if (kind === "edit") editParcelCurrencyPicker = picker;
        else dashDemandeCurrencyPicker = picker;
        return picker;
    }

    // Propose la devise du pays de départ et celle du pays d'arrivée.
    // La sélection reste valable tant qu'elle fait partie du nouvel itinéraire ;
    // sinon on retombe sur la première devise proposée.
    function refreshRequestCurrencyOptions(kind, preferred) {
        const picker = mountRequestCurrencyPicker(kind);
        if (!picker || !window.CCDevise) return;
        const ids = requestCurrencyIds(kind);
        const hidden = document.getElementById(ids.input);
        const current = String(preferred || hidden?.value || "").toUpperCase();
        const origin = String(document.getElementById(ids.origin)?.value || "").trim();
        const destination = String(document.getElementById(ids.destination)?.value || "").trim();
        const opts = window.CCDevise.optionsForCountries(origin, destination, { fallback: getUserCurrency() });
        // Une demande existante peut avoir une devise qui n'est ni celle du
        // départ ni celle de l'arrivée : on la garde proposée à l'ouverture,
        // au lieu de la remplacer silencieusement par la première devise.
        if (preferred && !opts.some((o) => o.value === current)) {
            opts.unshift({ value: current, label: "Devise de l'annonce" });
        }
        picker.setOptions(opts);
        const next = opts.some((o) => o.value === current) ? current : (opts[0]?.value || getUserCurrency());
        picker.set(next);
    }

    function getRequestCurrency(kind) {
        const picker = kind === "edit" ? editParcelCurrencyPicker : dashDemandeCurrencyPicker;
        const ids = requestCurrencyIds(kind);
        return String(
            picker?.get()
            || document.getElementById(ids.input)?.value
            || getUserCurrency()
        ).toUpperCase();
    }

    function getUserCurrency() {
        return window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : "EUR";
    }

    // Redimensionne/compresse une image (data URL) sans jamais la tronquer.
    function compressImageDataUrl(dataUrl, maxLength = 500 * 1024) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let scale = Math.min(1, 640 / Math.max(img.width || 1, img.height || 1));
                let quality = 0.86;
                for (let i = 0; i < 7; i++) {
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
                    canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
                    const ctx = canvas.getContext("2d");
                    if (!ctx) { reject(new Error("Compression d'image indisponible.")); return; }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const out = canvas.toDataURL("image/jpeg", quality);
                    if (out.length <= maxLength) { resolve(out); return; }
                    quality = Math.max(0.42, quality - 0.08);
                    scale *= 0.85;
                }
                reject(new Error("Photo trop lourde meme apres compression. Choisissez une image plus petite."));
            };
            img.onerror = () => reject(new Error("Image illisible. Choisissez un fichier image valide."));
            img.src = dataUrl;
        });
    }

    // Libelles francais du tableau cargo (le statut brut de la base est en anglais).
    const CARGO_STATUS_LABELS = {
        active: "Active",
        paused: "En pause",
        archived: "Archivee",
        expired: "Expiree",
        draft: "Brouillon",
        closed: "Fermee"
    };

    // Classification UNIQUE (identique au bridge) : les anciennes offres pouvaient
    // stocker "traveler"/"voyageur"/"simple" dans mode ; elles ne sont PAS cargo.
    function isCargoOffer(offer) {
        const mode = String(offer?.mode || "").trim().toLowerCase();
        if (mode && !["traveler", "voyageur", "simple"].includes(mode)) return true;
        return Number(offer?.available_kg ?? offer?.availableKg ?? 0) > 69;
    }

    function getCurrencyCode(user, offer) {
        const country = user?.country || user?.location || "";
        return window.CCCommon.COUNTRY_CURRENCIES[country] || offer?.baseCurrency || getUserCurrency();
    }

    function formatAmount(value, currency) {
        return window.CCCommon.formatAmount(Number(value || 0), currency || getUserCurrency());
    }

    function formatDateShort(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }

    function formatDateLong(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    }

    // Format compact (14/11/2026) pour les listes ou la place est comptee.
    function formatDateNumeric(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR");
    }

    function getProfileTypeLabel(user) {
        const type = String(user?.profile_type || "").toLowerCase();
        if (type === "traveler") return "Voyageur";
        if (type === "cargo") return "Cargo";
        if (type === "client") return "Client";
        return "Non défini";
    }

    /* Plus de couleurs en ligne : la pastille de profil prend une classe,
       tout l'habillage vit dans style.css (body.dashboard-page .accent-*). */
    function getProfileTypeClass(user) {
        const type = String(user?.profile_type || "").toLowerCase();
        if (type === "cargo") return "accent-cargo";
        if (type === "client") return "accent-client";
        if (type === "traveler") return "accent-traveler";
        return "accent-none";
    }

    // Verifie un pays a l'ENVOI (meme regle que le champ : nom exact, ou prefixe
    // qui ne correspond qu'a un seul pays). Le controle au blur ne suffit pas :
    // une valeur posee sans passer par le champ (collage, script, focus absent)
    // partait telle quelle en base.
    function normalizeCountryName(value) {
        return String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    }

    function resolveCountryName(value) {
        const target = normalizeCountryName(value);
        if (!target) return null;
        const options = window.CCCommon.COUNTRY_OPTIONS || [];
        const exact = options.find((c) => normalizeCountryName(c) === target);
        if (exact) return exact;
        const matches = options.filter((c) => normalizeCountryName(c).includes(target));
        return matches.length === 1 ? matches[0] : null;
    }

    // Une ville saisie mais jamais selectionnee dans la liste ne doit pas partir
    // telle quelle : meme regle qu'a la publication (verifierVilleAnnonce).
    // Le controle au blur ne couvre pas l'envoi au clavier (Entree depuis le champ).
    async function validateCityField(pays, ville) {
        const city = String(ville || "").trim();
        if (!city || typeof window.CCCommon?.verifierVilleAnnonce !== "function") {
            return { ok: true, ville: city };
        }
        try {
            return await window.CCCommon.verifierVilleAnnonce(pays, city);
        } catch (e) {
            return { ok: true, ville: city }; // base injoignable : on ne bloque pas
        }
    }

    function todayISO() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    // Regle metier commune aux annonces et aux demandes : le pays de depart et
    // le pays d'arrivee doivent etre differents. Detectable des que les deux
    // champs sont remplis : on l'affiche tout de suite, pas a l'envoi.
    function countriesAreSame(origin, destination) {
        const a = normalizeCountryName(origin);
        const b = normalizeCountryName(destination);
        return Boolean(a && b && a === b);
    }

    // Les champs pays peuvent etre remplis par programme (ouverture d'une modale,
    // remise a zero) : sans evenement `change`, l'autocomplete ville garde en
    // memoire l'ANCIEN pays et ne vide plus la ville quand le pays change.
    function notifyCountryChanged(ids) {
        ids.forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    // Même principe pour une date déjà passée : l'utilisateur le voit en la
    // choisissant, pas seulement après avoir cliqué sur Enregistrer.
    function updateDateHint(inputId, hintId) {
        const hint = document.getElementById(hintId);
        if (!hint) return false;
        const value = String(document.getElementById(inputId)?.value || "");
        const past = Boolean(value) && value < todayISO();
        hint.classList.toggle("hidden", !past);
        return past;
    }

    // « Pas de date limite » : état lumineux quand aucune date n'est choisie.
    function setNoDateActive(dateId, buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        const empty = !String(document.getElementById(dateId)?.value || "");
        button.classList.toggle("active", empty);
        button.setAttribute("aria-pressed", empty ? "true" : "false");
    }

    function updateSameCountryHint(originId, destinationId, hintId) {
        const hint = document.getElementById(hintId);
        if (!hint) return false;
        const same = countriesAreSame(
            document.getElementById(originId)?.value,
            document.getElementById(destinationId)?.value
        );
        hint.classList.toggle("hidden", !same);
        return same;
    }

    function getRouteLabel(offer) {
        return `${offer?.origin || "-"} -> ${offer?.destination || "-"}`;
    }

    function getActiveOffer() {
        const offers = Array.isArray(state.offers) ? state.offers : [];
        return offers.find((item) => String(item.status || "").toLowerCase() === "active") || null;
    }

    function getRequestsForOffer(offer) {
        const rows = Array.isArray(state.requests) ? state.requests : [];
        if (!offer) return rows.filter((item) => item.isOfferOwner);
        return rows.filter((item) => item.isOfferOwner && String(item.offer_id || item.offerId || "") === String(offer.id));
    }

    function setFeedback(message, isError = false) {
        if (!els.offerSaveFeedback) return;
        els.offerSaveFeedback.textContent = message || "";
        els.offerSaveFeedback.classList.toggle("hidden", !message);
        els.offerSaveFeedback.classList.toggle("is-error", Boolean(message) && isError);
        els.offerSaveFeedback.classList.toggle("is-success", Boolean(message) && !isError);
    }

    function renderProfileChip(user) {
        if (!els.profileTypeBadge) return;
        const label = getProfileTypeLabel(user);
        if (!label || label === "Non défini") {
            els.profileTypeBadge?.classList.add("hidden");
            return;
        }
        els.profileTypeBadge?.classList.remove("hidden");
        if (els.profileTypeBadge) els.profileTypeBadge.textContent = label;
        els.profileTypeBadge?.classList.remove("accent-traveler", "accent-cargo", "accent-client", "accent-none");
        els.profileTypeBadge?.classList.add(getProfileTypeClass(user));
    }

    function renderStats(offer, requests) {
        const availableKg = Number(offer?.availableKg || offer?.available_kg || 0);

        // Sans offre, la disponibilite est inconnue : un tiret, jamais un faux « 0 kg ».
        if (els.statRemainingKg) els.statRemainingKg.textContent = offer ? `${availableKg} kg` : "—";
        if (els.statRemainingLabel) els.statRemainingLabel.textContent = "Disponibles";
        if (els.statInterested) els.statInterested.textContent = `${requests.length}`;
        if (els.statInterestedLabel) els.statInterestedLabel.textContent = "Personnes intéressées";
    }

    function renderActiveOffer(offer, requests) {
        if (!els.activeOfferCard) return;
        if (!offer) {
            els.activeOfferCard.innerHTML = `
                <div class="traveler-empty-state">
                    <p>Aucune offre.</p>
                    <a href="post_trip.html" class="btn primary btn-sm">Publier un trajet</a>
                </div>`;
            return;
        }

        const baseCurrency = offer.baseCurrency || offer.base_currency || getUserCurrency();
        const requestsCount = requests.length;
        const remainingKg = Number(offer.availableKg || offer.available_kg || 0);
        const pricePerKg = Number(offer.pricePerKg || offer.price_per_kg || 0);
        const routeLine = getRouteLabel(offer);

        // ---- Carte d'offre : EXACTEMENT celle de la page des offres ----
        // Module partagé offer-card.js. Le conteneur .cards-list est requis
        // par les règles CSS « .cards-list .cc3-card ... » de style.css.
        const cardHtml = (window.CCOfferCard && typeof window.CCOfferCard.html === "function")
            ? window.CCOfferCard.html(offer, {
                userCurrency: getUserCurrency(),
                currentUserId: window.CCCommon?.state?.user?.id,
                own: true,
                ownerNameFallback: window.CCCommon?.state?.user?.fullName
                    || window.CCCommon?.state?.user?.full_name
                    || "Voyageur",
                ownerPhotoFallback: window.CCCommon?.state?.user?.profilePhoto
                    || window.CCCommon?.state?.user?.profile_photo
                    || window.CCCommon?.state?.user?.avatar || "",
                ownerVerifiedFallback: Boolean(
                    window.CCCommon?.state?.user?.isVerified
                    ?? window.CCCommon?.state?.user?.is_verified
                ),
                editAttrName: "data-edit-offer",
                deleteAttrName: "data-delete-offer",
                editLabel: "Modifier mon trajet",
                deleteLabel: "Supprimer mon trajet"
            })
            : "";

        if (cardHtml) {
            els.activeOfferCard.innerHTML = `<div class="cards-list">${cardHtml}</div>`;
        } else {
            // Repli (si offer-card.js n'est pas chargé) : ancien bloc « trajet ».
            els.activeOfferCard.innerHTML = `
            <div class="traveler-route-visual">
                <img class="traveler-route-image" src="assets/card-image-version/traveler-route-gold.webp" width="1600" height="440" alt="Illustration du trajet : point de départ, colis transporté en avion, point d'arrivée" decoding="async">
            </div>
            <div class="traveler-route-chips">
                <span class="traveler-chip">${window.CCCommon.escapeHtml(routeLine)}</span>
                <span class="traveler-chip">${window.CCCommon.escapeHtml(formatDateShort(offer.departureDate || offer.departure_date))}</span>
                <span class="traveler-chip">${window.CCCommon.escapeHtml(formatAmount(pricePerKg, baseCurrency))}/kg</span>
            </div>
            <div class="traveler-route-summary">
                <div class="traveler-route-summary-row">
                    <strong>${window.CCCommon.escapeHtml(offer.origin || "Origine")}</strong>
                    <span>${window.CCCommon.escapeHtml(offer.destination || "Destination")}</span>
                </div>
                <div class="traveler-route-meter">
                    <span class="traveler-route-meter-fill" style="width:${Math.min(90, Math.max(18, requestsCount * 18 + 12))}%"></span>
                </div>
                <p>${remainingKg} kg disponibles et ${formatAmount(pricePerKg * remainingKg, baseCurrency)} de revenu potentiel restant.</p>
                <div class="dash-row-end">
                    <button class="btn secondary btn-xs" data-edit-offer="${window.CCCommon.escapeHtml(offer.id)}">Modifier</button>
                    <button class="btn secondary btn-xs btn-danger" data-delete-offer="${window.CCCommon.escapeHtml(offer.id)}">Supprimer</button>
                </div>
            </div>`;
        }

        if (els.quickSummaryText) {
            if (els.quickSummaryText) els.quickSummaryText.textContent = `${getRouteLabel(offer)} | ${formatDateLong(offer.departureDate || offer.departure_date)} | ${remainingKg} kg restants`;
        }
    }

    function renderRequests(requests, offer) {
        if (!els.requestsList) return;
        if (els.requestsCount) els.requestsCount.textContent = `${requests.length}`;

        if (!requests.length) {
            els.requestsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune demande entrante pour le moment.</p>
                    <span>Les demandes apparaitront ici apres publication d'un trajet.</span>
                </div>`;
            return;
        }

        els.requestsList.innerHTML = requests.map((item) => {
            const title = window.CCCommon.escapeHtml(item.travelerName || "Contact");
            const preview = window.CCCommon.escapeHtml(item.preview || "Aucun message");
            const offerTitle = window.CCCommon.escapeHtml(item.offerTitle || getRouteLabel(offer));
            const initials = (item.travelerName || "C").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
            return `
                <article class="traveler-request-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="traveler-request-avatar">${window.CCCommon.escapeHtml(initials || "C")}</div>
                    <div class="traveler-request-copy">
                        <strong>${title}</strong>
                        <span>${preview}</span>
                        <small>${offerTitle}</small>
                    </div>
                    <button class="btn secondary btn-sm traveler-request-action" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                </article>`;
        }).join("");
    }

    // ===== CLIENT DASHBOARD FUNCTIONS =====

    // Libelles francais des statuts de demande (la base stocke l'anglais).
    const PARCEL_STATUS_LABELS = {
        pending: "En attente",
        accepted: "Acceptée",
        in_progress: "En cours",
        shipped: "Expédiée",
        delivered: "Livrée",
        cancelled: "Annulée",
        rejected: "Refusée"
    };

    function formatParcelStatus(status) {
        const key = String(status || "").trim().toLowerCase();
        if (!key) return "";
        return PARCEL_STATUS_LABELS[key] || status;
    }

    // Une demande livrée est archivée automatiquement dans l'interface : elle
    // quitte la liste active et passe dans « Archives ». La ligne reste en base
    // (aucune donnée n'est supprimée), ce qui permet de la republier ou de la
    // supprimer explicitement.
    function isArchivedParcel(item) {
        const status = String(item?.status || "").toLowerCase();
        return status === "delivered" || status === "archived";
    }

    function updateClientRequestFilter(allRequests) {
        const rows = Array.isArray(allRequests) ? allRequests : [];
        const activeCount = rows.filter((item) => !isArchivedParcel(item)).length;
        const archivedCount = rows.filter(isArchivedParcel).length;
        document.querySelectorAll("[data-client-requests-filter]").forEach((button) => {
            const kind = button.dataset.clientRequestsFilter === "archived" ? "archived" : "active";
            const isActive = kind === (state.clientRequestsFilter === "archived" ? "archived" : "active");
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
            button.textContent = `${kind === "archived" ? "Archives" : "Actives"} (${kind === "archived" ? archivedCount : activeCount})`;
        });
    }

    function renderClientRequests(parcelRequests) {
        if (!els.clientRequestsList) return;
        const all = Array.isArray(parcelRequests) ? parcelRequests : [];
        updateClientRequestFilter(all);

        const filter = state.clientRequestsFilter === "archived" ? "archived" : "active";
        const visible = all.filter((item) => filter === "archived" ? isArchivedParcel(item) : !isArchivedParcel(item));

        if (!visible.length) {
            els.clientRequestsList.innerHTML = filter === "archived"
                ? `<div class="traveler-empty-requests"><p>Aucune demande archivée.</p></div>`
                : `<div class="traveler-empty-requests">
                    <p>Aucune demande active pour le moment.</p>
                    <button type="button" class="btn primary btn-sm" data-open-demand-modal>Publier une demande</button>
                </div>`;
            return;
        }

        els.clientRequestsList.innerHTML = visible.map((item, i) => {
            const statusLabel = formatParcelStatus(item.status);
            // « En attente » est le cas courant : l'afficher sur chaque ligne
            // poussait l'echeance hors de la place disponible. On ne montre
            // le statut que lorsqu'il apporte une information (acceptee, livree…).
            const rawStatus = String(item.status || "").toLowerCase();
            const showStatus = statusLabel && rawStatus !== "pending";
            const isArchived = isArchivedParcel(item);
            const deadline = item.needed_by_date ? `Avant le ${formatDateNumeric(item.needed_by_date)}` : "";
            const fullDetails = [
                item.origin_city || item.destination_city
                    ? [item.origin_city, item.destination_city].filter(Boolean).join(" → ")
                    : "",
                item.weight_kg ? `${item.weight_kg} kg` : "",
                showStatus ? statusLabel : "",
                deadline
            ].filter(Boolean).join(" · ");
            const details = [
                item.origin_city || item.destination_city
                    ? [item.origin_city, item.destination_city].filter(Boolean).map(c => window.CCCommon.escapeHtml(c)).join(" &rarr; ")
                    : "",
                item.weight_kg ? `${item.weight_kg} kg` : "",
                showStatus ? window.CCCommon.escapeHtml(statusLabel) : "",
                deadline ? window.CCCommon.escapeHtml(deadline) : ""
            ].filter(Boolean).join(" &middot; ");
            return `
            <div class="client-discussion-item" data-parcel-id="${window.CCCommon.escapeHtml(item.id)}">
                <div class="client-item-index">${i + 1}</div>
                <div class="item-content">
                    <div class="item-name">${window.CCCommon.escapeHtml(item.origin || "")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "")}</div>
                    <div class="item-desc" title="${window.CCCommon.escapeHtml(fullDetails)}">${details}</div>
                </div>
                <div class="dash-row-inline">
                    ${isArchived
                        ? `<button class="client-item-btn" data-republish-parcel="${window.CCCommon.escapeHtml(item.id)}">Republier</button>`
                        : `<button class="client-item-btn" data-edit-parcel="${window.CCCommon.escapeHtml(item.id)}">Modifier</button>`}
                    <button class="client-item-btn client-item-btn-danger" data-delete-parcel="${window.CCCommon.escapeHtml(item.id)}">Supprimer</button>
                </div>
            </div>`;
        }).join("");
    }

    function renderClientDiscussions(conversations) {
        if (!els.clientDiscussionsList) return;

        if (!conversations.length) {
            els.clientDiscussionsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune discussion en cours.</p>
                    <span>Contactez un voyageur pour echanger.</span>
                </div>`;
            return;
        }

        els.clientDiscussionsList.innerHTML = conversations.map((item, i) => {
            const name = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Voyageur");
            const desc = window.CCCommon.escapeHtml(item.preview || (item.origin && item.destination ? `${item.origin} -> ${item.destination}` : ""));
            // [FIX] L'ancien code concaténait le mot « verified » au nom.
            const isVerified = Boolean(item.travelerVerified ?? item.isVerified);
            const hasNewMsg = item.hasNewMessage;
            return `
                <div class="client-discussion-item ${hasNewMsg ? "is-new" : ""}" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="client-item-index">${i + 1}</div>
                    <div class="item-content">
                        <div class="item-name">${name}${isVerified ? ' <span class="status-pill verified">Vérifié</span>' : ""}</div>
                        <div class="item-desc">${desc || "Demande en cours"}</div>
                    </div>
                    <button class="client-item-btn client-item-btn-outline" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Voir</button>
                </div>
            `;
        }).join("");
    }

    // ===== PANNEAUX ACCORDEON (dashboard chercheur) =====
    // Bouton deroulant : le contenu reste cache tant que le client n'a pas clique.
    function setupClientAccordions() {
        document.querySelectorAll("[data-accordion-toggle]").forEach((btn) => {
            if (btn.dataset.accordionReady === "1") return;
            const body = document.getElementById(btn.getAttribute("aria-controls") || "");
            if (!body) return;
            btn.dataset.accordionReady = "1";
            btn.addEventListener("click", () => {
                const willOpen = btn.getAttribute("aria-expanded") !== "true";
                btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
                body.hidden = !willOpen;
                const panel = btn.closest(".dashboard-panel") || btn.parentElement;
                panel?.classList.toggle("is-open", willOpen);
            });
        });

        // Cargo « Voir tous » (en-tete « Mes offres ») : deplie / replie le tableau
        // des offres. Cable ici, avant le garde d'auth, comme les accordeons.
        const cargoSeeAll = document.getElementById("cargo-voir-tous-trajets");
        if (cargoSeeAll && cargoSeeAll.dataset.expandReady !== "1") {
            cargoSeeAll.dataset.expandReady = "1";
            cargoSeeAll.addEventListener("click", () => {
                state.cargoOffersExpanded = state.cargoOffersExpanded !== true;
                renderCargoOffersTable(state.cargoActiveOffers || []);
            });
        }
    }
    function switchDashboardView(profileType) {
        const isTraveler = profileType === "traveler";
        const isCargo = profileType === "cargo";
        const isClient = profileType === "client";
        state.currentView = isCargo ? "cargo" : (isTraveler ? "traveler" : "client");

        if (els.travelerView) {
            els.travelerView.classList.toggle("is-active", isTraveler);
            els.travelerView.classList.toggle("hidden", !isTraveler);
        }
        if (els.clientView) {
            els.clientView.classList.toggle("is-active", isClient);
            els.clientView.classList.toggle("hidden", !isClient);
        }
        if (els.cargoView) {
            els.cargoView.classList.toggle("is-active", isCargo);
            els.cargoView.classList.toggle("hidden", !isCargo);
        }
        updateDashboardToggleState(state.currentView);
    }

    function updateDashboardToggleState(viewType) {
        const activeView = viewType || state.currentView || "client";
        document.querySelectorAll(".dash-toggle").forEach((button) => {
            button.classList.toggle("active", button.getAttribute("data-switch") === activeView);
        });

        document.querySelectorAll(".dashboard-toggles").forEach((group) => {
            const visibleButtons = Array.from(group.querySelectorAll(".dash-toggle")).filter((button) => !button.classList.contains("hidden"));
            const activeIndex = visibleButtons.findIndex((button) => button.getAttribute("data-switch") === activeView);
            // Aucune bascule disponible (profil client) : le conteneur vide dessinait
            // une barre de 10 px en travers de l'en-tete. On le masque entierement.
            group.classList.toggle("is-empty", visibleButtons.length === 0);
            group.classList.remove("toggle-count-1", "toggle-count-2", "toggle-count-3", "toggle-index-0", "toggle-index-1", "toggle-index-2");
            group.classList.add(`toggle-count-${Math.min(Math.max(visibleButtons.length, 1), 3)}`);
            group.classList.add(`toggle-index-${Math.min(Math.max(activeIndex, 0), 2)}`);
            group.classList.toggle("has-active-toggle", activeIndex >= 0 && visibleButtons.length > 0);
        });
    }

    async function loadClientDashboard() {
        const user = window.CCCommon.state.user;
        if (!user) return;

        // [FIX] Deux requetes inutilisees (offers scope=all + reservations) faisaient
        // echouer TOUT l'ecran client quand l'une tombait, pour des donnees jamais lues.
        // Et le filtre !isOfferOwner cachait au client les discussions issues de SES
        // demandes (dans ce cas offer_owner_id = client, donc isOfferOwner = true).
        // Chaque panneau est desormais independant ET remonte ses erreurs.
        const parcelsTask = (async () => {
            try {
                const parcelResp = await withTimeout(window.ccSupabase ? window.ccSupabase.from("parcel_requests")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }));
                // Une requete en erreur affichait « Aucune demande » : l'utilisateur
                // croyait avoir perdu ses demandes. On affiche la vraie erreur.
                if (parcelResp?.error) throw parcelResp.error;
                const parcelRequests = parcelResp?.data || [];
                state.parcelRequests = parcelRequests;
                renderClientRequests(parcelRequests);
            } catch (error) {
                renderPanelError(els.clientRequestsList, error, loadDashboard);
            }
        })();

        const convTask = (async () => {
            try {
                const convResp = await withTimeout(window.CCCommon.api("/api/conversations"));
                const conversations = (Array.isArray(convResp) ? convResp : [])
                    .filter(c => !c.isOfferOwner || c.kind === "request");
                state.clientConversations = conversations;
                renderClientDiscussions(conversations);
            } catch (error) {
                renderPanelError(els.clientDiscussionsList, error, loadDashboard);
            }
        })();

        await Promise.all([parcelsTask, convTask]);
    }

    function openChatPage(threadId = "", offerId = "") {
        if (threadId) {
            window.location.href = `chat.html?id=${encodeURIComponent(String(threadId))}`;
            return;
        }
        if (offerId) {
            window.location.href = `chat.html?offerId=${encodeURIComponent(String(offerId))}`;
            return;
        }
        window.location.href = "chat.html";
    }

    // ---- Dates supplémentaires d'une offre cargo (même règle que post_trip) ----
    const MAX_OFFER_EXTRA_DATES = 2;

    function getOfferExtraDateInputs() {
        return Array.from(document.querySelectorAll("#offer-extra-dates .offer-extra-date"));
    }

    function updateOfferExtraDatesAddBtn() {
        const btn = document.getElementById("offer-add-date-btn");
        if (!btn) return;
        const count = getOfferExtraDateInputs().length;
        btn.classList.toggle("hidden", count >= MAX_OFFER_EXTRA_DATES);
        btn.disabled = count >= MAX_OFFER_EXTRA_DATES;
    }

    function addOfferExtraDateRow(value = "") {
        const box = document.getElementById("offer-extra-dates");
        if (!box || getOfferExtraDateInputs().length >= MAX_OFFER_EXTRA_DATES) return;
        const row = document.createElement("div");
        row.className = "dash-extra-date-row";
        const input = document.createElement("input");
        input.type = "date";
        input.className = "cc-input estimator-input offer-extra-date";
        input.min = todayISO();
        input.value = value || "";
        input.setAttribute("aria-label", "Date supplémentaire");
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn secondary compact dash-extra-date-del";
        remove.setAttribute("aria-label", "Supprimer cette date");
        remove.textContent = "×";
        row.appendChild(input);
        row.appendChild(remove);
        box.appendChild(row);
        updateOfferExtraDatesAddBtn();
    }

    function clearOfferExtraDates() {
        const box = document.getElementById("offer-extra-dates");
        if (box) box.innerHTML = "";
        updateOfferExtraDatesAddBtn();
    }

    function getOfferExtraDateValues() {
        return getOfferExtraDateInputs().map((input) => String(input.value || "").trim()).filter(Boolean);
    }

    function applyOfferPriceUnitUi(unit) {
        document.querySelectorAll("#offer-price-unit-switch .dash-unit-btn").forEach((btn) => {
            const active = btn.getAttribute("data-unit") === unit;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-pressed", active ? "true" : "false");
        });
        if (els.offerPricePerKg) {
            els.offerPricePerKg.placeholder = unit === "cbm" ? "Prix par CBM" : "Prix par kilo";
        }
    }

    function setOfferPriceUnit(unit) {
        const next = unit === "cbm" ? "cbm" : "kg";
        if (next === offerPriceUnit) return;
        if (els.offerPricePerKg) offerPriceByUnit[offerPriceUnit] = els.offerPricePerKg.value;
        offerPriceUnit = next;
        if (els.offerPricePerKg) els.offerPricePerKg.value = offerPriceByUnit[next] ?? "";
        applyOfferPriceUnitUi(next);
    }

    function openOfferModal() {
        const offer = state.activeOffer;
        if (!offer) {
            window.location.href = "post_trip.html";
            return;
        }

        const modal = els.offerModal;
        if (!modal) return;

        if (els.offerModalTitle) els.offerModalTitle.textContent = "Modifier mon offre";
        if (els.offerModalSummary) {
            els.offerModalSummary.textContent = `Modifie les details du trajet ${getRouteLabel(offer)} et garde tes kilos à jour.`;
        }
        if (els.offerModalBadge) {
            const status = String(offer.status || "active").toLowerCase();
            els.offerModalBadge.textContent = status === "active" ? "Active" : status;
        }

        if (els.offerOrigin) els.offerOrigin.value = offer.origin || "";
        if (els.offerDestination) els.offerDestination.value = offer.destination || "";
        // Synchroniser le suivi pays de l'autocomplete ville AVANT de poser les villes.
        notifyCountryChanged(["offer-origin", "offer-destination"]);
        if (els.offerCityOrigin) els.offerCityOrigin.value = offer.city_origin || offer.cityOrigin || "";
        if (els.offerCityDestination) els.offerCityDestination.value = offer.city_destination || offer.cityDestination || "";
        if (els.offerDepartureDate) els.offerDepartureDate.value = String(offer.departureDate || offer.departure_date || "");
        // [CARGO 2026-10-19] Un cargo ne se mesure pas en kilos : on masque le champ
        // (et on ne l'enregistre pas) au lieu de le laisser avec 99999.
        const kgOffre = Number(offer.availableKg ?? offer.available_kg ?? 0);
        state.offerIsCargo = isCargoOffer(offer);
        const champKilo = document.getElementById("offer-kg-field");
        if (champKilo) champKilo.classList.toggle("hidden", state.offerIsCargo);
        if (els.offerAvailableKg) {
            els.offerAvailableKg.value = state.offerIsCargo ? "" : String(offer.availableKg ?? offer.available_kg ?? "");
        }
        if (els.offerModalSummary) {
            els.offerModalSummary.textContent = state.offerIsCargo
                ? `Modifie les details du trajet ${getRouteLabel(offer)}.`
                : `Modifie les details du trajet ${getRouteLabel(offer)} et garde tes kilos à jour.`;
        }
        const priceUnit = String(offer.price_unit || offer.priceUnit || "kg").toLowerCase() === "cbm" ? "cbm" : "kg";
        offerPriceUnit = state.offerIsCargo ? priceUnit : "kg";
        offerPriceByUnit = { kg: "", cbm: "" };
        offerPriceByUnit[offerPriceUnit] = String(offer.pricePerKg ?? offer.price_per_kg ?? "");
        if (els.offerPricePerKg) {
            els.offerPricePerKg.value = offerPriceByUnit[offerPriceUnit];
            els.offerPricePerKg.min = state.offerIsCargo ? "1" : "0";
        }
        applyOfferPriceUnitUi(offerPriceUnit);
        const priceSwitch = document.getElementById("offer-price-unit-switch");
        if (priceSwitch) priceSwitch.classList.toggle("hidden", !state.offerIsCargo);

        // Une offre cargo peut être vendue au kilo OU au CBM. Le switch suit
        // l'unité enregistrée ; l'autre unité démarre vide (aucun prix connu).
        const priceLabel = document.getElementById("offer-price-label");
        if (priceLabel) {
            priceLabel.classList.toggle("hidden", state.offerIsCargo);
            priceLabel.textContent = offerPriceUnit === "cbm" ? "Prix par CBM" : "Prix par kilo";
        }

        // Dates supplémentaires (cargo uniquement), même règle que post_trip.
        const extraWrap = document.getElementById("offer-extra-dates-wrap");
        if (extraWrap) extraWrap.classList.toggle("hidden", !state.offerIsCargo);
        clearOfferExtraDates();
        if (state.offerIsCargo) {
            const extras = Array.isArray(offer.extra_dates)
                ? offer.extra_dates
                : (Array.isArray(offer.extraDates) ? offer.extraDates : []);
            extras.slice(0, MAX_OFFER_EXTRA_DATES).forEach((date) => {
                addOfferExtraDateRow(String(date || "").slice(0, 10));
            });
        }

        // === [DEVISE] Modèle unique du site (devise.js) : mêmes devises et même
        // apparence que le formulaire de publication des offres ===
        mountOfferCurrencyPicker();
        if (offerCurrencyPicker) {
            const existing = String(offer.baseCurrency || offer.base_currency || "").toUpperCase();
            const opts = window.CCDevise.optionsForCountries(offer.origin || "", offer.destination || "", { fallback: getUserCurrency() });
            if (existing && !opts.some((o) => o.value === existing)) {
                opts.unshift({ value: existing, label: "Devise de l'annonce" });
            }
            offerCurrencyPicker.setOptions(opts);
            offerCurrencyPicker.set(existing || opts[0]?.value || getUserCurrency());
        }

        updateSameCountryHint("offer-origin", "offer-destination", "offer-same-country-hint");
        updateDateHint("offer-departure-date", "offer-date-hint");

        setFeedback("");
        modal.classList.remove("hidden");
    }

    function closeOfferModal() {
        els.offerModal?.classList.add("hidden");
        setFeedback("");
    }

    // Applique la modification dans l'état local et redessine la vue concernée.
    // Évite un rechargement réseau complet après un enregistrement dont on
    // connaît déjà toutes les valeurs enregistrées.
    function applyOfferUpdateLocally(offerId, payload) {
        const merged = { ...payload };
        if (Object.prototype.hasOwnProperty.call(payload, "available_kg")) merged.availableKg = payload.available_kg;
        if (Object.prototype.hasOwnProperty.call(payload, "price_per_kg")) merged.pricePerKg = payload.price_per_kg;
        if (Object.prototype.hasOwnProperty.call(payload, "departure_date")) merged.departureDate = payload.departure_date;
        if (Object.prototype.hasOwnProperty.call(payload, "base_currency")) merged.baseCurrency = payload.base_currency;
        if (Object.prototype.hasOwnProperty.call(payload, "origin_country_code")) merged.originCountryCode = payload.origin_country_code;
        if (Object.prototype.hasOwnProperty.call(payload, "destination_country_code")) merged.destCountryCode = payload.destination_country_code;

        const mergeOne = (item) => String(item.id) === String(offerId) ? { ...item, ...merged } : item;
        state.offers = (state.offers || []).map(mergeOne);
        state.cargoActiveOffers = (state.cargoActiveOffers || []).map(mergeOne);
        if (state.activeOffer && String(state.activeOffer.id) === String(offerId)) {
            state.activeOffer = { ...state.activeOffer, ...merged };
        }

        if (state.currentView === "traveler" && state.activeOffer) {
            const requests = getRequestsForOffer(state.activeOffer);
            renderActiveOffer(state.activeOffer, requests);
            renderStats(state.activeOffer, requests);
        } else if (state.currentView === "cargo") {
            renderCargoOffersTable(state.cargoActiveOffers || []);
        }
    }

    async function saveOfferEdits(event) {
        event.preventDefault();
        const offer = state.activeOffer;
        if (!offer) return;
        if (!window.ccSupabase) {
            setFeedback("Connexion Supabase indisponible.", true);
            return;
        }

        const cargo = state.offerIsCargo === true;
        const payload = {
            origin: String(els.offerOrigin?.value || "").trim(),
            destination: String(els.offerDestination?.value || "").trim(),
            city_origin: String(els.offerCityOrigin?.value || "").trim(),
            city_destination: String(els.offerCityDestination?.value || "").trim(),
            departure_date: String(els.offerDepartureDate?.value || "").trim(),
            price_per_kg: Number(els.offerPricePerKg?.value || 0),
            base_currency: String(els.offerBaseCurrency?.value || getUserCurrency()).trim().toUpperCase(),
            title: `Trajet ${String(els.offerOrigin?.value || "").trim()} -> ${String(els.offerDestination?.value || "").trim()}`
        };

        if (!cargo) payload.available_kg = Number(els.offerAvailableKg?.value || 0);

        if (!payload.origin || !payload.destination || !payload.departure_date) {
            setFeedback("Remplis le depart, l'arrivee et la date.", true);
            return;
        }

        // Valider que le pays est dans la liste officielle
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        const normalize = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const validCountries = countryOptions.map(c => normalize(c));
        if (!validCountries.includes(normalize(payload.origin))) {
            setFeedback("Choisissez un pays de depart valide dans la liste.", true);
            return;
        }
        if (!validCountries.includes(normalize(payload.destination))) {
            setFeedback("Choisissez un pays d'arrivee valide dans la liste.", true);
            return;
        }

        // Memes regles qu'a la publication : trajet entre deux pays differents et
        // date de depart non passee. Elles n'etaient controlees nulle part ici.
        if (countriesAreSame(payload.origin, payload.destination)) {
            document.getElementById("offer-same-country-hint")?.classList.remove("hidden");
            setFeedback("Le pays de depart et le pays d'arrivee doivent etre differents.", true);
            return;
        }
        if (payload.departure_date < todayISO()) {
            document.getElementById("offer-date-hint")?.classList.remove("hidden");
            setFeedback("La date du voyage doit etre aujourd'hui ou plus tard.", true);
            return;
        }

        // Dates supplémentaires (cargo) : toutes valides, puis une seule offre
        // avec la date la plus proche en departure_date et les autres en extra_dates.
        if (cargo) {
            payload.price_unit = offerPriceUnit;
            const extraDates = getOfferExtraDateValues();
            if (extraDates.some((date) => date < todayISO())) {
                document.getElementById("offer-date-hint")?.classList.remove("hidden");
                setFeedback("Les dates supplémentaires doivent être aujourd'hui ou plus tard.", true);
                return;
            }
            const allDates = Array.from(new Set([payload.departure_date, ...extraDates].filter(Boolean))).sort();
            payload.departure_date = allDates[0];
            payload.extra_dates = allDates.slice(1);
        }

        if (cargo) {
            if (!(payload.price_per_kg >= 1)) {
                setFeedback("Indique un prix d'au moins 1.", true);
                return;
            }
        } else if (payload.available_kg < 1 || payload.available_kg > 69 || payload.price_per_kg < 1) {
            // Memes regles qu'a la publication : avant, l'edition acceptait > 69 kg
            // et un prix a 0, creant une offre impossible a republier.
            setFeedback("Les kilos doivent etre entre 1 et 69, et le prix au kilo superieur a 0.", true);
            return;
        }

        // CODES PAYS (reseau) : resolus seulement quand le formulaire est deja
        // valide. Avant, chaque erreur locale attendait ces requetes avant de
        // s'afficher. Le drapeau des cartes depend de ces codes : le nom du pays
        // etait mis a jour mais pas son code, le drapeau restait celui d'avant.
        try {
            if (typeof window.CCCommon._getCountryCode === "function") {
                const [codeDepart, codeArrivee] = await Promise.all([
                    window.CCCommon._getCountryCode(payload.origin),
                    window.CCCommon._getCountryCode(payload.destination)
                ]);
                if (codeDepart) payload.origin_country_code = String(codeDepart).toUpperCase();
                if (codeArrivee) payload.destination_country_code = String(codeArrivee).toUpperCase();
            }
        } catch (e) {
            console.warn("Codes pays non resolus (le drapeau peut rester inchange):", e);
        }

        // Villes : verifiees en base (et reecrites a l'orthographe officielle).
        const [cityOriginCheck, cityDestinationCheck] = await Promise.all([
            validateCityField(payload.origin, payload.city_origin),
            validateCityField(payload.destination, payload.city_destination)
        ]);
        if (!cityOriginCheck.ok || !cityDestinationCheck.ok) {
            setFeedback((!cityOriginCheck.ok && cityOriginCheck.message) || cityDestinationCheck.message, true);
            return;
        }
        payload.city_origin = cityOriginCheck.ville;
        payload.city_destination = cityDestinationCheck.ville;
        if (els.offerCityOrigin) els.offerCityOrigin.value = payload.city_origin;
        if (els.offerCityDestination) els.offerCityDestination.value = payload.city_destination;

        if (els.saveOfferBtn) {
            els.saveOfferBtn.disabled = true;
            els.saveOfferBtn.textContent = "Enregistrement...";
        }

        try {
            // .select("id") : sans lui, une session expiree / RLS renvoie 0 ligne
            // SANS erreur et l'UI annoncait quand meme « Offre mise a jour ».
            const { data: updated, error } = await window.ccSupabase
                .from("offers")
                .update(payload)
                .eq("id", offer.id)
                .eq("user_id", window.CCCommon.state.user?.id)
                .select("id");
            if (error) throw error;
            if (!updated || !updated.length) {
                throw new Error("Modification non enregistree (session expiree ou offre introuvable). Reconnectez-vous.");
            }
            applyOfferUpdateLocally(offer.id, payload);
            closeOfferModal();
            ccNotify("Offre mise à jour.");
        } catch (err) {
            setFeedback(err.message || "Impossible de modifier l'offre.", true);
        } finally {
            if (els.saveOfferBtn) {
                els.saveOfferBtn.disabled = false;
                els.saveOfferBtn.textContent = "Enregistrer les modifications";
            }
        }
    }

    // Tableau des offres cargo : une seule offre visible par defaut,
    // « Voir tous » (en-tete « Mes offres ») deplie les autres.
    function renderCargoOffersTable(activeOffers) {
        state.cargoActiveOffers = Array.isArray(activeOffers) ? activeOffers : [];
        if (!els.cargoOpsTable) return;
        const list = state.cargoActiveOffers;
        if (!list.length) {
            els.cargoOpsTable.innerHTML = `<div class="cargo-ops-header"><div>LIGNE</div><div>MODE</div><div></div><div></div></div><div class="traveler-empty-requests cargo-ops-empty"><p>Aucune offre.</p></div>`;
            refreshCargoSeeAllLabel();
            return;
        }
        const expanded = state.cargoOffersExpanded === true;
        const visible = expanded ? list : list.slice(0, 1);
        const rows = visible.map((o) => {
            const mode = o.mode || "Avion";
            return `<div class="cargo-ops-row">
                <div class="col-ligne">${window.CCCommon.escapeHtml(o.origin || "")} &rarr; ${window.CCCommon.escapeHtml(o.destination || "")}</div>
                <div class="col-mode">${window.CCCommon.escapeHtml(mode)}</div>
                <div class="col-statut"></div>
                <div class="col-actions">
                    <button class="cargo-ops-btn" data-offer-id="${window.CCCommon.escapeHtml(o.id)}" data-edit-offer="${window.CCCommon.escapeHtml(o.id)}">Modifier</button>
                    <button class="cargo-ops-btn cargo-ops-btn-danger" data-offer-id="${window.CCCommon.escapeHtml(o.id)}" data-action="delete">Supprimer</button>
                </div>
            </div>`;
        }).join("");
        els.cargoOpsTable.innerHTML = `<div class="cargo-ops-header"><div>LIGNE</div><div>MODE</div><div></div><div></div></div>${rows}`;
        refreshCargoSeeAllLabel();
    }

    // Libelle du bouton « Voir tous / Voir moins » de l'en-tete « Mes offres »
    function refreshCargoSeeAllLabel() {
        const btn = document.getElementById("cargo-voir-tous-trajets");
        if (!btn) return;
        const total = (state.cargoActiveOffers || []).length;
        const expanded = state.cargoOffersExpanded === true;
        const texte = expanded ? "Voir moins" : "Voir tous";
        const label = document.getElementById("cargo-voir-tous-label");
        if (label) label.textContent = texte;
        else btn.textContent = texte;
        btn.setAttribute("aria-expanded", expanded ? "true" : "false");
        btn.classList.toggle("is-expanded", expanded);
        btn.hidden = total <= 1;
    }

    async function loadCargoDashboard() {
        const user = window.CCCommon.state.user;
        if (!user) return;

        // Les deux requetes sont INDEPENDANTES : la lenteur (8 s en production) ou
        // l'echec des conversations ne doit plus laisser le tableau des offres sur
        // « Chargement... » ni vider les panneaux deja remplis.
        // Chaque tache rend SON panneau des que SA requete repond.
        const offersTask = (async () => {
            try {
                const offersResp = await withTimeout(window.CCCommon.api("/api/offers?scope=mine&pageSize=20"));
                const myOffers = Array.isArray(offersResp?.items) ? offersResp.items : [];
                state.offers = myOffers;
                // Cargo dashboard : classification unique (isCargoOffer), pas "mode non vide"
                // qui comptait a tort les anciennes offres mode="traveler" comme cargo.
                const cargoOffers = myOffers.filter(isCargoOffer);
                const activeOffers = cargoOffers.filter(o => String(o.status || "").toLowerCase() === "active");
                // Les offres en pause / non actives restent accessibles (modif/suppression).
                // On ne garde QUE les offres cargo : avant, une offre voyageur du meme
                // compte apparaissait aussi dans « Mes offres » cargo.
                const visibleOffers = cargoOffers.filter(o => String(o.status || "").toLowerCase() !== "archived");
                const activeCount = activeOffers.length;

                if (els.cargoStatOffers) els.cargoStatOffers.textContent = `${activeCount} / 5`;
                renderCargoOffersTable(visibleOffers);

                // Jauge de limite (C-33) : decorative, la note n'apparait qu'a 5/5.
                const pct = Math.min(100, (activeCount / 5) * 100);
                if (els.cargoLimitBadge) els.cargoLimitBadge.textContent = `${activeCount}/5`;
                if (els.cargoProgressFill) {
                    els.cargoProgressFill.style.width = `${pct}%`;
                    els.cargoProgressFill.closest(".cargo-limit")?.classList.toggle("is-full", activeCount >= 5);
                }
                if (els.cargoLimitNote) {
                    const limiteAtteinte = activeCount >= 5;
                    els.cargoLimitNote.textContent = limiteAtteinte
                        ? "Limite atteinte. Supprimez une offre pour en créer une nouvelle."
                        : "";
                    els.cargoLimitNote.classList.toggle("hidden", !limiteAtteinte);
                }
                // À 5/5, le bouton « Nouvelle offre » est désactivé (grisé) :
                // la publication serait de toute façon refusée par la limite.
                const newOfferBtn = document.getElementById("cargo-new-offer-btn");
                if (newOfferBtn) {
                    const limiteAtteinte = activeCount >= 5;
                    newOfferBtn.disabled = limiteAtteinte;
                    newOfferBtn.title = limiteAtteinte
                        ? "Limite de 5 offres actives atteinte"
                        : "Nouvelle offre cargo";
                }
                // Memes offres que le tableau : une conversation rattachee a une
                // offre archivee ne doit pas apparaitre dans « Personnes interessees ».
                return new Set(visibleOffers.map(o => String(o.id)));
            } catch (error) {
                if (els.cargoStatOffers) els.cargoStatOffers.textContent = "— / 5";
                if (els.cargoProgressFill) els.cargoProgressFill.style.width = "0%";
                const newOfferBtn = document.getElementById("cargo-new-offer-btn");
                if (newOfferBtn) {
                    newOfferBtn.disabled = false;
                    newOfferBtn.title = "Nouvelle offre cargo";
                }
                renderPanelError(els.cargoOpsTable, error, loadDashboard);
                return null;
            }
        })();

        const convTask = (async () => {
            try {
                const convResp = await withTimeout(window.CCCommon.api("/api/conversations"));
                const cargoOfferIds = await offersTask;
                // « Personnes interessees » = fils dont JE suis le proprietaire de l'offre.
                // Le filtre inverse (!isOfferOwner) laissait ce panneau vide a vie.
                const incoming = Array.isArray(convResp) ? convResp.filter(c => {
                    if (!c.isOfferOwner) return false;
                    if (cargoOfferIds) {
                        return cargoOfferIds.has(String(c.offer_id || c.offerId || ""));
                    }
                    return true; // offres indisponibles : on montre au moins mes fils entrants
                }) : [];
                state.incomingRequests = incoming;

                if (els.cargoStatRequests) els.cargoStatRequests.textContent = `${incoming.length}`;
                const cargoInterestedCount = document.getElementById("cargo-interested-count");
                if (cargoInterestedCount) cargoInterestedCount.textContent = `${incoming.length}`;

                if (els.cargoFileList) {
                    if (!incoming.length) {
                        els.cargoFileList.innerHTML = `<div class="traveler-empty-requests"><p>Aucune demande.</p></div>`;
                    } else {
                        els.cargoFileList.innerHTML = incoming.map((item, i) => {
                            const userName = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                            // L'itineraire vit dans `item.offer` (le fil ne porte pas origin/destination
                            // a la racine) : avant, on repetait l'apercu du message dans le titre.
                            const offer = item.offer || {};
                            const route = offer.origin && offer.destination ? `${offer.origin} -> ${offer.destination}` : "";
                            const preview = item.preview ? window.CCCommon.escapeHtml(item.preview) : "";
                            return `<div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                                <div class="cargo-file-index">${i + 1}</div>
                                <div class="file-content">
                                    <div class="file-title">${userName}${route ? " | " + window.CCCommon.escapeHtml(route) : ""}</div>
                                    <div class="file-desc">${preview || "Aucun message"}</div>
                                </div>
                                <button class="cargo-file-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                            </div>`;
                        }).join("");
                    }
                }
            } catch (error) {
                if (els.cargoStatRequests) els.cargoStatRequests.textContent = "—";
                const cargoInterestedCount = document.getElementById("cargo-interested-count");
                if (cargoInterestedCount) cargoInterestedCount.textContent = "—";
                renderPanelError(els.cargoFileList, error, loadDashboard);
            }
        })();

        await Promise.all([offersTask, convTask]);
    }

    // Un panneau ne doit JAMAIS rester sur « Chargement... » : on borne l'attente.
    // (La requete des conversations peut depasser 8 s en production ; sans borne,
    // un serveur muet laissait le panneau fige indefiniment.)
    function withTimeout(promise, ms = 20000) {
        let timer = null;
        return Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("Le serveur met trop de temps a repondre.")), ms);
            })
        ]).finally(() => { if (timer) clearTimeout(timer); });
    }

    // Erreur limitee a UN panneau : les autres panneaux gardent leurs donnees.
    // (Avant, l'echec d'une requete optionnelle vidait tout l'ecran.)
    function renderPanelError(target, error, onRetry) {
        if (!target) return;
        const message = window.CCCommon.escapeHtml(error?.message || "Erreur reseau");
        target.innerHTML = `<div class="traveler-empty-requests" role="alert">
            <p>Impossible de charger ces donnees.</p>
            <span style="opacity:.7;font-size:.85rem;">${message}</span>
            <button type="button" class="btn secondary btn-sm dashboard-panel-retry" style="margin-top:10px;">Reessayer</button>
        </div>`;
        target.querySelector(".dashboard-panel-retry")?.addEventListener("click", () => {
            (onRetry || loadDashboard)().catch((err) => renderPanelError(target, err, onRetry));
        });
    }

    // Etat d'erreur explicite : avant, une requete en echec laissait les panneaux
    // sur « Chargement... » ou sur des donnees perimees, sans aucun message.
    function renderDashboardError(error) {
        const message = window.CCCommon.escapeHtml(error?.message || "Erreur reseau");
        const html = `<div class="traveler-empty-requests" role="alert">
            <p>Impossible de charger les donnees.</p>
            <span style="opacity:.7;font-size:.85rem;">${message}</span>
            <button type="button" class="btn secondary btn-sm" id="dashboard-retry-btn" style="margin-top:10px;">Reessayer</button>
        </div>`;
        [els.requestsList, els.clientRequestsList, els.clientDiscussionsList, els.cargoFileList, els.cargoOpsTable]
            .forEach((target) => { if (target) target.innerHTML = html; });
        document.getElementById("dashboard-retry-btn")?.addEventListener("click", () => {
            loadDashboard().catch(renderDashboardError);
        });
    }

    async function loadDashboard() {
        if (!window.CCCommon.state.user) return;
        const user = window.CCCommon.state.user;
        const viewType = state.currentView || String(user?.profile_type || "").toLowerCase();

        try {
        if (viewType === "traveler") {
            // Offres et conversations chargees separement : la carte d'offre doit
            // s'afficher des que les offres repondent, sans attendre les messages.
            const offersTask = (async () => {
                try {
                    const offersResp = await withTimeout(window.CCCommon.api("/api/offers?scope=mine&pageSize=100"));
                    state.offers = (Array.isArray(offersResp?.items) ? offersResp.items : [])
                        .filter(o => !isCargoOffer(o)); // meme classification que le bridge
                    state.activeOffer = getActiveOffer();
                    renderActiveOffer(state.activeOffer, []);
                    renderStats(state.activeOffer, []);
                    if (els.manageOfferBtn) {
                        els.manageOfferBtn.textContent = state.activeOffer ? "Modifier mon offre" : "Publier mon trajet";
                    }
                    if (els.editOfferBtn) els.editOfferBtn.disabled = !state.activeOffer;
                    if (els.openMessagesBtn) {
                        els.openMessagesBtn.href = state.activeOffer ? `chat.html?offerId=${encodeURIComponent(String(state.activeOffer.id))}` : "chat.html";
                    }
                    if (els.quickSummaryText) {
                        els.quickSummaryText.textContent = state.activeOffer
                            ? `${getRouteLabel(state.activeOffer)} | ${formatAmount(Number(state.activeOffer.pricePerKg || state.activeOffer.price_per_kg || 0), state.activeOffer.baseCurrency || state.activeOffer.base_currency || getCurrencyCode(user, state.activeOffer))}/kg`
                            : "Aucune offre.";
                    }
                } catch (error) {
                    renderPanelError(els.activeOfferCard, error, loadDashboard);
                }
            })();

            const convTask = (async () => {
                try {
                    const convResp = await withTimeout(window.CCCommon.api("/api/conversations"));
                    state.requests = (Array.isArray(convResp) ? convResp : []).filter((item) => item.isOfferOwner);
                    await offersTask; // l'offre active doit etre connue pour filtrer
                    const requests = getRequestsForOffer(state.activeOffer);
                    renderRequests(requests, state.activeOffer);
                    renderStats(state.activeOffer, requests);
                } catch (error) {
                    state.requests = [];
                    if (els.requestsCount) els.requestsCount.textContent = "-";
                    renderPanelError(els.requestsList, error, loadDashboard);
                }
            })();

            if (els.dashboardUser) {
                els.dashboardUser.textContent = user?.fullName || "Voyageur";
            }
            if (els.userChip) {
                els.userChip.textContent = `${getProfileTypeLabel(user)}${user?.is_verified ? " verifie" : ""}`;
            }
            renderProfileChip(user);

            await Promise.all([offersTask, convTask]);
        } else if (viewType === "cargo") {
            await loadCargoDashboard();
        } else {
            await loadClientDashboard();
        }
        } catch (error) {
            console.error("Chargement dashboard impossible:", error);
            renderDashboardError(error);
        }
    }

    function bindEvents() {
        // Devises de la modale d'offre : recalcul a chaque changement de pays.
        if (els.offerOrigin && !els.offerOrigin.dataset.ccCurrencyBound) {
            els.offerOrigin.dataset.ccCurrencyBound = "true";
            els.offerOrigin.addEventListener("change", refreshOfferCurrencyOptions);
            els.offerOrigin.addEventListener("input", refreshOfferCurrencyOptions);
        }
        if (els.offerDestination && !els.offerDestination.dataset.ccCurrencyBound) {
            els.offerDestination.dataset.ccCurrencyBound = "true";
            els.offerDestination.addEventListener("change", refreshOfferCurrencyOptions);
            els.offerDestination.addEventListener("input", refreshOfferCurrencyOptions);
        }

        // Alerte immediate « depart = arrivee » sur les trois formulaires.
        [
            ["offer-origin", "offer-destination", "offer-same-country-hint"],
            ["dash-demande-origin", "dash-demande-destination", "dash-demande-same-country-hint"],
            ["edit-parcel-origin", "edit-parcel-destination", "edit-parcel-same-country-hint"]
        ].forEach(([originId, destinationId, hintId]) => {
            [originId, destinationId].forEach((id) => {
                const input = document.getElementById(id);
                if (!input || input.dataset.sameCountryBound === "true") return;
                input.dataset.sameCountryBound = "true";
                const refresh = () => updateSameCountryHint(originId, destinationId, hintId);
                input.addEventListener("input", refresh);
                input.addEventListener("change", refresh);
            });
        });

        // Alerte immediate « date passee » sur les trois formulaires.
        // Les deux demandes ont aussi un bouton « Pas de date limite » dont
        // l'état lumineux suit la présence ou l'absence de date.
        [
            ["offer-departure-date", "offer-date-hint", ""],
            ["dash-demande-date", "dash-demande-date-hint", "dash-demande-no-date-btn"],
            ["edit-parcel-date", "edit-parcel-date-hint", "edit-parcel-no-date-btn"]
        ].forEach(([inputId, hintId, buttonId]) => {
            const input = document.getElementById(inputId);
            if (!input || input.dataset.dateHintBound === "true") return;
            input.dataset.dateHintBound = "true";
            const refresh = () => {
                updateDateHint(inputId, hintId);
                if (buttonId) setNoDateActive(inputId, buttonId);
            };
            input.addEventListener("input", refresh);
            input.addEventListener("change", refresh);
        });

        // Devise des demandes : recalcul quand le pays de départ ou d'arrivée change.
        [
            ["dash-demande-origin", "dash-demande-destination", "dash"],
            ["edit-parcel-origin", "edit-parcel-destination", "edit"]
        ].forEach(([originId, destinationId, kind]) => {
            [originId, destinationId].forEach((id) => {
                const input = document.getElementById(id);
                if (!input || input.dataset.ccRequestCurrencyBound === "true") return;
                input.dataset.ccRequestCurrencyBound = "true";
                const refresh = () => refreshRequestCurrencyOptions(kind);
                input.addEventListener("input", refresh);
                input.addEventListener("change", refresh);
            });
        });

        // Dashboard toggles (Voyageur/Cargo)
        document.querySelectorAll(".dash-toggle").forEach(btn => {
            btn.addEventListener("click", async () => {
                const target = btn.getAttribute("data-switch");
                if (target) switchDashboardView(target);
                // Recharger le contenu du dashboard (erreur affichee, pas de rejet muet)
                await loadDashboard();
            });
        });

        // Bouton « Actualiser » (C-03) : un par vue, meme action.
        els.refreshBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                btn.setAttribute("aria-busy", "true");
                loadDashboard()
                    .catch(() => ccNotify("Le rafraîchissement a échoué. Réessaie.", true))
                    .finally(() => btn.removeAttribute("aria-busy"));
            });
        });

        els.manageOfferBtn?.addEventListener("click", () => {
            if (!state.activeOffer) {
                window.location.href = "post_trip.html";
                return;
            }
            openOfferModal();
        });

        els.editOfferBtn?.addEventListener("click", () => {
            if (!state.activeOffer) {
                window.location.href = "post_trip.html";
                return;
            }
            openOfferModal();
        });

        els.openMessagesBtn?.addEventListener("click", (event) => {
            if (!state.activeOffer) return;
            event.preventDefault();
            openChatPage("", state.activeOffer.id);
        });

        // Switch kilo / CBM (cargo) et dates supplémentaires.
        document.querySelectorAll("#offer-price-unit-switch .dash-unit-btn").forEach((btn) => {
            if (btn.dataset.ccUnitBound === "true") return;
            btn.dataset.ccUnitBound = "true";
            btn.addEventListener("click", () => setOfferPriceUnit(btn.getAttribute("data-unit")));
        });
        document.getElementById("offer-add-date-btn")?.addEventListener("click", () => {
            addOfferExtraDateRow();
            getOfferExtraDateInputs().slice(-1)[0]?.focus();
        });
        document.getElementById("offer-extra-dates")?.addEventListener("click", (event) => {
            const remove = event.target.closest(".dash-extra-date-del");
            if (!remove) return;
            remove.closest(".dash-extra-date-row")?.remove();
            updateOfferExtraDatesAddBtn();
        });

        els.closeOfferModalBtn?.addEventListener("click", closeOfferModal);
        els.offerModal?.addEventListener("click", (event) => {
            if (event.target === els.offerModal) closeOfferModal();
        });

        els.offerEditForm?.addEventListener("submit", saveOfferEdits);
        // Des que l'utilisateur corrige, l'ancien message d'erreur ne doit plus
        // rester affiche (il decrivait un probleme deja resolu).
        els.offerEditForm?.addEventListener("input", () => setFeedback(""));
        els.offerEditForm?.addEventListener("change", () => setFeedback(""));

        // Supprimer / Modifier l'offre active (voyageur)
        els.activeOfferCard?.addEventListener("click", async (event) => {
            const editBtn = event.target.closest("[data-edit-offer]");
            if (editBtn) {
                const offerId = editBtn.getAttribute("data-edit-offer");
                const offer = state.offers?.find(o => String(o.id) === offerId);
                if (offer) {
                    state.activeOffer = offer;
                    openOfferModal();
                }
                return;
            }
            const deleteBtn = event.target.closest("[data-delete-offer]");
            if (deleteBtn) {
                const offerId = deleteBtn.getAttribute("data-delete-offer");
                if (offerId) await deleteOffer(offerId);
                return;
            }
        });

        els.logoutBtn?.addEventListener("click", () => {
            window.CCCommon.logout();
        });

        els.requestsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            const item = event.target.closest("[data-thread-id]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) {
                    openChatPage(threadId);
                }
                return;
            }
            if (item) {
                const threadId = item.getAttribute("data-thread-id");
                if (threadId) openChatPage(threadId);
            }
        });

        // Client dashboard click delegation
        els.clientDiscussionsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            const item = event.target.closest("[data-thread-id]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
                return;
            }
            if (item) {
                const threadId = item.getAttribute("data-thread-id");
                if (threadId) openChatPage(threadId);
            }
        });

        els.clientRequestsList?.addEventListener("click", async (event) => {
            const openDemandBtn = event.target.closest("[data-open-demand-modal]");
            if (openDemandBtn) {
                state.clientRequestsFilter = "active";
                updateClientRequestFilter(state.parcelRequests || []);
                window.CCDemandModal?.openCreate({
                    onSaved: loadClientDashboard,
                    trigger: openDemandBtn
                });
                return;
            }
            const editBtn = event.target.closest("[data-edit-parcel]");
            if (editBtn) {
                const parcelId = editBtn.getAttribute("data-edit-parcel");
                if (!parcelId) return;
                const parcel = state.parcelRequests?.find(p => String(p.id) === parcelId);
                if (parcel) {
                    window.CCDemandModal?.openEdit(parcel, {
                        onSaved: loadClientDashboard,
                        trigger: editBtn
                    });
                }
                return;
            }
            const republishBtn = event.target.closest("[data-republish-parcel]");
            if (republishBtn) {
                const parcelId = republishBtn.getAttribute("data-republish-parcel");
                const parcel = state.parcelRequests?.find(p => String(p.id) === parcelId);
                if (parcel) {
                    // La nouvelle demande sera active : on revient sur cet onglet.
                    state.clientRequestsFilter = "active";
                    updateClientRequestFilter(state.parcelRequests || []);
                    window.CCDemandModal?.openCreate({
                        prefill: parcel,
                        onSaved: loadClientDashboard,
                        trigger: republishBtn
                    });
                }
                return;
            }
            const deleteBtn = event.target.closest("[data-delete-parcel]");
            if (deleteBtn) {
                const parcelId = deleteBtn.getAttribute("data-delete-parcel");
                if (parcelId) await deleteParcelRequest(parcelId);
                return;
            }
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
            }
        });

        async function deleteParcelRequest(parcelId) {
            if (!window.ccSupabase) { ccNotify("Connexion indisponible.", true); return; }
            if (!(await ccConfirm(
                "Supprimer cette demande ?",
                "Cette action est définitive : les réservations et discussions liées seront supprimées lorsqu'elles existent.",
                "Supprimer"
            ))) return;
            try {
                const supabase = window.ccSupabase;
                const uid = window.CCCommon.state?.user?.id;
                // 1. Trouver les réservations liées à cette demande
                const { data: reservations } = await supabase.from("reservations").select("id").eq("parcel_request_id", parcelId);
                if (reservations && reservations.length > 0) {
                    const resIds = reservations.map(r => r.id);
                    // 2. Trouver les threads de discussion liés à ces réservations
                    const { data: threads } = await supabase.from("chat_threads").select("id").in("reservation_id", resIds);
                    if (threads && threads.length > 0) {
                        const threadIds = threads.map(t => t.id);
                        // 3. Supprimer les messages
                        await supabase.from("chat_messages").delete().in("thread_id", threadIds);
                        // 4. Supprimer les threads
                        await supabase.from("chat_threads").delete().in("id", threadIds);
                    }
                    // 5. Supprimer les réservations
                    await supabase.from("reservations").delete().in("id", resIds);
                }
                // 6. Supprimer la demande — on verifie reellement la ligne supprimee.
                // PostgREST renvoie 0 ligne SANS erreur si la session/RLS refuse.
                const { data: deleted, error: delErr } = await supabase.from("parcel_requests")
                    .delete().eq("id", parcelId).eq("user_id", uid).select("id");
                if (delErr) throw delErr;
                if (!deleted || !deleted.length) {
                    throw new Error("Suppression non effectuee (session expiree ou demande introuvable).");
                }
                // 7. Recharger le dashboard
                const viewType = state.currentView || "";
                if (viewType === "client") await loadClientDashboard();
                else await loadDashboard();
            } catch (e) {
                console.error("Suppression de la demande impossible:", e);
                ccNotify("La suppression a échoué. Réessaie.", true);
            }
        }

        async function deleteOffer(offerId) {
            if (!window.ccSupabase) { ccNotify("Connexion indisponible.", true); return; }
            if (!(await ccConfirm(
                "Supprimer cette offre ?",
                "Cette action est définitive : les réservations et discussions liées seront supprimées lorsqu'elles existent.",
                "Supprimer"
            ))) return;
            const supabase = window.ccSupabase;
            const uid = window.CCCommon.state?.user?.id;
            try {
                // FILET DE SECURITE : si la session n'est plus valide, la base refusera
                // toute ecriture. On previent clairement l'utilisateur au lieu d'afficher
                // une erreur incomprehensible ("annonce introuvable").
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    ccNotify("Ta session a expiré. Reconnecte-toi pour continuer.", true);
                    window.location.href = "auth.html";
                    return;
                }
                // Suppression via une fonction de la base. Elle est SECURISEE : elle
                // n'accepte aucun identifiant d'utilisateur du client, elle utilise
                // l'identite reelle de la session (auth.uid()) et n'agit que sur ses
                // propres annonces. Repli en archivage si la ligne n'existe plus.
                const { data: nDel, error: e1 } = await supabase.rpc("cc_delete_own_offer", { p_offer_id: Number(offerId) });
                if (e1) throw e1;
                let fait = nDel || 0;
                if (!fait) {
                    const { data: nArch, error: e2 } = await supabase.rpc("cc_archive_own_offer", { p_offer_id: Number(offerId) });
                    if (e2) throw e2;
                    fait = nArch || 0;
                }
                if (!fait) { ccNotify("Retrait impossible : cette annonce n'a pas été trouvée (ou ne t'appartient pas).", true); return; }

                // Nettoyage des donnees liees (au mieux, ne bloque jamais la suppression)
                try {
                    const { data: reservations } = await supabase.from("reservations").select("id").eq("offer_id", offerId);
                    if (reservations && reservations.length) {
                        const resIds = reservations.map(r => r.id);
                        const { data: threads } = await supabase.from("chat_threads").select("id").in("reservation_id", resIds);
                        const tIds = (threads || []).map(t => t.id);
                        if (tIds.length) {
                            await supabase.from("chat_messages").delete().in("thread_id", tIds);
                            await supabase.from("chat_threads").delete().in("id", tIds);
                        }
                        await supabase.from("reservations").delete().in("id", resIds);
                    }
                    const { data: directThreads } = await supabase.from("chat_threads").select("id").eq("offer_id", offerId);
                    if (directThreads && directThreads.length) {
                        const tIds = directThreads.map(t => t.id);
                        await supabase.from("chat_messages").delete().in("thread_id", tIds);
                        await supabase.from("chat_threads").delete().in("id", tIds);
                    }
                } catch (e) { console.warn("Nettoyage annexe partiel:", e); }

                // Recharger la vue courante
                const viewType = state.currentView || "";
                if (viewType === "traveler") await loadDashboard();
                else if (viewType === "cargo") await loadCargoDashboard();
                else if (viewType === "client") await loadClientDashboard();
            } catch (e) {
                console.error("Suppression de l'offre impossible:", e);
                ccNotify("La suppression a échoué. Réessaie.", true);
            }
        }




        // Client cercle + nouvelle proposition
        // (cible explicite : un second .client-plus-btn existe dans la vue cargo,
        //  il ne doit pas dependre de l'ordre du document)
        // Onglets Actives / Archives du panneau des demandes client.
        document.querySelectorAll("[data-client-requests-filter]").forEach((button) => {
            if (button.dataset.clientFilterBound === "true") return;
            button.dataset.clientFilterBound = "true";
            button.addEventListener("click", () => {
                state.clientRequestsFilter = button.dataset.clientRequestsFilter === "archived" ? "archived" : "active";
                renderClientRequests(state.parcelRequests || []);
                // On ouvre le panneau pour montrer le résultat du filtre.
                const toggle = document.querySelector('.client-requests-panel [data-accordion-toggle]');
                const body = document.getElementById("client-requests-body");
                if (toggle && body && toggle.getAttribute("aria-expanded") !== "true") {
                    toggle.setAttribute("aria-expanded", "true");
                    body.hidden = false;
                    toggle.closest(".dashboard-panel")?.classList.add("is-open");
                }
            });
        });

        document.querySelector(".client-requests-panel .client-plus-btn")?.addEventListener("click", (event) => {
            state.clientRequestsFilter = "active";
            updateClientRequestFilter(state.parcelRequests || []);
            window.CCDemandModal?.openCreate({
                onSaved: loadClientDashboard,
                trigger: event.currentTarget
            });
        });

        // S-04 : la modale #cargo-requests-modal (inatteignable) a ete supprimee.

        // Cargo file list click delegation
        els.cargoFileList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
            }
        });

        // Boutons Modifier / Supprimer dans le tableau Operations cargo
        els.cargoOpsTable?.addEventListener("click", async (event) => {
            const button = event.target.closest(".cargo-ops-btn");
            if (!button) return;
            const offerId = button.getAttribute("data-offer-id");
            if (!offerId) return;
            const action = button.getAttribute("data-action");

            if (action === "delete") {
                // Une seule implementation de suppression (deleteOffer) : elle verifie
                // la session et nettoie reservations/messages/fils. La copie locale du
                // tableau cargo, elle, laissait des donnees liees orphelines.
                await deleteOffer(offerId);
                return;
            }

            // Sinon : Modifier
            const offer = state.offers.find(o => String(o.id) === offerId);
            if (offer) {
                state.activeOffer = offer;
                openOfferModal();
            }
        });

        // Upload photo de profil -> Sauvegarde dans Supabase.
        // L'aperçu n'est appliqué QU'APRÈS la réussite de l'enregistrement :
        // avant, une sauvegarde en échec laissait quand même la nouvelle photo
        // affichée, comme si elle avait été enregistrée.
        document.querySelectorAll(".avatar-file-input").forEach(input => {
            const inputEl = input;
            input.addEventListener("change", async function() {
                const file = inputEl.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async function(e) {
                    const dataUrl = e.target?.result;
                    const userId = window.CCCommon.state?.user?.id;
                    if (!dataUrl) { inputEl.value = ""; return; }
                    if (!userId || !window.ccSupabase) {
                        ccNotify("Impossible d'enregistrer la photo de profil.", true);
                        inputEl.value = "";
                        return;
                    }
                    try {
                        // [FIX] L'ancien code TRONQUAIT la data URL a 500 Ko :
                        // l'image etait corrompue apres rechargement. On redimensionne
                        // et compresse, et on refuse proprement si c'est impossible.
                        const stored = await compressImageDataUrl(dataUrl, 500 * 1024);
                        const { data: updated, error } = await window.ccSupabase.from("profiles").update({
                            profile_photo: stored,
                            updated_at: new Date().toISOString()
                        }).eq("id", userId).select("id");
                        if (error) throw error;
                        if (!updated || !updated.length) {
                            throw new Error("Session expiree : la photo n'a pas ete enregistree.");
                        }
                        // Enregistrement réussi : on peut maintenant montrer l'aperçu.
                        document.querySelectorAll(".avatar-circle").forEach(el => {
                            el.style.backgroundImage = `url(${stored})`;
                            el.classList.add("has-image");
                        });
                        if (window.CCCommon.state.user) {
                            window.CCCommon.state.user.profilePhoto = stored;
                            window.CCCommon.state.user.profile_photo = stored;
                        }
                        ccNotify("Photo de profil mise à jour.");
                    } catch (err) {
                        console.warn("Impossible de sauvegarder la photo:", err);
                        ccNotify("Impossible d'enregistrer la photo de profil.", true);
                    } finally {
                        inputEl.value = "";
                    }
                };
                reader.readAsDataURL(file);
            });
        });

        // --- Photo de profil : au clic, si une photo est deja installee -> mini-fenetre
        //     « Voir la photo » (agrandissement) / « Changer la photo de profil ».
        //     S'il n'y a pas encore de photo, le clic ouvre directement le selecteur.
        const avatarMenu = document.getElementById("avatar-menu-modal");
        const avatarThumb = document.getElementById("avatar-menu-thumb");
        const avatarLightbox = document.getElementById("avatar-lightbox");
        const avatarLightboxImg = document.getElementById("avatar-lightbox-img");
        let avatarPendingInput = null;

        const readAvatarUrl = (circle) => {
            if (!circle) return "";
            // 1. photo posee dans une balise <img> a l'interieur du cercle
            const image = circle.querySelector("img[src]");
            if (image && image.getAttribute("src")) return image.getAttribute("src");
            // 2. photo posee en style direct, sinon style calcule (couvre les autres facons de poser la photo)
            const direct = circle.style.backgroundImage || "";
            const calcule = (direct && direct !== "none") ? direct : (window.getComputedStyle(circle).backgroundImage || "");
            const m = String(calcule).match(/url\(["']?(.*?)["']?\)/);
            return m ? m[1] : "";
        };
        const closeAvatarMenu = () => avatarMenu?.classList.add("hidden");
        const closeAvatarLightbox = () => avatarLightbox?.classList.add("hidden");

        const openAvatarMenu = (photo, input) => {
            if (!avatarMenu) return;
            avatarPendingInput = input || null;
            if (avatarThumb) avatarThumb.style.backgroundImage = `url(${photo})`;
            avatarMenu.classList.remove("hidden");
            document.getElementById("avatar-action-view")?.focus();
        };

        document.querySelectorAll(".avatar-upload-label").forEach((label) => {
            const input = label.querySelector(".avatar-file-input");
            const circle = label.querySelector(".avatar-circle");
            const handler = (ev) => {
                // un clic venant du champ fichier lui-meme ou de la fenetre ne doit pas rouvrir le menu
                if (ev.target && ev.target.closest && ev.target.closest(".modal")) return;
                if (ev.target && ev.target.classList && ev.target.classList.contains("avatar-file-input")) return;
                const photo = readAvatarUrl(circle);
                if (!photo) return; // pas de photo : on laisse le selecteur s'ouvrir normalement
                ev.preventDefault();
                openAvatarMenu(photo, input);
            };
            label.addEventListener("click", handler);
            label.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    const photo = readAvatarUrl(circle);
                    ev.preventDefault();
                    if (photo) openAvatarMenu(photo, input);
                    else input?.click();
                }
            });
            if (!label.hasAttribute("tabindex")) label.setAttribute("tabindex", "0");
            if (!label.hasAttribute("role")) label.setAttribute("role", "button");
        });

        document.getElementById("avatar-action-view")?.addEventListener("click", () => {
            const photo = readAvatarUrl(avatarThumb) || "";
            if (photo && avatarLightboxImg) avatarLightboxImg.src = photo;
            closeAvatarMenu();
            avatarLightbox?.classList.remove("hidden");
        });

        document.getElementById("avatar-action-change")?.addEventListener("click", () => {
            closeAvatarMenu();
            avatarPendingInput?.click();
        });

        document.getElementById("close-avatar-menu")?.addEventListener("click", closeAvatarMenu);
        document.getElementById("close-avatar-lightbox")?.addEventListener("click", closeAvatarLightbox);
        // Un clic sur le fond ferme aussi le menu (comme les autres modales).
        avatarMenu?.addEventListener("click", (ev) => {
            if (ev.target === avatarMenu) closeAvatarMenu();
        });
        avatarLightbox?.addEventListener("click", (ev) => {
            if (ev.target === avatarLightbox) closeAvatarLightbox();
        });
        document.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") { closeAvatarMenu(); closeAvatarLightbox(); }
        });

        // Echap ferme aussi les modales du dashboard. Avant, seule la fenetre de
        // photo reagissait : une modale d'offre ouverte restait au-dessus de la
        // page et interceptait tous les clics (on ne pouvait plus rien faire).
        const DASHBOARD_MODAL_IDS = [
            "offer-details-modal",
            "dashboard-demande-modal",
            "edit-parcel-modal"
        ];
        document.addEventListener("keydown", (ev) => {
            if (ev.key !== "Escape") return;
            let closed = false;
            DASHBOARD_MODAL_IDS.forEach((id) => {
                const modal = document.getElementById(id);
                if (modal && !modal.classList.contains("hidden")) {
                    modal.classList.add("hidden");
                    closed = true;
                }
            });
            if (closed) setFeedback("");
        });
    }

    // ── Édition directe depuis l'URL ────────────────────────────────────────────
    // results.html redirige ici au clic sur « Modifier mon trajet / ma demande » :
    //   dashboard.html?editOffer=<id>     (offre voyageur ou cargo)
    //   dashboard.html?editDemande=<id>   (demande de transport)
    // On réutilise le flux existant en déclenchant le bouton « Modifier » de la carte
    // correspondante (les listes se rendent en asynchrone → quelques tentatives).
    async function openEditFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const offerId = params.get("editOffer");
        const demandeId = params.get("editDemande");
        if (!offerId && !demandeId) return;
        const escapeSel = (value) => (window.CSS && CSS.escape)
            ? CSS.escape(String(value))
            : String(value).replace(/["\\]/g, "\\$&");
        // Une demande livrée n'a plus « Modifier » mais « Republier ».
        const selector = offerId
            ? `[data-edit-offer="${escapeSel(offerId)}"]`
            : `[data-edit-parcel="${escapeSel(demandeId)}"], [data-republish-parcel="${escapeSel(demandeId)}"]`;

        // Le bouton « Modifier » est rendu dans la vue correspondant au type de
        // publication (voyageur / cargo / client) : on cherche, puis on bascule de
        // vue via les toggles visibles si la publication n'est pas dans la vue active.
        // Tableau cargo replie : seule la premiere offre est rendue. Sans depliage,
        // le bouton « Modifier » des autres lignes n'existe pas dans la page et
        // l'edition demandee depuis results.html echouait silencieusement.
        const expandCargoIfNeeded = () => {
            const cargoView = document.getElementById("cargo-dashboard-view");
            const seeAll = document.getElementById("cargo-voir-tous-trajets");
            if (!cargoView || cargoView.classList.contains("hidden")) return;
            if (!seeAll || seeAll.hidden || state.cargoOffersExpanded === true) return;
            state.cargoOffersExpanded = true;
            renderCargoOffersTable(state.cargoActiveOffers || []);
        };

        const findEditBtn = () => document.querySelector(selector);
        const waitForBtn = async (tries) => {
            for (let i = 0; i < tries; i += 1) {
                expandCargoIfNeeded();
                const btn = findEditBtn();
                if (btn) { btn.click(); return true; }
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            return false;
        };

        if (await waitForBtn(8)) return; // la bonne vue est déjà à l'écran

        const toggles = Array.from(document.querySelectorAll(".dash-toggle"))
            .filter((btn) => !btn.classList.contains("hidden") && !btn.classList.contains("active"));
        for (const toggle of toggles) {
            toggle.click();
            if (await waitForBtn(12)) return;
        }
        console.warn("[dashboard] publication a editer introuvable :", selector);
    }

    async function bootstrap() {
        await window.CCCommon.init("dashboard");

        // Boutons deroulants : UI pure, cablee AVANT le garde d'auth
        // (bootstrap s'arrete sur requireAuth : sinon jamais cable pour un visiteur).
        setupClientAccordions();

        if (!window.CCCommon.requireAuth("dashboard.html")) return;

        const user = window.CCCommon.state.user;
        const profileType = String(user?.profile_type || "").toLowerCase();

        // Basculer entre les vues traveler, client ou cargo
        switchDashboardView(profileType);

        // Activer le toggle par défaut
        document.querySelectorAll(".dash-toggle").forEach(b => b.classList.remove("active"));
        const defaultToggle = document.querySelector(`.dash-toggle[data-switch="${profileType}"]`);
        if (defaultToggle) defaultToggle.classList.add("active");

        // Afficher/masquer les toggles selon le profile_type reel
        document.querySelectorAll(".dash-toggle").forEach(b => {
            const sw = b.getAttribute("data-switch");
            if (profileType === "cargo") {
                b.classList.remove("hidden"); // Tous visibles
            } else if (profileType === "traveler") {
                b.classList.toggle("hidden", sw === "cargo"); // Masquer cargo seulement
            } else {
                b.classList.add("hidden"); // Client: masquer tout
            }
        });
        updateDashboardToggleState(state.currentView);

        if (els.dashboardUser) {
            if (els.dashboardUser) els.dashboardUser.textContent = user?.fullName || "Voyageur";
        }

        if (els.userChip) {
            if (els.userChip) els.userChip.textContent = `${getProfileTypeLabel(user)}${user?.is_verified ? " verifie" : ""}`;
        }

        if (els.openMessagesBtn) {
            if (els.openMessagesBtn) els.openMessagesBtn.href = "chat.html";
        }

        // Remplir les noms de bienvenue
        const fullName = user?.fullName || user?.full_name || "Utilisateur";
        const travelerName = document.getElementById("traveler-welcome-name");
        const clientName = document.getElementById("client-welcome-name");
        const cargoName = document.getElementById("cargo-welcome-name");
        [travelerName, clientName, cargoName].forEach((nameEl) => {
            if (!nameEl) return;
            nameEl.textContent = fullName;
            // Le squelette de chargement disparait des que le nom est connu (C-03).
            nameEl.classList.remove("cc-name-skeleton");
            nameEl.removeAttribute("aria-label");
        });

        // Charger la photo de profil depuis Supabase
        if (user?.id && window.ccSupabase) {
            try {
                const { data: profile } = await window.ccSupabase
                    .from("profiles")
                    .select("profile_photo")
                    .eq("id", user.id)
                    .maybeSingle();
                const savedPhoto = profile?.profile_photo;
                if (savedPhoto) {
                    document.querySelectorAll(".avatar-circle").forEach(el => {
                        el.style.backgroundImage = `url(${savedPhoto})`;
                        el.classList.add("has-image");
                    });
                }
            } catch(e) {
                console.warn("Impossible de charger la photo de profil:", e);
            }
        }

        // Mettre à jour les badges de vérification d'identité
        const updateIdentiteSteps = () => {
            const isVerified = user?.is_verified || false;
            const identityDoc = user?.identity_document_approved || false;
            let steps = 0;
            if (isVerified) steps++;
            if (identityDoc) steps++;
            const levelClass = steps === 0 ? 'level-0' : (steps === 1 ? 'level-1' : 'level-2');
            document.querySelectorAll(".identite-steps").forEach(el => {
                el.textContent = `${steps}/2`;
                el.className = `identite-steps ${levelClass}`;
            });
        };
        updateIdentiteSteps();

        bindEvents();

        // Dates passees interdites (meme regle que la page de publication).
        ["offer-departure-date", "dash-demande-date", "edit-parcel-date"].forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.min = todayISO();
        });

        // Remplir le datalist des pays pour la modale d'edition d'offre
        const countryDatalist = document.getElementById("offer-country-list");
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        if (countryDatalist && countryOptions.length) {
            countryDatalist.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }

        // Remplir le datalist des pays pour la modale demande de trajet
        const dashDemandeList = document.getElementById("dash-demande-country-list");
        if (dashDemandeList && countryOptions.length) {
            dashDemandeList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }

        // Setup autocomplete ville pour les champs ville dans le HTML
        if (window.CCCommon.setupCityAutocomplete) {
            const setup = (paysId, villeId) => {
                const pays = document.getElementById(paysId);
                const ville = document.getElementById(villeId);
                if (pays && ville) window.CCCommon.setupCityAutocomplete(ville, pays);
            };
            // Modale demande de trajet
            setup("dash-demande-origin", "city-dash-demande-origin");
            setup("dash-demande-destination", "city-dash-demande-destination");
            // Modale modification demande
            setup("edit-parcel-origin", "city-edit-parcel-origin");
            setup("edit-parcel-destination", "city-edit-parcel-destination");
            // Modale offre
            setup("offer-origin", "city-offer-origin");
            setup("offer-destination", "city-offer-destination");
        }

        // Evenements modale demande de trajet dashboard
        document.getElementById("close-dashboard-demande-modal")?.addEventListener("click", () => {
            document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
        });
        document.getElementById("dashboard-demande-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("dashboard-demande-modal")) {
                document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("dash-demande-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("dash-demande-date").value = "";
            updateDateHint("dash-demande-date", "dash-demande-date-hint");
            setNoDateActive("dash-demande-date", "dash-demande-no-date-btn");
        });
        document.getElementById("dash-demande-submit-btn")?.addEventListener("click", async () => {
            let origin = document.getElementById("dash-demande-origin")?.value?.trim();
            let destination = document.getElementById("dash-demande-destination")?.value?.trim();
            const originCity = document.getElementById("city-dash-demande-origin")?.value?.trim() || "";
            const destinationCity = document.getElementById("city-dash-demande-destination")?.value?.trim() || "";
            // Number (et non parseInt) : 5,7 kg etait tronque a 5 sans prévenir.
            const kg = Number(document.getElementById("dash-demande-kg")?.value);
            const budget = parseFloat(document.getElementById("dash-demande-budget")?.value) || 0;
            const description = document.getElementById("dash-demande-description")?.value?.trim();
            const dateLimite = document.getElementById("dash-demande-date")?.value || null;
            setFormError("dash-demande-error", "");
            if (!origin || !destination || !description) {
                setFormError("dash-demande-error", "Veuillez remplir tous les champs.");
                return;
            }
            if (!Number.isFinite(kg) || kg < 1) {
                setFormError("dash-demande-error", "Indiquez un poids d'au moins 1 kg.");
                return;
            }
            // Validation a l'ENVOI : le champ pays ne doit contenir qu'un pays de
            // la liste officielle (nom exact ou prefixe sans ambiguite).
            const officialOrigin = resolveCountryName(origin);
            const officialDestination = resolveCountryName(destination);
            if (!officialOrigin || !officialDestination) {
                setFormError("dash-demande-error", "Choisissez les pays de depart et d'arrivee dans la liste proposee.");
                return;
            }
            origin = officialOrigin;
            destination = officialDestination;
            const originField = document.getElementById("dash-demande-origin");
            const destinationField = document.getElementById("dash-demande-destination");
            if (originField) originField.value = origin;
            if (destinationField) destinationField.value = destination;

            if (countriesAreSame(origin, destination)) {
                document.getElementById("dash-demande-same-country-hint")?.classList.remove("hidden");
                return;
            }
            if (dateLimite && dateLimite < todayISO()) {
                document.getElementById("dash-demande-date-hint")?.classList.remove("hidden");
                return;
            }
            // Devise choisie dans la liste (départ / arrivée), avec repli sur la
            // devise du compte si le sélecteur n'a pas pu être monté.
            const currency = getRequestCurrency("dash");
            const feedback = document.getElementById("dash-demande-feedback");
            const submitBtn = document.getElementById("dash-demande-submit-btn");
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }
                // Villes verifiees en base (meme regle qu'a la publication).
                const [originCityCheck, destinationCityCheck] = await Promise.all([
                    validateCityField(origin, originCity),
                    validateCityField(destination, destinationCity)
                ]);
                if (!originCityCheck.ok || !destinationCityCheck.ok) {
                    setFormError("dash-demande-error", (!originCityCheck.ok && originCityCheck.message) || destinationCityCheck.message || "Ville introuvable.");
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
                    return;
                }
                if (window.ccSupabase) {
                    const userId = window.CCCommon.state?.user?.id;
                    if (!userId) {
                        setFormError("dash-demande-error", "Vous devez être connecté.");
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
                        return;
                    }
                    const { error } = await window.ccSupabase.from("parcel_requests").insert({
                        user_id: userId,
                        title: `Demande ${origin} -> ${destination}`,
                        origin,
                        destination,
                        origin_city: originCityCheck.ville || null,
                        destination_city: destinationCityCheck.ville || null,
                        weight_kg: kg,
                        max_price_per_kg: budget > 0 ? budget : null,
                        currency: currency,
                        needed_by_date: dateLimite || null,
                        description,
                        status: "pending"
                    });
                    if (error) throw error;
                }
                if (feedback) feedback.classList.remove("hidden");
                if (submitBtn) submitBtn.classList.add("hidden");
                setTimeout(async () => {
                    document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
                    // Vider le formulaire : a la reouverture, la demande precedente
                    // restait affichee et pouvait etre renvoyee par erreur.
                    [
                        "dash-demande-origin", "city-dash-demande-origin",
                        "dash-demande-destination", "city-dash-demande-destination",
                        "dash-demande-date", "dash-demande-kg", "dash-demande-budget",
                        "dash-demande-description"
                    ].forEach((id) => {
                        const field = document.getElementById(id);
                        if (!field) return;
                        field.value = "";
                        field.classList.remove("cc-country-invalid");
                        field.removeAttribute("title");
                    });
                    // Resynchroniser le suivi pays -> ville apres la remise a zero.
                    notifyCountryChanged(["dash-demande-origin", "dash-demande-destination"]);
                    updateDateHint("dash-demande-date", "dash-demande-date-hint");
                    setNoDateActive("dash-demande-date", "dash-demande-no-date-btn");
                    refreshRequestCurrencyOptions("dash", "");
                    // Recharger le dashboard pour afficher la nouvelle demande
                    await loadClientDashboard();
                }, 1500);
            } catch (err) {
                console.error("Erreur:", err);
                setFormError("dash-demande-error", "La demande n'a pas pu être envoyée. Réessaie.");
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
            }
        });

        // Evenements modale de modification de demande
        document.getElementById("close-edit-parcel-modal")?.addEventListener("click", () => {
            document.getElementById("edit-parcel-modal")?.classList.add("hidden");
        });
        document.getElementById("edit-parcel-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("edit-parcel-modal")) {
                document.getElementById("edit-parcel-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("edit-parcel-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("edit-parcel-date").value = "";
            updateDateHint("edit-parcel-date", "edit-parcel-date-hint");
            setNoDateActive("edit-parcel-date", "edit-parcel-no-date-btn");
        });
        // Remplir le datalist
        const editList = document.getElementById("edit-parcel-country-list");
        if (editList && countryOptions.length) {
            editList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }
        document.getElementById("edit-parcel-save-btn")?.addEventListener("click", async () => {
            if (!editParcelId) return;
            let origin = document.getElementById("edit-parcel-origin")?.value?.trim();
            let destination = document.getElementById("edit-parcel-destination")?.value?.trim();
            const originCity = document.getElementById("city-edit-parcel-origin")?.value?.trim() || "";
            const destinationCity = document.getElementById("city-edit-parcel-destination")?.value?.trim() || "";
            const kg = Number(document.getElementById("edit-parcel-kg")?.value);
            const budget = parseFloat(document.getElementById("edit-parcel-budget")?.value) || 0;
            const dateLimite = document.getElementById("edit-parcel-date")?.value || null;
            setFormError("edit-parcel-error", "");
            if (!origin || !destination) {
                setFormError("edit-parcel-error", "Veuillez remplir tous les champs.");
                return;
            }
            if (!Number.isFinite(kg) || kg < 1) {
                setFormError("edit-parcel-error", "Indiquez un poids d'au moins 1 kg.");
                return;
            }
            const officialOrigin = resolveCountryName(origin);
            const officialDestination = resolveCountryName(destination);
            if (!officialOrigin || !officialDestination) {
                setFormError("edit-parcel-error", "Choisissez les pays de depart et d'arrivee dans la liste proposee.");
                return;
            }
            origin = officialOrigin;
            destination = officialDestination;
            const editOriginField = document.getElementById("edit-parcel-origin");
            const editDestinationField = document.getElementById("edit-parcel-destination");
            if (editOriginField) editOriginField.value = origin;
            if (editDestinationField) editDestinationField.value = destination;

            if (countriesAreSame(origin, destination)) {
                document.getElementById("edit-parcel-same-country-hint")?.classList.remove("hidden");
                return;
            }
            if (dateLimite && dateLimite < todayISO()) {
                document.getElementById("edit-parcel-date-hint")?.classList.remove("hidden");
                return;
            }
            const feedback = document.getElementById("edit-parcel-feedback");
            const saveBtn = document.getElementById("edit-parcel-save-btn");
            try {
                if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Enregistrement..."; }
                if (!window.ccSupabase) throw new Error("Connexion Supabase indisponible.");
                const [originCityCheck, destinationCityCheck] = await Promise.all([
                    validateCityField(origin, originCity),
                    validateCityField(destination, destinationCity)
                ]);
                if (!originCityCheck.ok || !destinationCityCheck.ok) {
                    setFormError("edit-parcel-error", (!originCityCheck.ok && originCityCheck.message) || destinationCityCheck.message || "Ville introuvable.");
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Enregistrer"; }
                    return;
                }
                const { data: updated, error } = await window.ccSupabase.from("parcel_requests").update({
                    origin,
                    destination,
                    origin_city: originCityCheck.ville || null,
                    destination_city: destinationCityCheck.ville || null,
                    weight_kg: kg,
                    max_price_per_kg: budget > 0 ? budget : null,
                    currency: getRequestCurrency("edit"),
                    needed_by_date: dateLimite || null,
                    updated_at: new Date().toISOString()
                }).eq("id", editParcelId)
                    .eq("user_id", window.CCCommon.state?.user?.id)
                    .select("id");
                if (error) throw error;
                if (!updated || !updated.length) {
                    throw new Error("Modification non enregistree (session expiree ou demande introuvable).");
                }
                if (feedback) feedback.classList.remove("hidden");
                if (saveBtn) saveBtn.classList.add("hidden");
                setTimeout(async () => {
                    document.getElementById("edit-parcel-modal")?.classList.add("hidden");
                    await loadClientDashboard();
                }, 1200);
            } catch (err) {
                console.error("Modification impossible:", err);
                setFormError("edit-parcel-error", "La demande n'a pas pu être enregistrée. Réessaie.");
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Enregistrer"; }
            }
        });

        await loadDashboard();

        // Édition demandée depuis results.html (« Modifier mon trajet / ma demande »)
        await openEditFromUrl();
    }

    // Les panneaux repliables (client et voyageur) sont branches des le chargement de la page :
    // le depliage ne doit pas dependre de la session, sinon un panneau reste fige.
    // Le focus revient au declencheur a la fermeture de chaque modale (D-11).
    function setupModalFocusReturn() {
        const ouvertPar = new WeakMap();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const modal = mutation.target;
                const visible = !modal.classList.contains("hidden");
                if (visible && !ouvertPar.has(modal)) {
                    ouvertPar.set(modal, document.activeElement);
                    // Ouverture : focus sur le premier champ, sinon le premier controle (C-28).
                    if (!modal.contains(document.activeElement)) {
                        const cible = modal.querySelector(
                            'input:not([type="hidden"]), textarea, select, button, [href], [tabindex]:not([tabindex="-1"])'
                        );
                        if (cible) cible.focus();
                    }
                } else if (!visible && ouvertPar.has(modal)) {
                    const declencheur = ouvertPar.get(modal);
                    ouvertPar.delete(modal);
                    if (declencheur && document.contains(declencheur) && typeof declencheur.focus === "function") {
                        declencheur.focus();
                    }
                }
            });
        });
        document.querySelectorAll(".modal").forEach((modal) => {
            observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setupClientAccordions();
            setupModalFocusReturn();
        });
    } else {
        setupClientAccordions();
        setupModalFocusReturn();
    }

    bootstrap().catch((error) => {
        console.error("Initialisation impossible:", error);
        ccNotify("Le tableau de bord n'a pas pu démarrer. Recharge la page.", true);
    });
})();
