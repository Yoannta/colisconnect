/* ============================================================================
   MASCOTTE ColisConnect — la pose sur le VRAI site
   ----------------------------------------------------------------------------
   A charger APRES « mascotte.js ». Ce fichier ne fait que trois choses :
     1. la laisser SOUS les boutons flottants du bas (sinon il vole le clic
        du bouton « Filtres » de la page des offres, qui est en z-index 50) ;
     2. sur mobile, la poser juste au-dessus de la barre du bas (64 px de
        haut, z-index 1000) sinon il est coupe en deux ;
     3. lui donner la bonne phrase selon la page.
   Pages concernees : index.html (accueil) et results.html (offres) UNIQUEMENT.
   Pour tout annuler : retirer les 2 balises <script> de ces 2 pages
   (le personnage ne s'installe plus du tout), ou git reset --hard
   ROLLBACK-MASCOTTE-AVANT.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.CCMascotte) return;                 // le composant n'a pas charge : on ne fait rien

  /* --- 1 et 2 : les deux retouches CSS, au meme endroit ------------------- */
  if (!document.getElementById('ccm-site-style')) {
    var s = document.createElement('style');
    s.id = 'ccm-site-style';
    s.textContent = [
      /* sous le bouton « Filtres » (z-index 50) : le clic reste au bouton */
      '.ccm-root{z-index:40 !important}',
      /* sur mobile, au-dessus de la barre du bas (64 px) */
      'html.mobile-mode .ccm-root{bottom:64px !important}'
    ].join('');
    document.head.appendChild(s);
  }

  /* --- 3 : sa phrase du moment ------------------------------------------- */
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var PHRASES = {
    'index.html':        'Bonjour ! Vous cherchez \u00e0 envoyer un colis ?',
    'results.html':      'Bonjour ! Ici, tous les voyageurs qui partent bient\u00f4t.',
    'post_trip.html':    'Bonjour ! Je peux t\u2019aider \u00e0 publier ton trajet, \u00e9tape par \u00e9tape.',
    'verification.html': 'Bonjour ! Ici tu g\u00e8res ton num\u00e9ro de t\u00e9l\u00e9phone.',
    'chat.html':         'Bonjour ! Tu peux me poser tes questions ici.',
    'dashboard.html':    'Bonjour ! Voici ton espace. Dis-moi si tu cherches quelque chose.',
    'auth.html':         'Bonjour ! Connecte-toi et je t\u2019accompagne.',
    'partner.html':      'Bonjour ! Bienvenue dans l\u2019espace partenaire.',
    'admin.html':        'Bonjour ! Espace administration.'
  };

  window.CCMascotte.mount({
    salutation: PHRASES[page] || PHRASES['index.html'],
    delai: 8000                                    // il remarque le visiteur au bout de 8 s
  });
})();
