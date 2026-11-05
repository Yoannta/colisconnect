/**
 * shared-header.js — Header UNIFIÉ (source unique)
 * Injecte la navigation desktop + la barre mobile dans toutes les pages.
 * Détection automatique du lien actif (is-active / active).
 *
 * Utilisation : ajouter <div id="site-header-root"></div> et
 *               <div id="mobile-bottom-nav-root"></div> dans chaque page,
 *               puis <script src="shared-header.js"></script> avant </body>.
 */

(function () {
  'use strict';

  // ── Détection page active ──
  var path = location.pathname.replace(/\/$/, '').split('/').pop() || 'index.html';
  var activePage = path || 'index.html';

  // ═══════════════════════════════════════════════
  //  HEADER DESKTOP
  // ═══════════════════════════════════════════════
  var links = [
    { href: 'index.html',      label: 'Accueil' },
    { href: 'results.html',    label: 'Recherche' },
    { href: 'post_trip.html',  label: 'Publier une offre' },
    { href: 'chat.html',       label: 'Messages' },
  ];

  var navHTML = links.map(function (l) {
    var cls = (l.href === activePage) ? 'nav-link is-active' : 'nav-link';
    return '<a href="' + l.href + '" class="' + cls + '">' + l.label + '</a>';
  }).join('\n          ') +
    '\n          <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a>';

  var headerHTML =
    '<header class="site-header">\n' +
    '\n' +
    '    <div class="brand">\n' +
    '        <div class="brand-logo">\n' +
    '            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
    '                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#000" />\n' +
    '                <path d="M2 17L12 22L22 17" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />\n' +
    '                <path d="M2 12L12 17L22 12" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />\n' +
    '            </svg>\n' +
    '        </div>\n' +
    '        <div>\n' +
    '            <p class="brand-name">ColisConnect</p>\n' +
    '            <p class="brand-sub">Transport de colis entre particuliers</p>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '\n' +
    '    <nav class="main-nav" aria-label="Navigation principale">\n' +
    '        ' + navHTML + '\n' +
    '    </nav>\n' +
    '\n' +
    '    <div class="header-auth">\n' +
    '        <p id="user-chip" class="user-chip hidden"></p>\n' +
    '        <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a>\n' +
    '        <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a>\n' +
    '        <button id="logout-btn" class="btn secondary hidden">Déconnecter</button>\n' +
    '    </div>\n' +
    '</header>';

  var headerRoot = document.getElementById('site-header-root');
  if (headerRoot) {
    headerRoot.innerHTML = headerHTML;
  }

  // ═══════════════════════════════════════════════
  //  BARRE MOBILE (source unique — même layout partout)
  // ═══════════════════════════════════════════════
  var mobItems = [
    {
      href: 'index.html', label: 'Accueil',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5L12 3L21 9.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V9.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      href: 'results.html', label: 'Recherche',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ];
  var mobPlus = {
    href: 'post_trip.html',
    label: 'Publier offre',
    icon: '<div class="plus-btn"><span>+</span></div>'
  };
  var mobTail = [
    {
      href: 'chat.html', label: 'Messages',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      href: 'partner.html', label: 'Partenaire', id: 'mobile-partner-link', hidden: true,
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
    },
    {
      href: 'dashboard.html', label: 'Profil',
      icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ];

  var mobNavHTML = '';
  // Items de tête (Accueil, Recherche)
  mobItems.forEach(function (it) {
    var cls = (it.href === activePage) ? 'mob-nav-item active' : 'mob-nav-item';
    mobNavHTML += '\n        <a href="' + it.href + '" class="' + cls + '">\n' +
      '            ' + it.icon + '\n' +
      '            <span>' + it.label + '</span>\n' +
      '        </a>';
  });
  // Bouton central +
  var plusCls = 'mob-nav-item highlight' + (activePage === 'post_trip.html' ? ' active' : '');
  mobNavHTML += '\n        <a href="' + mobPlus.href + '" class="' + plusCls + '">\n' +
    '            ' + mobPlus.icon + '\n' +
    '            <span class="plus-label">' + mobPlus.label + '</span>\n' +
    '        </a>';
  // Items de queue (Messages, Partenaire, Profil)
  mobTail.forEach(function (it) {
    var cls = (it.href === activePage) ? 'mob-nav-item active' : 'mob-nav-item';
    if (it.hidden) cls += ' hidden';
    mobNavHTML += '\n        <a href="' + it.href + '"' + (it.id ? ' id="' + it.id + '"' : '') + ' class="' + cls + '">\n' +
      '            ' + it.icon + '\n' +
      '            <span>' + it.label + '</span>\n' +
      '        </a>';
  });

  var mobNavHTML_full =
    '<nav class="mobile-bottom-nav" aria-label="Navigation mobile">' + mobNavHTML + '\n    </nav>';

  var mobRoot = document.getElementById('mobile-bottom-nav-root');
  if (mobRoot) {
    mobRoot.innerHTML = mobNavHTML_full;
  }

  /* ---------------------------------------------------------------------------
     CIBLES DE GUIDAGE  (mascotte guide — `data-guide`)
     ---------------------------------------------------------------------------
     On pose les attributs data-guide sur les liens de navigation, DESKTOP et
     MOBILE, a un seul endroit : apres le rendu. Chaque lien de nav porte ainsi
     son identifiant de guidage, et le moteur de guidage n'a plus besoin des IDs
     HTML (qui peuvent changer) ni d'un attribut a repeter dans chaque page.
     Le moteur cherche : [data-guide="search"]
     --------------------------------------------------------------------------- */
  var GUIDE_PAR_PAGE = {
    'index.html':     'home',
    'results.html':   'search',
    'post_trip.html': 'publish',
    'chat.html':      'messages',
    'dashboard.html': 'dashboard',
    'partner.html':   'partner'
  };
  function poserCiblesGuide() {
    var liens = document.querySelectorAll(
      'header.site-header .main-nav a.nav-link, .mobile-bottom-nav a.mob-nav-item'
    );
    for (var i = 0; i < liens.length; i++) {
      var a = liens[i];
      if (a.hasAttribute('data-guide')) continue;
      var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      var cible = GUIDE_PAR_PAGE[href];
      if (cible) a.setAttribute('data-guide', cible);
    }
  }
  poserCiblesGuide();
  /* le header mobile peut etre (re)monte apres coup : on repasse une fois. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poserCiblesGuide);
  }

  /* ---------------------------------------------------------------------------
     CLAVIER MOBILE — la navigation ne monte plus avec le clavier
     ---------------------------------------------------------------------------
     Quand un champ recoit le focus, le clavier virtuel reduit la zone visible.
     Les barres fixes (nav basse, barre d'action d'un formulaire) restent alors
     collees au-dessus du clavier et masquent le champ en cours de saisie.
     On mesure la perte de hauteur via visualViewport et on pose `cc-kb-open`
     sur <html> : le CSS fait alors descendre les barres fixes hors de l'ecran,
     ce qui laisse toute la place au champ. Aucun JS a ajouter par page. */
  (function surveillerClavier() {
    var vv = window.visualViewport;
    if (!vv) return;
    var racine = document.documentElement;
    var SEUIL = 140; // px : en dessous, c'est un rebond de barre d'URL
    var etat = false;
    var hauteurRef = 0; // plus grande hauteur vue connue (sans clavier)

    function appliquer() {
      var actuelle = Math.max(racine.clientHeight || 0, window.innerHeight || 0);
      if (actuelle > hauteurRef) hauteurRef = actuelle;
      // iOS: la vue visuelle retrecit ; Android (resizes-content): la mise en
      // page retrecit aussi -> on compare toujours a la plus grande vue connue.
      var perte = hauteurRef - vv.height - (vv.offsetTop || 0);
      var ouvert = perte > SEUIL;
      if (ouvert === etat) return;
      etat = ouvert;
      racine.classList.toggle('cc-kb-open', ouvert);
    }

    vv.addEventListener('resize', appliquer);
    vv.addEventListener('scroll', appliquer);
    window.addEventListener('resize', appliquer);
    window.addEventListener('orientationchange', function () {
      hauteurRef = 0;
      etat = false;
      setTimeout(appliquer, 300);
    });
    appliquer();
  })();
})();
