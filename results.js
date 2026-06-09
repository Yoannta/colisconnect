(() => {
    const state = {
        offers: [],
        userCurrency: 'EUR'
    };

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
        if (!els.offersList) return;
        els.offersList.innerHTML = '<div class="loading-state">Actualisation des offres...</div>';

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
                const destCity = offer.destination || "Arrivée";
                const originCode = originCity.substring(0, 3).toUpperCase();
                const destCode = destCity.substring(0, 3).toUpperCase();
                const departureDate = String(offer.departureDate || "-");

                const pricePerKgRaw = Number(offer.pricePerKg || 0);
                const baseCur = offer.baseCurrency || 'EUR';
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
            <span class="compact-cityline">${window.CCCommon.escapeHtml(originCity)} - ${window.CCCommon.escapeHtml(destCity)}</span>
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
            <span class="compact-owner-name">${window.CCCommon.escapeHtml(offer.ownerName || "Voyageur")}</span>
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
        if (!offer) return;

        const target = `chat.html?offerId=${encodeURIComponent(String(offer.id))}`;
        if (!window.CCCommon.requireCompletedProfile(target)) return;
        window.location.href = target;
    }

    function bindEvents() {
        if (els.offerFilterForm) {
            els.offerFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                loadOffers().catch(err => console.error(err));
            });
        }

        // [CURRENCY] Seamless Toggle logic
        const btnChange = document.getElementById("cc-btn-change-currency");
        const searchWrapper = document.getElementById("cc-search-wrapper");
        const countryInput = document.getElementById("cc-inline-country");
        const btnCancel = document.getElementById("cc-cancel-search");
        const btnLabel = document.getElementById("cc-btn-label");

        if (btnChange && searchWrapper && countryInput) {
            btnChange.addEventListener("click", () => {
                btnChange.style.display = "none";
                searchWrapper.style.display = "flex";
                countryInput.value = "";
                countryInput.focus();
            });

            if (btnCancel) {
                btnCancel.addEventListener("click", () => {
                    searchWrapper.style.display = "none";
                    btnChange.style.display = "flex";
                });
            }

            countryInput.addEventListener("change", async () => {
                const val = countryInput.value.trim();
                const VALID_COUNTRIES = window.CCCommon.COUNTRY_OPTIONS;

                if (val && VALID_COUNTRIES.includes(val)) {
                    searchWrapper.style.display = "none";
                    btnChange.style.display = "flex";
                    if (btnLabel) btnLabel.textContent = "...";

                    try {
                        if (window.CCCommon.state?.user?.id) {
                            await window.ccSupabase
                                .from('profiles')
                                .update({ country: val })
                                .eq('id', window.CCCommon.state.user.id);

                            window.CCCommon.state.user.country = val;
                        }

                        const newCur = COUNTRY_CURRENCIES[val] || 'EUR';
                        state.userCurrency = newCur;
                        if (btnLabel) btnLabel.textContent = newCur;

                        await loadOffers();
                    } catch (err) {
                        console.error("Currency swap error:", err);
                        if (btnLabel) btnLabel.textContent = "Erreur";
                    }
                }
            });
        }

        // Quick city filters
        document.querySelectorAll('.city-badge').forEach(badge => {
            badge.addEventListener("click", (e) => {
                const city = e.target.dataset.city || e.target.textContent.trim();
                const destInp = document.getElementById('dest-input');
                if (destInp && city) {
                    destInp.value = city;
                    loadOffers().catch(err => console.warn(err));
                }
            });
        });

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
    }

    function initCountryDatalist() {
        const datalist = document.getElementById("destination-list");
        const options = window.CCCommon.COUNTRY_OPTIONS;
        if (datalist && options) {
            datalist.innerHTML = options.map(c => `<option value="${c}">`).join("");
        }
    }

    async function bootstrap() {
        await window.CCCommon.init("results");
        if (!window.CCCommon.requireAuth()) return;

        const user = window.CCCommon.state?.user;
        const userCountry = user?.country || user?.location;
        if (userCountry) {
            state.userCurrency = COUNTRY_CURRENCIES[userCountry] || 'EUR';
            const btnLabel = document.getElementById("cc-btn-label");
            if (btnLabel) {
                btnLabel.textContent = state.userCurrency;
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
