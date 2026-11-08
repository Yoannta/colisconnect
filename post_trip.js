(() => {
    const COUNTRY_OPTIONS = window.CCCommon.COUNTRY_OPTIONS;
    const COUNTRY_CURRENCIES = window.CCCommon.COUNTRY_CURRENCIES;
    // [MULTI-CURRENCY] Acronyme local affiche a l'utilisateur ("FCFA" et non "XOF")
    const ccSym = (code) => (window.CCCommon && window.CCCommon.currencySymbol ? window.CCCommon.currencySymbol(code) : code);

    // Limite maximale de kilos par offre de voyageur (demande Yoyo 2026-10-16) :
    // 69 kg. Le champ #kilos porte max="69" côté HTML ; ici on refuse la saisie
    // au-delà, avec un message clair, à l'étape « Espace & prix » et à l'envoi.
    const KILOS_MAX = 69;


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
        paymentMethodInput: document.getElementById("payment-method"),
        paymentQrInput: document.getElementById("payment-qr"),
        paymentMethodLabel: document.getElementById("payment-method-label"),
        animatedNodes: Array.from(document.querySelectorAll("[data-animate]")),
        // Modal
        openBtn: document.getElementById("open-payment-method-btn"),
        addContactBtn: document.getElementById("addContactBtn"),
        modal: document.getElementById("payment-method-modal"),
        closeBtn: document.getElementById("close-payment-modal-btn"),
        stepUpload: document.getElementById("pm-step-upload"),
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
    };

    // ---- Payment method state ----
    const paymentState = {
        selectedMethod: null, // "mtn_cm" etc
        selectedMethodName: null,
        accountNumber: null,
        // Mode modification : contact deja enregistre sur l'annonce (deja valide a
        // la creation) -> reaffiche sans redemander de code tant qu'il ne change pas.
        storedContact: null,
        storedMethod: null,
        // Numeros verifies pendant cette session (OTP reussi) ou herites de
        // l'annonce : rouvrir une ligne de contact ne doit ni vider le champ
        // ni redemander un code pour un numero deja valide.
        verifiedNumbers: []
    };

    let selectedProfileTypeChoice = null;
    let selectedTransportMode = null;
    let selectedPriceUnit = "kg";  // "kg" ou "cbm" (cargo)
    let choixUniteFait = false;    // l'utilisateur cargo a-t-il choisi kilo/CBM ?
    // Bouton qui a ouvert la modale paiement ("Mon numero de contact" ou "Autre numero")
    let paymentTrigger = null;

    // ═══════════════════════════════════════════════════════════════════════
    // Messages en page, focus et dialogues accessibles (S-02, CA-43, CA-51)
    // Aucun alert() / confirm() natif ne subsiste dans ce fichier.
    // ═══════════════════════════════════════════════════════════════════════
    const STEP_ERROR_IDS = ["step1-errors", "step2-errors", "step3-errors", "step4-errors"];
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const ERROR_ICON = '<span class="step-errors-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>';
    const PHONE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
    const CROSS_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
        ));
    }

    function scrollToElement(el) {
        if (!el || !el.getBoundingClientRect) return;
        const top = window.scrollY + el.getBoundingClientRect().top - 96;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }

    function pulseGroup(el) {
        if (!el || !el.classList) return;
        el.classList.remove("gold-pulse");
        void el.offsetWidth;
        el.classList.add("gold-pulse");
        setTimeout(() => el.classList.remove("gold-pulse"), 1500);
    }

    function markFieldError(el) {
        if (!el || !el.classList) return;
        el.classList.add("input-error");
        if (el.matches && el.matches("input,select,textarea")) {
            el.setAttribute("aria-invalid", "true");
            const step = el.closest(".wizard-step");
            const box = step ? step.querySelector(".step-errors") : null;
            if (box && box.id) el.setAttribute("aria-describedby", box.id);
            const clear = () => {
                el.classList.remove("input-error");
                el.removeAttribute("aria-invalid");
                el.removeAttribute("aria-describedby");
            };
            el.addEventListener("input", clear, { once: true });
            el.addEventListener("change", clear, { once: true });
        }
        setTimeout(() => el.classList.remove("input-error"), 1400);
    }

    function clearStepError(index) {
        const box = document.getElementById(STEP_ERROR_IDS[index]);
        if (box) box.classList.add("hidden");
    }

    function showStepError(index, message, target, groupEl) {
        STEP_ERROR_IDS.forEach((id, i) => {
            if (i !== index) document.getElementById(id)?.classList.add("hidden");
        });
        const box = document.getElementById(STEP_ERROR_IDS[index]);
        if (box) {
            box.innerHTML = ERROR_ICON + "<span>" + escapeHtml(message) + "</span>";
            box.classList.remove("hidden");
        }
        if (target) {
            scrollToElement(groupEl || target);
            setTimeout(() => {
                try { target.focus({ preventScroll: true }); } catch (e) { try { target.focus(); } catch (e2) { } }
                if (groupEl) pulseGroup(groupEl);
            }, 120);
        } else {
            scrollToElement(document.querySelector("#trip-form .wizard-step.active"));
        }
    }

    function activeStepIndex() {
        const steps = Array.from(document.querySelectorAll("#trip-form .wizard-step"));
        return steps.indexOf(document.querySelector("#trip-form .wizard-step.active"));
    }

    function placeNotice(index) {
        const bar = document.getElementById("trip-notice");
        if (!bar) return;
        const steps = document.querySelectorAll("#trip-form .wizard-step");
        const step = steps[index >= 0 ? index : 0];
        const footer = step ? step.querySelector(".wizard-footer") : null;
        // C-35 / §6 : le bandeau reste dans le flux du contenu, juste au-dessus de
        // la barre d'action. A 360 la barre est fixe : l'inserer dedans la rendait
        // fixe et lui faisait absorber le bandeau (BUG-019).
        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(bar, footer);
        } else if (step) {
            step.appendChild(bar);
        }
    }

    function showNotice(message, tone, withRetry) {
        const bar = document.getElementById("trip-notice");
        const text = document.getElementById("trip-notice-text");
        const retry = document.getElementById("trip-notice-retry");
        if (!bar || !text) return;
        text.textContent = message;
        bar.classList.remove("hidden", "is-warn", "is-danger");
        bar.classList.add(tone === "danger" ? "is-danger" : "is-warn");
        bar.setAttribute("role", tone === "danger" ? "alert" : "status");
        if (retry) retry.classList.toggle("hidden", !withRetry);
        placeNotice(activeStepIndex());
        scrollToElement(bar);
    }

    function clearNotice() {
        document.getElementById("trip-notice")?.classList.add("hidden");
    }

    function revealStepError(index, message, target, groupEl) {
        clearNotice();
        if (window.ccGoToWizardStep) window.ccGoToWizardStep(index);
        showStepError(index, message, target, groupEl);
    }

    // ---- Dialogues : focus piégé, Échap, retour du focus ----
    let ccLastFocus = null;
    let ccOpenDialog = null;

    function dialogFocusables(root) {
        return Array.from(root.querySelectorAll(FOCUSABLE))
            .filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    function openDialog(dialog, initialFocus) {
        if (!dialog) return;
        ccLastFocus = document.activeElement;
        dialog.classList.remove("hidden");
        if (dialog.classList.contains("popup-overlay")) dialog.style.display = "flex";
        document.body.style.overflow = "hidden";
        ccOpenDialog = dialog;
        setTimeout(() => {
            const target = initialFocus || dialogFocusables(dialog)[0] || dialog;
            try { target.focus({ preventScroll: true }); } catch (e) { try { target.focus(); } catch (e2) { } }
        }, 60);
    }

    function closeDialog(dialog) {
        if (!dialog) return;
        dialog.classList.add("hidden");
        if (dialog.classList.contains("popup-overlay")) dialog.style.display = "none";
        document.body.style.overflow = "";
        if (ccOpenDialog === dialog) ccOpenDialog = null;
        const previous = ccLastFocus;
        ccLastFocus = null;
        if (previous && previous.focus) {
            setTimeout(() => { try { previous.focus({ preventScroll: true }); } catch (e) { try { previous.focus(); } catch (e2) { } } }, 30);
        }
        dialog.dispatchEvent(new CustomEvent("cc-dialog-closed"));
    }

    function initDialogA11y() {
        document.addEventListener("keydown", (e) => {
            if (!ccOpenDialog) return;
            if (e.key === "Escape") {
                e.preventDefault();
                closeDialog(ccOpenDialog);
                return;
            }
            if (e.key !== "Tab") return;
            const list = dialogFocusables(ccOpenDialog);
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
        ["payment-method-modal", "publish-success-modal", "cc-confirm-modal", "refusedPopupOverlay"].forEach((id) => {
            const dialog = document.getElementById(id);
            if (!dialog) return;
            dialog.addEventListener("click", (e) => {
                if (e.target === dialog) closeDialog(dialog);
            });
        });
    }

    function ccConfirmDuplicate() {
        return new Promise((resolve) => {
            const dialog = document.getElementById("cc-confirm-modal");
            const okBtn = document.getElementById("cc-confirm-ok");
            const cancelBtn = document.getElementById("cc-confirm-cancel");
            if (!dialog || !okBtn || !cancelBtn) { resolve(false); return; }
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                closeDialog(dialog);
                resolve(value);
            };
            const onOk = () => finish(true);
            const onCancel = () => finish(false);
            okBtn.addEventListener("click", onOk);
            cancelBtn.addEventListener("click", onCancel);
            dialog.addEventListener("cc-dialog-closed", () => finish(false), { once: true });
            openDialog(dialog, cancelBtn);
        });
    }

    // ---- Country Datalist ----
    function normalizeCountry(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    // [MULTI-CURRENCY] Met à jour le sélecteur de monnaie selon les pays choisis
    // [DEVISE] Sélecteur monté depuis le modèle unique du site (devise.js) :
    // une seule apparence de devise pour toutes les pages.
    let ccPicker = null;

    function mountCurrencySelector() {
        const host = document.getElementById("currency-selector-wrap");
        if (!host || !window.CCDevise) return ccPicker;
        ccPicker = window.CCDevise.picker(host, {
            inputId: "price-currency",
            btnId: "currency-toggle-btn",
            labelId: "current-currency-text",
            placeholder: "Monnaie",
            keepEmpty: true,
            onChange: function () {
                // Les badges "prix special" affichent la devise : on les rafraichit
                if (window.ccRefreshUniteLabel) {
                    document.querySelectorAll(".colis-detail-row").forEach(function (r) { window.ccRefreshUniteLabel(r); });
                }
            }
        });
        return ccPicker;
    }

    // [MULTI-CURRENCY] Met à jour les devises proposées selon les pays choisis
    function updateCurrencySelector() {
        const picker = ccPicker || mountCurrencySelector();
        if (!picker) return;
        const dep = String(els.departure?.value || "").trim();
        const dst = String(els.destination?.value || "").trim();
        const opts = window.CCDevise.optionsForCountries(dep, dst, { fallback: "EUR" });
        // [FIX 2026-10-28] Ne JAMAIS remplacer en silence la monnaie deja choisie.
        // Avant, vider ou re-taper un pays retirait sa devise de la liste et le
        // selecteur basculait tout seul sur la 1re devise (XOF -> EUR), sans que
        // l'utilisateur le voie. On garde son choix en tete de liste.
        const choix = String(picker.get() || "").toUpperCase();
        if (choix && !opts.some((o) => o.value === choix)) {
            opts.unshift({ value: choix, label: "Monnaie choisie" });
        }
        picker.setOptions(opts);
    }

    function isValidCountry(value) {
        if (!value) return false;
        const target = normalizeCountry(value);
        return COUNTRY_OPTIONS.some((item) => normalizeCountry(item) === target);
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
        // À la limite, le bouton est retiré plutôt que grisé (C-22).
        btn.disabled = count >= MAX_EXTRA_DATES;
        btn.classList.toggle("hidden", count >= MAX_EXTRA_DATES);
    }

    function setExtraTripDatesVisible(visible) {
        if (els.tripExtraDatesWrap) els.tripExtraDatesWrap.classList.toggle("hidden", !visible);
        if (!visible) clearExtraTripDates();
        if (visible) updateExtraDatesAddBtn();
    }

    // Affichage du type d'annonce (voyageur simple / cargo) : bouton surligne + champs
    // coherents. Source unique : utilisee par le clic utilisateur ET par la modification
    // d'une annonce existante (avant, le type n'etait pas re-selectionne a l'arrivee).
    // [CARGO 2026-10-19] Le cargo choisit d'abord son unite de prix : kilo ou CBM.
    // Le champ de prix et la devise n'apparaissent qu'apres ce choix, avec une fleche
    // de retour a gauche pour revenir aux deux boutons.
    // Valeur a mettre dans #kilos : vide si ce n'est pas un volume saisissable (cargo),
    // bornee au maximum autorise sinon. Empeche tout formulaire invalide.
    function numeroKilosSaisissable(valeur) {
        const n = Number(valeur || 0);
        if (!isFinite(n) || n <= 0 || n > KILOS_MAX) return "";
        return n;
    }

    function afficherChoixUnitePrix() {
        choixUniteFait = false;
        reinitialiserTransport();
        document.getElementById("cargo-unit-choice")?.classList.remove("hidden");
        document.getElementById("price-group")?.classList.add("hidden");
        document.getElementById("price-unit-back")?.classList.add("hidden");
        document.querySelectorAll(".cargo-unit-btn").forEach((b) => {
            b.classList.remove("selected");
            b.setAttribute("aria-pressed", "false");
        });
    }

    function choisirUnitePrix(unit) {
        choixUniteFait = true;
        selectedPriceUnit = unit === "cbm" ? "cbm" : "kg";
        document.getElementById("cargo-unit-choice")?.classList.add("hidden");
        document.getElementById("price-group")?.classList.remove("hidden");
        const label = document.getElementById("price-label");
        if (label) label.textContent = selectedPriceUnit === "cbm" ? "Prix par CBM" : "Prix par kilo";
        const back = document.getElementById("price-unit-back");
        if (back) back.classList.toggle("hidden", selectedProfileTypeChoice !== "cargo");
        document.querySelectorAll(".cargo-unit-btn").forEach((b) => {
            const actif = b.dataset.unit === selectedPriceUnit;
            b.classList.toggle("selected", actif);
            b.setAttribute("aria-pressed", actif ? "true" : "false");
        });
        appliquerTransportLie();
        document.getElementById("price")?.focus();
    }

    // Regle metier : un prix au kilo vaut pour l'avion, un prix au CBM pour le bateau.
    // Le choix de l'unite impose donc le moyen de transport (on ne laisse que lui).
    function appliquerTransportLie() {
        const section = document.getElementById("transport-mode-section");
        if (!section) return;
        const mode = selectedPriceUnit === "cbm" ? "bateau" : "avion";
        section.querySelectorAll(".transport-mode-btn").forEach((b) => {
            const compatible = b.dataset.mode === mode;
            b.classList.toggle("hidden", !compatible);
            b.classList.remove("selected");
            b.setAttribute("aria-pressed", "false");
            if (compatible) {
                b.classList.add("selected");
                b.setAttribute("aria-pressed", "true");
            }
        });
        selectedTransportMode = mode;
    }

    // Retour au choix d'unite : on reaffiche les deux transports.
    function reinitialiserTransport() {
        const section = document.getElementById("transport-mode-section");
        if (!section) return;
        section.querySelectorAll(".transport-mode-btn").forEach((b) => {
            b.classList.remove("hidden", "selected");
            b.setAttribute("aria-pressed", "false");
        });
        selectedTransportMode = null;
    }

    function applyProfileTypeUI(choice) {
        const cargo = choice === "cargo";
        selectedProfileTypeChoice = cargo ? "cargo" : "traveler";
        document.getElementById("step1-errors")?.classList.add("hidden");
        const btnTraveler = document.getElementById("btn-traveler-choice");
        const btnCargo = document.getElementById("btn-cargo-choice");
        if (btnTraveler) {
            btnTraveler.classList.toggle("selected", !cargo);
            btnTraveler.setAttribute("aria-pressed", cargo ? "false" : "true");
        }
        if (btnCargo) {
            btnCargo.classList.toggle("selected", cargo);
            btnCargo.setAttribute("aria-pressed", cargo ? "true" : "false");
        }
        document.getElementById("kilos-group")?.classList.toggle("hidden", cargo);
        // [BUG-020] Le sous-titre « Vos kilos disponibles et votre prix par kilo. » ne vaut
        // que pour le voyageur : en cargo, l'etape 2 n'a aucun sous-titre (DA §3.2, D-22).
        const sousTitreEtape2 = document.querySelector("#step-colis .trip-section-sub");
        if (sousTitreEtape2) sousTitreEtape2.hidden = cargo;
        // Le champ kilos n'a de sens que pour un voyageur : en cargo on le desactive
        // pour qu'il ne puisse jamais invalider le formulaire (max = 69 kg).
        const champKilos = document.getElementById("kilos");
        if (champKilos) {
            champKilos.disabled = cargo;
            if (cargo) {
                champKilos.value = "";
                champKilos.removeAttribute("max");
            } else {
                champKilos.setAttribute("max", "69");
            }
        }
        const section = document.getElementById("transport-mode-section");
        if (section) section.style.display = cargo ? "block" : "none";
        // [CARGO] dates multiples : visibles pour le cargo, masquees pour le voyageur simple
        setExtraTripDatesVisible(cargo);
        // [CARGO] prix : d'abord le choix kilo / CBM, puis le champ
        if (cargo) {
            afficherChoixUnitePrix();
        } else {
            selectedPriceUnit = "kg";
            document.getElementById("cargo-unit-choice")?.classList.add("hidden");
            document.getElementById("price-group")?.classList.remove("hidden");
            document.getElementById("price-unit-back")?.classList.add("hidden");
            const lbl = document.getElementById("price-label");
            if (lbl) lbl.textContent = "Prix par kilo";
        }
        if (!cargo) {
            selectedTransportMode = null;
            choixUniteFait = true;
            document.querySelectorAll("#transport-mode-section .transport-mode-btn").forEach((b) => b.classList.remove("selected"));
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
        del.className = "cc-btn-icon danger colis-row-del";
        del.setAttribute("aria-label", "Supprimer cette date");
        del.innerHTML = CROSS_ICON;
        row.appendChild(input);
        row.appendChild(del);
        box.appendChild(row);
        updateExtraDatesAddBtn();
        input.focus();
    }

    // [FIX 2026-10-19] Restauration des dates supplementaires en modification.
    // La modification appelait window.ccSetExtraTripDates(...) qui n'a JAMAIS existe :
    // les 2 dates supplementaires n'etaient donc pas remises dans le formulaire, et
    // l'enregistrement envoyait extra_dates = [] -> elles disparaissaient en base.
    window.ccSetExtraTripDates = function (dates) {
        const liste = (Array.isArray(dates) ? dates : [])
            .map((d) => String(d || "").trim())
            .filter(Boolean)
            .slice(0, MAX_EXTRA_DATES);
        clearExtraTripDates();
        liste.forEach((valeur) => {
            addExtraTripDateRow();
            const champs = els.tripExtraDates
                ? els.tripExtraDates.querySelectorAll(".trip-extra-date-row .trip-extra-date")
                : [];
            const dernier = champs[champs.length - 1];
            if (dernier) dernier.value = valeur;
        });
        updateExtraDatesAddBtn();
    };

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
            showStepError(0, "Indiquez le pays de départ", dep);
            if (window.ccGoToWizardStep) window.ccGoToWizardStep(0);
            return;
        }
        // Aller directement à la saisie du numéro
        selectPaymentProvider("direct_contact", "Contact Direct");
        openDialog(els.modal, els.localNumberInput);
    }

    function closeModal() {
        closeDialog(els.modal);
    }

    // Popup de succès du site (remplace l'alerte navigateur "yoannta.github.io says")
    // isEdit = true en mode modification -> on parle d'un enregistrement, pas d'une publication.
    function showPublishSuccess(destination, count, isEdit) {
        const title = document.getElementById("publish-success-title");
        if (title) {
            title.textContent = isEdit ? "Modifications enregistrées" : "Offre publiée avec succès !";
        }
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
        const okBtn = document.getElementById("publish-success-ok-btn");
        openDialog(els.publishModal, okBtn);
    }

    // Restaure la section OTP à son état initial (contrôles visibles, message retiré)
    function resetOtpControls() {
        if (!els.otpSection) return;
        const wrap = els.otpSection.querySelector(".otp-input-wrap");
        if (wrap) wrap.style.display = "";
        els.otpSection.querySelector(".pm-otp-success")?.remove();
        if (els.otpInput) {
            els.otpInput.value = "";
            els.otpInput.removeAttribute("aria-invalid");
            els.otpInput.removeAttribute("aria-describedby");
        }
        const err = document.getElementById("pm-otp-error");
        if (err) err.classList.add("hidden");
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

    // Affichage lisible d'un numéro local : premier chiffre puis groupes de 2.
    // Ex. 612345678 -> « 6 12 34 56 78 » (DA §3.4).
    function formatPhoneLocal(local) {
        const digits = String(local || "").replace(/\D/g, "");
        if (digits.length < 6) return String(local || "");
        const groups = [digits.slice(0, 1)];
        for (let i = 1; i < digits.length; i += 2) groups.push(digits.slice(i, i + 2));
        return groups.join(" ");
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

    // Ce numero est-il deja valide ? (contact de l'annonce, 1er contact enregistre,
    // ou numero verifie par OTP dans cette session) -> aucun nouveau code a demander.
    function numeroDejaValide(numero) {
        const cur = String(numero || "").replace(/\s+/g, "");
        if (!cur) return false;
        return [paymentState.storedContact, paymentState.accountNumber]
            .concat(paymentState.verifiedNumbers || [])
            .filter(Boolean)
            .some((n) => String(n).replace(/\s+/g, "") === cur);
    }

    function isAlreadyValidatedNumber() {
        return numeroDejaValide(currentEnteredNumber());
    }

    // Note affichee quand le numero visible est deja valide.
    function noteIfAlreadyValidated() {
        if (paymentState.storedContact && currentEnteredNumber() === paymentState.storedContact) {
            return "Numéro déjà enregistré et validé avec cette annonce : aucune vérification nécessaire. Si vous le modifiez, un code sera demandé.";
        }
        return "Numéro déjà vérifié : aucune nouvelle vérification nécessaire. Si vous le modifiez, un code sera demandé.";
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
            els.verifySmsBtn.removeAttribute("aria-busy");
        }

        if (els.indicatifInput) {
            els.indicatifInput.disabled = false;
            els.indicatifInput.selectedIndex = 0;
        }
        if (els.localNumberInput) {
            els.localNumberInput.disabled = false;
            els.localNumberInput.value = "";
        }

        // [FIX 2026-10-28] Rouvrir une ligne de contact reaffiche le numero deja
        // enregistre. Avant, la modale s'ouvrait vide alors que le bouton affichait
        // un numero : impossible de savoir quel contact on modifiait, et il fallait
        // refaire toute la verification SMS pour le meme numero.
        const triggeredRow = (paymentTrigger && paymentTrigger.closest)
            ? paymentTrigger.closest(".payment-contact-row")
            : null;
        const prefill = String(
            (triggeredRow && triggeredRow.dataset.contactNumber)
            || (isStoredContactRow(paymentTrigger) ? (paymentState.accountNumber || paymentState.storedContact || "") : "")
        ).trim();
        const parts = splitPhoneNumber(prefill);
        if (els.indicatifInput && parts.code) els.indicatifInput.value = parts.code;
        if (els.localNumberInput && prefill) els.localNumberInput.value = parts.local;

        setTimeout(() => els.localNumberInput?.focus(), 100);

        if (els.confirmBtn) {
            els.confirmBtn.disabled = true;
        }

        // Numero deja valide (annonce existante, 1er contact enregistre, ou verifie
        // dans cette session) -> enregistrable tel quel. Toute modification du numero
        // redemande un code (voir resetVerificationIfNeeded).
        if (prefill && numeroDejaValide(prefill)) {
            if (editingOfferId && paymentState.storedContact && isStoredContactRow(paymentTrigger)) {
                paymentState.selectedMethod = paymentState.storedMethod || "direct_contact";
                paymentState.selectedMethodName = "Contact Direct";
            }
            paymentState.isVerified = true;
            if (els.confirmBtn) els.confirmBtn.disabled = false;
            setContactNote(noteIfAlreadyValidated());
        } else if (editingOfferId) {
            setContactNote("Nouveau numéro : un code de vérification sera demandé.");
        } else if (prefill) {
            setContactNote("Numéro non vérifié : saisissez le code reçu par SMS.");
        } else {
            setContactNote("");
        }
    }

    function confirmPaymentMethod() {
        const fullNumber = `${els.indicatifInput?.value || ""}${els.localNumberInput?.value || ""}`;
        if (!paymentState.selectedMethod || !fullNumber) return;

        const box = document.getElementById("payment-contact-rows");
        const firstRow = box ? box.querySelector(".payment-contact-row") : null;
        // [FIX] Quand la modale s'ouvre automatiquement a la publication, paymentTrigger
        // vaut null : on confirme alors la 1re ligne. Sans ca, la 1re ligne n'etait
        // jamais marquee et le 1er contact restait vide.
        const confirmedRow = (paymentTrigger && paymentTrigger.closest)
            ? paymentTrigger.closest(".payment-contact-row")
            : firstRow;
        const isSecond = Boolean(confirmedRow && firstRow && confirmedRow !== firstRow);
        const method = paymentState.selectedMethod || "";

        // Marque TOUJOURS la ligne concernee.
        if (confirmedRow) {
            confirmedRow.dataset.contactMethod = method;
            confirmedRow.dataset.contactNumber = fullNumber;
        }

        // [FIX] Le 1er contact vient de la 1re ligne (ou de l'etat global a la
        // publication). Confirmer le 2e numero ne doit PLUS ecraser le 1er :
        // avant, les deux contacts envoyes devenaient identiques (le 2e).
        if (!isSecond) {
            paymentState.accountNumber = fullNumber;
            if (els.paymentMethodInput) els.paymentMethodInput.value = method;
            if (els.paymentQrInput) els.paymentQrInput.value = fullNumber;
        }

        // Met à jour le label du bouton qui a ouvert la modale (1er ou 2e)
        const labelEl = confirmedRow
            ? confirmedRow.querySelector(".pm-label")
            : els.paymentMethodLabel;
        if (labelEl) {
            const displayCode = els.indicatifInput?.value || "";
            const displayLocal = els.localNumberInput?.value || "";
            labelEl.innerHTML = `${PHONE_ICON}<span>${isSecond ? "2e contact" : "Contact"} : <strong>${escapeHtml(displayCode)}</strong> ${escapeHtml(formatPhoneLocal(displayLocal))}</span>`;
        }
        // C-26 : une ligne dont le numero est verifie prend le style `verified`
        // (texte --cc-text, bordure --cc-success 45 %). BUG-017.
        if (confirmedRow) {
            const rowBtn = confirmedRow.querySelector(".contact-row-btn");
            if (rowBtn) rowBtn.classList.toggle("verified", Boolean(paymentState.isVerified && fullNumber));
        }
        if (paymentState.isVerified && fullNumber && !paymentState.verifiedNumbers.includes(fullNumber)) {
            paymentState.verifiedNumbers.push(fullNumber);
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
        // Ligne recreee depuis un contact enregistre : deja verifie (C-26).
        btn.className = "contact-row-btn" + (number ? " verified" : "");
        btn.innerHTML = '<span class="pm-label">Mon numero de contact</span>';
        const del = document.createElement("button");
        del.type = "button";
        del.className = "cc-btn-icon danger colis-row-del contact-row-del";
        del.setAttribute("aria-label", "Supprimer cette ligne");
        del.innerHTML = CROSS_ICON;
        row.appendChild(btn);
        row.appendChild(del);
        box.appendChild(row);
        const parts = splitPhoneNumber(number || "");
        const label = btn.querySelector(".pm-label");
        if (label) label.innerHTML = `${PHONE_ICON}<span>2e contact : <strong>${escapeHtml(parts.code)}</strong> ${escapeHtml(formatPhoneLocal(parts.local))}</span>`;
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
                <button type="button" class="contact-row-btn">
                    <span class="pm-label">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        <span>Mon numero de contact</span>
                    </span>
                </button>
                <button type="button" class="cc-btn-icon danger colis-row-del contact-row-del" aria-label="Supprimer cette ligne" title="Supprimer cette ligne">${CROSS_ICON}</button>`;
            rowsBox.appendChild(row);
            syncAddContactBtn();
        });
        els.closeBtn?.addEventListener("click", closeModal);

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
            if (paymentState.storedContact || paymentState.accountNumber
                || (paymentState.verifiedNumbers && paymentState.verifiedNumbers.length)) {
                setContactNote("Numéro modifié : un code de vérification est nécessaire.");
            }
            if (!paymentState.isVerified) return;
            paymentState.isVerified = false;
            resetOtpControls();
            if (els.confirmBtn) els.confirmBtn.disabled = true;
        };

        els.indicatifInput?.addEventListener("change", () => {
            // Changer d'indicatif : le numero deja saisi correspond a l'ancien code,
            // on le vide pour pouvoir taper le nouveau (demande Yoyo).
            if (els.localNumberInput) {
                els.localNumberInput.value = "";
                els.localNumberInput.disabled = false;
                try { els.localNumberInput.focus(); } catch (e) { /* ignore */ }
            }
            updateVerifyButton();
            resetVerificationIfNeeded();
        });
        els.localNumberInput?.addEventListener("input", (e) => {
            updateVerifyButton();
            resetVerificationIfNeeded();
        });

        // Click "Vérifier" (SMS) — S-13 : le code n'est jamais affiché.
        // La modale porte un bandeau « Démonstration » explicite.
        els.verifySmsBtn?.addEventListener("click", async () => {
            els.verifySmsBtn.disabled = true;
            els.verifySmsBtn.setAttribute("aria-busy", "true");
            els.verifySmsBtn.innerHTML = '<span class="spinner-sm" aria-hidden="true"></span><span>Envoi…</span>';

            // Simulation envoi SMS
            setTimeout(() => {
                els.verifySmsBtn.innerHTML = "Envoyé ✓";
                els.verifySmsBtn.removeAttribute("aria-busy");
                els.otpSection?.classList.remove("hidden");

                els.indicatifInput.disabled = true;
                els.localNumberInput.disabled = true;

                const otpError = document.getElementById("pm-otp-error");
                if (otpError) otpError.classList.add("hidden");
                els.otpInput.focus();
            }, 1200);
        });

        // Après l'envoi du code, le numero est verrouille (le SMS est parti vers
        // CE numero). Sans issue, une faute de frappe obligeait a fermer la modale.
        // Ce bouton rend la saisie, remet la verification a zero et laisse
        // l'utilisateur corriger puis redemander un code.
        document.getElementById("pm-change-number-btn")?.addEventListener("click", () => {
            paymentState.isVerified = false;
            if (els.confirmBtn) els.confirmBtn.disabled = true;
            resetOtpControls();
            if (els.indicatifInput) els.indicatifInput.disabled = false;
            if (els.localNumberInput) els.localNumberInput.disabled = false;
            if (els.verifySmsBtn) {
                els.verifySmsBtn.innerHTML = "Vérifier";
                els.verifySmsBtn.removeAttribute("aria-busy");
            }
            updateVerifyButton();
            els.localNumberInput?.focus();
        });

        // Click "Valider" (OTP)
        els.confirmOtpBtn?.addEventListener("click", () => {
            const code = els.otpInput.value.trim();
            if (code === "123456") {
                paymentState.isVerified = true;
                // Memorise le numero verifie : rouvrir cette ligne plus tard ne
                // redemandera pas un nouveau code (numero inchange).
                const numVerifie = currentEnteredNumber();
                if (numVerifie && !paymentState.verifiedNumbers.includes(numVerifie)) {
                    paymentState.verifiedNumbers.push(numVerifie);
                }
                // Message de succès SANS détruire le champ + bouton OTP.
                let status = els.otpSection.querySelector(".pm-otp-success");
                if (!status) {
                    status = document.createElement("p");
                    status.className = "pm-otp-success";
                    els.otpSection.appendChild(status);
                }
                status.textContent = "✓ Numéro vérifié avec succès";
                const wrap = els.otpSection.querySelector(".otp-input-wrap");
                if (wrap) wrap.style.display = "none";
                const otpError = document.getElementById("pm-otp-error");
                if (otpError) otpError.classList.add("hidden");
                els.otpInput.removeAttribute("aria-invalid");
                els.otpInput.removeAttribute("aria-describedby");
                if (els.confirmBtn) els.confirmBtn.disabled = false;
            } else {
                const otpError = document.getElementById("pm-otp-error");
                if (otpError) otpError.classList.remove("hidden");
                els.otpInput.setAttribute("aria-invalid", "true");
                els.otpInput.setAttribute("aria-describedby", "pm-otp-error");
                els.otpInput.focus();
            }
        });

        els.otpInput?.addEventListener("input", () => {
            const otpError = document.getElementById("pm-otp-error");
            if (otpError) otpError.classList.add("hidden");
            els.otpInput.removeAttribute("aria-invalid");
            els.otpInput.removeAttribute("aria-describedby");
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

        // Popup succès : le bouton de confirmation redirige vers les résultats
        els.publishOkBtn?.addEventListener("click", () => {
            window.location.href = "results.html";
        });
        document.getElementById("close-publish-success-btn")?.addEventListener("click", () => {
            closeDialog(els.publishModal);
        });
    }

    // ---- Submit trip ----
    // Anti-doublon (cause identifiee par Yoyo) : pendant la latence de publication il
    // cliquait plusieurs fois sur « Publier » -> autant d'annonces que de clics.
    // Le verrou est pose DES LE 1er CLIC, avant toute attente, et le bouton est
    // desactive immediatement ; il reste verrouille 2 s apres la fin pour absorber
    // les clics arrives trop tard.
    let submitting = false;

    // Verifie les villes de depart et d'arrivee aupres de la base, juste avant l'envoi.
    // Renvoie false (en prevenant l'utilisateur) si une ville est vide ou inconnue du pays
    // choisi ; sinon remet l'orthographe officielle dans les champs. Si la base est
    // injoignable, on ne bloque pas la publication (on ne peut pas verifier).
    async function verifierVillesAnnonce() {
        // VILLES OPTIONNELLES (Yoyo 2026-10-04) : une ville vide ne bloque plus la publication.
        // Si une ville saisie n'existe pas dans la liste du pays choisi, elle est simplement
        // RETIREE du champ (meme regle que le champ pays : la saisie libre n'est pas conservee)
        // et le champ est signale en rouge — sans aucune alerte, et sans bloquer l'envoi.
        const controles = [
            { champPays: els.departure, champVille: els.cityDeparture, libelle: "de depart" },
            { champPays: els.destination, champVille: els.cityDestination, libelle: "d'arrivee" }
        ];
        for (const c of controles) {
            const pays = String(c.champPays?.value || "").trim();
            const valeur = String(c.champVille?.value || "").trim();
            if (!valeur) continue;                 // ville optionnelle : rien a verifier
            // Module commun ancien (encore en cache) : on ne touche a rien.
            if (!window.CCCommon?.verifierVilleAnnonce) continue;
            let r = null;
            try {
                r = await window.CCCommon.verifierVilleAnnonce(pays, valeur);
            } catch (e) {
                console.warn("Verification de ville indisponible:", e);
                continue;   // base injoignable : on ne touche pas a la saisie
            }
            if (r && r.ok) {
                if (r.ville && c.champVille.value !== r.ville) c.champVille.value = r.ville;
                continue;
            }
            // Ville inconnue : on retire la saisie (le texte disparait), sans bloquer l'envoi.
            if (c.champVille) {
                c.champVille.value = "";
                c.champVille.classList.add("cc-country-invalid");
                c.champVille.title = (r && r.message) ||
                    ("Ville inconnue pour " + (pays || "ce pays") + " : choisissez une ville dans la liste.");
            }
        }
        return true;
    }

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
            submitBtnEarly.setAttribute("aria-busy", "true");
            submitBtnEarly.textContent = "Publication...";
        }

        try {
        clearNotice();
        if (!window.CCCommon.requireCompletedProfile("post_trip.html")) return;

        const departureCountry = String(els.departure?.value || "").trim();
        const destinationCountry = String(els.destination?.value || "").trim();

        if (!isValidCountry(departureCountry)) {
            revealStepError(0, "Indiquez le pays de départ", els.departure);
            return;
        }
        if (!isValidCountry(destinationCountry)) {
            revealStepError(0, "Indiquez le pays d'arrivée", els.destination);
            return;
        }

        if (normalizeCountry(departureCountry) === normalizeCountry(destinationCountry)) {
            revealStepError(0, "Le pays de départ et le pays d'arrivée doivent être différents.", els.destination);
            return;
        }

        // En MODIFICATION, le contact est deja enregistre : on ne le redemande pas
        // (sinon l'enregistrement serait bloque a chaque modification).
        if (!editingOfferId && (!paymentState.selectedMethod || !paymentState.accountNumber)) {
            // Demande Yoyo 2026-10-16 : plus d'alerte navigateur ici. On ouvre
            // DIRECTEMENT la fenêtre du numéro de contact (vérification SMS
            // comprise) ; le champ du numéro prend le focus tout seul
            // (voir selectPaymentProvider -> setTimeout(focus, 100)).
            openModal();
            return;
        }

        // Choix de profil obligatoire — pas de fallback profil compte (Yoyo 2026-09, strict)
        if (!selectedProfileTypeChoice) {
            revealStepError(0, "Choisissez votre profil : Voyageur simple ou Entreprise / Cargo",
                document.getElementById("btn-traveler-choice"),
                document.querySelector("#profile-choice-section .profile-select-grid"));
            return;
        }

        // Soumettre directement (les champs sont visibles).
        // Le verrou ville/pays est applique dans proceedSubmitTrip() : c'est le SEUL
        // point d'envoi (le bouton du formulaire comme la modale de type de profil
        // passent par la), donc aucun chemin ne peut le contourner.
        await proceedSubmitTrip();
        } finally {
            // Reautorisation apres un court delai : absorbe les clics arrives
            // pendant/juste apres la publication (cause des annonces en double).
            setTimeout(() => {
                submitting = false;
                const b = els.form?.querySelector("button[type='submit']");
                if (b) {
                    b.disabled = false;
                    b.removeAttribute("aria-busy");
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
        // Verrou ville AVANT tout envoi : le controle du champ se declenche a la sortie
        // du champ (et fait un aller-retour reseau), donc taper une faute puis appuyer sur
        // Entree / « Publier » enregistrait la faute — ou une ville videe — avant que le
        // controle ait eu le temps de finir. Place ici, au point d'envoi unique : le
        // bouton du formulaire ET la modale de type de profil sont couverts.
        if (!(await verifierVillesAnnonce())) return;
        publishing = true;
        // Backstop (l'etape 3 le verifie deja) : aucun envoi avec une ligne de prix
        // special incomplete, sinon elle serait ignoree en silence.
        if (typeof window.ccSpecialPricesError === "function") {
            const problemePrix = window.ccSpecialPricesError();
            if (problemePrix) {
                publishing = false;
                revealStepError(2, problemePrix.message, problemePrix.el);
                return;
            }
        }
        // Anti-doublon : meme annonce renvoyee coup sur coup (typiquement apres une
        // erreur reseau alors que l'envoi avait en fait abouti) -> confirmation
        // dans la page (S-02 / CA-48), jamais confirm() natif.
        const _sigAnim = [
            els.departure?.value?.trim(), els.destination?.value?.trim(),
            els.cityDeparture?.value?.trim(), els.cityDestination?.value?.trim(),
            els.dateDepart?.value, els.kilos?.value, els.price?.value
        ].join("|");
        try {
            const _last = JSON.parse(localStorage.getItem("cc_last_publish") || "null");
            if (_last && _last.sig === _sigAnim && (Date.now() - (_last.at || 0)) < 180000) {
                const poursuivre = await ccConfirmDuplicate();
                if (!poursuivre) {
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
            publishing = false;
            revealStepError(0, "Indiquez la date du voyage", els.dateDepart);
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
                const todayIso = new Date().toISOString().slice(0, 10);
                // Memes regles que le bridge : une offre expiree n'est pas "active",
                // et les anciens modes traveler/voyageur/simple sont des offres voyageur.
                const activeOffers = (myOffers?.items || []).filter((o) => {
                    if (String(o.status || "").toLowerCase() !== "active") return false;
                    const date = String(o.departure_date || o.departureDate || "").slice(0, 10);
                    return !date || date >= todayIso;
                });
                const isCargoOffer = (o) => {
                    const m = String(o.mode || "").trim().toLowerCase();
                    if (!m || ["traveler", "voyageur", "simple"].includes(m)) return false;
                    return true;
                };
                const offersOfType = activeOffers.filter(o => isCargoOffer(o) === isCargo);
                const activeCount = offersOfType.length;
                const limit = isCargo ? 5 : 1;

                if (activeCount >= limit) {
                    // Bandeau d'avertissement, pas de modale (C-35).
                    showNotice(isCargo
                        ? "En tant qu'entreprise / cargo, vous ne pouvez publier que 5 trajets actifs à la fois."
                        : "En tant que voyageur simple, vous ne pouvez publier que 1 trajet actif à la fois.",
                        "warn", false);
                    publishing = false;
                    return;
                }
            } catch (e) {
                console.warn("Impossible de verifier le nombre d'offres actives.", e);
            }
        }

        const isCargoMode = selectedProfileTypeChoice === "cargo";
        const availableKg = isCargoMode ? 99999 : Number(els.kilos?.value || 0);
        const prixSaisi = parseFloat(String(els.price?.value || "").replace(",", "."));
        const pricePerKg = Number.isFinite(prixSaisi) ? prixSaisi : 0;

        // Validation dans l'ordre du formulaire (kilos -> unité -> prix -> devise
        // -> transport), avec retour sur l'étape fautive et focus (CA-29).
        if (!isCargoMode && availableKg < 1) {
            publishing = false;
            revealStepError(1, "Indiquez le nombre de kilos disponibles", els.kilos);
            return;
        }
        if (!isCargoMode && availableKg > KILOS_MAX) {
            publishing = false;
            revealStepError(1, "Maximum " + KILOS_MAX + " kg par offre", els.kilos);
            return;
        }
        if (isCargoMode && !choixUniteFait) {
            publishing = false;
            document.querySelector("#cargo-unit-choice .segment")?.classList.add("is-error");
            revealStepError(1, "Choisissez prix au kilo ou prix au CBM",
                document.querySelector("#cargo-unit-choice .cargo-unit-btn"),
                document.getElementById("cargo-unit-choice"));
            return;
        }
        if (!(pricePerKg >= 1)) {
            publishing = false;
            revealStepError(1, "Indiquez un prix d'au moins 1", els.price);
            return;
        }
        const deviseChoisie = String(els.priceCurrencyInput?.value || "").trim();
        if (!deviseChoisie) {
            publishing = false;
            revealStepError(1, "Choisissez votre monnaie", document.getElementById("currency-toggle-btn"));
            return;
        }
        if (isCargoMode && !selectedTransportMode) {
            publishing = false;
            document.querySelector("#transport-mode-section .segment")?.classList.add("is-error");
            revealStepError(1, "Choisissez le moyen de transport",
                document.querySelector("#transport-mode-section .transport-mode-btn"),
                document.querySelector("#transport-mode-section .segment"));
            return;
        }

        // Collecte des prix spéciaux (lignes de l'étape 3 — script inline du HTML).
        // [FIX] « Non » ne faisait que masquer le panneau : les lignes restaient dans
        // le DOM et etaient quand meme envoyees. On ne collecte que si « Oui » est actif.
        const specialPrices = [];
        const specialPanel = document.getElementById("special-prices-panel");
        const specialYes = document.getElementById("special-yes");
        const specialEnabled = Boolean(specialPanel && !specialPanel.classList.contains("hidden"))
            && Boolean(specialYes && specialYes.classList.contains("selected"));
        if (specialEnabled) {
            document.querySelectorAll("#colis-detail-rows .colis-detail-row").forEach((row) => {
                const type = row.querySelector(".colis-name-label")?.textContent?.trim();
                const mode = row.getAttribute("data-mode");
                const price = parseFloat(row.querySelector(".price-field")?.value);
                if (type && type !== "Quel est le colis ?" && mode && !isNaN(price) && price > 0) {
                    specialPrices.push({ type, mode, price });
                }
            });
        }

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

        // Le 1er contact vient de la 1re ligne (source unique). L'etat global
        // paymentState est conserve en secours pour la publication classique.
        const firstContactRow = document.querySelector("#payment-contact-rows .payment-contact-row");
        const firstContactMethod = firstContactRow?.dataset.contactMethod || paymentState.selectedMethod;
        const firstContactNumber = firstContactRow?.dataset.contactNumber || paymentState.accountNumber;

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
            priceUnit: isCargoMode ? (selectedPriceUnit || "kg") : "kg",
            baseCurrency: els.priceCurrencyInput?.value || (window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : "EUR"),  // [MULTI-CURRENCY]
            paymentMethod: firstContactMethod,
            paymentQr: firstContactNumber, // Re-purpose paymentQr as accountNumber
            mode: isCargoMode ? (selectedTransportMode || "") : "",
            refused_colis_types: window.refusedSelections ? window.refusedSelections.join(", ") : ""
        };
        // colis_types : la section « types acceptes » a ete retiree de la page.
        //   - CREATION : on envoie "" (comportement historique, compatible avec
        //     une eventuelle colonne NOT NULL) ;
        //   - MODIFICATION : on n'envoie PAS la cle -> la valeur deja en base
        //     est conservee au lieu d'etre ecrasee.
        if (!editingOfferId) payload.colis_types = "";

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
            submitBtn.setAttribute("aria-busy", "true");
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
                    availableKg: "available_kg", pricePerKg: "price_per_kg", priceUnit: "price_unit",
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
            if (els.paymentMethodLabel) {
                els.paymentMethodLabel.innerHTML = `${PHONE_ICON}<span>Mon numero de contact</span>`;
            }
            document.querySelectorAll(".pm-label").forEach((l) => {
                if (l !== els.paymentMethodLabel) l.innerHTML = `${PHONE_ICON}<span>Mon numero de contact</span>`;
            });
            clearNotice();
            // Popup de succès du site — titre dynamique (S-17)
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
            console.error("[publication] échec :", error);
            // Message lisible, valeurs conservées, bouton réactivé (CA-50).
            showNotice("Impossible de publier pour le moment. Vérifiez votre connexion, puis réessayez.", "danger", true);
        } finally {
            publishing = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute("aria-busy");
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

    // Mode modification : squelette de chargement et erreur bloquante (CA-53).
    function showEditLoading() {
        document.getElementById("edit-loading")?.classList.remove("hidden");
        document.getElementById("edit-error")?.classList.add("hidden");
        els.form?.classList.add("hidden");
    }

    function showEditError(title, cause) {
        document.getElementById("edit-loading")?.classList.add("hidden");
        els.form?.classList.add("hidden");
        const box = document.getElementById("edit-error");
        if (!box) return;
        const titleEl = document.getElementById("edit-error-title");
        const causeEl = document.getElementById("edit-error-cause");
        if (titleEl) titleEl.textContent = title || "Impossible de charger l'annonce.";
        if (causeEl) causeEl.textContent = cause || "Vérifiez votre connexion, puis réessayez.";
        box.classList.remove("hidden");
    }

    async function initEditMode() {
        if (!EDIT_OFFER_ID) return;

        document.getElementById("edit-retry-btn")?.addEventListener("click", () => window.location.reload());
        document.getElementById("edit-back-btn")?.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
        showEditLoading();

        let offer = null;
        try {
            // On attend que la session ET les champs pays/villes soient prets.
            for (let i = 0; i < 30; i++) {
                if (window.ccSupabase && document.getElementById("departure")) break;
                await new Promise((r) => setTimeout(r, 100));
            }
            if (!window.ccSupabase) {
                console.warn("[modif] Supabase indisponible");
                showEditError("Impossible de charger l'annonce.", "Vérifiez votre connexion, puis réessayez.");
                return;
            }
            const res = await window.ccSupabase.from("offers").select("*").eq("id", Number(EDIT_OFFER_ID)).maybeSingle();
            if (res.error) throw res.error;
            offer = res.data;
        } catch (e) {
            console.error("[modif] chargement impossible:", e);
            showEditError("Impossible de charger l'annonce.", "Vérifiez votre connexion, puis réessayez.");
            return;
        }
        if (!offer) {
            showEditError("Annonce introuvable : " + EDIT_OFFER_ID, "Retournez au dashboard pour choisir une autre annonce.");
            return;
        }
        editingOfferId = offer.id;
        document.getElementById("edit-loading")?.classList.add("hidden");
        document.getElementById("edit-error")?.classList.add("hidden");
        els.form?.classList.remove("hidden");

        // Types de colis acceptes/refuses : restaures AVANT l'enregistrement,
        // sinon l'edition les remplacait par des chaines vides.
        if (typeof window.ccSetRefusedColisSelections === "function") {
            const splitTypes = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
            try {
                window.ccSetRefusedColisSelections(splitTypes(offer.refused_colis_types));
            } catch (e) { console.warn("types de colis refuses non restaures:", e); }
        }

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
            if (!paymentState.verifiedNumbers.includes(storedContact)) paymentState.verifiedNumbers.push(storedContact);
            if (els.paymentMethodInput) els.paymentMethodInput.value = paymentState.storedMethod;
            if (els.paymentQrInput) els.paymentQrInput.value = storedContact;
            const parts = splitPhoneNumber(storedContact);
            const firstRow = document.querySelector("#payment-contact-rows .payment-contact-row");
            if (firstRow) {
                firstRow.dataset.contactMethod = paymentState.storedMethod;
                firstRow.dataset.contactNumber = storedContact;
            }
            const rowLabel = document.querySelector("#payment-contact-rows .contact-row-btn .pm-label");
            if (rowLabel) rowLabel.innerHTML = `${PHONE_ICON}<span>Contact : <strong>${escapeHtml(parts.code)}</strong> ${escapeHtml(formatPhoneLocal(parts.local))}</span>`;
            // Contact enregistre = verifie : style C-26 des le chargement. BUG-017.
            const firstRowBtn = document.querySelector("#payment-contact-rows .contact-row-btn");
            if (firstRowBtn) firstRowBtn.classList.add("verified");
        }

        // [2e CONTACT] Si l'annonce a un 2e numero enregistre, on recree la 2e ligne de
        // contact (pre-remplie) : sinon un simple enregistrement des modifications
        // effacerait ce 2e numero. L'utilisateur peut la retirer avec le ✕.
        const storedContact2 = String(offer.payment_qr_2 || "").trim();
        if (storedContact2) {
            addSecondContactRow(String(offer.payment_method_2 || "direct_contact").trim(), storedContact2);
            // Valide a la creation de l'annonce : pas de nouveau code a demander.
            if (!paymentState.verifiedNumbers.includes(storedContact2)) paymentState.verifiedNumbers.push(storedContact2);
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
            // [FIX 2026-10-19] Une offre cargo stocke available_kg = 99999 : l'ecrire dans
            // #kilos (qui porte max="69") rendait le formulaire HTML INVALIDE, et le
            // navigateur bloquait silencieusement « Enregistrer les modifications ».
            // Le champ kilos ne concerne que le voyageur simple.
            // Champ kilos : reserve au voyageur simple. En cargo il est vide, et on
            // borne a 69 kg pour qu'aucune valeur ne puisse invalider le formulaire.
            const kiloOffre = Number(offer.available_kg || 0);
            set("kilos", numeroKilosSaisissable(kiloOffre));
            set("price", offer.price_per_kg ?? "");
            set("price-currency", offer.base_currency || "");

            // DEVISE : on reprend la devise de l'annonce, même si elle ne figure pas
            // dans la liste des devises des pays (l'utilisateur peut en changer).
            const devise = String(offer.base_currency || offer.baseCurrency || "").toUpperCase();
            if (devise) {
                const picker = ccPicker || mountCurrencySelector();
                if (picker) {
                    const dep = String(els.departure?.value || "").trim();
                    const dst = String(els.destination?.value || "").trim();
                    const opts = window.CCDevise.optionsForCountries(dep, dst, { fallback: "EUR" });
                    if (!opts.some((o) => o.value === devise)) opts.unshift({ value: devise, label: "Monnaie de l'annonce" });
                    picker.setOptions(opts);
                    picker.set(devise);
                }
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
        // qu'elles tiennent. MAIS on arrete des la premiere interaction : avant, les
        // rappels jusqu'a 4 s ecrasaient les champs que l'utilisateur venait de modifier.
        const prefillTimers = [0, 300, 800, 1600, 2600, 4000].map((d) => setTimeout(remplir, d));
        const stopPrefill = () => prefillTimers.forEach((t) => clearTimeout(t));
        els.form?.addEventListener("pointerdown", stopPrefill, { once: true });
        els.form?.addEventListener("keydown", stopPrefill, { once: true });

        // Type d'annonce (voyageur / cargo) deduit du mode enregistre : meme logique que le
        // clic utilisateur (bouton surligne + champs coherents), sinon le type repartait vide.
        // Une annonce est cargo si elle a un mode de transport, OU un volume symbolique
        // (> 69 kg), OU si le compte est un compte cargo : sinon le champ kilos reapparaissait
        // rempli de 99999 et bloquait l'enregistrement.
        // Ancien bug : mode="traveler"/"voyageur"/"simple" etait classe cargo.
        const modeOffre = String(offer.mode || "").trim().toLowerCase();
        const modeVoyageurHerite = !modeOffre || ["traveler", "voyageur", "simple"].includes(modeOffre);
        const estCargoOffre = !modeVoyageurHerite || Number(offer.available_kg || 0) > KILOS_MAX;
        applyProfileTypeUI(estCargoOffre ? "cargo" : "traveler");
        // unite de prix enregistree (kg ou CBM) : on remet le client sur son choix
        if (estCargoOffre) {
            choisirUnitePrix(String(offer.price_unit || "kg").toLowerCase() === "cbm" ? "cbm" : "kg");
        }
        // prix speciaux enregistres : on reconstruit les lignes (sinon la section
        // disparaissait a l'enregistrement, car le formulaire renvoyait une liste vide)
        const prixSpeciaux = Array.isArray(offer.special_prices) ? offer.special_prices : [];
        // Devise de reference des badges « prix speciaux » (repli cote HTML) :
        // sans elle la ligne affichait « — par velo » au lieu de « 25 € par velo ».
        window.ccEditBaseCurrency = String(
            offer.base_currency || offer.baseCurrency
            || els.priceCurrencyInput?.value
            || (window.CCCommon?.getUserCurrency ? window.CCCommon.getUserCurrency() : "")
            || ""
        ).toUpperCase();
        if (prixSpeciaux.length && typeof window.ccSetSpecialPrices === "function") {
            try { window.ccSetSpecialPrices(prixSpeciaux); } catch (e) { console.warn("prix speciaux non restaures:", e); }
        }
        if (estCargoOffre && offer.mode) {
            selectedTransportMode = offer.mode;
            document.querySelectorAll(".modal-transport-btn, #transport-mode-section .transport-mode-btn, .mode-btn").forEach((btn) => {
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
        if (selectedProfileTypeChoice === "cargo" && choixUniteFait) {
            try { appliquerTransportLie(); } catch (e) { /* section absente */ }
        }
        console.log("[modif] annonce", editingOfferId, "chargee dans le formulaire");
    }

    // Clics du choix d'unite de prix (cargo) — delegation unique
    document.addEventListener("click", (ev) => {
        const btnUnite = ev.target.closest(".cargo-unit-btn");
        if (btnUnite) {
            ev.preventDefault();
            btnUnite.closest(".segment")?.classList.remove("is-error");
            const nouvelleUnite = btnUnite.dataset.unit === "cbm" ? "cbm" : "kg";
            // Changer d'unite change le SENS du montant : on ne garde pas
            // « 99 » saisi au CBM comme s'il valait 99 par kilo.
            if (nouvelleUnite !== selectedPriceUnit) {
                const champPrix = document.getElementById("price");
                if (champPrix) champPrix.value = "";
            }
            choisirUnitePrix(nouvelleUnite);
            return;
        }
        if (ev.target.closest("#price-unit-back")) { ev.preventDefault(); afficherChoixUnitePrix(); }
    });

    function bindEvents() {
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

        const refusedTrigger = document.getElementById("openRefusedColisBtn");
        refusedTrigger?.addEventListener("click", () => {
            refusedTrigger.setAttribute("aria-expanded", "true");
            openDialog(refusedOverlay, document.getElementById("close-refused-modal"));
        });
        // Échap, croix, fond et « Valider » passent tous par closeDialog :
        // l'état ouvert du déclencheur suit la fermeture réelle (C-24).
        refusedOverlay?.addEventListener("cc-dialog-closed", () => {
            refusedTrigger?.setAttribute("aria-expanded", "false");
        });

        const toggleRefusedCard = (card) => {
            if (!card) return;
            const value = card.getAttribute("data-value");
            card.classList.toggle("selected");
            const actif = card.classList.contains("selected");
            card.setAttribute("aria-checked", actif ? "true" : "false");
            if (actif) {
                if (!refusedSelections.includes(value)) refusedSelections.push(value);
            } else {
                const i = refusedSelections.indexOf(value);
                if (i >= 0) refusedSelections.splice(i, 1);
            }
        };

        refusedGrid?.addEventListener("click", (e) => {
            const removeBtn = e.target.closest(".option-remove");
            if (removeBtn) {
                e.stopPropagation();
                removeTypeCard(removeBtn.closest(".option-card"));
                return;
            }
            const card = e.target.closest(".option-card");
            if (!card) return;
            toggleRefusedCard(card);
        });

        refusedGrid?.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            if (e.target.closest(".option-remove")) return;
            const card = e.target.closest(".option-card");
            if (!card) return;
            e.preventDefault();
            toggleRefusedCard(card);
        });

        // Toute ligne ajoutee doit pouvoir etre retiree. Un type personnalise
        // pose sans bouton de suppression restait dans la grille jusqu'au
        // rechargement : l'ajout n'avait aucune contre-action.
        const addRemoveTypeButton = (card, value) => {
            if (!card || card.querySelector(".option-remove")) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "option-remove";
            btn.setAttribute("aria-label", "Supprimer le type " + value);
            btn.title = "Supprimer ce type";
            btn.textContent = "\u00d7";
            card.appendChild(btn);
        };

        const removeTypeCard = (card) => {
            if (!card) return;
            const value = String(card.getAttribute("data-value") || "");
            const i = refusedSelections.indexOf(value);
            if (i >= 0) refusedSelections.splice(i, 1);
            card.remove();
            syncRefusedText();
        };

        toggleRefusedBtn?.addEventListener("click", () => {
            if (refusedGroup) {
                refusedGroup.style.display = refusedGroup.style.display === "flex" ? "none" : "flex";
                newRefusedInput?.focus();
            }
        });

        saveRefusedBtn?.addEventListener("click", () => {
            // La virgule est le SEPARATEUR des types enregistres : un type saisi
            // « Vêtements, chaussures » serait relu comme deux types et affiche
            // en double sur la carte d'offre. On la remplace par une espace.
            const val = String(newRefusedInput?.value || "")
                .replace(/[,\r\n]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (!val) return;
            // Un type deja present ne doit pas etre ajoute une 2e fois (deux
            // cartes identiques = doublon dans le libelle et dans l'envoi).
            const existante = Array.from(refusedGrid?.querySelectorAll(".option-card") || [])
                .find((c) => String(c.getAttribute("data-value") || "").trim().toLowerCase() === val.toLowerCase());
            if (existante) {
                existante.classList.add("selected");
                existante.setAttribute("aria-checked", "true");
                const valeur = String(existante.getAttribute("data-value") || val);
                if (!refusedSelections.includes(valeur)) refusedSelections.push(valeur);
            } else {
                const newCard = document.createElement("div");
                newCard.className = "option-card selected";
                newCard.setAttribute("data-value", val);
                newCard.setAttribute("role", "checkbox");
                newCard.setAttribute("aria-checked", "true");
                newCard.setAttribute("tabindex", "0");
                const circle = document.createElement("span");
                circle.className = "option-circle";
                const label = document.createElement("span");
                label.className = "option-text";
                label.textContent = val;
                newCard.append(circle, label);
                addRemoveTypeButton(newCard, val);
                refusedGrid?.appendChild(newCard);
                refusedSelections.push(val);
            }
            if (newRefusedInput) newRefusedInput.value = "";
            if (refusedGroup) refusedGroup.style.display = "none";
            // L'ajout doit se voir tout de suite dans le resume, pas au moment
            // ou l'on ferme la modale.
            syncRefusedText();
        });

        const syncRefusedText = () => {
            if (refusedText) {
                refusedText.textContent = refusedSelections.length > 0 ? refusedSelections.join(", ") : "Choisir les types refusés";
            }
        };

        validateRefusedBtn?.addEventListener("click", () => {
            closeDialog(refusedOverlay);
            syncRefusedText();
        });
        document.getElementById("close-refused-modal")?.addEventListener("click", () => {
            closeDialog(refusedOverlay);
            syncRefusedText();
        });
        refusedOverlay?.addEventListener("cc-dialog-closed", syncRefusedText);

        // [FIX MODIFICATION] Recharge les types REFUSES enregistres.
        // Sans cette restauration, un simple enregistrement ecrasait
        // refused_colis_types par une chaine vide (la section disparaissait).
        // (Les types ACCEPTES ne sont plus proposes sur cette page : leur champ a
        // ete retire ; une annonce existante garde sa valeur, jamais reecrite.)
        window.ccSetRefusedColisSelections = function (refused) {
            if (!refusedGrid) return;
            refusedSelections.length = 0;
            refusedGrid.querySelectorAll(".option-card").forEach((c) => {
                c.classList.remove("selected");
                c.setAttribute("aria-checked", "false");
            });
            (refused || []).forEach((value) => {
                const clean = String(value || "").trim();
                if (!clean) return;
                let card = Array.from(refusedGrid.querySelectorAll(".option-card"))
                    .find((c) => String(c.getAttribute("data-value")) === clean);
                if (!card) {
                    card = document.createElement("div");
                    card.className = "option-card";
                    card.setAttribute("data-value", clean);
                    card.setAttribute("role", "checkbox");
                    card.setAttribute("aria-checked", "false");
                    card.setAttribute("tabindex", "0");
                    const circle = document.createElement("span");
                    circle.className = "option-circle";
                    const label = document.createElement("span");
                    label.className = "option-text";
                    label.textContent = clean;
                    card.append(circle, label);
                    addRemoveTypeButton(card, clean);
                    refusedGrid.appendChild(card);
                }
                card.classList.add("selected");
                card.setAttribute("aria-checked", "true");
                if (!refusedSelections.includes(clean)) refusedSelections.push(clean);
            });
            if (refusedText) {
                refusedText.textContent = refusedSelections.length
                    ? refusedSelections.join(", ")
                    : "Choisir les types refusés";
            }
        };

        els.form?.addEventListener("submit", (event) => {
            submitTrip(event).catch((error) => {
                console.error("[publication] erreur non gérée :", error);
                showNotice("Impossible de publier pour le moment. Vérifiez votre connexion, puis réessayez.", "danger", true);
            });
        });

        document.getElementById("trip-notice-retry")?.addEventListener("click", () => {
            clearNotice();
            if (els.form?.requestSubmit) els.form.requestSubmit();
            else els.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
        // [MULTI-CURRENCY] Mise à jour du sélecteur de monnaie quand un pays est
        // reellement choisi (evenement "change"), pas a chaque touche tapee : une
        // saisie partielle ("S") ne correspondait a aucun pays et faisait retomber
        // la liste sur les devises par defaut, donc changeait la monnaie en cours.
        els.departure?.addEventListener("change", updateCurrencySelector);
        els.destination?.addEventListener("change", updateCurrencySelector);

        // Alerte immediate depart == arrivee, des que les deux pays sont choisis.
        const syncSameCountryHint = () => {
            const dep = String(els.departure?.value || "").trim();
            const dst = String(els.destination?.value || "").trim();
            const identiques = !!dep && !!dst
                && isValidCountry(dep) && isValidCountry(dst)
                && normalizeCountry(dep) === normalizeCountry(dst);
            document.getElementById("same-country-hint")?.classList.toggle("hidden", !identiques);
        };
        els.departure?.addEventListener("change", syncSameCountryHint);
        els.destination?.addEventListener("change", syncSameCountryHint);

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

        // Sélection du mode de transport (inline dans le formulaire).
        // Selecteur limite a la section transport : les boutons « Prix au kilo / CBM »
        // portent aussi .transport-mode-btn et mettaient selectedTransportMode a undefined.
        document.querySelectorAll("#transport-mode-section .transport-mode-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                btn.closest(".segment")?.classList.remove("is-error");
                document.querySelectorAll("#transport-mode-section .transport-mode-btn").forEach(b => {
                    b.classList.remove("selected");
                    b.setAttribute("aria-pressed", "false");
                });
                btn.classList.add("selected");
                btn.setAttribute("aria-pressed", "true");
                selectedTransportMode = btn.dataset.mode;
            });
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
                if (i === idx) d.setAttribute("aria-current", "step");
                else d.removeAttribute("aria-current");
            });
            // Remonte au début du formulaire (sous le header sticky)
            const t = form.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + t.top - 80, behavior: "smooth" });
        }

        function showErr(box, message) {
            if (!box) return;
            box.innerHTML = ERROR_ICON + "<span>" + escapeHtml(message) + "</span>";
            box.classList.remove("hidden");
        }

        function markError(el) {
            markFieldError(el);
        }

        // Fait défiler la page jusqu'à un élément en tenant compte du header fixe
        // (offset haut) et de la marge basse (mascotte ~110 px / nav mobile 64 px).
        function scrollToField(el) {
            if (!el) return;
            const HEADER_OFFSET = 96;
            const rect = el.getBoundingClientRect();
            const top = window.scrollY + rect.top - HEADER_OFFSET;
            window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }

        // Effet doré temporaire (~1,5 s) sur un conteneur de boutons à choisir.
        function pulseGroup(el) {
            if (!el) return;
            el.classList.remove("gold-pulse");
            void el.offsetWidth; // relance l'animation si elle était déjà en cours
            el.classList.add("gold-pulse");
            setTimeout(() => el.classList.remove("gold-pulse"), 1500);
        }

        // UN SEUL champ à la fois : scroll + focus. Pour un GROUPE de boutons
        // (transport, profil, monnaie), on pulse le conteneur au lieu d'un champ texte.
        function focusField(el, groupEl) {
            if (!el) return;
            scrollToField(groupEl || el);
            setTimeout(() => {
                try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
                if (groupEl) pulseGroup(groupEl);
                else if (el.tagName === "BUTTON") pulseGroup(el);
            }, 120);
        }

        function goNext() {
            // Étape 1 (Voyage) — UN SEUL champ manquant à la fois, dans l'ordre du formulaire.
            if (current === 0) {
                const errBox1 = document.getElementById("step1-errors");
                if (errBox1) errBox1.classList.add("hidden");

                // 1) Choix de profil (en tête de l'étape) — groupe de boutons.
                if (!selectedProfileTypeChoice) {
                    showErr(errBox1, "Choisissez votre profil : Voyageur simple ou Entreprise / Cargo");
                    const grid = document.querySelector("#profile-choice-section .profile-select-grid");
                    const firstChoice = document.getElementById("btn-traveler-choice");
                    focusField(firstChoice, grid);
                    return;
                }

                // 2) Pays de départ / arrivée + date — le premier champ vide.
                const req = [
                    { id: "departure", msg: "Indiquez le pays de départ" },
                    { id: "destination", msg: "Indiquez le pays d'arrivée" },
                    { id: "date-depart", msg: "Indiquez la date du voyage" }
                ];
                for (const it of req) {
                    const el = document.getElementById(it.id);
                    if (el && !el.value.trim()) {
                        showErr(errBox1, it.msg);
                        markError(el);
                        focusField(el);
                        return;
                    }
                }

                // 2 ter) Depart et arrivee identiques : la regle etait deja connue
                // mais n'etait signalee qu'a l'envoi final, apres toutes les etapes.
                // On bloque des l'etape 1 (et l'alerte s'affiche aussi en direct).
                const paysDep = String(document.getElementById("departure")?.value || "").trim();
                const paysDst = String(document.getElementById("destination")?.value || "").trim();
                if (paysDep && paysDst && isValidCountry(paysDep) && isValidCountry(paysDst)
                    && normalizeCountry(paysDep) === normalizeCountry(paysDst)) {
                    showErr(errBox1, "Le pays de départ et le pays d'arrivée doivent être différents.");
                    markError(document.getElementById("destination"));
                    focusField(document.getElementById("destination"));
                    return;
                }

                // 2 bis) Date passee. Le champ porte min=aujourd'hui, mais un
                // type=date accepte une date tapee a la main : le wizard laissait
                // passer une date passee jusqu'a l'envoi, ou le navigateur bloquait
                // alors la soumission sans message (champ dans une etape masquee).
                const dateVoyage = document.getElementById("date-depart");
                if (dateVoyage && dateVoyage.value && dateVoyage.min && dateVoyage.value < dateVoyage.min) {
                    showErr(errBox1, "La date du voyage doit être aujourd'hui ou plus tard.");
                    markError(dateVoyage);
                    focusField(dateVoyage);
                    return;
                }

                // 3) [ENTREPRISE / CARGO] Dates multiples : chaque ligne ajoutée doit être
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
                            showErr(errBox1, invalidMsg);
                            markError(invalidInput);
                            focusField(invalidInput);
                            return;
                        }
                    }
                }
            }
            // Étape 2 (Colis) — UN SEUL champ manquant à la fois (le premier).
            if (current === 1) {
                const kilos = document.getElementById("kilos");
                const price = document.getElementById("price");
                const currency = document.getElementById("price-currency");
                const currencyBtn = document.getElementById("currency-toggle-btn");
                const kilosGroup = document.getElementById("kilos-group");
                const transportSection = document.getElementById("transport-mode-section");
                const priceGroup = document.getElementById("price-group");
                const unitChoice = document.getElementById("cargo-unit-choice");
                const errBox = document.getElementById("step2-errors");
                const k = parseFloat(kilos.value);
                const p = parseFloat(price.value);
                const c = (currency.value || "").trim();

                const kilosVisible = kilosGroup && !kilosGroup.classList.contains("hidden");
                const transportVisible = transportSection && transportSection.style.display !== "none";
                const priceVisible = priceGroup && !priceGroup.classList.contains("hidden");
                const unitVisible = unitChoice && !unitChoice.classList.contains("hidden");
                const kilosManque = kilosVisible && (isNaN(k) || k <= 0);
                const kilosTrop = kilosVisible && !isNaN(k) && k > KILOS_MAX;
                // Cargo : le prix n'est exige qu'une fois l'unite choisie (le champ est
                // cache avant). Avant, un champ invisible bloquait l'etape 2.
                const unitManque = unitVisible && !choixUniteFait;
                // Prix : meme regle qu'a l'envoi (au moins 1 unite). Avant, 0,5
                // passait l'etape 2 puis etait refuse a la toute fin.
                const priceManque = priceVisible && !(p >= 1);
                const deviseManque = priceVisible && !c;
                const transportManque = transportVisible
                    && !transportSection.querySelector(".transport-mode-btn.selected");

                // UN SEUL champ à la fois, dans l'ordre du formulaire.
                const unitSegment = unitChoice ? unitChoice.querySelector(".segment") : null;
                const transportSegment = transportSection ? transportSection.querySelector(".segment") : null;
                unitSegment?.classList.remove("is-error");
                transportSegment?.classList.remove("is-error");
                let target = null;
                let group = null;
                let msg = "";
                if (kilosManque) { target = kilos; msg = "Indiquez le nombre de kilos disponibles"; }
                else if (kilosTrop) { target = kilos; msg = "Maximum " + KILOS_MAX + " kg par offre"; }
                else if (unitManque) { target = unitChoice.querySelector(".cargo-unit-btn"); group = unitChoice; msg = "Choisissez prix au kilo ou prix au CBM"; }
                else if (priceManque) { target = price; msg = "Indiquez un prix d'au moins 1"; }
                else if (deviseManque) { target = currencyBtn; msg = "Choisissez votre monnaie"; }
                else if (transportManque) { target = transportSection.querySelector(".transport-mode-btn"); group = transportSection.querySelector(".segment"); msg = "Choisissez le moyen de transport"; }

                if (target) {
                    if (unitManque && unitSegment) unitSegment.classList.add("is-error");
                    if (transportManque && transportSegment) transportSegment.classList.add("is-error");
                    showErr(errBox, msg);
                    if (transportManque) {
                        focusField(target, group);
                    } else if (target === currencyBtn) {
                        focusField(currencyBtn);
                    } else {
                        markError(target);
                        focusField(target);
                    }
                    return;
                }
                if (errBox) errBox.classList.add("hidden");
            }
            // Étape 3 (Prix spéciaux) — une ligne COMMENCÉE doit être complète.
            // Avant, une ligne sans mode ou sans prix était ignorée en silence à
            // l'envoi : le voyageur croyait avoir ajouté son prix, il n'était
            // jamais enregistré.
            if (current === 2) {
                const errBox3 = document.getElementById("step3-errors");
                const probleme = (typeof window.ccSpecialPricesError === "function")
                    ? window.ccSpecialPricesError() : null;
                if (probleme) {
                    showErr(errBox3, probleme.message);
                    if (probleme.el) {
                        markError(probleme.el);
                        focusField(probleme.el);
                    }
                    return;
                }
                if (errBox3) errBox3.classList.add("hidden");
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

        // Entree dans un champ : le formulaire n'a qu'UN bouton submit (etape 4),
        // donc le navigateur soumettait TOUT depuis n'importe quelle etape — et
        // ouvrait la fenetre de contact alors que le voyage n'etait pas rempli.
        // On fait avancer l'etape courante (les suggestions pays/ville gardent la
        // priorite : elles appellent preventDefault avant nous, en phase bulle).
        form.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" || e.defaultPrevented) return;
            const cible = e.target;
            if (!cible || /^(TEXTAREA|BUTTON)$/.test(cible.tagName)) return;
            const section = cible.closest(".wizard-step");
            if (!section) return;
            const idx = steps.indexOf(section);
            if (idx < 0 || idx >= total - 1) return;
            e.preventDefault();
            section.querySelector(".wizard-next")?.click();
        });

        // Filet de securite : une valeur invalide (date passee, champ requis vide)
        // situee dans une etape masquee ne peut pas etre pointee par le navigateur
        // -> la soumission echouait sans AUCUN message. On affiche l'etape concernee
        // avant que le navigateur ne tente de focaliser le champ.
        form.addEventListener("invalid", (e) => {
            const section = e.target.closest && e.target.closest(".wizard-step");
            if (!section) return;
            const idx = steps.indexOf(section);
            // On compare a l'etape REELLEMENT affichee (pas a `current`) : les deux
            // peuvent diverger (navigation programmatique), et c'est la visibilite
            // du champ qui permet au navigateur de le pointer.
            const affichee = steps.findIndex((s) => s.classList.contains("active"));
            if (idx >= 0 && idx !== affichee) showStep(idx);
        }, true);

        // Acces externe (envoi) : revenir sur une etape precise en cas d'erreur.
        window.ccGoToWizardStep = (idx) => showStep(idx);

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
                yesBtn.setAttribute("aria-pressed", "true");
                noBtn.classList.remove("selected");
                noBtn.setAttribute("aria-pressed", "false");
            });
            noBtn.addEventListener("click", () => {
                panel.classList.add("hidden");
                noBtn.classList.add("selected");
                noBtn.setAttribute("aria-pressed", "true");
                yesBtn.classList.remove("selected");
                yesBtn.setAttribute("aria-pressed", "false");
            });
        }

        showStep(0);
    }

    // Accordéon des bénéfices : ouvert sur bureau, replié à 768, masqué à 360.
    function initBenefitsAccordion() {
        const btn = document.getElementById("benefits-trigger");
        const body = document.getElementById("benefits-body");
        if (!btn || !body) return;
        const mq = window.matchMedia("(max-width: 1080px)");
        let userOpen = false;
        const sync = () => {
            if (!mq.matches) {
                btn.setAttribute("aria-expanded", "true");
                body.classList.add("is-open");
                return;
            }
            btn.setAttribute("aria-expanded", userOpen ? "true" : "false");
            body.classList.toggle("is-open", userOpen);
        };
        btn.addEventListener("click", () => {
            if (!mq.matches) return;
            userOpen = !userOpen;
            sync();
        });
        if (mq.addEventListener) {
            mq.addEventListener("change", () => {
                userOpen = false;
                sync();
            });
        }
        sync();
    }

    async function bootstrap() {
        // Plus de restauration de brouillon : l'ancien mecanisme (cc_trip_draft) n'est
        // plus ecrit par personne et rechargeait EN SILENCE d'anciennes donnees (risque
        // de republier une vieille annonce). On purge la cle residuelle du navigateur.
        try { localStorage.removeItem("cc_trip_draft"); } catch (e) { }
        await window.CCCommon.init("post_trip");

        initDateMin();
        initReveal();
        initBenefitsAccordion();
        initDialogA11y();
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
        console.error("[post_trip] initialisation impossible :", error);
        showNotice("La page n'a pas pu s'initialiser. Vérifiez votre connexion, puis rechargez la page.", "danger", false);
    });
})();
