---
title: Colisconnect
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
app_file: backend/server.js
pinned: true
---
# ColisConnect | Premium Parcel Stream

## 🌌 Vision & Excellence

ColisConnect est une plateforme de logistique peer-to-peer réinventée, connectant des expéditeurs avec des voyageurs certifiés pour un transport de colis fluide, sécurisé et ultra-rapide.

## 🚀 Signatures Technologiques (Redesign Premium)

Le site a été transformé avec un design **Ultra-Premium** utilisant l'outil **Stitch** :

- **Emerald-Obsidian Palette** : Une esthétique profonde et luxueuse basée sur des tons émeraude et noir obsidienne.
- **Nexus Gate Background** : Un arrière-plan dynamique avec des lueurs pulsantes et une texture de bruit subtile.
- **Liquid Depth Glassmorphism** : Un système de composants en verre avec flou haute fidélité et bordures lumineuses.
- **Floating Glass Navigation** : Une barre de navigation flottante et interactive.
- **Smooth View Transitions** : Transitions fluides (fade & scale) gérées en JavaScript pour une navigation cinématique.

## ðŸ› ï¸ Stack Technique

- **Design Engine** : Stitch (by Google)
- **Frontend** : HTML5, Vanilla CSS, Modern JavaScript
- **Animations** : CSS Keyframes & Web Transitions API
- **Backend** : Node.js (V2 avec SQLite)

## ðŸ“‚ Structure du Projet

- `index.html` : Landing page et application principale (SPA).
- `style.css` : Système de design centralisé (Emerald-Obsidian).
- `main.js` : Moteur de navigation et interactions.
- `backend/` : Serveur Node.js et base de données SQLite.
- `admin.html` & `admin.js` : Interface de gestion et modération.

---
*Propulsé par la vision d'excellence de Rodrigue GUEDEU.*

## Journal des mises a jour - 2026-02-21

### Nouvelle page autonome: `post_trip.html`

- Remplacement de l'ancien fichier de redirection par une vraie page complete.
- Reprise de la meme structure que la page de reference (header/nav, intro, bloc avantages, formulaire).
- Application du design actuel Emerald-Obsidian via `style.css`.

### Nouveau script: `post_trip.js`

- Ajout de la logique front dediee a la publication d'offre.
- Connexion du formulaire a l'API backend `POST /api/offers` avec le token `cc_token`.
- Gestion de session (`GET /api/auth/me`), affichage du lien admin, et deconnexion.
- Ajout de la liste de pays (datalist) et validation des pays avant publication.

### Redirections depuis `index.html`

- Mise a jour de `main.js`: toute action `data-route="propose"` redirige maintenant vers `post_trip.html`.
- Cela couvre tous les boutons lies a "Publier une offre" sur la page d'accueil (menu, hero, carte split, panneau).
- La vue `propose` n'est plus traitee comme vue SPA protegee interne.

### Fichiers modifies

- `post_trip.html`
- `post_trip.js`
- `main.js`
- `style.css`

### Correctif backend admin (SQL) - 2026-02-21

- Bug reproduit sur les actions admin (`DELETE /api/admin/users/:id`) avec erreur SQL: `no such table: main.travelers`.
- Cause racine: presence de tables legacy `conversations/messages` (ancien modele) avec cle etrangere vers `travelers` (table absente), ce qui cassait les operations de suppression utilisateur.
- Correctif applique dans `backend/server.js`: nettoyage automatique au demarrage des tables legacy `messages` et `conversations`.
- Impact: suppression utilisateur admin et operations de moderation de nouveau fonctionnelles sans erreur SQL liee au schema legacy.

### Fichier backend modifie

- `backend/server.js`

### Cohérence multi-pages (frontend) - 2026-02-21

- Conversion des anciennes pages de redirection en vraies pages fonctionnelles: `auth.html`, `results.html`, `dashboard.html`, `chat.html`.
- Harmonisation de l'entete sur ces pages + `post_trip.html` avec le meme composant visuel (`site-header`, branding, nav, zone auth).
- Ajout d'un script commun `standalone-common.js` pour la gestion de session/token, API, affichage utilisateur/admin, et deconnexion.

#### Nouvelles logiques front

- `auth.js`: connexion + inscription avec redirection `next`.
- `results.js`: recherche d'offres, affichage des demandes ouvertes, reservation et ouverture conversation.
- `dashboard.js`: affichage de mes offres, demandes et reservations + annulation d'offre.
- `chat.js`: liste conversations, lecture/envoi messages.
- `post_trip.js`: publication d'offre branchee sur le script commun et header unifie.

#### Ajustements de routage/cohérence

- `messages.html` redirige maintenant vers `chat.html`.
- `proposer.html` redirige maintenant vers `post_trip.html`.
- `result.html` redirige maintenant vers `results.html`.
- Mise a jour CSS pour coherencer les liens de nav (ancres) et l'entete de `post_trip`.

#### Fichiers ajoutes

- `standalone-common.js`
- `auth.js`
- `results.js`
- `dashboard.js`
- `chat.js`

#### Fichiers mis a jour

- `auth.html`
- `results.html`
- `dashboard.html`
- `chat.html`
- `post_trip.html`
- `post_trip.js`
- `messages.html`
- `proposer.html`
- `result.html`
- `style.css`

### Ajustement UI Results - 2026-02-21

- Suppression de la section "Mes demandes ouvertes" dans `results.html`.
- Conservation uniquement du bloc principal des resultats d'offres.
- Ajustement de layout via `style.css` avec `.search-layout.single-column` pour garder la largeur complete.

### Ajustement Dashboard - 2026-02-21

- Suppression de la section "Mes demandes" dans `dashboard.html`.
- Ajout de la section "Mes conversations" avec chargement via `GET /api/conversations`.
- Ajout de la suppression d'offre depuis le dashboard via icone poubelle (`DELETE /api/offers/:id`).
- Ajout de la suppression de conversation depuis le dashboard via icone poubelle (`DELETE /api/conversations/:id`).
- Ajout du style commun `.icon-trash-btn` dans `style.css` pour les actions de suppression.

### Correction Dashboard (suite) - 2026-02-21

- Suppression definitive de la section `Mes conversations` dans `dashboard.html`.
- La suppression de conversation est conservee depuis `Mes reservations` (icone poubelle uniquement si `chatThreadId` existe).
- La suppression d'offre reste active depuis `Mes offres`.

### Correction Dashboard (final) - 2026-02-21

- Demande ajustee: suppression de `Mes reservations` (et non `Mes conversations`).
- Section `Mes conversations` restauree dans `dashboard.html`.
- `dashboard.js` aligne sur ce choix: affichage + suppression des conversations via icone poubelle, avec suppression d'offre conservee.

### Correction routing accueil - 2026-02-21

- Correction des boutons de la page d'accueil (`index.html` via `main.js`) pour rediriger vers les pages dediees:
  - `search` -> `results.html`
  - `propose` -> `post_trip.html`
  - `messages` -> `chat.html`
- Le cas indique (`Je veux envoyer un colis`) redirige maintenant vers `results.html` au lieu de `index.html#search`.

### Systeme popup auth global - 2026-02-21

- Mise en place d'une garde de navigation pour les utilisateurs deconnectes:
  - sur `index.html`, toute action vers `search/propose/messages` ouvre d'abord la popup;
  - sur les pages standalone, clic sur lien protege => popup au lieu de redirection brute.
- Popup en 2 etapes:
  - etape 1: panneau "Connexion requise" avec choix `Se connecter` / `Creer un compte`;
  - etape 2: au clic sur un choix, la popup s'agrandit (`.modal-expanded`) et affiche le formulaire correspondant.
- Redirection post-auth:
  - apres connexion/inscription reussie, l'utilisateur est renvoye vers sa destination demandee initialement.
- Coherence supplementaire:
  - suppression de la redirection `auth.html` restante dans `post_trip.js` (401) au profit de la popup.

### Fichiers mis a jour (auth popup global)

- `main.js`
- `standalone-common.js`
- `style.css`
- `post_trip.js`

### Profil progressif + blocage actions sensibles - 2026-02-21

- Nouveau processus de complétion profil (après inscription de base):
  - téléphone;
  - pièce justificative (upload image);
  - photo de profil (upload image).
- Ces champs restent optionnels à l'inscription, mais deviennent obligatoires pour les actions sensibles.

#### Règles de blocage appliquées

- Si profil incomplet, blocage avec popup dédiée (`Profil incomplet`) pour:
  - publication d'offre;
  - prise de contact/messages;
  - réservation/souscription à une offre.
- La popup redirige vers une nouvelle page `verification.html` avec paramètre `next` pour revenir vers la destination demandée après complétion.

#### Pourcentage de progression

- Calcul de progression en 4 étapes:
  - compte créé = 25%;
  - - téléphone = 50%;
  - - pièce = 75%;
  - - photo = 100%.
- Affichage de la progression et des champs manquants sur `dashboard.html`.

#### Backend ajouté / renforcé

