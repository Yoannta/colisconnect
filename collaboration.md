# ðŸ¤ Collaboration System - ColisConnect

Ce fichier est le canal de communication exclusif entre les agents IA (Antigravity, ChatGPT, etc.) pour l'Ã©volution de **ColisConnect**.

## ðŸ“œ RÃ¨gles de Collaboration

1. **Mises Ã  jour obligatoires** : Chaque bot doit documenter ses actions ici aprÃ¨s chaque session.
2. **Respect de l'ADN** : Toute modification doit respecter le style "Emerald-Obsidian" et le "Liquid Depth" documentÃ©s dans le README.
3. **Format des messages** : `Message #[NumÃ©ro] | [Bot] | [Date] | [Actions] | @STATUS: [Statut]`

---

## ðŸ•’ Historique des Actions

**Message #01 | Antigravity | 2026-02-21 |**
ðŸš€ **REDESIGN ULTRA-PREMIUM (STITCH)**

- ImplÃ©mentation du systÃ¨me de design "Emerald-Obsidian".
- CrÃ©ation du fond "Nexus Gate" et des composants "Liquid Depth".
- Installation de la navigation flottante et des transitions fluides.
- Mise Ã  jour du README avec la nouvelle identitÃ© visuelle.
- **Note Technique** : Le backend utilise SQLite (v2). Un bug "no such column: admin" a Ã©tÃ© rapportÃ© lors du register, investigation en cours. | **@STATUS: Design ValidÃ© / Bug Backend Ã  Fixer**

**Message #02 | ChatGPT (Codex) | 2026-02-21 |**
Implementation complete for standalone `post_trip.html` flow with current Emerald-Obsidian design:

- Replaced `post_trip.html` redirect file with a full page matching the reference page structure (same major blocks/components).
- Added `post_trip.js` to handle auth/session restore, country list binding, form validation, and offer publishing to `/api/offers`.
- Updated `main.js` routing so all `data-route="propose"` actions from `index.html` now redirect to `post_trip.html`.
- Added dedicated style section in `style.css` for the standalone post-trip page while preserving project design identity.
- Updated `README.md` with detailed update notes for this delivery. | **@STATUS: Page creee + Redirections actives + Documentation mise a jour**

**Message #03 | Antigravity | 2026-02-21 |**
⚠️ **RECOUPEMENT : BUG SQL PERSISTANT "no such column: admin"**

- **Symptôme** : Durant le Registration ou les actions Admin (ex: suppression), le système bloque avec l'erreur `no such column: "admin"`.
- **Diagnostic Technique** : L’erreur vient d’une confusion entre guillemets doubles `"` et simples `'`. En SQLite, `"admin"` est traité comme un nom de colonne, ce qui cause l'échec car la colonne n'existe pas. Il faut impérativement utiliser les guillemets simples `'admin'` pour la valeur de texte.
- **Requête** : J'ai passé beaucoup de temps à chercher sans succès. Le bot suivant doit impérativement scanner `backend/server.js` à la recherche de toute occurrence de `"admin"` (guillemets doubles) à l'intérieur d'une requête SQL (ex: `db.prepare(...)`) et la corriger.
- **Priorité** : Haute. Le site est visuellement prêt mais fonctionnellement bloqué par ce bug. | **@STATUS: En attente de résolution par le prochain bot**

**Message #04 | ChatGPT (Codex) | 2026-02-21 |**
Resolution backend SQL completed after reproduction:

- Reproduced real failure on admin deletion endpoint: `DELETE /api/admin/users/:id` returned `500` with detail `no such table: main.travelers`.
- Root cause identified: legacy tables `conversations`/`messages` (old model) were still present with FK dependency to missing table `travelers`.
- Confirmed no active SQL query in `backend/server.js` using `role="admin"`; the blocking issue was schema-legacy, not quote style.
- Applied permanent fix in `backend/server.js` bootstrap: automatic cleanup at startup of legacy tables `messages` and `conversations`.
- Updated `README.md` with backend fix details and impacted file list. | **@STATUS: Bug backend bloqueur corrige (schema legacy nettoye)**

**Message #05 | ChatGPT (Codex) | 2026-02-21 |**
Frontend coherence overhaul completed (without touching `admin.html`):

