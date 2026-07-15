(() => {
    const state = {
        offers: [],
        userCurrency: 'EUR',
        filterProfileType: 'traveler'
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
        const destCountry = document.getElementById("res-dest-country")?.value?.trim() || "";
        const destCity = document.getElementById("res-dest-city")?.value?.trim() || "";
        const originCountry = document.getElementById("res-origin-country")?.value?.trim() || "";
        const originCity = document.getElementById("res-origin-city")?.value?.trim() || "";
        const destination = destCity || destCountry;
        const origin = originCity || originCountry;
        return { destination, origin, minKg: 1 };
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

    function renderOffers() {
        if (!els.offersList) return;

        // Filtrer les offres selon l'onglet actif
        const filteredOffers = state.offers.filter(offer => {
            const mode = String(offer.mode || "").trim();
            if (state.filterProfileType === 'traveler') {
                return mode === "";
            } else if (state.filterProfileType === 'cargo') {
                return mode !== "";
            }
            return true;
        });

        if (!filteredOffers.length) {
            els.offersList.innerHTML = `
                <div class="empty-card" style="grid-column:1/-1;">
                    <p>Aucune offre pour ce trajet.</p>
                    <p style="color:var(--muted);font-size:0.85rem;margin:8px 0;">Faite une demande, si un voyageur est interesse il vous contactera.</p>
                    <button class="btn primary" id="btn-faire-demande-trajet" style="margin-top:12px;">Faire une demande de trajet</button>
                </div>`;
            setTimeout(() => {
                document.getElementById("btn-faire-demande-trajet")?.addEventListener("click", () => {
                    document.getElementById("demande-trajet-modal")?.classList.remove("hidden");
                });
            }, 50);
            return;
        }

        els.offersList.innerHTML = filteredOffers
            .map((offer) => {
                const initials = getInitials(offer.ownerName);
                const isVerified = Boolean(offer.ownerIsVerified);
                const verificationBadge = isVerified ? `<span class="verification-badge mini" title="Profil certifié"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></span>` : "";

                const originCountry = offer.origin || "Origine";
                const destCountry = offer.destination || "Arrivée";
                const departureDate = String(offer.departureDate || "-");
                let formattedDate = departureDate;
                try {
                    const d = new Date(departureDate);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
                    }
                } catch(e) { /* fallback */ }

                const pricePerKgRaw = Number(offer.pricePerKg || 0);
                const baseCur = offer.baseCurrency || 'EUR';
                const userCur = state.userCurrency;
                const convertedPrice = convertCurrency(pricePerKgRaw, baseCur, userCur);
                const availableKg = offer.availableKg || 0;

                const priceDisplay = formatAmount(convertedPrice, userCur);

                const offerMode = String(offer.mode || "").trim();
                let profileTypeBadge = "";
                let cargoModeLabel = "";
                if (offerMode === "") {
                    profileTypeBadge = `<span class="offer-type-badge type-voyageur">Voyageur</span>`;
                } else {
                    profileTypeBadge = `<span class="offer-type-badge type-cargo">Cargo</span>`;
                    if (offerMode === "avion") cargoModeLabel = "Avion";
                    else if (offerMode === "bateau") cargoModeLabel = "Bateau";
                    else if (offerMode === "les_deux") cargoModeLabel = "Avion + Bateau";
                }

                // Colis acceptés / refusés
                const colisAcceptes = String(offer.colis_types || offer.colisTypes || "").trim();
                const colisRefuses = String(offer.refused_colis_types || offer.refusedColisTypes || "").trim();
                const hasColisInfo = colisAcceptes || colisRefuses;

                return `
<article class="offer-compact-card">
  <!-- ZONE 1 : Trajet + Prix -->
  <div class="oc-header">
    <div class="oc-route">
      <span class="oc-country">${window.CCCommon.escapeHtml(originCountry)}</span>
      <span class="oc-arrow">&rarr;</span>
      <span class="oc-country">${window.CCCommon.escapeHtml(destCountry)}</span>
    </div>
    <div class="oc-price-box">
      <span class="oc-price">${priceDisplay}</span>
      <span class="oc-price-unit">/kg</span>
    </div>
  </div>

  <!-- ZONE 2 : Infos (date, kg, type + colis) -->
  <div class="oc-infos">
    <div class="oc-infos-row">
      <span class="oc-info-chip">&#128197; ${window.CCCommon.escapeHtml(formattedDate)}</span>
      <span class="oc-info-chip">&#128230; ${availableKg} kg</span>
      ${cargoModeLabel ? `<span class="oc-info-chip">&#9992; ${cargoModeLabel}</span>` : ""}
      <span class="oc-info-chip oc-type-chip">${profileTypeBadge}</span>
    </div>
    ${hasColisInfo ? `<div class="oc-colis-row">
      ${colisAcceptes ? `<span class="oc-colis-item oc-colis-ok">✓ ${window.CCCommon.escapeHtml(colisAcceptes)}</span>` : ""}
      ${colisRefuses ? `<span class="oc-colis-item oc-colis-no">✕ ${window.CCCommon.escapeHtml(colisRefuses)}</span>` : ""}
    </div>` : ""}
  </div>

  <!-- ZONE 3 : Footer (avatar, nom, bouton) -->
  <div class="oc-footer">
    <div class="oc-user">
      <span class="oc-avatar">${initials}</span>
      <span class="oc-name">${window.CCCommon.escapeHtml(offer.ownerName || "Voyageur")}</span>
      ${verificationBadge}
    </div>
    <button class="btn primary btn-xs oc-contact-btn" data-reserve-offer="${offer.id}">Contacter</button>
  </div>
</article>`;
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
        const btnTraveler = document.getElementById("filter-traveler-btn");
        const btnCargo = document.getElementById("filter-cargo-btn");
        const headLine = document.getElementById("results-headline");

        if (btnTraveler && btnCargo) {
            btnTraveler.addEventListener("click", () => {
                btnTraveler.classList.add("active");
                btnCargo.classList.remove("active");
                state.filterProfileType = 'traveler';
                if (headLine) {
                    headLine.textContent = "Voyageurs disponibles pour vos transferts urgents ou petites quantités";
                }
                renderOffers();
            });

            btnCargo.addEventListener("click", () => {
                btnCargo.classList.add("active");
                btnTraveler.classList.remove("active");
                state.filterProfileType = 'cargo';
                if (headLine) {
                    headLine.textContent = "Entreprises cargo disponibles pour vos colis";
                }
                renderOffers();
            });
        }

        // Bouton Rechercher de la nouvelle barre
        document.getElementById("new-search-btn")?.addEventListener("click", () => {
            loadOffers().catch(err => console.warn(err));
        });

        // ===== TOGGLE FILTRE MOBILE =====
        const mobileToggleBtn = document.getElementById("mobile-filter-toggle-btn");
        const mobileToggleLabel = document.getElementById("mobile-filter-toggle-label");
        const filterPanel = document.getElementById("search-filter-panel");

        if (mobileToggleBtn && filterPanel) {
            mobileToggleBtn.addEventListener("click", () => {
                const isMobile = window.matchMedia("(max-width: 950px)").matches;
                if (!isMobile) return; // Aucun effet sur desktop

                const isOpen = filterPanel.classList.contains("is-open");
                if (isOpen) {
                    filterPanel.classList.remove("is-open");
                    if (mobileToggleLabel) mobileToggleLabel.textContent = "Afficher";
                } else {
                    filterPanel.classList.add("is-open");
                    if (mobileToggleLabel) mobileToggleLabel.textContent = "Masquer";
                }
            });
        }
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
            ["res-origin-country", "res-dest-country"].forEach(id => {
                const el = document.getElementById(id);
                if (el) window.CCCommon.setupCountryInput(el);
            });
        }
        // Setup autocomplete ville pour la barre de recherche
        if (window.CCCommon.setupCityAutocomplete) {
            const setup = (paysId, villeId) => {
                const pays = document.getElementById(paysId);
                const ville = document.getElementById(villeId);
                if (pays && ville) window.CCCommon.setupCityAutocomplete(ville, pays);
            };
            setup("res-origin-country", "res-origin-city");
            setup("res-dest-country", "res-dest-city");
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
        // Evenements de la modale demande
        document.getElementById("close-demande-modal")?.addEventListener("click", () => {
            document.getElementById("demande-trajet-modal")?.classList.add("hidden");
        });
        document.getElementById("demande-trajet-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("demande-trajet-modal")) {
                document.getElementById("demande-trajet-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("demande-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("demande-date").value = "";
        });
        document.getElementById("demande-submit-btn")?.addEventListener("click", async () => {
            const origin = document.getElementById("demande-origin")?.value?.trim();
            const destination = document.getElementById("demande-destination")?.value?.trim();
            const kg = parseInt(document.getElementById("demande-kg")?.value, 10);
            const description = document.getElementById("demande-description")?.value?.trim();
            const dateLimite = document.getElementById("demande-date")?.value || null;
            if (!origin || !destination || !kg || !description) {
                alert("Veuillez remplir tous les champs.");
                return;
            }
            const feedback = document.getElementById("demande-feedback");
            const submitBtn = document.getElementById("demande-submit-btn");
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }
                if (window.ccSupabase) {
                    await window.ccSupabase.from("parcel_requests").insert({
                        user_id: window.CCCommon.state?.user?.id,
                        title: `Demande ${origin} -> ${destination}`,
                        origin,
                        destination,
                        weight_kg: kg,
                        needed_by_date: dateLimite,
                        currency: state.userCurrency || window.CCCommon.getUserCurrency?.(),
                        description,
                        status: "pending"
                    });
                } else {
                    await window.CCCommon.api("/api/parcel-requests", { method: "POST", body: { origin, destination, kg, description, dateLimite } });
                }
                if (feedback) {
                    feedback.classList.remove("hidden");
                }
                if (submitBtn) submitBtn.classList.add("hidden");
                // Fermer la modale apres 1.5s
                setTimeout(() => {
                    document.getElementById("demande-trajet-modal")?.classList.add("hidden");
                }, 1500);
            } catch (err) {
                alert(err.message || "Erreur lors de la soumission.");
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
            }
        });
        bindEvents();
        await loadOffers();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });

    // Evenements de la modale demande de trajet (toujours attachee, meme hors bootstrap)
    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("close-demande-modal")?.addEventListener("click", () => {
            document.getElementById("demande-trajet-modal")?.classList.add("hidden");
        });
        document.getElementById("demande-trajet-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("demande-trajet-modal")) {
                document.getElementById("demande-trajet-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("demande-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("demande-date").value = "";
        });
        document.getElementById("demande-submit-btn")?.addEventListener("click", async () => {
            const origin = document.getElementById("demande-origin")?.value?.trim();
            const destination = document.getElementById("demande-destination")?.value?.trim();
            const kg = parseInt(document.getElementById("demande-kg")?.value, 10);
            const description = document.getElementById("demande-description")?.value?.trim();
            const dateLimite = document.getElementById("demande-date")?.value || null;
            if (!origin || !destination || !kg || !description) {
                alert("Veuillez remplir tous les champs.");
                return;
            }
            const feedback = document.getElementById("demande-feedback");
            const submitBtn = document.getElementById("demande-submit-btn");
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }
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
                        weight_kg: kg,
                        needed_by_date: dateLimite || null,
                        currency: state.userCurrency || window.CCCommon.getUserCurrency?.(),
                        description,
                        status: "pending"
                    });
                    if (error) throw error;
                } else {
                    await window.CCCommon.api("/api/parcel-requests", { method: "POST", body: { origin, destination, kg, description, dateLimite } });
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
})();
