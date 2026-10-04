/* ============================================================
   offer-card.js — Carte d'offre CC3 (module partagé)
   Carte EXTRAITE FIDÈLEMENT de results.js (fonction renderOffers)
   pour être réutilisée ailleurs, notamment sur le dashboard
   (section « Offre active » côté voyageur).

   IMPORTANT :
   - Le rendu est identique à la carte de la page des offres.
   - À insérer dans un conteneur <div class="cards-list"> pour que
     les règles CSS « .cards-list .cc3-card ... » de style.css
     s'appliquent (padding global remis à 0, cadre carte, etc.).
   - Si la carte de results.js évolue, reporter la modification ici
     (results.js garde sa propre copie pour ne pas risquer la page
     de recherche).

   Usage :
     const html = window.CCOfferCard.html(offer, {
       userCurrency,            // devise d'affichage (state.userCurrency)
       currentUserId,           // id de l'utilisateur connecté
       own: true,               // forcer « c'est mon offre »
       editAttrName: "data-edit-offer",
       deleteAttrName: "data-delete-offer",
       editLabel: "Modifier mon trajet",
       deleteLabel: "Supprimer mon trajet",
       ownerNameFallback: "…",  // nom d'affichage si l'offre n'en porte pas
       ownerPhotoFallback: "…",
       ownerVerifiedFallback: false
     })
   ============================================================ */