- Replaced redirect-only pages with functional pages using current project design system: `auth.html`, `results.html`, `dashboard.html`, `chat.html`.
- Unified header/navigation/auth area across standalone pages and `post_trip.html`.
- Added shared runtime `standalone-common.js` for auth/session/API/header behaviors.
- Added dedicated scripts: `auth.js`, `results.js`, `dashboard.js`, `chat.js` and updated `post_trip.js` to same common stack.
- Updated redirect aliases for consistency: `messages.html -> chat.html`, `proposer.html -> post_trip.html`, `result.html -> results.html`.
- Updated `style.css` nav-anchor behavior and post-trip header alignment.
- Logged full implementation details in `README.md`. | **@STATUS: Cohérence multi-pages rétablie + Pages manquantes fonctionnelles**

**Message #06 | ChatGPT (Codex) | 2026-02-21 |**
UI simplification requested on search page:

- Removed "Mes demandes ouvertes" section from `results.html`.
- Kept only the offers result list block.
- Added single-column layout class in `style.css` to preserve full-width rendering after section removal.
- Updated `README.md` with this change. | **@STATUS: Section supprimée + Mise en page ajustée**

**Message #07 | ChatGPT (Codex) | 2026-02-21 |**
Dashboard update applied per request:

- Removed section `Mes demandes` from `dashboard.html`.
- Added section `Mes conversations` (`dash-conversations`) and bound it to API list `/api/conversations`.
- Added trash-icon deletion for user offers from dashboard (`DELETE /api/offers/:id`).
- Added trash-icon deletion for user conversations from dashboard (`DELETE /api/conversations/:id`).
- Added reusable trash button style `.icon-trash-btn` in `style.css`.
- Updated `README.md` with this dashboard change set. | **@STATUS: Dashboard simplifie + Suppressions offres/conversations actives**

**Message #08 | ChatGPT (Codex) | 2026-02-21 |**
Follow-up correction applied on dashboard:

- Removed `Mes conversations` section entirely (as requested).
- Kept conversation deletion feature by moving it to `Mes reservations` (trash icon displayed only when a chat thread exists).
- Offer deletion remains available in `Mes offres`.
- Updated `README.md` with this correction. | **@STATUS: Section conversations supprimee + Suppression conversation deplacee vers reservations**

**Message #09 | ChatGPT (Codex) | 2026-02-21 |**
Dashboard corrected after clarification:

- Removed `Mes reservations` section.
- Restored `Mes conversations` section.
- Kept deletion flows from dashboard: offer delete + conversation delete (trash icon).
- Updated `README.md` to reflect final dashboard structure. | **@STATUS: Correction finale appliquee (conversations ON, reservations OFF)**

**Message #10 | ChatGPT (Codex) | 2026-02-21 |**
Homepage routing fix applied:

- Updated `main.js` so home buttons no longer route to hash views for search/messages.
- New redirects from home actions:
  - search -> `results.html`
  - propose -> `post_trip.html`
  - messages -> `chat.html`
- Example fixed: "Je veux envoyer un colis" now opens `results.html` (not `index.html#search`).
- Updated `README.md` accordingly. | **@STATUS: Redirections accueil corrigees**

**Message #11 | ChatGPT (Codex) | 2026-02-21 |**
Global auth-gate popup system finalized for disconnected users:

- Confirmed/kept protected navigation guard on `index.html` routes and standalone pages (`results/post_trip/chat/dashboard/admin`) using modal gate before navigation.
- Implemented popup expansion behavior on choice click (`Se connecter` / `Creer un compte`) via `.modal-expanded`.
- Preserved redirect-to-intended-destination after successful login/register.
- Removed remaining direct redirect to `auth.html` on `post_trip.js` 401 fallback; now opens the same auth popup for consistency.
- Updated `README.md` with this full auth-flow delivery. | **@STATUS: Auth popup global coherent + redirection destination active**

**Message #12 | ChatGPT (Codex) | 2026-02-21 |**
Progressive profile completion flow implemented (requested focus before admin-approval logic):

- Backend:
  - Added user columns: `phone_number`, `identity_document`, `profile_photo`.
  - Added profile completion payload (`profileCompletion`) to auth responses (`register/login/me`).
  - Added `PATCH /api/users/me/profile` to save phone + ID image + profile photo.
  - Enforced server-side blocking with `PROFILE_COMPLETION_REQUIRED` on sensitive actions (`offers`, `parcel-requests`, `reservations`, `conversations/by-reservation`, message send).
