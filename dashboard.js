(() => {
    const state = {
        offers: [],
        activeOffer: null,
        requests: [],
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
        clientRequestsCount: document.getElementById("client-requests-count"),
        clientDiscussionsList: document.getElementById("client-discussions-list"),
        clientDiscussionsCount: document.getElementById("client-discussions-count"),
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
                    <span>Les personnes interessees apparaiteront ici.</span>
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

    function renderClientRequests(requests) {
        if (!els.clientRequestsList) return;
        if (els.clientRequestsCount) els.clientRequestsCount.textContent = `${requests.length}`;

        if (!requests.length) {
            els.clientRequestsList.innerHTML = `
                <div class="traveler-empty-requests">
                    <p>Aucune demande de trajet pour le moment.</p>
                    <span>Publiez un appel si vous ne trouvez pas de voyageur.</span>
                </div>`;
            return;
        }

        els.clientRequestsList.innerHTML = requests.map((item, i) => `
            <div class="client-discussion-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                <div class="client-item-index">${i + 1}</div>
                <div class="item-content">
                    <div class="item-name">${window.CCCommon.escapeHtml(item.origin || "Origine")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "Destination")}</div>
                    <div class="item-desc">${item.kg ? item.kg + " kg" : ""}${item.status ? " - " + item.status : ""}</div>
                </div>
                <button class="client-item-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Voir</button>
            </div>
        `).join("");
    }

    function renderClientDiscussions(conversations) {
        if (!els.clientDiscussionsList) return;
        if (els.clientDiscussionsCount) els.clientDiscussionsCount.textContent = `${conversations.length}`;

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
                    <p>Aucun trajet valide pour le moment.</p>
                    <span>Vos trajets confirmes apparaitront ici.</span>
                </div>`;
            return;
        }
        els.clientValidatedList.innerHTML = validated.map((item) => `
            <div class="client-discussion-item">
                <div class="item-content">
                    <div class="item-name">${window.CCCommon.escapeHtml(item.origin || "")} &rarr; ${window.CCCommon.escapeHtml(item.destination || "")}</div>
                    <div class="item-desc">${item.status || "Valide"}</div>
                </div>
            </div>
        `).join("");
    }

    function switchDashboardView(profileType) {
        const isTraveler = profileType === "traveler";
        const isCargo = profileType === "cargo";
        const isClient = !isTraveler && !isCargo; // client ou null

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
    }

    async function loadClientDashboard() {
        const user = window.CCCommon.state.user;
        if (!user) return;

        const [offersResp, conversationsResp] = await Promise.all([
            window.CCCommon.api("/api/offers?scope=all&pageSize=10"),
            window.CCCommon.api("/api/conversations")
        ]);

        const compatibleOffers = Array.isArray(offersResp?.items) ? offersResp.items : [];
        const conversations = Array.isArray(conversationsResp) ? conversationsResp.filter(c => !c.isOfferOwner) : [];

        if (els.clientStatOffers) els.clientStatOffers.textContent = `${compatibleOffers.length}`;
        if (els.clientStatDiscussions) els.clientStatDiscussions.textContent = `${conversations.length}`;
        if (els.clientStatPayments) els.clientStatPayments.textContent = "0";

        renderClientRequests([]);
        renderClientDiscussions(conversations);
        renderClientValidated([]);
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

        // Charger les offres du cargo
        const offersResp = await window.CCCommon.api("/api/offers?scope=mine&pageSize=20");
        const myOffers = Array.isArray(offersResp?.items) ? offersResp.items : [];
        state.offers = myOffers; // Stocker pour le bouton Modifier
        const activeOffers = myOffers.filter(o => String(o.status || "").toLowerCase() === "active");
        const allOffers = myOffers.filter(o => String(o.status || "").toLowerCase() !== "archived");
        const activeCount = activeOffers.length;

        // Charger les conversations (pour le compteur demandes)
        const convResp = await window.CCCommon.api("/api/conversations");
        const incoming = Array.isArray(convResp) ? convResp.filter(c => !c.isOfferOwner) : [];
        state.incomingRequests = incoming; // Stocker pour la modale "Voir tous"

        // Stats
        if (els.cargoStatOffers) els.cargoStatOffers.textContent = `${activeCount} / 5`;
        if (els.cargoStatRequests) els.cargoStatRequests.textContent = `${incoming.length}`;

        // Table operations (4 colonnes: LIGNE | MODE | STATUT | [action])
        if (els.cargoOpsTable) {
            if (!activeOffers.length) {
                els.cargoOpsTable.innerHTML = `<div class="cargo-ops-header"><div>LIGNE</div><div>MODE</div><div>STATUT</div><div></div></div><div class="traveler-empty-requests"><p>Aucune ligne active.</p><span>Creez votre premiere offre cargo.</span></div>`;
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
                    const userName = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                    const tripInfo = item.origin && item.destination ? `${item.origin} -> ${item.destination}` : (item.preview ? item.preview : "");
                    return `<div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                        <div class="cargo-file-index">${i + 1}</div>
                        <div class="file-content">
                            <div class="file-title">${userName}</div>
                            <div class="file-desc">${window.CCCommon.escapeHtml(tripInfo)}</div>
                        </div>
                        <button class="cargo-file-btn" data-open-thread="${window.CCCommon.escapeHtml(item.id)}">Repondre</button>
                    </div>`;
                }).join("");
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
        const profileType = String(user?.profile_type || "").toLowerCase();

        if (profileType === "traveler") {
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
        } else if (profileType === "cargo") {
            await loadCargoDashboard();
        } else {
            await loadClientDashboard();
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

        els.clientRequestsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-thread]");
            if (button) {
                const threadId = button.getAttribute("data-open-thread");
                if (threadId) openChatPage(threadId);
            }
        });

        // Cargo "Voir tous" -> ouvre la modale
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
                            const userName = window.CCCommon.escapeHtml(item.travelerName || item.contactName || "Client");
                            const tripInfo = item.origin && item.destination ? `${item.origin} -> ${item.destination}` : (item.preview ? item.preview : "");
                            return `<div class="cargo-file-item" data-thread-id="${window.CCCommon.escapeHtml(item.id)}">
                                <div class="cargo-file-index">${i + 1}</div>
                                <div class="file-content">
                                    <div class="file-title">${userName}</div>
                                    <div class="file-desc">${window.CCCommon.escapeHtml(tripInfo)}</div>
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

        await loadDashboard();
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
