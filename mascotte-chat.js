/* ============================================================================
   MASCOTTE-CHAT — l'assistant de ColisConnect
   ----------------------------------------------------------------------------
   Ce fichier ouvre un petit panneau de chat au clic sur la mascotte, envoie la
   demande du visiteur a l'Edge Function Supabase « chat » (DeepSeek), puis,
   quand la reponse est un parcours autorise, ferme le chat et lance le guide
   TOUT SEUL (CCGuideSession.demarrer). Aucun framework, aucune cle dans le
   site, aucune dependance : ES5 + Promise/fetch, comme le reste du site.

   FLUX (ce que veut Yoyo) :
       clic sur la mascotte -> panneau de chat
       le visiteur ecrit en francais -> envoi a l'Edge Function
       reponse JSON strict (verifiee par CCGuideIntents.valider) :
         { "type":"chat", "message":"..." }                  -> on affiche
         { "type":"guide", "intent":"publish_trip" }          -> on ferme + guide
         { "type":"guide_confirmation", "intent":"...", "message":"..." }
                                                              -> message + [Me montrer]
       si l'IA est indisponible -> comprehension locale (CCGuideIntents.resoudre)
       sinon -> message de secours, le chat reste utilisable.

   SECURITE :
     - on n'appelle JAMAIS DeepSeek directement : uniquement l'Edge Function.
     - la reponse est TOUJOURS verifiee par CCGuideIntents.valider() avant
       d'agir : la securite ne repose jamais sur ce que dit l'IA.
     - le MODE SANS RESEAU fait marcher le guide meme sans IA.

   A charger APRES mascotte.js, guide-controller.js, guide-session.js et
   guide-intents.js. Ce fichier remonte la mascotte avec l'option onChat pour
   brancher le clic sur ce panneau (le re-montage remplace proprement celui de
   mascotte-site.js, sans rien casser).
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '1.0.0';

  /* --------------------------------------------------------------- reglages -- */
  /* La fonction dediee a la mascotte s'appelle « chat » (creee en parallele :
     voir supabase/functions/chat/index.ts). Elle valide et re-serialise le JSON
     cote serveur, et n'accepte que { prompt }. On lui envoie aussi systemPrompt
     et model : ignores par « chat » (qui verrouille SON prompt systeme), mais
     utiles si on repointe vers l'ancienne « ai-assistant ». */
  var NOM_FONCTION = 'chat';
  var MODELE = 'deepseek';
  var ATTENTE_MIN_MS = 450;          /* laisse au moins voir « en train d'ecrire » */
  var TAILLE_MAX_MESSAGE = 600;      /* borne de securite (doublon de valider()) */

  /* -------------------------------------------------------------------- etat -- */
  var ouvert = false;
  var attente = false;               /* un appel en cours : on ne renvoie pas en double */
  var bienvenueFaite = false;
  var racine = null;                 /* le panneau */
  var zoneMessages = null;
  var champ = null;
  var boutonEnvoyer = null;
  var indicateur = null;

  /* ------------------------------------------------------------ system prompt -- */
  /* Reponse TOUJOURS en JSON strict, en francais. Trois types possibles, une
     liste blanche d'intentions, et RIEN d'autre.
     NOTE : la fonction « chat » (supabase/functions/chat/index.ts) verrouille
     SON PROPRE prompt systeme cote serveur et n'utilise PAS celui-ci. On le
     garde ici comme reference du contrat et filet de secours (si on repointe
     vers « ai-assistant », ce prompt part avec la requete). */
  var PROMPT_SYSTEME = [
    'Tu es l\'assistant du site ColisConnect, une plateforme qui met en relation',
    'des expéditeurs et des voyageurs pour transporter des colis.',
    '',
    'Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour,',
    'sans markdown, sans balise de code, sans commentaire.',
    '',
    'Le JSON doit avoir exactement l\'un de ces trois formats :',
    '  {"type":"chat","message":"..."}',
    '  {"type":"guide","intent":"..."}',
    '  {"type":"guide_confirmation","intent":"...","message":"..."}',
    '',
    'Règles :',
    '- "chat" : pour une question générale ou une réponse simple. "message" est',
    '  une réponse courte, amicale, en français (une ou deux phrases).',
    '- "guide" : quand la demande correspond à une action guidée de la liste',
    '  ci-dessous et que tu es sûr de l\'intention. Le guide se lance tout seul.',
    '- "guide_confirmation" : quand tu hésites entre deux actions. "message" est',
    '  alors une phrase affirmative courte (ex. "Je peux te montrer.").',
    '',
    'Les intentions autorisées sont UNIQUEMENT (et rien d\'autre) :',
    '  - "find_country"   : choisir / trouver / changer un pays (départ ou arrivée).',
    '  - "find_offer"     : chercher un voyageur ou une offre pour envoyer un colis.',
    '  - "publish_trip"   : publier un trajet / une offre de voyage.',
    '  - "set_phone"      : gérer / vérifier / changer son numéro de téléphone.',
    '  - "my_profile"     : aller à son profil / compte / tableau de bord / ses offres.',
    '',
    'Tu n\'utilises JAMAIS une intention qui ne figure pas dans cette liste.',
    'Tu ne produis JAMAIS de code, de HTML, de CSS, de sélecteur, de coordonnées,',
    'de lien ni de commande. Tu réponds toujours en français.',
    '',
    'Exemples :',
    '  Demande : "montre-moi comment faire une offre"',
    '  Réponse : {"type":"guide","intent":"publish_trip"}',
    '  Demande : "où je peux changer mon numéro ?"',
    '  Réponse : {"type":"guide","intent":"set_phone"}',
    '  Demande : "bonjour"',
    '  Réponse : {"type":"chat","message":"Bonjour ! Je peux te guider pour publier une offre, chercher un voyageur ou gérer ton profil."}'
  ].join('\n');

  /* ==================================================================== CSS === */
  function injecterCss() {
    if (document.getElementById('ccmc-style')) return;
    var s = document.createElement('style');
    s.id = 'ccmc-style';
    s.textContent = [
      '.ccmc-panneau{position:fixed;z-index:9800;right:16px;bottom:100px;width:min(370px,calc(100vw - 24px));',
      '  max-height:min(560px,calc(100vh - 130px));display:flex;flex-direction:column;',
      '  background:#0f172a;border:1px solid rgba(241,181,43,.4);border-radius:16px;',
      '  box-shadow:0 18px 48px rgba(0,0,0,.6),0 0 0 1px rgba(241,181,43,.08);overflow:hidden;',
      '  opacity:0;transform:translateY(14px) scale(.98);pointer-events:none;',
      '  transition:opacity .22s ease,transform .22s ease;',
      '  font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e8e8e8}',
      '.ccmc-panneau.ccmc-ouvert{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
      '.ccmc-tete{display:flex;align-items:center;gap:10px;padding:12px 14px;',
      '  background:linear-gradient(180deg,rgba(241,181,43,.14),rgba(241,181,43,.03));',
      '  border-bottom:1px solid rgba(241,181,43,.22)}',
      '.ccmc-titre{flex:1;color:#f1b52b;font-weight:800;font-size:.95rem;letter-spacing:.2px;line-height:1.2}',
      '.ccmc-sous{color:#c9a24a;font-weight:500;font-size:.72rem;margin-top:1px}',
      '.ccmc-fermer{flex:none;width:30px;height:30px;border:1px solid rgba(241,181,43,.35);border-radius:999px;',
      '  background:rgba(241,181,43,.08);color:#f1b52b;font-size:1.05rem;line-height:1;cursor:pointer}',
      '.ccmc-fermer:hover{background:rgba(241,181,43,.2)}',
      '.ccmc-corps{flex:1;overflow-y:auto;padding:12px 12px 6px;display:flex;flex-direction:column;gap:8px;min-height:0}',
      '.ccmc-msg{max-width:84%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-break:break-word;font-size:.86rem}',
      '.ccmc-msg-moi{align-self:flex-end;background:rgba(241,181,43,.16);border:1px solid rgba(241,181,43,.35);color:#ffe9bd}',
      '.ccmc-msg-assistant{align-self:flex-start;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e8e8e8}',
      '.ccmc-bouton-guide{align-self:flex-start;margin-top:2px;background:#f1b52b;color:#1a1304;border:0;border-radius:999px;',
      '  padding:9px 16px;font:700 .82rem/1 inherit;cursor:pointer;box-shadow:0 6px 16px rgba(241,181,43,.3)}',
      '.ccmc-bouton-guide:hover{filter:brightness(1.06)}',
      '.ccmc-ecriture{align-self:flex-start;display:flex;gap:4px;padding:10px 14px;background:rgba(255,255,255,.05);',
      '  border:1px solid rgba(255,255,255,.1);border-radius:14px}',
      '.ccmc-ecriture i{width:6px;height:6px;border-radius:50%;background:#f1b52b;opacity:.4;animation:ccmcBond .9s infinite}',
      '.ccmc-ecriture i:nth-child(2){animation-delay:.15s}',
      '.ccmc-ecriture i:nth-child(3){animation-delay:.3s}',
      '@keyframes ccmcBond{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}',
      '.ccmc-pied{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(241,181,43,.22);background:rgba(0,0,0,.18)}',
      '.ccmc-champ{flex:1;background:#0a1322;border:1px solid rgba(241,181,43,.28);border-radius:999px;color:#eef2f7;',
      '  padding:10px 14px;font:14px/1.2 inherit;outline:none;min-width:0}',
      '.ccmc-champ:focus{border-color:#f1b52b;box-shadow:0 0 0 3px rgba(241,181,43,.15)}',
      '.ccmc-champ::placeholder{color:#6b7a90}',
      '.ccmc-envoyer{flex:none;background:#f1b52b;color:#1a1304;border:0;border-radius:999px;padding:10px 18px;',
      '  font:700 .84rem/1 inherit;cursor:pointer}',
      '.ccmc-envoyer:hover{filter:brightness(1.06)}',
      '.ccmc-envoyer:disabled{opacity:.5;cursor:default}',
      '@media (max-width:620px){',
      '  .ccmc-panneau{left:10px;right:10px;width:auto;bottom:76px;max-height:calc(100vh - 96px)}',
      '  .ccmc-tete{padding:11px 12px}',
      '  .ccmc-msg{max-width:90%}',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ============================================================ construction === */
  function construire() {
    racine = document.createElement('div');
    racine.className = 'ccmc-panneau';
    racine.setAttribute('role', 'dialog');
    racine.setAttribute('aria-label', 'Assistant ColisConnect');

    var tete = document.createElement('div');
    tete.className = 'ccmc-tete';

    var titreBox = document.createElement('div');
    titreBox.className = 'ccmc-titre';
    titreBox.textContent = 'Le Petit Voyageur';
    var sous = document.createElement('div');
    sous.className = 'ccmc-sous';
    sous.textContent = 'Je peux te guider pas à pas.';
    titreBox.appendChild(sous);

    var fermerBtn = document.createElement('button');
    fermerBtn.type = 'button';
    fermerBtn.className = 'ccmc-fermer';
    fermerBtn.setAttribute('aria-label', 'Fermer le chat');
    fermerBtn.innerHTML = '&times;';
    fermerBtn.addEventListener('click', fermer);

    tete.appendChild(titreBox);
    tete.appendChild(fermerBtn);

    zoneMessages = document.createElement('div');
    zoneMessages.className = 'ccmc-corps';

    indicateur = document.createElement('div');
    indicateur.className = 'ccmc-ecriture';
    indicateur.style.display = 'none';
    indicateur.innerHTML = '<i></i><i></i><i></i>';

    zoneMessages.appendChild(indicateur);

    var pied = document.createElement('div');
    pied.className = 'ccmc-pied';

    champ = document.createElement('input');
    champ.type = 'text';
    champ.className = 'ccmc-champ';
    champ.setAttribute('placeholder', 'Écris ta demande…');
    champ.setAttribute('aria-label', 'Votre demande');

    boutonEnvoyer = document.createElement('button');
    boutonEnvoyer.type = 'button';
    boutonEnvoyer.className = 'ccmc-envoyer';
    boutonEnvoyer.textContent = 'Envoyer';

    champ.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); envoyer(); }
    });
    boutonEnvoyer.addEventListener('click', envoyer);

    pied.appendChild(champ);
    pied.appendChild(boutonEnvoyer);

    racine.appendChild(tete);
    racine.appendChild(zoneMessages);
    racine.appendChild(pied);

    document.body.appendChild(racine);
  }

  /* ============================================================== affichage === */
  function ouvrir() {
    if (!racine) construire();
    if (!bienvenueFaite) {
      bienvenueFaite = true;
      ajouterMessageAssistant('Bonjour ! Dis-moi ce que tu veux faire, par exemple « montre-moi comment publier une offre ».');
    }
    racine.classList.add('ccmc-ouvert');
    ouvert = true;
    defiler();
    if (champ) { try { setTimeout(function () { champ.focus(); }, 60); } catch (e) {} }
  }

  function fermer() {
    if (!racine) return;
    racine.classList.remove('ccmc-ouvert');
    ouvert = false;
    montrerEcriture(false);
    /* on remet la mascotte dans un etat naturel (elle etait en « ecoute ») */
    if (window.CCMascotte && window.CCMascotte.stop) {
      try { window.CCMascotte.stop(); } catch (e) {}
    }
  }

  function basculer() {
    if (ouvert) { fermer(); return; }
    /* relancer le chat = nouvelle question : on arrete le guide en cours, sans
       bouton visible (c'est la demande de Yoyo : l'arret se fait tout seul). */
    if (window.CCGuideSession && window.CCGuideSession.actif && window.CCGuideSession.actif()) {
      try { window.CCGuideSession.arreter(); } catch (e) {}
    }
    ouvrir();
  }

  /* ============================================================== messages ==== */
  function defiler() {
    if (zoneMessages) zoneMessages.scrollTop = zoneMessages.scrollHeight;
  }

  function ajouterMessage(role, texte) {
    if (!zoneMessages) return;
    var el = document.createElement('div');
    el.className = 'ccmc-msg ' + (role === 'moi' ? 'ccmc-msg-moi' : 'ccmc-msg-assistant');
    el.textContent = texte;
    zoneMessages.insertBefore(el, indicateur);
    defiler();
  }

  function ajouterMessageAssistant(texte, parcours) {
    if (!zoneMessages) return;
    var el = document.createElement('div');
    el.className = 'ccmc-msg ccmc-msg-assistant';
    el.textContent = texte;
    zoneMessages.insertBefore(el, indicateur);
    if (parcours) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ccmc-bouton-guide';
      b.textContent = 'Me montrer';
      b.addEventListener('click', function () { fermerEtGuider(parcours); });
      zoneMessages.insertBefore(b, indicateur);
    }
    defiler();
  }

  function montrerEcriture(actif) {
    if (!indicateur) return;
    indicateur.style.display = actif ? 'flex' : 'none';
    defiler();
  }

  /* ============================================================== appel IA ==== */
  /* Renvoie une promesse qui resout l'objet JSON deja verifie (via valider),
     ou null si l'IA est indisponible / a repondu n'importe quoi. */
  function appelerIA(texte) {
    return new Promise(function (resolve) {
      if (!window.ccSupabase || !window.ccSupabase.functions || !window.ccSupabase.functions.invoke) {
        resolve(null);
        return;
      }
      var corps = { prompt: texte, systemPrompt: PROMPT_SYSTEME, model: MODELE };
      var p;
      try {
        p = window.ccSupabase.functions.invoke(NOM_FONCTION, { body: corps });
      } catch (e) {
        resolve(null);
        return;
      }
      if (!p || typeof p.then !== 'function') { resolve(null); return; }
      p.then(function (res) {
        if (!res || res.error) { resolve(null); return; }
        var objet = extraireObjet(res.data);
        if (!objet) { resolve(null); return; }
        var valide = (window.CCGuideIntents && window.CCGuideIntents.valider)
          ? window.CCGuideIntents.valider(objet) : null;
        resolve(valide);
      }).catch(function () { resolve(null); });
    });
  }

  /* Extrait l'objet JSON de la reponse, quelle que soit l'enveloppe :
     - l'objet {type,...} deja forme (si l'Edge Function renvoie le JSON parse),
     - une chaine JSON brute,
     - l'enveloppe OpenAI (choices[0].message.content) et ses variantes. */
  function extraireObjet(data) {
    if (!data) return null;
    if (typeof data === 'object' && !Array.isArray(data) && typeof data.type === 'string') {
      return data;
    }
    if (typeof data === 'string') return parserJSON(data);
    var contenu = null;
    if (data.choices && data.choices.length) {
      var c0 = data.choices[0];
      if (c0 && c0.message && typeof c0.message.content === 'string') contenu = c0.message.content;
      else if (c0 && typeof c0.text === 'string') contenu = c0.text;
    }
    if (contenu == null && data.message && typeof data.message.content === 'string') contenu = data.message.content;
    if (contenu == null && typeof data.content === 'string') contenu = data.content;
    if (contenu == null && typeof data.message === 'string') contenu = data.message;
    if (contenu == null && typeof data.result === 'string') contenu = data.result;
    if (contenu == null && typeof data.answer === 'string') contenu = data.answer;
    if (contenu == null) return null;
    return parserJSON(contenu);
  }

  /* Parse une chaine en JSON, en tolerant les fences markdown et le texte
     autour du JSON. */
  function parserJSON(t) {
    if (!t || typeof t !== 'string') return null;
    var s = t.replace(/^\uFEFF/, '').trim();
    s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(s); } catch (e) {}
    var a = s.indexOf('{');
    var b = s.lastIndexOf('}');
    if (a !== -1 && b !== -1 && b > a) {
      try { return JSON.parse(s.slice(a, b + 1)); } catch (e2) {}
    }
    return null;
  }

  /* ============================================================== actions ===== */
  /* Ferme le panneau et lance le parcours, sans bouton d'arret ni dialogue. */
  function fermerEtGuider(parcours) {
    if (racine) racine.classList.remove('ccmc-ouvert');
    ouvert = false;
    montrerEcriture(false);

    if (!window.CCGuideSession) {
      ajouterMessageAssistant('Le guide n\'est pas disponible sur cette page.');
      ouvrir();
      return;
    }
    try {
      if (window.CCGuideSession.actif && window.CCGuideSession.actif()) {
        window.CCGuideSession.arreter();
      }
      var ok = window.CCGuideSession.demarrer(parcours);
      if (!ok) {
        ajouterMessageAssistant('Je ne peux pas lancer ce guide pour le moment. Réessaie dans un instant.');
        ouvrir();
      }
    } catch (e) {
      ajouterMessageAssistant('Une erreur est survenue. Réessaie.');
      ouvrir();
    }
  }

  /* ============================================================== envoi ======= */
  function envoyer() {
    if (!champ || attente) return;
    var texte = String(champ.value || '').replace(/^\s+|\s+$/g, '');
    if (!texte) return;
    champ.value = '';
    ajouterMessage('moi', texte);

    attente = true;
    if (boutonEnvoyer) boutonEnvoyer.disabled = true;
    var debut = Date.now();
    montrerEcriture(true);

    appelerIA(texte).then(function (valide) {
      var reste = ATTENTE_MIN_MS - (Date.now() - debut);
      function finir() {
        montrerEcriture(false);
        attente = false;
        if (boutonEnvoyer) boutonEnvoyer.disabled = false;
        traiter(valide, texte);
      }
      if (reste > 0) setTimeout(finir, reste); else finir();
    });
  }

  function traiter(valide, texte) {
    /* 1. reponse « chat » : on affiche simplement le message */
    if (valide && valide.type === 'chat') {
      ajouterMessageAssistant(valide.message);
      return;
    }

    /* 2. reponse « guide » ou « guide_confirmation » : un parcours autorise */
    if (valide && (valide.type === 'guide' || valide.type === 'guide_confirmation')) {
      var parcours = valide.parcours || valide.intent;
      if (!parcours) { traiter(null, texte); return; }
      if (valide.type === 'guide_confirmation') {
        var msg = valide.message || 'Je peux te montrer.';
        ajouterMessageAssistant(msg, parcours);
      } else {
        fermerEtGuider(parcours);
      }
      return;
    }

    /* 3. IA indisponible ou reponse refusee : MODE SANS RESEAU (local) */
    var local = (window.CCGuideIntents && window.CCGuideIntents.resoudre)
      ? window.CCGuideIntents.resoudre(texte) : null;
    if (local) {
      fermerEtGuider(local);
      return;
    }

    ajouterMessageAssistant('Désolé, je n\'ai pas bien compris. Tu peux me demander par exemple : « montre-moi comment publier une offre », « où chercher un voyageur » ou « comment changer mon numéro ».');
  }

  /* ============================================================== montage ===== */
  function monterMascotte() {
    if (!window.CCMascotte || !window.CCMascotte.mount) return;
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var PHRASES = {
      'index.html':   'Bonjour ! Vous cherchez à envoyer un colis ?',
      'results.html': 'Bonjour ! Ici, tous les voyageurs qui partent bientôt.'
    };
    try {
      window.CCMascotte.mount({
        salutation: PHRASES[page] || PHRASES['index.html'],
        delai: 8000,
        onChat: basculer
      });
    } catch (e) { /* sans mascotte, le chat ne s'ouvre pas : on ne casse rien */ }
  }

  /* ===================================================================== API === */
  window.CCGuideChat = {
    version: VERSION,
    ouvrir: ouvrir,
    fermer: fermer,
    basculer: basculer,
    envoyer: envoyer,
    actif: function () { return ouvert; }
  };

  /* -------------------------------------------------- mise en route auto ------ */
  function auto() {
    injecterCss();
    monterMascotte();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