- Ajout de colonnes utilisateur:
  - `phone_number`
  - `identity_document`
  - `profile_photo`
- `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/register` renvoient maintenant l'état `profileCompletion`.
- Nouvel endpoint: `PATCH /api/users/me/profile` pour enregistrer téléphone + uploads (base64 image).
- Garde serveur ajoutée: refus (`PROFILE_COMPLETION_REQUIRED`) si profil incomplet sur actions sensibles:
  - `POST /api/offers`
  - `POST /api/parcel-requests`
  - `POST /api/reservations`
  - `POST /api/conversations/by-reservation`
  - `POST /api/conversations/:id/messages`

#### Frontend ajouté / modifié

- Nouvelle page: `verification.html` + `verification.js`.
- `standalone-common.js`:
  - popup auth + popup profil incomplet;
  - helper `requireCompletedProfile`;
  - interception navigation avec redirection vers complétion.
- `main.js` + `index.html`:
  - popup profil incomplet intégrée;
  - blocage des routes `propose/messages` si profil incomplet.
- `dashboard.html` + `dashboard.js`:
  - barre de progression + liste des infos manquantes + bouton de complétion.
- `results.js`, `post_trip.js`, `chat.js`:
  - garde locale de complétion profil avant actions sensibles.
- `style.css`:
  - styles de barre de progression.

### Fichiers ajoutés (profil progressif)

- `verification.html`
- `verification.js`

### Fichiers modifiés (profil progressif)

- `backend/server.js`
- `standalone-common.js`
- `index.html`
- `main.js`
- `results.js`
- `post_trip.js`
- `chat.js`
- `dashboard.html`
- `dashboard.js`
- `style.css`

## Journal des mises a jour - 2026-02-24

### Simplification du flux client (recherche + contact direct)

- **Suppression des demandes d'envoi cote client** : le formulaire `Demander un envoi (client)` a ete desactive dans `index.html`.  
  Les clients ne publient plus de `parcel_requests` manuellement; ils se contentent de chercher des offres et de contacter les voyageurs.
- **Mise a jour de l'UI** :
  - Le bouton sur chaque carte d'offre passe de **"Reserver cette offre"** a **"Contacter"** dans `main.js` (vue search de `index.html`) et `results.js` (`results.html`).
  - Le panneau "Mes demandes ouvertes" affiche maintenant un message expliquant que le contact se fait directement depuis les offres.

### Nouveau flux de contact: offre -> chat

- **Front** :
  - Clic sur **"Contacter"** redirige vers `chat.html?offerId=<id>` (chemin relatif, compatible avec `file://` et HTTP).
  - `chat.js` lit `offerId` dans l'URL et appelle un nouvel endpoint pour garantir l'existence d'une conversation pour cette offre, puis l'ouvre automatiquement dans le panneau de messagerie.
