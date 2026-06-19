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

    // ---- Helpers ----
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

    function showNotification(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `cc-toast ${type}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add("visible"), 100);
        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 500);
        }, 5000);
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
        if (els.chatOfferInfo) els.chatOfferInfo.textContent = thread.offerTitle || "Détails de l'offre";

        // --- AFFICHAGE DES INFOS DE CONTACT (Si payé) ---
        const paidStatuses = ["paid", "voyageur_paye", "colisconnect_paye"];
        const isPaid = paidStatuses.includes(String(thread.status || ""));

        let contactBox = document.getElementById("chat-contact-revealed");
        if (!contactBox) {
            contactBox = document.createElement("div");
            contactBox.id = "chat-contact-revealed";
            els.chatPanelHeader?.after(contactBox);
        }

        if (isPaid && !thread.isOfferOwner) {
            // On récupère le profil du voyageur pour avoir son numéro
            const travelerId = thread.offerOwnerId || thread.offer_owner_id;
            fetchTravelerContact(travelerId).then(profile => {
                if (!profile) return;
                contactBox.innerHTML = `
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1)); border: 1px solid var(--emerald-bright); padding: 15px; border-radius: 12px; margin: 10px 20px; animation: slideDown 0.4s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: var(--emerald-bright); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">✅ Réservation Confirmée</div>
                                <div style="font-weight: 700; font-size: 1.1rem; color: white;">${window.CCCommon.escapeHtml(profile.full_name || thread.travelerName)}</div>
                                <div style="color: #aaa; font-size: 0.9rem; margin-top: 2px;">Tél: ${window.CCCommon.escapeHtml(profile.phone_number || "Non renseigné")}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <a href="https://wa.me/${(profile.phone_number || "").replace(/\+/g, '').replace(/\s/g, '')}" target="_blank" 
                                   style="background: #25D366; color: white; padding: 8px 12px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width: 16px; filter: brightness(0) invert(1);"> WhatsApp
                                </a>
                                <button id="btn-show-receipt" 
                                   style="background: rgba(255,255,255,0.1); color: white; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; font-size: 0.8rem; cursor: pointer;">
                                    🧾 Voir le reçu
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.getElementById("btn-show-receipt").onclick = () => showPaymentReceipt(thread, profile);
            });
        } else {
            contactBox.innerHTML = "";
        }
    }

    function showPaymentReceipt(thread, profile) {
        const res = thread.reservation || thread;
        const txId = res.payment_tx_id || res.paymentTxId || "N/A";
        const date = res.updated_at ? new Date(res.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";

        // On crée une modale simple ou on utilise une existante
        const receiptHtml = `
            <div style="padding: 20px; text-align: center; color: white; font-family: 'Inter', sans-serif;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🧾</div>
                <h2 style="margin-bottom: 20px; color: var(--emerald-bright);">Reçu de Paiement</h2>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; text-align: left; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                        <span style="color: #aaa;">Référence :</span>
                        <span style="font-family: monospace; font-weight: 700;">${txId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #aaa;">Date :</span>
                        <span>${date}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #aaa;">Bénéficiaire :</span>
                        <span>ColisConnect (Commission)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #aaa;">Client :</span>
                        <span>${window.CCCommon.state.user?.email}</span>
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 2px dashed rgba(255,255,255,0.2); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; font-size: 1.1rem;">Montant payé :</span>
                        <span style="font-weight: 800; font-size: 1.4rem; color: var(--emerald-bright);">200 XOF</span>
                    </div>
                </div>
                <p style="font-size: 0.8rem; color: #777; margin-top: 20px;">Ceci est un document de confirmation automatique généré par ColisConnect.</p>
                <button onclick="document.getElementById('payment-hub-modal').classList.add('hidden')" style="margin-top: 25px; background: white; color: black; border: none; padding: 12px 30px; border-radius: 10px; font-weight: 700; cursor: pointer;">Fermer</button>
            </div>
        `;

        const modal = document.getElementById("payment-hub-modal");
        const container = document.getElementById("payment-modal-container");
        if (modal && container) {
            container.innerHTML = receiptHtml;
            modal.classList.remove("hidden");
        }
    }

    async function fetchTravelerContact(userId) {
        if (!userId) return null;
        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('full_name, phone_number')
                .eq('id', userId)
                .maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error fetching traveler contact:", e);
            return null;
        }
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

    async function openSplitPaymentModal(type = "commission", totalAmount = null) {
        if (totalAmount) PAYMENT_STATE.totalAmount = totalAmount;
        PAYMENT_STATE.step = type;

        const thread = state.activeThreadData;
        if (!thread) return alert("Données de réservation introuvables.");

        const modal = document.getElementById("split-payment-modal");
        const hubContainer = document.getElementById("payment-modal-container");
        const manualPanel = document.getElementById("manual-payment-panel");

        if (!modal || !hubContainer) return console.error("Modal elements missing");

        // --- RESET UI FOR COMMISSION (HUB OR CARD) ---
        if (manualPanel) manualPanel.style.display = "none";
        if (hubContainer) hubContainer.style.display = "block";

        // ÉTAPE 2/2 : Si la plateforme est déjà payée (Commission ColisConnect validée)
        if (thread.status === "commission_payee") {
            const qr = thread.travelerAlipayQr || thread.travelerWechatQr;
            if (!qr) return alert("Le voyageur n'a pas encore configuré ses moyens de paiement. Veuillez lui demander dans le chat.");

            PAYMENT_STATE.step = "traveler";
            PAYMENT_STATE.amount = 200; // FORCE 200 XOF POUR TEST

            document.getElementById("split-payment-title").textContent = "Payer le Voyageur (Mode Test)";
            document.getElementById("split-payment-step-desc").textContent = "Scannez le QR Code du voyageur ci-dessous.";
            document.getElementById("split-payment-qr-img").src = qr;
            document.getElementById("split-payment-amount").textContent = "À payer (Test)";

            // Switch to manual mode for the traveler step
            if (manualPanel) manualPanel.style.display = "block";
            if (hubContainer) hubContainer.style.display = "none";

            modal.classList.remove("hidden");
            return;
        }

        // ÉTAPE 1/2 : Paiement de la commission (HUB)
        PAYMENT_STATE.amount = 200; // FORCE 200 XOF POUR TEST
        modal.classList.remove("hidden");

        hubContainer.innerHTML = `
            <div class="payment-selection">
                <h3 style="margin-bottom: 20px; font-weight: 600;">Comment souhaitez-vous payer ?</h3>
                <div class="payment-methods-grid">
                    <button class="method-btn-premium" id="pay-card">
                        <span class="icon">💳</span>
                        <div class="text-wrap">
                            <span class="title">Carte Bancaire</span>
                            <span class="subtitle">Visa / Mastercard / Stripe</span>
                        </div>
                    </button>
                    <button class="method-btn-premium" id="pay-momo">
                        <span class="icon">📱</span>
                        <div class="text-wrap">
                            <span class="title">Mobile Money</span>
                            <span class="subtitle">Orange, MTN, Wave, Moov...</span>
                        </div>
                    </button>
                </div>
                <button id="btn-close-pay" style="margin-top: 20px; opacity: 0.6; font-size: 0.9rem;">Annuler</button>
            </div>
        `;

        document.getElementById("btn-close-pay").onclick = () => modal.classList.add("hidden");

        // --- ACTION CARTE ---
        document.getElementById("pay-card").onclick = () => handleHubPayment("card");

        // --- ACTION MOMO (Smart Routing Léger) ---
        document.getElementById("pay-momo").onclick = () => {
            hubContainer.innerHTML = `
                <div class="payment-momo-flow" style="animation: fadeIn 0.3s ease;">
                    <button id="btn-back-choice" style="background: transparent; border: none; color: #aaa; margin-bottom: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <span>←</span> Retour aux choix
                    </button>
                    
                    <h3 style="margin-bottom: 10px; font-size: 1.2rem;">Indicatif pays</h3>
                    <p style="font-size: 0.9rem; color: #ccc; margin-bottom: 20px;">Utilisé pour afficher les moyens de paiement de votre région.</p>
                    
                    <div class="phone-input-group" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <input type="text" id="momo-prefix" placeholder="Ex: +225" style="width: 100%; font-size: 1.1rem; background: transparent; border: none; color: white; outline: none;">
                    </div>
                    
                    <div id="momo-routing-zone"></div>
                </div>
            `;

            const prefixInput = document.getElementById("momo-prefix");
            const routingZone = document.getElementById("momo-routing-zone");

            const countryCodes = {
                "+225": { name: "Côte d'Ivoire 🇨🇮", iso: "CI" },
                "+221": { name: "Sénégal 🇸🇳", iso: "SN" },
                "+229": { name: "Bénin 🇧🇯", iso: "BJ" },
                "+237": { name: "Cameroun 🇨🇲", iso: "CM" },
                "+243": { name: "RD Congo 🇨🇩", iso: "CD" },
                "+242": { name: "Congo 🇨🇬", iso: "CG" },
                "+241": { name: "Gabon 🇬🇦", iso: "GA" },
                "+254": { name: "Kenya 🇰🇪", iso: "KE" },
                "+256": { name: "Ouganda 🇺🇬", iso: "UG" },
                "+250": { name: "Rwanda 🇷🇼", iso: "RW" },
                "+260": { name: "Zambie 🇿🇲", iso: "ZM" },
                "+232": { name: "Sierra Leone 🇸🇱", iso: "SL" }
            };

            document.getElementById("btn-back-choice").onclick = () => openSplitPaymentModal(type, totalAmount);

            prefixInput.oninput = () => {
                const val = prefixInput.value.trim();
                const matched = Object.keys(countryCodes).find(p => val === p || (val.length > 3 && val.startsWith(p)));

                if (matched) {
                    const c = countryCodes[matched];
                    routingZone.innerHTML = `
                        <button class="method-btn-premium" id="btn-momo-go" style="width: 100%; border-color: var(--emerald-bright); margin-top: 10px;">
                            <span class="icon">🚀</span>
                            <div class="info">
                                <span class="title">Continuer en ${c.name}</span>
                                <span class="desc">Accéder aux passerelles de paiement locales</span>
                            </div>
                        </button>
                    `;
                    document.getElementById("btn-momo-go").onclick = () => handleHubPayment("momo", null, null, c.iso);
                } else if (val.length >= 4) {
                    routingZone.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.4;">
                            Le Mobile Money n'est pas encore disponible pour ce pays.
                        </div>
                        <button class="method-btn-premium" id="btn-fallback-card" style="width: 100%; border-color: var(--emerald-bright);">
                            <span class="icon">💳</span>
                            <div class="info">
                                <span class="title">Payer par Carte Visa / Mastercard</span>
                                <span class="desc">Sécurisé par Stripe via GeniusPay</span>
                            </div>
                        </button>
                    `;
                    document.getElementById("btn-fallback-card").onclick = () => handleHubPayment("card");
                } else {
                    routingZone.innerHTML = "";
                }
            };
        };
    }

    async function submitSplitPayment() {
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

            if (!reservationId) throw new Error("Erreur système : ID de réservation introuvable.");

            const endpoint = isCommission
                ? `/api/reservations/${reservationId}/pay-commission`
                : `/api/reservations/${reservationId}/pay-traveler`;

            await window.CCCommon.api(endpoint, {
                method: "POST",
                body: { receiptData: base64, amount: PAYMENT_STATE.amount }
            });

            document.getElementById("split-payment-modal").classList.add("hidden");

            if (isCommission) {
                alert("Paiement plateforme reçu ! Vous pouvez maintenant payer le voyageur directement.");
                await loadConversations();
                if (PAYMENT_STATE.totalAmount > 0) {
                    await openSplitPaymentModal("traveler", PAYMENT_STATE.totalAmount);
                }
            } else {
                alert("Preuve de paiement envoyée au voyageur avec succès !");
                await openThread(state.activeThreadId);
            }
        } catch (err) {
            alert(err.message || "Erreur lors de l'envoi.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Confirmer le paiement";
        }
    }

    async function handleHubPayment(type, provider = null, phoneNum = null, country = null) {
        const resId = state.activeThreadData?.reservation?.id ||
            state.activeThreadData?.reservation_id ||
            state.activeThreadData?.reservationId;

        if (!resId) return alert("Identifiant réservation manquant.");

        const btn = document.getElementById(type === "card" ? "pay-card" : "btn-momo-validate");
        const originalContent = btn ? btn.innerHTML : "";
        if (btn) {
            btn.innerHTML = `<span class="spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></span> Connexion...`;
            btn.style.pointerEvents = "none";
        }

        try {
            const result = await window.CCCommon.api(`/api/payments/initiate${country ? '?country=' + country : ''}`, {
                method: "POST",
                body: {
                    reservationId: resId,
                    type: type,
                    phoneNumber: phoneNum,
                    amountEUR: PAYMENT_STATE.amount,
                    country: country
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
        els.refreshBtn?.addEventListener("click", () => {
            loadConversations().catch((error) => alert(error.message || "Rafraîchissement impossible."));
        });

        els.conversationsList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-thread-id]");
            if (!button) return;
            const threadId = button.getAttribute("data-thread-id");
            if (threadId) openThread(threadId).catch((error) => alert(error.message || "Ouverture impossible."));
        });

        els.chatBackBtn?.addEventListener("click", () => showListView());

        els.convSearchInput?.addEventListener("input", () => {
            renderConversations(els.convSearchInput.value);
        });

        els.messageForm?.addEventListener("submit", (event) => {
            submitMessage(event).catch((error) => alert(error.message || "Envoi impossible."));
        });

        els.messageInput?.addEventListener("input", () => {
            const text = els.messageInput.value;
            showLeakWarning(detectLeakClient(text));
        });

        // Split Payment Setup
        els.chatPayBtn?.addEventListener("click", () => {
            const thread = state.activeThreadData;
            const price = thread?.offerPrice || thread?.offer?.price || 0;
            openSplitPaymentModal("commission", price);
        });

        document.getElementById("split-payment-close")?.addEventListener("click", () => {
            document.getElementById("split-payment-modal").classList.add("hidden");
        });
        document.getElementById("payment-hub-close")?.addEventListener("click", () => {
            document.getElementById("payment-hub-modal").classList.add("hidden");
        });
        document.getElementById("split-payment-submit")?.addEventListener("click", () => submitSplitPayment());

        els.comprisBtn?.addEventListener("click", () => {
            state.isTutorialAccepted = true;
            if (state.activeThreadId) markThreadTutorialAccepted(state.activeThreadId);
            els.tutorialOverlay?.classList.add("hidden");
            els.chatInfoBanner?.classList.remove("tutorial-focus");
            els.comprisBtn?.classList.remove("highlight-mode");
            els.comprisBtn?.classList.add("hidden");
        });

        document.getElementById("chat-verify-payment-btn")?.addEventListener("click", async () => {
            const ref = prompt("Entrez votre référence de paiement (ex: GeniusPay ID) :");
            if (!ref) return;

            showNotification("🔍 Vérification en cours...", "info");
            try {
                // On appelle le webhook manuellement avec la référence
                await window.CCCommon.api("/api/payment-webhook", {
                    method: "POST",
                    body: {
                        status: "success",
                        transaction_id: ref,
                        metadata: { reservationId: state.activeThreadData?.reservation?.id || state.activeThreadData?.id }
                    }
                });
                showNotification("✅ Paiement confirmé ! Rafraîchissement...", "success");
                setTimeout(() => openThread(state.activeThreadId), 1500);
            } catch (err) {
                alert("Erreur de vérification : " + err.message);
            }
        });

        els.messageInput?.addEventListener("mousedown", (e) => {
            if (!state.isTutorialAccepted && !els.chatInfoBanner.classList.contains("hidden")) {
                e.preventDefault();
                triggerTutorialFocus();
            }
        });
    }

    // ---- Bootstrap ----
    async function bootstrap() {
        try {
            await window.CCCommon.init("chat");
            console.log("Chat initialized");
        } catch (e) { console.error("CCCommon init error:", e); }

        bindEvents();

        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('status') === 'success') {
                const ref = urlParams.get('reference');
                showNotification(`✅ Paiement validé (${ref}) ! Vos informations de contact sont en cours de déblocage.`, "success");

                if (window.CCCommon.state.user) {
                    setTimeout(() => loadConversations(), 1000);
                }
            }
        } catch (e) { console.error("Payment return handling error:", e); }

        if (!window.CCCommon.requireAuth("chat.html")) return;
        state.userId = window.CCCommon.state.user?.id;

        const params = new URLSearchParams(window.location.search || "");
        const offerId = params.get("offerId");

        if (offerId) {
            await ensureConversationForOffer(offerId);
        } else {
            await loadConversations();
        }

        setTimeout(() => {
            window.CCCommon?.syncNotificationBadges?.();
        }, 1500);
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
