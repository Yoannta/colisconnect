/* ============================================================
   profil-voyageur.js — page profil d'un voyageur
   Affiche : identité + statut de vérification, note moyenne,
   toutes les notes reçues, puis SON voyage disponible (la carte
   du site, à l'identique) et un bouton pour le contacter.
   ============================================================ */
(function () {
  "use strict";

  const conteneur = document.getElementById("profil-contenu");
  const echap = (v) => String(v === undefined || v === null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function initiales(nom) {
    const mots = String(nom || "").trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return "CC";
    if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
    return (mots[0][0] + mots[1][0]).toUpperCase();
  }

  function etoiles(note) {
    const pleines = Math.round(Number(note) || 0);
    let html = "";
    for (let i = 1; i <= 5; i++) {
      html += i <= pleines ? "★" : '<span class="vide">★</span>';
    }
    return html;
  }

  function dateLisible(valeur) {
    if (!valeur) return "";
    const d = new Date(valeur);
    if (isNaN(d.getTime())) return echap(valeur);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function messageErreur(texte) {
    conteneur.innerHTML = '<div class="profil-vide">' + echap(texte) + "</div>";
  }

  function badgeVerifie(profil) {
    const statut = String(profil.kyc_status || "").toLowerCase();
    const verifie = profil.is_verified === true || statut === "approved" || statut === "verifie";
    if (verifie) {
      return '<span class="profil-badge verifie">' +
        '<svg viewBox="0 0 36 40" aria-hidden="true"><path d="M18 2.5 32 8v10.3c0 8.5-5.7 15.2-14 18.9C9.7 33.5 4 26.8 4 18.3V8l14-5.5z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"></path><path d="M15.6 22.4 12 18.8l-2 2 5.6 5.6L26.8 15.2l-2-2z" fill="currentColor"></path></svg>' +
        "Vérifié</span>";
    }
    return '<span class="profil-badge non-verifie">Pas encore vérifié</span>';
  }

  const DEMO = {
    profil: { id: "demo", full_name: "Yoann Tato", profile_photo: "", is_verified: true,
              kyc_status: "approved", country: "Côte d'Ivoire", profile_type: "voyageur" },
    voyage: { id: 999999, user_id: "demo", origin: "Chine", destination: "Côte d'Ivoire",
              city_origin: "Guangzhou", city_destination: "Abidjan", departure_date: "2026-10-25",
              available_kg: 25, price_per_kg: 12, base_currency: "EUR", status: "active",
              rating: 4.6, reviews: 12 },
    avis: [
      { id: 1, rating: 5, comment: "Colis arrivé intact, très bonne communication.", created_at: "2026-09-28", reviewer_name: "Awa K." },
      { id: 2, rating: 4, comment: "Un jour de retard mais prévenu à temps.", created_at: "2026-08-14", reviewer_name: "Serge A." }
    ]
  };

  async function charger() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const demo = params.get("demo") === "1";
    if (!id && !demo) { messageErreur("Aucun profil demandé. Revenez à la liste des trajets."); return; }

    const sb = window.ccSupabase;
    if (!sb) { messageErreur("Connexion indisponible. Rechargez la page."); return; }

    // La lecture des profils est réservée aux membres connectés (règle du site).
    if (!demo) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
          conteneur.innerHTML = '<div class="profil-vide">Connectez-vous pour voir ce profil voyageur.' +
            '<br><br><a class="profil-retour" href="auth.html">Se connecter</a></div>';
          return;
        }
      } catch (e) { /* on continue : la lecture tranchera */ }
    }

    let profil = null;
    if (demo) {
      profil = DEMO.profil;
    } else
    try {
      const { data, error } = await sb.from("profiles")
        .select("id, full_name, profile_photo, is_verified, kyc_status, country, profile_type, role, created_at")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      profil = data;
    } catch (e) {
      messageErreur("Profil introuvable.");
      return;
    }
    if (!profil) { messageErreur("Ce profil n'existe pas ou n'est plus disponible."); return; }

    // --- ses trajets : on garde celui à venir le plus proche = « voyage disponible » ---
    let offres = [];
    if (demo) {
      offres = [DEMO.voyage];
    } else
    try {
      const { data } = await sb.from("offers")
        .select("id, user_id, origin, destination, city_origin, city_destination, departure_date, " +
                "available_kg, price_per_kg, base_currency, rating, reviews, status, description")
        .eq("user_id", id).order("departure_date", { ascending: true });
      offres = (data || []).filter((o) => !["deleted", "cancelled", "annule", "supprime"].includes(
        String(o.status || "").toLowerCase()));
    } catch (e) { offres = []; }

    const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
    const aVenir = offres.filter((o) => {
      const d = o.departure_date ? new Date(o.departure_date) : null;
      return d && d >= aujourdhui;
    });
    const voyage = aVenir[0] || offres[0] || null;

    // --- note moyenne : moyenne pondérée des notes de ses trajets ---
    let sommeNotes = 0, totalAvis = 0;
    offres.forEach((o) => {
      const n = Number(o.rating) || 0;
      const c = Number(o.reviews) || 0;
      if (n > 0 && c > 0) { sommeNotes += n * c; totalAvis += c; }
    });
    const moyenne = totalAvis > 0 ? (sommeNotes / totalAvis) : 0;

    // --- les notes reçues (table dédiée si elle existe) ---
    let avis = [];
    if (demo) {
      avis = DEMO.avis;
    } else
    try {
      const { data } = await sb.from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, reviewer_name")
        .eq("target_user_id", id).order("created_at", { ascending: false }).limit(50);
      avis = data || [];
    } catch (e) { avis = []; }

    // --- en-tête ---
    const nom = profil.full_name || "Voyageur";
    const photo = profil.profile_photo ? echap(profil.profile_photo) : "";
    const avatar = photo
      ? '<img class="profil-avatar" src="' + photo + '" alt="">'
      : '<div class="profil-avatar">' + echap(initiales(nom)) + "</div>";
    const type = String(profil.profile_type || profil.role || "voyageur").toLowerCase();

    let html = '<section class="profil-entete">' + avatar +
      '<div class="profil-identite">' +
      '<h1 class="profil-nom">' + echap(nom) + "</h1>" +
      '<div class="profil-type">' + (type === "cargo" ? "Cargo" : "Voyageur") +
      (profil.country ? " · " + echap(profil.country) : "") + "</div>" +
      badgeVerifie(profil) +
      "</div></section>";

    // --- note moyenne ---
    if (totalAvis > 0) {
      html += '<section class="profil-note">' +
        '<div class="profil-note-chiffre">' + moyenne.toFixed(1) + "</div>" +
        '<div class="profil-note-sur">/ 5</div>' +
        '<div class="profil-etoiles" aria-hidden="true">' + etoiles(moyenne) + "</div>" +
        '<div class="profil-note-detail">' + totalAvis + " avis</div>" +
        "</section>";
    } else {
      html += '<section class="profil-note">' +
        '<div class="profil-note-detail">Pas encore noté — aucun avis pour le moment.</div>' +
        "</section>";
    }

    // --- toutes les notes ---
    html += '<section class="profil-section"><h2>Toutes les notes</h2>';
    if (avis.length) {
      html += '<div class="profil-avis">' + avis.map((a) =>
        '<article class="profil-avis-item">' +
        '<div class="profil-avis-tete">' +
        '<span class="profil-avis-auteur">' + echap(a.reviewer_name || "Client") + "</span>" +
        '<span class="profil-avis-date">' + dateLisible(a.created_at) + "</span>" +
        "</div>" +
        '<div class="profil-avis-etoiles">' + etoiles(a.rating) + "</div>" +
        (a.comment ? '<p class="profil-avis-texte">' + echap(a.comment) + "</p>" : "") +
        "</article>").join("") + "</div>";
    } else {
      html += '<div class="profil-vide">Aucun avis détaillé pour le moment.</div>';
    }
    html += "</section>";

    // --- voyage disponible : la carte du site, à l'identique ---
    html += '<section class="profil-section"><h2>Voyage disponible</h2>';
    if (voyage) {
      const offreCarte = Object.assign({}, voyage, {
        ownerName: nom,
        ownerProfilePhoto: profil.profile_photo || "",
        ownerIsVerified: profil.is_verified === true,
        user_id: id
      });
      const rendu = window.CCOfferCard && window.CCOfferCard.html
        ? window.CCOfferCard.html(offreCarte, {
            currentUserId: (window.CCCommon && window.CCCommon.state && window.CCCommon.state.user && window.CCCommon.state.user.id) || null,
            ownerNameFallback: nom,
            ownerPhotoFallback: profil.profile_photo || "",
            ownerVerifiedFallback: profil.is_verified === true,
            dataAttr: 'data-contacter-offre="' + echap(voyage.id) + '"',
            ariaLabel: "Contacter ce voyageur"
          })
        : '<div class="profil-vide">La carte n\'a pas pu être affichée.</div>';
      html += '<div class="cards-list">' + rendu + "</div>";
    } else {
      html += '<div class="profil-vide">Ce voyageur n\'a pas de voyage disponible pour le moment.</div>';
    }
    html += "</section>";

    // --- bouton du bas : contacter le voyageur ---
    const idOffre = voyage ? echap(voyage.id) : "";
    html += '<button class="profil-contacter-bas" id="profil-contacter"' +
      (voyage ? ' data-offre="' + idOffre + '"' : " disabled") + ">" +
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M23.7 8C14 8 6.1 14.5 6.1 22.5c0 4.7 2.8 8.9 7.1 11.5l-1.1 6.1 7-3.7c1.5.4 3 .6 4.6.6 9.7 0 17.6-6.5 17.6-14.5S33.4 8 23.7 8z"></path></svg>' +
      (voyage ? "Contacter le voyageur" : "Aucun voyage disponible") + "</button>";

    conteneur.innerHTML = html;

    // --- contacts : la carte et le bouton du bas ouvrent la même discussion ---
    function ouvrirDiscussion(idOffreChoisi) {
      if (!idOffreChoisi) return;
      window.location.href = "chat.html?offerId=" + encodeURIComponent(String(idOffreChoisi));
    }
    conteneur.addEventListener("click", function (ev) {
      const boutonCarte = ev.target.closest("[data-contacter-offre]");
      if (boutonCarte) {
        ev.preventDefault();
        ouvrirDiscussion(boutonCarte.getAttribute("data-contacter-offre"));
        return;
      }
      const boutonBas = ev.target.closest("#profil-contacter");
      if (boutonBas && boutonBas.getAttribute("data-offre")) {
        ouvrirDiscussion(boutonBas.getAttribute("data-offre"));
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", charger);
  } else {
    charger();
  }
})();
