(() => {
    const state = {
        userId: null,
        conversations: [],
        activeThreadId: null,
        activeThreadData: null,
        messages: [],
        receiptBase64: null,
        paymentType: "regular",
        travelerPhone: "",
        userPhone: "",
        isTutorialAccepted: false,
        isSendingMessage: false,
        leakWarningVisible: false,
    };

    const hubStyle = document.createElement('style');
    hubStyle.textContent = `
        .phone-split-wrap {
            display: flex; align-items: center;
            border-bottom: 2px solid rgba(19, 236, 200, 0.4);
            margin-top: 10px; padding: 10px; border-radius: 8px;
            background: rgba(255, 255, 255, 0.02);
        }
        .phone-indicatif {
            width: 55px; background: transparent; border: none;
            color: var(--emerald-bright); font-family: monospace;
            font-size: 1.2rem; font-weight: 800; outline: none;
        }
        .phone-local-input {
            flex: 1; background: transparent; border: none;
            color: white; font-size: 1.1rem; outline: none; padding: 0 10px;
        }
        .payment-error-box {
            background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.2);
            color: #ff7675; padding: 12px; border-radius: 10px;
            font-size: 0.85rem; margin: 15px 0; line-height: 1.4;
        }
        .method-btn-premium {
            width: 100%; background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
            padding: 15px; display: flex; align-items: center; gap: 15px;
            cursor: pointer; transition: all 0.2s; text-align: left; margin-bottom: 10px;
        }
        .method-btn-premium:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--emerald-bright); transform: translateY(-2px);
        }
        .method-btn-premium .icon { font-size: 24px; color: var(--emerald-bright); }
        .method-btn-premium .text-wrap { display: flex; flex-direction: column; }
        .method-btn-premium .title { font-weight: 700; color: white; font-size: 1rem; }
        .method-btn-premium .subtitle { font-size: 0.75rem; opacity: 0.6; }
    `;
    document.head.appendChild(hubStyle);

    const els = {
        refreshBtn: document.getElementById("refresh-conversations-btn"),
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
        chatPaidBanner: document.getElementById("chat-paid-banner"),
        paidInfoText: document.getElementById("paid-line-info-text"),
        paidReceiptBtn: document.getElementById("paid-line-receipt"),
        paidContactsDetail: document.getElementById("paid-contacts-detail"),
        receiptDownloadBtn: document.getElementById("receipt-download-btn"),
        receiptCloseBtn: document.getElementById("receipt-close-btn"),
        tutorialOverlay: document.getElementById("chat-tutorial-overlay"),
        comprisBtn: document.getElementById("banner-compris-btn"),
    };

    // Statuts d'une reservation dont le paiement est encaisse.
    const PAID_STATUSES = ["paid", "voyageur_paye", "colisconnect_paye"];

    function isPaidThread(thread) {
        const t = thread || state.activeThreadData;
        return PAID_STATUSES.includes(String(t?.status || ""));
    }

    function threadCurrency(thread) {
        const cur = thread?.offer?.base_currency;
        if (cur) return cur;
        return window.CCCommon?.getUserCurrency ? window.CCCommon.getUserCurrency() : "XOF";
    }


    // ---- Helpers ----
    function isMobileView() {
        return window.innerWidth <= 800 || document.documentElement.classList.contains('mobile-mode');
    }
    function showChatView() {
        if (!isMobileView()) return;
        els.chatSidebar?.classList.add('mobile-hidden');
        els.chatPanel?.classList.add('mobile-active');
        // Masque la barre de navigation + la bascule de thème sur mobile :
        // la zone de saisie du chat occupe tout le bas de l'écran.
        document.body.classList.add('chat-conv-open');
    }
    function showListView() {
        if (!isMobileView()) return;
        els.chatSidebar?.classList.remove('mobile-hidden');
        els.chatPanel?.classList.remove('mobile-active');
        document.body.classList.remove('chat-conv-open');
    }

    // ---- Clavier mobile : la coque du chat suit la zone VISIBLE -------------
    // Sur téléphone le clavier virtuel ne change PAS le viewport de mise en
    // page (iOS Safari, Chrome Android) : un panneau en `inset:0` gardait donc
    // la barre de saisie sous le clavier. On publie la zone réellement visible
    // dans 2 variables CSS lues par style.css (media query ≤ 800px) :
    //   --cc-vv-h   hauteur visible   → hauteur du panneau du chat
    //   --cc-vv-top décalage du haut  → décale le panneau (défilement iOS)
    // Résultat : le panneau, la zone des messages et la barre de saisie
    // remontent ensemble au-dessus du clavier.
    function initMobileKeyboardViewport() {
        const vv = window.visualViewport;
        const root = document.documentElement;
        let frame = 0;

        function appliquer() {
            frame = 0;
            if (!isMobileView()) {
                root.style.removeProperty('--cc-vv-h');
                root.style.removeProperty('--cc-vv-top');
                return;
            }
            const hauteur = vv ? vv.height : window.innerHeight;
            const haut = vv ? vv.offsetTop : 0;
            root.style.setProperty('--cc-vv-h', `${Math.round(hauteur)}px`);
            root.style.setProperty('--cc-vv-top', `${Math.round(haut)}px`);
        }
        function planifier() {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(appliquer);
        }

        appliquer();
        if (vv) {
            vv.addEventListener('resize', planifier);
            vv.addEventListener('scroll', planifier);
        }
        window.addEventListener('resize', planifier);
        window.addEventListener('orientationchange', planifier);

        // Le clavier qui monte redimensionne la zone visible : on garde le
        // dernier message en vue (sinon l'écran reste sur du vide).
        els.messageInput?.addEventListener('focus', () => {
            planifier();
            garderDernierMessageEnVue();
            setTimeout(garderDernierMessageEnVue, 260);
            setTimeout(garderDernierMessageEnVue, 620);
        });
        els.messageInput?.addEventListener('blur', planifier);
    }

    function garderDernierMessageEnVue() {
        if (!els.messagesList) return;
        if (!document.body.classList.contains('thread-open')) return;
        const liste = els.messagesList;
        // On recolle en bas seulement si l'utilisateur y etait deja (marge 120px) :
        // s'il lisait d'anciens messages, le clavier ne le fait pas sauter.
        const procheDuBas = liste.scrollHeight - liste.clientHeight - liste.scrollTop < 120;
        if (!procheDuBas) return;
        liste.scrollTop = liste.scrollHeight;
    }
    function showNotification(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `cc-toast ${type}`;
        // [FIX XSS] Le message peut contenir une reference venue de l'URL
        // (chat.html?payment=success&reference=...) : textContent, jamais innerHTML.
        toast.textContent = String(message == null ? "" : message);
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add("visible"), 100);
        setTimeout(() => { toast.classList.remove("visible"); setTimeout(() => toast.remove(), 500); }, 5000);
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
        els.conversationsList.innerHTML = visible.map((thread) => {
            const active = thread.id === state.activeThreadId ? "is-active" : "";
            const name = window.CCCommon.escapeHtml(thread.travelerName || "Contact");
            const initials = getInitials(thread.travelerName || "Contact");
            const preview = window.CCCommon.escapeHtml(thread.preview || "Aucun message");
            const time = formatConvTime(thread.lastMessageAt || thread.updatedAt);
            const statusClass = thread.status === "voyageur_paye" ? "status-voyageur-paye" :
                thread.status === "colisconnect_paye" ? "status-colisconnect-paye" : "";
            let statusLabel = "";
            if (thread.isOfferOwner && thread.status === "voyageur_paye") statusLabel = "payer colisconnect";

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
        }).join("\n");
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
        if (currentUserId && senderUserId) return senderUserId === currentUserId ? "user" : "traveler";
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
            const cur = parsed.currency || (window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : 'EUR');
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
            let html = `<div class="chat-msg-row chat-msg-system"><span class="chat-bubble-system">${window.CCCommon.escapeHtml(msg.text || "")}`;
            if (isValidation) {
                // Le webhook peut produire GENIUS_... et le texte porte deja
                // « Référence : X » : on lit d'abord cette valeur, sinon un
                // prefixe connu. Aucun identifiant fabrique.
                const refMatch = (msg.text || "").match(/Référence\s*:\s*([^\s\\]+)/i);
                const txIdMatch = (msg.text || "").match(/\b(?:TX|GENIUS)_[A-Za-z0-9]+\b/);
                const ref = refMatch ? refMatch[1] : (txIdMatch ? txIdMatch[0] : "");
                html += `<br><button data-receipt-ref="${window.CCCommon.escapeHtml(ref)}" style="margin-top:10px;background:#059669;border:none;cursor:pointer;border-radius:8px;padding:10px 15px;font-weight:bold;color:white;font-size:0.85rem;" onclick="window.viewReceipt(this.getAttribute('data-receipt-ref')||'')">🧾 Voir mon reçu</button>`;
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

    function setReceiptText(root, id, value) {
        const node = root.querySelector(`#${id}`);
        if (node) node.textContent = value;
    }

    function getReceiptTripParts(thread) {
        const rawTitle = String(thread?.offerTitle || thread?.title || "France -> Destination");
        const parts = rawTitle.split(/\s*(?:→|->| - | to )\s*/i);
        return {
            from: (parts[0] || "France").trim(),
            to: (parts[1] || "Destination").trim()
        };
    }

    // Toutes les donnees du recu viennent de la reservation du fil ouvert :
    // reference reelle (payment_tx_id posee par le webhook), montant, kilos,
    // date du paiement, contacts des deux parties.
    function receiptContext(thread) {
        const t = thread || state.activeThreadData || {};
        const res = t.reservation || {};
        const user = window.CCCommon.state.user || {};
        const trip = getReceiptTripParts(t);
        return {
            ref: String(res.payment_tx_id || t.payment_tx_id || "").trim(),
            amount: Number(res.total_amount || 0),
            kg: Number(res.kg || 0),
            currency: threadCurrency(t),
            paidAt: res.updated_at || null,
            senderName: user.fullName || user.user_metadata?.full_name || user.email || "Expéditeur",
            senderId: user.id ? String(user.id).substring(0, 8) : "N/A",
            senderPhone: String(user.phoneNumber || user.phone_number || state.userPhone || "").trim(),
            travelerName: t.travelerName || "Voyageur",
            travelerId: String(t.offerOwnerId || t.offer_owner_id || "N/A").substring(0, 8),
            travelerPhone: String(state.travelerPhone || "").trim(),
            from: trip.from,
            to: trip.to
        };
    }

    function fillReceiptTemplate(root, txId) {
        const ctx = receiptContext();
        const paidAt = ctx.paidAt ? new Date(ctx.paidAt) : new Date();
        const dateStr = paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        const hourStr = paidAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const fmt = (value, cur) => (window.CCCommon?.formatAmount ? window.CCCommon.formatAmount(value, cur) : `${value} ${cur}`);

        setReceiptText(root, "pdf-receipt-id", "REF: " + (txId || ctx.ref || "N/A"));
        setReceiptText(root, "pdf-date", dateStr);
        setReceiptText(root, "pdf-hour", hourStr);
        setReceiptText(root, "pdf-amount", ctx.amount > 0 ? fmt(ctx.amount, ctx.currency) : "—");
        setReceiptText(root, "pdf-kg", ctx.kg > 0 ? `${ctx.kg} kg` : "—");
        setReceiptText(root, "pdf-payment-date", ctx.paidAt ? `Payé le ${dateStr} à ${hourStr}` : "Paiement confirmé");
        setReceiptText(root, "pdf-sender-name", ctx.senderName);
        setReceiptText(root, "pdf-sender-id", "ID: " + ctx.senderId);
        setReceiptText(root, "pdf-sender-phone", "Tél : " + (ctx.senderPhone || "—"));
        setReceiptText(root, "pdf-traveler-name", ctx.travelerName);
        setReceiptText(root, "pdf-traveler-id", "ID: " + ctx.travelerId);
        setReceiptText(root, "pdf-traveler-phone", "Tél : " + (ctx.travelerPhone || "—"));
        setReceiptText(root, "pdf-trip-from", ctx.from);
        setReceiptText(root, "pdf-trip-to", ctx.to);
    }


    function createReceiptCaptureNode(template, txId) {
        const host = document.createElement("div");
        host.id = "receipt-pdf-capture-root";
        host.style.cssText = [
            "position: fixed",
            "left: 0",
            "top: 0",
            "width: 794px",
            "min-height: 1123px",
            "background: #ffffff",
            "z-index: 2147483647",
            "pointer-events: none",
            "overflow: visible"
        ].join(";");

        const clone = template.cloneNode(true);
        clone.removeAttribute("id");
        clone.style.cssText = [
            "display: block",
            "position: static",
            "width: 794px",
            "min-height: 1123px",
            "box-sizing: border-box",
            "padding: 40px",
            "background: #ffffff",
            "color: #1a1a1a",
            "font-family: 'Inter', Arial, sans-serif",
            "opacity: 1",
            "visibility: visible",
            "transform: none"
        ].join(";");

        fillReceiptTemplate(clone, txId);
        host.appendChild(clone);
        document.body.appendChild(host);
        return { host, clone };
    }

    async function waitForReceiptPaint() {
        if (document.fonts?.ready) {
            try { await document.fonts.ready; } catch { }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    // ---- Receipt Viewer Logic ----
    window.viewReceipt = async function (txId) {
        const modal = document.getElementById("receipt-view-modal");
        if (!modal) {
            console.error("Modale de reçu introuvable");
            return;
        }

        // Un identifiant fabrique (« TX_ » + horodatage) n'est jamais une vraie
        // reference : on prefere celle de la reservation.
        const ref = /^TX_\d{10,}$/.test(String(txId || "")) ? "" : String(txId || "");

        // Remplissage des données
        fillReceiptTemplate(modal, ref);

        // Affichage
        modal.classList.remove("hidden");
    };

    // Ouvre le recu du fil ouvert, en recuperant d'abord le telephone du
    // voyageur pour que le document soit complet des deux cotes.
    async function openReceipt() {
        const thread = state.activeThreadData;
        const travelerId = thread?.offerOwnerId || thread?.offer_owner_id;
        if (!state.travelerPhone && travelerId) {
            const profile = await fetchTravelerContact(travelerId).catch(() => null);
            if (profile) state.travelerPhone = profile.phone_number || "";
        }
        await window.viewReceipt("");
    }


    // ---- Téléchargement réel du Bon (PDF) ----
    // Avant, ce bouton se contentait de rouvrir la modale : aucun fichier n'était
    // produit alors que html2pdf est chargé sur la page.
    window.generateReceiptPDF = async function (txId) {
        const template = document.getElementById("receipt-pdf-template");
        if (!template || typeof window.html2pdf === "undefined") {
            window.viewReceipt(txId);
            return;
        }
        let host = null;
        try {
            const capture = createReceiptCaptureNode(template, txId);
            host = capture.host;
            await waitForReceiptPaint();
            await window.html2pdf().set({
                margin: 0,
                filename: `bon-colisconnect-${String(txId || "recu").replace(/[^\w-]+/g, "_")}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
            }).from(capture.clone).save();
        } catch (error) {
            console.warn("Generation PDF impossible:", error);
            window.viewReceipt(txId);
        } finally {
            host?.remove();
        }
    };

    // ---- Payment UI ----
    function currentThread() {
        return state.conversations.find((item) => item.id === state.activeThreadId);
    }

    function updatePaymentButtonVisibility() {
        const thread = currentThread();
        if (!thread || !window.CCCommon.state?.user) {
            els.chatPayBtn?.classList.add("hidden");
            els.chatInfoBanner?.classList.add("hidden");
            els.chatPaidBanner?.classList.add("hidden");
            return;
        }
        const payableStatuses = ["pending", "commission_payee", "agreed"];
        // Un fil ne issu d'aucune reservation (discussion ouverte depuis une demande)
        // n'a rien a payer : sans cette garde, le bouton « Valider ma reservation »
        // s'affichait puis echouait avec « Identifiant reservation manquant ».
        const hasReservation = Boolean(thread.reservation?.id || thread.reservation_id);
        const isClientSide = !thread.isOfferOwner && hasReservation
            && payableStatuses.includes(String(thread.status || ""));
        if (els.chatPayBtn) {
            els.chatPayBtn.classList.toggle("hidden", !isClientSide);
            if (isClientSide) els.chatPayBtn.innerHTML = "✅ Valider ma réservation";
        }
        if (els.chatInfoBanner) {
            const shouldShowBanner = isClientSide && (thread.status === "pending" || thread.status === "agreed");
            els.chatInfoBanner.classList.toggle("hidden", !shouldShowBanner);
            if (!shouldShowBanner) state.isTutorialAccepted = true;
            if (els.comprisBtn) els.comprisBtn.classList.toggle("hidden", state.isTutorialAccepted);
        }
        updatePaidPanel(thread);
    }

    // Trois lignes en haut du fil, une fois le paiement encaisse :
    //   1. resume (montant, kilos)   2. « Voir mon recu »   3. contacts debloques.
    function updatePaidPanel(thread) {
        const paid = isPaidThread(thread) && !thread?.isOfferOwner;
        els.chatPaidBanner?.classList.toggle("hidden", !paid);
        if (!paid) {
            if (els.paidContactsDetail) {
                els.paidContactsDetail.classList.add("hidden");
                els.paidContactsDetail.innerHTML = "";
            }
            return;
        }
        const res = thread?.reservation || {};
        const amount = Number(res.total_amount || 0);
        const kg = Number(res.kg || 0);
        const cur = threadCurrency(thread);
        const bits = ["🎉 Félicitations pour votre paiement !"];
        const details = [];
        if (amount > 0) {
            details.push(window.CCCommon?.formatAmount ? window.CCCommon.formatAmount(amount, cur) : `${amount} ${cur}`);
        }
        if (kg > 0) details.push(`${kg} kg réservés`);
        if (details.length) bits.push(details.join(" · "));
        bits.push("Vous pouvez maintenant vous partager vos contacts et vos numéros.");
        if (els.paidInfoText) els.paidInfoText.textContent = bits.join(" — ");
    }

    function triggerTutorialFocus() {
        if (state.isTutorialAccepted) return;
        if (els.chatInfoBanner && els.chatInfoBanner.classList.contains("hidden")) {
            state.isTutorialAccepted = true; return;
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

        // Photo / nom de l'interlocuteur : ouvrir sa page profil (demande Yoyo).
        // Le bouton « Retour » de cette page ramene ensuite a la conversation.
        try {
            const pairId = thread.isOfferOwner
                ? (thread.user_id || thread.userId || (thread.user && thread.user.id))
                : (thread.offerOwnerId || thread.offer_owner_id || (thread.offer_owner && thread.offer_owner.id));
            const avatarCercle = document.getElementById("chat-avatar-circle");
            const ouvrirProfilPair = () => {
                if (!pairId) return;
                window.location.href = "profil.html?id=" + encodeURIComponent(String(pairId));
            };
            [avatarCercle, els.chatMeta, document.querySelector(".chat-panel-contact-info")].forEach((el) => {
                if (!el) return;
                el.classList.add("cc-profil-cliquable");
                el.setAttribute("title", "Voir le profil");
                el.onclick = ouvrirProfilPair;
            });
        } catch (err) {
            console.warn("profil de l'interlocuteur indisponible:", err);
        }

        // ---- Apres paiement : bandeau a trois lignes, contacts debloques ----
        updatePaidPanel(thread);

        if (isPaidThread(thread) && !thread.isOfferOwner) {
            const travelerId = thread.offerOwnerId || thread.offer_owner_id;
            const threadIdAtRender = thread.id;
            fetchTravelerContact(travelerId).then(profile => {
                if (!profile) return;
                // [FIX] La reponse asynchrone pouvait arriver apres un changement de
                // fil et injecter le contact precedent dans le nouveau contexte.
                if (String(state.activeThreadId) !== String(threadIdAtRender)) return;
                if (!els.paidContactsDetail) return;
                const phone = String(profile.phone_number || "").trim();
                const digits = phone.replace(/[^\d]/g, "");
                state.travelerPhone = phone;
                els.paidContactsDetail.innerHTML =
                    `<span class="paid-contact-name">${window.CCCommon.escapeHtml(profile.full_name || thread.travelerName || "")}</span>` +
                    (phone ? `<span class="paid-contact-phone">📞 ${window.CCCommon.escapeHtml(phone)}</span>` : "") +
                    (digits ? `<a class="paid-contact-wa" href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a>` : "");
                els.paidContactsDetail.classList.remove("hidden");
            }).catch(() => { });
        } else if (els.paidContactsDetail) {
            els.paidContactsDetail.classList.add("hidden");
            els.paidContactsDetail.innerHTML = "";
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

    // Vue « liste des messages » (aucune conversation ouverte) : on n'affiche
    // que l'invite au centre du panneau. La zone de messages et la barre de
    // saisie n'apparaissent qu'une fois un fil choisi par l'utilisateur.
    function renderListViewState() {
        document.body.classList.remove("thread-open");
        els.chatPanelHeader?.classList.add("hidden");
        els.chatEmptyState?.classList.remove("hidden");
        if (els.chatMeta) els.chatMeta.textContent = "Sélectionner une conversation";
        if (els.chatOfferInfo) els.chatOfferInfo.textContent = "";
        document.getElementById("chat-contact-revealed")?.remove();
        if (els.messagesList) els.messagesList.innerHTML = "";
        state.messages = [];
        els.chatPayBtn?.classList.add("hidden");
        els.chatPaidBanner?.classList.add("hidden");
    }

    async function openThread(threadId) {
        if (!threadId) return;
        // Comparaison en chaine : l'identifiant peut venir de l'URL (?id=) : String() au lieu de ===
        const selected = state.conversations.find((item) => String(item.id) === String(threadId));
        state.activeThreadId = threadId;
        state.activeThreadData = selected || null;
        state.travelerPhone = ""; // contact de l'autre partie : propre a chaque fil
        renderConversations();
        showChatView();
        document.body.classList.add("thread-open");
        renderConversationMeta(selected);
        state.isTutorialAccepted = isThreadTutorialAccepted(threadId);
        updatePaymentButtonVisibility();

        // Etat de chargement explicite : avant, les messages de l'ancien fil
        // restaient affiches sous le nouvel en-tete pendant la requete.
        if (els.messagesList) {
            els.messagesList.innerHTML = '<div class="chat-no-messages"><span>⏳</span>Chargement des messages...</div>';
        }
        try {
            const messages = await window.CCCommon.api(`/api/conversations/${encodeURIComponent(threadId)}/messages`);
            if (String(state.activeThreadId) !== String(threadId)) return; // le fil a change entre-temps
            renderMessages(messages);
        } catch (error) {
            if (String(state.activeThreadId) !== String(threadId)) return;
            if (els.messagesList) {
                els.messagesList.innerHTML = `<div class="chat-no-messages"><span>⚠️</span>Impossible de charger cette conversation.<br><small>${window.CCCommon.escapeHtml(error.message || "Erreur reseau")}</small><br><button type="button" id="chat-retry-thread" class="btn ghost sm" style="margin-top:10px;">Reessayer</button></div>`;
                document.getElementById("chat-retry-thread")?.addEventListener("click", () => openThread(threadId));
            }
        }
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
            if (!accepted.includes(threadId)) { accepted.push(threadId); localStorage.setItem("cc_accepted_threads", JSON.stringify(accepted)); }
        } catch (e) { }
    }

    async function loadConversations() {
        const rows = await window.CCCommon.api("/api/conversations");
        state.conversations = Array.isArray(rows) ? rows : [];
        renderConversations();
        // Pas d'ouverture automatique : on reste sur la liste des messages et
        // c'est l'utilisateur qui choisit le fil a ouvrir. Le fil deja ouvert
        // (rafraichissement manuel, envoi d'un message) reste ouvert.
        const stillOpen = state.activeThreadId && state.conversations.some(
            (thread) => String(thread.id) === String(state.activeThreadId)
        );
        if (stillOpen) {
            await openThread(state.activeThreadId);
        } else {
            state.activeThreadId = null;
            state.activeThreadData = null;
            renderListViewState();
        }
    }

    async function ensureConversationForOffer(offerId) {
        if (!offerId) return;
        const numericId = Number(offerId);
        if (!Number.isFinite(numericId) || numericId <= 0) return;
        const thread = await window.CCCommon.api("/api/conversations/by-offer", { method: "POST", body: { offerId: numericId } });
        await loadConversations();
        if (thread?.id) { state.activeThreadId = thread.id; await openThread(thread.id); }
    }

    // Meme chose depuis une carte DEMANDE (results.html) : le fil est cree/reutilise par le pont,
    // qui y ecrit le contexte de la demande en premier message systeme.
    async function ensureConversationForRequest(requestId) {
        if (!requestId) return;
        const numericId = Number(requestId);
        if (!Number.isFinite(numericId) || numericId <= 0) return;
        const thread = await window.CCCommon.api("/api/conversations/by-request", { method: "POST", body: { requestId: numericId } });
        await loadConversations();
        if (thread?.id) { state.activeThreadId = thread.id; await openThread(thread.id); }
    }

    // Lien profond du dashboard : chat.html?id=<fil>. C'est la cible des boutons
    // « Repondre » / « Voir » des sections Voyageur, Chercheur, Cargo et Messages.
    // On charge la liste PUIS on ouvre CE fil : sans ce traitement, ?id= etait
    // ignore par l'amorcage et on retombait sur la liste des messages (bug
    // signale par Yoyo le 2026-10-13).
    async function openThreadFromUrl(threadId) {
        if (!threadId) return;
        await loadConversations();
        const wanted = String(threadId);
        const found = state.conversations.find((item) => String(item.id) === wanted);
        if (!found) return; // fil inconnu (supprime, autre compte) : on reste sur la liste
        state.activeThreadId = found.id;
        await openThread(found.id);
    }

    // Retour de paiement : le parametre `id` est la RESERVATION, pas le fil.
    // On retrouve le fil correspondant (liste chargee, sinon requete directe)
    // et on l'ouvre pour ramener le client exactement la ou il a paye.
    async function openThreadForReservation(reservationId) {
        if (!reservationId) return false;
        const wanted = String(reservationId);
        await loadConversations();
        const findThread = () => state.conversations.find((item) =>
            String(item.reservation_id || item.reservation?.id || "") === wanted
        );
        let found = findThread();
        if (!found && window.ccSupabase) {
            try {
                const { data, error } = await window.ccSupabase
                    .from("chat_threads")
                    .select("id")
                    .eq("reservation_id", reservationId)
                    .maybeSingle();
                if (error) throw error;
                if (data?.id) {
                    await loadConversations();
                    found = state.conversations.find((item) => String(item.id) === String(data.id));
                }
            } catch (e) {
                console.warn("Fil de la reservation introuvable:", e);
            }
        }
        if (!found) return false;
        state.activeThreadId = found.id;
        await openThread(found.id);
        return true;
    }


    // ---- Anti-Leak ----
    function detectLeakClient(text) {
        if (!text) return false;
        if (window.CCAntiContact?.evaluate) {
            return !window.CCAntiContact.evaluate(text).allowed;
        }
        return /(?:\+|00)?\d[\d\s\-\.]{7,}|[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}|https?:\/\/|www\.|whatsapp|telegram|instagram|facebook|snapchat|tiktok/i.test(text);
    }

    function sendButtonEl() {
        return els.messageForm?.querySelector("[type='submit']") || null;
    }

    // Un seul envoi a la fois : le bouton est desactive et affiche un rond qui
    // tourne tant que la requete est en cours, ce qui evite les envois repetes
    // quand on clique plusieurs fois en croyant que rien ne se passe.
    function refreshSendButton() {
        const btn = sendButtonEl();
        if (!btn) return;
        const busy = state.isSendingMessage === true;
        btn.classList.toggle("is-sending", busy);
        btn.setAttribute("aria-busy", busy ? "true" : "false");
        // Le bouton reste actif meme apres un avertissement : c'est l'envoi qui repasse par
        // la verification (le moderateur tranche sur le message reel, pas sur le passe du fil).
        btn.disabled = busy || state.leakWarningVisible === true;
    }

    function setSendingMessage(busy) {
        state.isSendingMessage = busy === true;
        refreshSendButton();
    }

    function showLeakWarning(show) {
        state.leakWarningVisible = show === true;
        let banner = document.getElementById("chat-leak-warning");
        if (show) {
            if (!banner) {
                banner = document.createElement("div");
                banner.id = "chat-leak-warning";
                banner.className = "chat-leak-banner";
                banner.innerHTML = `⚠️ <strong>Contenu interdit détecté.</strong> Partager des coordonnées personnelles est interdit et enregistré.`;
                els.messageForm?.parentNode?.insertBefore(banner, els.messageForm);
            }
            banner.classList.add("visible");
        } else if (banner) {
            banner.classList.remove("visible");
        }
        refreshSendButton();
    }

    async function submitMessage(event) {
        event.preventDefault();
        if (state.isSendingMessage) return; // verrou : un clic/Entree repete ne renvoie rien
        if (!window.CCCommon.requireCompletedProfile()) return;
        const text = String(els.messageInput?.value || "").trim();
        if (!text) return;
        if (!state.activeThreadId) { alert("Sélectionnez une conversation."); return; }
        if (!state.isTutorialAccepted) { triggerTutorialFocus(); return; }
        // Une fois le paiement encaisse, partager ses coordonnees EST le service
        // paye : plus de filtre anti-contact ni de verdict IA sur les numeros.
        const contactAllowed = isPaidThread(state.activeThreadData);
        if (!contactAllowed && detectLeakClient(text)) { showLeakWarning(true); return; }
        const threadId = state.activeThreadId;
        // Couche 2 : verificateur IA. Le moderateur classique ne declenche que sur les
        // schemas a chiffres successifs : le reste du chat ne provoque aucun appel.
        const ia = window.CCFraudeIA;
        if (ia && !contactAllowed) {
            // Un avertissement deja affiche ne bloque plus l'envoi a lui seul : on demande
            // le verdict sur CE message. Le blocage ne revient que si le moderateur confirme
            // la fraude pour ce message precis (sinon un message corrige restait bloque).
            try {
                const verdict = await ia.verifierEnvoi(threadId, text);
                if (verdict && verdict.fraude) {
                    if (ia.etat.fraude) ia.fenetreFraude(true, ia.etat.raison);
                    else ia.fenetreAttente(true);
                    if (els.messageInput && !els.messageInput.value) els.messageInput.value = text;
                    return;
                }
            } catch (e) { /* panne ou quota : on n'empeche jamais un message normal */ }
        }
        setSendingMessage(true);
        if (els.messageInput) els.messageInput.value = "";
        try {
            const created = await window.CCCommon.api(`/api/conversations/${encodeURIComponent(threadId)}/messages`, { method: "POST", body: { text } });
            showLeakWarning(false);
            // Affichage immediat du message renvoye par le serveur, puis
            // rafraichissement du fil en tache de fond (sans bloquer le bouton).
            if (created?.id && !state.messages.some((msg) => String(msg.id) === String(created.id))) {
                renderMessages(state.messages.concat([created]));
            }
            openThread(threadId).catch(() => { });
        } catch (error) {
            if (els.messageInput && !els.messageInput.value) els.messageInput.value = text;
            if (error?.payload?.code === "CONTACT_INFO_BLOCKED") {
                // Le code IA vit dans payload.code_ia (le message est generique) :
                // tester le texte ne declenchait jamais la fenetre de fraude.
                const iaBlocked = String(error?.payload?.code_ia || "").includes("fraude")
                    || (Array.isArray(error?.payload?.raisons) && error.payload.raisons.some(r => String(r).includes("fraude")))
                    || /ia_fraude/i.test(String(error.message || ""));
                if (iaBlocked) {
                    if (window.CCFraudeIA) {
                        window.CCFraudeIA.etat.fraude = true;
                        window.CCFraudeIA.etat.raison = "filtre serveur";
                        window.CCFraudeIA.etat.filVerdict = threadId;
                        window.CCFraudeIA.fenetreFraude(true, "filtre serveur");
                    }
                } else showLeakWarning(true);
            }
            else alert(error.message || "Envoi impossible.");
        } finally {
            setSendingMessage(false);
        }
    }

    // ---- Payment ----
    const PAYMENT_STATE = { step: null, amount: 0, totalAmount: 0 };
    // Commission plateforme : montant FIXE de 2 000 FCFA, converti dans la devise du
    // client avec le taux du jour (meme table exchange_rates que la page des offres).
    const COMMISSION_XOF = 200; // PHASE DE TEST : 200 F. Valeur reelle : 2000.

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ""));
            r.onerror = () => reject(new Error("Lecture fichier impossible."));
            r.readAsDataURL(file);
        });
    }

    async function openSplitPaymentModal(type = "commission", totalAmount = null) {
        const thread = state.activeThreadData;
        if (!thread) return alert("Données de réservation introuvables.");

        // Montant total = prix/kg x kilos choisis, ou total_amount enregistre.
        const resTotal = Number(thread.reservation?.total_amount || 0);
        if (totalAmount != null) PAYMENT_STATE.totalAmount = Number(totalAmount) || 0;
        if (!PAYMENT_STATE.totalAmount && resTotal) PAYMENT_STATE.totalAmount = resTotal;
        const total = Number(PAYMENT_STATE.totalAmount) || 0;

        PAYMENT_STATE.step = type;
        const modal = document.getElementById("split-payment-modal");
        const hubContainer = document.getElementById("payment-modal-container");
        const manualPanel = document.getElementById("manual-payment-panel");
        if (!modal || !hubContainer) return console.error("Modal elements missing");
        if (manualPanel) manualPanel.style.display = "none";
        if (hubContainer) hubContainer.style.display = "block";

        const manualTitle = document.getElementById("manual-payment-title");
        const manualHint = document.getElementById("manual-payment-hint");
        const manualError = document.getElementById("manual-payment-error");
        if (manualError) manualError.style.display = "none";

        if (thread.status === "commission_payee") {
            // Le client a deja paye : le voyageur doit reverser la commission puis
            // le client regle le voyageur. On laisse la preuve manuelle disponible
            // meme sans QR configure (les coordonnees peuvent etre donnees au chat).
            const qr = thread.travelerAlipayQr || thread.travelerWechatQr;
            PAYMENT_STATE.step = "traveler";
            PAYMENT_STATE.amount = Math.round(total * 0.90 * 100) / 100;
            if (manualTitle) manualTitle.textContent = "Paiement au voyageur";
            if (manualHint) {
                manualHint.textContent = qr
                    ? `Montant a regler : ${window.CCCommon.formatAmount(PAYMENT_STATE.amount, window.CCCommon.getUserCurrency ? window.CCCommon.getUserCurrency() : "EUR")}. Televersez la capture du paiement effectue au voyageur.`
                    : "Le voyageur n'a pas configure de QR : demandez-lui ses coordonnees dans le chat, puis televersez la capture du paiement.";
            }
            if (manualPanel) manualPanel.style.display = "block";
            if (hubContainer) hubContainer.style.display = "none";
            modal.classList.remove("hidden");
            return;
        }

        // Commission plateforme : montant fixe de 2 000 FCFA, converti dans la devise
        // du client (taux du jour). Le nombre de kilos n'entre plus dans le calcul.
        const userCurrency = window.CCCommon?.getUserCurrency ? window.CCCommon.getUserCurrency() : "XOF";
        const commissionLocal = window.CCCommon?.convertCurrency
            ? window.CCCommon.convertCurrency(COMMISSION_XOF, "XOF", userCurrency)
            : COMMISSION_XOF;
        PAYMENT_STATE.amount = Math.round(commissionLocal * 100) / 100;
        PAYMENT_STATE.currency = userCurrency;
        const commissionLabel = window.CCCommon?.formatAmount
            ? window.CCCommon.formatAmount(PAYMENT_STATE.amount, userCurrency)
            : `${PAYMENT_STATE.amount} ${userCurrency}`;
        const commissionLine = String(userCurrency).toUpperCase() === "XOF"
            ? commissionLabel
            : `${commissionLabel} (soit ${COMMISSION_XOF} FCFA)`;
        modal.classList.remove("hidden");
        hubContainer.innerHTML = `
            <div class="payment-selection">
                <h3 style="margin-bottom: 8px; font-weight: 600;">Comment souhaitez-vous payer ?</h3>
                <p style="color:#9ca3af; font-size:0.88rem; margin-bottom:18px;">Frais de mise en relation : <strong style="color:#fff">${commissionLine}</strong></p>
                <div class="payment-methods-grid">
                    <button class="method-btn-premium" id="pay-card">
                        <span class="icon">💳</span>
                        <div class="text-wrap"><span class="title">Carte Bancaire</span><span class="subtitle">Visa / Mastercard</span></div>
                    </button>
                    <button class="method-btn-premium" id="pay-momo">
                        <span class="icon">📱</span>
                        <div class="text-wrap"><span class="title">Mobile Money</span><span class="subtitle">Orange, MTN, Wave, Moov...</span></div>
                    </button>
                </div>
                <button id="btn-close-pay" style="margin-top: 20px; opacity: 0.6; font-size: 0.9rem; background: transparent; border: none; color: white; cursor: pointer;">Annuler</button>
            </div>
        `;
        document.getElementById("btn-close-pay").onclick = () => modal.classList.add("hidden");
        document.getElementById("pay-card").onclick = () => handleHubPayment("card");
        document.getElementById("pay-momo").onclick = () => {
            hubContainer.innerHTML = `
                <div style="animation: fadeIn 0.3s ease;">
                    <button id="btn-back-choice" style="background: transparent; border: none; color: #aaa; margin-bottom: 20px; cursor: pointer;">← Retour</button>
                    <h3 style="margin-bottom: 6px;">Payer par Mobile Money</h3>
                    <p style="color: #9ca3af; font-size: 0.82rem; margin-bottom: 14px;">Saisissez votre numéro : la demande de paiement arrive directement sur votre téléphone. Rien à ressaisir ensuite.</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        <input type="tel" id="momo-phone" placeholder="+225 07 00 00 00 00" autocomplete="tel" inputmode="tel" style="width: 100%; font-size: 1.1rem; background: transparent; border: none; color: white; outline: none; padding: 8px 0;">
                    </div>
                    <p id="momo-error" style="color: #f87171; font-size: 0.8rem; min-height: 18px;"></p>
                    <p style="color:#9ca3af; font-size:0.82rem; margin-bottom:10px;">À payer : <strong style="color:#fff">${commissionLine}</strong> — la demande part dès que votre numéro est complet.</p>
                    <div id="momo-routing-zone"></div>
                </div>
            `;
            document.getElementById("btn-back-choice").onclick = () => openSplitPaymentModal(type, totalAmount);
            const phoneInput = document.getElementById("momo-phone");
            const routingZone = document.getElementById("momo-routing-zone");
            const errorBox = document.getElementById("momo-error");
            // Operateurs par pays (slugs GeniusPay). Le pays vient de l'indicatif.
            // Liste relevee sur la page de paiement GeniusPay (verite terrain).
            const countries = {
                "+225": { name: "Côte d'Ivoire", currency: "XOF", rails: [["orange_money", "Orange Money"], ["mtn_money", "MTN MoMo"], ["moov_money", "Moov Money"], ["wave", "Wave"]] },
                "+221": { name: "Sénégal", currency: "XOF", rails: [["orange_money", "Orange Money"], ["free_money", "Free Money"], ["wave", "Wave"]] },
                "+229": { name: "Bénin", currency: "XOF", rails: [["mtn_money", "MTN MoMo"], ["moov_money", "Moov Money"]] },
                "+226": { name: "Burkina Faso", currency: "XOF", rails: [["orange_money", "Orange Money"], ["wave", "Wave"], ["moov_money", "Moov Money"], ["mobicash", "Mobicash"]] },
                "+223": { name: "Mali", currency: "XOF", rails: [["orange_money", "Orange Money"], ["mobicash", "Mobicash"]] },
                "+228": { name: "Togo", currency: "XOF", rails: [["moov_money", "Moov Money"], ["togocel", "Togocom / T-Money"]] },
                "+227": { name: "Niger", currency: "XOF", rails: [["airtel_money", "Airtel Money"]] },
                "+245": { name: "Guinée-Bissau", currency: "XOF", rails: [["orange_money", "Orange Money"]] },
                "+224": { name: "Guinée", currency: "GNF", rails: [["orange_money", "Orange Money"]] },
                "+237": { name: "Cameroun", currency: "XAF", rails: [["orange_money", "Orange Money"], ["mtn_money", "MTN MoMo"]] },
                "+242": { name: "Congo", currency: "XAF", rails: [["airtel_money", "Airtel Money"], ["mtn_money", "MTN MoMo"]] },
                "+241": { name: "Gabon", currency: "XAF", rails: [["airtel_money", "Airtel Money"]] },
                "+243": { name: "RD Congo", currency: "CDF", rails: [["airtel_money", "Airtel Money"], ["orange_money", "Orange Money"], ["mpesa", "M-Pesa"]] },
                "+254": { name: "Kenya", currency: "KES", rails: [["mpesa", "M-Pesa"]] },
                "+256": { name: "Ouganda", currency: "UGX", rails: [["airtel_money", "Airtel Money"], ["mtn_money", "MTN MoMo"]] },
                "+250": { name: "Rwanda", currency: "RWF", rails: [["airtel_money", "Airtel Money"], ["mtn_money", "MTN MoMo"]] },
                "+260": { name: "Zambie", currency: "ZMW", rails: [["mtn_money", "MTN MoMo"], ["zamtel_kwacha", "Zamtel Kwacha"]] },
                "+232": { name: "Sierra Leone", currency: "SLE", rails: [["orange_money", "Orange Money"]] }
            };
            const renderRails = () => {
                const raw = String(phoneInput.value || "").trim();
                const digits = raw.replace(/[^\d]/g, "");
                const matched = Object.keys(countries).find((p) => digits.startsWith(p.slice(1)));
                if (matched) {
                    const c = countries[matched];
                    routingZone.innerHTML = `
                        <p style="color: #9ca3af; font-size: 0.78rem; text-transform: uppercase; letter-spacing: .5px; margin: 10px 0 8px;">Payer avec</p>
                        ${c.rails.map(([slug, label]) => `
                            <button class="method-btn-premium" data-rail="${slug}" style="width:100%;margin-bottom:8px;">
                                <span class="icon">📱</span>
                                <div class="text-wrap"><span class="title">${label}</span><span class="subtitle">${c.name} — validation sur votre téléphone</span></div>
                            </button>`).join("")}
                    `;
                    routingZone.querySelectorAll("[data-rail]").forEach((btn) => {
                        btn.onclick = () => {
                            const phone = String(phoneInput.value || "").trim().replace(/\s/g, "");
                            if (!/^\+\d{8,15}$/.test(phone)) {
                                if (errorBox) errorBox.textContent = "Numéro complet avec le + (ex: +2250700000000).";
                                return;
                            }
                            if (errorBox) errorBox.textContent = "";
                            handleHubPayment(btn.getAttribute("data-rail"), phone, btn);
                        };
                    });
                } else if (/^\+\d{8,15}$/.test(raw.replace(/\s/g, ""))) {
                    routingZone.innerHTML = `
                        <div style="padding:16px;border-radius:14px;background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.30);margin-top:6px;">
                            <p style="color:#fbbf24;font-weight:600;margin-bottom:6px;font-size:0.9rem;">Paiement mobile pas encore disponible</p>
                            <p style="color:#d1d5db;font-size:0.82rem;line-height:1.5;">Le mobile money n'est pas encore ouvert dans ce pays. Le paiement par carte bancaire est accepté.</p>
                        </div>
                        <button class="method-btn-premium" id="momo-pay-card" style="width:100%;margin-top:10px;">
                            <span class="icon">💳</span>
                            <div class="text-wrap"><span class="title">Payer par carte</span><span class="subtitle">Visa / Mastercard — paiement sécurisé</span></div>
                        </button>`;
                    const cardBtn = document.getElementById("momo-pay-card");
                    if (cardBtn) cardBtn.onclick = (ev) => {
                        // On transmet le numero : le pays est ainsi deja choisi sur la page
                        // de paiement GeniusPay, le client n'a plus qu'a saisir sa carte.
                        const tel = String(phoneInput.value || "").trim().replace(/\s/g, "");
                        handleHubPayment("card", /^\+\d{8,15}$/.test(tel) ? tel : null, ev.currentTarget);
                    };
                } else if (digits.length >= 3) {
                    // Indicatif deja hors liste mobile money : autant le dire tout de suite.
                    routingZone.innerHTML = `
                        <div style="padding:16px;border-radius:14px;background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.30);margin-top:6px;">
                            <p style="color:#fbbf24;font-weight:600;margin-bottom:6px;font-size:0.9rem;">Paiement mobile pas encore disponible</p>
                            <p style="color:#d1d5db;font-size:0.82rem;line-height:1.5;">Votre pays n'est pas encore ouvert au mobile money. Le paiement par carte bancaire est accepté.</p>
                        </div>
                        <button class="method-btn-premium" id="momo-pay-card" style="width:100%;margin-top:10px;">
                            <span class="icon">💳</span>
                            <div class="text-wrap"><span class="title">Payer par carte</span><span class="subtitle">Visa / Mastercard — paiement sécurisé</span></div>
                        </button>`;
                    const cb = document.getElementById("momo-pay-card");
                    if (cb) cb.onclick = (ev) => handleHubPayment("card", null, ev.currentTarget);
                } else {
                    routingZone.innerHTML = "";
                }
            };
            phoneInput.oninput = renderRails;
            // Des que le numero est complet, le paiement part tout seul : PawaPay deduit
            // l'operateur du numero, il n'y a plus rien d'autre a choisir.
            let autoTimer = null;
            let autoPhone = "";
            phoneInput.addEventListener("input", () => {
                const phone = String(phoneInput.value || "").trim().replace(/\s/g, "");
                if (!/^\+\d{8,15}$/.test(phone) || phone === autoPhone) return;
                clearTimeout(autoTimer);
                autoTimer = setTimeout(() => {
                    if (document.getElementById("momo-phone") !== phoneInput) return;
                    if (document.getElementById("momo-error")?.textContent) return;
                    autoPhone = phone;
                    if (errorBox) errorBox.textContent = "";
                    handleHubPayment("", phone, null);
                }, 1200);
            });
            phoneInput.focus();
        };
    }

    async function submitSplitPayment() {
        const receiptInput = document.getElementById("split-payment-receipt");
        const file = receiptInput?.files?.[0];
        const errBox = document.getElementById("manual-payment-error");
        const showErr = (msg) => {
            if (errBox) { errBox.textContent = msg; errBox.style.display = "block"; }
            else alert(msg);
        };
        if (!file) return showErr("Veuillez televerser la capture d'ecran du paiement.");
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return showErr("Format accepte : PNG, JPG ou WEBP.");
        if (file.size > 3_000_000) return showErr("Capture trop lourde (maximum 3 Mo).");
        const submitBtn = document.getElementById("split-payment-submit");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Envoi...';
        try {
            const base64 = await fileToDataUrl(file);
            const isCommission = PAYMENT_STATE.step === "commission";
            const reservationId = state.activeThreadData?.reservation?.id || state.activeThreadData?.reservation_id;
            if (!reservationId) throw new Error("Erreur système : ID de réservation introuvable.");
            const endpoint = isCommission ? `/api/reservations/${reservationId}/pay-commission` : `/api/reservations/${reservationId}/pay-traveler`;
            await window.CCCommon.api(endpoint, { method: "POST", body: { receiptData: base64, amount: PAYMENT_STATE.amount } });
            document.getElementById("split-payment-modal").classList.add("hidden");
            if (receiptInput) receiptInput.value = "";
            showNotification("Preuve de paiement envoyée.", "success");
            await loadConversations().catch(() => { });
            if (state.activeThreadId) await openThread(state.activeThreadId);
        } catch (err) {
            showErr(err.message || "Erreur lors de l'envoi.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Confirmer le paiement";
        }
    }

    // Paiement : carte -> page PSP hebergee ; mobile money -> mode direct
    // (GeniusPay envoie la demande sur le telephone, plus rien a ressaisir).
    async function handleHubPayment(rail = "card", phone = null, btnEl = null) {
        const resId = state.activeThreadData?.reservation?.id || state.activeThreadData?.reservation_id || state.activeThreadData?.reservationId;
        if (!resId) return alert("Identifiant réservation manquant.");
        const btn = btnEl || document.getElementById(rail === "card" ? "pay-card" : null);
        const originalContent = btn ? btn.innerHTML : "";
        if (btn) { btn.innerHTML = `<span class="spinner"></span> Connexion...`; btn.style.pointerEvents = "none"; }
        try {
            const result = await window.CCCommon.api("/api/payments/initiate", {
                method: "POST",
                body: { reservationId: resId, rail, phone }
            });
            if (btn) { btn.innerHTML = originalContent; btn.style.pointerEvents = ""; }
            // Un refus (montant minimum GeniusPay, operateur indisponible, etc.) doit
            // s'afficher clairement : sinon on affiche « validez sur votre telephone »
            // pour un paiement qui n'a jamais ete cree.
            if (!result || result.success === false || result.error) {
                alert(result?.error || "Paiement indisponible pour le moment.");
                return;
            }
            if (result?.paymentUrl) { window.location.href = result.paymentUrl; return; }
            // Mode direct : on attend la validation sur le telephone, en verifiant
            // le statut reel toutes les 4 s (jamais l'ecran seul).
            await watchDirectPayment(resId, phone, result);
        } catch (err) {
            if (btn) { btn.innerHTML = originalContent; btn.style.pointerEvents = ""; }
            alert("Erreur: " + (err.message || "Service momentanément indisponible."));
        }
    }

    // Ecran d'attente : « validez sur votre telephone », puis verification
    // periodique aupres du serveur (qui interroge GeniusPay).
    async function watchDirectPayment(reservationId, phone, info) {
        const modal = document.getElementById("split-payment-modal");
        const container = document.getElementById("payment-modal-container");
        if (!container) return alert("Validez la demande de paiement reçue sur votre téléphone.");

        const montant = info?.amount
            ? (window.CCCommon?.formatAmount ? window.CCCommon.formatAmount(info.amount, info.currency) : `${info.amount} ${info.currency}`)
            : "";
        container.innerHTML = `
            <div style="text-align:center; padding: 10px 4px;">
                <div style="font-size: 2.4rem; margin-bottom: 10px;">📲</div>
                <h3 style="margin-bottom: 8px;">Validez sur votre téléphone</h3>
                <p style="color:#9ca3af; font-size:0.88rem; line-height:1.5; margin-bottom: 14px;">
                    Une demande de paiement${montant ? ` de <strong>${montant}</strong>` : ""} a été envoyée au
                    <strong>${window.CCCommon.escapeHtml(String(phone || ""))}</strong>.<br>
                    Confirmez-la dans l'application ou par le code USSD de votre opérateur.
                </p>
                ${info?.otpInstructions ? `<p style="color:#fbbf24; font-size:0.82rem; margin-bottom:12px;">${window.CCCommon.escapeHtml(info.otpInstructions)}</p>` : ""}
                <p id="direct-wait-status" style="color:#34d399; font-size:0.85rem; min-height:20px;">En attente de la confirmation…</p>
                <button type="button" id="direct-wait-close" style="margin-top: 16px; background: transparent; border: none; color: #aaa; font-size: 0.85rem; cursor: pointer;">Fermer</button>
            </div>
        `;
        document.getElementById("direct-wait-close").onclick = () => modal?.classList.add("hidden");

        const statusEl = document.getElementById("direct-wait-status");
        const started = Date.now();
        const tick = async () => {
            if (!document.body.contains(container) || modal?.classList.contains("hidden")) return;
            try {
                const res = await window.CCCommon.api("/api/payments/verify", {
                    method: "POST",
                    body: { reservationId }
                });
                if (res?.status === "paid" || res?.changed) {
                    if (statusEl) statusEl.textContent = "Paiement confirmé !";
                    modal?.classList.add("hidden");
                    showNotification("Paiement confirmé. Vos kilos sont réservés.", "success");
                    await loadConversations();
                    if (state.activeThreadId) await openThread(state.activeThreadId);
                    await openReceipt();
                    return;
                }
                if (statusEl) {
                    const secs = Math.round((Date.now() - started) / 1000);
                    statusEl.textContent = `Toujours en attente… (${secs}s) — vérifiez votre téléphone.`;
                }
            } catch (e) {
                if (statusEl) statusEl.textContent = "Vérification impossible pour le moment, nouvelle tentative…";
            }
            if (Date.now() - started > 180000) {
                if (statusEl) statusEl.textContent = "Toujours pas de confirmation. Le paiement reste vérifiable : rouvrez la conversation plus tard.";
                return;
            }
            setTimeout(tick, 4000);
        };
        setTimeout(tick, 3000);
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

        // Surveillance de la frappe (couche 2) : le moderateur classique peut faire
        // analyser le message en cours de redaction avant meme l'envoi. Une seule
        // analyse par conversation, apres une courte pause de frappe.
        els.messageInput?.addEventListener("input", () => {
            window.CCFraudeIA?.surveiller(state.activeThreadId, els.messageInput.value || "");
        });

        els.messageInput?.addEventListener("input", () => {
            if (isPaidThread(state.activeThreadData)) { showLeakWarning(false); return; }
            showLeakWarning(detectLeakClient(els.messageInput.value));
        });

        els.chatPayBtn?.addEventListener("click", () => {
            const thread = state.activeThreadData;
            // Commission deja payee : on passe directement a la preuve de paiement
            // au voyageur (l'ancien flux redemandait les kilos et rouvrait un choix
            // de carte/mobile inadapte).
            if (String(thread?.status || "") === "commission_payee") {
                openSplitPaymentModal("traveler", thread?.reservation?.total_amount || 0);
                return;
            }
            const availableKg = thread?.offer?.available_kg || thread?.offer?.availableKg || 0;
            // Commission au forfait : on ne demande plus le nombre de kilos, on va
            // droit au choix du moyen de paiement.
            void availableKg;
            openSplitPaymentModal("commission", thread?.reservation?.total_amount || 0);
        });

        // Bouton confirmation de la modale kg
        document.getElementById("kg-modal-confirm")?.addEventListener("click", async () => {
            const kgInput = document.getElementById("kg-modal-input");
            const kgError = document.getElementById("kg-modal-error");
            const kg = parseInt(kgInput?.value, 10);
            const thread = state.activeThreadData;
            const availableKg = thread?.offer?.available_kg || thread?.offer?.availableKg || 0;

            if (!kg || kg < 1 || (availableKg > 0 && kg > availableKg)) {
                if (kgError) {
                    kgError.style.display = "block";
                    const msg = availableKg > 0
                        ? `Veuillez saisir un nombre valide entre 1 et ${availableKg} kg.`
                        : "Veuillez saisir un nombre valide (au moins 1 kg).";
                    kgError.textContent = msg;
                }
                return;
            }

            // Sauvegarder les kg choisis
            PAYMENT_STATE.chosenKg = kg;

            // Mettre a jour la reservation avec les kg (PostgREST renvoie { error },
            // il ne leve pas d'exception : l'ancien code pouvait afficher le paiement
            // alors que les kilos n'avaient pas ete enregistres).
            const resId = thread?.reservation?.id || thread?.reservation_id || thread?.reservationId;
            if (resId && window.ccSupabase) {
                const { error } = await window.ccSupabase.from("reservations")
                    .update({ kg: kg, updated_at: new Date().toISOString() })
                    .eq("id", resId).select("id");
                if (error) {
                    if (kgError) {
                        kgError.style.display = "block";
                        kgError.textContent = "Impossible d'enregistrer les kilos : " + (error.message || "erreur reseau");
                    }
                    return;
                }
                if (thread.reservation) thread.reservation.kg = kg;
            }

            document.getElementById("kg-modal")?.classList.add("hidden");

            // Montant total = prix au kilo x kilos choisis (l'ancien code passait le
            // prix au kilo comme montant total). A defaut : total_amount enregistre.
            const pricePerKg = Number(thread?.offerPrice || thread?.offer?.price_per_kg || thread?.offer?.price || 0);
            const total = pricePerKg > 0 ? pricePerKg * kg : Number(thread?.reservation?.total_amount || 0);
            if (!(total > 0)) {
                alert("Montant indisponible : demandez le prix au voyageur dans la conversation avant de payer.");
                return;
            }
            openSplitPaymentModal("commission", total);
        });

        // Fermer la modale kg au clic sur close
        document.getElementById("kg-modal")?.querySelector(".close-modal")?.addEventListener("click", () => {
            document.getElementById("kg-modal")?.classList.add("hidden");
        });

        document.getElementById("split-payment-close")?.addEventListener("click", () => {
            document.getElementById("split-payment-modal").classList.add("hidden");
        });
        document.getElementById("split-payment-cancel")?.addEventListener("click", () => {
            document.getElementById("split-payment-modal")?.classList.add("hidden");
        });
        document.getElementById("payment-hub-close")?.addEventListener("click", () => {
            document.getElementById("payment-hub-modal").classList.add("hidden");
        });
        document.getElementById("split-payment-submit")?.addEventListener("click", () => submitSplitPayment());
        // « Voir mon recu » (2e ligne du bandeau) + boutons de la modale
        els.paidReceiptBtn?.addEventListener("click", () => { openReceipt().catch(() => { }); });
        els.receiptDownloadBtn?.addEventListener("click", () => {
            const ctx = receiptContext();
            window.generateReceiptPDF(ctx.ref || "");
        });
        els.receiptCloseBtn?.addEventListener("click", () => {
            document.getElementById("receipt-view-modal")?.classList.add("hidden");
        });

        // « J'ai reverse » : le bouton etait genere mais aucun handler n'existait.
        els.messagesList?.addEventListener("click", async (event) => {
            const btn = event.target.closest(".reversal-done-btn");
            if (!btn) return;
            const reservationId = state.activeThreadData?.reservation?.id || state.activeThreadData?.reservation_id;
            if (!reservationId) return alert("Reservation introuvable.");
            if (!window.confirm("Confirmer avoir reverse la commission a ColisConnect ?")) return;
            btn.disabled = true;
            try {
                await window.CCCommon.api(`/api/reservations/${encodeURIComponent(reservationId)}/reversal-done`, { method: "POST" });
                showNotification("Reversement confirme.", "success");
                await loadConversations();
                await openThread(state.activeThreadId);
            } catch (error) {
                btn.disabled = false;
                alert(error.message || "Confirmation impossible.");
            }
        });

        // Banniere d'info : 3 lignes sur mobile, « Voir plus » pour derouler.
        document.getElementById("banner-more-btn")?.addEventListener("click", (event) => {
            const banner = els.chatInfoBanner || document.getElementById("chat-info-banner");
            if (!banner) return;
            const expanded = banner.classList.toggle("expanded");
            event.currentTarget.textContent = expanded ? "Voir moins" : "Voir plus";
        });

        els.comprisBtn?.addEventListener("click", () => {
            state.isTutorialAccepted = true;
            if (state.activeThreadId) markThreadTutorialAccepted(state.activeThreadId);
            els.tutorialOverlay?.classList.add("hidden");
            els.chatInfoBanner?.classList.remove("tutorial-focus");
            els.comprisBtn?.classList.remove("highlight-mode");
            els.comprisBtn?.classList.add("hidden");
        });

        els.messageInput?.addEventListener("mousedown", (e) => {
            if (!state.isTutorialAccepted && els.chatInfoBanner && !els.chatInfoBanner.classList.contains("hidden")) {
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
            const isPaymentSuccess = urlParams.get('payment') === 'success' || urlParams.get('status') === 'success';
            if (isPaymentSuccess) {
                // [FIX CRITIQUE 2026-10-28] Ce bloc ecrivait autrefois status=paid et
                // deduisait les kilos depuis un simple parametre d'URL : n'importe qui
                // pouvait rejouer chat.html?payment=success&id=<reservation> pour
                // valider un paiement sans payer. Seul le webhook (service role) est
                // autoritaire. Ici on se contente de LIRE l'etat reel.
                const resId = urlParams.get('id');
                if (resId) {
                    // Le webhook peut arriver apres la redirection : on demande au
                    // serveur de relire le paiement chez GeniusPay avant d'afficher.
                    try {
                        await window.CCCommon.api("/api/payments/verify", { method: "POST", body: { reservationId: resId } });
                    } catch (e) {
                        console.warn("Verification du paiement au retour impossible:", e);
                    }
                }
                if (resId && window.ccSupabase) {
                    try {
                        const { data: reservation, error } = await window.ccSupabase
                            .from("reservations")
                            .select("status, payment_tx_id")
                            .eq("id", resId)
                            .maybeSingle();
                        if (error) throw error;
                        const status = String(reservation?.status || "").toLowerCase();
                        const paid = ["paid", "voyageur_paye", "colisconnect_paye"].includes(status);
                        if (paid) {
                            showNotification("Paiement confirmé. Vos kilos sont réservés.", "success");
                        } else {
                            showNotification("Paiement en cours de vérification. La réservation sera mise à jour dès confirmation.", "info");
                        }
                    } catch (e) {
                        console.warn("Verification du retour de paiement impossible:", e);
                        showNotification("Impossible de vérifier le paiement pour le moment. Rechargez la page dans quelques instants.", "info");
                    }
                } else {
                    showNotification("Retour de paiement détecté. Vérification en cours.", "info");
                }
            }
        } catch (e) { console.error("Payment return handling error:", e); }

        if (!window.CCCommon.requireAuth("chat.html")) return;
        state.userId = window.CCCommon.state.user?.id;
        initMobileKeyboardViewport();

        const params = new URLSearchParams(window.location.search || "");
        const offerId = params.get("offerId");
        const requestId = params.get("requestId");
        // ?id= : fil PRECIS (boutons « Repondre » / « Voir » du dashboard :
        // Voyageur, Chercheur, Cargo, Messages). Exception : dans un retour de
        // paiement (?payment=success&id=<reservation>) `id` designe la RESERVATION
        // et non un fil -> on ne l'interprete pas comme fil dans ce cas.
        const isPaymentReturn = params.get("payment") === "success" || params.get("status") === "success";
        const paymentReservationId = isPaymentReturn ? (params.get("id") || params.get("reservationId")) : null;
        const threadId = isPaymentReturn ? null : (params.get("id") || params.get("threadId"));

        if (paymentReservationId) {
            // Retour de paiement : on rouvre LA conversation payee (et non la liste),
            // puis le recu s'affiche tout seul ; il reste accessible ensuite par la
            // ligne « Voir mon recu » du bandeau.
            const opened = await openThreadForReservation(paymentReservationId);
            if (opened) {
                try {
                    window.history.replaceState({}, "", "chat.html?id=" + encodeURIComponent(state.activeThreadId));
                } catch (e) { }
                await openReceipt();
            } else {
                await loadConversations();
            }
        } else if (offerId) await ensureConversationForOffer(offerId);
        else if (requestId) await ensureConversationForRequest(requestId);
        else if (threadId) await openThreadFromUrl(threadId);
        else await loadConversations();

        setTimeout(() => { window.CCCommon?.syncNotificationBadges?.(); }, 1500);
    }

    bootstrap().catch((error) => {
        alert(error.message || "Initialisation impossible.");
    });
})();
