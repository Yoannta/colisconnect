(() => {
    const state = {
        userId: null,
        conversations: [],
        adminInbox: [],
        activeThreadId: null,
        activeThreadData: null, // full thread object including offer data
        messages: [],
        // payment modal state
        receiptBase64: null,
        paymentType: "regular",
        isTutorialAccepted: false,
    };

    // Styling Premium pour le Hub de Paiement
    const hubStyle = document.createElement('style');
    hubStyle.textContent = `
        .phone-split-wrap {
            display: flex;
            align-items: center;
            border-bottom: 2px solid rgba(19, 236, 200, 0.4);
            margin-top: 10px;
            padding-bottom: 6px;
            background: rgba(255, 255, 255, 0.02);
            padding: 10px;
            border-radius: 8px;
        }
        .phone-indicatif {
            width: 55px;
            background: transparent;
            border: none;
            color: var(--emerald-bright);
            font-family: monospace;
            font-size: 1.2rem;
            font-weight: 800;
            outline: none;
        }
        .phone-local-input {
            flex: 1;
            background: transparent;
            border: none;
            color: white;
            font-size: 1.1rem;
            outline: none;
            padding: 0 10px;
        }
        .payment-error-box {
            background: rgba(255, 77, 77, 0.1);
            border: 1px solid rgba(255, 77, 77, 0.2);
            color: #ff7675;
            padding: 12px;
            border-radius: 10px;
            font-size: 0.85rem;
            margin: 15px 0;
            line-height: 1.4;
        }
        .method-btn-premium {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            margin-bottom: 10px;
        }
        .method-btn-premium:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--emerald-bright);
            transform: translateY(-2px);
        }
        .method-btn-premium .icon { font-size: 24px; color: var(--emerald-bright); }
        .method-btn-premium .text-wrap { display: flex; flex-direction: column; }
        .method-btn-premium .title { font-weight: 700; color: white; font-size: 1rem; }
        .method-btn-premium .subtitle { font-size: 0.75rem; opacity: 0.6; }
    `;
    document.head.appendChild(hubStyle);

    const els = {
        refreshBtn: document.getElementById("refresh-conversations-btn"),
        adminInboxList: document.getElementById("admin-inbox-list"),
        conversationsList: document.getElementById("conversations-list"),
        chatMeta: document.getElementById("chat-meta"),
        chatOfferInfo: document.getElementById("chat-offer-info"),
        chatAvatarInitials: document.getElementById("chat-avatar-initials"),
        chatPanelHeader: document.getElementById("chat-panel-header"),
        chatEmptyState: document.getElementById("chat-empty-state"),
        chatSidebar: document.getElementById("chat-sidebar"),
        chatPanel: document.getElementById("chat-panel"),
        chatBackBtn: document.getElementById("chat-back-btn"),
        convSearchInput: document.getElementById("conv-search-input"),
        messagesList: document.getElementById("messages-list"),
        messageForm: document.getElementById("message-form"),
        messageInput: document.getElementById("message-input"),
        chatPayBtn: document.getElementById("chat-pay-btn"),
        chatInfoBanner: document.getElementById("chat-info-banner"),
        tutorialOverlay: document.getElementById("chat-tutorial-overlay"),
        comprisBtn: document.getElementById("banner-compris-btn"),
        paymentModal: document.getElementById("chat-payment-modal"),
        cpmCloseBtn: document.getElementById("cpm-close-btn"),
        cpmQrDisplay: document.getElementById("cpm-qr-display"),
        cpmMethodBadge: document.getElementById("cpm-method-badge"),
        cpmMethodName: document.getElementById("cpm-method-name"),
        cpmAmount: document.getElementById("cpm-amount"),
        cpmReceiptInput: document.getElementById("cpm-receipt-input"),
        cpmReceiptPlaceholder: document.getElementById("cpm-receipt-placeholder"),
        cpmReceiptPreview: document.getElementById("cpm-receipt-preview"),
        cpmConfirmBtn: document.getElementById("cpm-confirm-btn"),
    };

    // ---- Mobile Nav Helpers ----
    function isMobileView() {
        return window.innerWidth <= 800 || document.documentElement.classList.contains('mobile-mode');
    }

    function showChatView() {
        if (!isMobileView()) return;
        els.chatSidebar?.classList.add('mobile-hidden');
        els.chatPanel?.classList.add('mobile-active');
    }

    function showListView() {
        if (!isMobileView()) return;
        els.chatSidebar?.classList.remove('mobile-hidden');
        els.chatPanel?.classList.remove('mobile-active');
    }

    // ---- Conversations ----
    function getInitials(name) {
        const parts = String(name || "?").trim().split(" ").filter(Boolean);
        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function formatConvTime(isoDate) {
        if (!isoDate) return "";
        try {
            const d = new Date(isoDate);
            const now = new Date();
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            if (diffDays === 1) return "Hier";
            if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
            return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        } catch { return ""; }
    }

    function renderConversations(filterText = "") {
        if (!els.conversationsList) return;
        const term = filterText.toLowerCase().trim();
        const visible = term
            ? state.conversations.filter(t => (t.travelerName || "").toLowerCase().includes(term) || (t.preview || "").toLowerCase().includes(term))
            : state.conversations;

        if (!visible.length) {
            els.conversationsList.innerHTML = '<div class="chat-empty-conv">Aucune conversation.</div>';
            return;
        }
        els.conversationsList.innerHTML = visible
            .map((thread) => {
                const active = thread.id === state.activeThreadId ? "is-active" : "";
                const name = window.CCCommon.escapeHtml(thread.travelerName || "Contact");
                const initials = getInitials(thread.travelerName || "Contact");
                const preview = window.CCCommon.escapeHtml(thread.preview || "Aucun message");
                const time = formatConvTime(thread.lastMessageAt || thread.updatedAt);
                const statusClass =
                    thread.status === "voyageur_paye" ? "status-voyageur-paye" :
                        thread.status === "colisconnect_paye" ? "status-colisconnect-paye" : "";

                let statusLabel = "";
                if (thread.isOfferOwner && thread.status === "voyageur_paye") {
                    statusLabel = "payer colisconnect";
                }

                return `
<button class="chat-conv-item ${active}" data-thread-id="${window.CCCommon.escapeHtml(thread.id)}">
    <div class="conv-avatar ${statusClass}">${initials}</div>
    <div class="conv-info">
        <div class="conv-top-row">
            <span class="conv-name">${name}</span>
            <span class="conv-time">${time}</span>
        </div>
        <div class="conv-bottom-row">
            <span class="conv-preview">${preview}</span>
            ${statusLabel ? `<span class="conv-status-pill">${window.CCCommon.escapeHtml(statusLabel)}</span>` : ""}
        </div>
    </div>
</button>`;
            })
            .join("\n");
    }

    function renderAdminInbox() {
        const section = document.getElementById("admin-inbox-section");
        if (!els.adminInboxList) return;
        if (!state.adminInbox.length) {
            if (section) section.style.display = "none";
            els.adminInboxList.innerHTML = "";
            return;
        }
        if (section) section.style.display = "flex";
        els.adminInboxList.innerHTML = state.adminInbox
            .map((item) => `
<article class="chat-admin-item">
    <div class="chat-admin-item-top">
        <span class="conv-status-pill">${window.CCCommon.escapeHtml(item.section || "general")}</span>
        <span class="conv-time">${formatConvTime(item.createdAt)}</span>
    </div>
    <p class="chat-admin-item-text">${window.CCCommon.escapeHtml(item.text || "")}</p>
</article>`)
            .join("\n");
    }

    // ---- Message rendering ----
    function formatMsgTime(isoDate) {
        if (!isoDate) return "";
        try { return new Date(isoDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
        catch { return ""; }
    }

    function renderMessages(messages) {
        if (!els.messagesList) return;
        const rows = Array.isArray(messages) ? messages : [];

        if (!rows.length) {
            els.messagesList.innerHTML = '<div class="chat-no-messages"><span>💬</span>Pas encore de messages.<br><small>Commencez la conversation !</small></div>';
        } else {
            els.messagesList.innerHTML = rows.map(renderSingleMessage).join("\n");
            els.messagesList.scrollTop = els.messagesList.scrollHeight;
        }
        state.messages = rows;
    }

    function renderSingleMessage(msg) {
        const sender = String(msg.sender || "system");
        const msgType = String(msg.messageType || msg.message_type || "text");
        const timeStr = formatMsgTime(msg.createdAt || msg.created_at);

        // ---- Special message types: checked FIRST regardless of sender ----

        if (msgType === "reversal_request") {
            let parsed = {};
            try { parsed = JSON.parse(msg.text || "{}"); } catch { }
            const commission = Number(parsed.commission || 0).toFixed(2);
            const amountPaid = Number(parsed.amountPaid || 0).toFixed(2);
            const cur = parsed.currency || 'EUR';
            return `<div class="chat-msg-row chat-msg-system">
    <div class="chat-bubble-reversal">
        <div class="reversal-header">💰 Reversement de commission</div>
        <p>Le client a payé <strong>${window.CCCommon.formatAmount(amountPaid, cur)}</strong>.</p>
        <p>Veuillez reverser <strong class="reversal-amount">${window.CCCommon.formatAmount(commission, cur)} (10%)</strong> à ColisConnect.</p>
        <button class="btn secondary reversal-done-btn" data-commission="${commission}">✅ J'ai reversé</button>
    </div>
</div>`;
        }

        if (msgType === "payment_receipt") {
            const side = sender === "user" ? "chat-msg-right" : "chat-msg-left";
            const bubbleCss = sender === "user" ? "chat-bubble-user" : "chat-bubble-traveler";
            const src = window.CCCommon.escapeHtml(msg.text || "");
            return `<div class="chat-msg-row ${side}">
    <div class="${bubbleCss} chat-bubble-img">
        <div class="msg-receipt-label">📎 Capture de paiement</div>
        <img src="${src}" alt="Reçu de paiement" class="msg-receipt-img" loading="lazy">
        ${timeStr ? `<span class="chat-msg-time">${timeStr}</span>` : ""}
    </div>
</div>`;
        }

        if (sender === "system") {
            return `<div class="chat-msg-row chat-msg-system"><span class="chat-bubble-system">${window.CCCommon.escapeHtml(msg.text || "")}</span></div>`;
        }

        const side = sender === "user" ? "chat-msg-right" : "chat-msg-left";
        const bubbleCss = sender === "user" ? "chat-bubble-user" : "chat-bubble-traveler";

        return `<div class="chat-msg-row ${side}">
    <div class="${bubbleCss}">
        ${window.CCCommon.escapeHtml(msg.text || "")}
        ${timeStr ? `<span class="chat-msg-time">${timeStr}</span>` : ""}
    </div>
</div>`;
    }

    function currentThread() {
        return state.conversations.find((item) => item.id === state.activeThreadId);
    }

    // ---- Visibility of "Payer" button ----
    function updatePaymentButtonVisibility() {
        const thread = currentThread();
        if (!thread || !window.CCCommon.state?.user) {
            els.chatPayBtn?.classList.add("hidden");
            els.chatInfoBanner?.classList.add("hidden");
            return;
        }

        // Show "Valider" button for the requester (client) when status is pending or agreed
        const payableStatuses = ["pending", "commission_payee", "agreed"];
        const isClientSide = !thread.isOfferOwner && payableStatuses.includes(String(thread.status || ""));

        if (els.chatPayBtn) {
            els.chatPayBtn.classList.toggle("hidden", !isClientSide);
            if (isClientSide) {
                // Remplacement du texte de paiement par le label de validation
                els.chatPayBtn.innerHTML = "✅ Valider ma réservation";
            }
        }

        if (els.chatInfoBanner) {
            // La bannière s'affiche systématiquement pour le client en attente de validation
            const shouldShowBanner = isClientSide && (thread.status === "pending" || thread.status === "agreed");
            els.chatInfoBanner.classList.toggle("hidden", !shouldShowBanner);

            // SI LA BANNIERE N'EST PAS REQUISE, ON VALIDE AUTOMATIQUEMENT LE TUTO POUR NE PAS BLOQUER LE CHAT
            if (!shouldShowBanner) {
                state.isTutorialAccepted = true;
            }

            // Gestion du bouton "Compris" à l'intérieur
            if (els.comprisBtn) {
                els.comprisBtn.classList.toggle("hidden", state.isTutorialAccepted);
            }
        }
    }

    function triggerTutorialFocus() {
        if (state.isTutorialAccepted) return;

        // Sécurité : si la bannière est masquée, on ne bloque pas l'utilisateur
        if (els.chatInfoBanner && els.chatInfoBanner.classList.contains("hidden")) {
            state.isTutorialAccepted = true;
            return;
        }

        if (els.tutorialOverlay) els.tutorialOverlay.classList.remove("hidden");
        if (els.chatInfoBanner) {
            els.chatInfoBanner.classList.add("tutorial-focus");
        }
        if (els.comprisBtn) {
            els.comprisBtn.classList.add("highlight-mode");
        }

        // Vibration mobile si supportée
        if (navigator.vibrate) navigator.vibrate(50);
    }

    function renderConversationMeta(thread) {
        if (!thread) return;
        els.chatPanelHeader?.classList.remove("hidden");
        els.chatEmptyState?.classList.add("hidden");
        if (els.chatAvatarInitials) els.chatAvatarInitials.textContent = getInitials(thread.travelerName || "Contact");
        if (els.chatMeta) els.chatMeta.textContent = thread.travelerName || "Contact";
        if (els.chatOfferInfo) els.chatOfferInfo.textContent = thread.offerTitle || "";
    }

    async function openThread(threadId) {
        if (!threadId) return;
        const selected = state.conversations.find((item) => item.id === threadId);
        state.activeThreadId = threadId;
        state.activeThreadData = selected || null;
        renderConversations();
        showChatView(); // Mobile: switch to chat panel

        const messages = await window.CCCommon.api(`/api/conversations/${encodeURIComponent(threadId)}/messages`);
        renderMessages(messages);
        renderConversationMeta(selected);

        // Check if tutorial was already accepted specifically for THIS thread
        state.isTutorialAccepted = isThreadTutorialAccepted(threadId);
        updatePaymentButtonVisibility();
    }

    function isThreadTutorialAccepted(threadId) {
        try {
            const accepted = JSON.parse(localStorage.getItem("cc_accepted_threads") || "[]");
            return Array.isArray(accepted) && accepted.includes(threadId);
        } catch (e) { return false; }
    }

    function markThreadTutorialAccepted(threadId) {
        if (!threadId) return;
        try {
            const accepted = JSON.parse(localStorage.getItem("cc_accepted_threads") || "[]");
            if (!accepted.includes(threadId)) {
                accepted.push(threadId);
                localStorage.setItem("cc_accepted_threads", JSON.stringify(accepted));
            }
        } catch (e) { }
    }


    async function loadConversations() {
        const [rows, inboxPayload] = await Promise.all([
            window.CCCommon.api("/api/conversations"),
            window.CCCommon.api("/api/admin/inbox")
        ]);
        state.conversations = Array.isArray(rows) ? rows : [];
        state.adminInbox = Array.isArray(inboxPayload?.items) ? inboxPayload.items : [];
        renderAdminInbox();
        renderConversations();

        if (!state.activeThreadId && state.conversations.length) {
            state.activeThreadId = state.conversations[0].id;
        }

        if (state.activeThreadId) {
            await openThread(state.activeThreadId);
        } else {
            renderMessages([]);
            if (els.chatMeta) els.chatMeta.textContent = "Aucune conversation pour le moment.";
        }
    }

    async function ensureConversationForOffer(offerId) {
        if (!offerId) return;
        const numericId = Number(offerId);
        if (!Number.isFinite(numericId) || numericId <= 0) return;

        const thread = await window.CCCommon.api("/api/conversations/by-offer", {
            method: "POST",
            body: { offerId: numericId }
        });

        await loadConversations();
        if (thread?.id) {
            state.activeThreadId = thread.id;
            await openThread(thread.id);
        }
    }

    // ---- Anti-Leak: Client-side patterns (lightweight) ----
    const LEAK_PATTERNS_CLIENT = [
        /(?:\+|00)?\d[\d\s\-\.]{7,}/,          // phone-like sequences
        /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i, // email
        /whatsapp|wa\.me|telegram|t\.me/i,      // messaging apps
        /@[a-z0-9._]{3,}/i,                     // @username
        /https?:\/\/|www\./i,                    // URL
        /facebook|instagram|tiktok|snapchat|twitter/i, // socials
    ];

    function detectLeakClient(text) {
        if (!text) return false;
        const norm = text.trim().toLowerCase();
        return LEAK_PATTERNS_CLIENT.some(p => p.test(norm));
    }

    function showLeakWarning(show) {
        let banner = document.getElementById("chat-leak-warning");
        if (show) {
            if (!banner) {
                banner = document.createElement("div");
                banner.id = "chat-leak-warning";
                banner.className = "chat-leak-banner";
                banner.innerHTML = `⚠️ <strong>Contenu interdit détecté.</strong> Partager des coordonnées personnelles (numéro, email, réseaux sociaux...) est interdit et enregistré.`;
                els.messageForm?.parentNode?.insertBefore(banner, els.messageForm);
            }
            banner.classList.add("visible");
            if (els.messageForm?.querySelector("[type='submit']")) {
                els.messageForm.querySelector("[type='submit']").disabled = true;
            }
        } else {
            if (banner) banner.classList.remove("visible");
            if (els.messageForm?.querySelector("[type='submit']")) {
                els.messageForm.querySelector("[type='submit']").disabled = false;
            }
        }
    }

    async function submitMessage(event) {
        event.preventDefault();
        if (!window.CCCommon.requireCompletedProfile()) return;
        const text = String(els.messageInput?.value || "").trim();
        if (!text) return;
        if (!state.activeThreadId) {
            alert("Sélectionnez une conversation.");
            return;
        }

        // Tutorial Enforcement
        if (!state.isTutorialAccepted) {
            triggerTutorialFocus();
            return;
        }

        // Client-side quick check
        if (detectLeakClient(text)) {
            showLeakWarning(true);
            return;
        }

        try {
            await window.CCCommon.api(`/api/conversations/${encodeURIComponent(state.activeThreadId)}/messages`, {
                method: "POST",
                body: { text }
            });
            if (els.messageInput) els.messageInput.value = "";
            showLeakWarning(false);
            await openThread(state.activeThreadId);
        } catch (error) {
            if (error?.payload?.code === "CONTACT_INFO_BLOCKED") {
                showLeakWarning(true);
                // Replace generic alert with inline warning (already shown)
            } else {
                alert(error.message || "Envoi impossible.");
            }
        }
    }

    // ---- Payment & Checkout (Split P2P) ----
    const PAYMENT_STATE = { step: null, amount: 0 };

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ""));
            r.onerror = () => reject(new Error("Lecture fichier impossible."));
            r.readAsDataURL(file);
        });
    }

    async function openSplitPaymentModal() {
        if (!state.activeThreadId || !state.activeThreadData) return alert("Sélectionnez une conversation d'abord.");
        const thread = state.activeThreadData;

        // ÉTAPE 2/2 : Si la plateforme est déjà payée (Commission ColisConnect validée)
        if (thread.status === "commission_payee") {
            const qr = thread.travelerAlipayQr || thread.travelerWechatQr;
            if (!qr) return alert("Le voyageur n'a pas encore configuré ses moyens de paiement. Veuillez lui demander dans le chat.");

            PAYMENT_STATE.step = "traveler";
            const modal = document.getElementById("split-payment-modal");
            document.getElementById("split-payment-title").textContent = "Payer le Voyageur";
            document.getElementById("split-payment-step-desc").textContent = "Scannez le QR Code du voyageur ci-dessous.";
            document.getElementById("split-payment-qr-img").src = qr;

            // Calcul du montant restant (88%) ou prix convenu
            // Note: Pour simplifier, on affiche le message de rappel
            document.getElementById("split-payment-amount").textContent = "Montant convenu";

            modal.classList.remove("hidden");
            return;
        }

        // ÉTAPE 1/2 : Paiement de la commission (Hub ColisConnect)
        const modal = document.getElementById("payment-hub-modal");
        const amountDisplay = document.getElementById("payment-hub-amount-banner");
        const methodsGrid = document.getElementById("payment-hub-methods");

        // Calcul du montant (20 RMB fixe pour le hub)
        const offerOrigin = thread.offers?.origin || thread.offer?.origin || "France";
        const userCur = window.CCCommon.COUNTRY_CURRENCIES[offerOrigin] || "EUR";
        const localAmount = window.CCCommon.convertCurrency(20, "CNY", userCur);
        amountDisplay.textContent = window.CCCommon.formatAmount(localAmount, userCur);

        // Affichage initial : Choix du type de paiement
        methodsGrid.innerHTML = `
            <div style="width: 100%;">
                <button class="method-btn-premium" id="btn-choice-momo">
                    <span class="icon">📱</span>
                    <div class="text-wrap">
                        <span class="title">Mobile Money</span>
                        <span class="subtitle">Orange, MTN, Wave, Airtel...</span>
                    </div>
                </button>
                <button class="method-btn-premium" id="btn-choice-card">
                    <span class="icon">💳</span>
                    <div class="text-wrap">
                        <span class="title">Carte / Visa / Mastercard</span>
                        <span class="subtitle">Paiement international par Stripe</span>
                    </div>
                </button>
            </div>
        `;

        modal.classList.remove("hidden");

        // Événements
        document.getElementById("btn-choice-card").onclick = () => handleHubPayment("card");
        document.getElementById("btn-choice-momo").onclick = () => showMomoPhoneStep();
    }

    async function showMomoPhoneStep() {
        const methodsGrid = document.getElementById("payment-hub-methods");

        methodsGrid.innerHTML = `
            <div style="width: 100%; animation: fadeIn 0.3s;">
                <p style="margin-bottom: 12px; font-size: 0.9rem; color: white; opacity: 0.9;">Entrez votre numéro de paiement :</p>
                
                <div class="phone-split-wrap">
                    <input type="text" id="hub-phone-prefix" value="+" maxlength="5" class="phone-indicatif">
                    <input type="text" id="hub-phone-local" placeholder="Numéro local" class="phone-local-input">
                </div>
                
                <div id="hub-error-zone"></div>

                <button class="btn primary" id="btn-hub-momo-next" style="width: 100%; margin-top: 20px; padding: 12px;">
                    Valider le numéro
                </button>
                <button class="btn ghost sm" id="btn-hub-back" style="width: 100%; margin-top: 10px;">Retour</button>
            </div>
        `;

        document.getElementById("btn-hub-back").onclick = () => openSplitPaymentModal();
        document.getElementById("btn-hub-momo-next").onclick = () => validateMomoPhoneNumber();
    }

    function validateMomoPhoneNumber() {
        const prefix = document.getElementById("hub-phone-prefix").value.trim();
        const local = document.getElementById("hub-phone-local").value.trim();
        const fullPhone = prefix + local;
        const errorZone = document.getElementById("hub-error-zone");

        // Whitelist des indicatifs supportés
        const momoPrefixes = ["+225", "+221", "+229", "+237", "+243", "+242", "+241", "+254", "+256", "+250", "+260", "+232"];

        if (!prefix.startsWith("+") || prefix.length < 3) {
            errorZone.innerHTML = `<div class="payment-error-box">Veuillez entrer un indicatif pays valide (ex: +237).</div>`;
            return;
        }

        if (!momoPrefixes.includes(prefix)) {
            errorZone.innerHTML = `
                <div class="payment-error-box" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #ccc;">
                    ⚠️ Nous ne supportons pas encore le Mobile Money dans ce pays. <br>
                    <strong>Veuillez payer par carte bancaire.</strong>
                </div>
                <button class="method-btn-premium" id="btn-fallback-card" style="border-color: var(--emerald-bright); margin-top: 10px;">
                     <span class="icon">💳</span>
                     <div class="text-wrap">
                        <span class="title">Payer par Carte</span>
                        <span class="subtitle">Stripe Checkout</span>
                    </div>
                </button>
            `;
            document.getElementById("btn-fallback-card").onclick = () => handleHubPayment("card");
            document.getElementById("btn-hub-momo-next").style.display = "none";
            return;
        }

        // Si le pays est dans notre liste de choix d'opérateurs, on affiche l'étape
        const operatorCountries = ["+237", "+225", "+221", "+229"];
        if (operatorCountries.includes(prefix)) {
            showOperatorStep(prefix, fullPhone);
        } else {
            handleHubPayment("momo", null, fullPhone);
        }
    }

    function showOperatorStep(prefix, phone) {
        const methodsGrid = document.getElementById("payment-hub-methods");
        let operators = [];

        if (prefix === "+237") { // Cameroun
            operators = [
                { id: "MTN_MOMO_CMR", name: "MTN", img: "https://www.vectorlogo.zone/logos/mtn/mtn-icon.svg" },
                { id: "ORANGE_CMR", name: "Orange", img: "https://www.vectorlogo.zone/logos/orange/orange-icon.svg" }
            ];
        } else if (prefix === "+225") { // Côte d'Ivoire
            operators = [
                { id: "ORANGE_CIV", name: "Orange", img: "https://www.vectorlogo.zone/logos/orange/orange-icon.svg" },
                { id: "MTN_CIV", name: "MTN", img: "https://www.vectorlogo.zone/logos/mtn/mtn-icon.svg" },
                { id: "MOOV_CIV", name: "Moov", img: "https://www.vectorlogo.zone/logos/moov/moov-icon.svg" },
                { id: "WAVE_CIV", name: "Wave", img: "https://www.vectorlogo.zone/logos/wave/wave-icon.svg" }
            ];
        } else if (prefix === "+221") { // Sénégal
            operators = [
                { id: "ORANGE_SEN", name: "Orange", img: "https://www.vectorlogo.zone/logos/orange/orange-icon.svg" },
                { id: "FREE_SEN", name: "Free", img: "https://www.vectorlogo.zone/logos/free/free-icon.svg" },
                { id: "WAVE_SEN", name: "Wave", img: "https://www.vectorlogo.zone/logos/wave/wave-icon.svg" }
            ];
        } else if (prefix === "+229") { // Bénin
            operators = [
                { id: "MTN_BEN", name: "MTN", img: "https://www.vectorlogo.zone/logos/mtn/mtn-icon.svg" },
                { id: "MOOV_BEN", name: "Moov", img: "https://www.vectorlogo.zone/logos/moov/moov-icon.svg" }
            ];
        }

        methodsGrid.innerHTML = `
            <div style="width: 100%; animation: fadeIn 0.3s;">
                <p style="margin-bottom: 12px; font-size: 0.9rem; color: white;">Choisissez votre réseau :</p>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${operators.map(op => `
                        <button class="method-btn-premium op-choice-btn" data-op-id="${op.id}" style="flex-direction: column; text-align: center; justify-content: center; padding: 15px 5px; margin-bottom: 0;">
                            <img src="${op.img}" style="height:28px; margin-bottom: 5px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1041/1041888.png'">
                            <span class="title" style="font-size: 0.85rem;">${op.name}</span>
                        </button>
                    `).join('')}
                </div>
                <button class="btn ghost sm" id="btn-op-back" style="width: 100%; margin-top: 15px;">Retour</button>
            </div>
        `;

        document.getElementById("btn-op-back").onclick = () => showMomoPhoneStep();
        document.querySelectorAll(".op-choice-btn").forEach(btn => {
            btn.onclick = () => handleHubPayment("momo", btn.getAttribute("data-op-id"), phone);
        });
    }

    async function submitSplitPayment() {
        console.log("[Payment Debug] Début de la soumission...");
        const receiptInput = document.getElementById("split-payment-receipt");
        const file = receiptInput?.files?.[0];
        if (!file) return alert("Veuillez uploader la capture d'écran du paiement.");


        const submitBtn = document.getElementById("split-payment-submit");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Envoi...';

        try {
            const base64 = await fileToDataUrl(file);
            const isCommission = PAYMENT_STATE.step === "commission";
            const reservationId = state.activeThreadData?.reservation?.id || state.activeThreadData?.reservation_id;
            console.log("[Payment Debug] ID de réservation trouvé :", reservationId);

            if (!reservationId) {
                console.error("[Payment Debug] Erreur: ID manquant dans state.activeThreadData :", state.activeThreadData);
                throw new Error("Erreur système : ID de réservation introuvable.");
            }
            alert(`[DEBUG] Envoi paiement pour réservation #${reservationId}`);


            const endpoint = isCommission
                ? `/api/reservations/${reservationId}/pay-commission`
                : `/api/reservations/${reservationId}/pay-traveler`;

            console.log(`[Payment] Envoi vers ${endpoint} (Montant: ${PAYMENT_STATE.amount})`);

            await window.CCCommon.api(endpoint, {
                method: "POST",
                body: { receiptData: base64, amount: PAYMENT_STATE.amount }
            });


            document.getElementById("split-payment-modal").classList.add("hidden");

            if (isCommission) {
                // Automatically transition to step 2 (Traveler payment)
                alert("Paiement plateforme reçu ! Vous pouvez maintenant payer le voyageur directement.");
                // We need to re-fetch the thread data to ensure we have the updated status
                await loadConversations();

                // Use the saved totalAmount
                if (PAYMENT_STATE.totalAmount > 0) {
                    await openSplitPaymentModal("traveler", PAYMENT_STATE.totalAmount);
                }
            } else {
                alert("Preuve de paiement envoyée au voyageur avec succès !");
                await openThread(state.activeThreadId);
            }
        } catch (err) {
            const feedback = document.getElementById("split-payment-feedback");
            if (err.payload?.code === "RECEIPT_INVALID") {
                if (feedback) {
                    feedback.innerHTML = `<div class="payment-error-box">⚠️ <strong>Reçu non reconnu</strong><br>${err.payload.detail || "Veuillez uploader un vrai reçu de paiement Mobile Money."}</div>`;
                }
            } else if (err.payload?.code === "AMOUNT_MISMATCH") {
                if (feedback) {
                    feedback.innerHTML = `<div class="payment-error-box">⚠️ <strong>Montant incorrect</strong><br>${err.payload.detail}</div>`;
                }
            } else if (err.payload?.code === "PRICE_FRAUD") {
                if (feedback) {
                    feedback.innerHTML = `<div class="payment-error-box" style="border-color: #ff4d4d; color: #ff4d4d;">🛑 <strong>Tentative de fraude detected</strong><br>${err.payload.detail}</div>`;
                }
            } else {

                alert(err.message || "Erreur lors de l'envoi.");
            }
        } finally {

            submitBtn.disabled = false;
            submitBtn.innerHTML = "Confirmer le paiement";
        }
    }

    async function handleHubPayment(preferredMethod, provider = null, phoneNum = null) {
        const resId = state.activeThreadData?.reservation?.id ||
            state.activeThreadData?.reservation_id ||
            state.activeThreadData?.reservationId;

        if (!resId) return alert("Identifiant réservation manquant.");

        // On cherche un bouton actif pour afficher le spinner
        const btnMomo = document.getElementById("btn-hub-momo-next");
        const btnCard = document.getElementById("btn-choice-card");
        const btnCmr = document.getElementById("btn-mtn-cmr") || document.getElementById("btn-orange-cmr");

        const btn = btnMomo || btnCard || btnCmr;
        const originalContent = btn ? btn.innerHTML : "";
        if (btn) {
            btn.innerHTML = `<span class="spinner"></span> Connexion...`;
            btn.style.pointerEvents = "none";
        }

        try {
            const result = await window.CCCommon.api("/api/payments/initiate", {
                method: "POST",
                body: {
                    reservationId: resId,
                    preferredMode: preferredMethod,
                    mmoProvider: provider,
                    phoneNumber: phoneNum
                }
            });

            if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else {
                throw new Error("Lien de paiement non généré.");
            }
        } catch (err) {
            if (btn) {
                btn.innerHTML = originalContent;
                btn.style.pointerEvents = "";
            }
            alert("Erreur: " + (err.message || "Service momentanément indisponible."));
        }
    }

    // ---- Events ----
    function bindEvents() {
        // Refresh
        els.refreshBtn?.addEventListener("click", () => {
            loadConversations().catch((error) => alert(error.message || "Rafraîchissement impossible."));
        });

        // Conversations click
        els.conversationsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-thread-id]");
            if (!button) return;
            const threadId = button.getAttribute("data-thread-id");
            if (threadId) openThread(threadId).catch((error) => alert(error.message || "Ouverture impossible."));
        });

        // Mobile back button
        els.chatBackBtn?.addEventListener("click", () => {
            showListView();
        });

        // Search filter
        els.convSearchInput?.addEventListener("input", () => {
            renderConversations(els.convSearchInput.value);
        });

        // Message form
        els.messageForm?.addEventListener("submit", (event) => {
            submitMessage(event).catch((error) => alert(error.message || "Envoi impossible."));
        });

        els.messageInput?.addEventListener("input", () => {
            const text = els.messageInput.value;
            if (detectLeakClient(text)) {
                showLeakWarning(true);
            } else {
                showLeakWarning(false);
            }
        });

        // Split Payment Setup
        els.chatPayBtn?.addEventListener("click", () => openSplitPaymentModal());

        // Split Payment Modal Events
        document.getElementById("split-payment-close")?.addEventListener("click", () => {
            document.getElementById("split-payment-modal").classList.add("hidden");
        });
        document.getElementById("payment-hub-close")?.addEventListener("click", () => {
            document.getElementById("payment-hub-modal").classList.add("hidden");
        });
        document.getElementById("split-payment-submit")?.addEventListener("click", () => submitSplitPayment());

        // Banner Tutorial Click
        els.comprisBtn?.addEventListener("click", () => {
            state.isTutorialAccepted = true;
            if (state.activeThreadId) {
                markThreadTutorialAccepted(state.activeThreadId);
            }
            els.tutorialOverlay?.classList.add("hidden");
            els.chatInfoBanner?.classList.remove("tutorial-focus");
            els.comprisBtn?.classList.remove("highlight-mode");
            // On cache seulement le bouton, la bannière reste en rappel
            els.comprisBtn?.classList.add("hidden");
        });

        // Bloquer le clic sur l'input si pas compris
        els.messageInput?.addEventListener("mousedown", (e) => {
            if (!state.isTutorialAccepted && !els.chatInfoBanner.classList.contains("hidden")) {
                e.preventDefault();
                triggerTutorialFocus();
            }
        });
    }

    // ---- Bootstrap ----
    async function bootstrap() {
        await window.CCCommon.init("chat");
        if (!window.CCCommon.requireAuth("chat.html")) return;
        state.userId = window.CCCommon.state.user?.id;

        const params = new URLSearchParams(window.location.search || "");
        const offerId = params.get("offerId");

        bindEvents();

        if (offerId) {
            await ensureConversationForOffer(offerId);
        } else {
            await loadConversations();
        }

        // Refresh notification badges after entering chat (messages are being read)
        setTimeout(() => {
            window.CCCommon?.syncNotificationBadges?.();
        }, 1500);
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
