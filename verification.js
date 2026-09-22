(() => {
    const els = {
        form: document.getElementById("verification-form"),
        firstname: document.getElementById("verification-firstname"),
        lastname: document.getElementById("verification-lastname"),
        country: document.getElementById("verification-country"),
        phonePrefix: document.getElementById("verification-phone-prefix"),
        phoneNumber: document.getElementById("verification-phone-number"),
        idDocument: document.getElementById("verification-id-document"),
        feedback: document.getElementById("verification-feedback"),
        progressValue: document.getElementById("verification-progress-value"),
        progressLabel: document.getElementById("verification-progress-label"),
        progressBar: document.getElementById("verification-progress-bar"),
        missing: document.getElementById("verification-missing"),
        adminMessages: document.getElementById("verification-admin-messages"),
        waitModal: document.getElementById("wait-modal"),
        waitModalBtn: document.getElementById("wait-modal-ok")
    };

    function setFeedback(message = "", isError = true) {
        if (!els.feedback) return;
        els.feedback.textContent = message;
        els.feedback.style.color = isError ? "#ffc8b7" : "#aef6d2";
    }

    function formatMissing(completion) {
        const missing = Array.isArray(completion?.missingFields) ? completion.missingFields : [];
        const labels = [];
        if (missing.includes("phoneNumber")) labels.push("numero de telephone");
        if (missing.includes("identityDocument")) labels.push("piece justificative");
        return labels;
    }

    function renderProgress(user) {
        const completion = window.CCCommon.getProfileCompletion(user);
        const percent = Math.max(0, Math.min(100, Number(completion?.percent || 25)));
        const missing = formatMissing(completion);
        const isVerified = window.CCCommon.isUserVerified(user);

        if (els.progressValue) els.progressValue.textContent = `${percent}%`;
        if (els.progressBar) els.progressBar.style.width = `${percent}%`;
        if (els.progressLabel) {
            els.progressLabel.textContent = isVerified
                ? "Compte verifie"
                : percent >= 75
                    ? "Profil complet - en attente d'approbation admin"
                    : "Profil incomplet";
        }
        if (els.missing) {
            els.missing.textContent = isVerified
                ? "Vos informations sont validees."
                : percent >= 75
                    ? "Votre dossier est en attente d'approbation admin. Vous pouvez mettre a jour vos fichiers ici si necessaire."
                    : `Il manque: ${missing.join(", ")}.`;
        }

        // Pre-fill fields with existing user data
        const fullName = user?.fullName || user?.full_name || "";
        const spaceIdx = fullName.lastIndexOf(" ");
        if (els.firstname && !els.firstname.value) {
            els.firstname.value = spaceIdx > 0 ? fullName.substring(0, spaceIdx) : fullName;
        }
        if (els.lastname && !els.lastname.value) {
            els.lastname.value = spaceIdx > 0 ? fullName.substring(spaceIdx + 1) : "";
        }
        if (els.country && !els.country.value) {
            els.country.value = user?.country || user?.user_metadata?.country || "";
        }
        if (els.phonePrefix && els.phoneNumber) {
            const savedPhone = String(user?.phoneNumber || "").trim();
            if (savedPhone && !els.phoneNumber.value) {
                const parts = savedPhone.split(" ");
                const prefix = parts[0] || "";
                const number = parts.slice(1).join(" ");
                // Sélectionner le bon prefix dans le select
                const opt = Array.from(els.phonePrefix.options).find(o => o.value === prefix);
                if (opt) els.phonePrefix.value = prefix;
                if (number) els.phoneNumber.value = number;
            }
        }
    }

    async function loadAdminMessages() {
        if (!els.adminMessages) return;
        try {
            const resp = await window.CCCommon.api("/api/admin/inbox");
            const items = Array.isArray(resp?.items) ? resp.items : [];
            if (!items.length) {
                els.adminMessages.classList.add("hidden");
                return;
            }

            els.adminMessages.innerHTML = `
                <h4 style="margin-top:1rem;font-size:0.9rem;color:var(--brand-accent);">Messages de l'administration</h4>
                ${items.map(m => `
                    <div class="admin-message-item" style="background: rgba(255,200,183,0.1); border-left: 3px solid #ffc8b7; padding: 0.8rem; margin: 0.5rem 0; border-radius: 4px;">
                        <p style="font-size: 0.85rem; color: #ffc8b7; margin-bottom: 0.2rem;"><strong>Section: ${window.CCCommon.escapeHtml(m.section)}</strong></p>
                        <p style="font-size: 0.9rem;">${window.CCCommon.escapeHtml(m.text)}</p>
                    </div>
                `).join('')}
            `;
            els.adminMessages.classList.remove("hidden");
        } catch (err) {
            console.error("Erreur chargement messages admin:", err);
        }
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Lecture fichier impossible."));
            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    //  VERIFICATION DU NUMERO PAR CODE SMS
    //  Reutilise le meme principe que la page d'annonce (post_trip.js) :
    //  code de demonstration 123456.
    //  Tant que le numero saisi n'est pas verifie, le bouton
    //  "Enregistrer" reste desactive -> plus d'enregistrement silencieux
    //  d'un numero non valide.
    // ============================================================
    const OTP_DEMO_CODE = "123456";

    const phoneState = {
        verified1: false,   // le numero principal est-il verifie ?
        verified2: false    // le second numero (si present) est-il verifie ?
    };

    const pel = {
        sendCode: document.getElementById("verification-send-code"),
        otpSection: document.getElementById("verification-otp-section"),
        otpInput: document.getElementById("verification-otp-code"),
        confirmOtp: document.getElementById("verification-confirm-otp"),
        status: document.getElementById("verification-phone-status"),
        addPhone: document.getElementById("verification-add-phone"),
        wrap2: document.getElementById("verification-phone2-wrap"),
        prefix2: document.getElementById("verification-phone-prefix-2"),
        number2: document.getElementById("verification-phone-number-2"),
        sendCode2: document.getElementById("verification-send-code-2"),
        otpSection2: document.getElementById("verification-otp-section-2"),
        otpInput2: document.getElementById("verification-otp-code-2"),
        confirmOtp2: document.getElementById("verification-confirm-otp-2"),
        status2: document.getElementById("verification-phone-status-2"),
        edit1: document.getElementById("verification-phone-edit"),
        edit2: document.getElementById("verification-phone-edit-2")
    };

    // Numeros tels qu'enregistres (pour savoir si l'utilisateur les a modifies).
    // Remplis dans setupPhoneVerification() car state.user n'existe qu'apres init().
    const savedPhone = { one: "", two: "" };

    function setPhoneStatus(el, text, ok = false) {
        if (!el) return;
        el.textContent = text || "";
        el.style.color = ok ? "#aef6d2" : "#ffc8b7";
    }

    // Compose la valeur complete (indicatif + numero) d'un champ.
    function fullNumber(prefixEl, numberEl) {
        const pre = String(prefixEl?.value || "").trim();
        const num = String(numberEl?.value || "").replace(/\s+/g, " ").trim();
        return num ? `${pre} ${num}`.trim() : "";
    }

    // Verrouille / deverrouille un numero : verrouille = lecture seule + crayon dispo.
    function lockNumber(prefixEl, numberEl, editBtn, locked) {
        if (numberEl) {
            numberEl.readOnly = !!locked;
            numberEl.style.cursor = locked ? "default" : "";
        }
        if (prefixEl) prefixEl.disabled = !!locked;
        if (editBtn) editBtn.classList.toggle("is-locked", !!locked);
        if (editBtn) editBtn.title = locked ? "Modifier ce numero" : "Terminer la modification";
    }

    // Un numero est-il identique a celui deja enregistre ?
    function isSameAsSaved(prefixEl, numberEl, savedValue) {
        const cur = fullNumber(prefixEl, numberEl).replace(/\s/g, "");
        const ref = String(savedValue || "").replace(/\s/g, "");
        return Boolean(ref) && cur === ref;
    }

    // Le bouton "Enregistrer" est bloque uniquement si un numero a ETE MODIFIE
    // sans avoir ete re-verifie. Un numero identique a l'enregistre ne demande rien.
    function refreshSubmitState() {
        const btn = els.form?.querySelector('button[type="submit"]');
        if (!btn) return;

        const num1 = fullNumber(els.phonePrefix, els.phoneNumber);
        const changed1 = num1 && !isSameAsSaved(els.phonePrefix, els.phoneNumber, savedPhone.one);
        const needs1 = Boolean(changed1) && !phoneState.verified1;

        const num2 = fullNumber(pel.prefix2, pel.number2);
        const changed2 = num2 && !isSameAsSaved(pel.prefix2, pel.number2, savedPhone.two);
        const needs2 = Boolean(changed2) && !phoneState.verified2;

        const needsCheck = needs1 || needs2;
        btn.disabled = needsCheck;
        btn.title = needsCheck ? "Verifiez d'abord le numero modifie avec le code recu par SMS" : "";
        if (!needsCheck && btn.dataset.saving !== "1") btn.textContent = "Enregistrer les modifications";
    }

    function bindVerifyButton(prefixEl, numberEl, sendBtn, section, input, confirmBtn, statusEl, flagKey) {
        sendBtn?.addEventListener("click", () => {
            const local = String(numberEl?.value || "").replace(/\D/g, "");
            if (local.length < 6) {
                setPhoneStatus(statusEl, "Saisissez d'abord un numero valide.");
                numberEl?.focus();
                return;
            }
            const full = `${String(prefixEl?.value || "").trim()} ${local}`;
            section?.classList.remove("hidden");
            setPhoneStatus(statusEl, `Code envoye au ${full}.`);
            // Le bouton indique que le code est parti (plus de double envoi a l'aveugle)
            sendBtn.disabled = true;
            sendBtn.textContent = "Code envoye";
            // Simulation identique au reste du site (post_trip.js)
            window.alert(`SIMULATION : Code SMS envoye au ${full}\nCode : ${OTP_DEMO_CODE}`);
            input?.focus();
        });

        confirmBtn?.addEventListener("click", () => {
            const code = String(input?.value || "").trim();
            if (code !== OTP_DEMO_CODE) {
                phoneState[flagKey] = false;
                setPhoneStatus(statusEl, "Code invalide. Verifiez le code recu par SMS.");
                sendBtn.hidden = false;
                sendBtn.disabled = false;
                sendBtn.textContent = "Renvoyer un code";
                refreshSubmitState();
                return;
            }
            phoneState[flagKey] = true;
            if (input) input.value = "";
            section?.classList.add("hidden");
            // Numero verifie : le bouton disparait (plus d'envoi possible, aucun
            // libelle "verifie" affiche, comme demande).
            sendBtn.hidden = true;
            sendBtn.disabled = true;
            setPhoneStatus(statusEl, "");
            refreshSubmitState();
        });
    }

    // Clic sur le crayon : deverrouille / reverrouille le champ.
    function bindEditButton(prefixEl, numberEl, editBtn, flagKey, savedValue) {
        editBtn?.addEventListener("click", () => {
            const locked = numberEl?.readOnly !== false;
            if (locked) {
                // deverrouillage : l'utilisateur peut saisir
                lockNumber(prefixEl, numberEl, editBtn, false);
                numberEl?.focus();
                setPhoneStatus(flagKey === "verified1" ? pel.status : pel.status2,
                               "Modifiez le numero puis enregistrez. Un code sera demande s'il change.");
                phoneState[flagKey] = false;
                if (flagKey === "verified1" && pel.sendCode) {
                    pel.sendCode.hidden = false; pel.sendCode.disabled = false;
                    pel.sendCode.textContent = "Envoyer un code";
                }
                if (flagKey === "verified2" && pel.sendCode2) {
                    pel.sendCode2.hidden = false; pel.sendCode2.disabled = false;
                    pel.sendCode2.textContent = "Envoyer un code";
                }
                pel.otpSection?.classList.add("hidden");
                pel.otpSection2?.classList.add("hidden");
            } else {
                // reverrouillage : si le numero est inchange, on le considere valide
                lockNumber(prefixEl, numberEl, editBtn, true);
                const st = flagKey === "verified1" ? pel.status : pel.status2;
                if (isSameAsSaved(prefixEl, numberEl, savedValue)) {
                    phoneState[flagKey] = true;
                    const sb = flagKey === "verified1" ? pel.sendCode : pel.sendCode2;
                    if (sb) { sb.hidden = true; sb.disabled = true; }
                    setPhoneStatus(st, "");
                }
            }
            refreshSubmitState();
        });
    }

    function setupPhoneVerification() {
        // Ici la session est chargee : on memorise les numeros de reference.
        savedPhone.one = String(window.CCCommon.state.user?.phoneNumber || "").trim();
        savedPhone.two = String(window.CCCommon.state.user?.phoneNumber2 || "").trim();

        // le select du 2e numero reprend la meme liste que le premier
        if (pel.prefix2 && els.phonePrefix) {
            pel.prefix2.innerHTML = els.phonePrefix.innerHTML;
        }

        bindVerifyButton(els.phonePrefix, els.phoneNumber, pel.sendCode, pel.otpSection,
                         pel.otpInput, pel.confirmOtp, pel.status, "verified1");
        bindVerifyButton(pel.prefix2, pel.number2, pel.sendCode2, pel.otpSection2,
                         pel.otpInput2, pel.confirmOtp2, pel.status2, "verified2");

        bindEditButton(els.phonePrefix, els.phoneNumber, pel.edit1, "verified1", savedPhone.one);
        bindEditButton(pel.prefix2, pel.number2, pel.edit2, "verified2", savedPhone.two);

        // Afficher le second numero
        pel.addPhone?.addEventListener("click", () => {
            if (!pel.wrap2) return;
            const hidden = pel.wrap2.classList.toggle("hidden");
            // LIMITE : un seul numero supplementaire (2 au total).
            // Le bouton disparait des que le 2e numero est affiche.
            pel.addPhone.hidden = !hidden;
            if (!hidden) {
                pel.number2?.focus();
                if (pel.edit2) pel.edit2.hidden = false;
            }
            else {
                // retirer = on oublie la verification du 2e numero
                phoneState.verified2 = false;
                if (pel.number2) pel.number2.value = "";
                if (pel.otpInput2) pel.otpInput2.value = "";
                pel.otpSection2?.classList.add("hidden");
                setPhoneStatus(pel.status2, "");
            }
        });

        // Reprise du numero deja enregistre : il est considere comme verifie
        // (sinon l'utilisateur devrait le re-valider a chaque visite).
        const saved = String(window.CCCommon.state.user?.phoneNumber || "").trim();
        if (saved) {
            // Numero deja enregistre : verrouille en lecture seule, aucun message affiche.
            // Le crayon permet de le deverrouiller pour le modifier.
            phoneState.verified1 = true;
            if (pel.sendCode) { pel.sendCode.hidden = true; pel.sendCode.disabled = true; }
            lockNumber(els.phonePrefix, els.phoneNumber, pel.edit1, true);
            setPhoneStatus(pel.status, "");
        } else {
            if (pel.edit1) pel.edit1.hidden = true;   // rien a modifier tant que rien n'est enregistre
        }

        // Second numero deja enregistre : on rouvre le bloc et on le remplit.
        const saved2 = String(window.CCCommon.state.user?.phoneNumber2 || "").trim();
        if (saved2 && pel.wrap2 && pel.number2) {
            const parts2 = saved2.split(" ");
            const pre2 = parts2[0] || "";
            const loc2 = parts2.slice(1).join(" ");
            if (pel.prefix2) {
                const o2 = Array.from(pel.prefix2.options).find(o => o.value === pre2);
                if (o2) pel.prefix2.value = pre2;
            }
            pel.number2.value = loc2;
            pel.wrap2.classList.remove("hidden");
            // LIMITE : maximum 2 numeros -> le bouton d'ajout disparait
            if (pel.addPhone) pel.addPhone.hidden = true;
            phoneState.verified2 = true;
            if (pel.sendCode2) { pel.sendCode2.hidden = true; pel.sendCode2.disabled = true; }
            lockNumber(pel.prefix2, pel.number2, pel.edit2, true);
            setPhoneStatus(pel.status2, "");
        }

        els.phoneNumber?.addEventListener("input", () => {
            // modifier le numero invalide la verification precedente
            const current = `${String(els.phonePrefix?.value || "").trim()} ${String(els.phoneNumber?.value || "").trim()}`.trim();
            if (current !== saved && phoneState.verified1) {
                phoneState.verified1 = false;
                if (pel.sendCode) { pel.sendCode.hidden = false; pel.sendCode.disabled = false; pel.sendCode.textContent = "Envoyer un code"; }
                setPhoneStatus(pel.status, "");
            }
            refreshSubmitState();
        });
        els.phonePrefix?.addEventListener("change", () => {
            if (phoneState.verified1) {
                phoneState.verified1 = false;
                if (pel.sendCode) { pel.sendCode.hidden = false; pel.sendCode.disabled = false; pel.sendCode.textContent = "Envoyer un code"; }
                setPhoneStatus(pel.status, "");
            }
            refreshSubmitState();
        });

        refreshSubmitState();
    }

    async function submitVerification(event) {
        event.preventDefault();
        if (!window.CCCommon.requireAuth("verification.html")) return;

        const body = {};

        // Prénom + Nom → fullName
        const firstname = String(els.firstname?.value || "").trim();
        const lastname = String(els.lastname?.value || "").trim();
        if (firstname && lastname) {
            body.fullName = `${firstname} ${lastname}`;
        } else if (firstname) {
            body.fullName = firstname;
        }

        // Pays de résidence
        const country = String(els.country?.value || "").trim();
        if (country) {
            // Valider que le pays est dans la liste officielle
            const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const isValid = (window.CCCommon.COUNTRY_OPTIONS || []).some(c => norm(c) === norm(country));
            if (!isValid) {
                setFeedback("Veuillez choisir un pays valide dans la liste.");
                return;
            }
            body.country = country;
        }

        const prefix = String(els.phonePrefix?.value || "+33").trim();
        const number = String(els.phoneNumber?.value || "").trim();
        if (number) {
            // Un numero IDENTIQUE a celui deja enregistre ne demande aucun code.
            // Seul un numero MODIFIE doit etre re-verifie (couvre aussi la
            // soumission au clavier / avec Entree).
            const changed1 = !isSameAsSaved(els.phonePrefix, els.phoneNumber, savedPhone.one);
            if (changed1 && !phoneState.verified1) {
                setFeedback("Numero modifie : verifiez-le avec le code recu par SMS avant d'enregistrer.");
                return;
            }
            body.phoneNumber = `${prefix} ${number}`;
        }

        // Second numero (optionnel) : uniquement s'il est saisi ET verifie
        const prefix2 = String(pel.prefix2?.value || "+33").trim();
        const number2 = String(pel.number2?.value || "").trim();
        if (number2) {
            const changed2 = !isSameAsSaved(pel.prefix2, pel.number2, savedPhone.two);
            if (changed2 && !phoneState.verified2) {
                setFeedback("Second numero modifie : verifiez-le avec le code recu par SMS avant d'enregistrer.");
                return;
            }
            body.phoneNumber2 = `${prefix2} ${number2}`;
        }

        const idFile = els.idDocument?.files?.[0];
        if (idFile) {
            if (idFile.size > 2_500_000) throw new Error("Piece justificative trop lourde (max 2.5MB).");
            body.identityDocumentData = await fileToDataUrl(idFile);
        }

        if (!Object.keys(body).length) {
            setFeedback("Ajoutez au moins une information avant d'enregistrer.");
            return;
        }

        const submitBtn = els.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Enregistrement...";

        try {
            const payload = await window.CCCommon.api("/api/users/me/profile", {
                method: "PATCH",
                body
            });

            const token = window.CCCommon.state.token;
            window.CCCommon.setSession(token, payload?.user || null);
            if (body.phoneNumber) phoneState.verified1 = true;
            if (body.phoneNumber2) phoneState.verified2 = true;
            renderProgress(payload?.user || null);
            const completion = window.CCCommon.getProfileCompletion(payload?.user || null);

            if (idFile) {
                if (els.waitModal) {
                    els.waitModal.classList.remove("hidden");
                    els.waitModalBtn.onclick = () => {
                        els.waitModal.classList.add("hidden");
                        const next = window.CCCommon.nextPath("dashboard.html");
                        const safeNext = String(next || "").toLowerCase().includes("verification.html") ? "dashboard.html" : next;
                        window.location.href = safeNext;
                    };
                } else {
                    window.alert("Vos informations ont été enregistrées. Délai d'analyse : 5-10 minutes. Vérifiez vos messages.");
                    window.location.href = "dashboard.html";
                }
            } else if (completion.percent >= 75) {
                const next = window.CCCommon.nextPath("dashboard.html");
                const safeNext = String(next || "").toLowerCase().includes("verification.html") ? "dashboard.html" : next;
                window.location.href = safeNext;
            } else {
                setFeedback("Profil mis à jour.", false);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    function bindEvents() {
        els.form?.addEventListener("submit", (event) => {
            submitVerification(event).catch((error) => {
                setFeedback(error.message || "Enregistrement impossible.");
            });
        });
    }

    async function bootstrap() {
        await window.CCCommon.init("verification");
        if (!window.CCCommon.requireAuth("verification.html")) return;
        renderProgress(window.CCCommon.state.user);
        await loadAdminMessages();

        // Populate country datalist
        const countryList = document.getElementById("verification-country-list");
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        if (countryList && countryOptions.length) {
            countryList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }

        setupPhoneVerification();

        bindEvents();
    }

    bootstrap().catch((error) => {
        setFeedback(error.message || "Initialisation impossible.");
    });
})();
