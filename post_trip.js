(() => {
    const COUNTRY_OPTIONS = window.CCCommon.COUNTRY_OPTIONS;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;


    const els = {
        form: document.getElementById("trip-form"),
        departure: document.getElementById("departure"),
        destination: document.getElementById("destination"),
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
        modal: document.getElementById("payment-method-modal"),
        closeBtn: document.getElementById("close-payment-modal-btn"),
        stepChoose: document.getElementById("pm-step-choose"),
        stepUpload: document.getElementById("pm-step-upload"),
        choicesContainer: document.getElementById("pm-choices-container"),
        backBtn: document.getElementById("pm-back-btn"),
        uploadTitle: document.getElementById("pm-upload-title"),
        indicatifInput: document.getElementById("pm-indicatif"),
        localNumberInput: document.getElementById("pm-local-number"),
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
        confirmProfileTypeBtn: document.getElementById("profile-type-confirm-btn")
    };

    // ---- Payment method state ----
    const paymentState = {
        selectedMethod: null, // "mtn_cm" etc
        selectedMethodName: null,
        accountNumber: null
    };

    let selectedProfileTypeChoice = null;

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
    function openModal() {
        if (!els.departure?.value) {
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
            els.indicatifInput.value = "+";
        }
        if (els.localNumberInput) {
            els.localNumberInput.disabled = false;
            els.localNumberInput.value = "";
        }

        setTimeout(() => els.indicatifInput?.focus(), 100);

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

        if (els.paymentMethodLabel) {
            const displayCode = els.indicatifInput?.value || "";
            const displayLocal = els.localNumberInput?.value || "";
            els.paymentMethodLabel.innerHTML = `📞 Contact : <strong>${displayCode}</strong> ${displayLocal}`;
        }
        closeModal();
    }

    function bindModalEvents() {
        els.openBtn?.addEventListener("click", openModal);
        els.closeBtn?.addEventListener("click", closeModal);
        els.modal?.addEventListener("click", (e) => {
            if (e.target === els.modal) closeModal();
        });
        els.backBtn?.addEventListener("click", () => showStep("choose"));

        // Protection de l'indicatif (Fixe '+')
        els.indicatifInput?.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && els.indicatifInput.selectionStart <= 1) e.preventDefault();
            if (e.key === "Delete" && els.indicatifInput.selectionStart < 1) e.preventDefault();
        });

        els.indicatifInput?.addEventListener("input", () => {
            if (!els.indicatifInput.value.startsWith("+")) {
                els.indicatifInput.value = "+" + els.indicatifInput.value.replace("+", "");
            }
        });

        // Validation combinée
        const updateVerifyButton = () => {
            const ind = els.indicatifInput?.value.trim() || "";
            const loc = els.localNumberInput?.value.trim() || "";
            if (els.verifySmsBtn) {
                // Indicatif (+X) + numéro local (>4)
                els.verifySmsBtn.disabled = (ind.length < 2 || loc.length < 5);
            }
        };

        els.indicatifInput?.addEventListener("input", updateVerifyButton);
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
                els.verifySmsBtn.style.color = "#13ecc8";
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
                els.otpSection.innerHTML = '<p style="color: #13ecc8; font-weight: 700; margin: 0;">✓ Jamais numéro vérifié avec succès</p>';
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

        const user = window.CCCommon.state?.user;
        if (user && (!user.profile_type || user.profile_type === 'client')) {
            els.profileTypeModal?.classList.remove("hidden");
            return;
        }

        await proceedSubmitTrip();
    }

    async function proceedSubmitTrip() {
        const departureCountry = String(els.departure?.value || "").trim();
        const destinationCountry = String(els.destination?.value || "").trim();

        const payload = {
            title: `Trajet ${departureCountry} -> ${destinationCountry}`,
            origin: departureCountry,
            destination: destinationCountry,
            departureDate: String(els.dateDepart?.value || ""),
            availableKg: Number(els.kilos?.value || 0),
            pricePerKg: Number(els.price?.value || 0),
            baseCurrency: els.priceCurrencyInput?.value || "EUR",  // [MULTI-CURRENCY]
            paymentMethod: paymentState.selectedMethod,
            paymentQr: paymentState.accountNumber, // Re-purpose paymentQr as accountNumber
            referralCode: String(document.getElementById("referral-code")?.value || "").trim()
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
            els.form?.reset();
            localStorage.removeItem("cc_trip_draft");
            paymentState.selectedMethod = null;
            paymentState.selectedMethodName = null;
            paymentState.accountNumber = null;
            if (els.paymentMethodLabel) els.paymentMethodLabel.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Choisir mon moyen de paiement`;
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
        els.choiceTraveler?.addEventListener("click", () => {
            selectedProfileTypeChoice = "traveler";
            els.choiceTraveler.classList.add("selected");
            els.choiceCargo?.classList.remove("selected");
            if (els.confirmProfileTypeBtn) els.confirmProfileTypeBtn.disabled = false;
        });

        els.choiceCargo?.addEventListener("click", () => {
            selectedProfileTypeChoice = "cargo";
            els.choiceCargo.classList.add("selected");
            els.choiceTraveler?.classList.remove("selected");
            if (els.confirmProfileTypeBtn) els.confirmProfileTypeBtn.disabled = false;
        });

        els.confirmProfileTypeBtn?.addEventListener("click", async () => {
            if (!selectedProfileTypeChoice) return;

            if (els.confirmProfileTypeBtn) {
                els.confirmProfileTypeBtn.disabled = true;
                els.confirmProfileTypeBtn.textContent = "Configuration...";
            }

            try {
                const response = await window.CCCommon.api('/users/me/profile', {
                    method: 'PATCH',
                    body: { profileType: selectedProfileTypeChoice }
                });

                if (response.success) {
                    if (window.CCCommon.state?.user) {
                        window.CCCommon.state.user.profile_type = selectedProfileTypeChoice;
                    }
                    els.profileTypeModal?.classList.add("hidden");
                    // Relancer la soumission
                    await proceedSubmitTrip();
                } else {
                    alert("Erreur lors de la configuration du profil.");
                }
            } catch (err) {
                alert(err.message || "Erreur lors de la configuration du profil. Veuillez réessayer.");
            } finally {
                if (els.confirmProfileTypeBtn) {
                    els.confirmProfileTypeBtn.disabled = false;
                    els.confirmProfileTypeBtn.textContent = "Confirmer mon choix";
                }
            }
        });
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
        bindModalEvents();
        bindEvents();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
