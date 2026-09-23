/* ============================================================================
   GUIDE-INTENTS — la liste blanche et la resolution d'intention · ColisConnect
   ----------------------------------------------------------------------------
   DEUX ROLES, et deux seulement :

   1. RESOUDRE UNE DEMANDE ECRITE EN FRANCAIS vers un parcours de guide.json.
      Utile meme SANS DeepSeek : un bouton « Aide », ou la recherche par mots
      cles, peuvent appeler resoudre("ou sont les pays") et obtenir
      "find_country". Le guidage ne depend donc jamais de l'IA.

   2. FILTRER CE QUE L'IA A LE DROIT DE DEMANDER.
      C'est le garde-fou : si DeepSeek renvoie autre chose qu'un parcours de la
      liste blanche, on REJETTE. Une tentative comme « delete_site » ou du
      JavaScript ne peut pas passer.

   REGLE DE SECURITE FONDAMENTALE :
   DeepSeek ne renvoie JAMAIS de code, de coordonnees, de HTML, de selecteur CSS
   ni de commande. Il renvoie UNIQUEMENT un nom de parcours pris dans la liste
   blanche. Ce module refait la verification de son cote, sans lui faire
   confiance : la securite ne repose pas sur le prompt mais sur ce filtre.

   UTILISATION
     <script src="guide-intents.js" defer></script>
     CCGuideIntents.resoudre('montre-moi ou chercher les pays')  -> 'find_country'
     CCGuideIntents.valider({type:'guide', intent:'find_country'}) -> objet normalise ou null

   API : resoudre(texte) | valider(reponse) | whitelist() | estAutorise(nom)
         parcoursDe(intent) | intentions() | normaliser(texte)
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '1.0.0';

  /* --------------------------------------------------------------- liste blanche */
  /* Volontairement ecrite EN DUR dans le code, et non lue depuis guide.json :
     si quelqu'un modifiait guide.json, la liste blanche ne bougerait pas. C'est
     la reference de securite, elle doit etre stable et verifiable a l'oeil. */
  var PARCOURS_AUTORISES = [
    'find_country',
    'find_offer',
    'publish_trip',
    'set_phone',
    'my_profile'
  ];

  /* types de reponse que l'IA a le droit de produire */
  var TYPES_AUTORISES = ['guide', 'chat', 'guide_confirmation'];

  /* ------------------------------------------------------ synonymes de secours */
  /* guide.json contient deja des synonymes. On en garde une copie ici pour que
     la resolution marche meme si la carte n'est pas encore chargee : c'est le
     filet de securite du guidage sans IA. */
  var SYNONYMES_SECOURS = {
    find_country: ['pays', 'choisir un pays', 'changer de pays', 'ou sont les pays',
                   'pays de depart', 'pays d arrivee', 'ou chercher les pays'],
    find_offer:   ['chercher', 'recherche', 'trouver un voyageur', 'trouver une offre',
                   'envoyer un colis', 'expedier'],
    publish_trip: ['publier', 'publier un trajet', 'publier une offre', 'mettre une annonce',
                   'proposer un trajet', 'comment publier'],
    set_phone:    ['telephone', 'numero', 'mon numero', 'verifier mon numero',
                   'changer de numero', 'ajouter un numero'],
    my_profile:   ['mon profil', 'mon compte', 'mes offres', 'tableau de bord', 'mon espace']
  };

  /* --------------------------------------------------------------- utilitaires */
  /* On enleve accents, ponctuation et majuscules : « Où sont les PAYS ? » et
     « ou sont les pays » doivent se reconnaitre. */
  function normaliser(t) {
    return String(t || '')
      .toLowerCase()
      .normalize ? String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                 : String(t || '').toLowerCase();
  }

  function nettoyer(t) {
    return normaliser(t).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* -------------------------------------------------------------- whitelist API */
  function whitelist() { return PARCOURS_AUTORISES.slice(); }

  function estAutorise(nom) {
    if (typeof nom !== 'string') return false;
    return PARCOURS_AUTORISES.indexOf(nom) !== -1;
  }

  function intentions() { return Object.keys(SYNONYMES_SECOURS); }

  /* intent -> parcours (dans notre carte, ils portent le meme nom, mais on ne
     le suppose pas : on lit guide.json si disponible) */
  function parcoursDe(intent) {
    try {
      if (window.CCGuid && window.CCGuid.state) {
        /* le controleur a charge guide.json : on peut lire la vraie table */
        var c = window.__ccGuideCarte;
        if (c && c.intents && c.intents[intent] && c.intents[intent].parcours) {
          return c.intents[intent].parcours;
        }
      }
    } catch (e) { /* on retombe sur le nom direct */ }
    return intent;
  }

  /* ================================================================ RESOUDRE == */
  /* Renvoie le nom du parcours, ou null si rien ne correspond.
     On commence par les synonymes de guide.json (plus riches), puis on retombe
     sur la copie locale. */
  function resoudre(texte) {
    var t = nettoyer(texte);
    if (!t) return null;

    var table = SYNONYMES_SECOURS;
    try {
      var c = window.__ccGuideCarte;
      if (c && c.intents) {
        table = {};
        for (var k in c.intents) {
          table[k] = c.intents[k].synonymes || [];
        }
        /* on complete avec la copie locale pour ne rien perdre */
        for (var k2 in SYNONYMES_SECOURS) {
          if (!table[k2]) table[k2] = SYNONYMES_SECOURS[k2];
        }
      }
    } catch (e) { /* on garde la copie locale */ }

    /* 1. correspondance EXACTE sur un synonyme (le plus fiable) */
    for (var intent in table) {
      if (!estAutorise(parcoursDe(intent))) continue;
      var syns = table[intent] || [];
      for (var i = 0; i < syns.length; i++) {
        if (nettoyer(syns[i]) === t) return parcoursDe(intent);
      }
    }

    /* 2. correspondance PARTIELLE : un synonyme est contenu dans la demande.
       On prend le synonyme le PLUS LONG qui matche, pour eviter que « pays »
       ne l'emporte sur « pays de depart ». */
    var meilleur = null, meilleurTaille = 0;
    for (var intent2 in table) {
      if (!estAutorise(parcoursDe(intent2))) continue;
      var syns2 = table[intent2] || [];
      for (var j = 0; j < syns2.length; j++) {
        var s = nettoyer(syns2[j]);
        if (s && s.length > meilleurTaille && t.indexOf(s) !== -1) {
          meilleur = parcoursDe(intent2);
          meilleurTaille = s.length;
        }
      }
    }
    return meilleur;
  }

  /* ================================================================= VALIDER == */
  /* Verifie la reponse de l'IA. Renvoie un objet normalise, ou null si la
     reponse est refusee. On ne fait AUCUNE confiance au contenu : tout ce qui
     n'est pas explicitement autorise est jete. */
  function valider(reponse) {
    if (!reponse || typeof reponse !== 'object') return null;

    var type = String(reponse.type || '');
    if (TYPES_AUTORISES.indexOf(type) === -1) return null;

    if (type === 'chat') {
      var msg = reponse.message;
      if (typeof msg !== 'string') return null;
      msg = msg.slice(0, 600);            /* borne de taille */
      if (!msg.trim()) return null;
      return { type: 'chat', message: msg };
    }

    /* guide et guide_confirmation : la cible DOIT etre dans la liste blanche */
    var intent = reponse.intent || reponse.parcours || reponse.target || '';
    intent = String(intent);
    if (!estAutorise(intent)) {
      /* on tente une derniere chance : un texte libre qu'on resout localement */
      var devine = resoudre(intent);
      if (!devine) return null;
      intent = devine;
    }

    var sortie = { type: type, intent: intent, parcours: parcoursDe(intent) };
    if (type === 'guide_confirmation') {
      var m2 = reponse.message;
      sortie.message = (typeof m2 === 'string' && m2.trim())
        ? m2.slice(0, 300)
        : 'Je peux te montrer. Tu veux que je te guide ?';
    }
    return sortie;
  }

  /* ==================================================================== API == */
  window.CCGuideIntents = {
    version: VERSION,
    resoudre: resoudre,
    valider: valider,
    whitelist: whitelist,
    estAutorise: estAutorise,
    parcoursDe: parcoursDe,
    intentions: intentions,
    normaliser: nettoyer
  };

  /* ------------------------------------- exposer la carte au module d'intentions
     Le controleur charge guide.json ; on la garde accessible ici pour que les
     synonymes riches de la carte servent a la resolution. */
  function exposerCarte() {
    try {
      if (window.CCGuid && window.CCGuid.on) {
        window.CCGuid.on('pret', function () {
          /* le controleur ne publie pas la carte : on la relit nous-memes, une
             fois, et seulement si on en a besoin. */
          if (window.__ccGuideCarte) return;
          fetch('guide.json', { cache: 'force-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { if (j) window.__ccGuideCarte = j; })
            .catch(function () { /* sans carte on garde les synonymes de secours */ });
        });
      }
    } catch (e) { /* ignore */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', exposerCarte);
  else exposerCarte();

})();
