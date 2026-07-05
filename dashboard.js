(() => {
    const state = {
        offers: [],
        activeOffer: null,
        requests: [],
        loading: false,
    };

    const els = {
        dashboardUser: document.getElementById("dashboard-user"),
        refreshBtn: document.getElementById("refresh-dashboard-btn"),
        manageOfferBtn: document.getElementById("manage-offer-btn"),
        editOfferBtn: document.getElementById("edit-offer-btn"),
        openMessagesBtn: document.getElementById("open-messages-btn"),
        activeOfferCard: document.getElementById("active-offer-card"),
        activeOfferBadge: document.getElementById("active-offer-badge"),
        requestsList: document.getElementById("dash-conversations"),
        requestsCount: document.getElementById("dash-conversations-count"),
        statRemainingKg: document.getElementById("stat-remaining-kg"),
        statRemainingLabel: document.getElementById("stat-remaining-label"),
        statInterested: document.getElementById("stat-interested"),
        statInterestedLabel: document.getElementById("stat-interested-label"),
        statRevenue: document.getElementById("stat-revenue"),
        statRevenueLabel: document.getElementById("stat-revenue-label"),
        quickSummaryText: document.getElementById("quick-summary-text"),
        profileTypeBadge: document.getElementById("profile-type-badge"),
        userChip: document.getElementById("user-chip"),
        adminLink: document.getElementById("admin-link"),
        authOpenBtn: document.getElementById("auth-open-btn"),
        logoutBtn: document.getElementById("logout-btn"),
        offerModal: document.getElementById("offer-details-modal"),
        closeOfferModalBtn: document.getElementById("close-offer-modal"),
        offerModalTitle: document.getElementById("offer-modal-title"),
        offerModalSummary: document.getElementById("offer-modal-summary"),
        offerModalBadge: document.getElementById("offer-modal-badge"),
        offerEditForm: document.getElementById("offer-edit-form"),
        offerOrigin: document.getElementById("offer-origin"),
        offerDestination: document.getElementById("offer-destination"),
        offerDepartureDate: document.getElementById("offer-departure-date"),
        offerAvailableKg: document.getElementById("offer-available-kg"),
        offerPricePerKg: document.getElementById("offer-price-per-kg"),
        offerBaseCurrency: document.getElementById("offer-base-currency"),
        saveOfferBtn: document.getElementById("save-offer-btn"),
        openChatFromModalBtn: document.getElementById("open-chat-from-modal-btn"),
        offerSaveFeedback: document.getElementById("offer-save-feedback"),
    };

    function getCurrencyCode(user, offer) {
        const country = user?.country || user?.location || "";
        return window.CCCommon.COUNTRY_CURRENCIES[country] || offer?.baseCurrency || "EUR";
    }

    function formatAmount(value, currency) {
        return window.CCCommon.formatAmount(Number(value || 0), currency || "EUR");
    }

    function formatDateShort(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }

    function formatDateLong(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    }

    function getProfileTypeLabel(user) {
        const type = String(user?.profile_type || "").toLowerCase();
        if (type === "traveler") return "Voyageur";
        if (type === "cargo") return "Cargo";
        if (type === "client") return "Client";
        return "Non défini";
    }

    function getProfileTypeAccent(user) {
        const type = String(user?.profile_type || "").toLowerCase();
        if (type === "cargo") {
            return { bg: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" };
        }
        if (type === "client") {
            return { bg: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.3)" };
        }
        if (type === "traveler") {
            return { bg: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" };
        }
        return { bg: "rgba(148, 163, 184, 0.16)", color: "#cbd5e1", border: "1px solid rgba(148, 163, 184, 0.18)" };
    }

    function getRouteLabel(offer) {
        return `${offer?.origin || "-"} -> ${offer?.destination || "-"}`;
    }

    function getActiveOffer() {
        const offers = Array.isArray(state.offers) ? state.offers : [];
        return offers.find((item) => String(item.status || "").toLowerCase() === "active") || null;
    }

    function getRequestsForOffer(offer) {
        const rows = Array.isArray(state.requests) ? state.requests : [];
        if (!offer) return rows.filter((item) => item.isOfferOwner);
        return rows.filter((item) => item.isOfferOwner && String(item.offer_id || item.offerId || "") === String(offer.id));
    }

    function setFeedback(message, isError = false) {
        if (!els.offerSaveFeedback) return;
        els.offerSaveFeedback.textContent = message || "";
        els.offerSaveFeedback.classList.toggle("hidden", !message);
        els.offerSaveFeedback.style.color = isError ? "#ff7d7d" : "#9fe9c3";
    }

    function renderProfileChip(user) {
        if (!els.profileTypeBadge) return;
        const label = getProfileTypeLabel(user);
        const accent = getProfileTypeAccent(user);
        if (!label || label === "Non défini") {
            els.profileTypeBadge.classList.add("hidden");
            return;
        }
        els.profileTypeBadge.classList.remove("hidden");
        els.profileTypeBadge.textContent = label;
        els.profileTypeBadge.style.background = accent.bg;
        els.profileTypeBadge.style.color = accent.color;
        els.profileTypeBadge.style.border = accent.border;
    }

    function renderStats(offer, requests) {
        const availableKg = Number(offer?.availableKg || offer?.available_kg || 0);
        const pricePerKg = Number(offer?.pricePerKg || offer?.price_per_kg || 0);
        const baseCurrency = offer?.baseCurrency || offer?.base_currency || "EUR";
        const potential = availableKg * pricePerKg;

        if (els.statRemainingKg) els.statRemainingKg.textContent = `${availableKg} kg`;
        if (els.statRemainingLabel) els.statRemainingLabel.textContent = "capacite restante";
        if (els.statInterested) els.statInterested.textContent = `${requests.length}`;
        if (els.statInterestedLabel) els.statInterestedLabel.textContent = "clients interesses";
        if (els.statRevenue) els.statRevenue.textContent = formatAmount(potential, baseCurrency);
        if (els.statRevenueLabel) els.statRevenueLabel.textContent = "revenu potentiel restant";
    }

    function renderActiveOffer(offer, requests) {
        if (!els.activeOfferCard) return;
        if (!offer) {
            els.activeOfferCard.innerHTML = `
                <div class="traveler-empty-state">
                    <div class="traveler-route-empty">
                        <span></span><span></span><span></span>
                    </div>
                    <p>Aucune offre active pour le moment.</p>
                    <a href="post_trip.html" class="btn secondary btn-sm">Publier un trajet</a>
                </div>`;
            if (els.activeOfferBadge) els.activeOfferBadge.textContent = "En attente";
            return;
        }

        const baseCurrency = offer.baseCurrency || offer.base_currency || "EUR";
        const requestsCount = requests.length;
        const remainingKg = Number(offer.availableKg || offer.available_kg || 0);
        const pricePerKg = Number(offer.pricePerKg || offer.price_per_kg || 0);
        const routeLine = getRouteLabel(offer);

        if (els.activeOfferBadge) {
            const status = String(offer.status || "active").toLowerCase();
            els.activeOfferBadge.textContent = status === "active" ? "Publiée" : status;
        }

        els.activeOfferCard.innerHTML = `
            <div class="traveler-route-visual">
                <div class="traveler-route-line"></div>
                <span class="traveler-route-pin traveler-route-pin-start"></span>
                <span class="traveler-route-pin traveler-route-pin-end"></span>
            </div>
            <div class="traveler-route-chips">
                <span class="traveler-chip">${window.CCCommon.escapeHtml(routeLine)}</span>
                <span class="traveler-chip">${window.CCCommon.escapeHtml(formatDateShort(offer.departureDate || offer.departure_date))}</span>
                <span class="traveler-chip">${window.CCCommon.escapeHtml(formatAmount(pricePerKg, baseCurrency))}/kg</span>
            </div>
            <div class="traveler-route-summary">
                <div class="traveler-route-summary-row">
                    <strong>${window.CCCommon.escapeHtml(offer.origin || "Origine")}</strong>
                    <span>${window.CCCommon.escapeHtml(offer.destination || "Destination")}</span>
                </div>
                <div class="traveler-route-meter">
                    <span class="traveler-route-meter-fill" style="width:${Math.min(90, Math.max(18, requestsCount * 18 + 12))}%"></span>
                </div>
                <p>${remainingKg} kg disponibles et ${formatAmount(pricePerKg * remainingKg, baseCurrency)} de revenu potentiel restant.</p>
            </div>`;

        if (els.quickSummaryText) {
            els.quickSummaryText.textContent = `${getRouteLabel(offer)} | ${formatDateLong(offer.departureDate || offer.departure_date)} | ${remainingKg} kg restants`;
        }
    }

    function renderRequests(requests, offer) {
        if (!els.requestsList) return;
        if (els.requestsCount) els.requestsCount.textContent = `${requests.length}`;

        if (!requests.length) {
            els.requestsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune demande entrante pour le moment.</p>
                    <span>Les personnes intéressées apparaîtront ici.</span>
                </div>`;
            return;
        }

        els.requestsList.innerHTML = requests.map((item) => {
            const title = window.CCCommon.escapeHtml(item.travelerName || "Contact");
            const preview = window.CCCommon.escapeHtml(item.preview || "Aucun message");
            const offerTitle = window.CCCommon.escapeHtml(item.offerTitle || getRouteLabel(offer));
            const initials = (item.travelerName || "C").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
            return `
                <article class="traveler-request-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="traveler-request-avatar">${window.CCCommon.escapeHtml(initials || "C")}</div>
                    <div class="traveler-request-copy">
                        <strong>${title}</strong>
                        <span>${preview}</span>
                        <small>${offerTitle}</small>
                    </div>
                    <button class="btn secondary btn-sm traveler-request-action" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                </article>`;
        }).join("");
    }

    function openChatPage(threadId = "", offerId = "") {
        if (threadId) {
            window.location.href = `chat.html?id=${encodeURIComponent(String(threadId))}`;
            return;
        }
        if (offerId) {
            window.location.href = `chat.html?offerId=${encodeURIComponent(String(offerId))}`;
            return;
        }
        window.location.href = "chat.html";
    }

    function openOfferModal() {
        const offer = state.activeOffer;
        if (!offer) {
            window.location.href = "post_trip.html";
            return;
        }

        const modal = els.offerModal;
        if (!modal) return;

        if (els.offerModalTitle) els.offerModalTitle.textContent = "Gerer mon offre active";
        if (els.offerModalSummary) {
            els.offerModalSummary.textContent = `Modifie les details du trajet ${getRouteLabel(offer)} et garde tes kilos à jour.`;
        }
        if (els.offerModalBadge) {
            const status = String(offer.status || "active").toLowerCase();
            els.offerModalBadge.textContent = status === "active" ? "Active" : status;
        }

        if (els.offerOrigin) els.offerOrigin.value = offer.origin || "";
        if (els.offerDestination) els.offerDestination.value = offer.destination || "";
        if (els.offerDepartureDate) els.offerDepartureDate.value = String(offer.departureDate || offer.departure_date || "");
        if (els.offerAvailableKg) els.offerAvailableKg.value = String(offer.availableKg ?? offer.available_kg ?? "");
        if (els.offerPricePerKg) els.offerPricePerKg.value = String(offer.pricePerKg ?? offer.price_per_kg ?? "");
        if (els.offerBaseCurrency) els.offerBaseCurrency.value = String(offer.baseCurrency || offer.base_currency || "EUR").toUpperCase();

        setFeedback("");
        modal.classList.remove("hidden");
    }

    function closeOfferModal() {
        els.offerModal?.classList.add("hidden");
        setFeedback("");
    }

    async function saveOfferEdits(event) {
        event.preventDefault();
        const offer = state.activeOffer;
        if (!offer) return;
        if (!window.ccSupabase) {
            setFeedback("Connexion Supabase indisponible.", true);
            return;
        }

        const payload = {
            origin: String(els.offerOrigin?.value || "").trim(),
            destination: String(els.offerDestination?.value || "").trim(),
            departure_date: String(els.offerDepartureDate?.value || "").trim(),
            available_kg: Number(els.offerAvailableKg?.value || 0),
            price_per_kg: Number(els.offerPricePerKg?.value || 0),
            base_currency: String(els.offerBaseCurrency?.value || "EUR").trim().toUpperCase(),
            title: `Trajet ${String(els.offerOrigin?.value || "").trim()} -> ${String(els.offerDestination?.value || "").trim()}`
        };

        if (!payload.origin || !payload.destination || !payload.departure_date) {
            setFeedback("Remplis le depart, l'arrivee et la date.", true);
            return;
        }

        if (payload.available_kg <= 0 || payload.price_per_kg < 0) {
            setFeedback("Les kilos et le prix doivent etre valides.", true);
            return;
        }

        if (els.saveOfferBtn) {
            els.saveOfferBtn.disabled = true;
            els.saveOfferBtn.textContent = "Enregistrement...";
        }

        try {
            const { error } = await window.ccSupabase
                .from("offers")
                .update(payload)
                .eq("id", offer.id)
                .eq("user_id", window.CCCommon.state.user?.id);
            if (error) throw error;
            setFeedback("Offre mise a jour avec succes.");
            await loadDashboard();
            closeOfferModal();
        } catch (err) {
            setFeedback(err.message || "Impossible de modifier l'offre.", true);
        } finally {
            if (els.saveOfferBtn) {
                els.saveOfferBtn.disabled = false;
                els.saveOfferBtn.textContent = "Enregistrer les modifications";
            }
        }
    }

    async function loadDashboard() {
        if (!window.CCCommon.state.user) return;
        const [offersResp, requestsResp] = await Promise.all([
            window.CCCommon.api("/api/offers?scope=mine&pageSize=100"),
            window.CCCommon.api("/api/conversations")
        ]);

        state.offers = Array.isArray(offersResp?.items) ? offersResp.items : [];
        state.activeOffer = getActiveOffer();
        state.requests = (Array.isArray(requestsResp) ? requestsResp : []).filter((item) => item.isOfferOwner);

        const requests = getRequestsForOffer(state.activeOffer);
        const user = window.CCCommon.state.user;
        const currency = getCurrencyCode(user, state.activeOffer);

        if (els.dashboardUser) {
            els.dashboardUser.textContent = user?.fullName || "Voyageur";
        }
        if (els.userChip) {
            els.userChip.textContent = `${getProfileTypeLabel(user)}${user?.is_verified ? " verifie" : ""}`;
        }
        renderProfileChip(user);
        renderStats(state.activeOffer, requests);
        renderActiveOffer(state.activeOffer, requests);
        renderRequests(requests, state.activeOffer);

        if (els.manageOfferBtn) {
            els.manageOfferBtn.textContent = state.activeOffer ? "Gerer mon offre active" : "Publier mon trajet";
        }
        if (els.editOfferBtn) {
            els.editOfferBtn.disabled = !state.activeOffer;
        }
        if (els.openMessagesBtn) {
            els.openMessagesBtn.href = state.activeOffer ? `chat.html?offerId=${encodeURIComponent(String(state.activeOffer.id))}` : "chat.html";
        }

        if (els.quickSummaryText && state.activeOffer) {
            els.quickSummaryText.textContent = `${getRouteLabel(state.activeOffer)} | ${formatAmount(Number(state.activeOffer.pricePerKg || state.activeOffer.price_per_kg || 0), state.activeOffer.baseCurrency || state.activeOffer.base_currency || currency)}/kg`;
        } else if (els.quickSummaryText) {
            els.quickSummaryText.textContent = "Aucune offre active pour le moment.";
        }
    }

    function bindEvents() {
        els.refreshBtn?.addEventListener("click", () => {
            loadDashboard().catch((error) => alert(error.message || "Rafraichissement impossible."));
        });

        els.manageOfferBtn?.addEventListener("click", () => {
            if (!state.activeOffer) {
                window.location.href = "post_trip.html";
                return;
            }
            openOfferModal();
        });

        els.editOfferBtn?.addEventListener("click", () => {
            if (!state.activeOffer) {
                window.location.href = "post_trip.html";
                return;
            }
            openOfferModal();
        });

        els.openMessagesBtn?.addEventListener("click", (event) => {
            if (!state.activeOffer) return;
            event.preventDefault();
            openChatPage("", state.activeOffer.id);
        });

        els.closeOfferModalBtn?.addEventListener("click", closeOfferModal);
        els.offerModal?.addEventListener("click", (event) => {
            if (event.target === els.offerModal) closeOfferModal();
        });

        els.offerEditForm?.addEventListener("submit", saveOfferEdits);

        els.openChatFromModalBtn?.addEventListener("click", () => {
            if (!state.activeOffer) return;
            openChatPage("", state.activeOffer.id);
        });

        els.logoutBtn?.addEventListener("click", () => {
            window.CCCommon.logout();
        });

        els.requestsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            const item = event.target.closest("[data-thread-id]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) {
                    openChatPage(threadId);
                }
                return;
            }
            if (item) {
                const threadId = item.getAttribute("data-thread-id");
                if (threadId) openChatPage(threadId);
            }
        });
    }

    async function bootstrap() {
        await window.CCCommon.init("dashboard");
        if (!window.CCCommon.requireAuth("dashboard.html")) return;

        const user = window.CCCommon.state.user;
        if (els.dashboardUser) {
            els.dashboardUser.textContent = user?.fullName || "Voyageur";
        }

        if (els.openMessagesBtn) {
            els.openMessagesBtn.href = "chat.html";
        }

        bindEvents();
        await loadDashboard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
