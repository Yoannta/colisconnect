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

    // ============================================================
    //  ETAT DU TELEPHONE (logique volontairement simple)
    //  - repos      : champ verrouille, bouton "Envoyer un code" CACHE
    //  - edition    : (clic sur le crayon) champ editable, bouton VISIBLE
    //                 mais GRISE tant que le numero n'a pas reellement change
    //  - modifie    : le numero differe de celui enregistre -> bouton actif
    //  - abandon    : l'utilisateur part ailleurs -> tout revient au repos
    // ============================================================
    const ph = {
        saved1: "", saved2: "",           // numeros de reference (enregistres)
        editing1: false, editing2: false, // en cours de modification ?
        verified1: false, verified2: false,
        sent1: false, sent2: false        // un code a-t-il ete envoye ?
    };

    const pel = {
        sendCode: document.getElementById("verification-send-code"),
        otpSection: document.getElementById("verification-otp-section"),
        otpInput: document.getElementById("verification-otp-code"),
        confirmOtp: document.getElementById("verification-confirm-otp"),
        status: document.getElementById("verification-phone-status"),
        edit1: document.getElementById("verification-phone-edit"),
        addPhone: document.getElementById("verification-add-phone"),
        wrap2: document.getElementById("verification-phone2-wrap"),
        prefix2: document.getElementById("verification-phone-prefix-2"),
        number2: document.getElementById("verification-phone-number-2"),
        sendCode2: document.getElementById("verification-send-code-2"),
        otpSection2: document.getElementById("verification-otp-section-2"),
        otpInput2: document.getElementById("verification-otp-code-2"),
        confirmOtp2: document.getElementById("verification-confirm-otp-2"),
        status2: document.getElementById("verification-phone-status-2"),
        edit2: document.getElementById("verification-phone-edit-2")
    };

    // --- petits utilitaires ---
    function show(el, visible) {
        if (!el) return;
        if (visible) el.removeAttribute("hidden");
        else el.setAttribute("hidden", "");
    }
    function setStatus(el, text, ok) {
        if (!el) return;
        el.textContent = text || "";
        el.style.color = ok ? "#aef6d2" : "#ffc8b7";
    }
    function fullOf(prefixEl, numberEl) {
        const pre = String(prefixEl?.value || "").trim();
        const num = String(numberEl?.value || "").replace(/\s+/g, " ").trim();
        return num ? `${pre} ${num}`.replace(/\s/g, "") : "";
    }
    function sameAsSaved(idx) {
        const pre = idx === 1 ? els.phonePrefix : pel.prefix2;
        const num = idx === 1 ? els.phoneNumber : pel.number2;
        const ref = idx === 1 ? ph.saved1 : ph.saved2;
        const cur = fullOf(pre, num);
        return Boolean(ref) && cur === String(ref).replace(/\s/g, "");
    }

    // --- le bouton "Enregistrer" general ---
    function refreshSubmitState() {
        const btn = els.form?.querySelector('button[type="submit"]');
        if (!btn) return;
        // bloque seulement si un numero MODIFIE n'a pas ete verifie
        const need1 = ph.editing1 && !sameAsSaved(1) && !ph.verified1;
        const need2 = ph.editing2 && !sameAsSaved(2) && !ph.verified2;
        const need = need1 || need2;
        btn.disabled = need;
        btn.title = need ? "Verifiez le numero modifie avec le code recu par SMS" : "";
        if (!need && btn.dataset.saving !== "1") btn.textContent = "Enregistrer les modifications";
    }

    // --- affiche/actualise l'etat visuel d'un numero (idx = 1 ou 2) ---
    function refreshPhone(idx) {
        const isOne = idx === 1;
        const prefixEl = isOne ? els.phonePrefix : pel.prefix2;
        const numberEl = isOne ? els.phoneNumber : pel.number2;
        const editBtn  = isOne ? pel.edit1 : pel.edit2;
        const sendBtn  = isOne ? pel.sendCode : pel.sendCode2;
        const statusEl = isOne ? pel.status : pel.status2;
        const editing  = isOne ? ph.editing1 : ph.editing2;
        const verified = isOne ? ph.verified1 : ph.verified2;
        const saved    = isOne ? ph.saved1 : ph.saved2;
        const hasSaved = Boolean(String(saved || "").trim());

        // le crayon n'existe que s'il y a un numero deja enregistre
        show(editBtn, hasSaved);

        if (!editing) {
            // ---- REPOS ----
            if (numberEl) { numberEl.readOnly = true; numberEl.style.cursor = "default"; }
            if (prefixEl) prefixEl.disabled = true;
            editBtn?.classList.remove("is-locked");
            show(sendBtn, false);                   // cache : rien a faire ici
            show(isOne ? pel.otpSection : pel.otpSection2, false);
            if (hasSaved) setStatus(statusEl, "");
            refreshSubmitState();
            return;
        }

        // ---- EDITION ----
        if (numberEl) { numberEl.readOnly = false; numberEl.style.cursor = ""; }
        if (prefixEl) prefixEl.disabled = false;
        editBtn?.classList.add("is-locked");

        const changed = !sameAsSaved(idx);
        if (changed && !verified) {
            // le numero a change : le bouton d'envoi est utile et actif
            show(sendBtn, true);
            if (!ph[idx === 1 ? "sent1" : "sent2"]) {
                sendBtn.disabled = false;
                sendBtn.textContent = "Envoyer un code";
            }
            setStatus(statusEl, "");
        } else if (verified) {
            show(sendBtn, false);
            setStatus(statusEl, "");
        } else {
            // rien n'a encore change : le bouton est visible mais GRISE
            show(sendBtn, true);
            sendBtn.disabled = true;
            sendBtn.textContent = "Envoyer un code";
            setStatus(statusEl, "Modifiez le numero : le bouton s'activera des qu'il change.");
        }
        refreshSubmitState();
    }

    // --- abandon : on remet tout au repos sans rien enregistrer ---
    function cancelEdit(idx) {
        const isOne = idx === 1;
        const numberEl = isOne ? els.phoneNumber : pel.number2;
        const prefixEl = isOne ? els.phonePrefix : pel.prefix2;
        const saved = isOne ? ph.saved1 : ph.saved2;

        // restaure la valeur d'origine
        if (String(saved || "").trim()) {
            const parts = String(saved).trim().split(" ");
            const pre = parts[0] || "";
            const loc = parts.slice(1).join(" ");
            if (prefixEl) {
                const o = Array.from(prefixEl.options).find(op => op.value === pre);
                if (o) prefixEl.value = pre;
            }
            if (numberEl) numberEl.value = loc;
        } else if (numberEl) {
            numberEl.value = "";
        }
        if (isOne) { ph.editing1 = false; ph.sent1 = false; ph.verified1 = Boolean(String(saved).trim()); }
        else       { ph.editing2 = false; ph.sent2 = false; ph.verified2 = Boolean(String(saved).trim()); }
        const otpIn = isOne ? pel.otpInput : pel.otpInput2;
        if (otpIn) otpIn.value = "";
        refreshPhone(idx);
    }

    // --- crayon : entrer / sortir du mode edition ---
    function bindCrayon(idx) {
        const editBtn = idx === 1 ? pel.edit1 : pel.edit2;
        const numberEl = idx === 1 ? els.phoneNumber : pel.number2;
        editBtn?.addEventListener("click", () => {
            const editing = idx === 1 ? ph.editing1 : ph.editing2;
            if (editing) {
                // re-clic = annuler (retour au numero enregistre)
                cancelEdit(idx);
            } else {
                if (idx === 1) ph.editing1 = true; else ph.editing2 = true;
                refreshPhone(idx);
                numberEl?.focus();
            }
        });
    }

    // --- bouton "Envoyer un code" + validation du code ---
    function bindSendAndVerify(idx) {
        const isOne = idx === 1;
        const prefixEl = isOne ? els.phonePrefix : pel.prefix2;
        const numberEl = isOne ? els.phoneNumber : pel.number2;
        const sendBtn  = isOne ? pel.sendCode : pel.sendCode2;
        const section  = isOne ? pel.otpSection : pel.otpSection2;
        const input    = isOne ? pel.otpInput : pel.otpInput2;
        const confirmB = isOne ? pel.confirmOtp : pel.confirmOtp2;
        const statusEl = isOne ? pel.status : pel.status2;

        sendBtn?.addEventListener("click", () => {
            if (sendBtn.disabled) return;
            const full = fullOf(prefixEl, numberEl);
            if (full.replace(/\D/g, "").length < 6) {
                setStatus(statusEl, "Saisissez d'abord un numero valide.");
                numberEl?.focus();
                return;
            }
            if (isOne) ph.sent1 = true; else ph.sent2 = true;
            show(section, true);
            sendBtn.disabled = true;
            sendBtn.textContent = "Code envoye";
            setStatus(statusEl, "");
            window.alert(`SIMULATION : Code SMS envoye au ${prefixEl?.value} ${numberEl?.value}\nCode : ${OTP_DEMO_CODE}`);
            input?.focus();
        });

        confirmB?.addEventListener("click", () => {
            const code = String(input?.value || "").trim();
            if (code !== OTP_DEMO_CODE) {
                if (isOne) { ph.verified1 = false; ph.sent1 = false; }
                else       { ph.verified2 = false; ph.sent2 = false; }
                setStatus(statusEl, "Code invalide. Reessayez.");
                show(section, false);
                refreshPhone(idx);
                return;
            }
            if (isOne) ph.verified1 = true; else ph.verified2 = true;
            if (input) input.value = "";
            show(section, false);
            refreshPhone(idx);
        });

        // sortie du champ : si rien n'a ete modifie ET aucun code en cours -> on abandonne
        numberEl?.addEventListener("blur", () => {
            window.setTimeout(() => {
                const active = document.activeElement;
                const section2 = isOne ? pel.otpSection : pel.otpSection2;
                const inBlock = (active && (
                    active === numberEl || active === sendBtn || active === input ||
                    (active.closest && active.closest(".phone-section-container")) ||
                    active === (isOne ? pel.edit1 : pel.edit2)
                ));
                if (inBlock) return;                        // l'utilisateur est encore dans la zone
                const editing = isOne ? ph.editing1 : ph.editing2;
                if (!editing) return;
                const verified = isOne ? ph.verified1 : ph.verified2;
                if (verified) return;                       // deja valide, on garde
                const sent = isOne ? ph.sent1 : ph.sent2;
                if (sent || (section2 && !section2.hasAttribute("hidden"))) return; // code en cours
                cancelEdit(idx);                            // sinon : on annule proprement
            }, 250);
        });

        // changement d'indicatif : on reevalue l'etat
        prefixEl?.addEventListener("change", () => refreshPhone(idx));
    }

    function setupPhoneVerification() {
        ph.saved1 = String(window.CCCommon.state.user?.phoneNumber || "").trim();
        ph.saved2 = String(window.CCCommon.state.user?.phoneNumber2 || "").trim();
        ph.verified1 = Boolean(ph.saved1);
        ph.verified2 = Boolean(ph.saved2);

        if (pel.prefix2 && els.phonePrefix) pel.prefix2.innerHTML = els.phonePrefix.innerHTML;

        // --- remplissage initial ---
        function fill(idx, saved) {
            const prefixEl = idx === 1 ? els.phonePrefix : pel.prefix2;
            const numberEl = idx === 1 ? els.phoneNumber : pel.number2;
            if (!String(saved || "").trim()) return false;
            const parts = String(saved).trim().split(" ");
            const pre = parts[0] || "";
            const loc = parts.slice(1).join(" ");
            if (prefixEl) {
                const o = Array.from(prefixEl.options).find(op => op.value === pre);
                if (o) prefixEl.value = pre;
            }
            if (numberEl && !numberEl.value) numberEl.value = loc;
            return true;
        }
        const filled1 = fill(1, ph.saved1);

        if (ph.saved2) {
            pel.wrap2?.classList.remove("hidden");
            show(pel.addPhone, false);                  // limite : 2 numeros maximum
            fill(2, ph.saved2);
        }

        bindCrayon(1); bindCrayon(2);
        bindSendAndVerify(1); bindSendAndVerify(2);

        // bouton "+ Ajouter un autre numero"
        pel.addPhone?.addEventListener("click", () => {
            pel.wrap2?.classList.remove("hidden");
            show(pel.addPhone, false);                  // un seul numero supplementaire
            refreshPhone(2);
            pel.number2?.focus();
        });

        // la saisie reevalue l'etat a chaque frappe
        els.phoneNumber?.addEventListener("input", () => refreshPhone(1));
        pel.number2?.addEventListener("input", () => refreshPhone(2));

        refreshPhone(1);
        refreshPhone(2);
        if (!filled1) show(pel.edit1, false);
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
            // un numero identique a celui deja enregistre ne demande aucun code ;
            // seul un numero MODIFIE doit avoir ete verifie.
            const changed1 = !sameAsSaved(1);
            const wasSaved1 = Boolean(String(ph.saved1 || "").trim());
            if (changed1 && wasSaved1 && !ph.verified1) {
                setFeedback("Numero modifie : verifiez-le avec le code recu par SMS avant d'enregistrer.");
                return;
            }
            if (changed1 && !wasSaved1 && !ph.verified1) {
                setFeedback("Verifiez votre numero avec le code recu par SMS avant d'enregistrer.");
                return;
            }
            body.phoneNumber = `${prefix} ${number}`;
        }

        // Second numero (optionnel) : uniquement s'il est saisi ET verifie
        const prefix2 = String(pel.prefix2?.value || "+33").trim();
        const number2 = String(pel.number2?.value || "").trim();
        if (number2) {
            const changed2 = !sameAsSaved(2);
            if (changed2 && !ph.verified2) {
                setFeedback("Second numero : verifiez-le avec le code recu par SMS avant d'enregistrer.");
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
            // apres enregistrement : les numeros deviennent les nouvelles references
            if (body.phoneNumber) {
                ph.saved1 = String(body.phoneNumber).trim();
                ph.verified1 = true; ph.editing1 = false; ph.sent1 = false;
                refreshPhone(1);
            }
            if (body.phoneNumber2) {
                ph.saved2 = String(body.phoneNumber2).trim();
                ph.verified2 = true; ph.editing2 = false; ph.sent2 = false;
                refreshPhone(2);
            }
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
