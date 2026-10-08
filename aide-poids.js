/* ═══════════════════════════════════════════════════════════════════════════
   AIDE AU POIDS (P3-4) — formulaire de publication « Espace & prix ».

   But : un voyageur pense souvent en VOLUME (« j'ai une valise de 60 L »), alors
   que la publication demande des KILOS. Cette aide convertit dans les deux sens
   pour l'aider a estimer ce qu'il peut annoncer.

   REGLES TENUES :
   - Conversion SEULEMENT : aucun prix n'est calcule ni suggere ici.
   - Conversion vers le volume = poids / densite. La densite est TOUJOURS visible
     et modifiable par l'utilisateur (materiau courant ou valeur au choix), donc
     rien n'est « invente » a sa place : c'est lui qui fixe l'hypothese.
   - Aucune donnee n'est envoyee : tout se passe dans la page.
   - Le bloc est ajoute par ce fichier (post_trip.html n'est pas modifie en dehors
     de la balise <script>) : si ce fichier ne charge pas, le formulaire reste
     exactement celui d'avant.

   Densites : valeurs de reference usuelles, en kg par litre. « Eau = 1 » sert
   d'etalon ; les autres sont des ordres de grandeur pour un colis.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var DENSITES = [
        { cle: 'eau', nom: 'Eau / liquides', kgL: 1 },
        { cle: 'divers', nom: 'Colis mélangés', kgL: 0.4 },
        { cle: 'vetements', nom: 'Vêtements', kgL: 0.2 },
        { cle: 'farine', nom: 'Farine', kgL: 0.6 },
        { cle: 'riz', nom: 'Riz / légumes secs', kgL: 0.85 },
        { cle: 'papier', nom: 'Livres / papier', kgL: 0.7 },
        { cle: 'autre', nom: 'Autre (au choix)', kgL: null }
    ];

    var nombreLisible = function (n) {
        if (!isFinite(n)) return '';
        var arrondi = Math.round(n * 100) / 100;
        return String(arrondi).replace('.', ',');
    };

    function construire() {
        var champKilos = document.getElementById('kilos');
        if (!champKilos) return;                       // pas de formulaire ici
        if (document.getElementById('aide-poids')) return;

        var groupe = document.getElementById('kilos-group') || champKilos.parentNode;
        var rangee = groupe.closest ? groupe.closest('.form-row') : null;

        var bloc = document.createElement('div');
        bloc.className = 'aide-poids';
        bloc.id = 'aide-poids';
        bloc.innerHTML = [
            '<button type="button" class="aide-poids-bascule" id="aide-poids-bascule" aria-expanded="false" aria-controls="aide-poids-panneau">',
            '  <span class="aide-poids-ico" aria-hidden="true">&#9878;</span>',
            '  <span>Aide : convertir kilos et volume</span>',
            '</button>',
            '<div class="aide-poids-panneau" id="aide-poids-panneau" hidden>',
            '  <p class="aide-poids-intro">Indiquez ce que vous transportez, puis le poids <em>ou</em> le volume : l\'autre valeur se calcule toute seule. Le prix n\'est pas touche.</p>',
            '  <div class="aide-poids-grille">',
            '    <div class="aide-poids-champ">',
            '      <label for="aide-poids-kg">Poids</label>',
            '      <div class="aide-poids-saisie"><input type="number" id="aide-poids-kg" min="0" step="any" inputmode="decimal" placeholder="0"><span>kg</span></div>',
            '    </div>',
            '    <div class="aide-poids-champ">',
            '      <label for="aide-poids-contenu">Contenu</label>',
            '      <select id="aide-poids-contenu">',
            DENSITES.map(function (d) {
                return '        <option value="' + d.cle + '">' + d.nom + '</option>';
            }).join('\n'),
            '      </select>',
            '    </div>',
            '    <div class="aide-poids-champ">',
            '      <label for="aide-poids-densite">Densité (kg par litre)</label>',
            '      <input type="number" id="aide-poids-densite" min="0.01" step="any" inputmode="decimal" value="1">',
            '    </div>',
            '    <div class="aide-poids-champ">',
            '      <label for="aide-poids-litres">Volume</label>',
            '      <div class="aide-poids-saisie"><input type="number" id="aide-poids-litres" min="0" step="any" inputmode="decimal" placeholder="0"><span>L</span></div>',
            '    </div>',
            '  </div>',
            '  <p class="aide-poids-resultat" id="aide-poids-resultat" aria-live="polite"></p>',
            '  <div class="aide-poids-actions">',
            '    <button type="button" class="aide-poids-utiliser" id="aide-poids-utiliser">Utiliser ce poids dans le formulaire</button>',
            '    <button type="button" class="aide-poids-effacer" id="aide-poids-effacer">Effacer</button>',
            '  </div>',
            '  <p class="aide-poids-note">Estimation : le poids réel dépend de ce que vous transportez et de son emballage. Aucun prix n\'est calculé ici.</p>',
            '</div>'
        ].join('\n');

        if (rangee && rangee.parentNode) {
            rangee.parentNode.insertBefore(bloc, rangee.nextSibling);
        } else {
            groupe.appendChild(bloc);
        }

        var bascule = bloc.querySelector('#aide-poids-bascule');
        var panneau = bloc.querySelector('#aide-poids-panneau');
        var kg = bloc.querySelector('#aide-poids-kg');
        var litres = bloc.querySelector('#aide-poids-litres');
        var contenu = bloc.querySelector('#aide-poids-contenu');
        var densite = bloc.querySelector('#aide-poids-densite');
        var resultat = bloc.querySelector('#aide-poids-resultat');

        var densiteCourante = function () {
            var d = parseFloat(String(densite.value).replace(',', '.'));
            return (isFinite(d) && d > 0) ? d : 0;
        };

        var majResultat = function (poids) {
            var d = densiteCourante();
            if (!d || !isFinite(poids) || poids <= 0) {
                resultat.textContent = '';
                return;
            }
            resultat.textContent = nombreLisible(poids) + ' kg \u2248 ' + nombreLisible(poids / d) +
                ' L (à ' + nombreLisible(d) + ' kg/L).';
        };

        var depuisKilos = function () {
            var poids = parseFloat(String(kg.value).replace(',', '.'));
            var d = densiteCourante();
            if (isFinite(poids) && poids > 0 && d) litres.value = nombreLisible(poids / d);
            else if (String(kg.value).trim() === '') litres.value = '';
            majResultat(poids);
        };

        var depuisLitres = function () {
            var vol = parseFloat(String(litres.value).replace(',', '.'));
            var d = densiteCourante();
            if (isFinite(vol) && vol > 0 && d) kg.value = nombreLisible(vol * d);
            else if (String(litres.value).trim() === '') kg.value = '';
            majResultat(parseFloat(String(kg.value).replace(',', '.')));
        };

        var appliquerDensite = function () {
            var choisi = DENSITES.filter(function (x) { return x.cle === contenu.value; })[0];
            if (choisi && choisi.kgL !== null) {
                densite.value = String(choisi.kgL);
                densite.readOnly = true;
                densite.classList.remove('aide-poids-densite-libre');
            } else {
                densite.readOnly = false;
                densite.classList.add('aide-poids-densite-libre');
            }
        };

        bascule.addEventListener('click', function () {
            var ouvert = !panneau.hidden;
            panneau.hidden = ouvert;
            bascule.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
            bloc.classList.toggle('est-ouvert', !ouvert);
            if (!ouvert) kg.focus();
        });

        kg.addEventListener('input', depuisKilos);
        litres.addEventListener('input', depuisLitres);
        contenu.addEventListener('change', function () { appliquerDensite(); depuisKilos(); });
        densite.addEventListener('input', depuisKilos);

        bloc.querySelector('#aide-poids-utiliser').addEventListener('click', function () {
            var poids = parseFloat(String(kg.value).replace(',', '.'));
            if (!isFinite(poids) || poids <= 0) { kg.focus(); return; }
            champKilos.value = String(Math.round(poids * 100) / 100);
            // On previent le formulaire comme si l'utilisateur avait tape la valeur.
            champKilos.dispatchEvent(new Event('input', { bubbles: true }));
            champKilos.dispatchEvent(new Event('change', { bubbles: true }));
            champKilos.focus();
        });

        bloc.querySelector('#aide-poids-effacer').addEventListener('click', function () {
            kg.value = '';
            litres.value = '';
            resultat.textContent = '';
            kg.focus();
        });

        appliquerDensite();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', construire);
    } else {
        construire();
    }
})();
