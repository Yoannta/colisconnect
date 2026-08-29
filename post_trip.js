(() => {
    const COUNTRY_OPTIONS = window.CCCommon.COUNTRY_OPTIONS;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;


    const els = {
        form: document.getElementById("trip-form"),
        departure: document.getElementById("departure"),
        destination: document.getElementById("destination"),
        cityDeparture: document.getElementById("city-departure"),
        cityDestination: document.getElementById("city-destination"),
        dateDepart: document.getElementById("date-depart"),
        kilos: document.getElementById("kilos"),
        price: document.getElementById("price"),
        priceCurrencyInput: document.getElementById("price-currency"),  // [MULTI-CURRENCY]
        currencyToggle: document.getElementById("currency-toggle-btn"),
        currencyPopover: document.getElementById("currency-popover"),
        currentCurrencyText: document.getElementById("current-currency-text"),
        paymentMethodInput: document.getElementById("payment-method"),
        paymentQrInput: document.getElementById("payment-qr"),
        paymentMethodLabel: document.getElementById("payment-method-label"),
        countryList: document.querySelector("datalist[data-country-list]"),
        animatedNodes: Array.from(document.querySelectorAll("[data-animate]")),
        // Modal
        openBtn: document.getElementById("open-payment-method-btn"),
        addContactBtn: document.getElementById("addContactBtn"),
        modal: document.getElementById("payment-method-modal"),
        closeBtn: document.getElementById("close-payment-modal-btn"),
        stepChoose: document.getElementById("pm-step-choose"),
        stepUpload: document.getElementById("pm-step-upload"),
        choicesContainer: document.getElementById("pm-choices-container"),
        backBtn: document.getElementById("pm-back-btn"),
        uploadTitle: document.getElementById("pm-upload-title"),
        indicatifInput: document.getElementById("phonePrefix"),
        localNumberInput: document.getElementById("phoneMainNumber"),
        confirmBtn: document.getElementById("pm-confirm-btn"),
        // SMS Verification
        verifySmsBtn: document.getElementById("pm-verify-sms-btn"),
        otpSection: document.getElementById("pm-otp-section"),
        otpInput: document.getElementById("pm-otp-code"),
        confirmOtpBtn: document.getElementById("pm-confirm-otp-btn"),
        // Currency Custom
        currencyToggle: document.getElementById("currency-toggle-btn"),
        currencyPopover: document.getElementById("currency-popover"),
        currentCurrencyText: document.getElementById("current-currency-text"),
        priceCurrencyInput: document.getElementById("price-currency"),
        // profile_type modal
        profileTypeModal: document.getElementById("profile-type-modal"),
        choiceTraveler: document.getElementById("profile-choice-traveler"),
        choiceCargo: document.getElementById("profile-choice-cargo"),
        confirmProfileTypeBtn: document.getElementById("profile-type-confirm-btn"),
        // Transport mode (dans la modale)
        modalTransportMode: document.getElementById("modal-transport-mode"),
        modalTransportBtns: document.querySelectorAll(".modal-transport-btn"),
    };

    // ---- Payment method state ----
    const paymentState = {
        selectedMethod: null, // "mtn_cm" etc
        selectedMethodName: null,
        accountNumber: null
    };

    let selectedProfileTypeChoice = null;
    let selectedTransportMode = null;
    // Bouton qui a ouvert la modale paiement ("Mon numero de contact" ou "Autre numero")
    let paymentTrigger = null;

    // Ne fait plus rien immédiatement — le profil est mis à jour APRÈS publication
    async function updateProfileType(type) {
        // Inutilisé : la mise à jour se fait dans proceedSubmitTrip()
    }

    // Initialisation dynamique des réseaux via API
    async function fetchAvailableMethods(country) {
        try {
            const data = await window.CCCommon.api(`/api/payments/methods?country=${encodeURIComponent(country)}`);
            return data;
        } catch (err) {
            console.error("Erreur découverte réseaux:", err);
            return { status: "fallback", methods: [{ id: "bank", name: "Virement" }] };
        }
    }

    // ---- Logos SVG ---- (Optionnel mais pour le Wow Effect)
    const LOGOS = {
        mtn: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FFCC00"/><path d="M25 40 L35 70 L45 40 L55 70 L65 40" stroke="#003366" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
        orange: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FF6600"/><path d="M30 30 L70 30 L70 70 L30 70 Z" fill="white"/></svg>`,
        wave: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#1CD4FF"/><circle cx="50" cy="45" r="15" fill="white"/><path d="M35 70 Q50 60 65 70" stroke="white" stroke-width="5" fill="none"/></svg>`,
        moov: `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#0055A4"/><path d="M30 40 Q50 20 70 40 Q50 60 30 40" fill="white"/></svg>`,
        bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M12 10v11M12 3l9 7H3l9-7z"/></svg>`
    };

    // ---- Country Datalist ----
    function normalizeCountry(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    // [MULTI-CURRENCY] Met à jour le sélecteur de monnaie selon les pays choisis
    function updateCurrencySelector() {
        if (!els.priceCurrencyInput) return;
        const dep = String(els.departure?.value || "").trim();
        const dst = String(els.destination?.value || "").trim();
        const depCur = COUNTRY_CURRENCIES[dep] || "EUR";
        const dstCur = COUNTRY_CURRENCIES[dst] || "EUR";

        const options = [];
        options.push({ value: depCur, label: `Pays de départ` });
        if (dstCur !== depCur) options.push({ value: dstCur, label: `Pays d'arrivée` });

        if (els.currencyPopover) {
            els.currencyPopover.innerHTML = options.map(o => `
                <div class="currency-opt" data-value="${o.value}">
                    <span class="currency-opt-name">${o.value}</span>
                    <span class="currency-opt-code">${o.label}</span>
                </div>
            `).join("");

            els.currencyPopover.querySelectorAll(".currency-opt").forEach(opt => {
                opt.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const val = opt.dataset.value;
                    if (els.priceCurrencyInput) els.priceCurrencyInput.value = val;
                    if (els.currentCurrencyText) els.currentCurrencyText.textContent = val;
                    els.currencyPopover.classList.add("hidden");
                });
            });
        }

        // Vérifier si la sélection actuelle est toujours valide
        const current = els.priceCurrencyInput.value;
        const isStillValid = options.some(o => o.value === current);

        if (!isStillValid) {
            // On ne force pas le premier si rien n'est sélectionné au départ pour garder "Devise"
            if (current !== "" && options.length > 0) {
                els.priceCurrencyInput.value = options[0].value;
                if (els.currentCurrencyText) els.currentCurrencyText.textContent = options[0].value;
            }
        }
    }

    function isValidCountry(value) {
        if (!value) return false;
        const target = normalizeCountry(value);
        return COUNTRY_OPTIONS.some((item) => normalizeCountry(item) === target);
    }

    function initCountryDatalist() {
        if (!els.countryList) return;
        // Correction: ne PAS échapper HTML les valeurs des options, sinon 
        // les apostrophes deviennent des &#39; et cassent la recherche intelligente du navigateur.
        els.countryList.innerHTML = COUNTRY_OPTIONS
            .map((country) => `<option value="${country}"></option>`)
            .join("\n");
    }

    function initDateMin() {
        if (!els.dateDepart) return;
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        els.dateDepart.min = `${yyyy}-${mm}-${dd}`;
    }

    function initReveal() {
        if (!els.animatedNodes.length) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            for (const node of els.animatedNodes) node.classList.add("is-visible");
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.15 });
        for (const node of els.animatedNodes) observer.observe(node);
    }

    // ---- Payment Modal logic ----
    function _getDeparture() { return document.getElementById("departure"); }
    function _getDestination() { return document.getElementById("destination"); }

    function openModal() {
        const dep = _getDeparture();
        if (!dep?.value) {
            alert("Veuillez d'abord choisir un pays de départ.");
            return;
        }
        els.modal?.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        // Aller directement à la saisie du numéro
        selectPaymentProvider("direct_contact", "Contact Direct");
    }

    function closeModal() {
        els.modal?.classList.add("hidden");
        document.body.style.overflow = "";
    }

    function showStep(step) {
        if (step === "choose") {
            els.stepChoose?.classList.remove("hidden");
            els.stepUpload?.classList.add("hidden");
        } else {
            els.stepChoose?.classList.add("hidden");
            els.stepUpload?.classList.remove("hidden");
        }
    }

    // Plus besoin de charger les réseaux, on va directement au numéro
    async function renderDynamicPaymentChoices() {
        return;
    }

    function selectPaymentProvider(methodId, methodName) {
        paymentState.selectedMethod = methodId;
        paymentState.selectedMethodName = methodName;
        paymentState.isVerified = false; // Reset verification state

        // Titre dynamique
        if (els.uploadTitle) {
            els.uploadTitle.textContent = "Votre numéro de contact";
        }

        // Reset and show initial step
        if (els.otpSection) els.otpSection.classList.add("hidden");

        if (els.indicatifInput) {
            els.indicatifInput.disabled = false;
            els.indicatifInput.selectedIndex = 0;
        }
        if (els.localNumberInput) {
            els.localNumberInput.disabled = false;
            els.localNumberInput.value = "";
        }

        setTimeout(() => els.localNumberInput?.focus(), 100);

        if (els.confirmBtn) {
            els.confirmBtn.disabled = true;
        }

        showStep("upload");
    }

    function confirmPaymentMethod() {
        const fullNumber = `${els.indicatifInput?.value || ""}${els.localNumberInput?.value || ""}`;
        paymentState.accountNumber = fullNumber;
        if (!paymentState.selectedMethod || !paymentState.accountNumber) return;

        // Store in hidden fields
        if (els.paymentMethodInput) els.paymentMethodInput.value = paymentState.selectedMethod;
        if (els.paymentQrInput) els.paymentQrInput.value = paymentState.accountNumber;

        // Met à jour le label du bouton qui a ouvert la modale (1er ou 2e)
        const labelEl = paymentTrigger
            ? paymentTrigger.querySelector(".pm-label")
            : els.paymentMethodLabel;
        if (labelEl) {
            const displayCode = els.indicatifInput?.value || "";
            const displayLocal = els.localNumberInput?.value || "";
            labelEl.innerHTML = `📞 Contact : <strong>${displayCode}</strong> ${displayLocal}`;
        }
        closeModal();
    }

    function bindModalEvents() {
        // Délégation : chaque ligne de contact (fixe ou ajoutée) ouvre la modale ;
        // le ✕ d'une ligne AJOUTÉE la supprime
        const rowsBox = document.getElementById("payment-contact-rows");
        if (rowsBox) {
            rowsBox.addEventListener("click", (e) => {
                const del = e.target.closest(".contact-row-del");
                if (del) {
                    const row = del.closest(".payment-contact-row");
                    if (row && !row.querySelector("#open-payment-method-btn")) row.remove();
                    return;
                }
                const btn = e.target.closest(".contact-row-btn");
                if (btn) {
                    paymentTrigger = btn;
                    openModal();
                }
            });
        }
        // Bouton dynamique "+ Autre numéro" : crée une nouvelle ligne de contact
        els.addContactBtn?.addEventListener("click", () => {
            if (!rowsBox) return;
            const row = document.createElement("div");
            row.className = "payment-contact-row";
            row.innerHTML = `
                <button type="button" class="btn secondary payment-method-btn contact-row-btn">
                    <span class="pm-label">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        <span>Mon numero de contact</span>
                    </span>
                </button>
                <button type="button" class="colis-row-del contact-row-del" aria-label="Supprimer cette ligne" title="Supprimer cette ligne">✕</button>`;
            rowsBox.appendChild(row);
        });
        els.closeBtn?.addEventListener("click", closeModal);
        els.modal?.addEventListener("click", (e) => {
            if (e.target === els.modal) closeModal();
        });
        els.backBtn?.addEventListener("click", () => showStep("choose"));

        // Validation combinée : sélection indicatif + numéro local
        const updateVerifyButton = () => {
            const ind = els.indicatifInput?.value || "";
            const loc = els.localNumberInput?.value.trim() || "";
            if (els.verifySmsBtn) {
                els.verifySmsBtn.disabled = !ind || loc.length < 5;
            }
        };

        els.indicatifInput?.addEventListener("change", updateVerifyButton);
        els.localNumberInput?.addEventListener("input", (e) => {
            updateVerifyButton();
            // Si on change après avoir vérifié, on réinitialise
            if (paymentState.isVerified) {
                paymentState.isVerified = false;
                els.otpSection?.classList.add("hidden");
                if (els.confirmBtn) els.confirmBtn.disabled = true;
            }
        });

        // Click "Vérifier" (SMS)
        els.verifySmsBtn?.addEventListener("click", async () => {
            const fullPhone = `${els.indicatifInput.value.trim()}${els.localNumberInput.value.trim()}`;
            els.verifySmsBtn.disabled = true;
            els.verifySmsBtn.innerHTML = '<span class="spinner-sm"></span>';

            // Simulation envoi SMS
            setTimeout(() => {
                els.verifySmsBtn.innerHTML = "Envoyé ✓";
                els.verifySmsBtn.style.color = "#ffb347";
                els.otpSection?.classList.remove("hidden");

                els.indicatifInput.disabled = true;
                els.localNumberInput.disabled = true;

                els.otpInput.focus();
                alert(`SIMULATION : Code SMS envoyé au ${fullPhone}\nCode : 123456`);
            }, 1200);
        });

        // Click "Valider" (OTP)
        els.confirmOtpBtn?.addEventListener("click", () => {
            const code = els.otpInput.value.trim();
            if (code === "123456") {
                paymentState.isVerified = true;
                els.otpSection.innerHTML = '<p style="color: #ffb347; font-weight: 700; margin: 0;">✓ Jamais numéro vérifié avec succès</p>';
                if (els.confirmBtn) els.confirmBtn.disabled = false;
            } else {
                alert("Code invalide. Réessayez avec 123456.");
            }
        });

        // Empêcher de placer le curseur avant le '+' au clic
        els.phoneNumberInput?.addEventListener("click", () => {
            const prefix = "+";
            const start = els.phoneNumberInput.selectionStart;
            if (start < prefix.length) {
                const len = prefix.length;
                els.phoneNumberInput.setSelectionRange(len, len);
            }
        });

        els.confirmBtn?.addEventListener("click", confirmPaymentMethod);
    }

    // ---- Submit trip ----
    async function submitTrip(event) {
        event.preventDefault();

        if (!window.CCCommon.requireCompletedProfile("post_trip.html")) return;

        const departureCountry = String(els.departure?.value || "").trim();
        const destinationCountry = String(els.destination?.value || "").trim();

        if (!isValidCountry(departureCountry) || !isValidCountry(destinationCountry)) {
            alert("Choisissez le pays de depart et d'arrivee depuis la liste.");
            return;
        }

        if (normalizeCountry(departureCountry) === normalizeCountry(destinationCountry)) {
            alert("Le pays de depart et d'arrivee ne peuvent pas etre identiques.");
            return;
        }

        if (!paymentState.selectedMethod || !paymentState.accountNumber) {
            alert("Veuillez choisir un moyen de paiement et fournir votre numéro de compte.");
            openModal();
            return;
        }

        // Si l'utilisateur n'a pas cliqué sur un bouton, on regarde son profil existant
        if (!selectedProfileTypeChoice) {
            const currentProfile = window.CCCommon.state?.user?.profile_type;
            if (currentProfile === "traveler" || currentProfile === "cargo") {
                selectedProfileTypeChoice = currentProfile;
            } else {
                alert("Veuillez d'abord choisir votre type de profil (Voyageur simple ou Entreprise cargo).");
                return;
            }
        }

        // Soumettre directement (les champs sont visibles)
        await proceedSubmitTrip();
    }

    async function proceedSubmitTrip() {
        const departureCountry = String(els.departure?.value || "").trim();
        const destinationCountry = String(els.destination?.value || "").trim();

        // Verifier la limite de publication par type (mode="" pour voyageur, mode!=="" pour cargo)
        const isCargo = selectedProfileTypeChoice === "cargo";
        try {
            const myOffers = await window.CCCommon.api("/api/offers?scope=mine&pageSize=20");
            const activeOffers = (myOffers?.items || []).filter(o => String(o.status || "").toLowerCase() === "active");
            // Filtrer par mode : voyageur = mode vide, cargo = mode non vide
            const offersOfType = activeOffers.filter(o => {
                const m = String(o.mode || "").trim();
                return isCargo ? m !== "" : m === "";
            });
            const activeCount = offersOfType.length;
            const limit = isCargo ? 5 : 1;

            if (activeCount >= limit) {
                const label = isCargo ? "entreprise cargo" : "voyageur simple";
                alert(`Limite de trajet depassee : En tant que ${label}, vous ne pouvez publier que ${limit} trajet${limit > 1 ? 's' : ''} actif${limit > 1 ? 's' : ''} à la fois.`);
                return;
            }
        } catch (e) {
            console.warn("Impossible de verifier le nombre d'offres actives.", e);
        }

        const isCargoMode = selectedProfileTypeChoice === "cargo";
        const availableKg = isCargoMode ? 99999 : Number(els.kilos?.value || 0);
        const pricePerKg = Number(els.price?.value || 0);

        // Validation : si cargo, le mode de transport est requis
        if (isCargoMode && !selectedTransportMode) {
            alert("Veuillez choisir un mode de transport (Avion, Bateau ou Les deux).");
            return;
        }

        if (!isCargoMode && availableKg < 1) {
            alert("Veuillez saisir les kilos disponibles.");
            return;
        }
        if (pricePerKg < 1) {
            alert("Veuillez saisir un prix par kilo valide.");
            return;
        }

        const payload = {
            title: `Trajet ${departureCountry} -> ${destinationCountry}`,
            origin: departureCountry,
            destination: destinationCountry,
            departureDate: String(els.dateDepart?.value || ""),
            availableKg: availableKg,
            pricePerKg: pricePerKg,
            baseCurrency: els.priceCurrencyInput?.value || (window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : "EUR"),  // [MULTI-CURRENCY]
            paymentMethod: paymentState.selectedMethod,
            paymentQr: paymentState.accountNumber, // Re-purpose paymentQr as accountNumber
            mode: isCargoMode ? (selectedTransportMode || "") : "",
            colis_types: window.colisSelections ? window.colisSelections.join(", ") : "",
            refused_colis_types: window.refusedSelections ? window.refusedSelections.join(", ") : ""
        };

        const submitBtn = els.form?.querySelector("button[type='submit']");
        const initialText = submitBtn?.textContent || "Publier mon trajet";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Publication...";
        }

        try {
            const created = await window.CCCommon.api("/api/offers", { method: "POST", body: payload });
            alert(`Offre publiee vers ${created?.destination || payload.destination}.`);

            // Mise à jour du profil APRÈS publication réussie
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
            localStorage.removeItem("cc_trip_draft");
            paymentState.selectedMethod = null;
            paymentState.selectedMethodName = null;
            paymentState.accountNumber = null;
            if (els.paymentMethodLabel) els.paymentMethodLabel.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Choisir mon moyen de paiement`;
            document.querySelectorAll(".pm-label").forEach((l) => {
                if (l !== els.paymentMethodLabel) l.innerHTML = els.paymentMethodLabel.innerHTML;
            });
            window.location.href = "results.html";
        } catch (error) {
            if (error?.status === 401) {
                window.CCCommon.openAuthGate("post_trip.html");
                return;
            }
            if (error?.code === "PROFILE_COMPLETION_REQUIRED" || error?.status === 403) {
                window.CCCommon.openProfileCompletionGate("post_trip.html");
                return;
            }
            alert(error.message || "Erreur publication.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = initialText;
            }
        }
    }

    function bindEvents() {
        // [CURRENCY-POPOVER] Gestion de la bulle
        els.currencyToggle?.addEventListener("click", (e) => {
            e.stopPropagation();
            els.currencyPopover?.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
            els.currencyPopover?.classList.add("hidden");
        });

        // ===== POPUP TYPES DE COLIS =====
        const colisOverlay = document.getElementById("colisPopupOverlay");
        const colisGrid = document.getElementById("colisOptionsGrid");
        const colisText = document.getElementById("selectedColisText");
        const validateColisBtn = document.getElementById("validateColisBtn");
        const toggleCustomBtn = document.getElementById("toggleCustomColisBtn");
        const customGroup = document.getElementById("customColisGroup");
        const newTypeInput = document.getElementById("newColisTypeInput");
        const saveCustomBtn = document.getElementById("saveCustomColisBtn");
        let colisSelections = [];
        window.colisSelections = colisSelections; // expose for payload

        document.getElementById("openColisPopupBtn")?.addEventListener("click", () => {
            if (colisOverlay) colisOverlay.style.display = "flex";
        });

        colisGrid?.addEventListener("click", (e) => {
            const card = e.target.closest(".option-card");
            if (!card) return;
            const value = card.getAttribute("data-value");
            card.classList.toggle("selected");
            if (card.classList.contains("selected")) {
                colisSelections.push(value);
            } else {
                colisSelections = colisSelections.filter(item => item !== value);
            }
        });

        toggleCustomBtn?.addEventListener("click", () => {
            if (customGroup) {
                customGroup.style.display = customGroup.style.display === "flex" ? "none" : "flex";
                newTypeInput?.focus();
            }
        });

        saveCustomBtn?.addEventListener("click", () => {
            const val = newTypeInput?.value?.trim();
            if (!val) return;
            const newCard = document.createElement("div");
            newCard.className = "option-card selected";
            newCard.setAttribute("data-value", val);
            newCard.innerHTML = `<span class="option-circle"></span><span class="option-text">${val}</span>`;
            colisGrid?.appendChild(newCard);
            colisSelections.push(val);
            if (newTypeInput) newTypeInput.value = "";
            if (customGroup) customGroup.style.display = "none";
        });

        validateColisBtn?.addEventListener("click", () => {
            if (colisOverlay) colisOverlay.style.display = "none";
            if (colisText) {
                colisText.textContent = colisSelections.length > 0 ? colisSelections.join(", ") : "Choisir les types de colis";
            }
        });

        colisOverlay?.addEventListener("click", (e) => {
            if (e.target === colisOverlay) colisOverlay.style.display = "none";
        });

        // ===== POPUP TYPES DE COLIS REFUSÉS =====
        const refusedOverlay = document.getElementById("refusedPopupOverlay");
        const refusedGrid = document.getElementById("refusedOptionsGrid");
        const refusedText = document.getElementById("selectedRefusedText");
        const validateRefusedBtn = document.getElementById("validateRefusedBtn");
        const toggleRefusedBtn = document.getElementById("toggleCustomRefusedBtn");
        const refusedGroup = document.getElementById("customRefusedGroup");
        const newRefusedInput = document.getElementById("newRefusedTypeInput");
        const saveRefusedBtn = document.getElementById("saveCustomRefusedBtn");
        let refusedSelections = [];
        window.refusedSelections = refusedSelections;

        document.getElementById("openRefusedColisBtn")?.addEventListener("click", () => {
            if (refusedOverlay) refusedOverlay.style.display = "flex";
        });

        refusedGrid?.addEventListener("click", (e) => {
            const card = e.target.closest(".option-card");
            if (!card) return;
            const value = card.getAttribute("data-value");
            card.classList.toggle("selected");
            if (card.classList.contains("selected")) {
                refusedSelections.push(value);
            } else {
                refusedSelections = refusedSelections.filter(item => item !== value);
            }
        });

        toggleRefusedBtn?.addEventListener("click", () => {
            if (refusedGroup) {
                refusedGroup.style.display = refusedGroup.style.display === "flex" ? "none" : "flex";
                newRefusedInput?.focus();
            }
        });

        saveRefusedBtn?.addEventListener("click", () => {
            const val = newRefusedInput?.value?.trim();
            if (!val) return;
            const newCard = document.createElement("div");
            newCard.className = "option-card selected";
            newCard.setAttribute("data-value", val);
            newCard.innerHTML = `<span class="option-circle"></span><span class="option-text">${val}</span>`;
            refusedGrid?.appendChild(newCard);
            refusedSelections.push(val);
            if (newRefusedInput) newRefusedInput.value = "";
            if (refusedGroup) refusedGroup.style.display = "none";
        });

        validateRefusedBtn?.addEventListener("click", () => {
            if (refusedOverlay) refusedOverlay.style.display = "none";
            if (refusedText) {
                refusedText.textContent = refusedSelections.length > 0 ? refusedSelections.join(", ") : "Choisir les types refusés";
            }
        });

        refusedOverlay?.addEventListener("click", (e) => {
            if (e.target === refusedOverlay) refusedOverlay.style.display = "none";
        });

        els.form?.addEventListener("submit", (event) => {
            submitTrip(event).catch((error) => {
                alert(error.message || "Erreur publication.");
            });
        });
        // [MULTI-CURRENCY] Mise à jour du sélecteur de monnaie à chaque changement de pays
        els.departure?.addEventListener("change", updateCurrencySelector);
        els.departure?.addEventListener("input", updateCurrencySelector);
        els.destination?.addEventListener("change", updateCurrencySelector);
        els.destination?.addEventListener("input", updateCurrencySelector);

        // Initial load of currency options
        updateCurrencySelector();

        // Choix du type de profil
        document.getElementById("btn-traveler-choice")?.addEventListener("click", () => {
            selectedProfileTypeChoice = "traveler";
            document.getElementById("btn-traveler-choice").classList.add("selected");
            document.getElementById("btn-cargo-choice")?.classList.remove("selected");
            selectedTransportMode = null;

            document.getElementById("trip-extra-fields")?.classList.remove("hidden");
            document.getElementById("kilos-group")?.classList.remove("hidden");
            document.getElementById("transport-mode-section").style.display = "none";
            document.querySelectorAll(".transport-mode-btn").forEach(b => b.classList.remove("selected"));
        });

        document.getElementById("btn-cargo-choice")?.addEventListener("click", () => {
            selectedProfileTypeChoice = "cargo";
            document.getElementById("btn-cargo-choice").classList.add("selected");
            document.getElementById("btn-traveler-choice")?.classList.remove("selected");

            document.getElementById("trip-extra-fields")?.classList.remove("hidden");
            document.getElementById("kilos-group")?.classList.add("hidden");
            document.getElementById("transport-mode-section").style.display = "block";
        });

        els.choiceCargo?.addEventListener("click", () => {
            selectedProfileTypeChoice = "cargo";
            els.choiceCargo.classList.add("selected");
            els.choiceTraveler?.classList.remove("selected");
            if (els.confirmProfileTypeBtn) els.confirmProfileTypeBtn.disabled = false;
            // Afficher le choix transport si on choisit cargo
            els.modalTransportMode?.classList.remove("hidden");
        });

        // Sélection du mode de transport (dans la modale)
        els.modalTransportBtns?.forEach(btn => {
            btn.addEventListener("click", () => {
                els.modalTransportBtns.forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedTransportMode = btn.dataset.mode;
            });
        });

        // Sélection du mode de transport (inline dans le formulaire)
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
            // Plus de mise à jour immédiate du profil — se fait après publication
            await proceedSubmitTrip();
        });
    }

    // ═══════════ Wizard multi-étapes (4 pages + progression) ═══════════
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
            // Remonte au début du formulaire (sous le header sticky)
            const t = form.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + t.top - 80, behavior: "smooth" });
        }

        function markError(el) {
            if (!el) return;
            el.classList.add("input-error");
            setTimeout(() => el.classList.remove("input-error"), 1400);
        }

        function goNext() {
            // Validation minimale — étape 1 : pays de départ/arrivée + date requis
            if (current === 0) {
                const req = ["departure", "destination", "date-depart"];
                for (const id of req) {
                    const el = document.getElementById(id);
                    if (el && !el.value.trim()) {
                        el.focus();
                        return;
                    }
                }
            }
            // Étape 2 : kilos + prix + devise OBLIGATOIRES (Yoyo 2026-08)
            if (current === 1) {
                const kilos = document.getElementById("kilos");
                const price = document.getElementById("price");
                const currency = document.getElementById("price-currency");
                const k = parseFloat(kilos.value);
                const p = parseFloat(price.value);
                const c = (currency.value || "").trim();
                if (isNaN(k) || k <= 0) {
                    markError(kilos);
                    kilos.focus();
                    return;
                }
                if (isNaN(p) || p <= 0) {
                    markError(price);
                    price.focus();
                    return;
                }
                if (!c) {
                    markError(document.getElementById("currency-toggle-btn"));
                    return;
                }
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

        // Étape 3 — question « prix spéciaux ? » : Oui → panneau, Non → masqué
        const yesBtn = document.getElementById("special-yes");
        const noBtn = document.getElementById("special-no");
        const panel = document.getElementById("special-prices-panel");
        if (yesBtn && noBtn && panel) {
            yesBtn.addEventListener("click", () => {
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
                // On garde le brouillon jusqu'à la publication réussie ou suppression manuelle
                // localStorage.removeItem("cc_trip_draft"); // Optionnel : on peut le laisser si on veut
                // localStorage.removeItem("cc_trip_draft"); // Optionnel : on peut le laisser si on veut
            } catch (e) {
                console.error("Erreur restauration brouillon", e);
            }
        }

        initCountryDatalist();
        initDateMin();
        initReveal();
        // Génère les champs pays+ville depuis les conteneurs .location-group
        if (window.CCCommon.initLocationFields) {
            window.CCCommon.initLocationFields("#trip-form");
        }
        // Réassigner les références car les champs sont créés dynamiquement
        els.departure = document.getElementById("departure");
        els.destination = document.getElementById("destination");
        bindModalEvents();
        bindEvents();
        initWizard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
