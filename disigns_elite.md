# Elite Design Database | ColisConnect

Ce document est la base de reference design pour toute IA qui intervient sur ColisConnect. Objectif: un rendu premium, coherent et memorisable.

---

## 1. Design Direction

**Concept:** "Aero Logistics Prestige"
- Atmosphere: precision, vitesse, confiance.
- Eviter les interfaces banales.
- Donner une sensation de produit haut de gamme, pas de template generique.

## 2. Visual System

### Tokens (a maintenir dans `style.css`)

- Couleurs:
  - fond principal profond, contraste lisible
  - accent principal energique (CTA)
  - accent secondaire pour infos logistiques
- Surfaces:
  - panneaux glass subtils
  - bordures fines a faible opacite
- Radius:
  - grands blocs: doux
  - boutons d'action: plus nets
- Ombres:
  - shadows profondes mais propres

### Typographie

- Titres: expression forte, nette.
- Corps: lisibilite immediate.
- Eviter les tailles trop petites sur composants critiques (cartes, badges, filtres).

## 3. Interaction & Motion

- Apparitions en cascade (stagger) sur sections/carts.
- Transitions courtes et stables (pas d'effets excessifs).
- Etats clairs sur CTA: normal, hover, loading, disabled.

## 4. Composants Prioritaires

1. Hero + Decision Gate diagonal (index).
2. Panneau filtres + cards d'offres (results).
3. Form publication premium (post_trip).
4. Cards dashboard (offres/conversations).
5. Layout messagerie (chat sidebar + thread).

## 5. Collaboration Directives

1. Toujours aligner design + logique produit.
2. Valider d'abord la direction globale avant micro-details.
3. Documenter chaque choix visuel majeur dans `collaboration.md`.
4. Ne jamais degrader l'existant fonctionnel pour un effet visuel.
5. Toute nouvelle proposition doit inclure impact mobile.

## 6. Quality Gate Avant Validation

1. Lisibilite: score visuel clair sur titres/labels/champs.
2. Coherence: meme langage visuel sur toutes les pages.
3. Performance: pas d'animation lourde inutile.
4. Conversion: CTA principaux visibles sans confusion.
5. Regression: auth, offres, chat, dashboard intacts.

---
Maintenu par Antigravity + ChatGPT/Codex.

