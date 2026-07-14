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
        if (number) body.phoneNumber = `${prefix} ${number}`;

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

        bindEvents();
    }

    bootstrap().catch((error) => {
        setFeedback(error.message || "Initialisation impossible.");
    });
})();
