/* ColisConnect — couche 2 : detection IA des divulgations par messages successifs.
   Le moderateur classique (cote base) declenche sur deux schemas :
     - 2 messages de suite de l'utilisateur contiennent des chiffres -> le 3e est surveille ;
     - au moins 3 des 6 derniers messages de l'utilisateur contiennent des chiffres.
   Quand le message en cours de redaction contient lui aussi des chiffres, le modele
   lit les 10 derniers messages du fil et tranche. Aucun appel si le moderateur ne
   declenche pas : le chat reste fluide et gratuit.
   Ce fichier ne modifie rien tout seul : chat.js et standalone-common.js l'appellent
   s'il est present (window.CCFraudeIA). */
(function () {
  "use strict";

  var T_ATTENTE = "Veuillez patienter. Nous suspectons une tentative de fraude. Veuillez attendre la fin du processus de vérification.";
  var T_FRAUDE = "Nous suspectons effectivement une tentative de fraude. Vous essayez de divulguer vos contacts en dehors de notre plateforme. Si vous continuez, votre compte sera bloqué et vous serez banni.";

  var Pause = 700;       // on laisse une courte pause de frappe avant d'interroger le moderateur
  var MiniAppel = 8000;  // au plus une analyse IA toutes les 8 s par conversation
  var Validite = 180000; // un verdict "frais" reste valable 3 min

  var S = {
    fil: null,          // conversation courante
    promesse: null,     // analyse en cours
    fraude: false,      // fraude confirmee sur ce fil
    raison: "",
    filVerdict: null,
    quand: 0,
    minuteur: null,
    dernierAppel: 0,
    texteOk: "",
    quandOk: 0
  };

  function sb() {
    return window.ccSupabase || null;
  }

  async function jeton() {
    var c = sb();
    if (!c || !c.auth) return "";
    var r = await c.auth.getSession();
    return (r && r.data && r.data.session && r.data.session.access_token) || "";
  }

  // Reponse du moderateur classique : liste vide => aucune condition remplie.
  async function signal(fil, texte) {
    var c = sb();
    if (!c) return [];
    try {
      var g = await c.auth.getUser();
      var uid = g && g.data && g.data.user && g.data.user.id;
      if (!uid) return [];
      var r = await c.rpc("cc_ai_signal", { p_thread: fil, p_user: uid, p_draft: texte });
      if (r.error) return [];
      return Array.isArray(r.data) ? r.data : [];
    } catch (e) {
      return [];
    }
  }

  // Verdict du modele sur les 10 derniers messages. En cas de panne ou de quota,
  // on laisse passer (le message n'est jamais perdu) : l'incident est trace cote base.
  async function analyser(fil, texte) {
    var c = sb();
    var t = await jeton();
    var r = await fetch(c.supabaseUrl + "/functions/v1/fraud-check", {
      method: "POST",
      headers: { apikey: c.supabaseKey, Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: fil, brouillon: texte })
    });
    if (!r.ok) return { fraude: false, erreur: "reponse " + r.status };
    var j = await r.json().catch(function () { return {}; });
    return { fraude: j.fraude === true, raison: j.raison || "", confiance: typeof j.confiance === "number" ? j.confiance : 0, erreur: j.erreur || null };
  }

  function oublier(fil) {
    if (fil && S.filVerdict && fil !== S.filVerdict) return;
    S.fraude = false;
    S.raison = "";
    S.filVerdict = null;
    S.quand = 0;
    fenetreFraude(false);
    var b = document.querySelector("#message-form [type='submit']");
    if (b) b.disabled = false;
  }

  function changerFil(fil) {
    if (S.fil === fil) return;
    S.fil = fil;
    S.promesse = null;
    oublier();
    fenetreAttente(false);
  }

  function bloque() {
    return S.enCours === true || S.fraude === true;
  }

  function attenteVerdict() {
    return S.enCours === true;
  }

  // Chemin "frappe" : on analyse en silence pour gagner du temps, sans rien afficher.
  // On ne rouvre jamais la fenetre d'avertissement d'ici : c'est examiner() qui
  // decide, afin qu'un message corrige (sans chiffre) fasse disparaitre l'alerte.
  function surveiller(fil, texte) {
    if (S.minuteur) { clearTimeout(S.minuteur); S.minuteur = null; }
    changerFil(fil);
    if (!texte || !texte.replace(/\s/g, "")) {
      // Champ vide : plus rien de suspect dans ce brouillon.
      if (!S.enCours && S.fraude && S.filVerdict === fil) oublier(fil);
      return;
    }
    S.minuteur = setTimeout(function () {
      examiner(fil, texte, { fenetre: false }).catch(function () { });
    }, Pause);
  }

  // Une seule analyse en vol a la fois : deux declenchements ne paient qu'un appel.
  function lancer(fil, texte) {
    if (S.promesse) return S.promesse;
    S.dernierAppel = Date.now();
    S.enCours = true;
    S.promesse = analyser(fil, texte).then(function (v) {
      S.enCours = false;
      S.promesse = null;
      var p = { fraude: v.fraude === true, raison: v.raison || "", confiance: v.confiance, erreur: v.erreur || null };
      if (p.fraude) { S.fraude = true; S.raison = p.raison; S.filVerdict = fil; }
      else {
        // Verdict frais « pas de fraude » : on efface la memoire de fraude du fil.
        // Sans cela, un message corrige restait bloque indefiniment.
        S.fraude = false;
        S.raison = "";
        S.filVerdict = null;
        S.texteOk = texte;
        S.quandOk = Date.now();
        S.quand = Date.now();
      }
      return p;
    }).catch(function () {
      S.enCours = false;
      S.promesse = null;
      return { fraude: false, erreur: "reseau" };
    });
    return S.promesse;
  }

  // Analyse. fenetre=false pendant la frappe (l'utilisateur ne voit rien),
  // fenetre=true au moment d'un envoi (la fenetre d'attente apparait alors).
  async function examiner(fil, texte, opts) {
    var avecFenetre = !(opts && opts.fenetre === false);
    changerFil(fil);
    if (!fil || !texte || !texte.trim()) return { fraude: S.fraude, raison: S.raison };
    // 1) Le brouillon en cours est-il seulement concerne ? Sans aucun signe de contact,
    //    ni la memoire de fraude ni l'IA ne retiennent l'utilisateur : on rearme.
    var raisons = await signal(fil, texte);
    if (!raisons.length) {
      if (S.fraude && S.filVerdict === fil) oublier(fil);
      if (avecFenetre) fenetreAttente(false);
      return { fraude: false };
    }
    // 2) Le brouillon est surveille : on ne rejoue pas la memoire de fraude du fil,
    //    sinon un message corrige resterait bloque. Le modele tranche sur CE message.
    if (!avecFenetre && Date.now() - S.dernierAppel < MiniAppel) return { fraude: false };
    if (!avecFenetre && S.texteOk === texte && Date.now() - S.quandOk < Validite) return { fraude: false };
    if (avecFenetre) fenetreAttente(true);
    var v = await lancer(fil, texte);
    if (avecFenetre) fenetreAttente(false);
    if (v.fraude) fenetreFraude(true, v.raison);
    return v;
  }

  // Appele par le chemin d'envoi : ne rend la main qu'une fois le verdict connu.
  async function verifierEnvoi(fil, texte) {
    if (!sb()) return { fraude: false };
    changerFil(fil);
    // 1) Un message qui ne porte plus aucun signe de contact (l'utilisateur a supprime
    //    ses chiffres et reecrit normalement) leve l'avertissement pour ce brouillon.
    var r0 = await signal(fil, texte);
    if (!r0.length) {
      if (S.fraude && S.filVerdict === fil) oublier(fil);
      return { fraude: false };
    }
    // 2) Verdict deja connu et toujours valable pour ce texte exact : rien a refaire.
    if (S.texteOk === texte && Date.now() - S.quandOk < Validite) return { fraude: false };
    if (S.promesse) {
      fenetreAttente(true);
      var v0 = await S.promesse;
      fenetreAttente(false);
      if (v0 && v0.fraude) { fenetreFraude(true, v0.raison); return v0; }
      return v0 || { fraude: false };
    }
    // 3) Sinon, verdict FRAIS du modele sur CE message (et non la memoire du fil).
    return await examiner(fil, texte, { fenetre: true });
  }

  // ---- Fenetres ----
  var stylePose = false;
  function poserStyle() {
    if (stylePose) return;
    stylePose = true;
    var st = document.createElement("style");
    st.textContent = [
      ".cc-ia-scrim{position:fixed;inset:0;background:rgba(4,10,12,.72);display:none;align-items:center;justify-content:center;z-index:9999;padding:18px}",
      ".cc-ia-scrim.visible{display:flex}",
      ".cc-ia-boite{background:#0f1c1f;border:1px solid rgba(255,255,255,.12);border-radius:18px;max-width:430px;width:100%;padding:26px 22px;text-align:center;color:#eef6f4;box-shadow:0 24px 60px rgba(0,0,0,.55);font-family:inherit}",
      ".cc-ia-boite.fraude{border-color:rgba(239,68,68,.55);background:#1c1213}",
      ".cc-ia-icone{font-size:34px;line-height:1;margin-bottom:12px;min-height:34px}",
      ".cc-ia-titre{margin:0 0 10px;font-size:18px;font-weight:700}",
      ".cc-ia-texte{margin:0;font-size:14.5px;line-height:1.55;color:#cfe3df}",
      ".cc-ia-boite.fraude .cc-ia-texte{color:#fecaca}",
      ".cc-ia-rond{width:26px;height:26px;margin:4px auto 0;border:3px solid rgba(255,179,71,.25);border-top-color:#ffb347;border-radius:50%;animation:cc-ia-tourne .9s linear infinite}",
      "@keyframes cc-ia-tourne{to{transform:rotate(360deg)}}",
      ".cc-ia-fermer{margin-top:18px;background:transparent;border:1px solid rgba(255,255,255,.25);color:#eef6f4;border-radius:10px;padding:9px 16px;font-size:14px;cursor:pointer;display:none}",
      ".cc-ia-boite.fraude .cc-ia-fermer{display:inline-block}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function racine() {
    poserStyle();
    var el = document.getElementById("cc-ia-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "cc-ia-modal";
      el.className = "cc-ia-scrim";
      el.innerHTML = '<div class="cc-ia-boite" id="cc-ia-boite" role="alertdialog" aria-modal="true">' +
        '<div id="cc-ia-icone" class="cc-ia-icone"></div>' +
        '<h3 class="cc-ia-titre" id="cc-ia-titre"></h3>' +
        '<p class="cc-ia-texte" id="cc-ia-texte"></p>' +
        '<button type="button" class="cc-ia-fermer" id="cc-ia-fermer">J\'ai compris</button>' +
        '</div>';
      document.body.appendChild(el);
      document.getElementById("cc-ia-fermer").addEventListener("click", function () {
        el.classList.remove("visible");
        // L'utilisateur a lu l'avertissement : on reexamine le brouillon en cours.
        // S'il a corrige son message, l'avertissement tombe et il peut envoyer normalement.
        var champ = document.getElementById("message-input");
        var brouillon = champ ? String(champ.value || "") : "";
        if (S.fil && brouillon) examiner(S.fil, brouillon, { fenetre: false }).catch(function () { });
        else if (!brouillon && S.fraude) oublier(S.fil);
      });
    }
    return el;
  }

  function cacher(mode) {
    var el = document.getElementById("cc-ia-modal");
    if (el && (!mode || el.dataset.mode === mode)) { el.classList.remove("visible"); el.dataset.mode = ""; }
  }

  // Le bouton d'envoi reste ferme tant que l'analyse tourne ou qu'une fraude est confirmee.
  function majBouton() {
    var b = document.querySelector("#message-form [type='submit']");
    if (b && bloque()) b.disabled = true;
  }

  function fenetreAttente(vrai) {
    if (!vrai) { cacher("attente"); return; }
    var m = racine();
    m.dataset.mode = "attente";
    document.getElementById("cc-ia-boite").className = "cc-ia-boite";
    document.getElementById("cc-ia-icone").innerHTML = '<div class="cc-ia-rond"></div>';
    document.getElementById("cc-ia-titre").textContent = "Vérification en cours";
    document.getElementById("cc-ia-texte").textContent = T_ATTENTE;
    m.classList.add("visible");
    majBouton();
  }

  function fenetreFraude(vrai, raison) {
    if (!vrai) { cacher("fraude"); return; }
    var m = racine();
    m.dataset.mode = "fraude";
    document.getElementById("cc-ia-boite").className = "cc-ia-boite fraude";
    document.getElementById("cc-ia-icone").textContent = "🚫";
    document.getElementById("cc-ia-titre").textContent = "Tentative de fraude détectée";
    document.getElementById("cc-ia-texte").textContent = T_FRAUDE + (raison ? " (" + raison + ")" : "");
    m.classList.add("visible");
    majBouton();
  }

  // ---- Branchement sur le champ de saisie ----
  function brancherChamp() {
    var champ = document.getElementById("message-input");
    if (!champ || champ.dataset.ccIa === "1") return;
    champ.dataset.ccIa = "1";
    // La surveillance de la frappe est branchee par chat.js (il connait le fil actif).
    // Entree pendant une analyse : on previent et on n'envoie pas. En revanche, un
    // avertissement deja affiche ne doit pas condamner la suite de la conversation :
    // l'envoi repasse par verifierEnvoi(), qui tranche sur le message reel.
    champ.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" || !attenteVerdict()) return;
      ev.preventDefault();
      ev.stopPropagation();
      fenetreAttente(true);
    }, true);
  }

  window.CCFraudeIA = {
    surveiller: surveiller,
    examiner: examiner,
    verifierEnvoi: verifierEnvoi,
    changerFil: changerFil,
    oublier: oublier,
    bloque: bloque,
    attenteVerdict: attenteVerdict,
    fenetreAttente: fenetreAttente,
    fenetreFraude: fenetreFraude,
    brancherChamp: brancherChamp,
    etat: S,
    textes: { attente: T_ATTENTE, fraude: T_FRAUDE }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", brancherChamp);
  else brancherChamp();
})();
