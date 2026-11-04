/* Modale officielle « Demande de trajet » — réutilisée sur le dashboard.
   Le balisage et les règles reprennent la modale de results.html
   (deux étapes, plusieurs colis, une devise par colis). */
(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const CC = () => window.CCCommon || {};
    const state = {
        editingId: null,
        step: 1,
        dirty: false,
        trigger: null,
        onSaved: null,
        initialized: false
    };
    let els = {};

    function todayISO() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function normalize(value) {
        return String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    }

    function getUserCurrency() {
        return CC().getUserCurrency ? CC().getUserCurrency() : "EUR";
    }

    function cacheElements() {
        els = {
            modal: $("demand-modal"),
            card: $("demand-modal")?.querySelector(".cc-demand-card"),
            form: $("demand-form"),
            title: $("demand-modal-title"),
            close: $("demand-close"),
            origin: $("demand-origin"),
            cityOrigin: $("demand-city-origin"),
            destination: $("demand-destination"),
            cityDestination: $("demand-city-destination"),
            date: $("demand-date"),
            noDate: $("demand-no-date"),
            prev: $("demand-prev"),
            next: $("demand-next"),
            submit: $("demand-submit"),
            feedback: $("demand-feedback"),
            error: $("demand-error"),
            colisRows: $("demand-colis-rows"),
            addColis: $("demand-add-colis")
        };
    }

    function getBoxes() {
        return els.colisRows ? Array.from(els.colisRows.querySelectorAll(".cc-colis-box")) : [];
    }

    function getBoxName(box) {
        const raw = (box.querySelector(".cc-colis-nom")?.value || "").trim().replace(/\s+/g, " ");
        return raw ? raw.replace(/^./, (char) => char.toLowerCase()) : "";
    }

    function getBoxMode(box) {
        return box.querySelector(".cc-seg-btn.active")?.dataset.mode || "per_kg";
    }

    function boxCurrency(box) {
        return box.dataset.currency || getUserCurrency();
    }

    function setBoxCurrency(box, code) {
        if (!box || !code) return;
        box.dataset.currency = code;
        if (box.__ccPicker) box.__ccPicker.set(code);
    }

    function refreshBoxUi(box) {
        if (!box) return;
        const isKg = getBoxMode(box) === "per_kg";
        const kgField = box.querySelector(".cc-kg-field");
        const qtyField = box.querySelector(".cc-qty-field");
        if (kgField) kgField.hidden = !isKg;
        if (qtyField) qtyField.hidden = isKg;
        const name = getBoxName(box);
        const qtyLabel = box.querySelector(".cc-qty-label");
        if (qtyLabel) {
            qtyLabel.textContent = name ? `Combien de ${name} ?` : "Combien de colis ?";
            box.querySelector(".cc-qty-input")?.setAttribute("aria-label", qtyLabel.textContent);
        }
        const priceInput = box.querySelector(".cc-price-input");
        if (!priceInput) return;
        const raw = (isKg ? box.querySelector(".cc-kg-input")?.value : box.querySelector(".cc-qty-input")?.value) || "";
        const amount = Number(raw);
        const valid = Boolean(raw) && Number.isFinite(amount) && amount > 0;
        if (!valid) priceInput.placeholder = "Ex. 2500";
        else if (isKg) priceInput.placeholder = `pour ${amount} kilo${amount > 1 ? "s" : ""}`;
        else priceInput.placeholder = `pour ${amount} ${name || "colis"}`;
        const priceLabel = box.querySelector(".cc-price-label");
        if (!priceLabel) return;
        const amountText = Number.isInteger(amount) ? String(amount) : amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
        if (!valid) priceLabel.textContent = "Combien proposez-vous ?";
        else if (isKg) priceLabel.textContent = `Combien proposez-vous pour ${amountText} kg${name ? ` de ${name}` : ""} ?`;
        else {
            const plural = amount > 1 && name && !/[sxz]$/i.test(name) ? `${name}s` : name;
            priceLabel.textContent = `Combien proposez-vous pour ${amountText} ${plural || "colis"} ?`;
        }
        priceInput.setAttribute("aria-label", priceLabel.textContent);
    }

    function renumberBoxes() {
        const boxes = getBoxes();
        boxes.forEach((box, index) => {
            box.dataset.colis = String(index + 1);
            const title = box.querySelector(".cc-colis-title");
            if (title) title.textContent = `Colis ${index + 1}`;
            const remove = box.querySelector(".cc-colis-del");
            if (remove) remove.hidden = boxes.length <= 1;
        });
    }

    function attachBoxPicker(box) {
        const host = box?.querySelector(".cc-cur-picker");
        if (!host || !window.CCDevise || box.__ccPicker) return box?.__ccPicker;
        box.__ccPicker = window.CCDevise.picker(host, {
            value: box.dataset.currency || "",
            placeholder: "Devise",
            onChange: (code) => { box.dataset.currency = code; }
        });
        return box.__ccPicker;
    }

    function createBox() {
        const first = getBoxes()[0];
        if (!first || !els.colisRows) return null;
        const clone = first.cloneNode(true);
        clone.querySelectorAll("input").forEach((input) => { input.value = ""; });
        clone.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
        clone.querySelectorAll(".cc-seg-btn").forEach((button) => {
            const active = button.dataset.mode === "per_kg";
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        clone.querySelectorAll(".cc-cur-picker").forEach((host) => { host.innerHTML = ""; });
        delete clone.__ccPicker;
        delete clone.dataset.currency;
        els.colisRows.appendChild(clone);
        renumberBoxes();
        attachBoxPicker(clone);
        refreshBoxUi(clone);
        syncDemandCurrencies();
        return clone;
    }

    function removeBox(box) {
        if (!box || getBoxes().length <= 1) return;
        box.remove();
        renumberBoxes();
    }

    function demandCurrencyOptions() {
        if (!window.CCDevise?.optionsForCountries) return [];
        return window.CCDevise.optionsForCountries(els.origin?.value, els.destination?.value, {
            requireKnown: true,
            fallback: getUserCurrency()
        });
    }

    function syncDemandCurrencies() {
        const options = demandCurrencyOptions();
        const allowed = options.map((option) => option.value);
        getBoxes().forEach((box) => {
            const picker = attachBoxPicker(box);
            if (!picker) return;
            const current = boxCurrency(box);
            const list = current && !allowed.includes(current)
                ? [{ value: current, label: "Devise choisie" }].concat(options)
                : options;
            picker.setOptions(list);
            if (!picker.get()) picker.set(allowed[0] || current || "");
            if (picker.get()) box.dataset.currency = picker.get();
        });
    }

    function showError(message, field) {
        if (els.error) {
            els.error.textContent = message;
            els.error.hidden = !message;
        }
        if (field) {
            field.classList.add("is-invalid");
            field.focus?.();
        }
    }

    function clearError() {
        if (els.error) {
            els.error.textContent = "";
            els.error.hidden = true;
        }
        els.form?.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
    }

    function goToStep(step) {
        state.step = step;
        els.form?.querySelectorAll(".cc-step").forEach((section) => {
            section.classList.toggle("active", Number(section.dataset.step) === step);
        });
        els.modal?.querySelectorAll(".cc-wizard-step").forEach((element) => {
            const number = Number(element.dataset.dstep);
            element.classList.toggle("active", number === step);
            element.classList.toggle("done", number < step);
            const dot = element.querySelector(".cc-wizard-dot");
            if (dot) dot.textContent = number < step ? "✓" : String(number);
        });
        els.modal?.querySelectorAll(".cc-wizard-line i").forEach((bar) => {
            bar.style.width = step >= 2 ? "100%" : "0%";
        });
        if (els.next) els.next.hidden = step >= 2;
        if (els.submit) els.submit.hidden = step < 2;
        if (els.prev) els.prev.hidden = step <= 1;
        clearError();
    }

    function setNoDateActive(active) {
        if (!els.noDate) return;
        els.noDate.classList.toggle("active", Boolean(active));
        els.noDate.setAttribute("aria-pressed", active ? "true" : "false");
    }

    function resetForm() {
        state.editingId = null;
        state.step = 1;
        state.dirty = false;
        if (els.title) els.title.textContent = "Demande de trajet";
        if (els.submit) {
            els.submit.textContent = "Faire la demande";
            els.submit.disabled = false;
            els.submit.hidden = true;
        }
        if (els.feedback) els.feedback.hidden = true;
        [els.origin, els.cityOrigin, els.destination, els.cityDestination, els.date].forEach((input) => {
            if (!input) return;
            input.value = "";
            input.classList.remove("is-invalid");
        });
        if (els.date) els.date.min = todayISO();
        setNoDateActive(false);

        const boxes = getBoxes();
        boxes.slice(1).forEach((box) => box.remove());
        const first = getBoxes()[0];
        if (first) {
            first.querySelectorAll("input").forEach((input) => { input.value = ""; });
            first.querySelectorAll(".cc-seg-btn").forEach((button) => {
                const active = button.dataset.mode === "per_kg";
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            first.querySelectorAll(".cc-cur-picker").forEach((host) => { host.innerHTML = ""; });
            delete first.__ccPicker;
            delete first.dataset.currency;
            refreshBoxUi(first);
        }
        renumberBoxes();
        clearError();
        goToStep(1);
        attachBoxPicker(first);
        syncDemandCurrencies();
    }

    function parcelItems(parcel) {
        if (Array.isArray(parcel.items) && parcel.items.length) return parcel.items;
        return [{
            item_type: parcel.item_type || parcel.description || "",
            weight_kg: parcel.weight_kg ?? null,
            quantity: parcel.quantity ?? null,
            price_mode: parcel.price_mode || ((parcel.weight_kg ?? null) !== null ? "per_kg" : null),
            max_price_per_kg: parcel.max_price_per_kg ?? null,
            max_price_total: parcel.max_price_total ?? null,
            currency: parcel.currency || null
        }];
    }

    function applyParcel(parcel, { editing } = {}) {
        if (!parcel) return;
        if (els.origin) els.origin.value = parcel.origin || "";
        if (els.cityOrigin) els.cityOrigin.value = parcel.origin_city || parcel.city_origin || "";
        if (els.destination) els.destination.value = parcel.destination || "";
        if (els.cityDestination) els.cityDestination.value = parcel.destination_city || parcel.city_destination || "";
        if (els.date) {
            const raw = parcel.needed_by_date ? String(parcel.needed_by_date).slice(0, 10) : "";
            // Republier ne remet pas une échéance déjà passée.
            els.date.value = (!editing && raw && raw < todayISO()) ? "" : raw;
        }
        setNoDateActive(false);

        const items = parcelItems(parcel);
        while (getBoxes().length < items.length) {
            if (!createBox()) break;
        }
        getBoxes().forEach((box, index) => {
            const item = items[index];
            if (!item) return;
            const hasKg = item.weight_kg !== null && item.weight_kg !== undefined;
            const hasQty = item.quantity !== null && item.quantity !== undefined;
            const isKg = item.price_mode === "per_kg" || (hasKg && !hasQty);
            box.querySelectorAll(".cc-seg-btn").forEach((button) => {
                const active = button.dataset.mode === (isKg ? "per_kg" : "total");
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
            const name = box.querySelector(".cc-colis-nom");
            if (name) name.value = item.item_type || "";
            const kg = box.querySelector(".cc-kg-input");
            if (kg) kg.value = hasKg ? item.weight_kg : "";
            const qty = box.querySelector(".cc-qty-input");
            if (qty) qty.value = hasQty ? item.quantity : "";
            const price = box.querySelector(".cc-price-input");
            const priceValue = isKg ? item.max_price_per_kg : item.max_price_total;
            if (price) price.value = priceValue === null || priceValue === undefined ? "" : priceValue;
            if (item.currency) setBoxCurrency(box, item.currency);
            refreshBoxUi(box);
        });
        renumberBoxes();
        syncDemandCurrencies();
        goToStep(1);
    }

    function validateStep1() {
        clearError();
        const origin = els.origin?.value.trim() || "";
        const destination = els.destination?.value.trim() || "";
        if (!origin) {
            showError("Indiquez le pays de départ pour continuer.", els.origin);
            return false;
        }
        if (!destination) {
            showError("Indiquez le pays d'arrivée pour continuer.", els.destination);
            return false;
        }
        if (normalize(origin) === normalize(destination)) {
            showError("Le pays de départ et le pays d'arrivée doivent être différents.", els.destination);
            return false;
        }
        const date = els.date?.value || "";
        if (date && date < todayISO()) {
            showError("La date limite doit être aujourd'hui ou plus tard.", els.date);
            return false;
        }
        return true;
    }

    function validateColisStep() {
        clearError();
        const boxes = getBoxes();
        if (!boxes.length) {
            showError("Ajoutez au moins un colis.");
            return false;
        }
        for (let index = 0; index < boxes.length; index += 1) {
            const box = boxes[index];
            const isKg = getBoxMode(box) === "per_kg";
            const valueField = box.querySelector(isKg ? ".cc-kg-input" : ".cc-qty-input");
            const raw = valueField?.value || "";
            const value = Number(raw);
            if (!raw || !Number.isFinite(value) || value <= 0 || (!isKg && !Number.isInteger(value))) {
                showError(isKg
                    ? `Indiquez le poids du colis n°${index + 1} (en kilos).`
                    : `Indiquez combien de colis pour le colis n°${index + 1}.`, valueField);
                return false;
            }
            const priceField = box.querySelector(".cc-price-input");
            const priceRaw = priceField?.value;
            if (priceRaw !== undefined && String(priceRaw).trim() !== "" && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
                showError(`Le montant proposé du colis n°${index + 1} n'est pas valide.`, priceField);
                return false;
            }
            if (!boxCurrency(box)) {
                showError(`Choisissez une devise pour le colis n°${index + 1}.`);
                return false;
            }
        }
        return true;
    }

    function buildPayload() {
        const boxes = getBoxes();
        const items = boxes.map((box) => {
            const isKg = getBoxMode(box) === "per_kg";
            const name = getBoxName(box);
            const rawValue = (isKg ? box.querySelector(".cc-kg-input") : box.querySelector(".cc-qty-input"))?.value;
            const value = Number(rawValue);
            const priceRaw = box.querySelector(".cc-price-input")?.value;
            const hasPrice = priceRaw !== undefined && String(priceRaw).trim() !== "";
            const price = hasPrice ? Number(priceRaw) : null;
            return {
                currency: boxCurrency(box),
                item_type: name || null,
                price_mode: hasPrice ? (isKg ? "per_kg" : "total") : null,
                weight_kg: isKg ? value : null,
                quantity: isKg ? null : value,
                max_price_per_kg: hasPrice && isKg ? price : null,
                max_price_total: hasPrice && !isKg ? price : null
            };
        });
        const first = items[0] || {};
        const origin = els.origin?.value.trim() || "";
        const destination = els.destination?.value.trim() || "";
        const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0);
        const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        return {
            title: `Demande ${origin} -> ${destination}`,
            origin,
            destination,
            origin_city: els.cityOrigin?.value.trim() || null,
            destination_city: els.cityDestination?.value.trim() || null,
            weight_kg: totalWeight > 0 ? totalWeight : null,
            quantity: totalQuantity > 0 ? totalQuantity : null,
            needed_by_date: els.date?.value || null,
            currency: first.currency || getUserCurrency(),
            item_type: first.item_type || null,
            price_mode: first.price_mode,
            max_price_per_kg: first.max_price_per_kg ?? null,
            max_price_total: first.max_price_total ?? null,
            items
        };
    }

    async function submitDemand() {
        if (!validateStep1()) {
            goToStep(1);
            return;
        }
        if (!validateColisStep()) return;
        const payload = buildPayload();
        const originalLabel = state.editingId ? "Enregistrer" : "Faire la demande";
        try {
            clearError();
            if (els.submit) {
                els.submit.disabled = true;
                els.submit.textContent = "Envoi…";
            }
            if (!window.ccSupabase) throw new Error("Connexion Supabase indisponible.");
            const userId = CC().state?.user?.id;
            if (!userId) throw new Error("Vous devez être connecté pour faire une demande.");
            const result = state.editingId
                ? await window.ccSupabase.from("parcel_requests")
                    .update(payload)
                    .eq("id", state.editingId)
                    .eq("user_id", userId)
                    .select("id")
                : await window.ccSupabase.from("parcel_requests")
                    .insert({ user_id: userId, ...payload, status: "pending" })
                    .select("id");
            if (result.error) throw result.error;
            if (!result.data || !result.data.length) {
                throw new Error(state.editingId
                    ? "Modification non enregistrée (session expirée ou demande introuvable)."
                    : "Demande non enregistrée (session expirée ou droits insuffisants).");
            }
            state.dirty = false;
            if (els.feedback) {
                els.feedback.textContent = state.editingId
                    ? "Demande mise à jour."
                    : "Un voyageur vous contactera.";
                els.feedback.hidden = false;
            }
            if (els.submit) els.submit.hidden = true;
            if (els.prev) els.prev.hidden = true;
            const saved = state.onSaved;
            if (typeof saved === "function") {
                try { saved(); } catch (error) { console.warn("Rafraîchissement du dashboard impossible:", error); }
            }
            window.setTimeout(() => close(), 1500);
        } catch (error) {
            console.error("Erreur soumission demande :", error);
            if (els.submit) {
                els.submit.disabled = false;
                els.submit.textContent = originalLabel;
            }
            showError(error?.message || "Impossible de soumettre la demande. Réessayez.");
        }
    }

    function openModal() {
        if (!els.modal) return;
        state.trigger = document.activeElement;
        els.modal.hidden = false;
        document.documentElement.classList.add("cc-modal-open");
        if (els.date) els.date.min = todayISO();
        els.origin?.focus();
    }

    function close() {
        if (!els.modal) return;
        els.modal.hidden = true;
        document.documentElement.classList.remove("cc-modal-open");
        state.dirty = false;
        state.onSaved = null;
        const restore = state.trigger;
        state.trigger = null;
        if (restore && typeof restore.focus === "function" && document.contains(restore)) restore.focus();
    }

    function openCreate(options = {}) {
        cacheElements();
        resetForm();
        if (options.prefill) applyParcel(options.prefill, { editing: false });
        state.onSaved = options.onSaved || null;
        openModal();
    }

    function openEdit(parcel, options = {}) {
        cacheElements();
        resetForm();
        if (!parcel) return;
        state.editingId = parcel.id;
        if (els.title) els.title.textContent = "Modifier ma demande";
        if (els.submit) els.submit.textContent = "Enregistrer";
        applyParcel(parcel, { editing: true });
        state.onSaved = options.onSaved || null;
        openModal();
    }

    function trapFocus(event) {
        if (event.key !== "Tab" || !els.card) return;
        const focusables = Array.from(els.card.querySelectorAll(
            'button:not([disabled]):not([hidden]), input:not([disabled]):not([type="hidden"]), select, textarea, [href], [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bind() {
        els.close?.addEventListener("click", close);
        els.modal?.querySelectorAll("[data-demand-close]").forEach((element) => {
            element.addEventListener("click", close);
        });
        els.modal?.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
            }
            trapFocus(event);
        });
        els.form?.addEventListener("submit", (event) => {
            event.preventDefault();
            if (state.step === 1) {
                if (validateStep1()) goToStep(2);
                return;
            }
            submitDemand();
        });
        els.next?.addEventListener("click", () => {
            if (state.step === 1 && validateStep1()) goToStep(2);
        });
        els.prev?.addEventListener("click", () => {
            if (state.step > 1) goToStep(state.step - 1);
        });
        els.addColis?.addEventListener("click", () => {
            createBox();
            state.dirty = true;
            getBoxes().slice(-1)[0]?.querySelector(".cc-colis-nom")?.focus();
        });
        els.colisRows?.addEventListener("click", (event) => {
            const modeButton = event.target.closest(".cc-seg-btn");
            if (modeButton) {
                const box = modeButton.closest(".cc-colis-box");
                box?.querySelectorAll(".cc-seg-btn").forEach((button) => {
                    const active = button === modeButton;
                    button.classList.toggle("active", active);
                    button.setAttribute("aria-pressed", active ? "true" : "false");
                });
                refreshBoxUi(box);
                state.dirty = true;
                return;
            }
            const remove = event.target.closest(".cc-colis-del");
            if (remove) {
                removeBox(remove.closest(".cc-colis-box"));
                state.dirty = true;
            }
        });
        els.colisRows?.addEventListener("input", (event) => {
            const box = event.target.closest(".cc-colis-box");
            if (!box) return;
            event.target.classList.remove("is-invalid");
            refreshBoxUi(box);
        });
        [els.origin, els.destination].forEach((input) => {
            input?.addEventListener("input", syncDemandCurrencies);
            input?.addEventListener("change", syncDemandCurrencies);
        });
        els.noDate?.addEventListener("click", () => {
            const active = !els.noDate.classList.contains("active");
            setNoDateActive(active);
            if (active && els.date) els.date.value = "";
        });
        els.date?.addEventListener("input", () => setNoDateActive(false));
        els.date?.addEventListener("change", () => setNoDateActive(false));
        els.form?.addEventListener("input", (event) => {
            if (event.target.closest("input, select, textarea")) state.dirty = true;
        });
        els.form?.addEventListener("change", (event) => {
            if (event.target.closest("input, select, textarea")) state.dirty = true;
        });
        getBoxes().forEach((box) => {
            attachBoxPicker(box);
            refreshBoxUi(box);
        });
    }

    function init() {
        if (state.initialized) return;
        cacheElements();
        if (!els.modal) return;
        const list = $("demand-country-list");
        if (list) {
            const options = CC().COUNTRY_OPTIONS || [];
            list.innerHTML = options.map((country) => `<option value="${CC().escapeHtml ? CC().escapeHtml(country) : country}"></option>`).join("");
        }
        bind();
        state.initialized = true;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.CCDemandModal = {
        init,
        openCreate,
        openEdit,
        close,
        isOpen: () => Boolean(els.modal && !els.modal.hidden)
    };
})();
