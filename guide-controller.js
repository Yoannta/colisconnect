/* ============================================================================
   GUIDE-CONTROLLER — le moteur de guidage · ColisConnect
   ----------------------------------------------------------------------------
   Il fait le lien entre :
       guide.json        (la carte : quoi montrer, dans quel ordre)
       le DOM            (ou trouver l'element : [data-guide="..."])
       la mascotte       (comment s'y rendre : walkTo / flyTo / teleportTo / pointTo)

   Il ne dessine RIEN et ne parle PAS : il calcule et il commande.
   Il ne connait PAS DeepSeek : l'IA ne fait que lui donner un nom de parcours.

   UTILISATION
     <script src="guide-controller.js" defer></script>
     CCGuide.startJourney('publish_trip')     // lance un parcours
     CCGuide.nextStep()                       // etape suivante
     CCGuide.stop()                           // arret immediat

   API : startJourney(nom) | nextStep() | stop() | resolve(cible)
         isOffscreen(el) | scrollTo(el) | safeSpot(el) | waitFor(cible)
         navigateToPage(page) | state() | on(evente, fn)

   IMPORTANT : le guidage doit fonctionner SANS DeepSeek. Ce fichier ne fait
   aucun appel reseau en dehors du chargement de guide.json.
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ------------------------------------------------------------------ etat -- */
  var etat = {
    pret: false,
    actif: false,
    parcours: null,      /* nom du parcours en cours */
    etape: 0,            /* index de l'etape courante */
    cible: null,         /* cible de l'etape courante */
    element: null,       /* element du DOM vise */
    minuteur: null,
    cibleHalos: null
  };

  var carte = null;      /* le contenu de guide.json */
  var reglages = { walk_max_px: 420, fly_max_px: 1600, marge_ecran_px: 12,
                   delai_entre_etapes_ms: 2600, attente_cible_max_ms: 4000 };

  /* petits ecouteurs d'evenements, pour que le chat puisse reagir */
  var ecouteurs = {};

  function on(nom, fn) {
    if (!ecouteurs[nom]) ecouteurs[nom] = [];
    ecouteurs[nom].push(fn);
  }
  function emettre(nom, data) {
    var l = ecouteurs[nom] || [];
    for (var i = 0; i < l.length; i++) {
      try { l[i](data); } catch (e) { /* un ecouteur casse ne doit pas casser le guide */ }
    }
  }

  /* ------------------------------------------------------------- utilitaires -- */
  function $selection(sel) {
    try { return document.querySelector(sel); } catch (e) { return null; }
  }

  function pageCourante() {
    var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return p || 'index.html';
  }

  function normaliser(nom) {
    return String(nom || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  /* =========================================================== RESOLVE ===== */
  /* Trouve l'element portant data-guide="<cible>".
     Si plusieurs elements portent la meme cible (par exemple la navigation
     desktop ET la navigation mobile), on prend celui qui est REELLEMENT
     visible : c'est celui que le visiteur voit. */
  function resolve(cible) {
    var c = normaliser(cible);
    if (!c) return null;
    var tous = document.querySelectorAll('[data-guide="' + c + '"]');
    if (!tous.length) return null;
    var premierVisible = null;
    for (var i = 0; i < tous.length; i++) {
      var el = tous[i];
      var r = el.getBoundingClientRect();
      var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var cache = style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0');
      if (!cache && (r.width > 0 || r.height > 0)) return el;
      if (!premierVisible && !cache) premierVisible = el;
    }
    return premierVisible || tous[0];
  }

  /* ========================================================= IS OFFSCREEN == */
  function isOffscreen(el) {
    if (!el) return true;
    var r = el.getBoundingClientRect();
    var h = window.innerHeight || document.documentElement.clientHeight;
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (r.width === 0 && r.height === 0) return true;
    /* hors ecran, ou cache sous une barre fixe haute / basse */
    if (r.bottom < 8) return true;
    if (r.top > h - 8) return true;
    if (r.right < 8 || r.left > w - 8) return true;
    return false;
  }

  /* ============================================================ SCROLLTO === */
  /* Amene l'element a l'ecran SANS le cacher derriere le header ou la barre
     du bas. On mesure ces deux barres au lieu de les supposer. */
  function scrollTo(el) {
    if (!el) return false;
    var header = $selection('header.site-header');
    var barreBasse = $selection('.mobile-bottom-nav');
    var haut = (header ? header.getBoundingClientRect().height : 0) + 16;
    var bas = (barreBasse ? barreBasse.getBoundingClientRect().height : 0) + 16;

    var r = el.getBoundingClientRect();
    var h = window.innerHeight;
    var zoneHaute = haut;
    var zoneBasse = h - bas;

    /* deja bien place ? on ne bouge pas */
    if (r.top >= zoneHaute && r.bottom <= zoneBasse) return true;

    var delta = (r.top + r.height / 2) - (zoneHaute + (zoneBasse - zoneHaute) / 2);
    var cibleY = (window.pageYOffset || document.documentElement.scrollTop || 0) + delta;

    try {
      window.scrollTo({ top: Math.max(0, Math.round(cibleY)), behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, Math.max(0, Math.round(cibleY)));
    }
    return true;
  }

  /* ============================================================ SAFESPOT === */
  /* Calcule OU poser la mascotte pour qu'elle designe la cible SANS jamais la
     recouvrir. On renvoie une position ecran (pixels viewport).
     Regles :
       - la mascotte ne doit pas recouvrir la cible (on se decale)
       - elle ne doit pas sortir de l'ecran (marge de securite)
       - on evite le bas de l'ecran occupe par la barre mobile */
  function safeSpot(el) {
    var marge = reglages.marge_ecran_px;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var barreBasse = $selection('.mobile-bottom-nav');
    var basOccupe = barreBasse ? barreBasse.getBoundingClientRect().height : 0;
    var limiteBasse = h - basOccupe - 8;

    var taille = { largeur: 56, hauteur: 79 };
    try {
      if (window.CCMascotte && window.CCMascotte.getSize) {
        var s = window.CCMascotte.getSize();
        if (s && s.largeur) taille = s;
      }
    } catch (e) { /* on garde la taille par defaut */ }

    if (!el) {
      /* pas de cible : on se met en bas a droite */
      return { x: Math.max(marge, w - taille.largeur - marge),
               y: Math.max(marge, limiteBasse - taille.hauteur) };
    }

    var r = el.getBoundingClientRect();

    /* position preferee : a gauche de la cible, aligne sur son centre */
    var x = r.left - taille.largeur - 14;
    var y = r.top + (r.height / 2) - (taille.hauteur / 2);

    /* pas la place a gauche ? on passe a droite */
    if (x < marge) {
      x = r.right + 14;
    }
    /* toujours pas la place (cible pleine largeur) ? on se met SOUS la cible */
    if (x + taille.largeur > w - marge) {
      x = Math.min(Math.max(marge, r.left), w - taille.largeur - marge);
      y = r.bottom + 12;
    }
    /* et si ca depasse en bas, on remonte au-dessus de la cible */
    if (y + taille.hauteur > limiteBasse) {
      y = r.top - taille.hauteur - 12;
    }

    /* bornes finales : jamais hors ecran */
    x = Math.min(Math.max(marge, x), Math.max(marge, w - taille.largeur - marge));
    y = Math.min(Math.max(marge, y), Math.max(marge, limiteBasse - taille.hauteur));

    return { x: Math.round(x), y: Math.round(y) };
  }

  /* ============================================================= WAITFOR === */
  /* Attend qu'une cible apparaisse dans le DOM (pages dynamiques, formulaire
     qui s'ouvre, onglet qui se construit). Renvoie une promesse. */
  function waitFor(cible, timeoutMs) {
    var limite = timeoutMs || reglages.attente_cible_max_ms;
    return new Promise(function (resoudre) {
      var el = resolve(cible);
      if (el) { resoudre(el); return; }
      var debut = Date.now();
      var obs = null;
      var minuteur = setInterval(function () {
        var e2 = resolve(cible);
        if (e2) {
          clearInterval(minuteur);
          if (obs) obs.disconnect();
          resoudre(e2);
          return;
        }
        if (Date.now() - debut > limite) {
          clearInterval(minuteur);
          if (obs) obs.disconnect();
          resoudre(null);              /* on rend la main : l'appelant decide */
        }
      }, 120);
      if (window.MutationObserver) {
        obs = new MutationObserver(function () {
          if (resolve(cible)) {
            clearInterval(minuteur);
            obs.disconnect();
            resoudre(resolve(cible));
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      }
    });
  }

  /* ======================================================= NAVIGATEPAGE === */
  /* Va sur une autre page du site, en laissant la session de guidage a
     l'appelant (guide-session.js s'en occupe). */
  function navigateToPage(page) {
    var p = String(page || '').toLowerCase();
    if (!p || p === 'any' || p === pageCourante()) return false;
    if (etat.actif) emettre('navigation', { parcours: etat.parcours, etape: etat.etape, page: p });
    location.href = p;
    return true;
  }

  /* ========================================================= CHOISIR MODE = */
  /* Propose un mode selon la distance. La carte peut demander un mode
     different : ici on respecte sa demande, sauf si elle est absurde
     (une cible tres lointaine en "walk" prendrait des minutes). */
  function choisirMode(el, modeDemande) {
    var spot = mascottePosition();
    var cible = safeSpot(el);
    var dx = cible.x - spot.x;
    var dy = cible.y - spot.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    var auto;
    if (distance <= reglages.walk_max_px) auto = 'walk';
    else if (distance <= reglages.fly_max_px) auto = 'fly';
    else auto = 'teleport';

    if (!modeDemande) return auto;

    /* la demande de la carte est respectee, sauf si elle est irrealiste */
    if (modeDemande === 'walk' && distance > reglages.fly_max_px) return 'fly';
    if (modeDemande === 'point') return 'point';
    return modeDemande;
  }

  function mascottePosition() {
    try {
      if (window.CCMascotte && window.CCMascotte.getPosition) {
        var p = window.CCMascotte.getPosition();
        if (p && typeof p.x === 'number') return p;
      }
    } catch (e) { /* pas de mascotte : on suppose le coin bas droit */ }
    return { x: window.innerWidth - 80, y: window.innerHeight - 100 };
  }

  /* ============================================================== HALO ==== */
  /* Un halo autour de la cible, pour que l'oeil la trouve tout de suite. */
  var HALO_ID = 'cc-guide-halo';
  function poserHalo(el) {
    retirerHalo();
    if (!el) return;
    var r = el.getBoundingClientRect();
    var d = document.createElement('div');
    d.id = HALO_ID;
    d.style.cssText = [
      'position:fixed',
      'left:' + Math.round(r.left - 6) + 'px',
      'top:' + Math.round(r.top - 6) + 'px',
      'width:' + Math.round(r.width + 12) + 'px',
      'height:' + Math.round(r.height + 12) + 'px',
      'border:2px solid #f1b52b',
      'border-radius:12px',
      'box-shadow:0 0 0 4px rgba(241,181,43,0.25), 0 0 22px rgba(241,181,43,0.55)',
      'pointer-events:none',
      'z-index:9000',
      'transition:all .25s ease'
    ].join(';');
    document.body.appendChild(d);
    etat.cibleHalos = d;
  }
  function retirerHalo() {
    var d = document.getElementById(HALO_ID);
    if (d && d.parentNode) d.parentNode.removeChild(d);
    etat.cibleHalos = null;
  }

  /* ============================================================ JOUER UNE ETAPE */
  /* C'est le coeur : on amene la mascotte sur la cible et on lui fait dire
     la bulle de l'etape. */
  function jouerEtape(etape) {
    var cible = normaliser(etape.cible);
    etat.cible = cible;

    /* ---------------------------------------------------------------------
       NAVIGATION AUTOMATIQUE (P9)
       Si l'etape appartient a une AUTRE page et que la cible ne se trouve pas
       ici, on change de page AVANT d'attendre : sinon on attendrait 4 secondes
       pour rien. La session (guide-session.js) memorise l'etape, et le guide
       reprend tout seul sur la page suivante, ou il dira « c'est ici ».
       Si la cible est DEJA presente ici, on NE navigue PAS.
       --------------------------------------------------------------------- */
    var page = normaliser(etape.page);
    var autrePage = page && page !== 'any' && page !== pageCourante();
    if (autrePage && !resolve(cible)) {
      emettre('navigation', { parcours: etat.parcours, index: etat.etape, page: etape.page, cible: cible });
      navigateToPage(etape.page);
      return Promise.resolve(true);
    }

    return waitFor(cible).then(function (el) {
      if (!etat.actif) return false;
      if (!el) {
        /* introuvable meme apres attente : on le signale et on passe */
        emettre('cible_absente', { cible: cible, page: etape.page, parcours: etat.parcours });
        return false;
      }
      etat.element = el;

      /* si la cible appartient a une autre page, on y va (P9) */
      if (etape.page && etape.page !== 'any' && etape.page !== pageCourante()) {
        navigateToPage(etape.page);
        return true;
      }

      /* 1. on l'amene a l'ecran, en respectant les barres fixes */
      if (isOffscreen(el)) scrollTo(el);

      /* 2. on calcule ou se poser sans la recouvrir */
      var spot = safeSpot(el);
      var mode = choisirMode(el, etape.mode);

      /* 3. on commande la mascotte */
      var M = window.CCMascotte;
      if (!M) { emettre('erreur', { message: 'mascotte absente' }); return false; }

      var promesse;
      if (mode === 'point') {
        if (M.pointTo) M.pointTo(el);
        promesse = Promise.resolve();
      } else if (mode === 'fly' && M.flyTo) {
        promesse = Promise.resolve(M.flyTo(spot.x, spot.y));
      } else if (mode === 'teleport' && M.teleportTo) {
        promesse = Promise.resolve(M.teleportTo(spot.x, spot.y));
      } else if (M.walkTo) {
        promesse = Promise.resolve(M.walkTo(spot.x, spot.y));
      } else if (M.placer) {
        /* filet de securite : la mascotte n'a pas encore ses modes deplacement */
        M.placer(spot.x, spot.y);
        promesse = Promise.resolve();
      } else {
        promesse = Promise.resolve();
      }

      return promesse.then(function () {
        if (!etat.actif) return false;
        /* 4. le halo sur la cible */
        poserHalo(el);
        /* 5. et la mascotte parle */
        if (M.parler && etape.bulle) M.parler(etape.bulle);
        emettre('etape', { parcours: etat.parcours, index: etat.etape, cible: cible, element: el });
        return true;
      });
    });
  }

  /* ============================================================ STARTJOURNEY */
  function startJourney(nom, options) {
    var n = normaliser(nom);
    if (!carte || !carte.journeys || !carte.journeys[n]) {
      emettre('erreur', { message: 'parcours inconnu : ' + n });
      return false;
    }
    etat.actif = true;
    etat.parcours = n;
    /* reprise : guide-session.js peut demander de reprendre a une etape precise
       (typiquement apres un changement de page). Par defaut on repart a zero. */
    var depart = 0;
    if (options && typeof options.etape === 'number' && options.etape >= 0) {
      depart = options.etape;
    }
    etat.etape = depart;
    etat.element = null;
    emettre('debut', { parcours: n, options: options || {} });

    /* la mascotte doit pouvoir sortir de sa bande du bas pour se deplacer */
    if (window.CCMascotte && window.CCMascotte.entrerEnLibre) {
      window.CCMascotte.entrerEnLibre();
    }

    var etapes = carte.journeys[n].etapes || [];
    if (!etapes.length) { stop(); return false; }
    if (depart >= etapes.length) { stop(); return false; }
    jouerEtape(etapes[depart]);
    return true;
  }

  /* =============================================================== NEXTSTEP */
  function nextStep() {
    if (!etat.actif || !etat.parcours) return false;
    var etapes = (carte.journeys[etat.parcours] || {}).etapes || [];
    etat.etape++;
    if (etat.etape >= etapes.length) {
      emettre('fin', { parcours: etat.parcours });
      /* on laisse la derniere bulle a l'ecran un instant, puis on range */
      setTimeout(function () { stop(); }, reglages.delai_entre_etapes_ms);
      return false;
    }
    retirerHalo();
    jouerEtape(etapes[etat.etape]);
    emettre('avance', { parcours: etat.parcours, index: etat.etape });
    return true;
  }

  /* ================================================================== STOP = */
  function stop() {
    var parcours = etat.parcours;
    etat.actif = false;
    etat.parcours = null;
    etat.etape = 0;
    etat.cible = null;
    etat.element = null;
    retirerHalo();
    if (etat.minuteur) { clearTimeout(etat.minuteur); etat.minuteur = null; }
    if (window.CCMascotte) {
      if (window.CCMascotte.stop) window.CCMascotte.stop();
      /* elle retourne dans sa bande du bas, comme avant */
      if (window.CCMascotte.sortirDeLibre) window.CCMascotte.sortirDeLibre();
    }
    emettre('arret', { parcours: parcours });
  }

  /* ========================================================= CHARGER LA CARTE */
  function charger(url) {
    return fetch(url || 'guide.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('guide.json introuvable (' + r.status + ')');
        return r.json();
      })
      .then(function (j) {
        carte = j;
        if (j.reglages) {
          for (var k in j.reglages) {
            if (typeof j.reglages[k] === 'number') reglages[k] = j.reglages[k];
          }
        }
        etat.pret = true;
        emettre('pret', { parcours: Object.keys(j.journeys || {}) });
        return true;
      })
      .catch(function (e) {
        etat.pret = false;
        emettre('erreur', { message: 'carte non chargee : ' + e.message });
        return false;
      });
  }

  /* ==================================================================== API */
  window.CCGuid = {
    version: VERSION,
    charger: charger,
    startJourney: startJourney,
    nextStep: nextStep,
    stop: stop,
    resolve: resolve,
    isOffscreen: isOffscreen,
    scrollTo: scrollTo,
    safeSpot: safeSpot,
    waitFor: waitFor,
    navigateToPage: navigateToPage,
    choisirMode: choisirMode,
    poserHalo: poserHalo,
    retirerHalo: retirerHalo,
    on: on,
    pret: function () { return etat.pret; },
    state: function () {
      return { actif: etat.actif, parcours: etat.parcours, etape: etat.etape, cible: etat.cible };
    }
  };

  /* chargement automatique de la carte, une fois le DOM pret */
  function auto() { charger('guide.json'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

})();
