---
name: mobile-realite-terrain
description: Use when une page, un formulaire ou un composant doit fonctionner sur telephone reel. Couvre le clavier virtuel, les barres fixes, les safe-areas et les petits ecrans — les cas que l'on ne voit pas sur un ecran d'ordinateur.
---

# Mobile, réalité terrain (clavier virtuel & barres fixes)

## Aperçu / Objectif

Un écran d'ordinateur ne montre jamais **comment la page se comporte quand un
clavier virtuel apparaît**. C'est là que se cachent les défauts les plus
pénibles pour l'utilisateur : un bouton d'action qui flotte et recouvre le champ
en cours de saisie, une barre de navigation qui « monte » avec le clavier, un
bouton inatteignable sous la barre du bas.

Ce skill cadre cette famille de cas une bonne fois pour toutes : avant de livrer
une page mobile, on se pose la question **« que devient cet écran quand le
clavier prend 40 % de la hauteur ? »**.

## Quand utiliser ce skill

* Toute page ou feuille contenant un champ de saisie (`input`, `textarea`,
  `contenteditable`) conçue pour le téléphone.
* Toute barre fixe : navigation basse, barre d'action de formulaire, CTA
  flottant, bandeau collant.
* Toute intervention sur les media queries mobiles (360, 390, 430 px) ou sur
  `www`/`dvh`/`safe-area`.
* Avant de déclarer une refonte mobile terminée.

## La règle qui évite 90 % des bugs

> **Une barre fixe ne doit jamais se retrouver entre le champ actif et le
> clavier.**

Deux stratégies acceptables, dans cet ordre de préférence :

1. **Barre dans le flux (statique)** quand elle termine un contenu — un
   formulaire en étapes, par exemple : le bouton « Continuer » ferme l'étape,
   il ne suit pas le scroll. C'est prévisible, ça ne recouvre rien, ça ne
   bouge pas avec le clavier.
2. **Barre fixe qui s'efface pendant la saisie** quand elle est vraiment
   globale (navigation basse). On mesure la perte de hauteur via
   `window.visualViewport` et on pose une classe sur `<html>` ; le CSS fait
   descendre la barre hors de l'écran, puis la ramène à la fermeture du
   clavier.

Une barre fixe qui reste visible pendant la saisie est un défaut, pas un choix
de design.

## Instructions étape par étape

### Étape 1 : repérer les barres fixes

Chercher `position: fixed` et `position: sticky` dans les fichiers CSS de la
page, puis se demander pour chacune : « est-ce qu'elle est encore utile quand
quelqu'un écrit ? » Si non → elle s'efface ou elle retourne dans le flux.

### Étape 2 : poser la détection du clavier (une seule fois, partagée)

Un seul module (`shared-header.js` sur ce projet) mesure la vue :

```js
var vv = window.visualViewport;               // absent : navigateur ancien, on ne fait rien
var hauteurRef = 0;                           // plus grande hauteur connue, sans clavier
var perte = hauteurRef - vv.height - (vv.offsetTop || 0);
var ouvert = perte > 140;                     // 140 px : sous ce seuil, c'est la barre d'URL
document.documentElement.classList.toggle('cc-kb-open', ouvert);
```

Écouter `visualViewport.resize`, `visualViewport.scroll`, `window.resize` et
`orientationchange` (en remettant `hauteurRef` à 0 dans ce dernier cas).

### Étape 3 : le CSS associé

```css
html.cc-kb-open .mobile-bottom-nav {
    transform: translateY(110%);
    opacity: 0;
    pointer-events: none;
}
```

Toujours vérifier que le champ garde **au moins une ligne visible au-dessus du
clavier** après la manœuvre.

### Étape 4 : vérifier à la taille réelle, pas au feeling

Mesurer, en mode appareil (390 × 844), avec les DevTools :

* `getComputedStyle(barre).position` → `static` si elle doit rester dans le flux ;
* position/`height` du bouton d'action (cible tactile **≥ 44 px**) ;
* `document.documentElement.scrollWidth - clientWidth` → **0** (aucun scroll
  horizontal parasite) ;
* la classe `cc-kb-open` posée à la main → la barre basse sort de l'écran ;
* le dernier champ de chaque étape n'est jamais recouvert.

Sur ce projet, `http://127.0.0.1:8899` (`python -m http.server`) + les DevTools
en mode appareil suffisent ; pas besoin de téléphone pour ces vérifications.

## Pièges déjà rencontrés (à ne pas refaire)

* **`position: fixed; bottom: 64px`** sur la barre d'action d'un wizard : elle
  suit le scroll et se colle au-dessus du clavier. Dans le flux, elle ne pose
  plus de question. Si on la remet en fixe un jour, elle doit s'effacer pendant
  la saisie.
* **Réserve en `padding-bottom: 104px`** ajoutée pour compenser une barre
  fixe : quand la barre redevient statique, cette réserve laisse un trou blanc.
  La retirer dans le même commit.
* **`100vh`** en mobile : le clavier et la barre d'URL le faussent. Utiliser
  `dvh` (ou `var(--cc-vv-h)` déjà présent sur ce projet) — jamais `vh` nu.
* **Barre d'action collée au bord bas** : sans
  `env(safe-area-inset-bottom)`, elle passe sous la barre gestuelle de
  l'iPhone.
* **Tester seulement en 360 px** : 430 px (grands téléphones) et le paysage
  cassent souvent ce que 360 px tolérait.

## Definition of done (mobile)

- [ ] Aucune barre fixe ne recouvre un champ pendant la saisie.
- [ ] Le bouton d'action principal est atteignable sans scroller et mesure
      ≥ 44 px de haut.
- [ ] Aucun scroll horizontal à 360 / 390 / 430 px.
- [ ] `100dvh`/variables de vue utilisées, pas `vh` nu.
- [ ] Vérifié en mode appareil (mesures), pas seulement « ça a l'air bon ».
