(() => {
    const COUNTRY_OPTIONS = window.CCCommon.COUNTRY_OPTIONS;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;
    // [MULTI-CURRENCY] Acronyme local affiche a l'utilisateur ("FCFA" et non "XOF")
    const ccSym = (code) => (window.CCCommon && window.CCCommon.currencySymbol ? window.CCCommon.currencySymbol(code) : code);


    const els = {
        form: document.getElementById("trip-form"),
        departure: document.getElementById("departure"),
        destination: document.getElementById("destination"),
        cityDeparture: document.getElementById("city-departure"),
        cityDestination: document.getElementById("city-destination"),
        dateDepart: document.getElementById("date-depart"),
        addTripDateBtn: document.getElementById("addTripDateBtn"),
        tripExtraDatesWrap: document.getElementById("trip-extra-dates-wrap"),
        tripExtraDates: document.getElementById("trip-extra-dates"),
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
        // Popup succès publication
        publishModal: document.getElementById("publish-success-modal"),
        publishOkBtn: document.getElementById("publish-success-ok-btn"),
        publishMsg: document.getElementById("publish-success-msg"),
        // Note "deja valide / code demande" (mode modification)
        contactNote: document.getElementById("pm-contact-note"),
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
        accountNumber: null,
        // Mode modification : contact deja enregistre sur l'annonce (deja valide a
        // la creation) -> reaffiche sans redemander de code tant qu'il ne change pas.
        storedContact: null,
        storedMethod: null
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
                    <span class="currency-opt-name">${ccSym(o.value)}</span>
                    <span class="currency-opt-code">${o.label}</span>
                </div>
            `).join("");

            els.currencyPopover.querySelectorAll(".currency-opt").forEach(opt => {
                opt.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const val = opt.dataset.value;
                    if (els.priceCurrencyInput) els.priceCurrencyInput.value = val;
                    if (els.currentCurrencyText) els.currentCurrencyText.textContent = ccSym(val);
                    els.currencyPopover.classList.add("hidden");
                    // Les badges "prix special" affichent la devise : on les rafraichit
                    if (window.ccRefreshUniteLabel) {
                        document.querySelectorAll(".colis-detail-row").forEach(function (r) { window.ccRefreshUniteLabel(r); });
                    }
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
                if (els.currentCurrencyText) els.currentCurrencyText.textContent = ccSym(options[0].value);
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

    // ---- [ENTREPRISE / CARGO] Plusieurs dates pour le même trajet ----
    function clearExtraTripDates() {
        if (els.tripExtraDates) els.tripExtraDates.innerHTML = "";
    }

    // [CARGO] Au plus 2 dates supplémentaires par trajet (bouton désactivé au-delà)
    const MAX_EXTRA_DATES = 2;

    function updateExtraDatesAddBtn() {
        const btn = els.addTripDateBtn;
        if (!btn) return;
        const count = els.tripExtraDates?.querySelectorAll(".trip-extra-date-row").length || 0;
        btn.disabled = count >= MAX_EXTRA_DATES;
    }

    function setExtraTripDatesVisible(visible) {
        if (els.tripExtraDatesWrap) els.tripExtraDatesWrap.classList.toggle("hidden", !visible);
        if (!visible) clearExtraTripDates();
        if (visible) updateExtraDatesAddBtn();
    }

    // Affichage du type d'annonce (voyageur simple / cargo) : bouton surligne + champs
    // coherents. Source unique : utilisee par le clic utilisateur ET par la modification
    // d'une annonce existante (avant, le type n'etait pas re-selectionne a l'arrivee).
    function applyProfileTypeUI(choice) {
        const cargo = choice === "cargo";
        selectedProfileTypeChoice = cargo ? "cargo" : "traveler";
        document.getElementById("step1-errors")?.classList.add("hidden");
        document.getElementById("btn-traveler-choice")?.classList.toggle("selected", !cargo);
        document.getElementById("btn-cargo-choice")?.classList.toggle("selected", cargo);
        document.getElementById("trip-extra-fields")?.classList.remove("hidden");
        document.getElementById("kilos-group")?.classList.toggle("hidden", cargo);
        const section = document.getElementById("transport-mode-section");
        if (section) section.style.display = cargo ? "block" : "none";
        // [CARGO] dates multiples : visibles pour le cargo, masquees pour le voyageur simple
        setExtraTripDatesVisible(cargo);
        if (!cargo) {
            selectedTransportMode = null;
            document.querySelectorAll(".transport-mode-btn").forEach((b) => b.classList.remove("selected"));
        }
    }

    function addExtraTripDateRow() {
        const box = els.tripExtraDates;
        if (!box) return;
        if (box.querySelectorAll(".trip-extra-date-row").length >= MAX_EXTRA_DATES) return;
        const row = document.createElement("div");
        row.className = "trip-extra-date-row";
        const input = document.createElement("input");
        input.type = "date";
        input.className = "form-input trip-extra-date";
        if (els.dateDepart?.min) input.min = els.dateDepart.min;
        const del = document.createElement("button");
        del.type = "button";
        del.className = "colis-row-del";
        del.setAttribute("aria-label", "Supprimer cette date");
        del.textContent = "✕";
        row.appendChild(input);
        row.appendChild(del);
        box.appendChild(row);
        updateExtraDatesAddBtn();
        input.focus();
    }

    // Date principale + dates supplémentaires (cargo) → UNE offre portant toutes les dates
    function collectTripDates() {
        const dates = [];
        const main = String(els.dateDepart?.value || "").trim();
        if (main) dates.push(main);
        if (selectedProfileTypeChoice === "cargo") {
            document.querySelectorAll("#trip-extra-dates .trip-extra-date").forEach((inp) => {
                const v = String(inp.value || "").trim();
                if (v) dates.push(v);
            });
        }
        return dates;
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

    // Popup de succès du site (remplace l'alerte navigateur "yoannta.github.io says")
    // isEdit = true en mode modification -> on parle d'un enregistrement, pas d'une publication.
    function showPublishSuccess(destination, count, isEdit) {
        if (els.publishMsg) {
            const n = Number(count) || 1;
            if (isEdit) {
                els.publishMsg.textContent = "Vos modifications ont bien été enregistrées.";
            } else {
                els.publishMsg.textContent = n > 1
                    ? `Vos ${n} trajets vers ${destination} ont bien été publiés.`
                    : `Votre trajet vers ${destination} a bien été publié.`;
            }
        }
        els.publishModal?.classList.remove("hidden");
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

    // Restaure la section OTP à son état initial (contrôles visibles, message retiré)
    function resetOtpControls() {
        if (!els.otpSection) return;
        const wrap = els.otpSection.querySelector(".otp-input-wrap");
        if (wrap) wrap.style.display = "";
        els.otpSection.querySelector(".pm-otp-success")?.remove();
        if (els.otpInput) els.otpInput.value = "";
        els.otpSection.classList.add("hidden");
    }

    // [CONTACT MODIF] Decoupe "+330612345678" en indicatif connu + numero local.
    function splitPhoneNumber(full) {
        const num = String(full || "").replace(/\s+/g, "");
        let best = "";
        if (els.indicatifInput) {
            els.indicatifInput.querySelectorAll("option").forEach((o) => {
                const v = String(o.value || "").trim();
                if (v.startsWith("+") && num.startsWith(v) && v.length > best.length) best = v;
            });
        }
        if (!best) return { code: "", local: num };
        return { code: best, local: num.slice(best.length) };
    }

    // Note sous le champ : deja valide (annonce existante) ou code a saisir.
    function setContactNote(text) {
        if (!els.contactNote) return;
        if (!text) {
            els.contactNote.textContent = "";
            els.contactNote.classList.add("hidden");
            return;
        }
        els.contactNote.textContent = text;
        els.contactNote.classList.remove("hidden");
    }

    // Numero actuellement saisi dans la modale (indicatif + local, sans espaces).
    function currentEnteredNumber() {
        return `${els.indicatifInput?.value || ""}${els.localNumberInput?.value || ""}`.replace(/\s+/g, "");
    }

    // Le numero saisi est-il deja valide ? (contact de l'annonce, ou numero valide
    // dans cette session) -> aucun nouveau code a demander.
    function isAlreadyValidatedNumber() {
        if (!editingOfferId) return false;
        const cur = currentEnteredNumber();
        if (!cur) return false;
        return [paymentState.storedContact, paymentState.accountNumber].filter(Boolean).some((n) => n === cur);
    }

    // Note affichee quand le numero visible est deja valide.
    function noteIfAlreadyValidated() {
        if (paymentState.storedContact && currentEnteredNumber() === paymentState.storedContact) {
            return "Numéro déjà enregistré et validé avec cette annonce : aucune vérification nécessaire. Si vous le modifiez, un code sera demandé.";
        }
        return "Numéro vérifié à l'instant : aucune nouvelle vérification nécessaire. Si vous le modifiez, un code sera demandé.";
    }

    // Le bouton ouvert est-il la 1re ligne de contact (celle de l'annonce) ?
    function isStoredContactRow(btn) {
        if (!btn || !btn.closest) return false;
        const row = btn.closest(".payment-contact-row");
        const first = document.querySelector("#payment-contact-rows .payment-contact-row");
        if (!row || !first) return false;
        return row === first && !!row.querySelector("#open-payment-method-btn");
    }

    function selectPaymentProvider(methodId, methodName) {
        paymentState.selectedMethod = methodId;
        paymentState.selectedMethodName = methodName;
        paymentState.isVerified = false; // Reset verification state

        // Titre dynamique
        if (els.uploadTitle) {
            els.uploadTitle.textContent = "Votre numéro de contact";
        }

        // Reset complet : section OTP restaurée + bouton SMS réinitialisé
        // (sans ça, un 2e numéro gardait l'état "Envoyé ✓" et le vieux message
        // de succès sans champ de code → impossible de valider)
        resetOtpControls();
        if (els.verifySmsBtn) {
            els.verifySmsBtn.disabled = true;
            els.verifySmsBtn.innerHTML = "Vérifier";
            els.verifySmsBtn.style.color = "";
        }

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

        // [CONTACT MODIF] Ligne du contact de l'annonce : on reaffiche le numero deja
        // enregistre (valide a la creation) -> enregistrable SANS nouveau code.
        // Toute autre ligne (nouveau numero ajoute) reste soumise a la verification.
        if (editingOfferId && paymentState.storedContact && isStoredContactRow(paymentTrigger)) {
            // On reaffiche le contact courant : celui enregistre a la creation (deja valide)
            // ou celui que l'utilisateur vient de valider dans cette session.
            const parts = splitPhoneNumber(paymentState.accountNumber || paymentState.storedContact);
            if (els.indicatifInput && parts.code) els.indicatifInput.value = parts.code;
            if (els.indicatifInput && !parts.code) els.indicatifInput.selectedIndex = 0;
            if (els.localNumberInput) els.localNumberInput.value = parts.local;
            paymentState.selectedMethod = paymentState.storedMethod || "direct_contact";
            paymentState.selectedMethodName = "Contact Direct";
            paymentState.isVerified = true;
            if (els.confirmBtn) els.confirmBtn.disabled = false;
            setContactNote(noteIfAlreadyValidated());
        } else if (editingOfferId) {
            setContactNote("Nouveau numéro : un code de vérification sera demandé.");
        } else {
            setContactNote("");
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
            const box = document.getElementById("payment-contact-rows");
            const firstRow = box ? box.querySelector(".payment-contact-row") : null;
            const isSecond = !!paymentTrigger && !!firstRow
                && paymentTrigger.closest(".payment-contact-row") !== firstRow;
            labelEl.innerHTML = `📞 ${isSecond ? "2e contact" : "Contact"} : <strong>${displayCode}</strong> ${displayLocal}`;
        }
        // [2e CONTACT] On marque la ligne du contact qui vient d'etre confirme (1re ou 2e).
        // C'est ce marquage qui permet d'envoyer le 2e numero dans l'annonce.
        const confirmedRow = (paymentTrigger && paymentTrigger.closest)
            ? paymentTrigger.closest(".payment-contact-row")
            : null;
        if (confirmedRow) {
            confirmedRow.dataset.contactMethod = paymentState.selectedMethod || "";
            confirmedRow.dataset.contactNumber = paymentState.accountNumber || "";
        }
        closeModal();
    }

    // Plafond : 2 contacts maximum. Le bouton "+ Ajouter un autre numero" disparait
    // des que la 2e ligne existe, et revient si on supprime cette 2e ligne.
    function syncAddContactBtn() {
        const box = document.getElementById("payment-contact-rows");
        if (!box || !els.addContactBtn) return;
        if (box.querySelectorAll(".payment-contact-row").length >= 2) {
            els.addContactBtn.classList.add("hidden");
        } else {
            els.addContactBtn.classList.remove("hidden");
        }
    }

    // [2e CONTACT] Recree la 2e ligne de contact (mode modification) avec les valeurs
    // deja enregistrees, marquees dans les memes data-* qu'a la saisie. Sans cette ligne,
    // un simple enregistrement des modifications effacerait le 2e numero de l'annonce.
    function addSecondContactRow(method, number) {
        const box = document.getElementById("payment-contact-rows");
        if (!box || box.querySelectorAll(".payment-contact-row").length >= 2) return;
        const row = document.createElement("div");
        row.className = "payment-contact-row";
        row.dataset.contactMethod = method || "direct_contact";
        row.dataset.contactNumber = number || "";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn secondary payment-method-btn contact-row-btn";
        btn.innerHTML = '<span class="pm-label">Mon numero de contact</span>';
        const del = document.createElement("button");
        del.type = "button";
        del.className = "colis-row-del contact-row-del";
        del.setAttribute("aria-label", "Supprimer cette ligne");
        del.textContent = "✕";
        row.appendChild(btn);
        row.appendChild(del);
        box.appendChild(row);
        const parts = splitPhoneNumber(number || "");
        const label = btn.querySelector(".pm-label");
        if (label) label.innerHTML = `📞 2e contact : <strong>${parts.code}</strong> ${parts.local}`;
        syncAddContactBtn();
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
                    if (row && !row.querySelector("#open-payment-method-btn")) {
                        row.remove();
                        syncAddContactBtn();
                    }
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
            // Plafond dur : 2 contacts maximum (le bouton est aussi masque a 2 lignes)
            if (rowsBox.querySelectorAll(".payment-contact-row").length >= 2) return;
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
            syncAddContactBtn();
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

        // Si on change le numéro après l'avoir vérifié, on réinitialise la vérification.
        // Exception (mode modification) : un numero deja valide (celui de l'annonce, ou
        // celui valide dans cette session) reste accepte tel quel -> aucun code a ressaisir.
        const resetVerificationIfNeeded = () => {
            if (isAlreadyValidatedNumber()) {
                paymentState.isVerified = true;
                resetOtpControls();
                if (els.confirmBtn) els.confirmBtn.disabled = false;
                setContactNote(noteIfAlreadyValidated());
                return;
            }
            if (editingOfferId && paymentState.storedContact && isStoredContactRow(paymentTrigger)) {
                setContactNote("Numéro modifié : un code de vérification est nécessaire.");
            }
            if (!paymentState.isVerified) return;
            paymentState.isVerified = false;
            resetOtpControls();
            if (els.confirmBtn) els.confirmBtn.disabled = true;
        };

        els.indicatifInput?.addEventListener("change", () => {
            updateVerifyButton();
            resetVerificationIfNeeded();
        });
        els.localNumberInput?.addEventListener("input", (e) => {
            updateVerifyButton();
            resetVerificationIfNeeded();
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
                // Message de succès SANS détruire le champ + bouton OTP.
                // (L'ancien innerHTML supprimait les contrôles de la section →
                // pour un 2e numéro, plus aucun champ de code ne s'affichait
                // et "Enregistrer" restait bloqué.)
                let status = els.otpSection.querySelector(".pm-otp-success");
                if (!status) {
                    status = document.createElement("p");
                    status.className = "pm-otp-success";
                    status.style.cssText = "color: #ffb347; font-weight: 700; margin: 0;";
                    els.otpSection.appendChild(status);
                }
                status.textContent = "✓ Numéro vérifié avec succès";
                const wrap = els.otpSection.querySelector(".otp-input-wrap");
                if (wrap) wrap.style.display = "none";
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

        // Popup succès : "Voir mes offres" redirige vers les résultats
        els.publishOkBtn?.addEventListener("click", () => {
            window.location.href = "results.html";
        });
    }

    // ---- Submit trip ----
    // Anti-doublon (cause identifiee par Yoyo) : pendant la latence de publication il
    // cliquait plusieurs fois sur « Publier » -> autant d'annonces que de clics.
    // Le verrou est pose DES LE 1er CLIC, avant toute attente, et le bouton est
    // desactive immediatement ; il reste verrouille 2 s apres la fin pour absorber
    // les clics arrives trop tard.
    let submitting = false;

    async function submitTrip(event) {
        event.preventDefault();

        if (submitting) {
            console.warn("Publication deja en cours — clic ignore.");
            return;
        }
        submitting = true;
        const submitBtnEarly = els.form?.querySelector("button[type='submit']");
        const initialBtnText = submitBtnEarly?.textContent || "Publier mon trajet";
        if (submitBtnEarly) {
            submitBtnEarly.disabled = true;
            submitBtnEarly.textContent = "Publication...";
        }

        try {
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

        // En MODIFICATION, le contact est deja enregistre : on ne le redemande pas
        // (sinon l'enregistrement serait bloque a chaque modification).
        if (!editingOfferId && (!paymentState.selectedMethod || !paymentState.accountNumber)) {
            alert("Veuillez choisir un moyen de paiement et fournir votre numéro de compte.");
            openModal();
            return;
        }

        // Choix de profil obligatoire — pas de fallback profil compte (Yoyo 2026-09, strict)
        if (!selectedProfileTypeChoice) {
            alert("Veuillez d'abord choisir votre type de profil (Voyageur simple ou Entreprise cargo).");
            return;
        }

        // Soumettre directement (les champs sont visibles)
        await proceedSubmitTrip();
        } finally {
            // Reautorisation apres un court delai : absorbe les clics arrives
            // pendant/juste apres la publication (cause des annonces en double).
            setTimeout(() => {
                submitting = false;
                const b = els.form?.querySelector("button[type='submit']");
                if (b) {
                    b.disabled = false;
                    b.textContent = initialBtnText;
                }
            }, 2000);
        }
    }

    // Anti-double-publication : un seul envoi a la fois.
    let publishing = false;

    async function proceedSubmitTrip() {
        if (publishing) {
            console.warn("Publication deja en cours — envoi ignore.");
            return;
        }
        publishing = true;
        // Anti-doublon : meme annonce renvoyee coup sur coup (typiquement apres une
        // erreur reseau alors que l'envoi avait en fait abouti) -> confirmation.
        const _sigAnim = [
            els.departure?.value?.trim(), els.destination?.value?.trim(),
            els.cityDeparture?.value?.trim(), els.cityDestination?.value?.trim(),
            els.dateDepart?.value, els.kilos?.value, els.price?.value
        ].join("|");
        try {
            const _last = JSON.parse(localStorage.getItem("cc_last_publish") || "null");
            if (_last && _last.sig === _sigAnim && (Date.now() - (_last.at || 0)) < 180000) {
                if (!window.confirm("Vous venez de publier cette meme annonce il y a moins de 3 minutes.\n\nLa publier une deuxieme fois ?")) {
                    publishing = false;
                    return;
                }
            }
        } catch (e) { /* stockage indisponible */ }
        const departureCountry = String(els.departure?.value || "").trim();
        const destinationCountry = String(els.destination?.value || "").trim();

        // [ENTREPRISE / CARGO] Dates multiples : collecte de la date principale + dates ajoutées
        const tripDates = collectTripDates();
        if (!tripDates.length) {
            alert("Veuillez choisir une date de voyage.");
            return;
        }

        // Limite de publication par type (mode="" pour voyageur, mode!=="" pour cargo)
        // ⚠ AUCUNE verification en MODIFICATION : l'annonce en cours d'edition est deja
        // comptee parmi les annonces actives -> on refusait une modification pourtant
        // legitime ("limite atteinte" alors que rien de nouveau n'est publie).
        if (!editingOfferId) {
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

        // Collecte des prix spéciaux (lignes de l'étape 3 — script inline du HTML)
        const specialPrices = [];
        document.querySelectorAll("#colis-detail-rows .colis-detail-row").forEach((row) => {
            const type = row.querySelector(".colis-name-label")?.textContent?.trim();
            const mode = row.getAttribute("data-mode");
            const price = parseFloat(row.querySelector(".price-field")?.value);
            if (type && type !== "Nom du colis" && mode && !isNaN(price) && price > 0) {
                specialPrices.push({ type, mode, price });
            }
        });

        // [CODES ISO] Résolution nom de pays -> code ISO (table countries, cache CCCommon)
        // pour afficher les vrais drapeaux (option B robuste) sur les cartes d'offres.
        const countryCodes = await Promise.all([
            window.CCCommon?._getCountryCode
                ? window.CCCommon._getCountryCode(departureCountry).catch(() => null)
                : Promise.resolve(null),
            window.CCCommon?._getCountryCode
                ? window.CCCommon._getCountryCode(destinationCountry).catch(() => null)
                : Promise.resolve(null)
        ]);

        const payload = {
            title: `Trajet ${departureCountry} -> ${destinationCountry}`,
            origin: departureCountry,
            destination: destinationCountry,
            originCountryCode: countryCodes[0],
            destCountryCode: countryCodes[1],
            cityDeparture: String(els.cityDeparture?.value || "").trim(),
            cityDestination: String(els.cityDestination?.value || "").trim(),
            specialPrices: specialPrices,
            // departureDate (principale) + extraDates (supplémentaires) ajoutés avant l'insertion
            availableKg: availableKg,
            pricePerKg: pricePerKg,
            baseCurrency: els.priceCurrencyInput?.value || (window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : "EUR"),  // [MULTI-CURRENCY]
            paymentMethod: paymentState.selectedMethod,
            paymentQr: paymentState.accountNumber, // Re-purpose paymentQr as accountNumber
            mode: isCargoMode ? (selectedTransportMode || "") : "",
            colis_types: window.colisSelections ? window.colisSelections.join(", ") : "",
            refused_colis_types: window.refusedSelections ? window.refusedSelections.join(", ") : ""
        };

        // [2e CONTACT] Facultatif (plafond de 2 contacts par annonce). La 2e ligne est
        // marquee au moment ou le numero est confirme dans la modale.
        // Publication sans 2e ligne : rien n'est envoye (colonnes NULL par defaut).
        // Modification : la 2e ligne est recreee depuis l'annonce, donc son absence
        // signifie que l'utilisateur l'a retiree -> on efface le 2e contact.
        const contactRows = Array.from(
            document.querySelectorAll("#payment-contact-rows .payment-contact-row")
        );
        const secondRow = contactRows[1] || null;
        if (secondRow) {
            payload.paymentMethod2 = secondRow.dataset.contactMethod || "";
            payload.paymentQr2 = secondRow.dataset.contactNumber || "";
        } else if (editingOfferId) {
            payload.paymentMethod2 = "";
            payload.paymentQr2 = "";
        }

        // En modification, si aucun nouveau contact n'a ete saisi, on conserve celui
        // de l'annonce (sinon on l'effacerait en enregistrant).
        if (editingOfferId && !paymentState.selectedMethod) {
            delete payload.paymentMethod;
            delete payload.paymentQr;
        }

        const submitBtn = els.form?.querySelector("button[type='submit']");
        const initialText = submitBtn?.textContent || "Publier mon trajet";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Publication...";
        }

        try {
            // [ENTREPRISE / CARGO] UNE seule offre par trajet : la date la plus proche devient
            // departure_date (tri/affichage corrects), les dates suivantes partent dans extra_dates
            // et sont affichées empilées dans la cellule "Départ" de la carte d'offre.
            const uniqueDates = Array.from(new Set(
                tripDates.map((s) => String(s || "").trim()).filter(Boolean)
            )).sort(); // ISO aaaa-mm-jj : tri lexicographique = tri chronologique
            // ── ENREGISTREMENT ────────────────────────────────────────────────
            // Si on arrive par « Modifier mon trajet » (post_trip.html?editOffer=...),
            // on MET A JOUR l'annonce existante. Sinon : publication normale.
            // On reutilise LE formulaire officiel -> aucun ecart avec la publication.
            const fullPayload = { ...payload, departureDate: uniqueDates[0], extraDates: uniqueDates.slice(1) };
            let created;
            if (editingOfferId) {
                // Le payload est en camelCase (API) : on le traduit vers les colonnes reelles
                const MAP = {
                    availableKg: "available_kg", pricePerKg: "price_per_kg",
                    departureDate: "departure_date", extraDates: "extra_dates",
                    baseCurrency: "base_currency", paymentMethod: "payment_method",
                    paymentQr: "payment_qr", paymentMethod2: "payment_method_2",
                    paymentQr2: "payment_qr_2", referralCode: "referral_code",
                    cityDeparture: "city_origin", cityDestination: "city_destination",
                    originCountryCode: "origin_country_code", destCountryCode: "destination_country_code",
                    specialPrices: "special_prices"
                };
                const bodyUpdate = {};
                Object.keys(fullPayload).forEach((k) => {
                    if (fullPayload[k] === undefined) return;
                    bodyUpdate[MAP[k] || k] = fullPayload[k];
                });
                bodyUpdate.updated_at = new Date().toISOString();
                const res = await window.ccSupabase.from("offers").update(bodyUpdate).eq("id", editingOfferId).select("id");
                if (res.error) throw res.error;
                if (!res.data || !res.data.length) {
                    throw new Error("Modification non enregistree : la base n'a mis a jour aucune ligne (session expiree ?).");
                }
                created = { item: { id: editingOfferId } };
            } else {
                created = await window.CCCommon.api("/api/offers", { method: "POST", body: fullPayload });
            }

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
            clearExtraTripDates();
            document.getElementById("edit-notice")?.classList.add("hidden");
            try { localStorage.removeItem("cc_trip_draft"); } catch (e) { }
            try { localStorage.setItem("cc_last_publish", JSON.stringify({ sig: _sigAnim, at: Date.now() })); } catch (e) { }
            paymentState.selectedMethod = null;
            paymentState.selectedMethodName = null;
            paymentState.accountNumber = null;
            if (els.paymentMethodLabel) els.paymentMethodLabel.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Choisir mon moyen de paiement`;
            document.querySelectorAll(".pm-label").forEach((l) => {
                if (l !== els.paymentMethodLabel) l.innerHTML = els.paymentMethodLabel.innerHTML;
            });
            // Popup de succès du site (remplace l'alerte navigateur) — redirection au clic
            showPublishSuccess(created?.destination || payload.destination, 1, !!editingOfferId);
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
            publishing = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = initialText;
            }
        }
    }


    // ═══════ MODE MODIFICATION D'UNE ANNONCE (post_trip.html?editOffer=<id>) ═══════
    // On reutilise TEL QUEL le formulaire officiel de publication : memes champs, meme
    // selecteur de devise, memes villes, memes prix speciaux. Aucune copie => aucune
    // divergence possible avec la publication (contrairement a une fenetre recopiee).
    const EDIT_OFFER_ID = new URLSearchParams(window.location.search).get("editOffer");
    let editingOfferId = null;

    async function initEditMode() {
        if (!EDIT_OFFER_ID) return;

        let offer = null;
        try {
            // On attend que la session ET les champs pays/villes soient prets.
            for (let i = 0; i < 30; i++) {
                if (window.ccSupabase && document.getElementById("departure")) break;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (!window.ccSupabase) {
                console.warn("[modif] Supabase indisponible");
                alert("Connexion indisponible : impossible de charger l'annonce a modifier.");
                return;
            }
            const res = await window.ccSupabase.from("offers").select("*").eq("id", Number(EDIT_OFFER_ID)).maybeSingle();
            if (res.error) throw res.error;
            offer = res.data;
        } catch (e) {
            console.error("[modif] chargement impossible:", e);
            alert("Impossible de charger l'annonce a modifier : " + (e && e.message ? e.message : e));
            return;
        }
        if (!offer) {
            alert("Annonce introuvable (#" + EDIT_OFFER_ID + ").");
            return;
        }
        editingOfferId = offer.id;

        // [CONTACT] On reaffiche le numero de contact enregistre a la creation de l'annonce.
        // Il a deja ete valide a ce moment-la -> aucun code redemande tant qu'il n'est pas
        // modifie. S'il change de numero ou en ajoute un autre, la verification par code
        // redevient obligatoire (voir selectPaymentProvider / resetVerificationIfNeeded).
        const storedContact = String(offer.payment_qr || "").trim();
        if (storedContact) {
            paymentState.storedContact = storedContact;
            paymentState.storedMethod = String(offer.payment_method || "direct_contact").trim() || "direct_contact";
            paymentState.selectedMethod = paymentState.storedMethod;
            paymentState.selectedMethodName = "Contact Direct";
            paymentState.accountNumber = storedContact;
            paymentState.isVerified = true;
            if (els.paymentMethodInput) els.paymentMethodInput.value = paymentState.storedMethod;
            if (els.paymentQrInput) els.paymentQrInput.value = storedContact;
            const parts = splitPhoneNumber(storedContact);
            const rowLabel = document.querySelector("#payment-contact-rows .contact-row-btn .pm-label");
            if (rowLabel) rowLabel.innerHTML = `📞 Contact : <strong>${parts.code}</strong> ${parts.local}`;
        }

        // [2e CONTACT] Si l'annonce a un 2e numero enregistre, on recree la 2e ligne de
        // contact (pre-remplie) : sinon un simple enregistrement des modifications
        // effacerait ce 2e numero. L'utilisateur peut la retirer avec le ✕.
        const storedContact2 = String(offer.payment_qr_2 || "").trim();
        if (storedContact2) {
            addSecondContactRow(String(offer.payment_method_2 || "direct_contact").trim(), storedContact2);
        }

        // Remplissage du formulaire avec l'annonce existante (l'utilisateur ne modifie
        // que ce qu'il veut, il n'a plus a tout ressaisir).
        const remplir = () => {
            if (!editingOfferId) return;
            const set = (id, v) => {
                const el = document.getElementById(id);
                if (!el) return;
                const val = (v === null || v === undefined) ? "" : v;
                if (el.value === String(val)) return;
                el.value = val;
                // On ne simule QUE "change" : "input" rouvre la liste de suggestions du
                // composant pays (comme si l'utilisateur venait de taper) -> a l'arrivee sur
                // la page de modification le pays s'affichait comme "pas encore selectionne".
                // "change" suffit : le selecteur de devise ecoute change ET input.
                el.dispatchEvent(new Event("change", { bubbles: true }));
            };
            set("departure", offer.origin);
            set("city-departure", offer.city_origin || "");
            set("destination", offer.destination);
            set("city-destination", offer.city_destination || "");
            set("date-depart", String(offer.departure_date || "").slice(0, 10));
            set("kilos", offer.available_kg ?? "");
            set("price", offer.price_per_kg ?? "");
            set("price-currency", offer.base_currency || "");
            if (els.notes) els.notes.value = offer.description || "";

            // DEVISE : afficher celle choisie lors de la creation de l'annonce (l'une des
            // deux devises proposees : pays de depart / pays d'arrivee). Le bouton du
            // formulaire restait sur "Devise" car seul le champ cache etait rempli.
            // L'utilisateur peut toujours en choisir une autre : la liste est reconstruite
            // juste apres par updateCurrencySelector().
            const devise = String(offer.base_currency || offer.baseCurrency || "").toUpperCase();
            if (devise) {
                const inp = document.getElementById("price-currency");
                if (inp) inp.value = devise;
                const aff = document.getElementById("current-currency-text");
                if (aff) aff.textContent = (window.CCCommon && window.CCCommon.currencySymbol ? window.CCCommon.currencySymbol(devise) : devise);
                if (typeof updateCurrencySelector === "function") updateCurrencySelector();
                // updateCurrencySelector() remet la devise du pays si la valeur courante ne
                // figure pas dans sa liste : on reimpose celle de l'annonce.
                const inp2 = document.getElementById("price-currency");
                if (inp2) inp2.value = devise;
                const aff2 = document.getElementById("current-currency-text");
                if (aff2) aff2.textContent = (window.CCCommon && window.CCCommon.currencySymbol ? window.CCCommon.currencySymbol(devise) : devise);
            }
            // Annexe : dates supplementaires (cargo)
            const extras = Array.isArray(offer.extra_dates) ? offer.extra_dates : [];
            if (extras.length && typeof window.ccSetExtraTripDates === "function") {
                try { window.ccSetExtraTripDates(extras); } catch (e) { }
            }
            updateExtraDatesAddBtn();
            // Rien ne doit s'afficher comme "en cours de saisie" tant que l'utilisateur n'a
            // pas touche un champ : on referme toute liste de suggestions ouverte.
            document.querySelectorAll(".cc-suggestions-list").forEach((l) => { l.style.display = "none"; });
        };

        // Les champs pays/villes sont construits (puis parfois reconstruits) par le
        // composant partage : on reapplique les valeurs plusieurs fois pour etre sur
        // qu'elles tiennent.
        [0, 300, 800, 1600, 2600, 4000].forEach((d) => setTimeout(remplir, d));

        // Type d'annonce (voyageur / cargo) deduit du mode enregistre : meme logique que le
        // clic utilisateur (bouton surligne + champs coherents), sinon le type repartait vide.
        applyProfileTypeUI(offer.mode ? "cargo" : "traveler");
        if (offer.mode) {
            selectedTransportMode = offer.mode;
            document.querySelectorAll(".modal-transport-btn, .transport-mode-btn, .mode-btn").forEach((btn) => {
                const val = btn.dataset.mode || btn.dataset.value || "";
                if (val && String(val) === String(offer.mode)) btn.classList.add("selected");
            });
        }

        // Textes de la page
        document.querySelectorAll("h1").forEach((h) => {
            if (/publi/i.test(h.textContent || "")) h.textContent = "Modifier mon trajet";
        });
        const submitBtn = document.getElementById("trip-form")?.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.textContent = "Enregistrer les modifications";
        document.getElementById("edit-notice")?.classList.remove("hidden");
        console.log("[modif] annonce", editingOfferId, "chargee dans le formulaire");
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
            applyProfileTypeUI("traveler");
        });

        document.getElementById("btn-cargo-choice")?.addEventListener("click", () => {
            applyProfileTypeUI("cargo");
        });

        // [CARGO] « Ajouter une autre date » : nouvelle ligne supprimable pour le même trajet
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
                // Choix de profil obligatoire — bloquer si AUCUN choix effectué (Yoyo 2026-09, strict : pas de fallback profil compte)
                if (!selectedProfileTypeChoice) {
                    if (errBox1) {
                        errBox1.innerHTML = "<div>• Veuillez choisir votre profil : Voyageur simple ou Entreprise / Cargo</div>";
                        errBox1.classList.remove("hidden");
                    }
                    // Rouge sur LES DEUX boutons (Yoyo : sinon l'utilisateur croit qu'il doit cliquer uniquement sur Voyageur simple)
                    ["btn-traveler-choice", "btn-cargo-choice"].forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) markError(btn);
                    });
                    const firstChoice = document.getElementById("btn-traveler-choice");
                    if (firstChoice) firstChoice.focus();
                    return;
                }

                // [ENTREPRISE / CARGO] Dates multiples : chaque ligne ajoutée doit être
                // remplie, à partir d'aujourd'hui, et sans doublon (même date saisie 2×).
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
            // Étape 2 : champs OBLIGATOIRES (Yoyo 2026-08) — MESSAGE par section manquante
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

        // Étape 3 — question « prix spéciaux ? » : Oui → panneau, Non → masqué
        const yesBtn = document.getElementById("special-yes");
        const noBtn = document.getElementById("special-no");
        const panel = document.getElementById("special-prices-panel");
        if (yesBtn && noBtn && panel) {
            yesBtn.addEventListener("click", () => {
                // Si toutes les lignes ont ete supprimees, on recree la 1re ligne pour que
                // les champs reparaissent (sinon le panneau s'ouvrait vide et il fallait
                // passer par « Ajouter un autre prix special »).
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
        // Plus de restauration de brouillon : l'ancien mecanisme (cc_trip_draft) n'est
        // plus ecrit par personne et rechargeait EN SILENCE d'anciennes donnees (risque
        // de republier une vieille annonce). On purge la cle residuelle du navigateur.
        try { localStorage.removeItem("cc_trip_draft"); } catch (e) { }
        await window.CCCommon.init("post_trip");

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
        els.cityDeparture = document.getElementById("city-departure");
        els.cityDestination = document.getElementById("city-destination");
        bindModalEvents();
        bindEvents();
        initWizard();

        // ATTENTION : EN DERNIER. Les champs pays/villes viennent d'etre crees par
        // initLocationFields(). Les remplir avant ne servait a rien (elements
        // inexistants) -> le formulaire s'ouvrait VIDE.
        await initEditMode();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