- **Backend** (`backend/server.js`) :
  - Nouveau endpoint `POST /api/conversations/by-offer` :
    - verifie que l'utilisateur est connecte et verifie;
    - recupere l'offre cible;
    - cree en interne une **demande technique** + une **reservation technique** (non exposees dans l'UI) pour reutiliser le modele existant (`reservations`, `chat_threads`, `chat_messages`);
    - cree au besoin un `chat_thread` lie a cette reservation avec un premier message systeme, puis renvoie le thread.
  - Aucun "workflow de reservation" n'est expose a l'utilisateur final a ce stade: le clic sur "Contacter" sert uniquement a ouvrir un canal de discussion avec le voyageur.

### Fichiers modifies (contact direct)

- `index.html` (suppression du formulaire demandes clients)
- `main.js` (bouton "Contacter" + redirection vers `chat.html?offerId=...`)
- `results.js` (bouton "Contacter" + redirection vers `chat.html?offerId=...`, simplification "Mes demandes")
- `chat.js` (prise en charge de `offerId` et ouverture automatique de la conversation)
- `backend/server.js` (ajout de `POST /api/conversations/by-offer`)

### Workflow approbation utilisateur (admin) - 2026-02-21

- Implémentation de la validation utilisateur selon la méthode demandée:
  - affichage du pourcentage de progression dans le tableau `Utilisateurs` (admin);
  - bouton `Approuver` / `Desapprouver` dans la colonne `Actions`;
  - règle: approbation bloquée si progression `< 75%`, sauf pour l'admin `yoann.tato@gmail.com`.

#### Management admin: section approbations + bulle

- Ajout d'un bloc `Approbations utilisateurs` dans `admin.html`:
  - bulle de notification avec nombre d'approbations en attente;
  - bouton `Aller` vers la page dédiée `approvals.html`.
- La section s'affiche automatiquement uniquement si des approbations sont en attente.

#### Page dédiée aux approbations

- Nouvelle page `approvals.html` + script `approvals.js`:
  - liste des utilisateurs éligibles (>= 75%) non encore vérifiés;
  - action `Approuver` directe.

#### Backend approbation

- Nouveau champ utilisateur: `is_verified`.
- Nouveau endpoint:
  - `PATCH /api/admin/users/:id/verify` (`isVerified: true|false`) avec contrôle du seuil 75% + exception Yoann.
- Nouveau endpoint:
  - `GET /api/admin/users/pending-approvals`.
- `GET /api/admin/overview` enrichi avec `pendingApprovals`.
- `GET /api/admin/users` enrichi avec:
  - `profileCompletionPercent`,
  - `profileCompletionMissing`,
  - `approvalEligible`,
  - `approvalPending`.

#### Conséquences de l'approbation (côté user)

- Tant que non vérifié, les actions sensibles sont bloquées serveur/front:
  - publier une offre,
  - publier une demande,
  - réserver une offre,
  - créer/écrire dans une conversation.
- Une fois vérifié:
  - accès aux actions sensibles activé;
  - badge visible sur les offres du voyageur (`Voyageur verifie`) pour tous les utilisateurs.

### Fichiers ajoutés (approbation admin)

- `approvals.html`
- `approvals.js`

### Fichiers modifiés (approbation admin)

- `backend/server.js`
- `admin.html`
- `admin.js`
- `main.js`
- `standalone-common.js`
- `results.js`
- `dashboard.js`
- `verification.js`
- `style.css`

### Correctif cohérence approbation - 2026-02-21

- Correction anti auto-approbation:
  - à l'inscription, `is_verified` est maintenant forcé à `0` côté SQL (`INSERT ... is_verified=0`) pour éviter toute validation automatique liée à un défaut de schéma DB.
- Correction section admin:
  - la carte `Approbations utilisateurs` reste visible dans `Management Admin` même si le compteur est à 0;
- le bouton `Aller` est donc toujours accessible vers `approvals.html`.
- Objectif: le passage vers `verifie` se fait uniquement par action admin (`Approuver`) et plus automatiquement.

### Validation par section (CNI/Photo) + aperçu pièces - 2026-02-21

- `approvals.html` mis à jour:
  - colonnes dédiées `CNI/Passeport` et `Photo`;
  - dans chaque colonne: `Voir`, `Approuver`, `Annuler`.
- Le bouton `Voir` ouvre une nouvelle fenêtre avec l'image de la section ciblée.

#### Logique d'approbation globale

- L'utilisateur devient `verifie` uniquement si:
  - CNI/Passeport approuvé
  - ET Photo approuvée.
- Implémenté via flags backend:
  - `identity_document_approved`
  - `profile_photo_approved`
- Recalcul automatique `is_verified` après chaque décision admin.

#### Annulation d'une section

- En cas de `Annuler` sur CNI/Passeport ou Photo:
  - la pièce concernée est vidée (à reuploader);
  - le pourcentage de complétion baisse automatiquement côté dashboard;
  - un message admin préenregistré est envoyé à l'utilisateur pour demander correction.

#### Message admin côté utilisateur (boîte réception message)

- Nouveau flux de message admin:
  - table `admin_inbox_messages`;
  - endpoint utilisateur `GET /api/admin/inbox`.
- `chat.html` + `chat.js` affichent maintenant un bloc `Messages admin` dans la messagerie.

#### Nouveaux endpoints admin

- `GET /api/admin/users/:id/document?type=identity|photo` (prévisualisation pièce)
- `PATCH /api/admin/users/:id/review-section` avec:
  - `section`: `identityDocument` ou `profilePhoto`
  - `decision`: `approve` ou `reject`

### Fichiers modifiés (validation sectionnelle)

- `backend/server.js`
- `approvals.html`
- `approvals.js`
- `chat.html`
- `chat.js`
- `style.css`

### Correctif coherence verification/messages - 2026-02-21

- Probleme corrige: un utilisateur non verifie ne pouvait pas ouvrir `chat.html` pour lire les messages admin apres un refus de piece.
- Solution:
  - l'acces page `Messages` reste autorise pour tout utilisateur connecte;
  - la restriction verification reste seulement sur les actions sensibles (ex: envoi d'un message), pas sur l'ouverture de page.

#### Acces uploader en attente / 100%

- Probleme corrige: le bouton dashboard pour completer le profil etait masque quand progression >= 75%.
- Solution:
  - bouton dashboard toujours visible pour permettre mise a jour des fichiers a tout moment;
  - popup `Profil incomplet` en etat attente admin propose maintenant `Mettre a jour mes infos` et redirige vers `verification.html` au lieu de bloquer sur `Compris`.

#### Coherence des libelles verification

- `verification.js` affiche maintenant des statuts coherents:
  - `Compte verifie` si approuve;
  - `Profil complet - en attente d'approbation admin` si 75%+ non approuve;
  - `Profil incomplet` sinon.

### Fichiers modifies (correctif coherence)

- `standalone-common.js`
- `chat.js`
- `dashboard.js`
- `main.js`
- `verification.js`

### Historique des mises a jour (dernier cycle)

- Interface utilisateur:
  - `index.html` / `main.js`: navigation index vers `results.html`, `post_trip.html`, `chat.html` (boutons â€œExplorerâ€, â€œPublierâ€, â€œMessagesâ€) redirige vers les pages standalone attendues plutÃ´t que des ancres `#search/#messages`.  
  - `dashboard.html` / `dashboard.js`: progression de profil toujours visible, libellÃ©s contextuels (â€œMettre Ã  jour mes informations/piecesâ€), bouton reste accessible mÃªme Ã  100â€¯% pour rÃ©pondre Ã  un rejet dâ€™admin.  
  - `chat.html` / `chat.js`: lecture des conversations autorisée dès connexion; envoi continue de requérir profil complet.  
  - `verification.html` / `verification.js`: Ã©tiquettes unifiÃ©es (â€œCompte verifiÃ©â€, â€œProfil complet - en attenteâ€¦â€), redirection automatique vers le `next` seulement quand le dossier est complet (>=75â€¯% ou dÃ©jÃ  vÃ©rifiÃ©).  
- Authentification et navigation:
  - `standalone-common.js`: `chat.html`/`messages.html` retirÃ©s des vues nÃ©cessitant profil complÃ©tÃ©, message dâ€™attente amÃ©liorÃ© (â€œVous pouvez aussi mettre Ã  jour vos piÃ¨cesâ€), bouton â€œMettre Ã  jour mes infosâ€ toujours prÃ©sent.  
  - `auth.html`/`auth.js`: session set/remise à jour via `CCCommon` + redirection vers `dashboard` avec `next`.  
- Admin + approbations:
  - `admin.html` / `admin.js`: carte â€œApprobations utilisateursâ€ toujours visible, cardio statistique (`pendingApprovals`) calculÃ© cÃ´tÃ© API, bouton â€œAllerâ€ vers `approvals.html`, tableau utilisateurs affiche pourcentage de progression et actions cohÃ©rentes avec la logique sectionnelle.  
  - `approvals.html` / `approvals.js`: colonnes CNI/Photo avec actions â€œVoirâ€, â€œApprouverâ€, â€œAnnulerâ€, preview dans nouvelle fenÃªtre, workflow `PATCH /api/admin/users/:id/review-section`.  
  - `backend/server.js`: endpoints admin regroupés (`overview`, `pending-approvals`, `users`, documents, section review), recalcul `recomputeUserVerification`, `admin_inbox_messages` pour notifier les rejets, contraintes profil complet contrôlant `ensureUserVerifiedForSensitiveAction` (messages, réservations, offres).  
- Profil et vérification:
  - `verification.js` / `/api/users/me/profile`: upload phone/CNI/photo mis Ã  jour, envoi dâ€™image via base64, les champs â€œidentity_document_approvedâ€ et â€œprofile_photo_approvedâ€ rÃ©initialisÃ©s si le fichier est modifiÃ©.  
  - `README.md` et `collaboration.md`: documentation synchronisée pour chaque correction (approbations, coherence, message admin, popup profil).  
- Règle critique CNI/Passeport:
  - `recomputeUserVerification` valide immÃ©diatement lâ€™utilisateur dÃ¨s que la CNI/Passeport est approuvÃ©e, la photo restant facultative.
  - La popup â€œProfil incompletâ€ reste active tant que la CNI est absente et continue dâ€™Ã©numÃ©rer tÃ©lÃ©phone/piÃ¨ce/photo; dÃ¨s quâ€™elle est fournie, le message passe en â€œdossier en attente dâ€™approbation adminâ€ pour que lâ€™utilisateur conserve lâ€™accÃ¨s normal.
- Responsive:
  - `style.css` reçoit de nouvelles règles `@media` (max-width: 520px) pour empiler les navs, cards et formulaires, ajouter des table-scrolls sur mobile, et harmoniser les padding/flex afin que les pages (dashboard, admin, chat, index, post_trip) conservent leur lisibilité sur smartphone.
  - `responsive.js` dÃ©tecte la largeur et applique la classe `mobile-mode`/`desktop-mode` sur le `body`, permettant dâ€™activer dynamiquement la version mobile distincte (homogÃ©nÃ©isation des marges, navs empilÃ©s, joues de tableau scrollables) ou la version bureau, selon lâ€™appareil.
- Mobile-only UI :
  - `mobile-mode` ajoute `mobile-card` pour les panels, renforce les contrastes } et donne à la messagerie/aux listes un fond plus foncé sur mobile (bord arrondi, ombre douce).
  - `password-toggle.js` Ã©quipe tous les champs `type="password"` dâ€™un bouton Å“il qui affiche/masque la saisie pour les fenÃªtres sur lesquelles on entre un mot de passe (modal login, `auth.html`, etc.), sans impacter le desktop.
- Destination / téléphone :
  - `results.html` sâ€™appuie sur un `<datalist>` de pays pour la destination, ce qui limite la saisie aux options enregistrÃ©es.
  - `verification.html` propose un `<datalist>` de prÃ©fixes tÃ©lÃ©phoniques et `verification.js` complÃ¨te automatiquement le code sÃ©lectionnÃ© pour que lâ€™utilisateur puisse ensuite taper le reste de son numÃ©ro.
- Datalist helper :
  - `datalist-helper.js` garde le datalist natif mais force lâ€™ouverture complÃ¨te Ã  chaque clic/focus en vidant puis restaurant la valeur (hack `showPicker`), pour pouvoir re-choisir sans effacer le champ.
- Admin alert :
  - `admin-banner.js` vÃ©rifie `/api/admin/inbox` et affiche un bandeau rouge au-dessus de `body` dÃ¨s quâ€™un message de rejet de CNI/Passeport (section `identityDocument`) existe, avec la raison Â« non-conformitÃ© Â» pour guider lâ€™utilisateur vers un nouvel upload.
- Données africaines :
  - Les listes de destinations et de prÃ©fixes utilisÃ©s correspondent aux pays ouest/centrafricains (SÃ©nÃ©gal, CÃ´te dâ€™Ivoire, Mali, Niger, Burkina, Cameroun, Gabon, RDC, etc.), afin de reflÃ©ter le marchÃ© principal.

---

### Système de notifications Admin (ntfy) - 2026-02-22

#### Alertes en temps réel sur mobile

- Intégration du service **ntfy.sh** pour notifier l'administrateur instantanément sur son téléphone.
- **Canal dédié** : `colisconnect_admin_alerts_yoann` (abonnement via l'application ntfy).
- **Déclencheur** : Une notification est envoyée dès qu'un utilisateur complète ses informations de profil et atteint le seuil d'approbation (>= 75%).
- **Lien direct** : La notification push inclut un lien "Click" qui ouvre directement la page `approvals.html` sur le téléphone de l'administrateur (via l'URL publique ngrok).
- **Configuration** : Priorité haute, vibration et icône personnalisée pour une réactivité maximale.

#### Raffinement des notifications

- Suppression des alertes pour les simples inscriptions (pour éviter le spam).
- Focalisation exclusive sur les actions nécessitant une validation humaine immédiate.
- Message d'alerte incluant le nom de l'utilisateur concerné.

#### Fichiers modifiés

- `backend/server.js` : Ajout de la fonction `notifyAdminNtfy` et intégration dans la logique de mise à jour de profil.
- `README.md` : Mise à jour de la documentation.

### Audit Logique & UX - 2026-02-22

#### Assouplissement de la vérification

- **Badge indépendant de la photo** : Un utilisateur peut désormais être certifié "Vérifié" dès que sa pièce d'identité (CNI/Passeport) est approuvée, même sans photo de profil.
- **Persistance du badge** : Le changement de photo de profil n'entraîne plus la perte du statut vérifié. Seule la modification du document d'identité déclenche un nouveau cycle de validation.

#### Communication des rejets

- **Messages de rejet admin** : Affichage direct des motifs de refus sur la page `verification.html` (ex: "Photo floue").
- **Alerte Dashboard** : Notification visuelle (icÃ´ne âš ï¸) sur le tableau de bord en cas de message administratif non lu.

#### Refonte Dashboard Premium

- **Structure Grid** : Nouvelle disposition moderne pour une meilleure visibilité des offres et conversations.
- **Jauge Circulaire** : Visualisation de la complétion du profil par une jauge de progression circulaire animée.
- **Accents Néon** : Intégration de touches bleu électrique pour une navigation plus intuitive.

#### Expérience Mobile Native (App-Like Globale)

- **Barre de Navigation Basse** : Déploiement d'une navigation fixe au pouce sur l'ensemble des pages (Accueil, Explorer, Publier, Messages, Profil).
- **Header Dynamique** : Masquage intelligent du header desktop sur mobile pour un focus sur le contenu.
- **Optimisation Cross-Page** : Layouts spécifiques pour la recherche (listes compactes), la messagerie (plein écran) et la publication (formulaires fluides).

### Fichiers principaux modifiés

- `backend/server.js` : Logique de vérification assouplie et messages admin.
- `dashboard.html`, `results.html`, `post_trip.html`, `chat.html`, `verification.html`, `auth.html` : Intégration de la navigation mobile basse.
- `style.css` : Nouveaux styles V2, universalisation du mode mobile et optimisations tactiles.
- `responsive.js` : Détection et basculement dynamique des modes d'affichage.

---

## Journal des mises Ã  jour â€” 2026-03-04

### Menu hamburger Admin (mobile)

- Ajout d'un bouton hamburger (â˜°) dans la barre de titre de `admin.html`, visible uniquement sur mobile.
- La sidebar latérale (sections Utilisateurs, Offres, Modération, Sécurité, Audit) glisse depuis la gauche lorsqu'on l'active.
- Un overlay sombre (backdrop) apparaît en fond et referme le menu au clic.
- Le menu se ferme automatiquement après avoir cliqué sur un lien de section.

#### Fichiers modifiés (hamburger admin)

- `admin.html` : Ajout du bouton `#admin-menu-toggle` dans `.admin-topbar`.
- `admin.js` : Logique d'ouverture/fermeture du drawer avec overlay dynamique.
- `style.css` : Styles `.admin-menu-toggle`, `.admin-overlay`, `.admin-sidebar` en mode drawer sur mobile.

---

### Correction connexion depuis le logiciel mobile-site-viewer

- **Problème** : Se connecter depuis le logiciel `mobile-site-viewer` (Electron) retournait une erreur **"Méthode non autorisée"** car le serveur de preview interne ne traitait que les requêtes `GET/HEAD`.
- **Cause réelle** : Le frontend envoyait ses appels API (`POST /api/auth/login`) au serveur de preview au lieu du vrai backend (port 8080).
- **Corrections** :
  - `mobile-site-viewer/main.js` : Ajout d'un **proxy API** â€” toute requÃªte vers `/api/...` est redirigÃ©e vers `http://127.0.0.1:8080`, les autres mÃ©thodes HTTP (POST, PATCH, DELETE) sont maintenant autorisÃ©es pour les API.
  - `standalone-common.js` : AmÃ©lioration de la dÃ©tection du serveur â€” si le port actuel n'est pas 8080/8090 (ex: simulateur), il n'essaie plus d'envoyer les appels en chemin relatif (Ã©vite le timeout silencieux).

#### Fichiers modifiés (mobile viewer fix)

- `C:\Users\hp\mobile-site-viewer\main.js`
- `standalone-common.js`

---

### Bouton Dashboard sur la page d'accueil (desktop)

- Ajout d'un lien **Dashboard** dans la barre de navigation principale de `index.html`.
- Ce lien n'apparaît que lorsque l'utilisateur est connecté (géré dynamiquement par `standalone-common.js`).
- Le bouton **Login** en haut à droite se transforme en **Dashboard** une fois connecté et redirige directement sans ouvrir la modale de connexion.
- Correction du listener `auth-open-btn` dans `main.js` pour ne pas ouvrir la modale si l'utilisateur est déjà authentifié.

#### Fichiers modifiés (bouton dashboard)

- `index.html` : Ajout de `#nav-dashboard-link` dans `.main-nav`.
- `standalone-common.js` : Gestion de `#nav-dashboard-link` dans `updateHeaderUi()`.
- `main.js` : Correction du listener `auth-open-btn` (ne plus ouvrir la modale si connecté).

---

### Refonte complète de la page Messagerie (`chat.html`)

- Redesign inspiré de **WhatsApp / messagerie premium**, appliqué sur desktop et mobile.

#### Desktop

- **Layout 2 colonnes** : sidebar (340px) avec liste des conversations + panel de chat à droite.
- L'en-tête du site reste visible en haut.

#### Mobile

- **Vue 1** : Liste de conversations en plein écran.
- **Vue 2** : Tap sur une conversation â†’ animation slide vers le chat.
- **Bouton retour** (â† flÃ¨che) dans l'en-tÃªte pour revenir Ã  la liste.

#### Ã‰lÃ©ments redessinÃ©s

- **Cartes de conversation** : Avatar avec initiales colorées (couleur selon le statut), nom, aperçu du dernier message, horodatage formaté ("Hier", "Lun.", "10:45").
- **Barre de recherche** pour filtrer les conversations en temps réel.
- **En-tête de conversation active** : Avatar + nom + titre de l'offre + bouton "Payer".
- **Bulles de messages** : vos messages en dégradé vert/teal à droite, messages du contact en gris à gauche, messages système en badge centré discret.
- **Timestamps** affichés sur chaque bulle.
- **Bouton Rafraîchir** en icône dans le header de la sidebar.
- **Ã‰tat vide** avec illustration quand aucune conversation n'est sÃ©lectionnÃ©e.
- Tous les IDs existants prÃ©servÃ©s â€” aucune rÃ©gression fonctionnelle.

#### Correctifs post-refonte

- **Texte des aperÃ§us en noir** â†’ corrigÃ© en blanc semi-transparent.
- **Barre de saisie cachÃ©e derriÃ¨re la nav bar mobile** â†’ ajout de `padding-bottom: 70px` sur la barre d'input pour la faire remonter au-dessus de la navigation fixe.
- **Bug d'affichage JSON brut** pour le message `reversal_request` (destinÃ© au voyageur aprÃ¨s paiement) â†’ la fonction `renderSingleMessage()` vÃ©rifiait le `sender` avant le `msgType`, ce qui faisait court-circuiter le renderer spÃ©cial. Correction : les types spÃ©ciaux (`reversal_request`, `payment_receipt`) sont maintenant dÃ©tectÃ©s **en prioritÃ©**, quel que soit le sender.

#### Fichiers modifiés (refonte chat)

- `chat.html` : Réécriture complète de la structure HTML.
- `chat.js` : Nouvelles fonctions `getInitials()`, `formatConvTime()`, `formatMsgTime()`, logique de navigation mobile (`showChatView()`, `showListView()`), rendu des cartes et bulles redessiné.
- `style.css` : Bloc CSS dédié `CHAT APP` (~650 lignes) avec layout, sidebar, cards, bulles, input bar, et responsive mobile.

---

### Simplification du systÃ¨me de statuts (3 Ã‰tats) â€” 2026-03-04

- **Ã‰tats de rÃ©servation rÃ©duits Ã  3 clairs** :
  1. **ðŸ”µ En discussion (`pending`)** : Ã‰tat initial lors de l'ouverture d'un chat.
  2. **ðŸ”´ Attente reversement (`voyageur_paye`)** : ActivÃ© dÃ¨s que le client confirme son paiement. L'avatar de la conversation devient **rouge vif** et une alerte est envoyÃ©e.
  3. **ðŸŸ¢ PayÃ© (`colisconnect_paye`)** : ConfirmÃ© par le voyageur aprÃ¨s son reversement Ã  la plateforme. L'avatar devient **vert**.
- **Indicateurs visuels dynamiques** : Les avatars et badges dans la liste des conversations changent de couleur instantanément selon l'étape du paiement (Rouge pour l'attente, Vert pour le succès).
- **Notification Admin ntfy (Alerte Rouge)** :
  - Envoi automatique d'une notification push sur le téléphone de l'administrateur dès qu'un client confirme son paiement.
  - L'alerte inclut : Noms réels des deux parties (requête SQL corrigée), montant payé, commission exacte (10%) et lien direct vers le panel admin.
  - Fiabilisation technique : l'envoi via PowerShell (Windows) est désormais attendu (`await`) pour garantir la transmission avant la fin de la requête API.
