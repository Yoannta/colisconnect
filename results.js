(() => {
    const state = {
        offers: [],
        userCurrency: 'EUR'  // [MULTI-CURRENCY] Sera mis à jour dans bootstrap()
    };

    // [MULTI-CURRENCY] Utilisation des fonctions globales de CCCommon
    const convertCurrency = window.CCCommon.convertCurrency;
    const formatAmount = window.CCCommon.formatAmount;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;


    const els = {
        offerFilterForm: document.getElementById("offer-filter-form"),
        offersList: document.getElementById("offers-list")
    };

    function getInitials(name) {
        if (!name) return "CC";
        const parts = name.split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    function queryOfferFilters() {
        const data = new FormData(els.offerFilterForm);
        const destination = String(data.get("destination") || "").trim();
        const minKg = Math.max(1, Number(data.get("minKg") || 1));
        return { destination, minKg };
    }

    async function loadOffers() {
        const filters = queryOfferFilters();
        const params = new URLSearchParams({
            pageSize: "100",
            destination: filters.destination,
            minKg: String(filters.minKg)
        });

        const payload = await window.CCCommon.api(`/api/offers?${params.toString()}`, { auth: false });
        state.offers = Array.isArray(payload?.items) ? payload.items : [];
        renderOffers();
    }

    function renderOffers() {
        if (!els.offersList) return;

        if (!state.offers.length) {
            els.offersList.innerHTML = '<div class="empty-card">Aucune offre pour ce filtre.</div>';
            return;
        }

        els.offersList.innerHTML = state.offers
            .map((offer) => {
                const initials = getInitials(offer.ownerName);
                const isVerified = Boolean(offer.ownerIsVerified);
                const verificationBadge = isVerified ? `
                    <span class="verification-badge mini" title="Profil certifié">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                    </span>
                ` : "";
                const originCity = offer.origin || "Origine";
                const destCity = offer.destination || "Arrivee";
                const originCode = originCity.substring(0, 3).toUpperCase();
                const destCode = destCity.substring(0, 3).toUpperCase();
                const departureDate = String(offer.departureDate || "-");
                const escapedOriginCity = window.CCCommon.escapeHtml(originCity);
                const escapedDestCity = window.CCCommon.escapeHtml(destCity);
                const escapedOwnerName = window.CCCommon.escapeHtml(offer.ownerName || "Voyageur");
                const pricePerKgRaw = Number(offer.pricePerKg || 0);
                const baseCur = offer.baseCurrency || 'EUR';  // [MULTI-CURRENCY]
                const userCur = state.userCurrency;
                const convertedPrice = convertCurrency(pricePerKgRaw, baseCur, userCur);
                const availableKg = offer.availableKg || 0;
                const priceDisplay = formatAmount(convertedPrice, userCur);
                const originalDisplay = baseCur !== userCur ? `<span class="price-original">(${formatAmount(pricePerKgRaw, baseCur)})</span>` : '';

                return `
<article class="offer-compact-card">
    <div class="compact-row compact-row-top">
        <div class="compact-route">
            <span class="compact-code">${originCode}</span>
            <span class="compact-arrow">-></span>
            <span class="compact-code">${destCode}</span>
            <span class="compact-cityline">${escapedOriginCity} - ${escapedDestCity}</span>
        </div>
        <div class="compact-price-box">
            <span class="compact-price">${priceDisplay}</span>
            ${originalDisplay}
            <span class="compact-price-unit">/kg</span>
        </div>
    </div>

    <div class="compact-row compact-row-mid">
        <div class="compact-owner">
            <span class="compact-avatar">${initials}</span>
            <span class="compact-owner-name">${escapedOwnerName}</span>
            ${verificationBadge}
        </div>
        <div class="compact-meta">
            <span class="compact-meta-chip">${availableKg}kg</span>
            <span class="compact-meta-chip">${window.CCCommon.escapeHtml(departureDate)}</span>
        </div>
        <button class="btn primary btn-xs compact-contact-btn" data-reserve-offer="${offer.id}">
            Contacter
        </button>
    </div>
</article>`;
            })
            .join("\n");
    }

    async function startReservation(offerId) {
        const offer = state.offers.find((item) => Number(item.id) === Number(offerId));
        if (!offer) {
            alert("Offre introuvable.");
            return;
        }

        const offerIdParam = encodeURIComponent(String(offer.id));
        const target = `chat.html?offerId=${offerIdParam}`;
        if (!window.CCCommon.requireCompletedProfile(target)) return;
        window.location.href = target;
    }


    function bindEvents() {
        const form = document.getElementById("offer-filter-form");
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                loadOffers().catch((err) => alert(err.message));
            });
        }

        // Gestion du bouton monnaie -> ouvre un panneau flottant (hors du formulaire)
        const currencyBtn = document.getElementById("cc-btn-change-currency");
        const overlay = document.getElementById("cc-currency-overlay");
        const floatingPicker = document.getElementById("cc-floating-picker");
        const floatingInput = document.getElementById("cc-floating-country-input");
        const floatingConfirm = document.getElementById("cc-floating-confirm");
        const floatingError = document.getElementById("cc-floating-error");

        function openPicker() {
            overlay.style.display = "block";
            floatingPicker.style.display = "block";
            floatingInput.value = "";
            floatingInput.focus();
            if (floatingError) floatingError.style.display = "none";
        }

        function closePicker() {
            overlay.style.display = "none";
            floatingPicker.style.display = "none";
        }

        if (currencyBtn) {
            currencyBtn.addEventListener("click", openPicker);
        }

        if (floatingConfirm) {
            floatingConfirm.addEventListener("click", async () => {
                const country = floatingInput.value.trim();
                const options = window.CCCommon?.COUNTRY_OPTIONS || [];

                if (!country || !options.includes(country)) {
                    floatingError.textContent = "Choisissez un pays valide dans la liste.";
                    floatingError.style.display = "block";
                    return;
                }

                floatingConfirm.textContent = "...";
                floatingConfirm.disabled = true;

                try {
                    // 1. Enregistrer dans Supabase
                    if (window.CCCommon?.state?.user?.id) {
                        const { error } = await window.ccSupabase
                            .from('profiles')
                            .update({ country })
                            .eq('id', window.CCCommon.state.user.id);
                        if (error) throw error;

                        // 2. Mettre à jour l'état local
                        window.CCCommon.state.user.country = country;
                    }

                    // 3. Mettre à jour la monnaie affichée
                    state.userCurrency = COUNTRY_CURRENCIES[country] || 'EUR';
                    const btnText = document.querySelector("#cc-btn-change-currency .btn-text");
                    if (btnText) btnText.textContent = "Monnaie : " + state.userCurrency;

                    closePicker();

                    // 4. Recharger les offres avec les nouveaux prix
                    await loadOffers();
                } catch (err) {
                    floatingError.textContent = err.message || "Erreur lors de la mise à jour.";
                    floatingError.style.display = "block";
                } finally {
                    floatingConfirm.textContent = "Confirmer";
                    floatingConfirm.disabled = false;
                }
            });
        }

        // Fermer si on appuie sur Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closePicker();
        });

        // Quick city filters
        document.querySelectorAll('.city-badge').forEach(badge => {
            badge.addEventListener("click", (e) => {
                const city = e.target.dataset.city;
                const destInput = document.querySelector('input[name="destination"]');
                if (destInput) {
                    destInput.value = city;
                    loadOffers().catch((error) => alert(error.message || "Filtrage impossible."));
                }
            });
        });

        els.offersList?.addEventListener("click", (event) => {
            const target = event.target;
            const button = target.closest("button[data-reserve-offer]");
            if (!button) return;
            const offerId = Number(button.getAttribute("data-reserve-offer"));
            startReservation(offerId).catch((error) => {
                if (error?.code === "PROFILE_COMPLETION_REQUIRED" || error?.status === 403) {
                    window.CCCommon.openProfileCompletionGate("results.html");
                    return;
                }
                alert(error.message || "Reservation impossible.");
            });
        });
    }

    function initCountryDatalist() {
        const datalist = document.getElementById("destination-list");
        const options = window.CCCommon.COUNTRY_OPTIONS;
        if (datalist && options) {
            datalist.innerHTML = options.map(c => `<option value="${window.CCCommon.escapeHtml(c)}">`).join("");
        }
    }

    async function bootstrap() {
        await window.CCCommon.init("results");
        if (!window.CCCommon.requireAuth()) return;

        // [MULTI-CURRENCY] Détecter la monnaie de l'utilisateur depuis son profil
        const user = window.CCCommon.state?.user;
        if (user?.country || user?.location) {
            state.userCurrency = COUNTRY_CURRENCIES[user.country || user.location] || 'EUR';
            const currencyBtnText = document.querySelector("#cc-btn-change-currency .btn-text");
            if (currencyBtnText) {
                currencyBtnText.textContent = "Monnaie: " + state.userCurrency;
            }
        }

        initCountryDatalist();
        bindEvents();
        await loadOffers();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
