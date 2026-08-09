/**
 * shared-header.js — Header UNIFIÉ (source unique)
 * Injecte la navigation + logo + auth dans toutes les pages.
 * Détection automatique du lien actif (is-active).
 *
 * Utilisation : ajouter <div id="site-header-root"></div> dans chaque page,
 *               puis <script src="shared-header.js"></script> avant </body>.
 */

(function () {
  'use strict';

  // ── Détection page active ──
  var path = location.pathname.replace(/\/$/, '').split('/').pop() || 'index.html';
  var activePage = path || 'index.html';

  var links = [
    { href: 'index.html',      label: 'Accueil' },
    { href: 'results.html',    label: 'Chercher voyageur' },
    { href: 'post_trip.html',  label: 'Publier une offre' },
    { href: 'chat.html',       label: 'Messages' },
  ];

  var navHTML = links.map(function (l) {
    var cls = (l.href === activePage) ? 'nav-link is-active' : 'nav-link';
    return '<a href="' + l.href + '" class="' + cls + '">' + l.label + '</a>';
  }).join('\n          ') +
    '\n          <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a>';

  // ── Header complet ──
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
    '        <button id="calm-mode-toggle" class="btn ghost btn-sm" title="Mode Calme (Neurodiversité)" style="margin-right: 10px;">\n' +
    '            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">\n' +
    '                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />\n' +
    '            </svg>\n' +
    '        </button>\n' +
    '        <p id="user-chip" class="user-chip hidden"></p>\n' +
    '        <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a>\n' +
    '        <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a>\n' +
    '        <button id="logout-btn" class="btn secondary hidden">Quitter</button>\n' +
    '    </div>\n' +
    '</header>';

  // ── Injection ──
  var root = document.getElementById('site-header-root');
  if (root) {
    root.innerHTML = headerHTML;
  }
})();