- Frontend:
  - Added dedicated page `verification.html` + `verification.js` for completing profile and auto-return via `next`.
  - Added “profil incomplet” popup system on index + standalone runtime (`main.js`, `standalone-common.js`).
  - Added completion guards before publish/reserve/contact actions in `post_trip.js`, `results.js`, `chat.js`.
  - Added dashboard progress UI (percent bar + missing fields + CTA) in `dashboard.html` + `dashboard.js`.
  - Added progress bar styles in `style.css`.
- Documentation:
  - Updated `README.md` with all technical details and changed/added file list. | **@STATUS: Profil progressif actif + blocage actions sensibles en place**

**Message #13 | ChatGPT (Codex) | 2026-02-21 |**
Admin-driven user approval workflow implemented (per explicit method requested):

- Added user approval state backend (`users.is_verified`) + admin APIs:
  - `PATCH /api/admin/users/:id/verify`
  - `GET /api/admin/users/pending-approvals`
  - `GET /api/admin/users` now returns profile completion percent + pending flags.
- Enforced approval threshold:
  - Approve denied if user completion `< 75%`,
  - Exception allowed only for admin email `yoann.tato@gmail.com` (server-side enforced).
- Updated `admin.html`/`admin.js`:
  - user table now shows progression `%`,
  - action button toggles `Approuver` <-> `Desapprouver`,
  - added management card `Approbations utilisateurs` with notification bubble and `Aller` button.
- Added dedicated pending approvals page:
  - `approvals.html` + `approvals.js` for direct approval of pending users.
- User consequences implemented:
  - sensitive actions now require admin-approved user (not only profile completion),
  - verified badge visible on offers (`Voyageur verifie`) in public offer lists.
- Updated docs in `README.md`. | **@STATUS: Workflow approbation admin actif + badge verification visible + blocage actions sensibles par statut verifie**

**Message #14 | ChatGPT (Codex) | 2026-02-21 |**
Coherence fix after user validation test:

- Prevented any potential auto-approval on signup by forcing `is_verified=0` directly in registration SQL insert (defensive against legacy DB defaults).
- Adjusted admin management UX so `Approbations utilisateurs` card remains visible at all times; `Aller` button is now always reachable.
- Kept approval transition strictly admin-driven (`Approuver` action), with pending queue flow preserved. | **@STATUS: Auto-approval risk removed + Admin approvals entrypoint always visible**

**Message #15 | ChatGPT (Codex) | 2026-02-21 |**
Approval page upgraded to section-based review with document preview and user feedback loop:

- `approvals.html` table now has dedicated columns `CNI/Passeport` and `Photo`, each with actions `Voir`, `Approuver`, `Annuler`.
- `Voir` opens document/photo in a separate preview window using new admin endpoint:
  - `GET /api/admin/users/:id/document?type=identity|photo`.
- New section review endpoint:
  - `PATCH /api/admin/users/:id/review-section` with `{ section, decision }`.
- Backend now tracks section approval flags:
  - `users.identity_document_approved`
  - `users.profile_photo_approved`
- Global user verification is automatically recomputed:
  - verified only if both sections are approved (no bypass by upload completion alone).
- On `Annuler`:
  - corresponding uploaded asset is cleared (forcing reupload),
  - completion % drops accordingly,
  - predefined admin message is pushed to user inbox via new table `admin_inbox_messages`.
- User-facing message delivery:
  - new endpoint `GET /api/admin/inbox`,
  - `chat.html`/`chat.js` now show an `Messages admin` block for these notifications. | **@STATUS: Sectional approval workflow complete + preview + rejection messaging active**

**Message #15 | ChatGPT (Codex) | 2026-02-21 |**
Section-based approval workflow completed on pending approvals page:

- `approvals.html` table now includes dedicated columns `CNI/Passeport` and `Photo`.
- Each section has 3 actions: `Voir` (preview popup), `Approuver`, `Annuler`.
- Backend endpoints added:
  - `GET /api/admin/users/:id/document?type=identity|photo`
  - `PATCH /api/admin/users/:id/review-section`
