(() => {
    const state = {
        offers: [],
        activeOffer: null,
        requests: [],
        currentView: null,
        conversations: [],
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
        // Client dashboard elements
        travelerView: document.getElementById("traveler-dashboard-view"),
        clientView: document.getElementById("client-dashboard-view"),
        clientStatOffers: document.getElementById("client-stat-offers"),
        clientStatDiscussions: document.getElementById("client-stat-discussions"),
        clientStatPayments: document.getElementById("client-stat-payments"),
        clientRequestsList: document.getElementById("client-requests-list"),
        clientDiscussionsList: document.getElementById("client-discussions-list"),
        clientValidatedList: document.getElementById("client-validated-list"),
        // Cargo dashboard elements
        cargoView: document.getElementById("cargo-dashboard-view"),
        cargoStatOffers: document.getElementById("cargo-stat-offers"),
        cargoStatRequests: document.getElementById("cargo-stat-requests"),
        cargoStatCapacity: document.getElementById("cargo-stat-capacity"),
        cargoOpsTable: document.getElementById("cargo-ops-table"),
        cargoFileList: document.getElementById("cargo-file-list"),
        cargoRequestsModal: document.getElementById("cargo-requests-modal"),
        cargoRequestsModalList: document.getElementById("cargo-requests-modal-list"),
        cargoRequestsModalCount: document.getElementById("cargo-requests-modal-count"),
        cargoLimitBadge: document.getElementById("cargo-limit-badge"),
        cargoProgressFill: document.getElementById("cargo-progress-fill"),
        cargoLimitNote: document.getElementById("cargo-limit-note"),
        // Modale générique "Voir tous"
        voirTousModal: document.getElementById("voir-tous-modal"),
        voirTousKicker: document.getElementById("voir-tous-kicker"),
        voirTousTitle: document.getElementById("voir-tous-title"),
        voirTousCount: document.getElementById("voir-tous-count"),
        voirTousList: document.getElementById("voir-tous-list"),
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
        if (els.statRemainingLabel) els.statRemainingLabel.textContent = "capacite disponible";
        if (els.statInterested) els.statInterested.textContent = `${requests.length}`;
        if (els.statInterestedLabel) els.statInterestedLabel.textContent = "demandes recues";
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
                    <a href="post_trip.html" class="btn primary btn-sm">Publier un trajet</a>
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
                    <span>Les demandes apparaitront ici apres publication d'un trajet.</span>
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

    // ===== CLIENT DASHBOARD FUNCTIONS =====

    function renderClientRequests(parcelRequests) {
        if (!els.clientRequestsList) return;

        if (!parcelRequests.length) {
            els.clientRequestsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune demande de trajet pour le moment.</p>
                    <span>Publiez un appel si vous ne trouvez pas de voyageur.</span>
                </div>`;
            return;
        }

        els.clientRequestsList.innerHTML = parcelRequests.map((item, i) => `
            <div class="client-discussion-item" data-parcel-id="${window.CCCommon.escapeHtml(item.id)}">
                <div class="client-item-index">${i + 1}</div>
                <div class="item-content">
                    <div class="item-name">${window.CCCommon.escapeHtml(item.origin || "")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "")}</div>
                    <div class="item-desc">${item.weight_kg ? item.weight_kg + " kg" : ""}${item.status ? " - " + item.status : ""}${item.needed_by_date ? " - Avant le " + item.needed_by_date : ""}</div>
                </div>
                <button class="client-item-btn" data-edit-parcel="${window.CCCommon.escapeHtml(item.id)}">Modifier</button>
            </div>
        `).join("");
    }

    function renderClientDiscussions(conversations) {
        if (!els.clientDiscussionsList) return;

        if (!conversations.length) {
            els.clientDiscussionsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune discussion en cours.</p>
                    <span>Contactez un voyageur pour echanger.</span>
                </div>`;
            return;
        }

        els.clientDiscussionsList.innerHTML = conversations.map((item, i) => {
            const name = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Voyageur");
            const desc = window.CCCommon.escapeHtml(item.preview || (item.origin && item.destination ? `${item.origin} -> ${item.destination}` : ""));
            const isVerified = item.isVerified ? " verified" : "";
            const hasNewMsg = item.hasNewMessage;
            return `
                <div class="client-discussion-item ${hasNewMsg ? "is-new" : ""}" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="client-item-index">${i + 1}</div>
                    <div class="item-content">
                        <div class="item-name">${name}${isVerified}</div>
                        <div class="item-desc">${desc || "Demande en cours"}</div>
                    </div>
                    <button class="client-item-btn client-item-btn-outline" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Voir</button>
                </div>
            `;
        }).join("");
    }

    function renderClientValidated(validated) {
        if (!els.clientValidatedList) return;
        if (!validated || !validated.length) {
            els.clientValidatedList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucun colis en cours.</p>
                    <span>Vos reservations payees apparaitront ici.</span>
                </div>`;
            return;
        }
        els.clientValidatedList.innerHTML = validated.map((item) => {
            const origin = item.offers?.origin || item.offer_origin || "";
            const dest = item.offers?.destination || item.offer_destination || "";
            const ownerName = item.offers?.owner_name || item.offer_owner_name || 
                (state.clientConversations || []).find(c => c.reservation_id == item.id || c.reservationId == item.id)?.travelerName || "Voyageur";
            const conv = (state.clientConversations || []).find(c => c.reservation_id == item.id || c.reservationId == item.id);
            const threadId = conv?.id || item.thread_id || null;
            const status = item.status === "paid" ? "en_cours" : item.status;
            const statusLabel = status === "en_cours" ? "En cours" : (status === "livre" ? "Livre" : status);
            const isDelivered = status === "livre";
            return `<div class="client-discussion-item ${threadId ? 'clickable' : ''}" data-reservation-id="${window.CCCommon.escapeHtml(item.id)}" ${threadId ? `data-thread-id="${window.CCCommon.escapeHtml(threadId)}"` : ""}>
                <div class="item-content">
                    <div class="item-name">${window.CCCommon.escapeHtml(origin || "")} &rarr; ${window.CCCommon.escapeHtml(dest || "")}</div>
                    <div class="item-desc">${window.CCCommon.escapeHtml(ownerName)} | ${item.kg ? item.kg + " kg" : ""}${item.total_amount ? " - " + item.total_amount + " FCFA" : ""} | ${statusLabel}</div>
                </div>
                <span class="pill-${isDelivered ? 'green' : 'yellow'}" style="font-size:10px;padding:2px 8px;border-radius:8px;flex-shrink:0;">${statusLabel}</span>
                ${!isDelivered ? `<button class="cargo-ops-btn" data-livrer="${window.CCCommon.escapeHtml(item.id)}" style="margin-left:8px;border-color:var(--line);color:var(--text);">Livrer</button>` : ""}
            </div>`;
        }).join("");
    }

    function switchDashboardView(profileType) {
        const isTraveler = profileType === "traveler";
        const isCargo = profileType === "cargo";
        const isClient = profileType === "client";
        state.currentView = isCargo ? "cargo" : (isTraveler ? "traveler" : "client");

        if (els.travelerView) {
            els.travelerView.classList.toggle("is-active", isTraveler);
            els.travelerView.classList.toggle("hidden", !isTraveler);
        }
        if (els.clientView) {
            els.clientView.classList.toggle("is-active", isClient);
            els.clientView.classList.toggle("hidden", !isClient);
        }
        if (els.cargoView) {
            els.cargoView.classList.toggle("is-active", isCargo);
            els.cargoView.classList.toggle("hidden", !isCargo);
        }
        updateDashboardToggleState(state.currentView);
    }

    function updateDashboardToggleState(viewType) {
        const activeView = viewType || state.currentView || "client";
        document.querySelectorAll(".dash-toggle").forEach((button) => {
            button.classList.toggle("active", button.getAttribute("data-switch") === activeView);
        });

        document.querySelectorAll(".dashboard-toggles").forEach((group) => {
            const visibleButtons = Array.from(group.querySelectorAll(".dash-toggle")).filter((button) => !button.classList.contains("hidden"));
            const activeIndex = visibleButtons.findIndex((button) => button.getAttribute("data-switch") === activeView);
            group.classList.remove("toggle-count-1", "toggle-count-2", "toggle-count-3", "toggle-index-0", "toggle-index-1", "toggle-index-2");
            group.classList.add(`toggle-count-${Math.min(Math.max(visibleButtons.length, 1), 3)}`);
            group.classList.add(`toggle-index-${Math.min(Math.max(activeIndex, 0), 2)}`);
            group.classList.toggle("has-active-toggle", activeIndex >= 0 && visibleButtons.length > 0);
        });
    }

    async function loadClientDashboard() {
        const user = window.CCCommon.state.user;
        if (!user) return;

        const [offersResp, conversationsResp, parcelResp, reservationsResp] = await Promise.all([
            window.CCCommon.api("/api/offers?scope=all&pageSize=10"),
            window.CCCommon.api("/api/conversations"),
            window.ccSupabase ? window.ccSupabase.from("parcel_requests")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
            window.ccSupabase ? window.ccSupabase.from("reservations")
                .select("*, offers(origin, destination)")
                .eq("user_id", user.id)
                .in("status", ["paid", "en_cours", "livre"])
                .order("updated_at", { ascending: false }) : Promise.resolve({ data: [] })
        ]);

        const compatibleOffers = Array.isArray(offersResp?.items) ? offersResp.items : [];
        const conversations = Array.isArray(conversationsResp) ? conversationsResp.filter(c => !c.isOfferOwner) : [];
        const parcelRequests = parcelResp?.data || [];
        const paidReservations = reservationsResp?.data || [];
        state.parcelRequests = parcelRequests;
        state.clientConversations = conversations;
        state.clientValidated = paidReservations;

        if (els.clientStatOffers) els.clientStatOffers.textContent = `${compatibleOffers.length}`;
        if (els.clientStatDiscussions) els.clientStatDiscussions.textContent = `${conversations.length}`;
        if (els.clientStatPayments) els.clientStatPayments.textContent = `${paidReservations.length}`;

        renderClientRequests(parcelRequests);
        renderClientDiscussions(conversations);
        renderClientValidated(paidReservations);
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

        if (els.offerModalTitle) els.offerModalTitle.textContent = "Modifier mon offre";
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

        // Valider que le pays est dans la liste officielle
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        const normalize = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const validCountries = countryOptions.map(c => normalize(c));
        if (!validCountries.includes(normalize(payload.origin))) {
            setFeedback("Choisissez un pays de depart valide dans la liste.", true);
            return;
        }
        if (!validCountries.includes(normalize(payload.destination))) {
            setFeedback("Choisissez un pays d'arrivee valide dans la liste.", true);
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

    async function loadCargoDashboard() {
        const user = window.CCCommon.state.user;
        if (!user) return;

        // Charger les offres ET conversations en parallèle
        const [offersResp, convResp] = await Promise.all([
            window.CCCommon.api("/api/offers?scope=mine&pageSize=20"),
            window.CCCommon.api("/api/conversations")
        ]);
        const myOffers = Array.isArray(offersResp?.items) ? offersResp.items : [];
        state.offers = myOffers;
        const activeOffers = myOffers.filter(o => String(o.status || "").toLowerCase() === "active");
        const allOffers = myOffers.filter(o => String(o.status || "").toLowerCase() !== "archived");
        const activeCount = activeOffers.length;

        const incoming = Array.isArray(convResp) ? convResp.filter(c => !c.isOfferOwner) : [];
        state.incomingRequests = incoming;

        // Stats
        if (els.cargoStatOffers) els.cargoStatOffers.textContent = `${activeCount} / 5`;
        if (els.cargoStatRequests) els.cargoStatRequests.textContent = `${incoming.length}`;

        // Table operations (4 colonnes: LIGNE | MODE | STATUT | [action])
        if (els.cargoOpsTable) {
            if (!activeOffers.length) {
                els.cargoOpsTable.innerHTML = `<div class="cargo-ops-header"><div>LIGNE</div><div>MODE</div><div>STATUT</div><div></div></div><div class="traveler-empty-requests"><p>Aucune ligne active.</p><span>Creez votre premiere offre cargo.</span><a href="post_trip.html" class="btn primary btn-sm">Nouvelle offre</a></div>`;
            } else {
                els.cargoOpsTable.innerHTML = `<div class="cargo-ops-header"><div>LIGNE</div><div>MODE</div><div>STATUT</div><div></div></div>` + activeOffers.map(o => {
                    const kg = Number(o.availableKg || o.available_kg || 0);
                    const status = String(o.status || "active").toLowerCase();
                    const mode = o.mode || "Avion";
                    const isFull = kg < 5;
                    const statusPill = isFull ? 'pill-pink' : 'pill-green';
                    const statusLabel = isFull ? 'Presque plein' : 'Active';
                    return `<div class="cargo-ops-row">
                        <div class="col-ligne">${window.CCCommon.escapeHtml(o.origin || "")} &rarr; ${window.CCCommon.escapeHtml(o.destination || "")}</div>
                        <div class="col-mode">${mode}</div>
                        <div class="col-statut"><span class="${statusPill}">${statusLabel}</span></div>
                        <div class="col-actions">
                            <button class="cargo-ops-btn" data-offer-id="${window.CCCommon.escapeHtml(o.id)}">Modifier</button>
                            <button class="cargo-ops-btn cargo-ops-btn-danger" data-offer-id="${window.CCCommon.escapeHtml(o.id)}" data-action="delete">Supprimer</button>
                        </div>
                    </div>`;
                }).join("");
            }
        }

        // Demandes (conversations where user is not owner)
        if (els.cargoFileList) {
            if (!incoming.length) {
                els.cargoFileList.innerHTML = `<div class="traveler-empty-requests"><p>Aucune demande.</p></div>`;
            } else {
                els.cargoFileList.innerHTML = incoming.slice(0, 5).map((item, i) => {
                    var _userName_ = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                    var _tripInfo_ = item.origin && item.destination ? `${item.origin} -> ${item.destination}` : (item.preview ? item.preview : "Trajet non precise");
                    return `<div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                        <div class="cargo-file-index">${i + 1}</div>
                        <div class="file-content">
                            <div class="file-title">${_userName_} | ${window.CCCommon.escapeHtml(_tripInfo_)}</div>
                            <div class="file-desc">${item.preview ? window.CCCommon.escapeHtml(item.preview) : ""}</div>
                        </div>
                        <button class="cargo-file-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                    </div>`;}).join("");
                    }
        }

        // Limite offres (progress bar)
        const pct = Math.min(100, (activeCount / 5) * 100);
        if (els.cargoLimitBadge) els.cargoLimitBadge.textContent = `${activeCount}/5`;
        if (els.cargoProgressFill) els.cargoProgressFill.style.width = `${pct}%`;
        if (els.cargoLimitNote) {
            if (activeCount >= 5) els.cargoLimitNote.textContent = "Limite atteinte. Desactivez une offre pour en creer une nouvelle.";
            else els.cargoLimitNote.textContent = `${5 - activeCount} place(s) restante(s) pour une nouvelle ligne active.`;
        }
    }

    async function loadDashboard() {
        if (!window.CCCommon.state.user) return;
        const user = window.CCCommon.state.user;
        const viewType = state.currentView || String(user?.profile_type || "").toLowerCase();

        if (viewType === "traveler") {
            const [offersResp, requestsResp] = await Promise.all([
                window.CCCommon.api("/api/offers?scope=mine&pageSize=100"),
                window.CCCommon.api("/api/conversations")
            ]);

            state.offers = Array.isArray(offersResp?.items) ? offersResp.items : [];
            state.activeOffer = getActiveOffer();
            state.requests = (Array.isArray(requestsResp) ? requestsResp : []).filter((item) => item.isOfferOwner);

            const requests = getRequestsForOffer(state.activeOffer);
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
                els.manageOfferBtn.textContent = state.activeOffer ? "Modifier mon offre" : "Publier mon trajet";
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
        } else if (viewType === "cargo") {
            await loadCargoDashboard();
        } else {
            await loadClientDashboard();
        }
    }

    function bindEvents() {
        // Dashboard toggles (Voyageur/Cargo)
        document.querySelectorAll(".dash-toggle").forEach(btn => {
            btn.addEventListener("click", () => {
                const target = btn.getAttribute("data-switch");
                if (target) switchDashboardView(target);
                // Mettre à jour l'etat actif sur tous les toggles
                // Recharger le contenu du dashboard
                loadDashboard();
            });
        });

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

        // Client dashboard click delegation
        els.clientDiscussionsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            const item = event.target.closest("[data-thread-id]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
                return;
            }
            if (item) {
                const threadId = item.getAttribute("data-thread-id");
                if (threadId) openChatPage(threadId);
            }
        });

        els.clientRequestsList?.addEventListener("click", async (event) => {
            const editBtn = event.target.closest("[data-edit-parcel]");
            if (editBtn) {
                const parcelId = editBtn.getAttribute("data-edit-parcel");
                if (!parcelId) return;
                openEditParcelModal(parcelId);
                return;
            }
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
            }
        });

        // Bouton "Livrer" dans Gestion de mes colis
        els.clientValidatedList?.addEventListener("click", async (event) => {
            const livrerBtn = event.target.closest("[data-livrer]");
            if (livrerBtn) {
                const reservationId = livrerBtn.getAttribute("data-livrer");
                if (!reservationId || !confirm("Marquer ce colis comme livre ?")) return;
                try {
                    if (window.ccSupabase) {
                        const { error } = await window.ccSupabase.from("reservations").update({
                            status: "livre",
                            updated_at: new Date().toISOString()
                        }).eq("id", reservationId);
                        if (error) throw error;
                    }
                    loadClientDashboard();
                } catch (e) {
                    alert("Erreur: " + (e.message || "Impossible de mettre a jour."));
                }
            }
            // Clic sur la ligne → ouvrir la discussion
            const itemRow = event.target.closest("[data-thread-id]");
            if (itemRow) {
                const threadId = itemRow.getAttribute("data-thread-id");
                if (threadId) openChatPage(threadId);
            }
        });

        function openVoirTousModal(title, kicker, items, renderItem) {
            if (!els.voirTousModal) return;
            if (els.voirTousKicker) els.voirTousKicker.textContent = kicker || "";
            if (els.voirTousTitle) els.voirTousTitle.textContent = title;
            if (els.voirTousCount) els.voirTousCount.textContent = `${items.length}`;
            if (els.voirTousList) {
                if (!items.length) {
                    els.voirTousList.innerHTML = `<div class="traveler-empty-requests"><p>Aucun element.</p></div>`;
                } else {
                    els.voirTousList.innerHTML = items.map((item, i) => renderItem(item, i)).join("");
                }
            }
            els.voirTousModal.classList.remove("hidden");
        }

        // Modale de modification de demande
        let _editParcelId = null;
        async function openEditParcelModal(parcelId) {
            _editParcelId = parcelId;
            const parcel = state.parcelRequests?.find(p => String(p.id) === parcelId);
            if (!parcel) return;
            document.getElementById("edit-parcel-origin").value = parcel.origin || "";
            document.getElementById("edit-parcel-destination").value = parcel.destination || "";
            document.getElementById("edit-parcel-date").value = parcel.needed_by_date || "";
            document.getElementById("edit-parcel-kg").value = parcel.weight_kg || "";
            document.getElementById("edit-parcel-description").value = parcel.description || "";
            const fb = document.getElementById("edit-parcel-feedback");
            if (fb) fb.classList.add("hidden");
            const saveBtn = document.getElementById("edit-parcel-save-btn");
            if (saveBtn) { saveBtn.disabled = false; saveBtn.classList.remove("hidden"); saveBtn.textContent = "Enregistrer"; }
            document.getElementById("edit-parcel-modal")?.classList.remove("hidden");
        }

        // Client "Voir tous" propositions -> ouvre la modale de demande
        document.getElementById("client-voir-tous-propositions")?.addEventListener("click", () => {
            const items = state.parcelRequests || [];
            openVoirTousModal("Toutes les demandes", "Demandes", items, (item, i) => `
                <div class="cargo-file-item" data-parcel-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="cargo-file-index">${i + 1}</div>
                    <div class="file-content">
                        <div class="file-title">${window.CCCommon.escapeHtml(item.origin || "")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "")}</div>
                        <div class="file-desc">${item.weight_kg ? item.weight_kg + " kg" : ""}${item.status ? " - " + item.status : ""}</div>
                    </div>
                    <button class="cargo-file-btn" data-edit-parcel="${window.CCCommon.escapeHtml(item.id)}">Modifier</button>
                </div>
            `);
        });








        // Client "Voir tous" discussions
        document.getElementById("client-voir-tous-discussions")?.addEventListener("click", () => {
            const items = state.clientConversations || [];
            openVoirTousModal("Toutes les discussions", "Discussions", items, (item, i) => `
                <div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="cargo-file-index">${i + 1}</div>
                    <div class="file-content">
                        <div class="file-title">${window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client")}</div>
                        <div class="file-desc">${window.CCCommon.escapeHtml(item.origin && item.destination ? item.origin + " -> " + item.destination : item.preview || "")}</div>
                    </div>
                    <button class="cargo-file-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Voir</button>
                </div>
            `);
        });

        // Client "Voir tous" colis
        document.getElementById("client-voir-tous-colis")?.addEventListener("click", () => {
            const items = state.clientValidated || [];
            openVoirTousModal("Gestion de mes colis", "Colis", items, (item, i) => {
                const origin = item.offers?.origin || item.offer_origin || "";
                const dest = item.offers?.destination || item.offer_destination || "";
                const ownerName = item.offers?.owner_name || item.offer_owner_name || 
                    (state.clientConversations || []).find(c => c.reservation_id == item.id || c.reservationId == item.id)?.travelerName || "Voyageur";
                const conv = (state.clientConversations || []).find(c => c.reservation_id == item.id || c.reservationId == item.id);
                const threadId = conv?.id || item.thread_id || null;
                const status = item.status === "paid" ? "en_cours" : item.status;
                const statusLabel = status === "en_cours" ? "En cours" : (status === "livre" ? "Livre" : status);
                const isDelivered = status === "livre";
                return `<div class="cargo-file-item ${threadId ? 'clickable' : ''}" data-reservation-id="${window.CCCommon.escapeHtml(item.id)}" ${threadId ? `data-thread-id="${window.CCCommon.escapeHtml(threadId)}"` : ""}>
                    <div class="cargo-file-index">${i + 1}</div>
                    <div class="file-content">
                        <div class="file-title">${window.CCCommon.escapeHtml(origin || "")} &rarr; ${window.CCCommon.escapeHtml(dest || "")}</div>
                        <div class="file-desc">${window.CCCommon.escapeHtml(ownerName)} | ${item.kg ? item.kg + " kg" : ""} | ${statusLabel}</div>
                    </div>
                    ${!isDelivered ? `<button class="cargo-ops-btn" data-livrer="${window.CCCommon.escapeHtml(item.id)}" style="border-color:var(--line);color:var(--text);flex-shrink:0;">Livrer</button>` : `<span class="pill-green" style="font-size:10px;padding:2px 8px;border-radius:8px;">Livre</span>`}
                </div>`;
            });
        });

        // Cargo "Voir tous" trajets (uniquement les non-archivés)
        document.getElementById("cargo-voir-tous-trajets")?.addEventListener("click", () => {
            const allItems = state.offers || [];
            const items = allItems.filter(o => String(o.status || "").toLowerCase() !== "archived");
            openVoirTousModal("Tous mes trajets", "Trajets", items, (item, i) => {
                const mode = item.mode === "avion" ? "Avion" : item.mode === "bateau" ? "Bateau" : item.mode === "les_deux" ? "Les deux" : "-";
                const vraiStatut = String(item.status || "").toLowerCase();
                const isFull = vraiStatut !== "active" || (item.available_kg !== null && item.available_kg !== undefined && item.available_kg <= 0);
                const statusPill = vraiStatut !== "active" ? 'pill-yellow' : (isFull ? 'pill-pink' : 'pill-green');
                const statusLabel = vraiStatut !== "active" ? vraiStatut.charAt(0).toUpperCase() + vraiStatut.slice(1) : (isFull ? 'Presque plein' : 'Active');
                return `<div class="cargo-file-item" data-offer-id="${window.CCCommon.escapeHtml(item.id)}">
                    <div class="cargo-file-index">${i + 1}</div>
                    <div class="file-content">
                        <div class="file-title">${window.CCCommon.escapeHtml(item.origin || "")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "")}</div>
                        <div class="file-desc">Mode: ${mode} | <span class="${statusPill}" style="padding:1px 6px;border-radius:8px;font-size:10px;">${statusLabel}</span></div>
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                        <button class="cargo-ops-btn" data-offer-id="${window.CCCommon.escapeHtml(item.id)}" data-action="modify-offer">Modifier</button>
                        <button class="cargo-ops-btn cargo-ops-btn-danger" data-offer-id="${window.CCCommon.escapeHtml(item.id)}" data-action="delete">Supprimer</button>
                    </div>
                </div>`;
            });
        });

        // Fermer la modale "Voir tous"
        document.getElementById("close-voir-tous-modal")?.addEventListener("click", () => {
            els.voirTousModal?.classList.add("hidden");
        });
        els.voirTousModal?.addEventListener("click", (event) => {
            if (event.target === els.voirTousModal) els.voirTousModal.classList.add("hidden");
        });

        // Clic sur ligne dans modale "Voir tous"
        els.voirTousList?.addEventListener("click", async (event) => {
            const livrerBtn = event.target.closest("[data-livrer]");
            if (livrerBtn) {
                const reservationId = livrerBtn.getAttribute("data-livrer");
                if (!reservationId || !confirm("Marquer ce colis comme livre ?")) return;
                try {
                    if (window.ccSupabase) {
                        await window.ccSupabase.from("reservations").update({
                            status: "livre", updated_at: new Date().toISOString()
                        }).eq("id", reservationId);
                    }
                    loadClientDashboard();
                    els.voirTousModal?.classList.add("hidden");
                } catch (e) { alert("Erreur: " + (e.message || "")); }
                return;
            }
            // Modifier offre depuis la popup
            const modifyBtn = event.target.closest("[data-action='modify-offer']");
            if (modifyBtn) {
                const offerId = modifyBtn.getAttribute("data-offer-id");
                if (offerId) {
                    const offer = state.offers?.find(o => String(o.id) === offerId);
                    if (offer) {
                        state.activeOffer = offer;
                        els.voirTousModal?.classList.add("hidden");
                        openOfferModal();
                    }
                }
                return;
            }
            // Supprimer offre depuis la popup
            const deleteBtn = event.target.closest("[data-action='delete']");
            if (deleteBtn) {
                const offerId = deleteBtn.getAttribute("data-offer-id");
                if (offerId && confirm("Supprimer cette offre ? Cette action est irreversible.")) {
                    try {
                        if (window.ccSupabase) {
                            await window.ccSupabase.from("offers").update({
                                status: "archived", updated_at: new Date().toISOString()
                            }).eq("id", offerId).eq("user_id", window.CCCommon.state?.user?.id);
                        } else {
                            await window.CCCommon.api(`/api/offers/${offerId}`, { method: "DELETE" });
                        }
                        els.voirTousModal?.classList.add("hidden");
                        loadCargoDashboard();
                    } catch (e) { alert("Erreur: " + (e.message || "")); }
                }
                return;
            }
            // Modifier demande de trajet depuis la popup
            const editParcelBtn = event.target.closest("[data-edit-parcel]");
            if (editParcelBtn) {
                const parcelId = editParcelBtn.getAttribute("data-edit-parcel");
                if (!parcelId) return;
                els.voirTousModal?.classList.add("hidden");
                openEditParcelModal(parcelId);
                return;
            }
            // Bouton "Voir" ou "Repondre" dans la popup → ouvre la discussion
            const openThreadBtn = event.target.closest("[data-open-thread]");
            if (openThreadBtn) {
                const threadId = openThreadBtn.getAttribute("data-open-thread");
                if (threadId) {
                    els.voirTousModal?.classList.add("hidden");
                    openChatPage(threadId);
                }
                return;
            }
            // Clic sur ligne → ouvrir discussion (si applicable)
            const itemRow = event.target.closest("[data-thread-id]");
            if (itemRow && !event.target.closest("button")) {
                const threadId = itemRow.getAttribute("data-thread-id");
                if (threadId) {
                    els.voirTousModal?.classList.add("hidden");
                    openChatPage(threadId);
                }
            }
        });

        // Client cercle + nouvelle proposition
        document.querySelector(".client-plus-btn")?.addEventListener("click", () => {
            const modal = document.getElementById("dashboard-demande-modal");
            if (modal) modal.classList.remove("hidden");
            // Set the currency badge based on user's country of residence
            const currencyBadge = document.getElementById("dash-demande-currency-badge");
            if (currencyBadge) {
                const user = window.CCCommon.state?.user;
                const userCountry = user?.country || user?.user_metadata?.country || "";
                const currency = window.CCCommon.COUNTRY_CURRENCIES[userCountry] || "EUR";
                currencyBadge.textContent = currency;
            }
        });

        // Cargo "Voir tous" demandes (conserve l'ancienne modale cargo)
        document.getElementById("cargo-see-all-requests")?.addEventListener("click", () => {
            if (els.cargoRequestsModal) {
                els.cargoRequestsModal.classList.remove("hidden");
                // Remplir la modale avec la liste complete
                const allItems = state.incomingRequests || [];
                if (els.cargoRequestsModalCount) els.cargoRequestsModalCount.textContent = `${allItems.length}`;
                if (els.cargoRequestsModalList) {
                    if (!allItems.length) {
                        els.cargoRequestsModalList.innerHTML = `<div class="traveler-empty-requests"><p>Aucune demande.</p></div>`;
                    } else {
                        els.cargoRequestsModalList.innerHTML = allItems.map((item, i) => {
                            var _userName_ = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                            var _userName_ = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                            var _tripInfo_ = item.origin && item.destination ? `${item.origin} -> ${item.destination}` : (item.preview ? item.preview : "Trajet non precise");
                            return `<div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                                <div class="cargo-file-index">${i + 1}</div>
                                <div class="file-content">
                                    <div class="file-title">${_userName_} | ${window.CCCommon.escapeHtml(_tripInfo_)}</div>
                                    <div class="file-desc">${item.preview ? window.CCCommon.escapeHtml(item.preview) : ""}</div>
                                </div>
                                <button class="cargo-file-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                            </div>`;
                        }).join("");
                    }
                }
            }
        });

        // Fermer la modale
        document.getElementById("close-cargo-requests-modal")?.addEventListener("click", () => {
            els.cargoRequestsModal?.classList.add("hidden");
        });
        els.cargoRequestsModal?.addEventListener("click", (event) => {
            if (event.target === els.cargoRequestsModal) els.cargoRequestsModal.classList.add("hidden");
        });

        // Clic sur les elements de la modale
        els.cargoRequestsModalList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) {
                    els.cargoRequestsModal?.classList.add("hidden");
                    openChatPage(threadId);
                }
            }
        });

        // Cargo file list click delegation
        els.cargoFileList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
            }
        });

        // Boutons Modifier / Supprimer dans le tableau Operations cargo
        els.cargoOpsTable?.addEventListener("click", async (event) => {
            const button = event.target.closest(".cargo-ops-btn");
            if (!button) return;
            const offerId = button.getAttribute("data-offer-id");
            if (!offerId) return;
            const action = button.getAttribute("data-action");

            if (action === "delete") {
                if (!confirm("Supprimer cette offre ? Cette action est irreversible.")) return;
                const offer = state.offers.find(o => String(o.id) === offerId);
                if (!offer) return;
                try {
                    if (window.ccSupabase) {
                        await window.ccSupabase.from("offers").update({
                            status: "archived",
                            updated_at: new Date().toISOString()
                        }).eq("id", offerId).eq("user_id", window.CCCommon.state.user?.id);
                    } else {
                        await window.CCCommon.api(`/api/offers/${offerId}`, { method: "DELETE" });
                    }
                    await loadDashboard();
                } catch (err) {
                    alert(err.message || "Impossible de supprimer l'offre.");
                }
                return;
            }

            // Sinon : Modifier
            const offer = state.offers.find(o => String(o.id) === offerId);
            if (offer) {
                state.activeOffer = offer;
                openOfferModal();
            }
        });

        // Upload photo de profil -> Sauvegarde dans Supabase
        document.querySelectorAll(".avatar-file-input").forEach(input => {
            input.addEventListener("change", async function() {
                const file = this.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async function(e) {
                    const dataUrl = e.target?.result;
                    if (!dataUrl) return;
                    // Appliquer a tous les cercles avatar
                    document.querySelectorAll(".avatar-circle").forEach(el => {
                        el.style.backgroundImage = `url(${dataUrl})`;
                        el.classList.add("has-image");
                    });
                    // Sauvegarder dans Supabase
                    const userId = window.CCCommon.state?.user?.id;
                    if (userId && window.ccSupabase) {
                        try {
                            const maxSize = 500 * 1024; // 500KB max
                            const trimmed = dataUrl.length > maxSize ? dataUrl.substring(0, maxSize) : dataUrl;
                            await window.ccSupabase.from("profiles").update({
                                profile_photo: trimmed,
                                updated_at: new Date().toISOString()
                            }).eq("id", userId);
                            console.log("Photo de profil sauvegardee");
                        } catch(e) {
                            console.warn("Impossible de sauvegarder la photo:", e);
                        }
                    }
                };
                reader.readAsDataURL(file);
            });
        });
    }

    async function bootstrap() {
        await window.CCCommon.init("dashboard");
        if (!window.CCCommon.requireAuth("dashboard.html")) return;

        const user = window.CCCommon.state.user;
        const profileType = String(user?.profile_type || "").toLowerCase();

        // Basculer entre les vues traveler, client ou cargo
        switchDashboardView(profileType);

        // Activer le toggle par défaut
        document.querySelectorAll(".dash-toggle").forEach(b => b.classList.remove("active"));
        const defaultToggle = document.querySelector(`.dash-toggle[data-switch="${profileType}"]`);
        if (defaultToggle) defaultToggle.classList.add("active");

        // Afficher/masquer les toggles selon le profile_type reel
        document.querySelectorAll(".dash-toggle").forEach(b => {
            const sw = b.getAttribute("data-switch");
            if (profileType === "cargo") {
                b.classList.remove("hidden"); // Tous visibles
            } else if (profileType === "traveler") {
                b.classList.toggle("hidden", sw === "cargo"); // Masquer cargo seulement
            } else {
                b.classList.add("hidden"); // Client: masquer tout
            }
        });
        updateDashboardToggleState(state.currentView);

        if (els.dashboardUser) {
            els.dashboardUser.textContent = user?.fullName || "Voyageur";
        }

        if (els.userChip) {
            els.userChip.textContent = `${getProfileTypeLabel(user)}${user?.is_verified ? " verifie" : ""}`;
        }

        if (els.openMessagesBtn) {
            els.openMessagesBtn.href = "chat.html";
        }

        // Remplir les noms de bienvenue
        const fullName = user?.fullName || user?.full_name || "Utilisateur";
        const travelerName = document.getElementById("traveler-welcome-name");
        const clientName = document.getElementById("client-welcome-name");
        const cargoName = document.getElementById("cargo-welcome-name");
        if (travelerName) travelerName.textContent = fullName;
        if (clientName) clientName.textContent = fullName;
        if (cargoName) cargoName.textContent = fullName;

        // Charger la photo de profil depuis Supabase
        if (user?.id && window.ccSupabase) {
            try {
                const { data: profile } = await window.ccSupabase
                    .from("profiles")
                    .select("profile_photo")
                    .eq("id", user.id)
                    .maybeSingle();
                const savedPhoto = profile?.profile_photo;
                if (savedPhoto) {
                    document.querySelectorAll(".avatar-circle").forEach(el => {
                        el.style.backgroundImage = `url(${savedPhoto})`;
                        el.classList.add("has-image");
                    });
                }
            } catch(e) {
                console.warn("Impossible de charger la photo de profil:", e);
            }
        }

        // Mettre à jour les badges de vérification d'identité
        const updateIdentiteSteps = () => {
            const isVerified = user?.is_verified || false;
            const identityDoc = user?.identity_document_approved || false;
            let steps = 0;
            if (isVerified) steps++;
            if (identityDoc) steps++;
            const levelClass = steps === 0 ? 'level-0' : (steps === 1 ? 'level-1' : 'level-2');
            document.querySelectorAll(".identite-steps").forEach(el => {
                el.textContent = `${steps}/2`;
                el.className = `identite-steps ${levelClass}`;
            });
        };
        updateIdentiteSteps();

        bindEvents();

        // Remplir le datalist des pays pour la modale d'edition d'offre
        const countryDatalist = document.getElementById("offer-country-list");
        const countryOptions = window.CCCommon.COUNTRY_OPTIONS || [];
        if (countryDatalist && countryOptions.length) {
            countryDatalist.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }

        // Remplir le datalist des pays pour la modale demande de trajet
        const dashDemandeList = document.getElementById("dash-demande-country-list");
        if (dashDemandeList && countryOptions.length) {
            dashDemandeList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }

        // Evenements modale demande de trajet dashboard
        document.getElementById("close-dashboard-demande-modal")?.addEventListener("click", () => {
            document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
        });
        document.getElementById("dashboard-demande-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("dashboard-demande-modal")) {
                document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("dash-demande-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("dash-demande-date").value = "";
        });
        document.getElementById("dash-demande-submit-btn")?.addEventListener("click", async () => {
            const origin = document.getElementById("dash-demande-origin")?.value?.trim();
            const destination = document.getElementById("dash-demande-destination")?.value?.trim();
            const kg = parseInt(document.getElementById("dash-demande-kg")?.value, 10);
            const budget = parseFloat(document.getElementById("dash-demande-budget")?.value) || 0;
            const description = document.getElementById("dash-demande-description")?.value?.trim();
            const dateLimite = document.getElementById("dash-demande-date")?.value || null;
            if (!origin || !destination || !kg || !description) {
                alert("Veuillez remplir tous les champs.");
                return;
            }
            const user = window.CCCommon.state?.user;
            const userCountry = user?.country || user?.user_metadata?.country || "";
            const currency = window.CCCommon.COUNTRY_CURRENCIES[userCountry] || "EUR";
            const feedback = document.getElementById("dash-demande-feedback");
            const submitBtn = document.getElementById("dash-demande-submit-btn");
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }
                if (window.ccSupabase) {
                    const userId = window.CCCommon.state?.user?.id;
                    if (!userId) {
                        alert("Vous devez etre connecte.");
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
                        return;
                    }
                    const { error } = await window.ccSupabase.from("parcel_requests").insert({
                        user_id: userId,
                        title: `Demande ${origin} -> ${destination}`,
                        origin,
                        destination,
                        weight_kg: kg,
                        max_price_per_kg: budget > 0 ? budget : null,
                        currency: currency,
                        needed_by_date: dateLimite || null,
                        description,
                        status: "pending"
                    });
                    if (error) throw error;
                }
                if (feedback) feedback.classList.remove("hidden");
                if (submitBtn) submitBtn.classList.add("hidden");
                setTimeout(() => {
                    document.getElementById("dashboard-demande-modal")?.classList.add("hidden");
                    // Recharger le dashboard pour afficher la nouvelle demande
                    loadClientDashboard();
                }, 1500);
            } catch (err) {
                console.error("Erreur:", err);
                alert("Erreur: " + (err.message || "Impossible de soumettre."));
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Faire la demande"; }
            }
        });

        // Evenements modale de modification de demande
        document.getElementById("close-edit-parcel-modal")?.addEventListener("click", () => {
            document.getElementById("edit-parcel-modal")?.classList.add("hidden");
        });
        document.getElementById("edit-parcel-modal")?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("edit-parcel-modal")) {
                document.getElementById("edit-parcel-modal")?.classList.add("hidden");
            }
        });
        document.getElementById("edit-parcel-no-date-btn")?.addEventListener("click", () => {
            document.getElementById("edit-parcel-date").value = "";
        });
        // Remplir le datalist
        const editList = document.getElementById("edit-parcel-country-list");
        if (editList && countryOptions.length) {
            editList.innerHTML = countryOptions.map(c => `<option value="${c}">`).join("");
        }
        document.getElementById("edit-parcel-save-btn")?.addEventListener("click", async () => {
            if (!_editParcelId) return;
            const origin = document.getElementById("edit-parcel-origin")?.value?.trim();
            const destination = document.getElementById("edit-parcel-destination")?.value?.trim();
            const kg = parseInt(document.getElementById("edit-parcel-kg")?.value, 10);
            const description = document.getElementById("edit-parcel-description")?.value?.trim();
            const dateLimite = document.getElementById("edit-parcel-date")?.value || null;
            if (!origin || !destination || !kg || !description) {
                alert("Veuillez remplir tous les champs.");
                return;
            }
            const feedback = document.getElementById("edit-parcel-feedback");
            const saveBtn = document.getElementById("edit-parcel-save-btn");
            try {
                if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Enregistrement..."; }
                if (window.ccSupabase) {
                    const { error } = await window.ccSupabase.from("parcel_requests").update({
                        origin,
                        destination,
                        weight_kg: kg,
                        description,
                        needed_by_date: dateLimite || null,
                        updated_at: new Date().toISOString()
                    }).eq("id", _editParcelId);
                    if (error) throw error;
                }
                if (feedback) feedback.classList.remove("hidden");
                if (saveBtn) saveBtn.classList.add("hidden");
                setTimeout(() => {
                    document.getElementById("edit-parcel-modal")?.classList.add("hidden");
                    loadClientDashboard();
                }, 1200);
            } catch (err) {
                alert("Erreur: " + (err.message || "Impossible de modifier."));
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Enregistrer"; }
            }
        });

        await loadDashboard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
