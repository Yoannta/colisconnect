# ColisConnect | Premium Product Blueprint

## Vision

ColisConnect connecte deux besoins en une experience simple:
- envoyer un colis rapidement,
- proposer des places disponibles pendant un voyage.

La version cible doit transmettre une image premium, fiable et claire, sans friction pour l'utilisateur.

## Signatures Produit

- Decision Gate d'accueil (carre diagonal a deux actions fortes).
- Recherche d'offres orientee pays (liste predefinie pour eviter fautes de saisie).
- Contact direct depuis une offre vers la messagerie.
- Dashboard personnel clair (offres publiees + conversations).

## Stack Technique

- Front: HTML5, CSS, JavaScript vanilla
- Back: Node.js HTTP + SQLite
- Auth: token bearer (localStorage)

## Structure Projet

- `index.html`: page d'accueil, choix des actions.
- `results.html`: liste des offres + filtres.
- `post_trip.html`: publication d'offre de trajet.
- `dashboard.html`: vue personnelle (offres, conversations).
- `chat.html`: messagerie.
- `admin.html`: panneau admin (optionnel selon role).
- `script.js`: logique front principale.
- `style.css`: systeme visuel global.
- `backend/server.js`: API, auth, persistence.
- `disigns_elite.md`: reference design premium et directives d'execution.
- `collaboration.md`: journal de coordination multi-agent.

## Principes de Developpement

1. Coherence avant complexite.
2. Chaque ecran doit avoir un objectif unique clair.
3. Aucun changement design ne doit casser les flux auth/offres/chat.
4. Toujours verifier comportement mobile + desktop.
5. Prioriser lisibilite, vitesse, et confiance utilisateur.

---
Maintenu par Antigravity + ChatGPT/Codex pour l'evolution continue de ColisConnect.

