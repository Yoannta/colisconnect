# ROLLBACK — Mascotte guide

## Situation

Le chantier « mascotte guide » est developpe sur la branche `feature/mascotte-guide`.
L'etat du site AVANT ce chantier est fige par le tag `rollback-avant-mascotte`
et par une sauvegarde complete du dossier sur le disque F:.

## Revenir en arriere — methode 1 (Git, recommandee)

    cd C:\Users\hp\.gemini\antigravity\scratch\colis_connect
    git checkout main
    git reset --hard rollback-avant-mascotte
    git push --force-with-lease origin main

## Revenir en arriere — methode 2 (copie disque)

    La sauvegarde complete est dans F:\ROLLBACK_colisconnect_<date>_<heure>
    Il suffit de recopier son contenu a la place du dossier actuel.

## Annuler seulement la mise en ligne du guide (sans rien perdre)

Si le guide pose probleme sur le site en ligne mais qu'on veut garder le travail,
il suffit de retirer les balises <script> des pages concernees :

    <script src="guide-controller.js"></script>
    <script src="guide-session.js"></script>
    <script src="guide-intents.js"></script>
    <script src="mascotte-chat.js"></script>

Sans ces balises, le guide ne se charge plus du tout : le site redevient exactement
comme avant, et les fichiers restent disponibles pour la suite.

## Verification apres rollback

    - ouvrir le site : la mascotte se comporte comme avant (elle marche en bas)
    - aucun message d'erreur dans la console (F12)
    - les pages du site sont identiques a l'avant-chantier
