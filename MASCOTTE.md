# Le petit voyageur (mascotte)

Le personnage qui marche en bas de page. Il est **uniquement** sur deux pages :

- `index.html` (accueil)
- `results.html` (page des offres)

## Les fichiers

- `mascotte.js` — le personnage lui-même (copie exacte du fichier de travail
  `Desktop/colisconnect-mascotte/mascotte.js`, version 2.3.0). Il fabrique tout
  seul son dessin, son style et son animation : aucun autre fichier à charger.
- `mascotte-site.js` — la « pose » sur le site. Trois réglages, rien d'autre :
  1. il passe **sous** les boutons flottants (`z-index: 40`, le bouton Filtres
     de la page des offres est à 50 : il garde donc son clic) ;
  2. sur mobile il se pose **au-dessus** de la barre du bas (64 px) pour ne pas
     être coupé ;
  3. il dit la phrase du bon endroit (accueil ou offres).

## Comment l'allumer / l'éteindre sur une page

Deux lignes, juste avant `</body>` :

```html
<script src="mascotte.js?v=1" defer></script>
<script src="mascotte-site.js?v=1" defer></script>
```

Supprimer ces deux lignes = plus de mascotte sur la page. Rien d'autre à défaire.

## Comportement

- Il salue une fois, puis marche le long du bas de l'écran.
- On peut l'attraper, le faire écouter, le reposer.
- Le jeter d'un geste rapide lance la scène du grand départ (il demande
  « Tu veux que je parte ? » — Oui / Non), une seule fois toutes les 12 h.
- Bouton de fermeture : « ne plus afficher » (30 jours, par navigateur).
- **Mode Calme** (bouton « Mode Calme (Neurodiversité) » du site) : il reste
  immobile. Le mode calme du site met la classe `is-calm` sur `<body>`, et la
  mascotte la lit déjà — rien à brancher.

## Mettre à jour le personnage

Recopier le fichier de travail, puis monter le numéro de version pour forcer le
navigateur à recharger :

```bash
cp ~/Desktop/colisconnect-mascotte/mascotte.js .
# puis : mascotte.js?v=2 dans index.html et results.html
```

## Annulation (rollback)

Le point de retour est le tag **`ROLLBACK-MASCOTTE-AVANT`** (commit `738be7c`,
l'état du site juste avant la mascotte). Il est aussi sur GitHub.

```bash
git reset --hard ROLLBACK-MASCOTTE-AVANT
git -c http.proxy= push --force origin main
```

Variante sans réécrire l'historique :

```bash
git revert 129dec3   # le commit qui a apporté la mascotte
git -c http.proxy= push origin main
```

Après un retour en arrière : GitHub Pages met ~1 minute à servir la page, et le
navigateur garde les fichiers 10 minutes (Ctrl+Shift+R pour forcer).