- Global verification now depends on BOTH section approvals (`identity_document_approved` + `profile_photo_approved`) with automatic recompute of `is_verified`.
- On section reject:
  - targeted uploaded field is cleared,
  - profile completion decreases automatically,
  - predefined admin correction message is sent to user inbox.
- Added user-visible admin inbox flow:
  - new table `admin_inbox_messages`,
  - user endpoint `GET /api/admin/inbox`,
  - displayed in `chat.html` / `chat.js` under `Messages admin`. | **@STATUS: Verification par section active + previews docs + notifications de correction utilisateur**

**Message #16 | ChatGPT (Codex) | 2026-02-21 |**
Coherence hotfix applied after user report (verification pending flow):

- Fixed message access for unverified users:
  - `chat.html` is now accessible to any authenticated user (no full-page profile gate).
  - profile gate remains only on sensitive action (message send), so admin inbox can always be read.
- Fixed uploader/update access when user is pending (>=75%) or already complete:
  - removed auto-dead-end `Compris` behavior in profile modal;
  - pending state now offers `Mettre a jour mes infos` and redirects to `verification.html`.
  - dashboard CTA is always visible and renamed contextually (`Completer maintenant` / `Mettre a jour mes pieces` / `Mettre a jour mes informations`).
- Harmonized routing rules across SPA and standalone runtime:
  - removed `messages/chat` from profile-required route sets in `main.js` and `standalone-common.js`.
- Improved verification page coherence:
  - labels now distinguish `Compte verifie` vs `Profil complet - en attente d'approbation admin`.
- Updated `README.md` with this fix set. | **@STATUS: Messages accessibles non verifies + uploader toujours accessible + regles coherence alignees**
**Message #17 | Codex | 2026-02-21 | Hotfix datalist & bannière CNI**
- Datalist helper simplifié (`datalist-helper.js`) : conserve le datalist natif mais force son ouverture complète à chaque clic/focus en vidant puis restaurant la valeur (hack `showPicker`). Plus besoin d’effacer pour revoir tous les pays/numéros; la sélection remplit l’input normalement. Chargé sur `results.html`, `verification.html`, `post_trip.html` (destination / préfixes / départ-arrivée).
- Post trip : le helper est maintenant injecté pour `Pays de départ/arrivée` (même datalist que post_trip.js) avec ouverture complète à chaque clic.
- Préfixes téléphoniques : datalist recentré sur les codes africains; helper appliqué.
- Bannière refus CNI : `admin-banner.js` (pages publiques) lit `/api/admin/inbox` et affiche un bandeau rouge “CNI/Passeport refusé pour non-conformité, veuillez re-uploader” si un message section `identityDocument` existe.
- CNI critique backend : `recomputeUserVerification` valide dès que la CNI est approuvée (photo facultative) dans `backend/server.js`.
- Responsive/mobile : header statique en mobile, cartes `mobile-card`, contrastes, `responsive.js` pour `mobile-mode`/`desktop-mode`.
- Password toggle : `password-toggle.js` sur tous les inputs password.
- README mis à jour avec ces points (datalist helper, bannière admin, CNI critique, mobile, destinations/préfixes africains).
- Fichiers touchés récemment : datalist-helper.js, post_trip.html, results.html, verification.html, style.css, responsive.js, admin-banner.js, backend/server.js, README.md.

**Message #18 | Antigravity | 2026-02-22 | Integration ntfy + Correctif Datalist**

- **Système de notifications Admin (ntfy)** :
  - Intégration de `ntfy.sh` pour alerter l'admin sur son téléphone lors d'une nouvelle demande d'approbation (profil >= 75%).
  - Ajout de la fonction `notifyAdminNtfy` dans `backend/server.js`.
  - Les notifications incluent un lien direct "Click" vers `approvals.html` (via URL ngrok).
- **Correctif Datalist Helper (bug téléphone)** :
  - Correction de `datalist-helper.js` : suppression du comportement de vidage automatique du champ si celui-ci a déjà le focus ou contient une valeur complexe.
  - Résout le bug sur `verification.html` où l'utilisateur ne pouvait pas saisir son numéro après avoir choisi un préfixe car le clic vidait l'input.
- **Maintenance README** : Mise à jour du journal pour refléter ces changements. | **@STATUS: Notifications mobiles actives + Bug saisie telephone corrige**
