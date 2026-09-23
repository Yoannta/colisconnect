/* ============================================================================
   MASCOTTE — LE PETIT VOYAGEUR  ·  ColisConnect
   ----------------------------------------------------------------------------
   100 % local : aucune image, aucune librairie, aucun appel réseau.
   Le personnage est dessine en SVG (pieces separees) et anime en CSS ;
   son comportement (marcher, s'arreter, regarder, saluer, parler) est un
   petit automate en JavaScript.

   UTILISATION
     <script src="mascotte.js" defer></script>
     CCMascotte.mount({
       salutation : 'Bonjour ! Vous cherchez quelque chose ?',
       delai      : 7000,      // ms avant qu'il remarque le visiteur
       vitesse    : 46,        // pixels / seconde
       onChat     : function () { ouvrirMonAssistant(); }
     });

   API (disponible sur l'instance retournee par mount() ET sur CCMascotte) :
     mount(opts), relancer(opts), ranger(), enrager(), poser(), choper(x,y),
     relacher(), placer(x,y), jet(force), oublierJet(), monte(),
     saluer(), parler(message), marche(), arret(), stop(), regarder(dir),
     cacher(), afficher(), getPosition(), getSize(), pointer(dir)

   API DE GUIDAGE 2D LIBRE (v2.6) :
     entrerEnLibre(), sortirDeLibre(),
     allerVers(px, py, dureeMs)   -> Promise<boolean>
     walkTo(px, py)               -> Promise<boolean>   (petite distance, jambes)
     flyTo(px, py)                -> Promise<boolean>   (distance moyenne, envol)
     teleportTo(px, py)           -> Promise<boolean>   (tres grande distance)
     pointTo(eltOuX, y)           -> boolean            (se tourne et pointe)
     choisirMode(px, py)          -> 'walk'|'fly'|'teleport'
   ========================================================================== */
