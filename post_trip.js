(function () {
    let els = {};
    let paymentState = {
        selectedMethod: null,
        selectedMethodName: null,
        accountNumber: null
    };

    let selectedProfileTypeChoice = null; // 'traveler' | 'cargo'
    let selectedTransportMode = null; // 'avion' | 'bateau' | 'voiture' | 'train' | 'bus'

    function initCountryDatalist() {
        const list = document.getElementById("countries-list");
        if (!list || list.children.length > 0) return;

        const countries = [
            "France", "Sénégal", "Côte d'Ivoire", "Cameroun", "Mali", "Guinée", "République Démocratique du Congo", "Congo",
            "Togo", "Bénin", "Burkina Faso", "Gabon", "Tchad", "Niger", "Mauritanie", "Canada", "États-Unis", "Belgique",
            "Suisse", "Maroc", "Algérie", "Tunisie", "Madagascar", "Haïti"
        ];

        const fragment = document.createDocumentFragment();
        countries.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            fragment.appendChild(opt);
        });
        list.appendChild(fragment);
    }

    function initDateMin() {
        const today = new Date().toISOString().split("T")[0];
        if (els.dateDepart) els.dateDepart.min = today;
    }

    function initReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add("visible");
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    }

    // [CARGO] dates multiples : affichage du bouton « Ajouter une autre date »
    function setExtraTripDatesVisible(visible) {
        if (!els.tripExtraDatesWrap) return;
        if (visible) {
            els.tripExtraDatesWrap.classList.remove("hidden");
        } else {
            els.tripExtraDatesWrap.classList.add("hidden");
            clearExtraTripDates();
        }
    }

    function clearExtraTripDates() {
        if (els.tripExtraDates) els.tripExtraDates.innerHTML = "";
        updateExtraDatesAddBtn();
    }

    function updateExtraDatesAddBtn() {
        if (!els.addTripDateBtn || !els.tripExtraDates) return;
        const count = els.tripExtraDates.querySelectorAll(".trip-extra-date-row").length;
        if (count >= 10) {
            els.addTripDateBtn.disabled = true;
            els.addTripDateBtn.title = "Limite de 10 dates supplémentaires atteinte.";
        } else {
            els.addTripDateBtn.disabled = false;
            els.addTripDateBtn.title = "";
        }
    }

    function addExtraTripDateRow() {
        if (!els.tripExtraDates) return;
        const count = els.tripExtraDates.querySelectorAll(".trip-extra-date-row").length;
        if (count >= 10) return;

        const row = document.createElement("div");
        row.className = "trip-extra-date-row";
        const minDate = els.dateDepart?.min || new Date().toISOString().split("T")[0];
        row.innerHTML = `
            <div class="input-with-icon" style="flex:1;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input type="date" class="form-input trip-extra-date" min="${minDate}" required>
            </div>
            <button type="button" class="colis-row-del" title="Supprimer cette date" aria-label="Supprimer cette date">&times;</button>
        `;
        els.tripExtraDates.appendChild(row);
        updateExtraDatesAddBtn();
    }

    function readAllTripDates() {
        const dates = [];
        const main = String(els.dateDepart?.value || "").trim();
        if (main) dates.push(main);
        if (selectedProfileTypeChoice === "cargo" && els.tripExtraDates) {
            els.tripExtraDates.querySelectorAll(".trip-extra-date").forEach((inp) => {
                const v = String(inp.value || "").trim();
                if (v && !dates.includes(v)) dates.push(v);
            });
        }
        return dates;
    }

    // Multi-colis : lecture dynamique des lignes dans l'étape 3
    function readColisItems() {
        const rows = document.querySelectorAll(".colis-item-row");
        if (!rows.length) return [];
        const items = [];
        rows.forEach((row) => {
            const desc = (row.querySelector(".colis-desc")?.value || "").trim();
            const qty = parseInt(row.querySelector(".colis-qty")?.value || "1", 10) || 1;
            const size = (row.querySelector(".colis-size")?.value || "").trim();
            if (desc) {
                items.push({ description: desc, quantity: qty, size: size || undefined });
            }
        });
        return items;
    }

    // Monnaies autorisées par pays
    const countryCurrencies = {
        "France": [{ code: "EUR", symbol: "€", name: "Euro" }],
        "Sénégal": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Côte d'Ivoire": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Cameroun": [{ code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)" }],
        "Mali": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Guinée": [{ code: "GNF", symbol: "FG", name: "Franc guinéen" }],
        "République Démocratique du Congo": [{ code: "USD", symbol: "$", name: "Dollar US" }, { code: "CDF", symbol: "FC", name: "Franc congolais" }],
        "Congo": [{ code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)" }],
        "Togo": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Bénin": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Burkina Faso": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Gabon": [{ code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)" }],
        "Tchad": [{ code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)" }],
        "Niger": [{ code: "XOF", symbol: "FCFA", name: "Franc CFA" }],
        "Mauritanie": [{ code: "MRU", symbol: "UM", name: "Ouguiya" }],
        "Canada": [{ code: "CAD", symbol: "$", name: "Dollar canadien" }],
        "États-Unis": [{ code: "USD", symbol: "$", name: "Dollar US" }],
        "Belgique": [{ code: "EUR", symbol: "€", name: "Euro" }],
        "Suisse": [{ code: "CHF", symbol: "CHF", name: "Franc suisse" }],
        "Maroc": [{ code: "MAD", symbol: "DH", name: "Dirham marocain" }],
        "Algérie": [{ code: "DZD", symbol: "DA", name: "Dinar algérien" }],
        "Tunisie": [{ code: "TND", symbol: "DT", name: "Dinar tunisien" }],
        "Madagascar": [{ code: "MGA", symbol: "Ar", name: "Ariary" }],
        "Haïti": [{ code: "HTG", symbol: "G", name: "Gourde" }]
    };

    function updateCurrencySelector() {
        const depCountry = els.departure?.value?.trim() || "";
        const destCountry = els.destination?.value?.trim() || "";

        let allowedCurrencies = [];
        const depCurrs = countryCurrencies[depCountry] || [];
        const destCurrs = countryCurrencies[destCountry] || [];

        // Fusionner les monnaies uniques des deux pays
        const map = new Map();
        [...depCurrs, ...destCurrs].forEach(c => map.set(c.code, c));
        allowedCurrencies = Array.from(map.values());

        // Si aucun pays reconnu n'est saisi, proposer les principales monnaies par défaut
        if (allowedCurrencies.length === 0) {
            allowedCurrencies = [
                { code: "EUR", symbol: "€", name: "Euro" },
                { code: "XOF", symbol: "FCFA", name: "Franc CFA (UEMOA)" },
                { code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)" },
                { code: "USD", symbol: "$", name: "Dollar US" },
                { code: "CAD", symbol: "$", name: "Dollar canadien" }
            ];
        }

        // Remplir la liste du menu déroulant
        if (els.currencyList) {
            els.currencyList.innerHTML = allowedCurrencies.map(c => `
                <button type="button" class="currency-opt-btn" data-code="${c.code}" data-symbol="${c.symbol}">
                    <span class="c-code">${c.code}</span>
                    <span class="c-name">${c.name} (${c.symbol})</span>
                </button>
            `).join("");
        }

        // Si la devise actuelle n'est plus valide, basculer sur la première autorisée
        const currentCode = els.priceCurrency?.value || "EUR";
        const isValid = allowedCurrencies.some(c => c.code === currentCode);
        if (!isValid && allowedCurrencies.length > 0) {
            selectCurrency(allowedCurrencies[0].code, allowedCurrencies[0].symbol);
        }
    }

    function selectCurrency(code, symbol) {
        if (els.priceCurrency) els.priceCurrency.value = code;
        if (els.currencyBtnCode) els.currencyBtnCode.textContent = code;
        if (els.currencyBtnSymbol) els.currencyBtnSymbol.textContent = symbol;
        if (els.kiloPriceUnit) els.kiloPriceUnit.textContent = `${symbol}/kg`;
        if (els.currencyDropdown) els.currencyDropdown.classList.add("hidden");
    }

    function getPayload() {
        const rawKilos = parseFloat(els.kilos?.value) || 0;
        const rawPrice = parseFloat(els.price?.value) || 0;

        return {
            departure: els.departure?.value?.trim(),
            destination: els.destination?.value?.trim(),
            cityDeparture: els.cityDeparture?.value?.trim() || undefined,
            cityDestination: els.cityDestination?.value?.trim() || undefined,
            departureDate: els.dateDepart?.value,
            kilos: rawKilos,
            available_kilos: rawKilos,
            price: rawPrice,
            pricePerKilo: rawPrice,
            priceCurrency: els.priceCurrency?.value || 'EUR',
            notes: els.notes?.value?.trim() || undefined,
            profileType: selectedProfileTypeChoice || window.CCCommon.state?.user?.profile_type || 'traveler',
            transportMode: selectedTransportMode || undefined,
            payment_method: paymentState.selectedMethod,
            payment_method_name: paymentState.selectedMethodName,
            account_number: paymentState.accountNumber,
            specialPrices: typeof window.ccReadSpecialPrices === 'function' ? window.ccReadSpecialPrices() : [],
            acceptedColisTypes: typeof window.ccReadColisTypes === 'function' ? window.ccReadColisTypes() : [],
            colisItems: readColisItems()
        };
    }

    async function submitTrip(e) {
        if (e) e.preventDefault();
        const tripDates = readAllTripDates();
        if (!tripDates.length) {
            alert("Veuillez sélectionner au moins une date de départ.");
            return;
        }

        const payload = getPayload();
        if (!payload.departure || !payload.destination || !payload.departureDate || !payload.price) {
            alert("Veuillez remplir au moins les champs obligatoires (pays de départ, pays de destination, date, prix par kg).");
            return;
        }

        // [LIMITATION ANNONCES ACTIVES] — strict par type de profil
        try {
            const activeCheck = await window.CCCommon.api('/api/offers/check-limit?type=' + encodeURIComponent(selectedProfileTypeChoice || 'traveler'));
            if (activeCheck && !activeCheck.allowed) {
                alert(activeCheck.message || "Vous avez atteint la limite de publications d'annonces actives autorisées.");
                return;
            }
        } catch (e) {
            console.warn("Vérification limite échouée, poursuite...", e);
        }

        await proceedSubmitTrip();
    }

    // Anti-double-publication : un seul envoi a la fois (le bouton est deja desactive
    // pendant l'envoi, mais un second appel programme ne doit pas passer non plus).
    let publishing = false;

    async function proceedSubmitTrip() {
        if (publishing) {
            console.warn("Publication deja en cours — envoi ignore.");
            return;
        }
        publishing = true;
        const payload = getPayload();
        const tripDates = readAllTripDates();
        // Anti-doublon : meme annonce renvoyee coup sur coup (typiquement apres une
        // erreur reseau alors que l'envoi avait en fait abouti) -> on demande confirmation.
        const signature = [
            payload.departure, payload.destination, payload.cityDeparture,
            payload.cityDestination, payload.departureDate, payload.kilos, payload.price
        ].join("|");
        try {
            const last = JSON.parse(localStorage.getItem("cc_last_publish") || "null");
            if (last && last.sig === signature && (Date.now() - (last.at || 0)) < 180000) {
                const again = window.confirm(
                    "Vous venez de publier cette meme annonce il y a moins de 3 minutes.\n\nLa publier une deuxieme fois ?"
                );
                if (!again) {
                    publishing = false;
                    return;
                }
            }
        } catch (e) { /* stockage indisponible : on continue */ }

        const submitBtn = els.form?.querySelector("button[type='submit']");
        const initialText = submitBtn?.textContent || "Publier mon trajet";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Publication...";
        }

        try {
            const uniqueDates = Array.from(new Set(
                tripDates.map((s) => String(s || "").trim()).filter(Boolean)
            )).sort();
            const created = await window.CCCommon.api("/api/offers", {
                method: "POST",
                body: { ...payload, departureDate: uniqueDates[0], extraDates: uniqueDates.slice(1) }
            });

            if (selectedProfileTypeChoice) {
                try {
                    await window.CCCommon.api('/users/me/profile', {
                        method: 'PATCH',
                        body: { profileType: selectedProfileTypeChoice }
                    });
                    if (window.CCCommon.state?.user) {
                        window.CCCommon.state.user.profile_type = selectedProfileTypeChoice;
                    }
                } catch (e) {
                    console.warn("Profil non mis à jour:", e);
                }
            }

            els.form?.reset();
            clearExtraTripDates();
            localStorage.removeItem("cc_trip_draft");
            document.getElementById("draft-banner")?.classList.add("hidden");
            // Memorise la signature de cette publication (anti-doublon)
            try {
                localStorage.setItem("cc_last_publish", JSON.stringify({ sig: signature, at: Date.now() }));
            } catch (e) { /* stockage indisponible */ }
            paymentState.selectedMethod = null;
            paymentState.selectedMethodName = null;
            paymentState.accountNumber = null;
            if (els.paymentMethodLabel) els.paymentMethodLabel.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Choisir mon moyen de paiement`;
            document.querySelectorAll(".pm-label").forEach((l) => {
                if (l !== els.paymentMethodLabel) l.innerHTML = els.paymentMethodLabel.innerHTML;
            });
            showPublishSuccess(created?.destination || payload.destination, 1);
        } catch (error) {
            if (error?.status === 401) {
                window.CCCommon.requireAuth(() => proceedSubmitTrip());
                return;
            }
            alert("Erreur lors de la publication : " + (error.message || "Problème réseau."));
        } finally {
            publishing = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = initialText;
            }
        }
    }

    function showPublishSuccess(destName, offerCount) {
        const modal = document.getElementById("modal-publish-success");
        const backdrop = document.getElementById("modal-backdrop-success");
        const body = document.getElementById("success-modal-body");
        const closeBtn = document.getElementById("btn-success-close");

        const isPlural = offerCount > 1;
        const countText = isPlural ? `${offerCount} annonces créées` : `1 annonce créée`;
        const destText = destName ? ` pour <strong>${destName}</strong>` : "";

        if (body) {
            body.innerHTML = `
                <div class="success-icon-wrap">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 class="success-title">Félicitations !</h3>
                <p class="success-msg">Votre publication a été effectuée avec succès.<br>(${countText}${destText})</p>
                <p class="success-sub">Elle est désormais visible par tous les utilisateurs de ColisConnect.</p>
            `;
        }

        if (modal) modal.classList.remove("hidden");
        if (backdrop) backdrop.classList.remove("hidden");

        const handleClose = () => {
            if (modal) modal.classList.add("hidden");
            if (backdrop) backdrop.classList.add("hidden");
            window.location.href = "results.html";
        };

        if (closeBtn) {
            closeBtn.onclick = handleClose;
        }
        if (backdrop) {
            backdrop.onclick = handleClose;
        }
    }

    function bindModalEvents() {
        els.profileTypeModal = document.getElementById("modal-profile-type");
        els.choiceTraveler = document.getElementById("choice-traveler");
        els.choiceCargo = document.getElementById("choice-cargo");
        els.modalTransportMode = document.getElementById("modal-transport-mode");
        els.modalTransportBtns = document.querySelectorAll(".modal-transport-btn");
        els.confirmProfileTypeBtn = document.getElementById("btn-confirm-profile-type");
    }

    function bindEvents() {
        els.form = document.getElementById("trip-form");
        els.departure = document.getElementById("departure");
        els.destination = document.getElementById("destination");
        els.cityDeparture = document.getElementById("city-departure");
        els.cityDestination = document.getElementById("city-destination");
        els.dateDepart = document.getElementById("date-depart");
        els.addTripDateBtn = document.getElementById("btn-add-trip-date");
        els.tripExtraDates = document.getElementById("trip-extra-dates");
        els.tripExtraDatesWrap = document.getElementById("trip-extra-dates-wrap");
        els.kilos = document.getElementById("kilos");
        els.price = document.getElementById("price");
        els.priceCurrency = document.getElementById("price-currency");
        els.notes = document.getElementById("notes");

        els.currencyToggleBtn = document.getElementById("currency-toggle-btn");
        els.currencyDropdown = document.getElementById("currency-dropdown");
        els.currencyList = document.getElementById("currency-list");
        els.currencyBtnCode = document.getElementById("currency-btn-code");
        els.currencyBtnSymbol = document.getElementById("currency-btn-symbol");
        els.kiloPriceUnit = document.getElementById("kilo-price-unit");

        els.paymentMethodLabel = document.getElementById("selected-pm-label");
        els.pmDrawer = document.getElementById("pm-drawer");
        els.pmDrawerOverlay = document.getElementById("pm-drawer-overlay");
        els.pmDrawerClose = document.getElementById("pm-drawer-close");
        els.pmConfirmBtn = document.getElementById("btn-confirm-pm");
        els.pmAccountField = document.getElementById("pm-account-field");

        if (els.form) {
            els.form.addEventListener("submit", submitTrip);
        }

        els.currencyToggleBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            els.currencyDropdown?.classList.toggle("hidden");
        });

        document.addEventListener("click", (e) => {
            if (els.currencyDropdown && !els.currencyDropdown.contains(e.target) && !els.currencyToggleBtn?.contains(e.target)) {
                els.currencyDropdown.classList.add("hidden");
            }
        });

        els.currencyList?.addEventListener("click", (e) => {
            const btn = e.target.closest(".currency-opt-btn");
            if (btn) {
                const code = btn.dataset.code;
                const symbol = btn.dataset.symbol;
                selectCurrency(code, symbol);
            }
        });

        const openPmDrawer = () => {
            els.pmDrawer?.classList.remove("hidden");
            els.pmDrawerOverlay?.classList.remove("hidden");
            setTimeout(() => els.pmDrawer?.classList.add("active"), 10);
        };
        const closePmDrawer = () => {
            els.pmDrawer?.classList.remove("active");
            setTimeout(() => {
                els.pmDrawer?.classList.add("hidden");
                els.pmDrawerOverlay?.classList.add("hidden");
            }, 300);
        };

        els.paymentMethodLabel?.addEventListener("click", openPmDrawer);
        document.querySelectorAll(".pm-label").forEach((l) => {
            l.addEventListener("click", openPmDrawer);
        });
        els.pmDrawerClose?.addEventListener("click", closePmDrawer);
        els.pmDrawerOverlay?.addEventListener("click", closePmDrawer);

        document.querySelectorAll(".pm-option").forEach((opt) => {
            opt.addEventListener("click", () => {
                document.querySelectorAll(".pm-option").forEach((o) => o.classList.remove("selected"));
                opt.classList.add("selected");
                const method = opt.dataset.pm;

                const accGroup = document.getElementById("pm-account-group");
                const accLabel = document.getElementById("pm-account-label");

                if (method === "bank_transfer" || method === "wave" || method === "orange_money" || method === "mtn" || method === "moov") {
                    accGroup?.classList.remove("hidden");
                    if (accLabel) {
                        if (method === "bank_transfer") accLabel.textContent = "IBAN / Numéro de compte bancaire";
                        else accLabel.textContent = "Numéro de téléphone (" + opt.querySelector(".pm-opt-name")?.textContent + ")";
                    }
                } else {
                    accGroup?.classList.add("hidden");
                }
                if (els.pmConfirmBtn) els.pmConfirmBtn.disabled = false;
            });
        });

        els.pmConfirmBtn?.addEventListener("click", () => {
            const selectedOpt = document.querySelector(".pm-option.selected");
            if (!selectedOpt) return;

            const method = selectedOpt.dataset.pm;
            const name = selectedOpt.querySelector(".pm-opt-name")?.textContent || method;
            const accVal = els.pmAccountField?.value?.trim();

            paymentState.selectedMethod = method;
            paymentState.selectedMethodName = name;
            paymentState.accountNumber = accVal || null;

            let displayText = name;
            if (accVal) displayText += ` (${accVal})`;

            if (els.paymentMethodLabel) {
                els.paymentMethodLabel.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span style="color: #10B981; font-weight: 600;">${displayText}</span>
                `;
            }
            document.querySelectorAll(".pm-label").forEach((l) => {
                if (l !== els.paymentMethodLabel) l.innerHTML = els.paymentMethodLabel.innerHTML;
            });

            closePmDrawer();
        });

        els.departure?.addEventListener("change", updateCurrencySelector);
        els.departure?.addEventListener("input", updateCurrencySelector);
        els.destination?.addEventListener("change", updateCurrencySelector);
        els.destination?.addEventListener("input", updateCurrencySelector);

        updateCurrencySelector();

        document.getElementById("btn-traveler-choice")?.addEventListener("click", () => {
            selectedProfileTypeChoice = "traveler";
            document.getElementById("step1-errors")?.classList.add("hidden");
            document.getElementById("btn-traveler-choice").classList.add("selected");
            document.getElementById("btn-cargo-choice")?.classList.remove("selected");
            selectedTransportMode = null;

            document.getElementById("trip-extra-fields")?.classList.remove("hidden");
            document.getElementById("kilos-group")?.classList.remove("hidden");
            document.getElementById("transport-mode-section").style.display = "none";
            document.querySelectorAll(".transport-mode-btn").forEach(b => b.classList.remove("selected"));
            setExtraTripDatesVisible(false);
        });

        document.getElementById("btn-cargo-choice")?.addEventListener("click", () => {
            selectedProfileTypeChoice = "cargo";
            document.getElementById("step1-errors")?.classList.add("hidden");
            document.getElementById("btn-cargo-choice").classList.add("selected");
            document.getElementById("btn-traveler-choice")?.classList.remove("selected");

            document.getElementById("trip-extra-fields")?.classList.remove("hidden");
            document.getElementById("kilos-group")?.classList.add("hidden");
            document.getElementById("transport-mode-section").style.display = "block";
            setExtraTripDatesVisible(true);
        });

        els.addTripDateBtn?.addEventListener("click", addExtraTripDateRow);
        els.tripExtraDates?.addEventListener("click", (e) => {
            const del = e.target.closest(".colis-row-del");
            if (!del) return;
            const row = del.closest(".trip-extra-date-row");
            if (row) row.remove();
            updateExtraDatesAddBtn();
        });

        els.choiceCargo?.addEventListener("click", () => {
            selectedProfileTypeChoice = "cargo";
            els.choiceCargo.classList.add("selected");
            els.choiceTraveler?.classList.remove("selected");
            if (els.confirmProfileTypeBtn) els.confirmProfileTypeBtn.disabled = false;
            els.modalTransportMode?.classList.remove("hidden");
        });

        els.modalTransportBtns?.forEach(btn => {
            btn.addEventListener("click", () => {
                els.modalTransportBtns.forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedTransportMode = btn.dataset.mode;
            });
        });

        document.querySelectorAll(".transport-mode-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".transport-mode-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedTransportMode = btn.dataset.mode;
            });
        });

        els.confirmProfileTypeBtn?.addEventListener("click", async () => {
            if (!selectedProfileTypeChoice) return;
            els.profileTypeModal?.classList.add("hidden");
            await proceedSubmitTrip();
        });
    }

    function initWizard() {
        const form = document.getElementById("trip-form");
        if (!form) return;
        const steps = Array.from(form.querySelectorAll(".wizard-step"));
        const dots = Array.from(form.querySelectorAll(".wizard-progress .wp-step"));
        const total = steps.length;
        let current = 0;

        function showStep(idx) {
            if (idx < 0 || idx >= total) return;
            current = idx;
            steps.forEach((s, i) => s.classList.toggle("active", i === idx));
            dots.forEach((d, i) => {
                d.classList.toggle("active", i === idx);
                d.classList.toggle("done", i < idx);
            });
            const t = form.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + t.top - 80, behavior: "smooth" });
        }

        function markError(el) {
            if (!el) return;
            el.classList.add("input-error");
            setTimeout(() => el.classList.remove("input-error"), 1400);
        }

        function goNext() {
            if (current === 0) {
                const errBox1 = document.getElementById("step1-errors");
                if (errBox1) errBox1.classList.add("hidden");
                const req = ["departure", "destination", "date-depart"];
                for (const id of req) {
                    const el = document.getElementById(id);
                    if (el && !el.value.trim()) {
                        el.focus();
                        return;
                    }
                }
                if (!selectedProfileTypeChoice) {
                    if (errBox1) {
                        errBox1.innerHTML = "<div>• Veuillez choisir votre profil : Voyageur simple ou Entreprise / Cargo</div>";
                        errBox1.classList.remove("hidden");
                    }
                    ["btn-traveler-choice", "btn-cargo-choice"].forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) markError(btn);
                    });
                    const firstChoice = document.getElementById("btn-traveler-choice");
                    if (firstChoice) firstChoice.focus();
                    return;
                }

                if (selectedProfileTypeChoice === "cargo") {
                    const extraInputs = Array.from(document.querySelectorAll("#trip-extra-dates .trip-extra-date"));
                    if (extraInputs.length) {
                        const minDate = els.dateDepart?.min || "";
                        const seen = new Set();
                        const mainVal = String(els.dateDepart?.value || "").trim();
                        if (mainVal) seen.add(mainVal);
                        let invalidInput = null;
                        let invalidMsg = "";
                        for (const inp of extraInputs) {
                            const v = String(inp.value || "").trim();
                            if (!v) {
                                invalidInput = inp;
                                invalidMsg = "Remplissez ou supprimez la date ajoutée (ligne vide).";
                                break;
                            }
                            if (minDate && v < minDate) {
                                invalidInput = inp;
                                invalidMsg = "Les dates supplémentaires doivent être aujourd'hui ou plus tard.";
                                break;
                            }
                            if (seen.has(v)) {
                                invalidInput = inp;
                                invalidMsg = "Cette date est déjà saisie — choisissez une autre date.";
                                break;
                            }
                            seen.add(v);
                        }
                        if (invalidInput) {
                            if (errBox1) {
                                errBox1.innerHTML = "<div>• " + invalidMsg + "</div>";
                                errBox1.classList.remove("hidden");
                            }
                            markError(invalidInput);
                            invalidInput.focus();
                            return;
                        }
                    }
                }
            }

            if (current === 1) {
                const kilos = document.getElementById("kilos");
                const price = document.getElementById("price");
                const currency = document.getElementById("price-currency");
                const currencyBtn = document.getElementById("currency-toggle-btn");
                const kilosGroup = document.getElementById("kilos-group");
                const transportSection = document.getElementById("transport-mode-section");
                const errBox = document.getElementById("step2-errors");
                const k = parseFloat(kilos.value);
                const p = parseFloat(price.value);
                const c = (currency.value || "").trim();

                const kilosVisible = kilosGroup && !kilosGroup.classList.contains("hidden");
                const transportVisible = transportSection && transportSection.style.display !== "none";
                const kilosManque = kilosVisible && (isNaN(k) || k <= 0);
                const priceManque = isNaN(p) || p <= 0;
                const deviseManque = !c;
                const transportManque = transportVisible && !document.querySelector(".transport-mode-btn.selected");

                const manques = [];
                if (kilosManque) manques.push("Veuillez mettre le nombre de kilos");
                if (priceManque) manques.push("Veuillez mettre le prix par kilo");
                if (deviseManque) manques.push("Veuillez choisir la devise");
                if (transportManque) manques.push("Veuillez choisir le moyen de transport");

                if (manques.length) {
                    if (errBox) {
                        errBox.innerHTML = manques.map(m => "<div>• " + m + "</div>").join("");
                        errBox.classList.remove("hidden");
                    }
                    if (kilosManque) { markError(kilos); kilos.focus(); }
                    else if (priceManque) { markError(price); price.focus(); }
                    else if (deviseManque) { markError(currencyBtn); currencyBtn.focus(); }
                    else if (transportManque) {
                        const firstBtn = document.querySelector(".transport-mode-btn");
                        if (firstBtn) firstBtn.focus();
                    }
                    return;
                }
                if (errBox) errBox.classList.add("hidden");
            }
            showStep(current + 1);
        }

        function goPrev() {
            showStep(current - 1);
        }

        form.addEventListener("click", (e) => {
            if (e.target.closest(".wizard-next")) goNext();
            else if (e.target.closest(".wizard-prev")) goPrev();
        });

        const yesBtn = document.getElementById("special-yes");
        const noBtn = document.getElementById("special-no");
        const panel = document.getElementById("special-prices-panel");
        if (yesBtn && noBtn && panel) {
            yesBtn.addEventListener("click", () => {
                if (typeof window.ccEnsureSpecialRow === "function") window.ccEnsureSpecialRow();
                panel.classList.remove("hidden");
                yesBtn.classList.add("selected");
                noBtn.classList.remove("selected");
            });
            noBtn.addEventListener("click", () => {
                panel.classList.add("hidden");
                noBtn.classList.add("selected");
                yesBtn.classList.remove("selected");
            });
        }

        showStep(0);
    }

    async function bootstrap() {
        await window.CCCommon.init("post_trip");

        initCountryDatalist();
        initDateMin();
        initReveal();

        if (window.CCCommon.initLocationFields) {
            window.CCCommon.initLocationFields("#trip-form");
        }

        els.departure = document.getElementById("departure");
        els.destination = document.getElementById("destination");
        els.cityDeparture = document.getElementById("city-departure");
        els.cityDestination = document.getElementById("city-destination");

        // Restauration du brouillon si présent
        const saved = localStorage.getItem("cc_trip_draft");
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                if (els.departure) els.departure.value = draft.departure || "";
                if (els.destination) els.destination.value = draft.destination || "";
                if (els.dateDepart) els.dateDepart.value = draft.dateDepart || "";
                if (els.kilos) els.kilos.value = draft.kilos || "";
                if (els.price) els.price.value = draft.price || "";
                if (els.cityDeparture && draft.cityDeparture) els.cityDeparture.value = draft.cityDeparture;
                if (els.cityDestination && draft.cityDestination) els.cityDestination.value = draft.cityDestination;
                // Rend la restauration VISIBLE : sans ce bandeau, l'utilisateur voyait
                // l'etape 1 du wizard (vide en apparence) et republiait les memes
                // informations -> annonce publiee en double.
                if (draft.departure || draft.destination || draft.dateDepart || draft.kilos || draft.price) {
                    document.getElementById("draft-banner")?.classList.remove("hidden");
                }
            } catch (e) {
                console.error("Erreur restauration brouillon", e);
            }
        }

        // « Effacer » le brouillon : vide le formulaire et supprime la sauvegarde locale
        document.getElementById("draft-clear-btn")?.addEventListener("click", () => {
            localStorage.removeItem("cc_trip_draft");
            els.form?.reset();
            ["departure", "destination", "city-departure", "city-destination", "date-depart", "kilos", "price"]
                .forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
            document.getElementById("draft-banner")?.classList.add("hidden");
        });

        // Sauvegarde automatique du brouillon à la saisie
        const saveDraft = () => {
            const draftData = {
                departure: els.departure?.value || "",
                destination: els.destination?.value || "",
                cityDeparture: els.cityDeparture?.value || "",
                cityDestination: els.cityDestination?.value || "",
                dateDepart: els.dateDepart?.value || "",
                kilos: els.kilos?.value || "",
                price: els.price?.value || ""
            };
            localStorage.setItem("cc_trip_draft", JSON.stringify(draftData));
        };
        els.form?.addEventListener("input", saveDraft);
        els.form?.addEventListener("change", saveDraft);

        bindModalEvents();
        bindEvents();
        initWizard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
