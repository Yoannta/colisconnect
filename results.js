(() => {
    const state = {
        offers: [],
        userCurrency: 'EUR',
        filterProfileType: 'traveler',
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
                <div class="empty-card" style="grid-column:1/-1; background-color: var(--surface); border: 1px solid rgba(255,255,255,0.05); padding: 40px; border-radius: 12px; text-align: center;">
                    <p style="margin: 0; color: #fff; font-size: 1.1rem; font-weight: 500;">Aucune offre correspondante.</p>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin:8px 0 16px;">Créez une demande de transport, si un voyageur est intéressé il vous contactera.</p>
                    <button class="btn primary" id="btn-faire-demande-trajet" style="margin-top:12px; padding: 10px 20px; border-radius: 8px; cursor: pointer; border: 0; background-color: var(--emerald-bright); color: #000; font-weight: bold;">Faire une demande de trajet</button>
                </div>`;
            setTimeout(() => {
                document.getElementById("btn-faire-demande-trajet")?.addEventListener("click", () => {
                    document.getElementById("demande-trajet-modal")?.classList.remove("hidden");
                });
            }, 50);
            return;
        }

        els.offersList.innerHTML = filteredOffers
            .map((offer, index) => {
                const initials = getInitials(offer.ownerName);
                const isVerified = Boolean(offer.ownerIsVerified);

                const originCountry = offer.origin || "Origine";
                const destCountry = offer.destination || "Arrivée";
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

                // Colis acceptés / refusés
                const colisAcceptes = String(offer.colis_types || offer.colisTypes || "").trim();
                const colisRefuses = String(offer.refused_colis_types || offer.refusedColisTypes || "").trim();
                const hasColisInfo = colisAcceptes || colisRefuses;

                const animDelay = (index % 5) * 100 + 100;

                return `
<article class="offer-compact-card">
  <div class="card-body">
    <div class="oc-route">
      <span class="oc-country">${window.CCCommon.escapeHtml(originCountry)}</span>
      <span class="oc-arrow">&rarr;</span>
      <span class="oc-country">${window.CCCommon.escapeHtml(destCountry)}</span>
    </div>
    <div class="oc-price">${priceDisplay}<span class="oc-price-unit"> /kg</span></div>
    <div class="oc-meta">
      <span class="oc-meta-item">📅 ${window.CCCommon.escapeHtml(formattedDate)}</span>
      <span class="oc-meta-item">📦 ${availableKg} kg</span>
    </div>
    ${hasColisInfo ? `<div class="oc-colis" style="margin-top:4px">${colisAcceptes ? `<span class="oc-colis ok">✓ ${window.CCCommon.escapeHtml(colisAcceptes)}</span> ` : ""}${colisRefuses ? `<span class="oc-colis no">✕ ${window.CCCommon.escapeHtml(colisRefuses)}</span>` : ""}</div>` : ""}
  </div>
  <div class="card-footer">
    <div class="user-info">
      <span class="oc-avatar">${initials}</span>
      <span class="oc-name">${window.CCCommon.escapeHtml(offer.ownerName || "Voyageur")}</span>
      ${isVerified ? `<span class="oc-star">★</span>` : ""}
      <span class="oc-badge ${offerMode === "" ? 'v' : 'c'}">${offerMode === "" ? "Voyageur" : "Cargo"}</span>
    </div>
    <button class="btn primary oc-btn" data-reserve-offer="${offer.id}">Contacter</button>
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
            ["res-origin", "res-dest"].forEach(id => {
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