- **Nouveau flux de confirmation de reversement** :
  - Le bouton **"âœ… J'ai reversÃ©"** dans le chat dÃ©clenche maintenant un appel API rÃ©el (`POST /api/conversations/:id/reversal-confirm`) pour changer le statut en base de donnÃ©es.
  - Ajout d'un message système automatique dans le fil de discussion pour confirmer la transaction à l'utilisateur.
- **Mise à jour du Panel Admin** :
  - Le tableau de bord administrateur reconnaît désormais ces nouveaux statuts.
  - Le badge **"Attente reversement"** apparaît en rouge dans la liste des conversations pour une surveillance prioritaire par le modérateur.

#### Fichiers modifiés (système de statuts)

- `backend/server.js` : Simplification des transitions de statuts, renforcement de l'endpoint de paiement avec ntfy awaited, nouvel endpoint `reversal-confirm`.
- `chat.js` : Rendu des avatars/badges selon les 3 nouveaux états, branchement du bouton de reversement sur l'API, rafraichissement automatique du fil.
- `admin.js` : Ajout de la logique de badges colorés (`statusBadge`) pour les nouveaux statuts.
- `style.css` : Styles CSS pour les avatars rouges/verts et thèmes des pills de statut associés.

---

## Journal des mises Ã  jour â€” 2026-03-08

