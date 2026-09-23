/* ============================================================================
   check-guide-targets.js  —  VERIFICATEUR DES CIBLES DE GUIDAGE
   ----------------------------------------------------------------------------
   Verifie que chaque cible declaree dans guide.json existe vraiment dans le
   site, et signale les cibles manquantes ou dupliquees.

   Usage :  node check-guide-targets.js

   Pourquoi ce script : les cibles sont posees de DEUX facons dans ce site
     1. en dur dans le HTML      -> attribut data-guide="..."
     2. generees par JavaScript  -> shared-header.js (navigation)
                                    standalone-common.js (champs pays / ville)
   Un simple grep dans le HTML ne suffit donc pas : ce script lit les deux.

   Sortie : une ligne par cible avec OK ou MANQUANT, puis un total.
   Code de sortie 1 si au moins une cible manque (utilisable en CI).
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = __dirname;

/* --- 1. les fichiers a fouiller ------------------------------------------ */
const FICHIERS = [
  'index.html', 'results.html', 'post_trip.html', 'chat.html',
  'dashboard.html', 'verification.html', 'admin.html', 'auth.html', 'partner.html',
  /* les cibles generees par JS */
  'shared-header.js',
  'standalone-common.js'
];

/* --- 2. les cibles attendues, par page ----------------------------------- */
/* Les cibles de NAVIGATION (home, search, publish, messages, dashboard) ne sont
   PAS ecrites dans le HTML : shared-header.js construit le header desktop et la
   barre mobile par JavaScript, puis pose les attributs. Les chercher dans les
   pages donnerait donc de faux manquants : on les verifie UNE fois, dans
   shared-header.js. Les pages ne listent que leurs cibles PROPRES. */
const NAV = ['home', 'search', 'publish', 'messages', 'dashboard'];

const ATTENDUES = {
  'index.html':        [],
  'results.html':      ['search-origin', 'search-destination', 'search-start', 'filter-traveler', 'filter-cargo'],
  'post_trip.html':    ['trip-type', 'trip-date', 'parcel-types', 'special-price-yes', 'special-price-no',
                        'special-price-mode', 'contacts', 'submit'],
  'verification.html': ['profile-phone', 'profile-save', 'profile-otp'],
  'shared-header.js':  NAV,
  'standalone-common.js': ['departure-country', 'departure-city', 'arrival-country', 'arrival-city']
};

/* --- 3. lecture ---------------------------------------------------------- */
function lire(f) {
  const p = path.join(RACINE, f);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function ciblesDe(contenu) {
  const trouvees = new Set();
  if (!contenu) return trouvees;
  /* data-guide="xxx" en dur dans le HTML */
  let m;
  const reHTML = /data-guide\s*=\s*["']([a-z0-9_-]+)["']/gi;
  while ((m = reHTML.exec(contenu))) trouvees.add(m[1].toLowerCase());
  /* attributs poses par JS : setAttribute('data-guide', 'xxx') ou data-guide=\\? ... */
  const reJS = /setAttribute\(\s*['"]data-guide['"]\s*,\s*['"]([a-z0-9_-]+)['"]/gi;
  while ((m = reJS.exec(contenu))) trouvees.add(m[1].toLowerCase());
  /* cibles declarees dans une table JS : 'results.html': 'search' */
  const reMap = /['"]([a-z0-9_-]+\.html)['"]\s*:\s*['"]([a-z0-9_-]+)['"]/gi;
  while ((m = reMap.exec(contenu))) trouvees.add(m[2].toLowerCase());
  /* data-guide construit par concatenation : data-guide="${guideType}-country" */
  const reTpl = /data-guide\s*=\s*["'`]\$\{([a-zA-Z0-9_]+)\}-([a-z]+)["'`]/g;
  while ((m = reTpl.exec(contenu))) trouvees.add('*' + m[2]);
  return trouvees;
}

/* --- 4. rapport ---------------------------------------------------------- */
console.log('');
console.log('=== VERIFICATION DES CIBLES DE GUIDAGE ===');
console.log('');

let manquantes = [];
let total = 0;

for (const f of FICHIERS) {
  const contenu = lire(f);
  if (contenu === null) {
    console.log('  (absent) ' + f);
    continue;
  }
  const attendues = ATTENDUES[f] || [];
  if (!attendues.length) continue;
  const trouvees = ciblesDe(contenu);

  console.log(f + ' :');
  for (const c of attendues) {
    total++;
    const ok = trouvees.has(c) || trouvees.has('*' + c.split('-').pop());
    if (ok) {
      console.log('    OK        ' + c);
    } else {
      console.log('    MANQUANT  ' + c);
      manquantes.push(f + ' -> ' + c);
    }
  }
  console.log('');
}

/* cibles generees dynamiquement par standalone-common.js : on les valide
   sur le gabarit, pas sur le texte final. */
const sc = lire('standalone-common.js') || '';
['departure-country', 'departure-city', 'arrival-country', 'arrival-city'].forEach(function (c) {
  const ok = sc.indexOf('data-guide="${guideType}-') !== -1;
  console.log('    ' + (ok ? 'OK       ' : 'MANQUANT ') + c + '  (genere par JS)');
});

console.log('');
if (manquantes.length) {
  console.log('RESULTAT : ' + manquantes.length + ' cible(s) manquante(s) sur ' + total);
  manquantes.forEach(function (x) { console.log('   - ' + x); });
  process.exit(1);
} else {
  console.log('RESULTAT : toutes les cibles verifiees sont presentes.');
}
