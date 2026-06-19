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

    function normalizeId(value) {
        return value === undefined || value === null ? "" : String(value);
    }

    function getMessageSenderSide(msg) {
        const senderType = String(msg.senderType || msg.sender_type || msg.sender || "").toLowerCase();
        if (senderType === "system") return "system";

        const currentUserId = normalizeId(state.userId || window.CCCommon.state?.user?.id);
        const senderUserId = normalizeId(msg.senderUserId || msg.sender_user_id || msg.userId || msg.user_id || msg.senderId || msg.sender_id);

        if (currentUserId && senderUserId) {
            return senderUserId === currentUserId ? "user" : "traveler";
        }

        if (senderType === "user" || senderType === "me") return "user";
        return "traveler";
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
        const sender = getMessageSenderSide(msg);
        const msgType = String(msg.messageType || msg.message_type || "text");
        const timeStr = formatMsgTime(msg.createdAt || msg.created_at);

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
            const isValidation = (msg.text || "").includes("PAIEMENT VALIDÉ");
            let html = `<div class="chat-msg-row chat-msg-system">
                <span class="chat-bubble-system">
                    ${window.CCCommon.escapeHtml(msg.text || "")}`;

            if (isValidation) {
                const txId = (msg.text.match(/TX_[\w\d]+/) || [])[0] || "N/A";
                html += `<br><button class="btn primary sm" style="margin-top: 10px; background: #059669; border: none; cursor: pointer; border-radius: 8px; padding: 10px 15px; font-weight: bold; color: white;" onclick="window.generateReceiptPDF('${txId}')">🧾 Télécharger mon reçu (PDF)</button>`;
            }

            html += `</span></div>`;
            return html;
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

    // --- LOGIQUE PDF ---
    window.generateReceiptPDF = async function (txId) {
        const thread = state.activeThreadData;
        if (!thread) return alert("Données de la conversation introuvables.");

        const user = window.CCCommon.state.user;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const hourStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const tpl = document.getElementById("receipt-pdf-template");
        if (!tpl) return console.error("Template PDF introuvable");

        tpl.style.display = "block";

        document.getElementById("pdf-receipt-id").textContent = "REF: " + (txId || "TX-CC-" + Date.now());
        document.getElementById("pdf-date").textContent = dateStr;
        document.getElementById("pdf-hour").textContent = hourStr;

        document.getElementById("pdf-sender-name").textContent = user?.user_metadata?.full_name || user?.email || "Expéditeur";
        document.getElementById("pdf-sender-id").textContent = "ID: " + (user?.id?.substring(0, 8) || "N/A");

        document.getElementById("pdf-traveler-name").textContent = thread.travelerName || "Voyageur";
        const travelerId = thread.offerOwnerId || thread.offer_owner_id || "N/A";
        document.getElementById("pdf-traveler-id").textContent = "ID: " + (travelerId.toString().substring(0, 8));

        const tripFrom = thread.offerTitle?.split("→")[0] || "Paris";
        const tripTo = thread.offerTitle?.split("→")[1] || "Abidjan";
        document.getElementById("pdf-trip-from").textContent = tripFrom.trim();
        document.getElementById("pdf-trip-to").textContent = tripTo.trim();

        const opt = {
            margin: 10,
            filename: `Recu_ColisConnect_${txId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(tpl).save();
        } catch (err) {
            console.error("Erreur PDF:", err);
            alert("Erreur lors de la génération du PDF.");
        } finally {
            tpl.style.display = "none";
        }
    };

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

        const payableStatuses = ["pending", "commission_payee", "agreed"];
        const isClientSide = !thread.isOfferOwner && payableStatuses.includes(String(thread.status || ""));

        if (els.chatPayBtn) {
            els.chatPayBtn.classList.toggle("hidden", !isClientSide);
            if (isClientSide) {
                els.chatPayBtn.innerHTML = "✅ Valider ma réservation";
            }
        }

        if (els.chatInfoBanner) {
            const shouldShowBanner = isClientSide && (thread.status === "pending" || thread.status === "agreed");
            els.chatInfoBanner.classList.toggle("hidden", !shouldShowBanner);
            if (!shouldShowBanner) {
                state.isTutorialAccepted = true;
            }
            if (els.comprisBtn) {
                els.comprisBtn.classList.toggle("hidden", state.isTutorialAccepted);
            }
        }
    }

    function triggerTutorialFocus() {
        if (state.isTutorialAccepted) return;
        if (els.chatInfoBanner && els.chatInfoBanner.classList.contains("hidden")) {
            state.isTutorialAccepted = true;
            return;
        }
        if (els.tutorialOverlay) els.tutorialOverlay.classList.remove("hidden");
        if (els.chatInfoBanner) els.chatInfoBanner.classList.add("tutorial-focus");
        if (els.comprisBtn) els.comprisBtn.classList.add("highlight-mode");
        if (navigator.vibrate) navigator.vibrate(50);
    }

    function renderConversationMeta(thread) {
        if (!thread) return;
        els.chatPanelHeader?.classList.remove("hidden");
        els.chatEmptyState?.classList.add("hidden");
        if (els.chatAvatarInitials) els.chatAvatarInitials.textContent = getInitials(thread.travelerName || "Contact");
        if (els.chatMeta) els.chatMeta.textContent = thread.travelerName || "Contact";
        if (els.chatOfferInfo) els.chatOfferInfo.textContent = thread.offerTitle || "Détails de l'offre";

        const paidStatuses = ["paid", "voyageur_paye", "colisconnect_paye"];
        const isPaid = paidStatuses.includes(String(thread.status || ""));

        let contactBox = document.getElementById("chat-contact-revealed");
        if (!contactBox) {
            contactBox = document.createElement("div");
            contactBox.id = "chat-contact-revealed";
            els.chatPanelHeader?.after(contactBox);
        }

        if (isPaid && !thread.isOfferOwner) {
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
                                    style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                                    🧾 Reçu Original
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
                <button onclick="window.generateReceiptPDF('${txId}')" style="margin-top: 20px; width: 100%; background: var(--emerald-bright); color: black; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer;">📩 Télécharger le Bon (PDF)</button>
            </div>
        `;

        const modal = document.getElementById("payment-hub-modal");
        const container = document.getElementById("payment-modal-container-hub");
        if (modal && container) {
            container.innerHTML = receiptHtml;
            modal.classList.remove("hidden");
        }
    }

    async function fetchTravelerContact(userId) {
        if (!userId) return null;
        try {
            const { data, error } = await window.supabase.from('profiles').select('full_name, phone_number').eq('id', userId).maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) { return null; }
    }

    async function openThread(threadId) {
        if (!threadId) return;
        const selected = state.conversations.find((item) => item.id === threadId);
        state.activeThreadId = threadId;
        state.activeThreadData = selected || null;
        renderConversations();
        showChatView();
        const messages = await window.CCCommon.api(`/api/conversations/${encodeURIComponent(threadId)}/messages`);
        renderMessages(messages);
        renderConversationMeta(selected);
        state.isTutorialAccepted = isThreadTutorialAccepted(threadId);
        updatePaymentButtonVisibility();
    }

    function isThreadTutorialAccepted(threadId) {
        try {
            const accepted = JSON.parse(localStorage.getItem("cc_accepted_threads") || "[]");
            return Array.isArray(accepted) && accepted.includes(threadId);
        } catch (e) { return false; }
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
        if (!state.activeThreadId && state.conversations.length) state.activeThreadId = state.conversations[0].id;
        if (state.activeThreadId) await openThread(state.activeThreadId);
    }

    async function submitMessage(event) {
        event.preventDefault();
        const text = String(els.messageInput?.value || "").trim();
        if (!text || !state.activeThreadId) return;
        if (!state.isTutorialAccepted) { triggerTutorialFocus(); return; }
        try {
            await window.CCCommon.api(`/api/conversations/${encodeURIComponent(state.activeThreadId)}/messages`, { method: "POST", body: { text } });
            if (els.messageInput) els.messageInput.value = "";
            await openThread(state.activeThreadId);
        } catch (e) { alert(e.message || "Envoi impossible."); }
    }

    async function handleHubPayment(method, type = "commission", amount = 200, country = "CI") {
        try {
            const res = await window.CCCommon.api("/api/payments/initiate", {
                method: "POST",
                body: { method, type, amount, country, reservationId: state.activeThreadData?.id }
            });
            if (res.url) window.location.href = res.url;
        } catch (e) { alert(e.message); }
    }

    // Init
    window.CCCommon.onAuthStateChanged(async (user) => {
        state.userId = user?.id;
        if (user) await loadConversations();
    });

    els.messageForm?.addEventListener("submit", submitMessage);
    els.refreshBtn?.addEventListener("click", () => loadConversations());
    els.chatBackBtn?.addEventListener("click", showListView);
    els.comprisBtn?.addEventListener("click", () => {
        state.isTutorialAccepted = true;
        markThreadTutorialAccepted(state.activeThreadId);
        if (els.tutorialOverlay) els.tutorialOverlay.classList.add("hidden");
        if (els.chatInfoBanner) els.chatInfoBanner.classList.remove("tutorial-focus");
    });

    document.addEventListener("click", (e) => {
        const item = e.target.closest(".chat-conv-item");
        if (item) openThread(item.dataset.threadId);
    });

})();