### Inscription avec sélection de rôle (Utilisateur / Partenaire)

- Sur la page `auth.html` et dans la modale de la page d'accueil (`index.html`), le formulaire d'inscription affiche désormais **deux cartes cliquables en étape 1** avant les champs :
  - **Carte "Utilisateur"** : accès standard (vente de kilos, recherche de voyageurs).
  - **Carte "Partenaire"** : accès à la page dédiée `partenaire.html` (entreprises de mise en relation).
- L'utilisateur sélectionne son rôle, puis les champs de formulaire apparaissent (Nom, Email, Mot de passe) avec un bouton "Retour au choix du profil".
- Pour la **connexion**, rien ne change â€” le formulaire reste identique.
- Un champ masqué `#register-role` stocke le rôle choisi (`user` ou `partner`) et le transmet à `POST /api/auth/register`.

#### Backend (inscription avec rôle)

- `POST /api/auth/register` : si le rôle demandé est `partner`, le compte est créé avec `role = 'partner'` (sous réserve qu'un admin existe déjà).
- Tous les autres comptes reçoivent `role = 'user'` par défaut.

#### Fichiers modifiés (sélection de rôle)

- `auth.html` : ajout du panneau de sélection + formulaire conditionnel.
- `auth.js` : gestion des clics sur les cartes de sélection et de la logique de retour.
- `index.html` : même structure de sélection dans la modale inline.
- `main.js` : gestion du clic sur les cartes de sélection dans la modale de la page d'accueil.
- `backend/server.js` : prise en compte du champ `role` dans l'inscription.
- `style.css` : styles `.auth-selection-grid`, `.selection-card`, `.selection-card.is-active`.

---

### Page Partenaire protégée (`partner.html`)

- La page `partner.html` (ex-`affiliation.html`) est **réservée aux utilisateurs avec le rôle `partner`**.
- Toute tentative d'accès depuis un compte standard déclenche une redirection vers la page d'accueil.
- `partner.html` a été renommée en "Partenaire" et dispose désormais d'une **navigation complète** (header + barre mobile basse) identique aux autres pages du site.

#### Logique de protection

- Ajout de `"partner.html"` dans le set `PROTECTED_PAGES` de `standalone-common.js`.
- `partner.js` : `init()` refactorisé pour utiliser `CCCommon.init()` en premier (restauration de session), puis vérification du rôle et redirection si non-partenaire.
- Le `userChip` dans le dashboard partenaire affiche le nom complet ou l'email.

#### Navigation Partenaire

- Le lien **"Partenaire"** dans le header (desktop) et dans la barre de navigation mobile est affiché **uniquement si l'utilisateur a le rôle `partner`** ou `admin`.
- Toutes les pages du site ont été mises à jour pour inclure ce lien (masqué par défaut, révélé par JavaScript) :
  - Desktop : `<a id="nav-partner-link" class="nav-link hidden">` dans toutes les pages.
  - Mobile : `<a id="mobile-partner-link" class="mob-nav-item hidden">` dans toutes les barres de navigation basses.
- `standalone-common.js` â†’ `updateHeaderUi()` : rÃ©vÃ¨le `#nav-partner-link` si `role === 'partner'`.
- `standalone-common.js` â†’ `syncHeaderMobileUi()` : crÃ©e dynamiquement le lien `#mobile-partner-link` si l'utilisateur est partenaire, ou le supprime sinon.
- `main.js` â†’ `updateAuthUi()` : synchronise `#mobile-partner-link` sur la page d'accueil.
- `partner.html` : barre mobile basse ajoutée + navigation complète standardisée.

#### Correction referral_code manquant

- **Bug corrigé** : La fonction `getUserById()` dans `server.js` ne sélectionnait pas le champ `referral_code`, ce qui empêchait le site de reconnaître un compte partenaire activé sur les pages secondaires (déconnexions involontaires).
- `referral_code AS referralCode` ajouté dans la requête `SELECT` de `getUserById`.

#### Fichiers modifiés (page partenaire + navigation)

- `partner.html` : navigation standardisée, barre mobile ajoutée.
- `partner.js` : init refactorisé, protection par rôle, chip utilisateur.
- `standalone-common.js` : `PROTECTED_PAGES`, `updateHeaderUi`, `syncHeaderMobileUi`, `init` (active page `partner`).
- `auth.html`, `chat.html`, `dashboard.html`, `index.html`, `post_trip.html`, `results.html`, `verification.html` : ajout du lien partenaire dans la nav desktop et mobile.
- `main.js` : synchronisation `#mobile-partner-link` dans `updateAuthUi`.
- `backend/server.js` : ajout de `referral_code AS referralCode` dans `getUserById`.

---

### Correction page d'approbations Admin â€” 2026-03-08

- **Bug corrigé** : Des utilisateurs uploadant leurs documents et déclenchant une notification ntfy n'apparaissaient pas dans la page `approvals.html`.
- **Causes identifiées et corrigées** dans `backend/server.js` :
  - L'endpoint `GET /api/admin/users/pending-approvals` ne considérait que le rôle `user`, excluant les partenaires (`partner`).
  - La logique `approvalPending` ne marquait pas un utilisateur comme "en attente" s'il avait des documents non-approuvés mais un profil non encore mis à 100 %.
- **Corrections** :
  - La requête inclut maintenant `role IN ('user', 'partner')`.
  - La condition `approvalPending` tient compte de : document d'identitÃ© non approuvÃ©, photo de profil non approuvÃ©e, OU progression â‰¥ 75%.
  - Ajout de `is_active = 1` pour ne montrer que les comptes actifs.

#### Fichiers modifiés (correction approbations)

- `backend/server.js` : endpoint `pending-approvals` et logique `approvalPending` dans l'endpoint `users`.

---

## Journal des mises Ã  jour â€” 2026-03-13

### Badges de notification sur le bouton Messages

- Le lien "Messages" (icône chat) dans la **barre de navigation desktop** et la **barre de navigation mobile basse** affiche désormais un badge dynamique selon le type de notification :
  - ðŸ”´ **Bulle rouge** (avec le compteur) : indique des messages non lus dans les conversations normales entre utilisateurs.
  - ðŸ”º **Triangle jaune** (avec `!`) : indique la prÃ©sence de **messages envoyÃ©s par l'administrateur** non lus. Ce badge est prioritaire sur la bulle rouge.
- Les badges apparaissent avec une animation `notif-pop` (scale spring).
- Un **polling automatique** se déclenche toutes les **45 secondes** dès que l'utilisateur est connecté pour rafraîchir les compteurs en arrière-plan, sans recharger la page.
- En arrivant sur la page `chat.html`, les badges se rafraîchissent automatiquement 1,5 secondes après le chargement (les messages étant alors en cours de lecture).

#### Backend (notifications)

- Nouvel endpoint `GET /api/me/notification-counts` :
  - `chatUnread` : nombre de conversations dont le dernier message a été envoyé par un tiers (heuristique "message non lu").
  - `adminUnread` : nombre de messages admin (`admin_inbox_messages`) avec `is_read = 0`.
  - `total` : somme des deux.

#### Frontend (notifications)

- `standalone-common.js` : ajout des fonctions `_applyBadgeToLink()`, `syncNotificationBadges()`, `startNotifPolling()`, `stopNotifPolling()`. Démarrage du polling dans `init()` si connecté. Exposition de `syncNotificationBadges`, `startNotifPolling`, `stopNotifPolling` dans `window.CCCommon`.
- `chat.js` : appel à `syncNotificationBadges()` 1,5s après l'initialisation de la page.
- `style.css` : ajout des classes `.nav-notif-wrapper`, `.notif-badge` (bulle rouge), `.notif-badge-admin` (triangle jaune avec `::after`), animation `@keyframes notif-pop`, adaptations mobile pour les badges.

#### Fichiers modifiés (badges de notification)

- `backend/server.js` : nouvel endpoint `GET /api/me/notification-counts`.
- `standalone-common.js` : fonctions de badge et polling.
- `chat.js` : appel au rafraîchissement des badges.
- `style.css` : styles des badges (bulle rouge + triangle jaune + animation).

---

## Journal des mises Ã  jour â€” 2026-03-19

### Consolidation du Header (Menu Profil Unique)

- **Simplification UX** : Suppression des multiples boutons disparates dans le header (Admin Dashboard, Profil, Quitter, Login) au profit d'un seul **Menu Profil compact et intelligent**.
- **User-Trigger Dynamique** : Affiche le nom de l'utilisateur (ou son email) accompagné d'un chevron interactif, avec une détection automatique de l'état de connexion.
- **Dropdown DeepGlass V2** : Menu déroulant flottant avec effet de verre dépoli (glassmorphism), affichant les liens contextuels prioritaires :
  - **Admin Panel** (uniquement si admin), **Dashboard**, **Publier un trajet**, **Quitter**.
- **Logique Centralisée** : Toute l'injection et la gestion des interactions (toggle, clic extérieur) sont centralisées dans `standalone-common.js`, assurant une expérience cohérente sur 100% des pages (`index`, `results`, `post_trip`, etc.).

### Refonte de l'Alignement du Filtrage (`results.html`)

- **Passage en CSS Grid (Perfect Layout)** : Remplacement du moteur Flexbox par une **Grille CSS structurée** (`grid-template-areas`) pour le formulaire de recherche.
- **Alignement au Pixel** : Correction des décalages historiques ; les étiquettes (Destination, Poids) et les champs de saisie sont désormais parfaitement alignés horizontalement, même avec des éléments de hauteurs différentes.
- **Optimisation du bouton "Rechercher"** : Largeur automatiquement ajustée au contenu (`fit-content`) et alignement forcé au bas de la grille pour une finition SaaS 2025 premium.
- **Responsive adaptatif** : La grille se reconfigure en mode colonne sur mobile pour maintenir une ergonomie tactile optimale.

### Fichiers modifiés (Optimisation UI/UX)

- `index.html` & `results.html` (Nettoyage structurel du header)
- `standalone-common.js` (Nouveau moteur de rendu User-Menu)
- `style.css` (Nouveaux styles Grid, Dropdown et animations UX)

---

### Automatisation KYC avec IA (Gemini 2026) â€” 2026-03-25

#### **Vérification d'Identité Autonome**

- **Moteur IA intégré** : Utilisation du SDK `@google/genai` (v2026) avec le modèle `gemini-2.5-flash` pour l'analyse en temps réel des documents d'identité.
- **Verdict Intelligent** : L'IA détecte si le document est un passeport/CNI valide, s'il appartient à une personne réelle et s'il présente des signes de fraude.
- **Rejet Auto-explicatif** : En cas de refus, l'IA génère une raison précise (ex: "Document illisible", "Mauvais type de document", "Illustration détectée") qui est directement enregistrée en base de données.

#### **Expérience Utilisateur (UX) Renforcée**

- **Wait Modal (Popup)** : Ajout d'une fenêtre de dialogue obligatoire après l'upload, informant l'utilisateur que l'analyse prend entre 5 et 10 minutes. L'utilisateur doit accuser réception ("Compris") avant redirection vers le tableau de bord.
- **Indicateur de Transmission** : Le bouton de validation passe en état "Transmission..." pour éviter les doubles clics durant l'envoi et l'analyse.
- **Notifications Automatisées** :
  - **Succès** : Message de félicitations automatique envoyé dans la boîte de réception interne.
  - **Ã‰chec** : Message dÃ©taillÃ© expliquant la raison exacte du rejet par l'IA pour permettre Ã  l'utilisateur de corriger son upload immÃ©diatement.
- **Score de Complétion Dynamique** : Le pourcentage de progression du profil diminue automatiquement si une pièce est rejetée par l'IA, bloquant les actions sensibles jusqu'à correction.

#### **Optimisation Administrative**

- **Filtrage Intelligent** : Les utilisateurs dont les documents ont été rejetés par l'IA sont automatiquement exclus de la file d'attente manuelle des administrateurs (`approvals.html`), leur faisant gagner un temps précieux en éliminant les faux dossiers.
- **Mode Hybride** : Les administrateurs n'interviennent plus que sur les dossiers "pré-analysés" comme conformes, assurant un très haut niveau de confiance sur la plateforme.

---

---

#### **Correctifs Techniques**

- **Fix Contextuel** : Résolution du bug `querySelector` qui survenait lors de la soumission asynchrone du formulaire de vérification.
- **Paramétrage Modèle** : Fixation sur le modèle `gemini-2.5-flash` pour garantir un équilibre optimal entre précision d'analyse et coûts d'exploitation en production.

---

### RÃ©volution de l'Infrastructure IA (Vision & OCR) â€” 2026-04-11

#### **Passage sur Qwen-VL-Plus (Alibaba Cloud DashScope)**

- **Remplacement stratégique** : Abandon définitif de l'architecture locale `PaddleOCR` (qui provoquait des timeouts réseaux et des crashs CPU liés à `MKLDNN` sous Windows).
- **Primat de Qwen Vision** : Intégration de l'API de vision artificielle d'Alibaba (`qwen-vl-plus`) pour la validation des reçus de paiements et l'approbation des pièces d'identité (KYC).
- **Conformité financière chinoise** : L'hébergement sur la plateforme DashScope permet spécifiquement à la plateforme de s'affranchir des cartes bancaires internationales, permettant une gestion des quotas IA rechargeable directement via WeChat Pay et Alipay en Yuans (RMB).
- **Fiabilité absolue** : L'IA analyse maintenant le contexte pour valider le succès des paiements au lieu de dépendre d'expressions régulières hasardeuses.

#### **Nouveau Serveur MCP (Hugging Face)**

- **Architecture "Anti-EOF"** : Création et déploiement d'un nouveau serveur MCP (Model Context Protocol) codé 100% en Node.js pur pour éliminer les corruptions de terminal IPC causées par les SDK Python.
- **Automatisation DevOps** : L'agent IA est désormais capable, via son système nerveux, de :
  - Créer des espaces Hugging Face.
  - Redémarrer des infrastructures Cloud gelées.
  - Consulter l'état des serveurs en temps réel.
  - Injecter sécuritairement des variables d'environnement (`.env` secrets).

#### **Fichiers créés et affectés**

- `backend/identityVerifier.js` : Refonte totale de la brique de vérification vers l'interface DashScope compatible OpenAI.
- `backend/server.js` : Nettoyage et éradication pure du sous-programme local Python.
- `hf_mcp_server/index.js` : (Nouveau) Exécutable serveur maître pur Javascript pour Hugging Face.
- `backend/test_qwen.js` : (Nouveau) Outil chirurgical pour diagnostiquer la connectivité Alibaba.

---

## ðŸ›°ï¸ ColisConnect Tracker (SystÃ¨me de Management)

Le projet intègre un gestionnaire d'avancement autonome permettant de piloter le développement via une interface dédiée.

### âš™ï¸ Composants

- `tracker_server.js` : Serveur Node.js indépendant tournant sur le port **3333**.
- `avancement.html` : Interface visuelle (Tableau de bord de management).
- `avancement_db.json` : Base de données JSON stockant les fonctionnalités et leur historique.

### ðŸ¤– Instructions pour Antigravity (IA)

Si tu ouvres une nouvelle session et que tu dois reprendre le travail :

1. **Lance le Tracker** : `node tracker_server.js` (si non lancé).
2. **Vérifie les Ordres** : Lis le fichier `avancement_actions.log` pour voir les dernières demandes de l'utilisateur.
3. **Cycle de Travail** :
    - Toute nouvelle demande passe en statut **ðŸŸ¡ En cours**.
    - Une fois tes modifications de code terminées, l'étape reste en attente.
    - **Seul l'utilisateur** peut passer l'Ã©tape en **ðŸŸ¢ ValidÃ©** via l'interface du tracker.
4. **Rigueur** : Ne considère une tâche comme "Achevée" que si elle est marquée comme telle dans `avancement_db.json`.

---

## Journal des mises Ã  jour â€” 2026-03-29

### ðŸ—ï¸ Refonte du Projet : Focalisation P2P & Simplification Flux

#### **Simplification du Flux de Contact (No-Friction)**

- **Suppression du Prompt "Kilos"** : L'étape demandant le nombre de kilos au moment de contacter un voyageur a été totalement supprimée. Le bouton "Contacter" ouvre désormais directement la messagerie.
- **Discussion Libre** : Le client et le voyageur discutent librement de leurs besoins. Aucun kilo n'est bloqué ou déduit prématurément de l'offre.
- **Paiement Manuel Négocié** : Lors de l'appui sur "Payer", le client saisit manuellement le montant total convenu avec le voyageur. Le système calcule alors automatiquement la commission plateforme (12%) et le reste à payer au voyageur.

#### **Suppression de la Gestion Auto des Kilos**

- **Nettoyage Backend (`server.js`)** : Retrait de la logique de déduction automatique dans l'endpoint `/api/conversations/by-offer`.
- **Nettoyage Frontend (`chat.js`, `results.js`)** : Retrait du paramètre `requestedKg` dans tout le parcours utilisateur.
- **Zéro Friction** : Le voyageur garde le contrôle total sur ses places tant qu'un paiement n'est pas validé.

#### **Suppression de Stripe**

- Retrait complet de l'intégration Stripe (Paiements automatiques).
- Nettoyage du backend (`server.js`) : suppression des clés API, des endpoints de webhook et de la logique de compte Connect.
- Nettoyage du frontend (`dashboard.html`, `chat.js`) : retrait des widgets de virement et bannières d'onboarding.
- Dépendance `stripe` désinstallée de `package.json`.

#### **Suppression d'AviationStack**

- Suppression de la vérification de vols via l'API tierce AviationStack.
- Le système repose désormais uniquement sur la liste locale de confiance `KNOWN_FLIGHTS`.

#### **Amélioration du Tracker (V3)**

- **Indexation** : Chaque mise à jour est désormais numérotée (#1, #2, ...) pour une traçabilité parfaite.
- **Détails Riches** : Les étapes incluent désormais un **Titre** et une **Description** détaillée.
- **Poubelle individuelle** : Possibilité de supprimer une étape précise de l'historique d'une fonctionnalité.
- **Système de Validation** : Introduction du statut "En cours" automatique et bouton "Validé" réservé à l'utilisateur.

---

### Estimateur "Wow Effect" & Optimisation Homepage

#### **Calcul Dynamique en Temps Réel**

- **Fourchette de prix dynamique** : L'estimateur (widget principal de la page d'accueil) analyse désormais en direct les offres disponibles dans la base de données.
- **RÃ©alisme Tarifaire** : Au lieu d'afficher une estimation statique, l'utilisateur voit une vraie fourchette calculÃ©e selon le prix au kilo (`pricePerKg`) des voyageurs disponibles (ex: *de 13 Ã  18â‚¬ par kilo*).
- **Fallback Intelligent** : En cas de problÃ¨me de rÃ©seau ou d'absence d'offres exactes, une estimation gÃ©nÃ©rique prÃ©configurÃ©e (10â‚¬ Ã  15â‚¬) s'affiche, assurant une expÃ©rience utilisateur ininterrompue.

#### **Fiabilisation des Appels API**

- **Composant Multi-Protocole** : Migration de l'appel de l'estimateur depuis `fetch()` brut vers `window.CCCommon.api()`. Cette correction règle définitivement le problème bloquant de protocole `file:///` qui empêchait l'application de fonctionner lors de tests statiques en local (`Failed to fetch`).
- **Harmonisation Frontend** : L'estimateur utilise désormais la même gestion réseau intelligente (fallback d'hôtes locaux/ngrok, gestion d'erreurs centralisée) que le reste de la plateforme.

#### **Amélioration du Copywriting et de l'UX**

- **Humanisation du Parcours** : Remplacement des résultats froids par des messages engageants, motivants et orientés conversion (*"Félicitations !"*).
- **Fluidité Visuelle** : Lors du clic sur "Estimer", un indicateur de chargement (*"Recherche en cours..."*) apparaît immédiatement, pendant que la page scrolle automatiquement pour cadrer de manière élégante le résultat sur tous les écrans (notamment sur mobile).
- **Structuration du Codebase** : Suppression définitive des répertoires de test brouillons (ex: `test save/`) pour consolider la source de vérité.

#### Fichiers mis à jour (Estimateur "Wow Effect")

- `index.html` : Implémentation complète de l'UX de l'estimateur (calculs `min/max`, `scrollIntoView`, appel `CCCommon.api()`).
- Outils systèmes : Suppression des fichiers doublons.

---

## ðŸ›°ï¸ Context Transfer - 2026-03-20

### Projet Miracle Dashboard & Auto-Pilote

- **Objectif** : Pilotage à distance de l'environnement de dev via mobile (URL ngrok `/miracle`).
- **Implémentation** :
  - `backend/public/miracle.html` : Interface futuriste avec "Super-Boutons".
  - `backend/server.js` : Endpoint `/api/miracle/command` avec logique d'auto-répondeur (mots-clés : TEST, STATUS, STRIPE, TU VOIS).
  - `backend/status.json` : Fichier d'état synchronisé pour l'affichage mobile.
- **Ã‰tat** : 100% opÃ©rationnel. Le serveur rÃ©pond aux tests mobiles sans intervention manuelle.

### Architecture Automatisation NotebookLM (Conceptuel)

- **Vision** : Créer un "SaaS Website Creator" utilisant une équipe de Notebooks spécialisés.
- **Le concept "Notebook = Skill"** :
  1. **Notebook Manager** : Génère le cahier des charges.
  2. **Notebooks Experts** (UX, Dev, etc.) : Exécutent les tâches.
  3. **Optimisation** : Application systématique du `Workflow de création de skill` sur chaque notebook.
  4. **Persistance Locale** : Les "Skills" optimisés (prompts/logic) sont sauvegardés dans le projet pour réutilisation instantanée (Archétypes).
- **Améliorations validées** :
  - **Bibliothèque d'Archétypes** : Dossier local contenant les skills prédictifs.
  - **Interface JSON** : Format strict pour le passage de témoin entre notebooks (Work Order).
  - **Boucle de Feedback** : Mise à jour manuelle des skills locaux après analyse des erreurs de sortie.

### Journal des mises Ã  jour â€” 2026-03-26

#### ModÃ©ration IA Hybride (100% Ã‰vÃ©nementielle)

- **Optimisation Radical des Coûts** : Suppression totale du cycle de polling (setInterval de 30 minutes). L'IA ne consomme désormais des tokens **que** lorsqu'un message suspect est réellement détecté.
- **DÃ©clenchement sur Ã‰vÃ©nement** : IntÃ©gration d'un dÃ©tecteur passif dans `messageFilter.js` qui scanne chaque message pour identifier les mots-clÃ©s de fraude (paiements hors-plateforme, coordonnÃ©es cachÃ©es).
- **Analyse de Contexte Ciblée** : Lors d'une alerte, l'IA analyse une fenêtre précise de **16 messages** (10 précédents + le message suspect + 5 suivants) pour une prise de décision ultra-précise et contextuelle.
- **Système de Cooldown** : Mise en place d'un verrou de 5 minutes par conversation pour éviter les rafales d'appels IA inutiles en cas de discussion animée.

#### Amélioration UX & Correction Bugs

- **Filtre Destination (results.html)** : Correction du bug de restauration automatique dans `datalist-helper.js`.
  - Auparavant, le pays sélectionné était réinjecté de force au "blur", empêchant de vider le filtre.
  - Désormais, le script détecte l'interaction utilisateur : si vous effacez le champ, il reste vide.
  - Ajout du `input.select()` automatique au clic pour une modification rapide des pays.
- **Stabilité Backend** : Correction de requêtes SQL obsolètes dans `adminBot.js` (is_active vs is_suspended).

### Prochaines Ã‰tapes

- Créer concrètement les structures de fichiers pour les "Archétypes" en local.
- Définir le schéma JSON pour le "Work Order" inter-agents.
- Commencer la création des Notebooks dans l'interface NotebookLM.

---

## Journal des mises Ã  jour â€” 2026-05-06

### ðŸ’³ Automatisation Totale des Paiements (Genius Pay Split)

#### **Split Payment via Payout (Automatisé)**

- **Flux de Paiement Unifié** : Suppression de la complexité du paiement en deux étapes. Le client paie désormais le **Montant Total** (Prix x Kilos) en une seule transaction.
- **Répartition Automatique (Splitting)** : Le système calcule dynamiquement la commission plateforme (**12%**) et la part du voyageur (**88%**).
- **Reversement Instantané (Payout)** : Dès que le paiement du client est validé par le Webhook Genius Pay, un virement automatique (Transfer/Payout) est déclenché depuis le compte Genius Pay de la plateforme vers le numéro Mobile Money du voyageur.
- **Service GeniusPay étendu** : Ajout de la méthode `createTransfer` dans `geniusPayService.js` pour gérer ces reversements programmatiques.

#### **Simplification du Modèle de Prix (Fixed Price)**

- **Suppression de la Négociation** : Retrait complet de la logique de négociation de prix dans le chat. Le prix affiché lors de la publication est désormais **ferme et définitif**.
- **Sécurisation des Revenus** : L'initiateur de paiement utilise désormais systématiquement le prix enregistré en base de données, empêchant toute manipulation de tarif entre les parties.

#### **Collecte des Coordonnées de Réception**

- **Mobile Money Voyageur** : Mise à jour de `post_trip.html` et `post_trip.js` pour collecter et stocker le numéro de réception (Orange Money, MTN, Wave, etc.) dès la création de l'offre via le champ `payment_qr`.

### ðŸ›¡ï¸ Corrections Critiques & UX Admin

#### **Correction du Bug Multi-Devises (XOF/EUR)**

- **Problème** : Les offres postées en CFA (XOF) étaient par erreur interprétées comme des Euros, entraînant des prix affichés exorbitants (ex: 1500 CFA devenaient 1500 EUR, soit ~980 000 CFA).
- **Correction Backend** : Mise à jour de la fonction `mapOffer` et des requêtes SQL dans `server.js` pour inclure et transmettre systématiquement le champ `base_currency`.
- **Correction Frontend** : `results.js` utilise désormais la `baseCurrency` réelle de l'offre pour effectuer une conversion précise vers la monnaie locale de l'utilisateur.

#### **Amélioration du Panel Admin**

- **Visibilité augmentée** : Ajout d'une colonne **Pays** dans la gestion des utilisateurs pour faciliter la segmentation géographique.
- **Précision Tarifaire** : Affichage de la devise d'origine (ex: XOF, CNY) à côté du prix unitaire dans la liste des offres admin.

#### **Fichiers modifiés (Cycle de Mai)**

- `backend/server.js` : Routes de paiements, Webhooks Genius, Requêtes SQL, et mapping des offres.
- `backend/geniusPayService.js` : Implémentation des virements automatiques (`createTransfer`).
- `backend/paymentRouter.js` : Nouvelle logique de calcul de Split (12%/88%).
- `chat.js` : Retrait de la modale de négociation et affichage du prix total fixe.
- `post_trip.html` & `post_trip.js` : Collecte du numéro de réception voyageur.
- `admin.js` : Amélioration des colonnes utilisateurs et offres.

---

## Journal des mises Ã  jour â€” 2026-05-06 (Additif)

### ðŸ¤– OpenClaw : Pivot vers Installation Locale Exclusive

#### **Abandon du Déploiement Hugging Face**

- **Soucis Techniques** : Instabilité majeure du plugin WhatsApp (`wa`) en environnement cloud. Le QR Code et la persistance de session posent problème dans les conteneurs HF.
- **Décision** : Retrait total des configurations Hugging Face pour l'agent.

#### **Nettoyage et Maintenance Globale**

- **Purge Post-Bug** : Suppression de toutes les instances d'installation corrompues sur la machine locale (dossier `local-openclaw` et dépendances orphelines).
- **Consigne de Réinstallation** : Utilisation de la commande manuelle standard pour garantir l'intégrité des fichiers `/dist/`.

#### **Prochaine Ã‰tape (User Side)**

1. Nettoyer les dossiers résiduels sur C: et D:.
2. Exécuter `npm install openclaw zod` dans un nouveau dossier dédié.
3. Lancer via `npx openclaw gateway`.

---

### Restauration du systÃ¨me Multi-Devises â€” 2026-05-13

#### **Correction Critique de Convergence**

- **Fluidité de Publication** : Résolution d'un bug majeur dans `post_trip.js` qui forçait toutes les offres en "EUR". L'application respecte désormais scrupuleusement la devise choisie par le voyageur (Yuan, CFA, Euro, etc.).
- **Schéma DB Résilient** : Réactivation et sécurisation des colonnes `base_currency` et `partner_referral_code` dans la base de données SQLite pour garantir l'intégrité des données financières.
- **Synchronisation du Poids** : Correction du mapping des données entre le backend (`availableKg`) et le frontend (`results.js`), résolvant le problème de l'affichage "0kg" sur les offres.

#### **Expérience Utilisateur (UX) Multizone**

- **Conversion Automatique Intelligente** : Les prix sur les pages **Explorer** et le **Dashboard** sont désormais convertis en temps réel selon la devise de l'utilisateur (ex: un client au Sénégal voit les prix en CFA, un utilisateur en France les voit en EUR), avec rappel du prix original.
- **Harmonisation UI (Prix)** : Refonte visuelle du champ "Prix par kilo" avec une structure symétrique en 3 blocs pour une esthétique premium et une parfaite cohérence avec le design system.
- **Chat Financier Précis** : Les messages de reversement de commission dans le chat ne sont plus limités à l'Euro. Ils affichent désormais les montants et les symboles monétaires correspondant à l'offre réelle.

#### **Fichiers modifiés**

- `backend/server.js` (Schema & API consistency)
- `post_trip.js` (Currency variable fix)
- `results.js` (Dynamic conversion engine)
- `dashboard.js` (Traveler price formatting)
- `chat.js` (Cross-currency system messages)
- `post_trip.html` & `style.css` (UI symmetry & cleanup)

---
---
*Mise à jour effectuée. Le système ColisConnect est stabilisé sur le plan financier, l'agent de communication passe en phase de remise au propre.*

## Journal des mises Ã  jour â€” 2026-06-06

### â˜ï¸ Migration Cloud & Stabilisation Infrastructure (Supabase)

#### **Migration Serverless Totale**

- **Architecture 100% Cloud** : Transition complète du backend local (Node.js/SQLite) vers une infrastructure **Supabase** (PostgreSQL/PostgREST). Le site est désormais hébergé sur GitHub Pages et communique exclusivement avec le Cloud.
- **Pont API (Bridge V9)** : Refonte de `standalone-common.js` pour agir comme un intercepteur universel. Il simule les anciennes routes locales en redirigeant les appels vers les services Supabase (Auth, DB, Edge Functions).

#### **Schéma de Données Cohérent**

- **Refactorisation des Relations** : Migration de toutes les clés étrangères vers `public.profiles` (au lieu de `auth.users`) pour permettre les jointures PostgREST natives.
- **Suppression d'Ambiguïté** : Nettoyage des relations doubles sur la table `offers` qui provoquaient des erreurs de chargement sur `results.html`.
- **Fidélité de Publication** : Correction du mapping des champs lors de la publication de trajets (`base_currency`, `payment_method`, `referral_code`, etc.).

#### **Gestion Admin & Sécurité (RLS)**

- **Contrôles d'Accès (RLS)** : Déploiement de politiques de sécurité granulaires sur `chat_threads` et `chat_messages` pour garantir que seuls les participants peuvent lire/écrire.
- **Actions Admin Cloud** : Implémentation des actions de modération (Approuver, Suspendre, Rendre admin, Supprimer) directement via le bridge Supabase avec support complet des identifiants UUID.
- **Passage Prioritaire Verifié** : Mise à jour de la logique de vérification : les utilisateurs approuvés manuellement par l'administrateur contournent désormais automatiquement le tunnel de complétion de profil (KYC).

#### **Amélioration de la Fiabilité (UX)**

- **Capture des Erreurs 404** : Le pont API intercepte désormais les réponses HTML "Site not found" de GitHub Pages et les transforme en erreurs JSON propres, supprimant l'affichage intempestif de code HTML brut sur l'interface.
- **Correction des Liens Cassés** : Suppression des références d'assets inexistants (logo) qui ralentissaient le chargement de la page admin.

#### **Fichiers modifiés**

- `standalone-common.js` : CÅ“ur de l'interception Cloud et mapping des donnÃ©es.
- `admin.js` : Logique d'administration adaptée aux UUIDs.
- `admin.html` : Nettoyage des assets.
- `post_trip.js` & `results.js` : Alignement des mappings de colonnes.
- `chat.js` : Simplification de l'initialisation de conversation via offre.

---

---

**2026-07-09 : Fix deploiement dashboard voyageur** - Resolution du build GitHub Pages bloque depuis le 05/07 (conflit de workflow). Le nouveau dashboard voyageur redessine est maintenant live : https://yoannta.github.io/colisconnect/dashboard.html
---

## Mise à jour : Dashboard Client personnalisé (2026-07-09)

### Modifications apportées

#### `dashboard.html`
- Ajout d'une **section client** complète avec :
  - Hero : "Trouver un transporteur fiable ou publier mon besoin."
  - Boutons : "Chercher un trajet" → `results.html` / "Lancer un appel" → `post_trip.html`
  - 3 stats : offres compatibles, discussions, paiements
  - 3 panels : demandes de trajet, discussions en cours, trajets validés
- La section voyageur est masquée par défaut (`hidden`), la section client aussi
- Le body n'est plus figé en `traveler-dashboard-page`

#### `dashboard.js`
- Nouvelle fonction `switchDashboardView(profileType)` : bascule entre vues traveler/client via les classes `is-active` et `hidden`
- Nouvelle fonction `loadClientDashboard()` : charge les données client
- `bootstrap()` détecte `profile_type` et bascule automatiquement la vue
- Événements click ajoutés pour les listes du dashboard client
- `loadDashboard()` branche selon le profil (traveler → données voyageur, sinon → données client)

#### `style.css`
- Nouveaux styles pour le dashboard client :
  - `.client-head`, `.client-hero`, `.client-stats`, `.client-stat-card`
  - `.client-grid`, `.client-discussion-item`, `.client-item-index`, `.client-item-btn`
  - Responsive (passe en 1 colonne sur mobile)
  - Adapté au thème existant (variables `--emerald-bright`, `--surface-strong`, `--line`)

#### `auth.js`
- Ajout de `profile_type: "client"` dans le payload d'inscription

#### `standalone-common.js`
- Après `signUp`, création systématique d'une entrée dans la table `profiles` avec `profile_type: "client"` par défaut

#### `settings.json` (~/.deepcode/)
- Configuration MCP Supabase : `mcp-server-postgres` avec `?sslmode=require&uselibpqcompat=true`

### Règle métier
- Nouvel inscrit → `profile_type = "client"` par défaut
- Les actions futures (publier un trajet, etc.) reclassent l'utilisateur
- Dashboard affiché selon `profile_type` : traveler → vue voyageur, client/cargo/null → vue client

### Rétroactif
- Les utilisateurs déjà en `profile_type = NULL` ont été mis à jour en `'client'` via l'API REST Supabase (service_role key)
