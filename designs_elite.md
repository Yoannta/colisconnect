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
*Maintenu par Antigravity & ChatGPT.*
