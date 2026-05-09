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
        priceCurrency: document.getElementById("price-currency"),  // [MULTI-CURRENCY]
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
        phoneNumberInput: document.getElementById("pm-phone-number"),
        confirmBtn: document.getElementById("pm-confirm-btn"),
    };

    // ---- Payment method state ----
    const paymentState = {
        selectedMethod: null, // "mtn_cm" etc
        selectedMethodName: null,
        accountNumber: null
    };

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
        if (!els.priceCurrency) return;
        const dep = String(els.departure?.value || "").trim();
        const dst = String(els.destination?.value || "").trim();
        const depCur = COUNTRY_CURRENCIES[dep] || "EUR";
        const dstCur = COUNTRY_CURRENCIES[dst] || "EUR";
        // Construire les options (uniques)
        const options = [];
        options.push({ value: depCur, label: `${depCur} (pays de départ)` });
        if (dstCur !== depCur) options.push({ value: dstCur, label: `${dstCur} (pays d'arrivée)` });
        const current = els.priceCurrency.value;
        els.priceCurrency.innerHTML = options
            .map(o => `<option value="${o.value}"${o.value === current ? ' selected' : ''}>${o.label}</option>`)
            .join("");
    }

    function isValidCountry(value) {
        if (!value) return false;
        const target = normalizeCountry(value);
        return COUNTRY_OPTIONS.some((item) => normalizeCountry(item) === target);
    }

    function initCountryDatalist() {
        if (!els.countryList) return;
        els.countryList.innerHTML = COUNTRY_OPTIONS
            .map((country) => `<option value="${window.CCCommon.escapeHtml(country)}"></option>`)
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
        renderDynamicPaymentChoices();
        els.modal?.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        showStep("choose");
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

    async function renderDynamicPaymentChoices() {
        const country = normalizeCountry(els.departure?.value || "");
        if (!country) return;

        if (els.choicesContainer) {
            els.choicesContainer.innerHTML = '<div style="text-align: center; width: 100%; padding: 20px;"><span class="spinner"></span> Chargement des réseaux...</div>';
        }

        const data = await fetchAvailableMethods(country);
        const methods = data.methods || [];

        if (els.choicesContainer) {
            els.choicesContainer.className = "pm-choices-grid";

            if (methods.length === 0) {
                els.choicesContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Aucun réseau trouvé pour ce pays.</p>';
                return;
            }

            els.choicesContainer.innerHTML = methods.map(m => `
                <div class="pm-text-btn" data-id="${m.id}" data-name="${m.name}">
                    <span class="pm-btn-name">${m.name}</span>
                    <span class="pm-btn-arrow">→</span>
                </div>
            `).join("");

            const btns = els.choicesContainer.querySelectorAll('.pm-text-btn');
            btns.forEach(b => b.addEventListener('click', () => selectPaymentProvider(b.dataset.id, b.dataset.name)));
        }
    }

    function selectPaymentProvider(methodId, methodName) {
        paymentState.selectedMethod = methodId;
        paymentState.selectedMethodName = methodName;

        // Titre dynamique
        if (els.uploadTitle) {
            els.uploadTitle.textContent = `Numéro ${methodName}`;
        }

        // Reset phone field
        if (els.phoneNumberInput) els.phoneNumberInput.value = "";
        if (els.confirmBtn) els.confirmBtn.disabled = true;

        showStep("upload");
    }

    function confirmPaymentMethod() {
        paymentState.accountNumber = els.phoneNumberInput?.value || "";
        if (!paymentState.selectedMethod || !paymentState.accountNumber) return;

        // Store in hidden fields
        if (els.paymentMethodInput) els.paymentMethodInput.value = paymentState.selectedMethod;
        if (els.paymentQrInput) els.paymentQrInput.value = paymentState.accountNumber; // Reusing qr input for account number backwards compat

        if (els.paymentMethodLabel) {
            els.paymentMethodLabel.innerHTML = `<span style="margin-right:8px; font-size: 1.2rem;">💸</span> ${paymentState.selectedMethodName} · ${paymentState.accountNumber}`;
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
        els.phoneNumberInput?.addEventListener("input", (e) => {
            if (els.confirmBtn) els.confirmBtn.disabled = e.target.value.trim().length < 6;
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

        const payload = {
            title: `Trajet ${departureCountry} -> ${destinationCountry}`,
            origin: departureCountry,
            destination: destinationCountry,
            departureDate: String(els.dateDepart?.value || ""),
            availableKg: Number(els.kilos?.value || 0),
            pricePerKg: Number(els.price?.value || 0),
            baseCurrency: els.priceCurrency?.value || "EUR",  // [MULTI-CURRENCY]
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