(function () {
    "use strict";

    if (window.CCOfferCard) return;

    function getInitials(name) {
        if (!name) return "CC";
        const parts = String(name).split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return String(name).substring(0, 2).toUpperCase();
    }

    // Pied de carte partagé (carte voyageur ET carte demande) : profil + actions.
    //   1. editAttr   → MA publication : « Modifier mon trajet »
    //   2. dataAttr   → publication d'un autre membre : « Contacter »
    //   3. aucun      → libellé inactif (repli)
    // Copie de cc3CardFooter() (results.js).
    function cc3CardFooter(opts) {
        const eh = (value) => window.CCCommon.escapeHtml(String(value === undefined || value === null ? "" : value));
        const name = String(opts.name || "").trim();
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ");
        const initials = getInitials(name);
        const editBtn = opts.editAttr
            ? `<button class="cc3-cta cc3-cta-edit" type="button" ${opts.editAttr} aria-label="${eh(opts.editAriaLabel || opts.editLabel || "Modifier")}">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"></path><path d="M13.5 6.5l3 3"></path></svg>
        <span>${eh(opts.editLabel || "Modifier")}</span>
      </button>`
            : "";
        const btn = editBtn || (opts.dataAttr
            ? `<button class="cc3-cta" type="button" ${opts.dataAttr} aria-label="${eh(opts.ariaLabel)}">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M23.7 8C14 8 6.1 14.5 6.1 22.5c0 4.7 2.8 8.9 7.1 11.5l-1.1 6.1 7-3.7c1.5.4 3 .6 4.6.6 9.7 0 17.6-6.5 17.6-14.5S33.4 8 23.7 8z"></path></svg>
        <span>Contacter</span>
      </button>`
            : `<span class="cc3-cta" aria-disabled="true"><span>${eh(opts.inactiveLabel)}</span></span>`);
        const delBtn = opts.deleteAttr
            ? `<button class="cc3-del" type="button" ${opts.deleteAttr} title="${eh(opts.deleteLabel || "Supprimer")}" aria-label="${eh(opts.deleteLabel || "Supprimer")}">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M9.5 7V4.8h5V7"></path><path d="M6.2 7l1 12.2h9.6L17.8 7"></path><path d="M10 10.8v5.2M14 10.8v5.2"></path></svg>
      </button>`
            : "";
        const actions = delBtn ? `<div class="cc3-actions">${delBtn}${btn}</div>` : btn;
        return `
    <footer class="cc3-foot">
      <div class="cc3-profile">
        ${opts.photo ? `<img class="cc3-avatar cc3-avatar-img" src="${eh(opts.photo)}" alt="">` : `<span class="cc3-avatar">${eh(initials)}</span>`}
        <div class="cc3-profile-txt">
          <div class="cc3-name-line">
            <span class="cc3-name">${eh(firstName)} <em>${eh(lastName)}</em></span>
            ${opts.isVerified ? `<svg class="cc3-shield" viewBox="0 0 36 40" aria-hidden="true"><path d="M18 2.5 32 8v10.3c0 8.5-5.7 15.2-14 18.9C9.7 33.5 4 26.8 4 18.3V8l14-5.5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"></path><path d="M15.6 22.4 12 18.8l-2 2 5.6 5.6L26.8 15.2l-2-2z" fill="currentColor"></path></svg>` : ""}
          </div>
          <span class="cc3-meta">${eh(opts.label)}</span>
        </div>
      </div>
      ${actions}
    </footer>`;
    }

    function html(offer, options) {
        const opts = options || {};
        offer = offer || {};
        const eh = (value) => window.CCCommon.escapeHtml(String(value === undefined || value === null ? "" : value));

        const userCur = opts.userCurrency || window.CCCommon.state?.userCurrency || "EUR";
        const currentUserId = opts.currentUserId || window.CCCommon.state?.user?.id;
        const editAttrName = opts.editAttrName || "data-edit-own-offer";
        const deleteAttrName = opts.deleteAttrName || "data-delete-own-offer";
        const ownerName = String(offer.ownerName || offer.owner_name || opts.ownerNameFallback || "Voyageur");
        const ownerPhoto = String(offer.ownerProfilePhoto || offer.ownerAvatar || offer.avatar || opts.ownerPhotoFallback || "").trim();

        const isVerified = Boolean(offer.ownerIsVerified || offer.owner_is_verified || opts.ownerVerifiedFallback);
        // C'est MON offre (voyageur ou cargo) : le pied de carte proposera
        // « Modifier mon trajet » au lieu de « Contacter ».
        const offerOwnerId = offer.user_id || offer.userId || "";
        const isOwnOffer = opts.own === true || (!!currentUserId
            && String(offerOwnerId).trim() !== ""
            && String(offerOwnerId) === String(currentUserId));

        const originCountry = offer.origin || "Origine";
        const destCountry = offer.destination || "Arrivée";
        const originCity = String(offer.city_origin || offer.cityOrigin || "").trim();
        const destCity = String(offer.city_destination || offer.cityDestination || "").trim();
        const departureDate = String(offer.departureDate || offer.departure_date || "-");
        let formattedDate = departureDate;
        try {
            const d = new Date(departureDate);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
            }
        } catch (e) { /* fallback */ }

        const pricePerKgRaw = Number(offer.pricePerKg || offer.price_per_kg || 0);
        const baseCur = offer.baseCurrency || offer.base_currency || "EUR";
        const convertedPrice = window.CCCommon.convertCurrency(pricePerKgRaw, baseCur, userCur);
        const availableKg = offer.availableKg || offer.available_kg || 0;

        const priceDisplay = window.CCCommon.formatAmount(convertedPrice, userCur);
        const offerMode = String(offer.mode || "").trim();

        // [CARGO] Dates supplémentaires (jsonb) : triées puis formatées en chips courtes
        let extraDateValues = [];
        try {
            const raw = offer.extraDates || offer.extra_dates || [];
            const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
            extraDateValues = (Array.isArray(arr) ? arr : [])
                .map((s) => String(s || "").trim())
                .filter(Boolean)
                .sort();
        } catch (e) { extraDateValues = []; }
        const fmtExtraDate = (iso) => {
            try {
                const d = new Date(iso);
                if (!isNaN(d.getTime())) return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            } catch (e) { /* fallback */ }
            return iso;
        };
        const extraDateChips = extraDateValues.map(fmtExtraDate);

        // Colis acceptés / refusés
        const colisAcceptes = String(offer.colis_types || offer.colisTypes || "").trim();
        const colisRefuses = String(offer.refused_colis_types || offer.refusedColisTypes || "").trim();

        // Prix spéciaux (JSONB ou chaîne JSON)
        let specialPrices = [];
        try {
            const sp = offer.special_prices || offer.specialPrices || [];
            specialPrices = Array.isArray(sp) ? sp : JSON.parse(sp || "[]");
        } catch (e) { specialPrices = []; }
        const validSpecial = specialPrices.filter((p) => p && p.type && Number(p.price) > 0);
        const specialPriceDisplay = (price) => window.CCCommon.formatAmount(window.CCCommon.convertCurrency(Number(price), baseCur, userCur), userCur);
        const specialUnitLabel = (p) => (p.mode === "qty" ? ` par ${window.CCCommon.escapeHtml(p.type)}` : " par kilo");
        const specialRow = (p) => `
        <div class="cc3-special-item">
          <span class="cc3-special-type${p.type && p.type.length > 14 ? " cc3-type-long" : ""}">${window.CCCommon.escapeHtml(p.type)}</span>
          <span class="cc3-special-price">${specialPriceDisplay(p.price)}</span>
          <span class="cc3-special-unit">${specialUnitLabel(p).trim()}</span>
        </div>`;
        // Articles refusés : chaîne "A, B (précision), C" → liste {name, note?}
        const refusesItems = colisRefuses
            .split(",")
            .map((s) => {
                const t = s.trim();
                if (!t) return null;
                const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                return m ? { name: m[1].trim(), note: m[2].trim() } : { name: t, note: "" };
            })
            .filter(Boolean);
        const refusedRow = (r) => `
        <div class="cc3-refused-item">
          <span class="cc3-refused-name${r.name && r.name.length > 14 ? " cc3-refused-long" : ""}">${window.CCCommon.escapeHtml(r.name)}</span>
          ${r.note ? `<span class="cc3-refused-note">${window.CCCommon.escapeHtml(r.note)}</span>` : ""}
        </div>`;
        // La zone (2 colonnes) n'existe que si au moins un des deux côtés a du contenu
        const hasSpecialZone = validSpecial.length > 0 || refusesItems.length > 0;
        // Label du bouton accordéon : jamais mensonger selon le contenu
        const accordionLabel = validSpecial.length > 0 && refusesItems.length > 0
            ? "Prix spéciaux et articles refusés"
            : (validSpecial.length > 0 ? "Prix spéciaux" : "Articles refusés");

        const profileLabel = offerMode === "" ? "Voyageur" : "Transporteur Pro";

        // Badge date : Aujourd'hui / Demain / date complète
        let badgeDate = formattedDate;
        try {
            const d = new Date(departureDate);
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            if (!isNaN(d.getTime())) {
                if (d.toDateString() === today.toDateString()) badgeDate = "Aujourd'hui";
                else if (d.toDateString() === tomorrow.toDateString()) badgeDate = "Demain";
            }
        } catch (e) { /* fallback */ }

        // Code IATA : 3 premières lettres du pays (FRA, SEN...)
        const iata = (name) => (String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '') || '???').slice(0, 3);
        const codeFrom = iata(originCountry);
        const codeDest = iata(destCountry);
        // [FLAGS] Codes ISO stockés dans l'offre -> classe flag-icons fi-{code}
        const ccCode = (v) => (/^[A-Za-z]{2}$/.test(String(v || "")) ? String(v).toLowerCase() : "");
        const ccOrigin = ccCode(offer.originCountryCode || offer.origin_country_code);
        const ccDest = ccCode(offer.destCountryCode || offer.destination_country_code);
        const flagCls = (c) => (c ? ` fi fis fi-${c}` : "");

        // Date courte pour la colonne DÉPART (ex: "21 août")
        let shortDate = formattedDate;
        try {
            const d = new Date(departureDate);
            if (!isNaN(d.getTime())) {
                shortDate = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            }
        } catch (e) { /* fallback */ }

        // [CARGO] Cellule Départ : date principale + dates supplémentaires sur une ligne
        const dateLine = (txt) => `<span class="cc3-gold cc3-date-line">${window.CCCommon.escapeHtml(txt)}</span>`;
        const departValueHtml = extraDateChips.length
            ? `<span class="cc3-value cc3-value-dates">${dateLine(shortDate)}${extraDateChips.map(dateLine).join("")}</span>`
            : `<span class="cc3-value"><span class="cc3-gold">${window.CCCommon.escapeHtml(shortDate)}</span></span>`;

        // codeFrom / codeDest / badgeDate : calculés pour rester aligné sur la carte
        // de la page des offres (conservés même si non affichés aujourd'hui).
        void codeFrom; void codeDest; void badgeDate; void colisAcceptes; void eh;

        return `
<div class="offer-wrap">
  <article class="cc3-card">
    <img class="cc3-planet cc3-dark" src="assets/card-image-version/planet-route-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-planet cc3-light" src="assets/card-image-version/planet-route-light-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-dark" src="assets/card-image-version/bottom-city-watermark.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-light" src="assets/card-image-version/bottom-city-watermark-light.png" alt="" aria-hidden="true">

    <section class="cc3-route">
      <div class="cc3-flag-shell"><span class="cc3-flag${flagCls(ccOrigin)}" aria-hidden="true"></span></div>
      <div class="cc3-place">
        <span class="cc3-label">From</span>
        <span class="cc3-country">${window.CCCommon.escapeHtml(originCountry)}</span>
        ${originCity ? `<span class="cc3-city">${window.CCCommon.escapeHtml(originCity)}</span>` : ""}
      </div>
      <svg class="cc3-flight" viewBox="0 0 184 60" aria-hidden="true">
        <path d="M2 47C50 11 105 8 181 45"></path>
        <g class="cc3-plane" transform="translate(86 2) rotate(9)">
          <path d="M25.5 22.2 3.2 30.8 0 26.6l16.2-12.7L0 1.2 3.2-3l22.3 8.7L38.6-6.8c3.2-3 7.2-3.3 8.6-1.5 1.5 1.9-.1 5.5-3.3 8.5L34.3 10.7l18.2 7.1-3.4 4.1-24.4-3.7-11.2 11.6-4-2.6 8.1-13.1z"></path>
        </g>
      </svg>
      <div class="cc3-place cc3-place-to">
        <span class="cc3-label">To</span>
        <span class="cc3-country">${window.CCCommon.escapeHtml(destCountry)}</span>
        ${destCity ? `<span class="cc3-city">${window.CCCommon.escapeHtml(destCity)}</span>` : ""}
      </div>
      <div class="cc3-flag-shell cc3-flag-shell-sn"><span class="cc3-flag${flagCls(ccDest)}" aria-hidden="true"></span></div>
    </section>

    <div class="cc3-rule"></div>

    <section class="cc3-details${extraDateChips.length ? " cc3-details--multi" : ""}">
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="9" width="28" height="25" rx="3"></rect><path d="M12 4v10M28 4v10M6 17h28"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label cc3-d-label--big">${extraDateChips.length ? "J'ai des voyages le :" : "Départ"}</span>
          ${departValueHtml}
        </div>
      </div>
      ${offerMode === "" ? `
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="13" width="24" height="22" rx="4"></rect><path d="M14 13v-3a6 6 0 0 1 12 0v3M20 19v9"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">Disponibilité</span>
          <span class="cc3-value">${availableKg} <span class="cc3-kg">kg</span></span>
        </div>
      </div>` : ""}
      <div class="cc3-detail cc3-detail-price">
        <div class="cc3-price-source" aria-hidden="true">
          <span class="cc3-d-label">Prix / kg</span>
          <span class="cc3-price">${window.CCCommon.escapeHtml(priceDisplay)}</span>
          <span class="cc3-inclusive">all inclusive</span>
        </div>
        <div class="water-lens" aria-label="Prix par kilogramme: ${window.CCCommon.escapeHtml(priceDisplay)} all inclusive">
          <div class="water-lens__content">
            <div class="cc3-detail-txt">
              <span class="cc3-d-label">Prix / kg</span>
              <span class="cc3-price">${window.CCCommon.escapeHtml(priceDisplay)}</span>
              <span class="cc3-inclusive">all inclusive</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${hasSpecialZone ? `
    <!-- ACCORDÉON : un bouton déplie tous les prix spéciaux PUIS les articles refusés -->
    <section class="cc3-special-grid">
      <button type="button" class="cc3-special-toggle cc3-special-toggle-gold" data-cc-expand="special" aria-expanded="false">
        <span class="cc3-toggle-label">${accordionLabel}</span>
        <svg class="cc3-toggle-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"></path></svg>
      </button>
      <div class="cc3-accordion-body">
        ${validSpecial.length ? `
        <div class="cc3-special-list">
          ${validSpecial.map(specialRow).join("")}
        </div>` : ""}
        ${refusesItems.length ? `
        <div class="cc3-refused-block">
          <div class="cc3-refused-head">
            <span class="cc3-section-icon cc3-section-icon-refused" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="20" cy="20" r="13.5"></circle>
                <path d="M11 11l18 18"></path>
              </svg>
            </span>
            <div class="cc3-refused-label">Articles refusés</div>
          </div>
          <div class="cc3-refused-list">
            ${refusesItems.map(refusedRow).join("")}
          </div>
        </div>` : ""}
      </div>
    </section>` : ""}

    ${cc3CardFooter({
        photo: ownerPhoto,
        name: ownerName,
        isVerified: isVerified,
        label: profileLabel,
        // Mon trajet (voyageur ou cargo) : « Modifier mon trajet » à la place de « Contacter »
        editAttr: isOwnOffer ? `${editAttrName}="${String(offer.id ?? "")}"` : "",
        editLabel: opts.editLabel || "Modifier mon trajet",
        editAriaLabel: opts.editAriaLabel || "Modifier mon trajet publie",
        // Corbeille : suppression de ma propre publication (avec confirmation)
        deleteAttr: isOwnOffer ? `${deleteAttrName}="${String(offer.id ?? "")}"` : "",
        deleteLabel: opts.deleteLabel || "Supprimer mon trajet",
        dataAttr: isOwnOffer ? "" : `data-reserve-offer="${String(offer.id ?? "")}"`,
        ariaLabel: `Contacter ${ownerName}`
    })}
  </article>
</div>`;
    }

    window.CCOfferCard = { html: html, footer: cc3CardFooter, getInitials: getInitials };
})();