(function () {
  'use strict';

  var VERSION = '2.6.0';
  var CLE_FERME = 'cc-mascotte-ferme';   // "ne plus afficher" (30 jours)
  var JOURS     = 30;
  var CLE_JET   = 'cc-mascotte-jet';     // la scene du jet : une seule fois / 12 h
  var REPOS_JET = 12 * 3600 * 1000;
  var VITESSE_JET = 1.2;                 // px/ms : au-dela, c'est un vrai lancer

  /* ---------------------------------------------------- la vue de FACE --- */
  /* Quand on l'attrape (appui long) pour le deplacer, il se retourne : vue
     de face, quatre membres visibles, bouche ronde "hooo". Memes couleurs
     et meme viewBox que la vue de profil.                                    */
  var FACE = [
    '<g class="ccm-face-corps">',
      '<ellipse class="ccm-ombre ccmf-ombre" cx="55" cy="146" rx="27" ry="3.8"/>',
      '<g class="ccmf-corps">',
      '<g class="ccmf-tremble">',

        /* jambes pendantes : la claire devant, l'autre derriere */
        '<g class="ccmf-jambe ccmf-jambe-g">',
          '<rect class="ccm-pantalon" x="43" y="92" width="10" height="38" rx="5"/>',
          '<rect class="ccm-chaussure" x="40.5" y="127" width="15" height="8.5" rx="4.2"/>',
        '</g>',
        '<g class="ccmf-jambe ccmf-jambe-d ccmf-derriere">',
          '<rect class="ccm-pantalon" x="57" y="92" width="10" height="38" rx="5"/>',
          '<rect class="ccm-chaussure" x="55" y="126" width="15" height="8.5" rx="4.2"/>',
        '</g>',

        /* sac a dos qui depasse des deux epaules */
        '<rect class="ccm-sac-caisse" x="41" y="48" width="28" height="18" rx="8"/>',

        /* torse et bretelles */
        '<g class="ccmf-torse">',
          '<rect class="ccm-veste" x="39" y="58" width="32" height="42" rx="14"/>',
          '<rect class="ccm-zippe" x="53.5" y="62" width="3" height="34" rx="1.5"/>',
        '</g>',
        '<rect class="ccm-sac-bretelle" x="43" y="58" width="5" height="30" rx="2.5" transform="rotate(13 45.5 60)"/>',
        '<rect class="ccm-sac-bretelle" x="62" y="58" width="5" height="30" rx="2.5" transform="rotate(-13 64.5 60)"/>',

        /* mains sur les hanches : deux bras plies, invisibles d'habitude.
           C'est la pose de la scene du jet (il te demande s'il doit partir). */
        '<g class="ccmf-hanches-d ccmf-sombre">',
          '<path class="ccmf-akimbo" d="M71.5,63.5 L81,79.5 L69,86.5"/>',
          '<circle class="ccm-peau" cx="69" cy="86.5" r="4.8"/>',
        '</g>',
        '<g class="ccmf-hanches-g">',
          '<path class="ccmf-akimbo" d="M38.5,63.5 L29,79.5 L41,86.5"/>',
          '<circle class="ccm-peau" cx="41" cy="86.5" r="4.8"/>',
        '</g>',

        /* bras arriere : leve, il appelle au secours */
        '<g transform="rotate(-72 71.5 62)">',
          '<g class="ccmf-bras ccmf-bras-d ccmf-sombre">',
            '<rect class="ccm-manche" x="67" y="60" width="9" height="28" rx="4.5"/>',
            '<circle class="ccm-peau" cx="71.5" cy="88" r="5.2"/>',
          '</g>',
        '</g>',

        /* tete de face, effrayee */
        '<g class="ccmf-tete">',
          '<circle class="ccm-cou" cx="55" cy="57" r="8"/>',
          '<circle class="ccm-oreille" cx="35" cy="43" r="4.8"/>',
          '<circle class="ccm-oreille" cx="75" cy="43" r="4.8"/>',
          '<circle class="ccm-peau" cx="55" cy="40" r="20"/>',
          '<path class="ccm-casquette" d="M35,38 A20,20 0 0 1 75,38 Z"/>',
          '<rect class="ccm-casquette-bande" x="35" y="33.5" width="40" height="4.6" rx="2.3"/>',
          '<path class="ccm-casquette-visiere" d="M31,37.5 Q55,31 79,37.5 Q55,41.5 31,37.5 Z"/>',
          '<ellipse class="ccm-joue" cx="40" cy="51.5" rx="3.8" ry="2.4"/>',
          '<ellipse class="ccm-joue" cx="70" cy="51.5" rx="3.8" ry="2.4"/>',
          '<path class="ccm-sourcil ccmf-crainte" d="M40.5,42.5 q5,-3.2 9.8,-1.2"/>',
          '<path class="ccm-sourcil ccmf-crainte" d="M59.7,41.3 q4.8,-2 9.8,1.2"/>',
          /* sourcils "faches" : seulement quand il fait la tete (scene du jet) */
          '<path class="ccm-sourcil ccmf-fache" d="M40.6,41 q5.4,1.9 9.7,1.7"/>',
          '<path class="ccm-sourcil ccmf-fache" d="M59.7,42.7 q4.3,-1.8 9.7,-1.7"/>',
          /* les yeux sont groupes : ils montent et descendent (il te devisage) */
          '<g class="ccmf-yeux">',
            '<ellipse class="ccm-oeil" cx="45.6" cy="46.6" rx="3.8" ry="4.6"/>',
            '<ellipse class="ccm-oeil" cx="64.4" cy="46.6" rx="3.8" ry="4.6"/>',
            '<circle class="ccm-pupille" cx="46.3" cy="44.7" r="1.4"/>',
            '<circle class="ccm-pupille" cx="65.1" cy="44.7" r="1.4"/>',
            '<rect class="ccm-paupiere" x="41.6" y="41.8" width="8" height="9.6" rx="1.2"/>',
            '<rect class="ccm-paupiere" x="60.4" y="41.8" width="8" height="9.6" rx="1.2"/>',
          '</g>',
          '<ellipse class="ccmf-bouche-ronde" cx="55" cy="53.6" rx="4.6" ry="5.4"/>',
          '<ellipse class="ccmf-bouche-fond" cx="55" cy="55" rx="2.7" ry="3.1"/>',
          '<path class="ccmf-bouche-fache" d="M47.3,56.9 q7.7,-5.7 15.4,0"/>',
        '</g>',

        /* bras avant : il serre la valise contre lui */
        '<g class="ccmf-bras ccmf-bras-g">',
          '<rect class="ccm-manche" x="34" y="60" width="9" height="28" rx="4.5"/>',
          '<circle class="ccm-peau" cx="38.5" cy="88" r="5.2"/>',
        '</g>',
        '<g class="ccmf-valise">',
          '<rect class="ccm-valise-poignee" x="35.5" y="87" width="6" height="13" rx="3"/>',
          '<rect class="ccm-valise-barre" x="24" y="95" width="24" height="6" rx="3"/>',
          '<rect class="ccm-valise-caisse" x="18" y="101" width="27" height="36" rx="7"/>',
          '<rect class="ccm-valise-sangle" x="18" y="113" width="27" height="11"/>',
          '<rect class="ccm-valise-loquer" x="27" y="116" width="9" height="4" rx="2"/>',
          '<circle class="ccm-valise-roue" cx="24" cy="138" r="3.4"/>',
          '<circle class="ccm-valise-roue" cx="39" cy="138" r="3.4"/>',
        '</g>',

        /* gouttes de sueur */
        '<circle class="ccmf-goutte ccmf-goutte-1" cx="80" cy="28" r="2.6"/>',
        '<circle class="ccmf-goutte ccmf-goutte-2" cx="86" cy="38" r="2.2"/>',
        '<circle class="ccmf-goutte ccmf-goutte-3" cx="76" cy="18" r="2"/>',

        /* ondes du "hooo" */
        '<path class="ccmf-arc ccmf-arc-1" d="M63,47 q5,6 .6,15"/>',
        '<path class="ccmf-arc ccmf-arc-2" d="M47,47 q-5,6 -.6,15"/>',

      '</g>',
      '</g>',
    '</g>'
  ].join('');

  /* ------------------------------------------------------- le personnage -- */
  /* Vue de profil, tourne vers la droite. viewBox 110 x 155.
     Ordre de dessin = ordre d'empilement (du fond vers l'avant).            */
  var SVG = [
    '<svg class="ccm-svg" viewBox="0 0 110 155" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
      '<g class="ccm-body">',

        /* ombre au sol : le pose par terre */
        '<ellipse class="ccm-ombre" cx="54" cy="145" rx="32" ry="4.2"/>',

        /* valise tiree, derriere lui.
           L'ancre sert a l'immobiliser au sol quand il part la rechercher. */
        '<g class="ccm-valise-ancre"><g class="ccm-valise">',
          '<rect class="ccm-valise-poignee" x="30" y="88" width="5" height="14" rx="2.5"/>',
          '<rect class="ccm-valise-barre"   x="22" y="84" width="20" height="6" rx="3"/>',
          '<rect class="ccm-valise-caisse"  x="12" y="100" width="28" height="38" rx="7"/>',
          '<rect class="ccm-valise-sangle"  x="12" y="112" width="28" height="12"/>',
          '<rect class="ccm-valise-loquer"  x="21" y="115" width="9" height="4" rx="2"/>',
          '<circle class="ccm-valise-roue" cx="19" cy="140" r="3.6"/>',
          '<circle class="ccm-valise-roue" cx="33" cy="140" r="3.6"/>',
        '</g></g>',

        /* bras arriere : il tient la valise */
        '<g transform="rotate(25 52 68)"><g class="ccm-bras ccm-bras-ar">',
          '<rect class="ccm-manche" x="48" y="68" width="8" height="26" rx="4"/>',
          '<circle class="ccm-peau" cx="52" cy="96" r="5.4"/>',
        '</g></g>',

        /* jambe arriere */
        '<g class="ccm-jambe ccm-jambe-ar">',
          '<rect class="ccm-pantalon" x="52" y="96" width="9" height="38" rx="4.5"/>',
          '<rect class="ccm-chaussure" x="50" y="134" width="13" height="8" rx="4"/>',
        '</g>',

        /* torse */
        '<g class="ccm-torse">',
          '<rect class="ccm-veste" x="45" y="60" width="33" height="40" rx="13"/>',
          '<rect class="ccm-zippe" x="60" y="64" width="3" height="32" rx="1.5"/>',
        '</g>',

        /* sac a dos (porte sur le dos, avec bretelle sur la poitrine) */
        '<g class="ccm-sac">',
          '<rect class="ccm-sac-caisse"    x="36" y="68" width="14" height="25" rx="6.5"/>',
          '<rect class="ccm-sac-poche"     x="38.5" y="77" width="9" height="9" rx="4"/>',
          '<rect class="ccm-sac-bretelle"  x="46" y="64" width="5" height="30" rx="2.5" transform="rotate(20 48 66)"/>',
        '</g>',

        /* jambe avant */
        '<g class="ccm-jambe ccm-jambe-av">',
          '<rect class="ccm-pantalon" x="62" y="96" width="9" height="38" rx="4.5"/>',
          '<rect class="ccm-chaussure" x="60" y="134" width="13" height="8" rx="4"/>',
        '</g>',

        /* tete */
        '<g class="ccm-tete">',
          '<circle class="ccm-cou"   cx="62" cy="56" r="7"/>',
          '<circle class="ccm-peau"  cx="62" cy="40" r="20"/>',
          '<circle class="ccm-peau ccm-oreille" cx="51" cy="43" r="4.6"/>',
          '<path class="ccm-cheveux" d="M43,34 q3,-9 12,-11 q-1,6 -2,7 q-6,1 -10,4 Z"/>',
          '<path class="ccm-casquette" d="M42,38 A20,20 0 0 1 82,38 Z"/>',
          '<rect class="ccm-casquette-bande" x="42" y="34" width="40" height="4.5" rx="2.2"/>',
          '<path class="ccm-casquette-visiere" d="M80,35.5 L97,40 Q92,44.5 78,42 Z"/>',
          '<ellipse class="ccm-joue" cx="57" cy="48" rx="3.6" ry="2.3"/>',
          '<path class="ccm-sourcil ccmf-sourire-p" d="M66,34.5 q4.5,-2 8.5,0.4"/>',
          /* le sourcil qui descend vers l'avant : la tete renfrognee */
          '<path class="ccm-sourcil ccmf-fache-p" d="M65.6,32.4 q5.6,1.2 8.9,3.3"/>',
          '<ellipse class="ccm-oeil" cx="70" cy="41.5" rx="2.7" ry="3.1"/>',
          '<circle class="ccm-pupille" cx="71" cy="40.4" r="1"/>',
          '<rect class="ccm-paupiere" x="66.6" y="37.6" width="6.8" height="7.4" rx="1"/>',
          '<path class="ccm-bouche ccmf-sourire-p" d="M66,49.5 q5,4.4 10,-1.2"/>',
          /* la bouche d'enerve : un coin qui tombe, pas un sourire de souris */
          '<path class="ccm-bouche ccmf-fache-p" d="M65.4,50.6 q5.4,-4.4 10.6,1.9"/>',
        '</g>',

        /* petites fumees de colere : invisibles d'habitude */
        '<g class="ccm-vapeur">',
          '<circle cx="28" cy="30" r="3.6"/><circle cx="19" cy="23" r="3"/><circle cx="11" cy="31" r="2.5"/>',
        '</g>',

        /* bras avant : c'est lui qui salue */
        '<g class="ccm-bras ccm-bras-av">',
          '<rect class="ccm-manche" x="66" y="70" width="8" height="26" rx="4"/>',
          '<circle class="ccm-peau" cx="70" cy="98" r="5.4"/>',
        '</g>',

      '</g>',

      FACE,

    '</svg>'
  ].join('');

  /* --------------------------------------------------------------- bulle -- */
  var BULLE = [
    '<div class="ccm-bulle" role="dialog" aria-label="Message du guide">',
      '<button class="ccm-bulle-fermer" type="button" aria-label="Ne plus afficher ce guide">&times;</button>',
      '<p class="ccm-bulle-texte"></p>',
      '<button class="ccm-bulle-ouvrir" type="button">Discuter avec moi</button>',
    '</div>'
  ].join('');

  /* bulle de colere : une etoile qui crache des symboles, jamais de vrais mots */
  var COLERE = [
    '<div class="ccm-colere" role="status">',
      '<svg class="ccm-colere-fond" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">',
        '<path class="ccm-colere-etoile" d="' + etoile(50, 50, 50, 33, 13) + '"/>',
      '</svg>',
      '<span class="ccm-colere-txt">&amp;@#%*! &sect;%?&amp;! #@*!&amp;%</span>',
    '</div>'
  ].join('');

  /* la question du grand depart : il te demande s'il doit partir */
  var ASK = [
    '<div class="ccm-ask" role="dialog" aria-label="Le guide demande s\'il doit partir">',
      '<p class="ccm-ask-txt">Tu veux que je parte&nbsp;?</p>',
      '<div class="ccm-ask-btns">',
        '<button class="ccm-ask-btn ccm-ask-oui" type="button">Oui</button>',
        '<button class="ccm-ask-btn ccm-ask-non" type="button">Non</button>',
      '</div>',
    '</div>'
  ].join('');

  /* la porte, vue de PROFIL (comme lui). Fermee, ce n'est qu'un trait vertical
     avec une poignee ; quand il l'ouvre, tout le panneau pivote vers
     l'interieur (la charniere est a gauche, le bord libre part a droite).
     Deux morceaux exprès : le fond (le montant) reste DERRIERE le personnage,
     le battant passe DEVANT lui (c'est lui qui claque). */
  var PORTE = [
    '<div class="ccm-porte" aria-hidden="true">',
      '<svg class="ccm-porte-svg ccm-porte-fond" viewBox="0 0 96 168" xmlns="http://www.w3.org/2000/svg" focusable="false">',
        '<rect class="ccm-porte-cadre" x="1" y="4" width="7" height="160" rx="3.2"/>',
        '<rect class="ccm-porte-trou" x="8" y="6" width="4" height="158" rx="2"/>',
      '</svg>',
      '<svg class="ccm-porte-svg ccm-porte-battant-svg" viewBox="0 0 96 168" xmlns="http://www.w3.org/2000/svg" focusable="false">',
        '<g class="ccm-porte-battant">',
          '<rect class="ccm-porte-bois" x="8" y="6" width="80" height="158" rx="2"/>',
          '<rect class="ccm-porte-creux" x="16" y="16" width="64" height="52" rx="2"/>',
          '<rect class="ccm-porte-creux" x="16" y="78" width="64" height="74" rx="2"/>',
        '</g>',
        '<g class="ccm-porte-poignee">',
          '<rect class="ccm-porte-barre" x="72" y="86.5" width="14" height="3.2" rx="1.6"/>',
          '<circle class="ccm-porte-bouton" cx="78" cy="88" r="3.6"/>',
        '</g>',
      '</svg>',
    '</div>'
  ].join('');

  /* dessine une etoile : sert de fond a la bulle de colere */
  function etoile(cx, cy, rExterne, rInterne, pointes) {
    var sommets = [], total = pointes * 2, i, angle, rayon;
    for (i = 0; i < total; i++) {
      angle = (Math.PI * 2 * i / total) - Math.PI / 2;
      rayon = (i % 2 === 0) ? rExterne : rInterne;
      sommets.push((cx + rayon * Math.cos(angle)).toFixed(1) + ',' + (cy + rayon * Math.sin(angle)).toFixed(1));
    }
    return 'M' + sommets.join(' L') + ' Z';
  }

  /* ---------------------------------------------------------------- style -- */
  var CSS = [
    /* le rail : toute la largeur, en bas de l'ecran, transparent aux clics */
    '.ccm-root{position:fixed;left:0;right:0;bottom:0;height:110px;pointer-events:none;z-index:60}',
    '.ccm-perso{position:absolute;bottom:8px;left:0;width:56px;height:79px;pointer-events:auto;cursor:pointer;',
      'opacity:0;transform:translateY(10px);transition:opacity .6s ease,transform .6s ease}',
    '.ccm-root.ccm-pret .ccm-perso{opacity:1;transform:translateY(0)}',
    '.ccm-perso.ccm-parti{opacity:0;transform:translateY(16px);pointer-events:none}',
    '.ccm-perso:focus-visible .ccm-svg{outline:2px solid var(--primary,#13ecc8);outline-offset:4px;border-radius:8px}',
    '.ccm-svg{width:100%;height:100%;display:block;overflow:visible;transform-origin:50% 100%;transition:transform .2s ease}',
    '.ccm-perso.ccm-vers-gauche .ccm-svg{transform:scaleX(-1)}',

    /* couleurs (reprend les jetons du site, avec repli sur la charte) */
    '.ccm-svg .ccm-peau{fill:#f6c9a4}',
    '.ccm-svg .ccm-cou{fill:#e3ae86}',
    '.ccm-svg .ccm-oreille{fill:#f0bd97}',
    '.ccm-svg .ccm-cheveux{fill:#3a2c26}',
    '.ccm-svg .ccm-casquette{fill:#0f9c86}',
    '.ccm-svg .ccm-casquette-bande{fill:var(--primary,#13ecc8)}',
    '.ccm-svg .ccm-casquette-visiere{fill:#0b7a68}',
    '.ccm-svg .ccm-oeil{fill:#1d2b32}',
    '.ccm-svg .ccm-ombre{fill:#000000;opacity:.3}',
    '.ccm-svg .ccm-pupille{fill:#ffffff}',
    '.ccm-svg .ccm-joue{fill:#f2a288;opacity:.55}',
    '.ccm-svg .ccm-sourcil{fill:none;stroke:#3a2c26;stroke-width:1.7;stroke-linecap:round}',
    '.ccm-svg .ccm-bouche{fill:none;stroke:#a4553c;stroke-width:2;stroke-linecap:round}',
    '.ccm-svg .ccm-veste{fill:#0e6b5e}',
    '.ccm-svg .ccm-zippe{fill:#0a544a}',
    '.ccm-svg .ccm-manche{fill:#128a76}',
    '.ccm-svg .ccm-bras-ar .ccm-manche{fill:#0b5449}',
    '.ccm-svg .ccm-pantalon{fill:#17495a}',
    '.ccm-svg .ccm-jambe-ar .ccm-pantalon{fill:#123743}',
    '.ccm-svg .ccm-chaussure{fill:#e9eef1}',
    '.ccm-svg .ccm-jambe-ar .ccm-chaussure{fill:#c9d3d8}',
    '.ccm-svg .ccm-sac-caisse{fill:#f0b429}',
    '.ccm-svg .ccm-sac-poche{fill:#d29a1f}',
    '.ccm-svg .ccm-sac-bretelle{fill:#c8951f}',
    '.ccm-svg .ccm-valise-caisse{fill:#0b6b5c}',
    '.ccm-svg .ccm-valise-sangle{fill:#0a574b}',
    '.ccm-svg .ccm-valise-loquer{fill:#f0b429}',
    '.ccm-svg .ccm-valise-barre{fill:#5b6a70}',
    '.ccm-svg .ccm-valise-poignee{fill:#93a1a6}',
    '.ccm-svg .ccm-valise-roue{fill:#22313a}',

    /* pivots des membres */
    '.ccm-svg .ccm-body,.ccm-svg .ccm-jambe,.ccm-svg .ccm-bras,.ccm-svg .ccm-tete,',
      '.ccm-svg .ccm-torse,.ccm-svg .ccm-sac,.ccm-svg .ccm-valise{transform-box:fill-box}',
    '.ccm-svg .ccm-body{transform-origin:50% 100%}',
    '.ccm-svg .ccm-jambe{transform-origin:50% 4%}',
    '.ccm-svg .ccm-bras{transform-origin:50% 2%}',
    '.ccm-svg .ccm-tete{transform-origin:50% 92%}',
    '.ccm-svg .ccm-torse{transform-origin:50% 100%}',
    '.ccm-svg .ccm-sac{transform-origin:50% 6%}',
    '.ccm-svg .ccm-valise{transform-origin:88% 4%}',

    /* clignement des yeux : toujours actif, c'est ce qui le rend vivant */
    '.ccm-svg .ccm-paupiere{fill:#f6c9a4;transform-box:fill-box;transform-origin:50% 0;',
      'transform:scaleY(0);animation:ccmCligne 5s ease-in-out infinite}',

    /* etats */
    '.ccm-root.ccm-marche .ccm-jambe-av{animation:ccmPasAv .58s ease-in-out infinite}',
    '.ccm-root.ccm-marche .ccm-jambe-ar{animation:ccmPasAr .58s ease-in-out infinite}',
    '.ccm-root.ccm-marche .ccm-bras-av{animation:ccmBrasAv .58s ease-in-out infinite}',
    '.ccm-root.ccm-marche .ccm-bras-ar{animation:ccmBrasAr .58s ease-in-out infinite}',
    '.ccm-root.ccm-marche .ccm-body{animation:ccmFlotte 1.16s ease-in-out infinite}',
    '.ccm-root.ccm-marche .ccm-valise{animation:ccmValise .58s ease-in-out infinite}',
    '.ccm-root.ccm-repos .ccm-body{animation:ccmRespire 3.6s ease-in-out infinite}',
    '.ccm-root.ccm-repos .ccm-tete{animation:ccmBalance 6.4s ease-in-out infinite}',
    '.ccm-root.ccm-regarde .ccm-tete{animation:ccmRegarde 1.9s ease-in-out}',
    '.ccm-root.ccm-salue .ccm-bras-av{animation:ccmSalut 1.8s ease-in-out}',
    '.ccm-root.ccm-ecoute .ccm-tete{animation:ccmEcoute 2.6s ease-in-out infinite}',
    '.ccm-root.ccm-fige .ccm-perso *{animation:none !important;transition:none !important}',
    '.ccm-root.ccm-fige .ccm-paupiere{transform:scaleY(0)}',

    /* bulle */
    '.ccm-bulle{position:absolute;left:50%;bottom:calc(100% - 4px);transform:translate(-50%,8px);',
      'width:max-content;max-width:min(76vw,280px);background:#0b1116;color:#eef7f5;',
      'border:1px solid rgba(19,236,200,.32);border-radius:16px;padding:12px 34px 12px 14px;',
      'font:500 13.5px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:left;',
      'box-shadow:0 12px 34px rgba(0,0,0,.5);opacity:0;pointer-events:none;',
      'transition:opacity .35s ease,transform .35s ease}',
    '.ccm-root.ccm-parle .ccm-bulle{opacity:1;transform:translate(-50%,0);pointer-events:auto}',
    '.ccm-bulle:after{content:"";position:absolute;left:50%;bottom:-7px;width:12px;height:12px;',
      'background:#0b1116;border-right:1px solid rgba(19,236,200,.32);',
      'border-bottom:1px solid rgba(19,236,200,.32);transform:translateX(-50%) rotate(45deg)}',
    '.ccm-bulle-texte{margin:0 0 9px;display:block}',
    '.ccm-bulle-ouvrir{background:var(--primary,#13ecc8);color:#04201c;border:0;border-radius:999px;',
      'padding:6px 14px;font:700 12.5px/1 inherit;cursor:pointer}',
    '.ccm-bulle-ouvrir:hover{filter:brightness(1.08)}',
    '.ccm-bulle-fermer{position:absolute;top:3px;right:5px;background:none;border:0;color:#eef7f5;',
      'opacity:.5;font-size:17px;line-height:1;cursor:pointer;padding:4px}',
    '.ccm-bulle-fermer:hover{opacity:1}',

    /* --- colere : il rougit, il fume, il jette sa valise --- */
    '.ccm-svg .ccm-tete .ccm-peau,.ccm-svg .ccm-tete .ccm-oreille{transition:fill .25s ease}',
    '.ccm-svg .ccm-vapeur{opacity:0;transition:opacity .3s ease;transform-box:fill-box;transform-origin:50% 100%}',
    '.ccm-svg .ccm-vapeur circle{fill:#ff9c86}',
    '.ccm-root.ccm-enerve .ccm-tete .ccm-peau{fill:#e2564a}',
    '.ccm-root.ccm-enerve .ccm-tete .ccm-oreille{fill:#d9453a}',
    '.ccm-root.ccm-enerve .ccm-joue{fill:#d1604f;opacity:.8}',
    '.ccm-root.ccm-enerve .ccm-sourcil{stroke:#7d1a12}',
    '.ccm-root.ccm-enerve .ccm-bouche{stroke:#8d1f16;stroke-width:2.6}',
    '.ccm-root.ccm-enerve .ccm-tete{animation:ccmFurie .46s ease-in-out infinite}',
    '.ccm-root.ccm-enerve .ccm-body{animation:ccmTremble .13s linear infinite}',
    '.ccm-root.ccm-enerve .ccm-vapeur{opacity:.95;animation:ccmVapeur 1.3s ease-in-out infinite}',
    '.ccm-root.ccm-jette .ccm-valise,.ccm-root.ccm-reprise .ccm-valise{transform-origin:50% 55%}',
    '.ccm-root.ccm-jette .ccm-valise{animation:ccmJet 1.15s cubic-bezier(.25,.1,.55,1) forwards}',
    '.ccm-root.ccm-jette .ccm-bras-av{animation:ccmLance 1.15s ease-out}',
    '.ccm-root.ccm-jette .ccm-bras-ar{animation:ccmLanceAr .9s ease-out}',
    '.ccm-root.ccm-jette .ccm-sac{animation:ccmSacSecoue .9s ease-out}',
    '.ccm-root.ccm-reprise .ccm-valise{animation:ccmReprend .48s ease-out forwards}',
    '.ccm-colere{position:absolute;left:50%;bottom:calc(100% - 2px);transform:translate(-50%,10px) scale(.88);',
      'opacity:0;pointer-events:none;padding:15px 22px;width:max-content;max-width:min(78vw,300px);',
      'transition:opacity .22s ease,transform .22s ease;z-index:3}',
    '.ccm-root.ccm-crie .ccm-colere{opacity:1;transform:translate(-50%,0) scale(1)}',
    '.ccm-colere-fond{position:absolute;left:0;top:0;width:100%;height:100%;display:block}',
    '.ccm-colere-etoile{fill:#2b0f0c;stroke:#ff5f49;stroke-width:2.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}',
    '.ccm-colere-txt{position:relative;display:block;font:800 15px/1.15 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
      'color:#ff9c86;letter-spacing:.6px;white-space:nowrap;text-align:center}',
    /* --- il reflechit un instant --- */
    '.ccm-root.ccm-reflechit .ccm-tete{animation:ccmReflechit 2.6s ease-in-out}',
    '.ccm-root.ccm-reflechit .ccm-body{animation:ccmRespire 3.2s ease-in-out infinite}',
    /* --- il s'est pose dans son coin : il vit au ralenti --- */
    '.ccm-root.ccm-pose .ccm-body{animation:ccmRespire 4.4s ease-in-out infinite}',
    '.ccm-root.ccm-pose .ccm-tete{animation:ccmBalance 7.5s ease-in-out infinite}',

    /* --- on l'attrape : il flotte, effraye, vue de FACE ------------------ */
    '.ccm-svg .ccm-face-corps{opacity:0;pointer-events:none;transition:opacity .16s ease}',
    '.ccm-root.ccm-flotte .ccm-svg .ccm-face-corps,.ccm-root.ccm-face .ccm-svg .ccm-face-corps{opacity:1}',
    '.ccm-svg .ccm-body{transition:opacity .16s ease}',
    '.ccm-root.ccm-flotte .ccm-svg .ccm-body,.ccm-root.ccm-face .ccm-svg .ccm-body{opacity:0}',
    '.ccm-svg .ccmf-derriere .ccm-pantalon{fill:#123743}',
    '.ccm-svg .ccmf-derriere .ccm-chaussure{fill:#c9d3d8}',
    '.ccm-svg .ccmf-sombre .ccm-manche{fill:#0b5449}',
    '.ccm-svg .ccmf-bouche-ronde{fill:#8d1f16}',
    '.ccm-svg .ccmf-bouche-fond{fill:#5a0d08}',
    '.ccm-svg .ccmf-goutte{fill:#8fd8ea;opacity:.9}',
    '.ccm-svg .ccmf-arc{fill:none;stroke:#bfeee6;stroke-width:1.6;opacity:0}',
    '.ccm-svg .ccmf-jambe,.ccm-svg .ccmf-bras,.ccm-svg .ccmf-tete,.ccm-svg .ccmf-valise,',
    '.ccm-svg .ccmf-ombre,.ccm-svg .ccmf-bouche-ronde,.ccm-svg .ccmf-goutte,.ccm-svg .ccmf-arc{transform-box:fill-box}',
    '.ccm-svg .ccmf-jambe{transform-origin:50% 3%}',
    '.ccm-svg .ccmf-bras{transform-origin:50% 5%}',
    '.ccm-svg .ccmf-tete{transform-origin:50% 92%}',
    '.ccm-svg .ccmf-valise{transform-origin:88% 2%}',
    '.ccm-svg .ccmf-ombre,.ccm-svg .ccmf-bouche-ronde,.ccm-svg .ccmf-goutte,.ccm-svg .ccmf-arc{transform-origin:50% 50%}',
    '.ccm-root.ccm-flotte .ccmf-corps{animation:ccmFuitFlotte 1.5s ease-in-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-tremble{animation:ccmFuitTremble .1s linear infinite}',
    '.ccm-root.ccm-flotte .ccmf-tete{animation:ccmFuitTete 1.05s ease-in-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-bras-d{animation:ccmFuitBras .42s ease-in-out infinite alternate}',
    '.ccm-root.ccm-flotte .ccmf-jambe-g{animation:ccmFuitJambe .62s ease-in-out infinite alternate}',
    '.ccm-root.ccm-flotte .ccmf-jambe-d{animation:ccmFuitJambeB .58s ease-in-out infinite alternate}',
    '.ccm-root.ccm-flotte .ccmf-valise{animation:ccmFuitValise .74s ease-in-out infinite alternate}',
    '.ccm-root.ccm-flotte .ccmf-ombre{animation:ccmFuitOmbre 1.5s ease-in-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-bouche-ronde{animation:ccmFuitBouche .66s ease-in-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-goutte{animation:ccmFuitGoutte 1.3s ease-in-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-goutte-2{animation-delay:.45s}',
    '.ccm-root.ccm-flotte .ccmf-goutte-3{animation-delay:.9s}',
    '.ccm-root.ccm-flotte .ccmf-arc{animation:ccmFuitArc 1.05s ease-out infinite}',
    '.ccm-root.ccm-flotte .ccmf-arc-2{animation-delay:.4s}',

    /* --- on le tient, puis on le depose ou l'on veut dans la page -------- */
    '.ccm-perso{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    '.ccm-perso.ccm-saisi{cursor:grabbing}',
    '.ccm-perso.ccm-libre{position:fixed;bottom:auto}',
    /* --- guidage 2D libre : envol (flyTo) ------------------------------- */
    '.ccm-root.ccm-envol .ccm-perso{animation:ccmEnvol .58s ease-in-out infinite alternate}',
    '.ccm-root.ccm-envol .ccm-ombre{opacity:.12}',
    '@keyframes ccmEnvol{0%{transform:translateY(0)}100%{transform:translateY(-12px)}}',
    /* --- guidage 2D libre : teleportation (teleportTo) ------------------ */
    '.ccm-perso.ccm-teleporte{opacity:0;transition:opacity .2s ease}',
    /* --- guidage 2D libre : il pointe du doigt (pointTo) ---------------- */
    '.ccm-svg .ccm-bras-av{transition:transform .32s ease}',
    '.ccm-root.ccm-pointe .ccm-bras-av{transform:rotate(-88deg)}',
    '.ccm-perso.ccm-bulle-bas .ccm-bulle{top:calc(100% - 6px);bottom:auto;transform:translate(-50%,-8px)}',
    '.ccm-root.ccm-parle .ccm-perso.ccm-bulle-bas .ccm-bulle{transform:translate(-50%,0)}',
    '.ccm-perso.ccm-bulle-bas .ccm-bulle:after{top:-7px;bottom:auto;transform:translateX(-50%) rotate(225deg)}',
    '.ccm-perso.ccm-bulle-bas .ccm-colere{top:calc(100% - 4px);bottom:auto}',

    /* --- les mouvements de la vue de face ------------------------------- */
    '@keyframes ccmFuitFlotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
    '@keyframes ccmFuitTremble{0%,100%{transform:translate(.9px,0)}50%{transform:translate(-.9px,0)}}',
    '@keyframes ccmFuitTete{0%,100%{transform:rotate(-4.5deg)}50%{transform:rotate(4.5deg)}}',
    '@keyframes ccmFuitBras{0%{transform:rotate(-6deg)}100%{transform:rotate(9deg)}}',
    '@keyframes ccmFuitJambe{0%{transform:rotate(-13deg)}100%{transform:rotate(11deg)}}',
    '@keyframes ccmFuitJambeB{0%{transform:rotate(11deg)}100%{transform:rotate(-13deg)}}',
    '@keyframes ccmFuitValise{0%{transform:rotate(-2.5deg)}100%{transform:rotate(2.5deg)}}',
    '@keyframes ccmFuitOmbre{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(.76);opacity:.15}}',
    '@keyframes ccmFuitBouche{0%,100%{transform:scale(1,1)}50%{transform:scale(1.14,1.26)}}',
    '@keyframes ccmFuitGoutte{0%{transform:translate(0,0) scale(.5);opacity:0}30%{opacity:.9}100%{transform:translate(5px,-22px) scale(1);opacity:0}}',
    '@keyframes ccmFuitArc{0%{transform:scale(.4);opacity:.85}100%{transform:scale(1.6);opacity:0}}',

    /* ===== la scene du jet : il tombe, il demande, il part =============== */
    /* la vue de face, mais calme : sans la panique de la fuite */
    '.ccm-root.ccm-face .ccm-svg .ccm-face-corps{opacity:1}',
    '.ccm-root.ccm-face .ccm-svg .ccm-body{opacity:0}',
    /* son visage fache : sourcils fronces et bouche en coin */
    '.ccm-svg .ccmf-fache{opacity:0;transition:opacity .2s ease}',
    '.ccm-svg .ccmf-bouche-fache{opacity:0;fill:none;stroke:#a4553c;stroke-width:2;stroke-linecap:round}',
    /* les bras plies : invisibles d'habitude */
    '.ccm-svg .ccmf-hanches-g,.ccm-svg .ccmf-hanches-d{opacity:0;transition:opacity .2s ease}',
    '.ccm-svg .ccmf-akimbo{fill:none;stroke:#128a76;stroke-width:8.4;stroke-linecap:round;stroke-linejoin:round}',
    '.ccm-svg .ccmf-sombre .ccmf-akimbo{stroke:#0b5449}',
    /* la pose : les poings sur les hanches, plus de sueur, plus de "hooo" */
    '.ccm-root.ccm-hanches .ccmf-crainte{opacity:0}',
    '.ccm-root.ccm-hanches .ccmf-fache{opacity:1}',
    '.ccm-root.ccm-hanches .ccmf-bouche-fache{opacity:1}',
    '.ccm-root.ccm-hanches .ccmf-bouche-ronde,.ccm-root.ccm-hanches .ccmf-bouche-fond{opacity:0}',
    '.ccm-root.ccm-hanches .ccmf-goutte,.ccm-root.ccm-hanches .ccmf-arc{display:none}',
    '.ccm-root.ccm-hanches .ccmf-hanches-g,.ccm-root.ccm-hanches .ccmf-hanches-d{opacity:1}',
    '.ccm-root.ccm-hanches .ccmf-bras-g,.ccm-root.ccm-hanches .ccmf-bras-d{opacity:0}',
    /* il te devisage : les yeux montent et descendent */
    '.ccm-svg .ccmf-yeux{transition:transform .17s ease}',
    '.ccm-root.ccm-regard-haut .ccmf-tete{transform:translateY(-1.8px)}',
    '.ccm-root.ccm-regard-bas .ccmf-tete{transform:translateY(2.3px)}',
    '.ccm-root.ccm-regard-haut .ccmf-yeux{transform:translateY(-2.3px)}',
    '.ccm-root.ccm-regard-bas .ccmf-yeux{transform:translateY(2.7px)}',
    /* il tombe : il bascule sur le cote... */
    '.ccm-root.ccm-tombe-d .ccm-svg{transform:rotate(78deg);transition:transform .3s cubic-bezier(.5,0,.9,.42)}',
    '.ccm-root.ccm-tombe-g .ccm-svg{transform:rotate(-78deg);transition:transform .3s cubic-bezier(.5,0,.9,.42)}',
    /* ... puis il se releve, un peu vexe */
    '.ccm-root.ccm-releve-d .ccm-svg{animation:ccmReleveD .72s cubic-bezier(.3,1.15,.4,1)}',
    '.ccm-root.ccm-releve-g .ccm-svg{animation:ccmReleveG .72s cubic-bezier(.3,1.15,.4,1)}',
    /* sa valise, posee au sol pendant qu'il a les poings sur les hanches */
    '.ccm-svg .ccmf-valise{transition:transform .4s ease}',
    '.ccm-root.ccm-valise-sol .ccmf-valise{transform:translate(-1px,1.5px) rotate(-5deg)}',
    /* il boude : la tete rentre dans les epaules */
    '.ccm-root.ccm-boude .ccm-tete{transform:translateY(3.4px) rotate(3deg)}',
    '.ccm-root.ccm-boude .ccm-bras-av{animation:ccmBoudeBras 1.6s ease-in-out infinite alternate}',
    /* la question "tu veux que je parte ?" */
    '.ccm-ask{position:absolute;left:50%;bottom:calc(100% - 4px);transform:translate(-50%,8px) scale(.92);',
      'width:max-content;max-width:min(76vw,240px);background:#0b1116;color:#eef7f5;',
      'border:1px solid rgba(19,236,200,.32);border-radius:16px;padding:11px 14px;text-align:center;',
      'font:600 13.5px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
      'box-shadow:0 12px 34px rgba(0,0,0,.5);opacity:0;pointer-events:none;z-index:4;',
      'transition:opacity .24s ease,transform .24s ease}',
    '.ccm-root.ccm-demande .ccm-ask{opacity:1;transform:translate(-50%,0) scale(1);pointer-events:auto}',
    '.ccm-ask:after{content:"";position:absolute;left:50%;bottom:-7px;width:12px;height:12px;',
      'background:#0b1116;border-right:1px solid rgba(19,236,200,.32);',
      'border-bottom:1px solid rgba(19,236,200,.32);transform:translateX(-50%) rotate(45deg)}',
    '.ccm-ask-txt{margin:0 0 10px;display:block}',
    '.ccm-ask-btns{display:flex;gap:8px;justify-content:center}',
    '.ccm-ask-btn{border:0;border-radius:999px;padding:7px 16px;font:700 12.5px/1 inherit;cursor:pointer}',
    '.ccm-ask-oui{background:var(--primary,#13ecc8);color:#04201c}',
    '.ccm-ask-non{background:rgba(238,247,245,.14);color:#eef7f5}',
    '.ccm-ask-btn:hover{filter:brightness(1.08)}',
    '.ccm-perso.ccm-bulle-bas .ccm-ask{top:calc(100% - 6px);bottom:auto;transform:translate(-50%,-8px) scale(.92)}',
    '.ccm-root.ccm-demande .ccm-perso.ccm-bulle-bas .ccm-ask{transform:translate(-50%,0) scale(1)}',
    '.ccm-perso.ccm-bulle-bas .ccm-ask:after{top:-7px;bottom:auto;transform:translateX(-50%) rotate(225deg)}',
    /* la tete renfrognee : la meme colere que les poings sur les hanches, mais
       sans le rouge ni les tremblements. En profil, le sourcil descend vers
       l'avant et le coin de la bouche tombe (sinon il sourit comme une souris). */
    '.ccm-svg .ccmf-sourire-p,.ccm-svg .ccmf-fache-p{transition:opacity .2s ease}',
    '.ccm-svg .ccmf-fache-p{opacity:0}',
    '.ccm-root.ccm-fronce .ccmf-sourire-p{opacity:0}',
    '.ccm-root.ccm-fronce .ccmf-fache-p{opacity:1}',
    '.ccm-root.ccm-fronce .ccmf-crainte{opacity:0}',
    '.ccm-root.ccm-fronce .ccmf-fache{opacity:1}',
    '.ccm-root.ccm-fronce .ccmf-bouche-fache{opacity:1}',
    '.ccm-root.ccm-fronce .ccmf-bouche-ronde,.ccm-root.ccm-fronce .ccmf-bouche-fond{opacity:0}',
    '.ccm-root.ccm-fronce .ccmf-goutte,.ccm-root.ccm-fronce .ccmf-arc{display:none}',
    /* de face, il ne leve plus le bras "au secours" : il te devisage, la valise a la main */
    '.ccm-root.ccm-fronce .ccmf-bras-d{opacity:0}',
    /* la porte, vue de PROFIL (comme lui). Fermee, ce n'est qu'un trait avec une
       poignee ; quand il l'ouvre, tout le panneau pivote vers l'interieur.
       Le fond (le montant) reste derriere lui, le battant passe devant. */
    '.ccm-porte-svg{position:fixed;display:block;opacity:0;transform:translateY(6px) scale(.72);',
      'transform-origin:50% 100%;transition:opacity .3s ease,transform .32s cubic-bezier(.2,1.1,.4,1)}',
    '.ccm-porte.ccm-porte-pose .ccm-porte-svg{opacity:1;transform:none}',
    '.ccm-porte-mi .ccm-porte-svg{transform:translateY(6px) scale(.72) scaleX(-1)}',
    '.ccm-porte-mi.ccm-porte-pose .ccm-porte-svg{transform:scaleX(-1)}',
    '.ccm-porte-fond{z-index:-1}',
    '.ccm-porte-battant-svg{z-index:1}',
    '.ccm-porte-trou{fill:#0d1519}',
    '.ccm-porte-cadre{fill:#63727b}',
    '.ccm-porte-bois{fill:#12826e}',
    '.ccm-porte-creux{fill:#0c5b4d}',
    '.ccm-porte-barre{fill:#cbd6da}',
    '.ccm-porte-bouton{fill:#f0c04a}',
    /* le panneau pivote sur sa charniere (le montant, a gauche) */
    '.ccm-porte-battant{transform-box:fill-box;transform-origin:0% 50%;',
      'transform:scaleX(.05);transition:transform .5s cubic-bezier(.34,0,.22,1)}',
    '.ccm-porte.ouvre .ccm-porte-battant{transform:scaleX(1)}',
    /* la poignee suit le bord libre : sur le trait quand c'est ferme */
    '.ccm-porte-poignee{transform:translateX(-68px);transition:transform .5s cubic-bezier(.34,0,.22,1)}',
    '.ccm-porte.ouvre .ccm-porte-poignee{transform:translateX(0)}',
    '.ccm-porte.claque .ccm-porte-battant{animation:ccmClaque .34s cubic-bezier(.2,.9,.3,1)}',
    '.ccm-porte.claque .ccm-porte-poignee{animation:ccmClaqueP .34s cubic-bezier(.2,.9,.3,1)}',
    '.ccm-porte.claque .ccm-porte-fond{animation:ccmSecoue .34s ease-out}',
    /* il pousse la porte de la main */
    '.ccm-root.ccm-pousse .ccm-bras-av{animation:ccmPousse .7s ease-in-out}',
    '@keyframes ccmReleveD{0%{transform:rotate(78deg)}46%{transform:rotate(-11deg)}70%{transform:rotate(6deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmReleveG{0%{transform:rotate(-78deg)}46%{transform:rotate(11deg)}70%{transform:rotate(-6deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmClaque{0%{transform:scaleX(1)}68%{transform:scaleX(.026)}100%{transform:scaleX(.05)}}',
    '@keyframes ccmClaqueP{0%{transform:translateX(0)}68%{transform:translateX(-70.4px)}100%{transform:translateX(-68px)}}',
    '@keyframes ccmSecoue{0%,100%{transform:translate(0,0)}25%{transform:translate(2.5px,0)}60%{transform:translate(-1.6px,0)}}',
    '@keyframes ccmPousse{0%{transform:rotate(0)}30%{transform:rotate(-72deg)}62%{transform:rotate(-64deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmBoudeBras{0%{transform:rotate(2deg)}100%{transform:rotate(-3.5deg)}}',

    /* ---- SA TAILLE -------------------------------------------------------
       Il fait la MOITIE de sa taille d'origine (110 x 155 px au depart).
       Tout le reste suit tout seul : la porte, la distance de marche, la
       position des bulles et les gestes se calculent a partir de
       perso.offsetWidth / offsetHeight. Pour le regrossir : remonter la
       valeur de base (56 x 79) et les trois paliers ci-dessous. */
    '@media (min-width:1500px){.ccm-root{height:122px}.ccm-perso{width:64px;height:90px}}',
    '@media (max-width:900px){.ccm-root{height:100px}.ccm-perso{width:50px;height:70px}}',
    '@media (max-width:620px){.ccm-root{height:92px}.ccm-perso{width:46px;height:65px;bottom:6px}}',
    '@media (max-width:620px){.ccm-bulle{font-size:13px;max-width:70vw}}',

    /* mode calme du navigateur = personnage immobile */
    '@media (prefers-reduced-motion:reduce){.ccm-root .ccm-svg *{animation:none !important}}',

    /* animations */
    '@keyframes ccmPasAv{0%,100%{transform:rotate(15deg)}50%{transform:rotate(-17deg)}}',
    '@keyframes ccmPasAr{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(17deg)}}',
    '@keyframes ccmBrasAv{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}',
    '@keyframes ccmBrasAr{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-14deg)}}',
    '@keyframes ccmFlotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.4px)}}',
    '@keyframes ccmValise{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}',
    '@keyframes ccmRespire{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-1px) scaleY(1.012)}}',
    '@keyframes ccmBalance{0%,100%{transform:rotate(0)}30%{transform:rotate(-2deg)}70%{transform:rotate(2deg)}}',
    '@keyframes ccmRegarde{0%{transform:rotate(0)}22%{transform:rotate(-13deg)}46%{transform:rotate(-13deg)}',
      '70%{transform:rotate(9deg)}86%{transform:rotate(9deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmSalut{0%{transform:rotate(-8deg)}16%{transform:rotate(-128deg)}28%{transform:rotate(-106deg)}',
      '40%{transform:rotate(-128deg)}52%{transform:rotate(-106deg)}64%{transform:rotate(-128deg)}',
      '80%{transform:rotate(-132deg)}100%{transform:rotate(-8deg)}}',
    '@keyframes ccmEcoute{0%,100%{transform:rotate(0)}45%{transform:rotate(-6deg)}75%{transform:rotate(2deg)}}',
    '@keyframes ccmFurie{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}',
    '@keyframes ccmTremble{0%,100%{transform:translate(0,0)}25%{transform:translate(-.9px,0)}75%{transform:translate(.9px,0)}}',
    '@keyframes ccmVapeur{0%{transform:translate(0,0) scale(.6);opacity:.5}55%{opacity:.95}100%{transform:translate(4px,-12px) scale(1.2);opacity:0}}',
    '@keyframes ccmJet{0%{transform:translate(0,0) rotate(0)}14%{transform:translate(-9px,-13px) rotate(-18deg)}',
      '34%{transform:translate(74px,-66px) rotate(170deg)}56%{transform:translate(142px,-24px) rotate(302deg)}',
      '74%{transform:translate(170px,-2px) rotate(396deg)}84%{transform:translate(170px,-15px) rotate(436deg)}',
      '93%{transform:translate(170px,0) rotate(452deg)}100%{transform:translate(170px,0) rotate(450deg)}}',
    '@keyframes ccmLance{0%{transform:rotate(0)}12%{transform:rotate(54deg)}26%{transform:rotate(-104deg)}',
      '42%{transform:rotate(-118deg)}70%{transform:rotate(-58deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmLanceAr{0%{transform:rotate(0)}14%{transform:rotate(36deg)}30%{transform:rotate(-70deg)}',
      '60%{transform:rotate(-36deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmSacSecoue{0%{transform:rotate(0)}18%{transform:rotate(-9deg)}34%{transform:rotate(7deg)}52%{transform:rotate(-5deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmReprend{0%{transform:translate(170px,0) rotate(450deg)}100%{transform:translate(0,0) rotate(360deg)}}',
    '@keyframes ccmReflechit{0%{transform:rotate(0)}18%{transform:rotate(9deg)}58%{transform:rotate(9deg)}84%{transform:rotate(2deg)}100%{transform:rotate(0)}}',
    '@keyframes ccmCligne{0%,92%,100%{transform:scaleY(0)}94.5%,96.5%{transform:scaleY(1)}}'
  ].join('');

  /* ---------------------------------------------------------------- outils -- */
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injecterCss() {
    if (document.getElementById('ccm-style')) return;
    var s = document.createElement('style');
    s.id = 'ccm-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function estFerme() {
    try {
      var t = localStorage.getItem(CLE_FERME);
      if (!t) return false;
      if (Date.now() - parseInt(t, 10) > JOURS * 864e5) return false;
      return true;
    } catch (e) { return false; }
  }

  function marquerFerme() {
    try { localStorage.setItem(CLE_FERME, String(Date.now())); } catch (e) {}
  }

  function oublierFermeture() {
    try { localStorage.removeItem(CLE_FERME); } catch (e) {}
  }

  /* on efface le compteur du jet : la scene pourra se rejouer tout de suite */
  function oublierJet() {
    try { localStorage.removeItem(CLE_JET); } catch (e) {}
  }

  /* ------------------------------------------------------------- la vie ---- */
  function demarrer(o) {
    if (estFerme()) return null;

    injecterCss();

    var delai   = typeof o.delai === 'number' ? o.delai : 7000;
    var vitesse = typeof o.vitesse === 'number' ? o.vitesse : 46;
    var texte   = o.salutation || 'Bonjour ! Vous cherchez quelque chose ? Je peux vous aider.';
    var calme   = !!o.calme || document.body.classList.contains('is-calm');

    /* Seuils du guidage 2D. Valeurs par defaut alignees sur guide.json
       (bloc "reglages" : walk_max_px = 420, fly_max_px = 1600,
       marge_ecran_px = 12). Le controleur qui lit guide.json peut les
       surcharger via mount({ seuils: { walk_max_px, fly_max_px,
       marge_ecran_px } }). Ces seuils servent a choisirMode() : en dessous
       de walk_max_px on marche, en dessous de fly_max_px on vole, au-dela
       on se teleporte. */
    var seuils = {
      walkMax: (o.seuils && typeof o.seuils.walk_max_px === 'number') ? o.seuils.walk_max_px : 420,
      flyMax:  (o.seuils && typeof o.seuils.fly_max_px === 'number')  ? o.seuils.fly_max_px  : 1600,
      marge:   (o.seuils && typeof o.seuils.marge_ecran_px === 'number') ? o.seuils.marge_ecran_px : 12
    };

    var root  = document.createElement('div');
    root.className = 'ccm-root' + (calme ? ' ccm-fige' : '');

    var perso = document.createElement('div');
    perso.className = 'ccm-perso';
    perso.setAttribute('role', 'button');
    perso.setAttribute('tabindex', '0');
    perso.setAttribute('aria-label', 'Le petit voyageur ColisConnect : demander de l\u2019aide');
    perso.innerHTML = SVG + BULLE + COLERE + ASK;
    ancre = perso.querySelector('.ccm-valise-ancre');
    colere = perso.querySelector('.ccm-colere');
    askEl = perso.querySelector('.ccm-ask');

    root.appendChild(perso);
    document.body.appendChild(root);

    /* Sa marche est ralentie d'autant qu'il a ete reduit : la vitesse est en
       pixels/seconde et ne suivait pas la taille, ses pieds patinaient. */
    if (typeof o.vitesse !== 'number') {
      vitesse = Math.max(18, Math.round(46 * (perso.offsetWidth || 110) / 110));
    }

    var bulleTxt   = perso.querySelector('.ccm-bulle-texte');
    var bulleOuvrir= perso.querySelector('.ccm-bulle-ouvrir');
    var bulleX     = perso.querySelector('.ccm-bulle-fermer');
    bulleTxt.textContent = texte;

    /* --- etats -------------------------------------------------------- */
    var ETATS = ['ccm-marche','ccm-repos','ccm-regarde','ccm-reflechit','ccm-salue','ccm-parle','ccm-ecoute','ccm-pose'];
    function etat(c) {
      root.classList.remove.apply(root.classList, ETATS);
      if (c) root.classList.add(c);
    }

    /* --- deplacement -------------------------------------------------- */
    var x = 0, largeur = 110, marge = 14, cible = 0, depart = 0, t0 = 0, duree = 0, raf = null, enMarche = false;
    /* etat du guidage 2D libre : y = position verticale viewport, modeLibre =
       la mascotte a quitte sa bande du bas. rafGuide et minuteurPointe servent
       au moteur de guidage (ils ne touchent pas a la marche classique). */
    var y = 0, modeLibre = false, rafGuide = null, minuteurPointe = null;
    var arret = false;                       // l'automate reprend la main
    var occupe = false;                      // une scene est en cours (salut, colere...)
    var pose   = false;
    var detache = false;                     // on l'a depose quelque part : il reste la                      // il s'est pose dans son coin : fini de marcher
    var minuteurRepos = null, minuteurPose = null;
    var ancre, colere, askEl, compense = false, xRef = 0;
    var porte = null, apresMarche = null, minuteursScene = [], jetEchantillons = [], reponseDonnee = false;
    var porteCible = 0, porteSens = 1;

    function bornes() {
      largeur = perso.offsetWidth || 110;
      var vw = window.innerWidth;
      return { min: marge, max: Math.max(marge + 40, vw - largeur - marge) };
    }
    function poser(v) { x = v; perso.style.left = Math.round(v) + 'px'; }

    /* quand il part rechercher sa valise, elle doit rester posee au sol :
       on compense son deplacement a l'ecran, en tenant compte du miroir. */
    function majAncre() {
      if (!ancre) return;
      var l = largeur || 110;
      var facteur = perso.classList.contains('ccm-vers-gauche') ? 1 : -1;
      ancre.style.transform = 'translateX(' + (facteur * (x - xRef) * (110 / l)).toFixed(2) + 'px)';
    }

    /* une bulle large ne doit jamais sortir de l'ecran */
    function cadrerBulle(el) {
      if (!el) return;
      var vw = window.innerWidth, g = 8, w = el.offsetWidth;
      if (!w) return;
      var gauche = x + (perso.offsetWidth || 110) / 2 - w / 2;
      var dx = 0;
      if (gauche < g) dx = g - gauche;
      else if (gauche + w > vw - g) dx = (vw - g) - (gauche + w);
      el.style.marginLeft = dx ? Math.round(dx) + 'px' : '';
      /* colle en haut de l'ecran : la bulle passe sous le personnage */
      perso.classList.toggle('ccm-bulle-bas', perso.getBoundingClientRect().top < 150);
    }

    /* il la ramasse : elle revient doucement dans sa main */
    function lacherAncre() {
      compense = false;
      if (!ancre) return;
      ancre.style.transition = 'transform .48s ease-out';
      ancre.style.transform = 'translateX(0px)';
      setTimeout(function () {
        if (!ancre) return;
        ancre.style.transition = '';
        ancre.style.transform = '';
      }, 520);
    }

    function tournerVers(sens) {              // sens 1 = droite, -1 = gauche
      if (sens < 0) perso.classList.add('ccm-vers-gauche');
      else perso.classList.remove('ccm-vers-gauche');
    }

    function marcheVers(cible2, rapidite, fin) {
      var b = bornes();
      cible = Math.min(b.max, Math.max(b.min, cible2));
      var sens = cible > x ? 1 : -1;
      tournerVers(sens);
      depart = x; t0 = 0; duree = Math.max(360, Math.abs(cible - x) / (vitesse * (rapidite || 1)) * 1000);
      enMarche = true;
      apresMarche = fin || null;               // ce qu'on enchainera en arrivant
      etat('ccm-marche');
      raf = requestAnimationFrame(avance);
    }

    function avance(ts) {
      if (!enMarche) return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / duree);
      poser(depart + (cible - depart) * p);
      if (compense) majAncre();
      if (p < 1) raf = requestAnimationFrame(avance);
      else {
        enMarche = false;
        if (apresMarche) { var f = apresMarche; apresMarche = null; f(); }
        else { etat('ccm-repos'); repos(); }
      }
    }

    function stopper() {
      enMarche = false;
      apresMarche = null;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (compense) {
        compense = false;
        if (ancre) { ancre.style.transition = ''; ancre.style.transform = ''; }
      }
      etat('ccm-repos');
    }

    function libre() { return !arret && !occupe && !pose && !modeLibre; }

    /* un vrai personnage fait parfois... rien. C'est ce qui le rend vivant. */
    function repos() {
      if (!libre()) return;
      if (minuteurRepos) clearTimeout(minuteurRepos);
      minuteurRepos = setTimeout(function () {
        if (!libre()) return;
        var b = bornes(), r = Math.random();
        if (detache) {                              // depose dans la page : il reste ou on l'a mis
          if (r < 0.5) regarde(); else reflechit();
          return;
        }
        if (r < 0.22) regarde();                                    // il regarde autour de lui
        else if (r < 0.36) reflechit();                             // il reflechit un instant
        else marcheVers(b.min + Math.random() * (b.max - b.min));    // il repart
      }, 900 + Math.random() * 4200);
    }

    function regarde() {
      etat('ccm-regarde');
      setTimeout(function () {
        if (!libre()) return;
        etat('ccm-repos');
        repos();
      }, 1900);
    }

    function reflechit() {
      etat('ccm-reflechit');
      setTimeout(function () {
        if (!libre()) return;
        etat('ccm-repos');
        repos();
      }, 2600);
    }

    /* --- le grand moment : il remarque le visiteur -------------------- */
    var dejaSalue = false;
    function saluer() {
      if (arret || modeLibre || dejaSalue) return;
      if (occupe) { minuteurSalut = setTimeout(saluer, 6000); return; }   // occupe : on reprend plus tard
      dejaSalue = true; occupe = true;
      stopper();
      setTimeout(function () {
        etat('ccm-regarde');
        setTimeout(function () {
          etat('ccm-salue');
          setTimeout(function () {
            if (arret) return;
            root.classList.add('ccm-parle');
            cadrerBulle(perso.querySelector('.ccm-bulle'));
            setTimeout(function () {
              if (arret) return;
              root.classList.remove('ccm-parle');
              occupe = false;
              repos();
              /* il vit encore un peu, puis il va se poser dans son coin */
              minuteurPose = setTimeout(sePoser, 45000);
            }, 17000);
          }, 1000);
        }, 1200);
      }, 420);
    }

    /* --- la grosse colere : il jette sa valise ------------------------ */
    function dureeVers(c) { return Math.max(360, Math.abs(c - x) / vitesse * 1000); }

    function finColere() {
      root.classList.remove('ccm-enerve', 'ccm-crie');
      occupe = false;
      etat('ccm-repos');
      if (!dejaSalue && !arret) minuteurSalut = setTimeout(saluer, 4000);
      repos();
    }

    function enrager() {
      if (arret || occupe || pose) return false;
      occupe = true;
      if (minuteurSalut) clearTimeout(minuteurSalut);
      if (minuteurRepos) clearTimeout(minuteurRepos);
      if (minuteurPose) clearTimeout(minuteurPose);
      stopper();
      root.classList.remove('ccm-parle');

      var b = bornes();
      var sens = (x < (b.min + b.max) / 2) ? 1 : -1;      // il se tourne vers le plus grand espace
      tournerVers(sens);
      var dist = Math.round(170 * ((perso.offsetWidth || 110) / 110));
      var atterrit = Math.min(b.max, Math.max(b.min, x + sens * dist));
      var dMarche = dureeVers(atterrit);
      var immobile = reduit || root.classList.contains('ccm-fige');   // mode calme : pas de jet

      etat('ccm-enerve');
      setTimeout(function () {
        if (arret) return;
        if (!immobile) root.classList.add('ccm-jette');               // il lance la valise
        setTimeout(function () {
          if (arret) return;
          root.classList.add('ccm-crie');
          cadrerBulle(colere);                             // la bulle "@&%#*!"
          setTimeout(function () {
            if (arret) return;
            root.classList.remove('ccm-crie');
            if (immobile) { finColere(); return; }
            etat('ccm-repos');
            xRef = x; compense = true;
            if (ancre) ancre.style.transition = 'none';
            marcheVers(atterrit);                                    // il va la rechercher
            setTimeout(function () {
              if (arret) return;
              lacherAncre();
              root.classList.add('ccm-reprise');                      // il la ramasse
              setTimeout(function () {
                if (arret) return;
                root.classList.remove('ccm-reprise', 'ccm-jette');
                finColere();
              }, 500);
            }, dMarche + 320);
          }, 2700);
        }, immobile ? 300 : 1150);
      }, 650);
      return true;
    }

    /* --- apres un moment, il va se poser dans son coin ---------------- */
    function sePoser() {
      if (arret || occupe || pose || detache || modeLibre) return;
      pose = true;
      var b = bornes();
      if (Math.abs(x - b.min) < 12) { stopper(); etat('ccm-pose'); return; }
      var d = dureeVers(b.min) / 2;      // il presse le pas pour rejoindre son coin
      etat('ccm-repos');
      marcheVers(b.min, 2);
      setTimeout(function () {
        if (arret) return;
        stopper();
        etat('ccm-pose');
      }, d + 320);
    }

    /* ------------------------------------------------- la scene du jet ---- */
    /* Dans la vraie vie, on le pose doucement... ou on le lance avec le pouce.
       Le jet, lui, ne se produit qu'une fois toutes les 12 heures : sinon on
       le jouerait a chaque fois et ca n'aurait plus rien d'exceptionnel.     */
    function jetDisponible() {
      try {
        var t = localStorage.getItem(CLE_JET);
        if (!t) return true;
        return (Date.now() - parseInt(t, 10)) > REPOS_JET;
      } catch (e) { return true; }
    }
    function marquerJet() { try { localStorage.setItem(CLE_JET, String(Date.now())); } catch (e) {} }

    function mainte() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function noter(px, py) {                   // les dernieres positions du doigt
      jetEchantillons.push({ t: mainte(), x: px, y: py });
      if (jetEchantillons.length > 7) jetEchantillons.shift();
    }

    /* la vitesse du doigt juste avant qu'on lache : c'est elle qui distingue
       "je le depose" (lent, velours) de "je le lance" (vif, au pouce).
       On ne regarde que la fin du geste : les 110 derniers millisecondes. */
    function vitesseDuLacher() {
      var n = jetEchantillons.length;
      if (n < 2) return 0;
      var fin = jetEchantillons[n - 1], i = n - 1;
      while (i > 0 && (fin.t - jetEchantillons[i - 1].t) <= 110) i--;
      var debut = jetEchantillons[i];
      var dt = Math.max(1, fin.t - debut.t);
      var dx = fin.x - debut.x, dy = fin.y - debut.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 24) return 0;                    // un simple tremblement ne compte pas
      return d / dt;
    }

    function sensDuJet() {                     // de quel cote il part
      if (jetEchantillons.length < 2) return 1;
      var a = jetEchantillons[0], b = jetEchantillons[jetEchantillons.length - 1];
      if (Math.abs(b.x - a.x) > 8) return b.x > a.x ? 1 : -1;
      return 1;
    }

    /* tous les minuteurs de la scene sont ranges ici : on peut tout arreter net */
    function plusTard(f, ms) { var t = setTimeout(f, ms); minuteursScene.push(t); return t; }

    function nettoyerScene() {
      var i;
      for (i = 0; i < minuteursScene.length; i++) clearTimeout(minuteursScene[i]);
      minuteursScene = [];
      root.classList.remove('ccm-face', 'ccm-tombe-d', 'ccm-tombe-g', 'ccm-releve-d', 'ccm-releve-g',
        'ccm-hanches', 'ccm-fronce', 'ccm-demande', 'ccm-regard-haut', 'ccm-regard-bas', 'ccm-boude',
        'ccm-valise-sol', 'ccm-pousse');
      if (porte) porte.classList.remove('ccm-porte-pose', 'ouvre', 'claque');
      reponseDonnee = false;
    }

    /* il vole encore un peu sur sa lancee, puis il tombe */
    function voler(vers, fin) {
      var de = x, t0v = 0, dur = 300;
      function pas(ts) {
        if (!t0v) t0v = ts;
        var p = Math.min(1, (ts - t0v) / dur);
        poser(de + (vers - de) * (1 - Math.pow(1 - p, 2)));
        if (p < 1) raf = requestAnimationFrame(pas);
        else { raf = null; if (fin) fin(); }
      }
      raf = requestAnimationFrame(pas);
    }

    function jetScene(v, sens) {
      if (arret || occupe || saisi) return false;
      occupe = true;
      marquerJet();                        // la scene ne reviendra pas avant 12 h
      if (minuteurSalut) clearTimeout(minuteurSalut);
      if (minuteurRepos) clearTimeout(minuteurRepos);
      if (minuteurPose) clearTimeout(minuteurPose);
      stopper();
      root.classList.remove('ccm-parle', 'ccm-crie', 'ccm-jette');
      etat('');
      root.classList.add('ccm-face');       // il retombe face a toi
      var l = perso.offsetWidth || 110;
      var elan = Math.min(150, Math.round(v * 120));
      var arrivee = dansLaFenetre(x + sens * elan, 2, Math.max(2, window.innerWidth - l - 2));
      voler(arrivee, function () { tomber(sens); });
      return true;
    }

    /* il tombe, il reste au sol un instant, puis il se releve */
    function tomber(sens) {
      var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
      var encombrement = h * 0.8;
      if (sens > 0 && x + l + encombrement > window.innerWidth - 2) sens = -1;
      else if (sens < 0 && x - encombrement < 2) sens = 1;
      root.classList.add(sens > 0 ? 'ccm-tombe-d' : 'ccm-tombe-g');
      root.classList.add('ccm-valise-sol');            // sa valise est restee par terre
      plusTard(function () {
        root.classList.remove('ccm-tombe-d', 'ccm-tombe-g');
        root.classList.add(sens > 0 ? 'ccm-releve-d' : 'ccm-releve-g');
        plusTard(function () {
          root.classList.remove('ccm-releve-d', 'ccm-releve-g');
          demander();
        }, 760);
      }, 520);
    }

    /* debout, les poings sur les hanches : "tu veux que je parte ?" */
    function demander() {
      root.classList.add('ccm-hanches', 'ccm-fronce');
      plusTard(function () {
        root.classList.add('ccm-demande');
        cadrerBulle(askEl);
        plusTard(function () { repondre(false); }, 12000);   // il attend 12 s, puis il laisse tomber
      }, 520);
    }

    function repondre(oui) {
      if (reponseDonnee || arret) return;
      if (!root.classList.contains('ccm-demande')) return;   // on ne repond qu'a la question posee
      reponseDonnee = true;
      root.classList.remove('ccm-demande');
      plusTard(function () { if (oui) partir(); else bouder(); }, 240);
    }

    /* non : il se calme, il boude trois secondes, et il repart comme avant */
    function bouder() {
      root.classList.remove('ccm-hanches', 'ccm-fronce');
      root.classList.remove('ccm-face');
      root.classList.add('ccm-boude');
      plusTard(function () {
        root.classList.remove('ccm-boude', 'ccm-valise-sol');
        occupe = false;
        tournerVers(1);
        etat('ccm-repos');
        if (!dejaSalue && !arret) minuteurSalut = setTimeout(saluer, 4000);
        repos();
      }, 3000);
    }

    /* oui : il reprend sa valise, une porte apparait, et il s'en va */
    function partir() {
      root.classList.remove('ccm-hanches');
      plusTard(function () {
        root.classList.remove('ccm-face');         // de profil, sa valise a la main
        root.classList.remove('ccm-valise-sol');
        poserLaPorte();
        plusTard(function () {
          if (arret) return;
          marcheVers(porteCible, 1.7, function () {
            etat('ccm-repos');
            plusTard(function () { ouvrirPorte(); }, 300);
            plusTard(function () { devisager(); }, 1080);
          });
        }, 420);
      }, 320);
    }

    /* la porte se pose a cote de lui, sur le sol, du cote ou il y a de la place */
    function poserLaPorte() {
      var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
      var r = perso.getBoundingClientRect();
      var sol = Math.round(r.bottom - h * 0.078);        // la ligne de ses pieds
      /* la porte suit sa taille (elle mesure 0,8 fois sa largeur et 1,75 fois
         celle-ci en hauteur) ; le plancher a ete abaisse avec lui : 54 px pour
         un personnage de 110, 24 px pour un personnage de 56. */
      var dw = Math.max(24, Math.round(l * 0.8)), dh = Math.round(dw * 1.75);
      var vw = window.innerWidth;
      var dist = Math.round(l * 1.3 + dw * 0.4);
      var aDroite = (x + l + dist + dw) < (vw - 10);
      var aGauche = (x - dist - dw) > 10;
      porteSens = aDroite ? 1 : (aGauche ? -1 : ((vw - x) > x ? 1 : -1));
      var gp = porteSens > 0
        ? Math.min(vw - 10 - dw, Math.round(x + dist))
        : Math.max(10, Math.round(x - dist - dw));
      if (!porte) {
        porte = document.createElement('div');
        porte.className = 'ccm-porte';
        porte.innerHTML = PORTE;
        root.appendChild(porte);
      }
      porte.classList.toggle('ccm-porte-mi', porteSens < 0);
      var svgs = porte.querySelectorAll('.ccm-porte-svg'), i;
      for (i = 0; i < svgs.length; i++) {
        svgs[i].style.left = gp + 'px';
        svgs[i].style.top = (sol - dh) + 'px';
        svgs[i].style.width = dw + 'px';
        svgs[i].style.height = dh + 'px';
      }
      /* le trait de la porte fermee : il doit rester devant lui, a petite distance */
      var trait = dw * (10 / 96);
      /* l'ecart entre lui et la porte suit sa taille : 20 px quand il faisait
         110 px de large, 10 px maintenant qu'il en fait 56. */
      var ecart = Math.round(l * 0.18);
      porteCible = porteSens > 0
        ? Math.round(gp + trait - l * 0.95 - ecart)
        : Math.round(gp + dw - trait + l * 0.073 + ecart);
      requestAnimationFrame(function () { if (porte) porte.classList.add('ccm-porte-pose'); });
    }

    function ouvrirPorte() {
      if (!porte || arret) return;
      porte.classList.add('ouvre');
      root.classList.add('ccm-pousse');                  // il pousse de la main
      plusTard(function () { root.classList.remove('ccm-pousse'); }, 780);
    }

    /* il te devisage : les yeux montent et descendent, sans un mot */
    function devisager() {
      if (arret) return;
      root.classList.add('ccm-face');
      plusTard(function () {
        if (arret) return;
        root.classList.add('ccm-regard-haut');
        plusTard(function () {
          if (arret) return;
          root.classList.remove('ccm-regard-haut');
          root.classList.add('ccm-regard-bas');
          plusTard(function () {
            if (arret) return;
            root.classList.remove('ccm-regard-bas');
            root.classList.add('ccm-regard-haut');
            plusTard(function () {
              root.classList.remove('ccm-regard-haut');
              entrer();
            }, 360);
          }, 520);
        }, 380);
      }, 360);
    }

    /* il entre, et il claque la porte */
    function entrer() {
      if (arret) return;
      tournerVers(porteSens);
      root.classList.remove('ccm-face');
      plusTard(function () {
        if (arret) return;
        var l = perso.offsetWidth || 110;
        marcheVers(Math.round(x + porteSens * l * 0.42), 0.85);
        plusTard(function () { perso.style.opacity = '0'; }, 160);   // il passe la porte
        plusTard(function () { claquer(); }, 640);
        plusTard(function () { disparaitre(); }, 1700);
      }, 260);
    }

    function claquer() {
      if (!porte) return;
      porte.classList.remove('ouvre');
      porte.classList.add('claque');
      plusTard(function () { if (porte) porte.classList.remove('claque'); }, 460);
    }

    /* il n'est plus la. Il faudra recharger la page pour le revoir. */
    function disparaitre() {
      arret = true; occupe = true; pose = true;
      etat('');
      if (porte) porte.classList.remove('ccm-porte-pose');
      plusTard(function () { perso.style.display = 'none'; }, 560);
    }

    /* --- interactions ------------------------------------------------- */
    function ouvrirChat() {
      root.classList.remove('ccm-parle');
      stopper();                 // on l'arrete avant de poser l'etat d'ecoute
      etat('ccm-ecoute');        // il incline la tete : il ecoute
      if (typeof o.onChat === 'function') o.onChat();
    }

    function ranger() {
      arret = true;
      stopper();
      nettoyerScene();
      marquerFerme();
      root.classList.remove('ccm-parle', 'ccm-ecoute');
      perso.classList.add('ccm-parti');
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 700);
    }

    perso.addEventListener('click', auClic);
    perso.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirChat(); }
    });
    bulleOuvrir.addEventListener('click', function (e) { e.stopPropagation(); ouvrirChat(); });
    bulleX.addEventListener('click', function (e) { e.stopPropagation(); ranger(); });

    /* le clic sur la bulle ne doit pas etre avale par le personnage */
    perso.querySelector('.ccm-bulle').addEventListener('click', function (e) { e.stopPropagation(); });

    /* la question du grand depart : deux reponses possibles */
    askEl.addEventListener('click', function (e) { e.stopPropagation(); });
    perso.querySelector('.ccm-ask-oui').addEventListener('click', function (e) { e.stopPropagation(); repondre(true); });
    perso.querySelector('.ccm-ask-non').addEventListener('click', function (e) { e.stopPropagation(); repondre(false); });

    /* --- appui long : on l'attrape, il flotte (vue de face, effraye) et on
           le depose ou l'on veut dans la page. A l'atterrissage, il rale. -- */
    var saisi = false, timerAppui = null, clicJuste = false;   // (detache vit plus haut)
    var appuiX = 0, appuiY = 0, decX = 0, decY = 0;

    function dansLaFenetre(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function saisir(px, py, idPointeur) {
      if (arret) return false;
      nettoyerScene();                         // une scene en cours s'efface : on le tient
      arret = true;                            // fige la scene en cours : on le tient
      saisi = true; occupe = true; pose = false; compense = false;
      jetEchantillons = [];
      noter(px, py);
      if (minuteurSalut) clearTimeout(minuteurSalut);
      if (minuteurRepos) clearTimeout(minuteurRepos);
      if (minuteurPose)  clearTimeout(minuteurPose);
      stopper();
      root.classList.remove('ccm-parle', 'ccm-salue');
      var r = perso.getBoundingClientRect();
      decX = px - r.left;
      decY = py - r.top;
      perso.classList.add('ccm-libre', 'ccm-saisi');
      perso.style.left = Math.round(r.left) + 'px';
      perso.style.top  = Math.round(r.top)  + 'px';
      x = r.left;
      detache = true;
      perso.classList.remove('ccm-vers-gauche');        // vue de face : plus de miroir
      root.classList.add('ccm-flotte');                 // il flotte, effraye
      etat('');
      if (ancre && ancre.style) ancre.style.transform = '';
      try { if (perso.setPointerCapture && idPointeur != null) perso.setPointerCapture(idPointeur); }
      catch (err) {}
      return true;
    }

    function suivre(px, py) {
      var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
      var nl = dansLaFenetre(px - decX, 2, Math.max(2, window.innerWidth  - l - 2));
      var nt = dansLaFenetre(py - decY, 2, Math.max(2, window.innerHeight - h - 2));
      noter(px, py);                           // pour mesurer la vitesse du lancer
      perso.style.left = Math.round(nl) + 'px';
      perso.style.top  = Math.round(nt) + 'px';
      x = nl;
    }

    function relacher() {
      if (!saisi) return false;
      var v = vitesseDuLacher(), sens = sensDuJet();
      arret = false;                           // les scenes peuvent reprendre
      saisi = false; occupe = false;
      perso.classList.remove('ccm-saisi');
      root.classList.remove('ccm-flotte');
      clicJuste = true;                                        // ce clic n'ouvre pas le chat
      setTimeout(function () { clicJuste = false; }, 480);
      /* lache d'un geste vif = un vrai jet (une fois / 12 h) ; sinon, la colere */
      if (v >= VITESSE_JET && !reduit && !root.classList.contains('ccm-fige') && jetDisponible()) {
        return jetScene(v, sens);
      }
      enrager();                                           // il n'aime pas du tout etre attrape
      return true;
    }

    function choper(px, py) {
      var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
      if (!saisir(px, py, null)) return false;
      decX = l / 2; decY = h / 2;                              // il se centre sur le doigt
      suivre(px, py);
      return true;
    }

    function placer(px, py) { if (!choper(px, py)) return false; return relacher(); }

    function annulerAppui() { if (timerAppui) { clearTimeout(timerAppui); timerAppui = null; } }
    function auClic() { if (clicJuste || saisi) return; ouvrirChat(); }

    perso.addEventListener('pointerdown', function (e) {
      if (arret) return;
      if (e.button && e.button !== 0) return;                  // bouton droit : on laisse passer
      if (e.target && e.target.closest && e.target.closest('.ccm-ask,.ccm-bulle')) return;   // on repond, on ne l'attrape pas
      appuiX = e.clientX; appuiY = e.clientY; clicJuste = false;
      annulerAppui();
      timerAppui = setTimeout(function () {                    // appui long = 0,42 s
        timerAppui = null;
        saisir(appuiX, appuiY, e.pointerId);
      }, 420);
    });

    perso.addEventListener('pointermove', function (e) {
      if (!timerAppui) return;
      if (Math.abs(e.clientX - appuiX) > 10 || Math.abs(e.clientY - appuiY) > 10) annulerAppui();
    });

    perso.addEventListener('pointerup', annulerAppui);
    perso.addEventListener('pointercancel', annulerAppui);
    perso.addEventListener('contextmenu', function (e) { if (saisi) e.preventDefault(); });

    document.addEventListener('pointermove', function (e) { if (saisi) suivre(e.clientX, e.clientY); });
    document.addEventListener('pointerup', function () { if (saisi) relacher(); });
    document.addEventListener('pointercancel', function () { if (saisi) relacher(); });

    /* =========================================================================
       GUIDAGE 2D LIBRE
       -------------------------------------------------------------------------
       La mascotte quitte sa bande du bas et devient un objet libre du viewport
       (position:fixed, left/top en pixels). Elle peut monter, descendre, aller
       en diagonale, sans jamais pousser le contenu ni bloquer un bouton : le
       .ccm-root reste en pointer-events:none, seul le petit .ccm-perso garde
       pointer-events:auto (pour rester attrapable/cliquable). Quand le guidage
       se termine, sortirDeLibre() la ramene dans sa bande, comme avant. */
    function positionCourante() {
      var r = perso.getBoundingClientRect();
      return { x: r.left, y: r.top };
    }

    function poserLibre(vx, vy) {
      x = vx; y = vy;
      perso.style.left = Math.round(vx) + 'px';
      perso.style.top  = Math.round(vy) + 'px';
    }

    function entrerEnLibre() {
      if (modeLibre) return true;
      if (arret) return false;
      var r = perso.getBoundingClientRect();
      var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
      var vw = window.innerWidth, vh = window.innerHeight;
      modeLibre = true;
      x = dansLaFenetre(r.left, seuils.marge, Math.max(seuils.marge, vw - l - seuils.marge));
      y = dansLaFenetre(r.top,  seuils.marge, Math.max(seuils.marge, vh - h - seuils.marge));
      root.classList.add('ccm-guide');
      perso.classList.add('ccm-libre');
      poserLibre(x, y);
      return true;
    }

    function sortirDeLibre() {
      if (!modeLibre) return true;
      modeLibre = false;
      perso.classList.remove('ccm-libre', 'ccm-envol', 'ccm-teleporte');
      root.classList.remove('ccm-guide', 'ccm-envol', 'ccm-pointe');
      perso.style.top = '';
      perso.style.left = '';
      var b = bornes();
      x = dansLaFenetre(x, b.min, b.max);
      poser(x);
      etat('ccm-repos');
      repos();                 // la vie reprend
      return true;
    }

    /* gele l'automate (salut, repos, colere...) le temps du guidage, puis
       entre en mode libre. Idempotente : sans danger si deja en libre. */
    function preparerGuidage() {
      if (arret) return false;
      if (minuteurSalut) clearTimeout(minuteurSalut);
      if (minuteurRepos) clearTimeout(minuteurRepos);
      if (minuteurPose)  clearTimeout(minuteurPose);
      stopper();
      nettoyerScene();
      occupe = false;
      pose = false;
      root.classList.remove('ccm-parle', 'ccm-crie', 'ccm-ecoute', 'ccm-salue', 'ccm-envol', 'ccm-pointe');
      perso.classList.remove('ccm-teleporte', 'ccm-parti');
      entrerEnLibre();
      return true;
    }

    function distanceVers(px, py) {
      var r = positionCourante();
      var dx = px - r.x, dy = py - r.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /* Choisit le mode selon la distance, avec les seuils de guide.json.
       Le "mode" du parcours dans guide.json est une PREFERENCE : si la
       distance l'exige, ce moteur renvoie un mode plus capable. Exemples :
         preference "walk" mais distance > flyMax  -> il faudra "teleport"
         preference "fly"  mais distance <= walkMax -> "walk" suffit
       choisirMode() ne renvoie QUE le mode recommande par la distance ; c'est
       l'appelant (le controleur du parcours) qui tranche entre sa preference
       et ce resultat. */
    function choisirMode(px, py) {
      var d = distanceVers(px, py);
      if (d <= seuils.walkMax) return 'walk';
      if (d <= seuils.flyMax) return 'fly';
      return 'teleport';
    }

    /* Deplacement anime generique, du point courant vers (px, py).
       Retourne une promesse resolue a true a l'arrivee (false si arret ou
       cible invalide). dureeMs optionnel : sinon calculee sur VITESSE. */
    function allerVers(px, py, dureeMs) {
      if (!modeLibre && !preparerGuidage()) return Promise.resolve(false);
      return new Promise(function (resolve) {
        var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
        var vw = window.innerWidth, vh = window.innerHeight;
        var cX = dansLaFenetre(px, seuils.marge, Math.max(seuils.marge, vw - l - seuils.marge));
        var cY = dansLaFenetre(py, seuils.marge, Math.max(seuils.marge, vh - h - seuils.marge));
        tournerVers(cX >= x ? 1 : -1);
        var deX = x, deY = y;
        var d = (typeof dureeMs === 'number' && dureeMs > 0)
          ? dureeMs
          : Math.max(240, Math.round(Math.sqrt((cX - deX) * (cX - deX) + (cY - deY) * (cY - deY)) / vitesse * 1000));
        var t0a = 0;
        function pas(ts) {
          if (arret) { rafGuide = null; resolve(false); return; }
          if (!t0a) t0a = ts;
          var p = Math.min(1, (ts - t0a) / d);
          poserLibre(deX + (cX - deX) * p, deY + (cY - deY) * p);
          if (p < 1) rafGuide = requestAnimationFrame(pas);
          else { rafGuide = null; resolve(true); }
        }
        rafGuide = requestAnimationFrame(pas);
      });
    }

    /* marche 2D : petite distance, jambes animees, corps oriente. */
    function walkTo(px, py) {
      if (arret) return Promise.resolve(false);
      if (!preparerGuidage()) return Promise.resolve(false);
      etat('ccm-marche');
      return allerVers(px, py).then(function (ok) {
        if (!arret && modeLibre) etat('ccm-repos');
        return ok;
      });
    }

    /* vole 2D : il quitte legerement le sol (classe ccm-envol) et va plus vite. */
    function flyTo(px, py) {
      if (arret) return Promise.resolve(false);
      if (!preparerGuidage()) return Promise.resolve(false);
      var d = distanceVers(px, py);
      var duree = Math.max(360, Math.round(d / (vitesse * 1.8) * 1000));
      etat('ccm-marche');
      root.classList.add('ccm-envol');
      return allerVers(px, py, duree).then(function (ok) {
        root.classList.remove('ccm-envol');
        if (!arret && modeLibre) etat('ccm-repos');
        return ok;
      });
    }

    /* teleportation : disparition (opacite -> 0) puis reapparition a la cible. */
    function teleportTo(px, py) {
      if (arret) return Promise.resolve(false);
      if (!preparerGuidage()) return Promise.resolve(false);
      etat('ccm-repos');
      return new Promise(function (resolve) {
        perso.classList.add('ccm-teleporte');
        setTimeout(function () {
          if (arret) { resolve(false); return; }
          var l = perso.offsetWidth || 110, h = perso.offsetHeight || 155;
          var vw = window.innerWidth, vh = window.innerHeight;
          var cX = dansLaFenetre(px, seuils.marge, Math.max(seuils.marge, vw - l - seuils.marge));
          var cY = dansLaFenetre(py, seuils.marge, Math.max(seuils.marge, vh - h - seuils.marge));
          tournerVers(cX >= x ? 1 : -1);
          poserLibre(cX, cY);
          setTimeout(function () {
            perso.classList.remove('ccm-teleporte');
            setTimeout(function () { resolve(true); }, 220);
          }, 40);
        }, 220);
      });
    }

    /* pointe du doigt vers un element (ou des coordonnees). NE se deplace pas.
       Accepte un element DOM, un selecteur CSS, ou (x, y). Retourne un booleen.
       TODO (tache ulterieure) : dessiner un vrai doigt + halo autour de la
       cible. Ici, on tend le bras avant (classe ccm-pointe) et on oriente le
       corps : c'est deja propre et visible. */
    function pointTo(elementOuX, elementOuY) {
      var cX, cY;
      if (typeof elementOuX === 'string' || (elementOuX && elementOuX.nodeType === 1)) {
        var el = (typeof elementOuX === 'string') ? document.querySelector(elementOuX) : elementOuX;
        if (!el) return false;
        var r = el.getBoundingClientRect();
        cX = r.left + r.width / 2;
        cY = r.top + r.height / 2;
      } else {
        cX = elementOuX; cY = elementOuY;
      }
      if (typeof cX !== 'number' || typeof cY !== 'number' || !isFinite(cX) || !isFinite(cY)) return false;
      if (arret) return false;
      if (minuteurSalut) clearTimeout(minuteurSalut);
      if (minuteurRepos) clearTimeout(minuteurRepos);
      if (minuteurPose)  clearTimeout(minuteurPose);
      stopper();
      nettoyerScene();
      occupe = false;
      pose = false;
      root.classList.remove('ccm-parle', 'ccm-crie', 'ccm-ecoute', 'ccm-salue');
      var ici = positionCourante();
      tournerVers(cX >= ici.x ? 1 : -1);
      root.classList.add('ccm-pointe');
      if (minuteurPointe) clearTimeout(minuteurPointe);
      minuteurPointe = setTimeout(function () { root.classList.remove('ccm-pointe'); }, 1800);
      return true;
    }

    /* --- mise en route ------------------------------------------------ */
    var minuteurSalut = null;
    function lancer() {
      var b = bornes();
      poser(b.max - 10);
      tournerVers(-1);
      root.classList.add('ccm-pret');
      etat('ccm-repos');
      if (reduit || root.classList.contains('ccm-fige')) {
        setTimeout(saluer, Math.min(delai, 4000));   // mode calme : il salue, sans marcher
        return;
      }
      setTimeout(function () {
        if (arret || modeLibre) return;
        /* une scene a pu prendre la main entre-temps (le grand depart) :
           on ne le fait pas marcher au milieu */
        if (occupe) { minuteurSalut = setTimeout(saluer, delai); return; }
        etat('ccm-repos');
        marcheVers(b.min + (b.max - b.min) * 0.45);
        minuteurSalut = setTimeout(saluer, delai);
      }, 900);
    }

    /* on ne marche pas dans un onglet cache ; on reprend au retour */
    document.addEventListener('visibilitychange', function () {
      if (arret) return;
      if (document.hidden) stopper();
      else if (!dejaSalue) repos();
    });

    /* mode calme du site : on fige tout, immediatement */
    var obs = null;
    if (window.MutationObserver) {
      obs = new MutationObserver(function () {
        var fige = document.body.classList.contains('is-calm');
        root.classList.toggle('ccm-fige', fige);
        if (fige) stopper();
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    lancer();

    return {
      racine: root,
      saluer: saluer,
      enrager: enrager,
      poser: sePoser,
      choper: choper,
      relacher: relacher,
      placer: placer,
      ranger: ranger,
      /* le grand depart, jouable a la demande (bouton de demo) */
      jet: function (force) {
        if (force) oublierJet();
        if (arret || occupe || saisi || !jetDisponible()) return false;
        return jetScene(1.6, 1);
      },
      figer: function (v) {
        root.classList.toggle('ccm-fige', v !== false);
        if (v !== false) stopper(); else repos();
      },
      /* ---------------------------------------------------------------- */
      /*  API de guidage (moteur externe) : enveloppes defensives sur les  */
      /*  fonctions internes. Aucune n'altere l'apparence ni le SVG.       */
      /* ---------------------------------------------------------------- */
      /* demarre la marche dans la direction courante (jusqu'au bord) */
      marche: function () {
        if (arret || occupe || pose) return false;
        var b = bornes();
        var sens = perso.classList.contains('ccm-vers-gauche') ? -1 : 1;
        marcheVers(sens < 0 ? b.min : b.max);
        return true;
      },
      /* arrete le deplacement, sans detruire ni fermer la bulle */
      arret: function () {
        stopper();
        return true;
      },
      /* arret complet : stoppe, ferme la bulle, retire les dialogues, repos */
      stop: function () {
        stopper();
        nettoyerScene();
        occupe = false;
        root.classList.remove('ccm-parle', 'ccm-crie', 'ccm-ecoute', 'ccm-salue');
        etat('ccm-repos');
        repos();
        return true;
      },
      /* tourne le personnage vers la gauche ou la droite */
      regarder: function (direction) {
        var sens;
        if (direction === 'gauche') sens = -1;
        else if (direction === 'droite') sens = 1;
        else if (typeof direction === 'number') sens = (direction < 0 ? -1 : 1);
        else return false;
        tournerVers(sens);
        return true;
      },
      /* affiche la bulle avec un message (socle du salut et du guidage) */
      parler: function (message) {
        if (arret) return false;
        if (message != null) bulleTxt.textContent = String(message);
        root.classList.add('ccm-parle');
        cadrerBulle(perso.querySelector('.ccm-bulle'));
        return true;
      },
      /* le rend invisible (sans le retirer du DOM) */
      cacher: function () {
        perso.style.opacity = '0';
        perso.style.pointerEvents = 'none';
        return true;
      },
      /* le rend a nouveau visible */
      afficher: function () {
        perso.style.opacity = '';
        perso.style.pointerEvents = '';
        return true;
      },
      /* position actuelle, en pixels viewport (coin haut-gauche).
         En bande du bas, y est la position reelle du haut du personnage ;
         en mode libre, c'est le y courant (left/top fixes). */
      getPosition: function () {
        var r = perso.getBoundingClientRect();
        return { x: r.left, y: r.top, libre: modeLibre };
      },
      /* taille actuelle du personnage, en pixels */
      getSize: function () {
        return { largeur: perso.offsetWidth || 110, hauteur: perso.offsetHeight || 155 };
      },
      /* --- API DE GUIDAGE 2D LIBRE ------------------------------------ */
      entrerEnLibre: entrerEnLibre,
      sortirDeLibre: sortirDeLibre,
      allerVers: allerVers,
      walkTo: walkTo,
      flyTo: flyTo,
      teleportTo: teleportTo,
      pointTo: pointTo,
      choisirMode: choisirMode,
      /* pointe du doigt vers une direction ('gauche'/'droite' ou +/-).
         Version amelioree de l'ancien pointer() : oriente le corps et tend le
         bras avant (classe ccm-pointe sur le root). Le vrai doigt + halo est
         une tache ulterieure (voir pointTo). */
      pointer: function (direction) {
        var sens = (direction === 'gauche' || direction < 0) ? -1 : 1;
        tournerVers(sens);
        root.classList.add('ccm-pointe');
        if (minuteurPointe) clearTimeout(minuteurPointe);
        minuteurPointe = setTimeout(function () { root.classList.remove('ccm-pointe'); }, 1800);
        return true;
      },
      detruire: function () { arret = true; occupe = true; stopper(); if (obs) obs.disconnect();
        if (rafGuide) { cancelAnimationFrame(rafGuide); rafGuide = null; }
        if (minuteurPointe) { clearTimeout(minuteurPointe); minuteurPointe = null; }
        if (minuteurSalut) clearTimeout(minuteurSalut);
        if (minuteurRepos) clearTimeout(minuteurRepos);
        if (minuteurPose) clearTimeout(minuteurPose);
        if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }

  /* ---------------------------------------------------------------- API ---- */
  var courant = null;

  window.CCMascotte = {
    version: VERSION,
    mount: function (opts) {
      if (courant) courant.detruire();
      courant = demarrer(opts || {});
      return courant;
    },
    relancer: function (opts) {
      oublierFermeture();
      if (courant) courant.detruire();
      courant = demarrer(opts || {});
      return courant;
    },
    ranger: function () { if (courant) courant.ranger(); },
    enrager: function () { return courant ? courant.enrager() : false; },
    poser: function () { if (courant) courant.poser(); },
    choper: function (x, y) { return courant ? courant.choper(x, y) : false; },
    relacher: function () { return courant ? courant.relacher() : false; },
    placer: function (x, y) { return courant ? courant.placer(x, y) : false; },
    jet: function (force) { return courant ? courant.jet(force) : false; },
    oublierJet: oublierJet,
    monte: function () { return !!courant; },
    /* --- API de guidage : enveloppes defensives sur l'instance courante --- */
    saluer: function () { return courant ? courant.saluer() : false; },
    parler: function (message) { return courant ? courant.parler(message) : false; },
    marche: function () { return courant ? courant.marche() : false; },
    arret: function () { return courant ? courant.arret() : false; },
    stop: function () { return courant ? courant.stop() : false; },
    regarder: function (direction) { return courant ? courant.regarder(direction) : false; },
    cacher: function () { return courant ? courant.cacher() : false; },
    afficher: function () { return courant ? courant.afficher() : false; },
    getPosition: function () { return courant ? courant.getPosition() : undefined; },
    getSize: function () { return courant ? courant.getSize() : undefined; },
    pointer: function (direction) { return courant ? courant.pointer(direction) : false; },
    /* --- API de guidage 2D libre : enveloppes sur l'instance courante --- */
    entrerEnLibre: function () { return courant ? courant.entrerEnLibre() : false; },
    sortirDeLibre: function () { return courant ? courant.sortirDeLibre() : false; },
    allerVers: function (px, py, d) { return courant ? courant.allerVers(px, py, d) : Promise.resolve(false); },
    walkTo: function (px, py) { return courant ? courant.walkTo(px, py) : Promise.resolve(false); },
    flyTo: function (px, py) { return courant ? courant.flyTo(px, py) : Promise.resolve(false); },
    teleportTo: function (px, py) { return courant ? courant.teleportTo(px, py) : Promise.resolve(false); },
    pointTo: function (eltOuX, y) { return courant ? courant.pointTo(eltOuX, y) : false; },
    choisirMode: function (px, py) { return courant ? courant.choisirMode(px, py) : null; }
  };

  function autoMonte() {
    /* si la page a deja configure le personnage, on ne l'ecrase pas */
    if (courant) return;
    if (document.body && !estFerme()) window.CCMascotte.mount({});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMonte);
  else autoMonte();
})();
