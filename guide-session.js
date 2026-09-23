/* ============================================================================
   GUIDE-SESSION — la memoire du guide · ColisConnect
   ----------------------------------------------------------------------------
   Elle repond a UNE question : « le visiteur etait en train de suivre un
   parcours, et il vient de changer de page : ou en etait-il ? »

   Sans elle, ton scenario ne marche pas :
       la mascotte guide vers « Recherche »
       -> le visiteur clique
       -> la page change
       -> SANS memoire, le guide s'arrete la et ne dit jamais « c'est ici ».

   CE QU'ON STOCKE (petit, jamais la conversation) :
       { active: true, journey: "publish_trip", step: 3, target: "departure-country" }

   CE QU'ON NE STOCKE PAS : les messages du chat, l'historique, quoi que ce soit
   de personnel. Uniquement l'etat du guidage, et il disparait a l'arret du guide.

   UTILISATION
     <script src="guide-session.js" defer></script>
     CCGuideSession.demarrer('publish_trip')   // lance ET memorise
     CCGuideSession.arreter()                  // arrete ET efface
     CCGuideSession.reprendre()                // appele automatiquement au chargement

   API : demarrer(nom) | arreter() | reprendre() | lire() | effacer()
         actif() | parcours() | etape()
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var CLE = 'cc-guide-session';
  var CLE_TOUJOURS = 'cc-guide-toujours';   /* preference « toujours me guider » (P15) */
  var ATTENTE_CONTROLEUR_MS = 4000;         /* le temps que guide.json se charge */

  /* --------------------------------------------------------------- stockage -- */
  function lire() {
    try {
      var brut = sessionStorage.getItem(CLE);
      if (!brut) return null;
      var o = JSON.parse(brut);
      if (!o || typeof o !== 'object') return null;
      return o;
    } catch (e) {
      /* sessionStorage indisponible (navigation privee stricte) : on continue
         sans memoire plutot que de casser le guide */
      return null;
    }
  }

  function ecrire(o) {
    try { sessionStorage.setItem(CLE, JSON.stringify(o)); } catch (e) { /* ignore */ }
  }

  function effacer() {
    try { sessionStorage.removeItem(CLE); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------- preference -- */
  function toujoursGuider() {
    try { return localStorage.getItem(CLE_TOUJOURS) === '1'; } catch (e) { return false; }
  }
  function definirToujoursGuider(v) {
    try {
      if (v) localStorage.setItem(CLE_TOUJOURS, '1');
      else localStorage.removeItem(CLE_TOUJOURS);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------- le bouton ARRET -- */
  var BOUTON_ID = 'cc-guide-stop';
  function montrerBoutonArret() {
    if (document.getElementById(BOUTON_ID)) return;
    var b = document.createElement('button');
    b.id = BOUTON_ID;
    b.type = 'button';
    b.setAttribute('aria-label', "Arreter le guide");
    b.textContent = '\u2715  Arreter le guide';
    b.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:9500',
      'padding:9px 14px',
      'border-radius:999px',
      'border:1px solid rgba(255,179,71,0.55)',
      'background:rgba(20,16,8,0.92)',
      'color:#f1b52b',
      'font:700 12.5px/1 inherit',
      'cursor:pointer',
      'box-shadow:0 8px 22px rgba(0,0,0,0.45)'
    ].join(';');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      arreter();
    });
    document.body.appendChild(b);
  }

  function retirerBoutonArret() {
    var b = document.getElementById(BOUTON_ID);
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  /* =============================================================== REPRENDRE */
  /* Au chargement d'une page : si une session est active, on reprend le
     parcours a l'etape ou il en etait. On attend que le controleur soit pret
     (guide.json charge) avant de reprendre. */
  function reprendre() {
    var s = lire();
    if (!s || !s.active || !s.journey) return false;

    var debut = Date.now();
    function tenter() {
      if (window.CCGuid && window.CCGuid.pret && window.CCGuid.pret()) {
        montrerBoutonArret();
        window.CCGuid.startJourney(s.journey, { etape: s.step || 0 });
        return;
      }
      if (Date.now() - debut > ATTENTE_CONTROLEUR_MS) {
        /* la carte n'a pas charge : on efface la session plutot que de rester
           bloque sur un etat fantome */
        effacer();
        return;
      }
      setTimeout(tenter, 150);
    }
    tenter();
    return true;
  }

  /* ================================================================ DEMARRER */
  function demarrer(nom, options) {
    if (!window.CCGuid) return false;
    var ok = window.CCGuid.startJourney(nom, options || {});
    if (!ok) return false;
    ecrire({ active: true, journey: nom, step: (options && options.etape) || 0, target: null });
    montrerBoutonArret();
    return true;
  }

  /* ================================================================= ARRETER */
  function arreter() {
    if (window.CCGuid && window.CCGuid.stop) window.CCGuid.stop();
    effacer();
    retirerBoutonArret();
  }

  /* ------------------------------------------- brancher le controleur dessus */
  /* Le controleur emet des evenements : on en profite pour tenir la session a
     jour SANS que le controleur ait besoin de connaitre le stockage. */
  function brancher() {
    if (!window.CCGuid || !window.CCGuid.on) return;
    window.CCGuid.on('etape', function (d) {
      var s = lire();
      if (!s || !s.active) return;
      s.step = d.index;
      s.target = d.cible;
      ecrire(s);
    });
    window.CCGuid.on('fin', function () { effacer(); retirerBoutonArret(); });
    window.CCGuid.on('arret', function () { retirerBoutonArret(); });
  }

  /* ==================================================================== API */
  window.CCGuideSession = {
    version: VERSION,
    demarrer: demarrer,
    arreter: arreter,
    reprendre: reprendre,
    brancher: brancher,
    lire: lire,
    effacer: effacer,
    actif: function () { var s = lire(); return !!(s && s.active); },
    parcours: function () { var s = lire(); return s ? s.journey : null; },
    etape: function () { var s = lire(); return s ? s.step : null; },
    toujoursGuider: toujoursGuider,
    definirToujoursGuider: definirToujoursGuider
  };

  /* ----------------------------------------------- mise en route automatique */
  function auto() {
    brancher();
    reprendre();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

})();
