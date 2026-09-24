# RAPPORT — Mascotte 2D libre + 4 modes de déplacement

**Fichier** : `mascotte.js` (version 2.5.0 → **2.6.0**)
**Branche** : `feature/mascotte-guide`
**Commit local** : `73f82860303ebd5eee6577b7ada0651141018eea` (`73f8286`)
**Page de test** : `test-mascotte.html`
**Sauvegarde** : `mascotte.js.bak_20260924_073824` (ignorée par git, comme toutes les `*.bak_*`)

---

## 1. Méthodes ajoutées (API publique)

Toutes exposées sur l'instance retournée par `mount()` **et** sur `CCMascotte` (enveloppes défensives).

| Méthode | Rôle | Retour |
|---|---|---|
| `entrerEnLibre()` | La mascotte quitte la bande du bas : `.ccm-perso` passe en `position:fixed` (left/top en pixels). Le `.ccm-root` reste `pointer-events:none` ; seul le petit personnage garde `pointer-events:auto`. | `boolean` |
| `sortirDeLibre()` | Retour à la bande du bas exactement comme avant (left/top retirés, repositionnement absolu, `repos()` relance la vie). | `boolean` |
| `allerVers(px, py, dureeMs)` | Déplacement animé générique (interpolation 2D via `requestAnimationFrame`), oriente le corps (`tournerVers`). `dureeMs` optionnel (sinon calculé sur `VITESSE`). | `Promise<boolean>` |
| `walkTo(px, py)` | Marche 2D : jambes animées (`ccm-marche`), petite distance. | `Promise<boolean>` |
| `flyTo(px, py)` | Vol 2D : classe `ccm-envol` (léger décalage vertical), ~1,8× plus vite. | `Promise<boolean>` |
| `teleportTo(px, py)` | Téléportation : fondu sortant (`ccm-teleporte`), déplacement invisible, fondu entrant. | `Promise<boolean>` |
| `pointTo(eltOuX, y)` | **Ne se déplace pas.** Accepte un élément DOM, un sélecteur CSS ou `(x, y)`. Se tourne vers la cible et tend le bras (`ccm-pointe`). | `boolean` |
| `choisirMode(px, py)` | Choix auto selon la distance : `'walk'` ≤ 420 px, `'fly'` ≤ 1600 px, sinon `'teleport'`. | `string` |

**Méthodes modifiées :**
- `getPosition()` → renvoie désormais `{ x, y, libre }` (coordonnées **réelles** viewport ; `libre` indique le mode courant). Rétro-compatible (`.x`/`.y` inchangés).
- `pointer(dir)` → amélioré : oriente le corps + tend le bras (`ccm-pointe` sur le root), retour booléen propre. (L'ancienne version posait des classes sur le SVG sans CSS associé.)

**Seuils configurables** : `mount({ seuils: { walk_max_px, fly_max_px, marge_ecran_px } })`. Valeurs par défaut alignées sur `guide.json` (`reglages`) : 420 / 1600 / 12.

## 2. Classes CSS créées

| Classe | Effet |
|---|---|
| `.ccm-root.ccm-guide` | Marqueur du mode guidage (réservé). |
| `.ccm-perso.ccm-libre` | `position:fixed; bottom:auto` (réutilise la classe déjà présente pour l'attrapage). |
| `.ccm-root.ccm-envol .ccm-perso` | Animation `ccmEnvol` : léger soulèvement `translateY(0 → -12px)` en boucle. |
| `.ccm-root.ccm-envol .ccm-ombre` | Ombre au sol atténuée pendant le vol. |
| `@keyframes ccmEnvol` | `translateY(0) → translateY(-12px)`. |
| `.ccm-perso.ccm-teleporte` | `opacity:0` (fondu sortant/entrant de la téléportation). |
| `.ccm-root.ccm-pointe .ccm-bras-av` | `rotate(-88deg)` : le bras avant se tend pour pointer (transition `transform .32s`). |

Aucun nouveau SVG, aucune image, aucun réseau : tout passe par `transform`/`transition`/`opacity` comme le reste du fichier.

## 3. Comportement préservé (contrainte n°1)

Aucun changement quand **aucun guidage n'est actif** :
- `libre()` interne ajoute `&& !modeLibre` (faux par défaut) → l'automate `repos`/`saluer`/`sePoser`/`lancer` ne change pas.
- Gardes `|| modeLibre` ajoutés à `saluer()`, `sePoser()` et au `setTimeout` de `lancer()` : inactifs tant qu'on n'est pas en mode libre.
- Vérifié sur `index.html` et `results.html` : la mascotte marche en bas de page exactement comme avant (position `y=535`, `libre:false`, aucune erreur console).

## 4. Ce qui a été testé (et résultat)

Vérifications **réelles** dans un navigateur (via la page `test-mascotte.html`, journal à l'écran, aucune console) :

| Test | Résultat |
|---|---|
| `walkTo(200, 300)` | ✅ ok → `x=200, y=300 (libre)` |
| `flyTo(900, 500)` | ✅ ok → `x=900, y=500 (libre)` |
| `teleportTo(100, 100)` | ✅ ok → `x=100, y=100 (libre)` |
| `pointTo('#cible')` | ✅ true, **position inchangée** `x=100, y=100` |
| `getPosition()` / `getSize()` | ✅ `x=100, y=100 (libre)` / `56×79 px` |
| `sortirDeLibre()` | ✅ true → `x=100, y=535 (bande)` ✅ en bas |
| `choisirMode` 250px / 800px / 3000px | ✅ `walk` / `fly` / `teleport` |
| Marges écran (390×844, 768×1024, desktop) | ✅ `teleportTo` vers coordonnées hors-écran → clampé à `x=1190, y=531`, « ✅ dans les marges » (12 px) |
| Syntaxe | ✅ `node -e "new (require('vm').Script)(...)"` → `OK` |
| `index.html` / `results.html` | ✅ aucune erreur, mascotte en bas, v2.6.0 |

Note : `window.resizeTo()` est ignoré dans un onglet classique (le navigateur de test affiche « fenêtre réelle : 1258×622 ») — c'est le comportement attendu. Le test de taille valide quand même le **clamp aux marges** (l'essentiel) à la taille courante ; pour des tailles exactes, redimensionner la fenêtre à la main puis re-cliquer.

## 5. Ce qui reste à faire (tâche ultérieure)

- **Doigt + halo complets** pour `pointTo` : aujourd'hui on tend le bras avant (`ccm-pointe`) et on oriente le corps — c'est visible et propre, mais il n'y a pas encore de doigt dessiné ni de halo pulsant autour de la cible (`data-guide`). À raccrocher sur `pointTo` (et `pointer`).
- Brancher le **contrôleur de parcours** (`guide.json` → étapes) sur ces méthodes : lire le `mode` préféré de chaque étape, le confronter à `choisirMode()`, puis appeler le mode retenu + `parler(bulle)` + `pointTo(doigt)`.
- Si besoin : exposer un setter de seuils à chaud (aujourd'hui les seuils se passent à `mount()`).
