(() => {
    const TRASH_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 6H21" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M19 6L18 20C17.9 21.1 17 22 15.9 22H8.1C7 22 6.1 21.1 6 20L5 6" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M10 11V17" stroke-linecap="round"></path>
    <path d="M14 11V17" stroke-linecap="round"></path>
</svg>`;

    const els = {
        dashboardUser: document.getElementById("dashboard-user"),
        refreshBtn: document.getElementById("refresh-dashboard-btn"),
        offers: document.getElementById("dash-offers"),
        conversations: document.getElementById("dash-conversations"),
        offersCount: document.getElementById("dash-offers-count"),
        conversationsCount: document.getElementById("dash-conversations-count"),
        progressValue: document.getElementById("profile-progress-value"),
        progressLabel: document.getElementById("profile-progress-label"),
        progressCircle: document.getElementById("profile-progress-circle"),
        progressMissing: document.getElementById("profile-progress-missing"),
        completeProfileBtn: document.getElementById("complete-profile-btn"),
        logoutMobileBtn: document.getElementById("logout-mobile-btn"),
        logoutMobileBtnTop: document.getElementById("logout-mobile-btn-top"),
        navTabs: document.querySelectorAll(".nav-tab"),
    };

    function formatMissingFields(completion) {
        const missing = Array.isArray(completion?.missingFields) ? completion.missingFields : [];
        const labels = [];
        if (missing.includes("phoneNumber")) labels.push("numero de telephone");
        if (missing.includes("identityDocument")) labels.push("piece justificative");
        if (missing.includes("profilePhoto")) labels.push("photo de profil");
        if (missing.includes("country")) labels.push("pays de residence");
        return labels;
    }

    function renderProfileProgress(user) {
        const completion = window.CCCommon.getProfileCompletion(user);
        const percent = Math.max(0, Math.min(100, Number(completion?.percent || 25)));
        const missingLabels = formatMissingFields(completion);
        const isVerified = Boolean(user && (Number(user.isVerified) === 1 || user.isVerified === true));

        if (els.progressValue) els.progressValue.textContent = `${percent}%`;

        if (els.progressCircle) {
            // Circumference of a circle with r=45 is 2 * PI * 45 = 282.74
            const circumference = 283;
            const offset = circumference - (percent / 100) * circumference;
            els.progressCircle.style.strokeDasharray = `${circumference}`;
            els.progressCircle.style.strokeDashoffset = `${offset}`;
        }

        if (els.progressLabel) {
            els.progressLabel.textContent = isVerified
                ? "Compte verifie"
                : percent >= 75
                    ? "En attente d'approbation"
                    : "Profil incomplet";

            if (isVerified) {
                els.progressLabel.classList.add("verified-glow");
            } else {
                els.progressLabel.classList.remove("verified-glow");
            }
        }

        els.progressMissing.textContent = isVerified
            ? "Badge premium actif"
            : user.identityRejectionReason
                ? `❌ REJETÉ : ${user.identityRejectionReason}`
                : percent >= 75
                    ? "Pret pour approbation"
                    : `Manquant: ${missingLabels.join(", ")}`;

        if (user.identityRejectionReason && !isVerified) {
            els.progressMissing.style.color = "#ff6b6b";
            els.progressMissing.style.fontWeight = "bold";
        } else {
            els.progressMissing.style.color = "";
            els.progressMissing.style.fontWeight = "";
        }

        if (els.completeProfileBtn) {
            const params = new URLSearchParams(window.location.search);
            const isHighlight = params.get('setup_payment') === 'true';

            els.completeProfileBtn.classList.toggle("hidden", false); // On le laisse visible pour les QRs
            els.completeProfileBtn.classList.toggle("pulse-glow", isHighlight);

            els.completeProfileBtn.textContent = isVerified
                ? "Placer mes moyens de paiement"
                : percent >= 75
                    ? "Verifier mes pieces"
                    : "Completer mon profil";
        }

        checkAdminInbox();
    }

    async function checkAdminInbox() {
        try {
            const resp = await window.CCCommon.api("/api/admin/inbox");
            const unread = Array.isArray(resp?.items) ? resp.items.filter(m => !m.isRead) : [];
            if (unread.length > 0 && els.progressLabel) {
                els.progressLabel.innerHTML += ` <span style="color:#ffc8b7; font-size:0.8rem; display:block; margin-top:0.2rem;">⚠️ Alerte administration</span>`;
            }
        } catch (err) {
            console.error("Erreur check inbox:", err);
        }
    }

    async function loadDashboard() {
        const [offersResp, conversationsResp] = await Promise.all([
            window.CCCommon.api("/api/offers?scope=mine&pageSize=100"),
            window.CCCommon.api("/api/conversations")
        ]);

        renderOffers(Array.isArray(offersResp?.items) ? offersResp.items : []);
        renderConversations(Array.isArray(conversationsResp) ? conversationsResp : []);
    }

    function renderOffers(items) {
        if (els.offersCount) els.offersCount.textContent = items.length;
        if (!els.offers) return;
        if (!items.length) {
            els.offers.innerHTML = `
                <div class="dashboard-card glassmorphic empty-state">
                    <p>Aucune offre publiee pour le moment.</p>
                    <a href="post_trip.html" class="btn secondary sm">Creer un trajet</a>
                </div>`;
            return;
        }

        els.offers.innerHTML = items.map((item) => {
            const baseCur = item.baseCurrency || 'EUR';
            const userCur = window.CCCommon.state?.user?.country ? (window.CCCommon.COUNTRY_CURRENCIES[window.CCCommon.state.user.country] || 'EUR') : 'EUR';
            const converted = window.CCCommon.convertCurrency(item.pricePerKg, baseCur, userCur);
            const priceDisplay = window.CCCommon.formatAmount(converted, userCur);

            return `
<article class="dashboard-card glassmorphic offer-item">
    <div class="offer-card-head">
        <h4>${window.CCCommon.escapeHtml(item.origin || "-")} -> ${window.CCCommon.escapeHtml(item.destination || "-")}</h4>
        <button class="icon-trash-btn" data-delete-offer="${item.id}">
            ${TRASH_ICON}
        </button>
    </div>
    <div class="offer-meta">
        <span class="meta-pill">${window.CCCommon.escapeHtml(String(item.availableKg || 0))} kg</span>
        <span class="meta-pill">${priceDisplay}/kg</span>
    </div>
    <div class="card-status status-${String(item.status || "active").toLowerCase()}">
        ${window.CCCommon.escapeHtml(String(item.status || "active").toUpperCase())}
    </div>
</article>`;
        }).join("");
    }

    function renderConversations(items) {
        if (els.conversationsCount) els.conversationsCount.textContent = items.length;
        if (!els.conversations) return;
        if (!items.length) {
            els.conversations.innerHTML = `
                <div class="dashboard-card glassmorphic empty-state">
                    <p>Aucune conversation active.</p>
                </div>`;
            return;
        }

        els.conversations.innerHTML = items.map((item) => {
            let statusLabel = "";
            if (item.isOfferOwner && item.status === "voyageur_paye") {
                statusLabel = "payer colisconnect";
            }

            return `
<article class="dashboard-card glassmorphic thread-item clickable" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
    <div class="thread-content">
        <div class="thread-header">
            <strong>${window.CCCommon.escapeHtml(item.travelerName || "Contact")}</strong>
            <button class="icon-trash-btn" data-delete-conversation="${window.CCCommon.escapeHtml(item.id)}">
                ${TRASH_ICON}
            </button>
        </div>
        <p class="thread-preview">${window.CCCommon.escapeHtml(item.preview || "Aucun message")}</p>
        <div class="thread-meta">
            <span class="meta-pill">${window.CCCommon.escapeHtml(item.offerTitle || "Trajet")}</span>
            ${statusLabel ? `<span class="meta-status status-voyageur-paye">${window.CCCommon.escapeHtml(statusLabel)}</span>` : ""}
        </div>
    </div>
</article>`;
        }).join("");
    }

    function bindEvents() {
        els.refreshBtn?.addEventListener("click", () => {
            loadDashboard().catch((error) => alert(error.message || "Rafraichissement impossible."));
        });

        els.logoutMobileBtn?.addEventListener("click", () => {
            window.CCCommon.logout();
        });

        els.logoutMobileBtnTop?.addEventListener("click", () => {
            window.CCCommon.logout();
        });

        els.completeProfileBtn?.addEventListener("click", () => {
            const user = window.CCCommon.state.user;
            const completion = window.CCCommon.getProfileCompletion(user);

            if (window.CCCommon.isUserVerified(user)) {
                openPaymentSetupModal();
            } else {
                window.CCCommon.openProfileCompletionGate("dashboard.html");
            }
        });

        // --- Logique Modale Setup Payeurs ---
        function openPaymentSetupModal() {
            const modal = document.getElementById("setup-payment-modal");
            const successModal = document.getElementById("setup-success-modal");
            const stepNum = document.getElementById("setup-step-num");
            const stepTitle = document.getElementById("setup-step-title");
            const stepDesc = document.getElementById("setup-step-desc");
            const nextBtn = document.getElementById("setup-next-btn");
            const input = document.getElementById("setup-qr-input");
            const preview = document.getElementById("setup-qr-preview");
            const previewContainer = document.getElementById("setup-preview-container");
            const errorText = document.getElementById("setup-error");
            const closeBtn = document.getElementById("close-setup-modal");

            let currentStep = 1; // 1 = Country, 2 = Alipay, 3 = WeChat
            let alipayData = "";
            let wechatData = "";
            let selectedCountry = window.CCCommon.state.user?.country || "";

            const resetModal = () => {
                currentStep = 1;
                alipayData = "";
                wechatData = "";
                selectedCountry = window.CCCommon.state.user?.country || "";
                document.getElementById("setup-country-input").value = selectedCountry;
                showStep(1);
            };

            const showStep = (step) => {
                currentStep = step;
                errorText.classList.add("hidden");
                if (step === 1) {
                    stepNum.textContent = "1";
                    stepTitle.textContent = "Configuration Localisation";
                    stepDesc.textContent = "Confirmez votre pays de résidence pour ajuster les tarifs.";
                    nextBtn.textContent = "Suivant";
                    document.getElementById("setup-country-container").classList.remove("hidden");
                    previewContainer.classList.add("hidden");
                    input.parentElement.classList.add("hidden"); // Cache la zone d'upload
                } else if (step === 2) {
                    stepNum.textContent = "2";
                    stepTitle.textContent = "Configuration Alipay";
                    stepDesc.textContent = "Faites une capture de votre QR Code Alipay et uploadez-la ici.";
                    nextBtn.textContent = "Suivant";
                    document.getElementById("setup-country-container").classList.add("hidden");
                    input.parentElement.classList.remove("hidden");
                    if (alipayData) {
                        preview.src = alipayData;
                        previewContainer.classList.remove("hidden");
                    } else {
                        previewContainer.classList.add("hidden");
                    }
                } else {
                    stepNum.textContent = "3";
                    stepTitle.textContent = "Configuration WeChat";
                    stepDesc.textContent = "Faites une capture de votre QR Code WeChat et uploadez-la ici.";
                    nextBtn.textContent = "Terminer";
                    document.getElementById("setup-country-container").classList.add("hidden");
                    input.parentElement.classList.remove("hidden");
                    if (wechatData) {
                        preview.src = wechatData;
                        previewContainer.classList.remove("hidden");
                    } else {
                        previewContainer.classList.add("hidden");
                    }
                }
                input.value = "";
            };

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const data = re.target.result;
                    if (currentStep === 2) alipayData = data;
                    else if (currentStep === 3) wechatData = data;
                    preview.src = data;
                    previewContainer.classList.remove("hidden");
                };
                reader.readAsDataURL(file);
            };

            nextBtn.onclick = async () => {
                if (currentStep === 1) {
                    selectedCountry = document.getElementById("setup-country-input").value.trim();
                    if (!selectedCountry) return (errorText.textContent = "Veuillez indiquer votre pays.", errorText.classList.remove("hidden"));
                    showStep(2);
                } else if (currentStep === 2) {
                    if (!alipayData) return (errorText.textContent = "Veuillez uploader votre QR Alipay.", errorText.classList.remove("hidden"));
                    showStep(3);
                } else {
                    if (!wechatData) return (errorText.textContent = "Veuillez uploader votre QR WeChat.", errorText.classList.remove("hidden"));

                    nextBtn.disabled = true;
                    nextBtn.textContent = "Enregistrement...";
                    try {
                        await window.CCCommon.api("/api/me/payment-qrs", {
                            method: "POST",
                            body: {
                                alipayQr: alipayData,
                                wechatQr: wechatData,
                                country: selectedCountry
                            }
                        });
                        modal.classList.add("hidden");
                        successModal.classList.remove("hidden");
                    } catch (err) {
                        errorText.textContent = err.message || "Erreur lors de la sauvegarde.";
                        errorText.classList.remove("hidden");
                    } finally {
                        nextBtn.disabled = false;
                        nextBtn.textContent = "Terminer";
                    }
                }
            };

            document.getElementById("setup-success-ok").onclick = () => {
                successModal.classList.add("hidden");
                // Logique de redirection retour si param ?setup_payment=true
                const params = new URLSearchParams(window.location.search);
                if (params.get('setup_payment') === 'true') {
                    // On simule un retour à la page de publication
                    // Idéalement on restaure le draft, mais ici on redirige juste
                    window.location.href = "post_trip.html?restored=true";
                } else {
                    window.location.reload();
                }
            };

            closeBtn.onclick = () => modal.classList.add("hidden");

            resetModal();
            modal.classList.remove("hidden");
        }

        els.offers?.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-delete-offer]");
            if (!button) return;
            const id = Number(button.getAttribute("data-delete-offer"));
            if (!id) return;
            if (!window.confirm("Supprimer cette offre ?")) return;

            window.CCCommon.api(`/api/offers/${id}`, { method: "DELETE" })
                .then(() => loadDashboard())
                .catch((error) => alert(error.message || "Suppression impossible."));
        });

        els.conversations?.addEventListener("click", (event) => {
            const target = event.target;

            // 1. Bouton suppression
            const deleteBtn = target.closest("button[data-delete-conversation]");
            if (deleteBtn) {
                event.stopPropagation();
                const id = String(deleteBtn.getAttribute("data-delete-conversation") || "").trim();
                if (!id) return;
                if (!window.confirm("Supprimer cette conversation ?")) return;

                window.CCCommon.api(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE" })
                    .then(() => loadDashboard())
                    .catch((error) => alert(error.message || "Suppression impossible."));
                return;
            }

            // 2. Clic sur la carte -> Chat
            const threadItem = target.closest(".thread-item[data-thread-id]");
            if (threadItem) {
                const threadId = threadItem.getAttribute("data-thread-id");
                window.location.href = `chat.html?id=${encodeURIComponent(threadId)}`;
            }
        });
    }

    async function bootstrap() {
        await window.CCCommon.init();
        if (!window.CCCommon.requireAuth()) return;

        const user = window.CCCommon.state.user;
        if (els.dashboardUser) {
            els.dashboardUser.textContent = user?.fullName || "Ami ColisConnect";
        }
        renderProfileProgress(user);

        // Auto-scroll si redirection QR
        const params = new URLSearchParams(window.location.search);
        if (params.get('setup_payment') === 'true' && els.completeProfileBtn) {
            els.completeProfileBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        bindEvents();

        await loadDashboard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
