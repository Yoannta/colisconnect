/* ============================================================
   results-card.js — carte unique de la place de marché
   Une seule coque (.cc-card) et trois variantes de contenu :
     - offre voyageur  (mode === "")
     - offre cargo     (mode !== "")
     - demande         (parcel_requests)

   Le module remplace le template inline de results.js (CA-39) :
   results.js ne construit plus aucune carte à la main.

   Usage :
     window.CCResultsCard.offer(offer, { currency, userId })
     window.CCResultsCard.demand(demand, { currency, userId })

   Les attributs d'action sont les mêmes que ceux écoutés par results.js :
     data-reserve-offer / data-contact-request
     data-edit-own-offer / data-edit-own-demand
     data-delete-own-offer / data-delete-own-demand
   ============================================================ */
(function () {
    "use strict";

    if (window.CCResultsCard) return;

    const cc = () => window.CCCommon || {};
    const escape = (value) => {
        const text = String(value === undefined || value === null ? "" : value);
        if (typeof cc().escapeHtml === "function") return cc().escapeHtml(text);
        return text.replace(/[&<>"']/g, (c) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
        ));
    };

    const cleanId = (value) => String(value === undefined || value === null ? "" : value)
        .replace(/[^A-Za-z0-9_-]/g, "");

    function initials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }

    function splitName(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        return { first: parts[0] || "", rest: parts.slice(1).join(" ") };
    }

    function validDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function shortDate(value) {
        const date = validDate(value);
        if (!date) return "";
        return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }

    function longDate(value) {
        const date = validDate(value);
        if (!date) return "";
        return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    }

    function dayBadge(value) {
        const date = validDate(value);
        if (!date) return "";
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === tomorrow.toDateString()) return "Demain";
        return "";
    }

    function countryCode(value) {
        const code = String(value || "").trim().toLowerCase();
        return /^[a-z]{2}$/.test(code) ? code : "";
    }

    function flagSlot(country, code) {
        const iso = countryCode(code);
        return `<span class="cc-flag${iso ? ` fi fis fi-${iso}` : ""}" data-flag-country="${escape(country)}" aria-hidden="true"></span>`;
    }

    function money(amount, fromCurrency, displayCurrency) {
        const common = cc();
        const value = Number(amount);
        if (!Number.isFinite(value)) return { text: "", missingRate: false };
        const from = String(fromCurrency || "EUR").toUpperCase();
        const to = String(displayCurrency || from).toUpperCase();
        const rates = common.EXCHANGE_RATES || {};
        if (from !== to && (!rates[from] || !rates[to])) {
            return {
                text: typeof common.formatAmount === "function"
                    ? common.formatAmount(value, from)
                    : `${value} ${from}`,
                missingRate: true
            };
        }
        const converted = typeof common.convertCurrency === "function"
            ? common.convertCurrency(value, from, to)
            : value;
        return {
            text: typeof common.formatAmount === "function"
                ? common.formatAmount(converted, to)
                : `${converted} ${to}`,
            missingRate: false
        };
    }

    function priceUnit(offer) {
        const unit = String(offer.price_unit || offer.priceUnit || "kg").toLowerCase();
        return unit === "cbm" ? "CBM" : "kg";
    }

    function routeHtml(offer, uid) {
        const origin = String(offer.origin || "").trim() || "Non précisé";
        const destination = String(offer.destination || "").trim() || "Non précisé";
        const originCity = String(offer.city_origin || offer.cityOrigin || "").trim();
        const destCity = String(offer.city_destination || offer.cityDestination || "").trim();
        const originCode = offer.originCountryCode || offer.origin_country_code || "";
        const destCode = offer.destCountryCode || offer.destination_country_code || "";
        return `
      <header class="cc-route">
        <div class="cc-route-side">
          ${flagSlot(origin, originCode)}
          <div class="cc-route-txt">
            <span class="cc-route-label">DE</span>
            <span class="cc-route-country" title="${escape(origin)}">${escape(origin)}</span>
            ${originCity ? `<span class="cc-route-city">${escape(originCity)}</span>` : ""}
          </div>
        </div>
        <svg class="cc-route-flight" viewBox="0 0 64 24" aria-hidden="true">
          <path d="M2 18C18 5 44 4 62 17"></path>
          <path class="cc-route-plane" d="M31 5.6l-7.4 2.9-1.1-1.4 5.4-4.2-5.4-1-1.1-1.4 7.4 2.9 4.3-3.4c1-.8 2.3-.9 2.7-.4.5.6 0 1.8-1 2.7L31 5.6l6.1 2.4-1.2 1.4-8.2-1.3-3.7 3.9-1.3-.9 2.7-4.4z"></path>
        </svg>
        <div class="cc-route-side cc-route-side--to">
          <div class="cc-route-txt">
            <span class="cc-route-label">VERS</span>
            <h2 class="cc-route-country cc-card-title" id="${escape(uid)}" title="${escape(destination)}"><span class="cc-sr-only">Trajet de ${escape(origin)} vers </span>${escape(destination)}</h2>
            ${destCity ? `<span class="cc-route-city">${escape(destCity)}</span>` : ""}
          </div>
          ${flagSlot(destination, destCode)}
        </div>
      </header>`;
    }

    function metaCell(label, valueHtml, extraClass) {
        return `<div class="cc-meta-cell${extraClass ? ` ${extraClass}` : ""}">
          <span class="cc-meta-label">${escape(label)}</span>
          ${valueHtml}
        </div>`;
    }

    function ownerFooter(opts) {
        const { name, photo, verified, role, ownerId, actions } = opts;
        const parts = splitName(name);
        const avatar = photo
            ? `<img class="cc-owner-avatar" src="${escape(photo)}" alt="">`
            : `<span class="cc-owner-avatar" aria-hidden="true">${escape(ownerId ? initials(name) : "?")}</span>`;
        const profile = `
          <div class="cc-owner-profile">
            ${avatar}
            <span class="cc-owner-text">
              <span class="cc-owner-name">${escape(parts.first)}${parts.rest ? ` <em>${escape(parts.rest)}</em>` : ""}</span>
              <span class="cc-owner-role">${escape(role)}</span>
            </span>
            ${verified ? `<svg class="cc-owner-shield" viewBox="0 0 36 40" role="img" aria-label="Profil vérifié"><path d="M18 2.5 32 8v10.3c0 8.5-5.7 15.2-14 18.9C9.7 33.5 4 26.8 4 18.3V8l14-5.5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"></path><path d="M15.6 22.4 12 18.8l-2 2 5.6 5.6L26.8 15.2l-2-2z" fill="currentColor"></path></svg>` : ""}
          </div>`;
        const profileHtml = ownerId
            ? `<a class="cc-owner" href="profil.html?id=${encodeURIComponent(String(ownerId))}" aria-label="Voir le profil de ${escape(name)}">${profile}</a>`
            : `<div class="cc-owner">${profile}</div>`;
        return `<footer class="cc-card-foot">${profileHtml}<div class="cc-card-actions">${actions}</div></footer>`;
    }

    function actionButtons(opts) {
        const { own, editAttr, editLabel, deleteAttr, contactAttr, contactLabel, contactDisabled } = opts;
        const edit = own && editAttr
            ? `<button type="button" class="cc-btn cc-btn-secondary cc-btn-edit" ${editAttr} aria-label="${escape(editLabel)}">
                 <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"></path><path d="M13.5 6.5l3 3"></path></svg>
                 <span>${escape(editLabel)}</span>
               </button>`
            : "";
        const remove = own && deleteAttr
            ? `<button type="button" class="cc-icon-btn cc-icon-danger" ${deleteAttr} title="${escape(opts.deleteLabel || "Supprimer")}" aria-label="${escape(opts.deleteLabel || "Supprimer")}">
                 <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M9.5 7V4.8h5V7"></path><path d="M6.2 7l1 12.2h9.6L17.8 7"></path><path d="M10 10.8v5.2M14 10.8v5.2"></path></svg>
               </button>`
            : "";
        let contact = "";
        if (!own) {
            contact = contactDisabled
                ? `<button type="button" class="cc-btn cc-btn-primary cc-btn-contact" disabled title="Propriétaire indisponible" aria-label="Contacter — propriétaire indisponible">Contacter</button>`
                : `<button type="button" class="cc-btn cc-btn-primary cc-btn-contact" ${contactAttr} aria-label="${escape(contactLabel)}">Contacter</button>`;
        }
        return `${edit}${remove}${contact}`;
    }

    function offerBody(offer, uid) {
        const specials = (() => {
            let raw = offer.special_prices || offer.specialPrices || [];
            try { raw = Array.isArray(raw) ? raw : JSON.parse(raw || "[]"); } catch (e) { raw = []; }
            return (Array.isArray(raw) ? raw : [])
                .filter((item) => item && item.type && Number(item.price) > 0);
        })();
        const refused = String(offer.refused_colis_types || offer.refusedColisTypes || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
                const match = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                return match ? { name: match[1].trim(), note: match[2].trim() } : { name: entry, note: "" };
            });
        // colis_types n'est plus collecté : jamais affiché (S-20 / TBD-8).
        if (!specials.length && !refused.length) return "";

        const baseCurrency = offer.baseCurrency || offer.base_currency || "EUR";
        const displayCurrency = offer.__displayCurrency || "EUR";
        const label = specials.length && refused.length
            ? "Prix spéciaux et articles refusés"
            : specials.length ? "Prix spéciaux" : "Articles refusés";
        const price = (amount) => money(amount, baseCurrency, displayCurrency).text;
        const specialRows = specials.map((item) => `
          <div class="cc-detail-row">
            <span class="cc-detail-name">${escape(item.type)}</span>
            <span class="cc-detail-price cc-mono">${escape(price(item.price))}</span>
            <span class="cc-detail-unit">${item.mode === "qty" ? "par colis" : "par kilo"}</span>
          </div>`).join("");
        const refusedRows = refused.map((item) => `
          <div class="cc-detail-row cc-detail-row--refused">
            <span class="cc-detail-name">${escape(item.name)}</span>
            ${item.note ? `<span class="cc-detail-note">${escape(item.note)}</span>` : ""}
          </div>`).join("");
        return `
      <div class="cc-card-body">
        <button type="button" class="cc-accordion-toggle" data-cc-expand aria-expanded="false" aria-controls="${escape(uid)}-details">
          <span>${escape(label)}</span>
          <svg class="cc-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"></path></svg>
        </button>
        <div class="cc-accordion-body" id="${escape(uid)}-details" hidden>
          ${specials.length ? `<div class="cc-detail-list">${specialRows}</div>` : ""}
          ${refused.length ? `<div class="cc-refused-block"><span class="cc-refused-title">Articles refusés</span><div class="cc-detail-list">${refusedRows}</div></div>` : ""}
        </div>
      </div>`;
    }

    function offerCard(offer, options) {
        const opts = options || {};
        const common = cc();
        const displayCurrency = opts.currency || common.state?.userCurrency || "EUR";
        const enriched = Object.assign({}, offer, { __displayCurrency: displayCurrency });
        const uid = `cc-card-${cleanId(offer.id || Math.random().toString(36).slice(2))}`;

        const mode = String(offer.mode || "").trim();
        const isCargo = mode !== "";
        const baseCurrency = offer.baseCurrency || offer.base_currency || "EUR";
        const priceRaw = offer.pricePerKg ?? offer.price_per_kg;
        const priceNumber = Number(priceRaw);
        const priceValue = priceRaw === null || priceRaw === undefined || priceRaw === "" || !Number.isFinite(priceNumber)
            ? null : priceNumber;
        const converted = priceValue === null ? null : money(priceValue, baseCurrency, displayCurrency);
        const unit = priceUnit(offer);
        const cargoCapacityRaw = offer.cargoCapacity ?? offer.cargo_capacity;
        const availableRaw = offer.availableKg ?? offer.available_kg ?? cargoCapacityRaw;
        const availableNumber = Number(availableRaw);
        const available = availableRaw === null || availableRaw === undefined || availableRaw === "" || !Number.isFinite(availableNumber)
            ? null : availableNumber;
        const capacityUnitRaw = String(offer.capacity_unit || offer.capacityUnit
            || (unit === "CBM" ? "CBM" : "kg")).toLowerCase();
        const capacityUnit = capacityUnitRaw === "cbm" ? "CBM" : "kg";
        const departure = offer.departureDate || offer.departure_date;
        const extraRaw = offer.extraDates || offer.extra_dates || [];
        let extras = [];
        try { extras = Array.isArray(extraRaw) ? extraRaw : JSON.parse(extraRaw || "[]"); } catch (e) { extras = []; }
        extras = [...new Set((Array.isArray(extras) ? extras : [])
            .map((value) => String(value || "").trim())
            .filter(Boolean))].sort();

        let dateHtml = "";
        const mainDate = shortDate(departure);
        if (mainDate) {
            const allDates = [...new Set([mainDate].concat(extras.map(shortDate).filter(Boolean)))];
            const dateSpan = (value) => `<span class="cc-date">${escape(value)}</span>`;
            let dateTextHtml;
            if (allDates.length === 1) {
                dateTextHtml = dateSpan(allDates[0]);
            } else if (allDates.length === 2) {
                dateTextHtml = `${dateSpan(allDates[0])}<span class="cc-date-sep"> et </span>${dateSpan(allDates[1])}`;
            } else {
                dateTextHtml = `${allDates.slice(0, -1).map(dateSpan).join('<span class="cc-date-sep"> · </span>')}<span class="cc-date-sep"> et </span>${dateSpan(allDates[allDates.length - 1])}`;
            }
            const badge = dayBadge(departure);
            dateHtml = metaCell("Départ",
                `<span class="cc-meta-value cc-mono cc-accent">${dateTextHtml}</span>${badge ? `<span class="cc-day-badge">${escape(badge)}</span>` : ""}`);
        }

        const capacityValue = available !== null && Number.isFinite(available)
            ? `<span class="cc-meta-value cc-mono">${escape(available)} <span class="cc-unit">${escape(capacityUnit)}</span></span>`
            : "";
        const capacityHtml = capacityValue
            ? metaCell(isCargo ? "Capacité" : "Disponibilité", capacityValue)
            : "";

        let priceHtml;
        if (converted) {
            priceHtml = metaCell(`Prix / ${unit}`,
                `<span class="cc-price cc-mono">${escape(converted.text)}</span>
                 <span class="cc-inclusive">all inclusive</span>
                 ${priceValue === 0 ? `<span class="cc-warn-badge">Prix à confirmer</span>` : ""}
                 ${converted.missingRate ? `<span class="cc-warn-badge">Taux indisponible</span>` : ""}`,
                "cc-meta-cell--price");
        } else {
            priceHtml = metaCell(`Prix / ${unit}`, `<span class="cc-meta-value cc-muted cc-price-missing">Prix non précisé</span>`, "cc-meta-cell--price");
        }

        const ownerName = String(offer.ownerName || offer.owner_name || "Voyageur");
        const ownerPhoto = String(offer.ownerProfilePhoto || offer.ownerAvatar || offer.avatar || "").trim();
        const ownerId = offer.user_id || offer.userId || "";
        const verified = Boolean(offer.ownerIsVerified || offer.owner_is_verified);
        const currentUserId = opts.userId || common.state?.user?.id;
        const own = !!currentUserId && String(ownerId).trim() !== "" && String(ownerId) === String(currentUserId);
        const actions = actionButtons({
            own,
            editAttr: `data-edit-own-offer="${escape(offer.id)}"`,
            editLabel: "Modifier mon trajet",
            deleteAttr: `data-delete-own-offer="${escape(offer.id)}"`,
            deleteLabel: "Supprimer mon trajet",
            contactAttr: `data-reserve-offer="${escape(offer.id)}"`,
            contactLabel: `Contacter ${ownerName}`,
            contactDisabled: !String(ownerId).trim()
        });

        return `
      <article class="cc-card cc-card--offer${own ? " cc-card--own" : ""}" aria-labelledby="${escape(uid)}">
        ${own ? '<span class="cc-own-badge">Votre offre</span>' : ""}
        ${routeHtml(offer, uid)}
        <div class="cc-rule"></div>
        <div class="cc-meta">
          ${dateHtml}
          ${capacityHtml}
          ${priceHtml}
        </div>
        ${offerBody(enriched, uid)}
        ${ownerFooter({
            name: ownerName,
            photo: ownerPhoto,
            verified,
            role: isCargo ? "Transporteur Pro" : "Voyageur",
            ownerId,
            actions
        })}
      </article>`;
    }

    function demandItems(demand) {
        let raw = demand.items;
        if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch (e) { raw = null; }
        }
        const items = Array.isArray(raw) && raw.length ? raw : null;
        if (items) return items;
        return [{
            item_type: demand.item_type,
            weight_kg: demand.weight_kg,
            quantity: demand.quantity,
            price_mode: demand.price_mode,
            max_price_per_kg: demand.max_price_per_kg,
            max_price_total: demand.max_price_total,
            currency: demand.currency
        }];
    }

    function demandItemCount(demand) {
        let raw = demand.items;
        if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch (e) { raw = null; }
        }
        if (Array.isArray(raw) && raw.length) return raw.length;
        const quantity = Number(demand.quantity);
        return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    }

    // ── Carte DEMANDE : meme habillage que la carte OFFRE (photo de fond, drapeaux,
    //    deux blocs de details, panneau central). Le panneau du prix est conserve mais
    //    accueille les elements du colis.
    function demandLigneCle(cle, valeur) {
        if (valeur === null || valeur === undefined || String(valeur).trim() === "") return "";
        return `<div class="cc3-demand-line"><span class="cc3-demand-key">${escape(cle)} :</span><span class="cc3-demand-val">${escape(valeur)}</span></div>`;
    }

    function demandBlocColis(item, demand, displayCurrency, titre) {
        const nom = item.item_type ? String(item.item_type).trim() : "";
        const poidsNum = Number(item.weight_kg);
        const poids = (item.weight_kg !== null && item.weight_kg !== undefined
            && String(item.weight_kg).trim() !== "" && Number.isFinite(poidsNum) && poidsNum >= 1)
            ? `${item.weight_kg} kg` : "";
        const quantite = (item.quantity !== null && item.quantity !== undefined && String(item.quantity).trim() !== "")
            ? String(item.quantity) : "";
        let budget = "";
        const rawPrice = item.max_price_total ?? item.max_price_per_kg;
        if (rawPrice !== null && rawPrice !== undefined && String(rawPrice).trim() !== "") {
            const from = String(item.currency || demand.currency || "XOF").toUpperCase();
            const converted = money(Number(rawPrice), from, displayCurrency);
            budget = converted.text;
        }
        const lignes = [
            demandLigneCle("Colis à envoyer", nom),
            demandLigneCle("Nombre d'articles", quantite),
            demandLigneCle("Poids total", poids),
            demandLigneCle("Budget proposé", budget)
        ].join("");
        if (!lignes.trim()) return "";
        return `<div class="cc3-demand-bloc">${titre ? `<span class="cc3-demand-bloc-titre">${escape(titre)}</span>` : ""}${lignes}</div>`;
    }

    function demandCard(demand, options) {
        const opts = options || {};
        const common = cc();
        const displayCurrency = opts.currency || common.state?.userCurrency || "EUR";
        const uid = `cc-card-demand-${cleanId(demand.id || Math.random().toString(36).slice(2))}`;
        const origin = String(demand.origin || "").trim() || "Non précisé";
        const destination = String(demand.destination || "").trim() || "Non précisé";
        const originCity = String(demand.origin_city || demand.cityOrigin || "").trim();
        const destCity = String(demand.destination_city || demand.cityDestination || "").trim();
        const originCode = demand.originCountryCode || demand.origin_country_code || "";
        const destCode = demand.destCountryCode || demand.destination_country_code || "";
        const flagCls = (c) => (c ? ` fi fis fi-${String(c).toLowerCase()}` : "");

        const items = demandItems(demand);
        const nbColis = items.length;
        const rawDate = demand.needed_by_date || demand.neededByDate;
        const dateLimite = longDate(rawDate) || "Non précisée";

        const principal = demandBlocColis(items[0] || {}, demand, displayCurrency, "");
        const autres = items.slice(1)
            .map((item, i) => demandBlocColis(item, demand, displayCurrency, `Colis ${i + 2}`))
            .filter(Boolean);

        const ownerName = String(demand.owner?.full_name || demand.ownerName || "Demandeur");
        const ownerPhoto = String(demand.owner?.profile_photo || demand.ownerProfilePhoto || "").trim();
        const ownerId = demand.user_id || demand.userId || "";
        const currentUserId = opts.userId || common.state?.user?.id;
        const own = !!currentUserId && String(ownerId).trim() !== "" && String(ownerId) === String(currentUserId);
        const verified = Boolean(demand.owner?.is_verified || demand.ownerIsVerified);

        const footer = window.CCOfferCard && window.CCOfferCard.footer
            ? window.CCOfferCard.footer({
                photo: ownerPhoto,
                ownerId,
                name: ownerName,
                isVerified: verified,
                label: "Expéditeur",
                editAttr: own ? `data-edit-own-demand="${escape(demand.id)}"` : "",
                editLabel: "Modifier ma demande",
                editAriaLabel: "Modifier ma demande",
                deleteAttr: own ? `data-delete-own-demand="${escape(demand.id)}"` : "",
                deleteLabel: "Supprimer ma demande",
                dataAttr: own ? "" : `data-contact-request="${escape(demand.id)}"`,
                ariaLabel: `Contacter ${ownerName}`,
                inactiveLabel: "Contact indisponible"
            })
            : "";

        return `
<div class="offer-wrap">
  <article class="cc3-card cc3-card--demand${own ? " cc3-card--own" : ""}" aria-labelledby="${escape(uid)}">
    <img class="cc3-planet cc3-dark" src="assets/card-image-version/planet-route-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-planet cc3-light" src="assets/card-image-version/planet-route-light-cutout.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-dark" src="assets/card-image-version/bottom-city-watermark.png" alt="" aria-hidden="true">
    <img class="cc3-skyline cc3-light" src="assets/card-image-version/bottom-city-watermark-light.png" alt="" aria-hidden="true">

    ${own ? '<span class="cc-own-badge">Votre demande</span>' : ""}

    <section class="cc3-route">
      <div class="cc3-flag-shell"><span class="cc3-flag${flagCls(originCode)}" aria-hidden="true"></span></div>
      <div class="cc3-place">
        <span class="cc3-label">From</span>
        <span class="cc3-country" id="${escape(uid)}">${escape(origin)}</span>
        ${originCity ? `<span class="cc3-city">${escape(originCity)}</span>` : ""}
      </div>
      <svg class="cc3-flight" viewBox="0 0 184 60" aria-hidden="true">
        <path d="M2 47C50 11 105 8 181 45"></path>
        <g class="cc3-plane" transform="translate(86 2) rotate(9)">
          <path d="M25.5 22.2 3.2 30.8 0 26.6l16.2-12.7L0 1.2 3.2-3l22.3 8.7L38.6-6.8c3.2-3 7.2-3.3 8.6-1.5 1.5 1.9-.1 5.5-3.3 8.5L34.3 10.7l18.2 7.1-3.4 4.1-24.4-3.7-11.2 11.6-4-2.6 8.1-13.1z"></path>
        </g>
      </svg>
      <div class="cc3-place cc3-place-to">
        <span class="cc3-label">To</span>
        <span class="cc3-country">${escape(destination)}</span>
        ${destCity ? `<span class="cc3-city">${escape(destCity)}</span>` : ""}
      </div>
      <div class="cc3-flag-shell cc3-flag-shell-sn"><span class="cc3-flag${flagCls(destCode)}" aria-hidden="true"></span></div>
    </section>

    <div class="cc3-rule"></div>

    <section class="cc3-details">
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="9" width="28" height="25" rx="3"></rect><path d="M12 4v10M28 4v10M6 17h28"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">Date limite</span>
          <span class="cc3-value cc3-value--gold">${escape(dateLimite)}</span>
        </div>
      </div>
      <div class="cc3-detail">
        <div class="cc3-icon">
          <svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5l13 7v16l-13 7-13-7V12z"></path><path d="M20 5l13 7-13 7-13-7"></path><path d="M20 19v16"></path><path d="M7 12l13 7 13-7"></path></svg>
        </div>
        <div class="cc3-detail-txt">
          <span class="cc3-d-label">Nombre de colis</span>
          <span class="cc3-value">${escape(nbColis)} <span class="cc3-kg">colis</span></span>
        </div>
      </div>
      <div class="cc3-detail cc3-detail-price cc3-detail-price--demand">
        <div class="water-lens" aria-label="Détails du colis">
          <div class="water-lens__content">${principal}</div>
        </div>
      </div>
    </section>

    ${autres.length ? `
    <section class="cc3-special-grid">
      <button type="button" class="cc3-special-toggle cc3-special-toggle-gold" data-demand-expand="1" aria-expanded="false">
        <span class="cc3-toggle-label">Voir tous</span>
        <svg class="cc3-toggle-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"></path></svg>
      </button>
      <div class="cc3-accordion-body">
        ${autres.join("")}
      </div>
    </section>` : ""}

    ${footer}
  </article>
</div>`;
    }

    window.CCResultsCard = {
        offer: offerCard,
        demand: demandCard,
        money,
        initials
    };
})();
