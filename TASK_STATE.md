# ColisConnect Audit Compact State

## Goal
Audit visual de `https://yoannta.github.io/colisconnect/` page par page, visible desktop puis mobile, et consigner les defauts dans `C:/Users/hp/Desktop/audit.md`.

## Rules
- Utiliser `chrome-devtools` pour le vrai site live, pas le serveur local.
- Travailler page par page et s'arreter apres chaque page.
- Si une auth est demandee, preferer Google et utiliser `yoann.tato@gmail.com`.
- Ne pas corriger le code pour l'instant, seulement identifier les problemes et proposer une correction probable.
- Si une correction initiale devient fausse apres analyse d'une autre page, la mettre a jour dans `audit.md`.

## Pages deja auditees
1. Accueil
   - Typo visible dans la nav: `Pubier un offre`.
   - Hero avec artefacts d'encodage visibles dans le rendu live.
   - Header trop lourd et navigation trop presente.
   - Certaines cartes repetent du texte de facon maladroite.
2. Resultats
   - Typo de nav repetee.
   - Trop de couches de navigation/filtres, surtout sur mobile.
   - Tab desactive qui ressemble a une fonctionnalite cassée.
3. Publication
   - Bloquee par la modale d'auth sur cette passe.
   - Modale d'auth dense, icone Google visuellement cassee dans la capture.
   - Titre trop grand sur petite largeur.

## Current status
- `chrome-devtools` fonctionne et montre le vrai navigateur live.
- Le navigateur est controlable via MCP.
- Prochaine page a reprendre: navigation vers la page suivante du site live, puis audit visuel et update de `audit.md`.
