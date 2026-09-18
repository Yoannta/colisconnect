# Le petit voyageur (mascotte)

Le personnage qui marche en bas de page. Il est **uniquement** sur deux pages :

- `index.html` (accueil)
- `results.html` (page des offres)

## Les fichiers

- `mascotte.js` — le personnage lui-même (copie exacte du fichier de travail
  `Desktop/colisconnect-mascotte/mascotte.js`, version 2.4.0). Il fabrique tout
  seul son dessin, son style et son animation : aucun autre fichier à charger.
- `mascotte-site.js` — la « pose » sur le site. Trois réglages, rien d'autre :
  1. il passe **sous** les boutons flottants (`z-index: 40`, le bouton Filtres
     de la page des offres est à 50 : il garde donc son clic) ;
  2. sur mobile il se pose **au-dessus** de la barre du bas (64 px) pour ne pas
     être coupé ;
  3. il dit la phrase du bon endroit (accueil ou offres).

## Sa taille

Il mesure **56 x 79 px** sur un écran normal, soit la moitié de sa taille
d'origine (110 x 155). Il rétrécit encore sur les petits écrans :

| Écran | Sa taille | Le rail du bas |
| --- | --- | --- |
| très grand (≥ 1500 px) | 64 x 90 | 122 px |
| normal | **56 x 79** | 110 px |
| ≤ 900 px | 50 x 70 | 100 px |
| ≤ 620 px (mobile) | 46 x 65 | 92 px |

Sa phrase et ses boutons Oui / Non gardent leur taille normale (donc lisibles) :
seul le personnage rétrécit. Pour le regrossir, changer ces valeurs dans
`mascotte.js` (chercher « SA TAILLE ») — le reste suit tout seul.

## Comment l'allumer / l'éteindre sur une page

Deux lignes, juste avant `</body>` :

```html
<script src="mascotte.js?v=2" defer></script>
<script src="mascotte-site.js?v=1" defer></script>
```

Supprimer ces deux lignes = plus de mascotte sur la page. Rien d'autre à défaire.

Le numéro après `?v=` est un anti-cache : **monter celui de `mascotte.js` à
chaque modification du personnage** (sinon le navigateur garde l'ancien fichier
10 minutes). `mascotte-site.js` n'a pas changé, il garde `?v=1`.

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

Les deux points de retour sont sur GitHub (et en local) :

- **`ROLLBACK-TAILLE-AVANT`** (commit `7e78d0e`) — l'état du site juste avant
  que le personnage soit réduit de moitié. C'est le retour le plus récent.
- **`ROLLBACK-MASCOTTE-AVANT`** (commit `738be7c`) — l'état du site juste avant
  la mascotte.

```bash
git reset --hard ROLLBACK-TAILLE-AVANT
git -c http.proxy= push --force origin main
```

Variante sans réécrire l'historique (garder l'historique intact, préférable) :

```bash
git revert 7c94fb1   # le commit qui a réduit sa taille de moitié
git revert 129dec3   # le commit qui a apporté la mascotte (tout enlever)
git -c http.proxy= push origin main
```

Après un retour en arrière : GitHub Pages met ~1 minute à servir la page, et le
navigateur garde les fichiers 10 minutes (Ctrl+Shift+R pour forcer).
