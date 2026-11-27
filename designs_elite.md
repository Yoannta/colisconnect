# 💎 Elite Design Database | L'ÉCOLE DU E-COMMERCE

Ce document constitue la base de connaissance technique des signatures visuelles "Elite" approuvées par l'utilisateur. Il doit servir de guide de référence pour toute future IA intervenant sur le projet afin de maintenir l'excellence cinématique.

---

## 1. Liquid Depth (Physique du Verre)

**Concept** : Donner une sensation de fluidité et de relief aux éléments "Glassmorphism" en les faisant réagir physiquement au mouvement du curseur.

### Implémentation

- **CSS** : Classe `.liquid-layer` avec `will-change: transform`.
- **JS (GSAP)** :

```javascript
document.addEventListener('mousemove', (e) => {
    const xPercent = (e.clientX / window.innerWidth) - 0.5;
    const yPercent = (e.clientY / window.innerHeight) - 0.5;
    
    gsap.to(".auth-card", {
        rotationY: xPercent * 8,
        rotationX: -yPercent * 8,
        skewX: xPercent * 5,
        skewY: yPercent * 5,
        duration: 0.8,
        ease: "power2.out"
    });
});
```

---

## 2. Nexus Gate (Moteur Morphing)

**Concept** : Un noyau central "vivant" qui respire et pulse, symbolisant la transformation.

### Implémentation

- **SVG** : Path complexe avec morphing via GSAP `attr: { d: path }`.
- **Atmospheric Rings** : Anneaux en rotation inverse avec opacité variable.

```javascript
// Nexus Path Morphing logic
const paths = ["path1_d", "path2_d", "path3_d"];
function animateNexus() {
    gsap.to("#nexus-path", { duration: 4, attr: { d: paths[next] }, ease: "sine.inOut" });
}
```

---

## 3. Nexus Auth Holographique (Système de Particules)

**Concept** : Une interface de données 3D fusionnant particules magnétiques et optiques réfractives.

### Piliers Techniques

1. **Magnetic Particles (Canvas 2D)** : 1200 particules orbitant le Nexus.
2. **Focus Gravity** : Contraction du nuage lors du focus sur un `<input>`.
3. **Refraction Filters** : Filtre SVG `feDisplacementMap` simulant du verre liquide.
4. **Z-Parallax** : Structure sur 3 plans (`translateZ`) réagissant au mouvement.

### Optique d'Élite (Filtre SVG)

```xml
<filter id="refraction-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" />
</filter>
```

---

## 📜 Directives de Collaboration "Elite"

- **Zéro Placeholders** : Utiliser `generate_image` pour tout visuel.
- **Cinematic Stagger** : Ne jamais faire apparaître les éléments d'un coup. Toujours utiliser GSAP `stagger`.
- **Triple Validation** :
  1. Synchronisation entre agents.
  2. Présentation du concept "Master".
  3. Validation Utilisateur avant tout code.

---
---

# 💎 V2 — Signatures « ColisConnect-Premium » (27/11/2026)

Base de référence de la refonte V2. Les signatures de l'École du e-commerce ci-dessus
restent valables comme **principes** ; ce qui suit les traduit pour un produit
logistique : un colis, un trajet, une confiance.

## 1. Palette (jetons à utiliser tels quels)

| Jeton | Valeur | Usage |
|---|---|---|
| `--obsidian` | `#070B0A` | fond principal, jamais pur noir |
| `--obsidian-2` | `#0D1512` | surfaces surélevées |
| `--emerald` | `#12B886` | action principale, états actifs |
| `--emerald-deep` | `#0B6B4F` | dégradés, ombres colorées |
| `--gold` | `#D9B45B` | **uniquement** la confiance : vérifié, certifié, payé |
| `--ivory` | `#F2F5F3` | texte principal |
| `--mist` | `rgba(242,245,243,.62)` | texte secondaire |
| `--glass` | `rgba(255,255,255,.045)` | verre, bordure `rgba(255,255,255,.09)` |

Règle d'or : **le doré ne décore pas**, il certifie. Deux éléments dorés maximum par écran.

## 2. Trois signatures à porter (et à prouver)

### a. Liquid Depth v2 — la carte qui a du poids
Verre + parallaxe légère au curseur (`rotateX/Y` ≤ 4°, `skew` ≤ 2°), ombre portée
colorée `0 24px 60px rgba(11,107,79,.28)`, jamais de flou gratuit.
Doit rester **immobile** si `prefers-reduced-motion`.

### b. Flow Line — le trajet visible
Chaque offre porte une ligne fine qui relie origine → destination : tracé qui se
dessine au scroll (`stroke-dashoffset`), point lumineux qui parcourt la ligne en 3 s.
C'est la signature du produit : **on voit le colis avancer**, pas juste un trajet écrit.

### c. Nexus Gate v2 — l'accueil qui respire
Noyau central à facettes (faible poly) + anneaux en rotation inverse, opacité 4–12 %.
Interdits : particules > 800, animations qui dépassent 60 fps sur un portable, son.

## 3. Typographie et rythme

- Titres : sans-serif géométrique, `letter-spacing:-0.02em`, graisse 600, jamais > 64 px sur mobile.
- Corps : 16–18 px, interligne 1.6, largeur de lecture ≤ 68 caractères.
- Rythme vertical : échelle de 8 px. Un écran = **un seul** message dominant.

## 4. Mouvement

`entrée 320 ms (power2.out)` · `sortie 200 ms` · décalage en cascade 40 ms.
Interdit : rebond, rotation d'icônes, animation en boucle infinie visible.

## 5. Accessibilité (critère de refus)

- Contraste texte ≥ 4.5:1 (le doré sur obsidienne est OK, le vert clair sur verre **non**).
- Tout élément interactif : focus visible (anneau `--emerald` 2 px).
- Aucune information portée par la seule couleur.

## 6. Protocole de validation (rappel du contrat V2)

Un écran n'entre ici qu'avec : **capture réelle**, **état validé par Yoyo**, et une
ligne datée dans `collaboration.md`. Pas de capture = pas de signature.

---
*Maintenu par Hermes (V2). Écrans validés : aucun pour l'instant.*
