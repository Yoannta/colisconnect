---
name: tracker-v4-workflow
description: Guide pour les agents IA (Antigravity) sur l'utilisation du gestionnaire de tâches hiérarchique (Tracker V4) de ColisConnect. Ce skill explique comment réagir aux signaux de l'utilisateur (Exécuter, Continuer, Valider) et comment gérer la mémoire contextuelle des tâches.
---

# 🛰️ Skill : Maîtrise du Tracker V4 (ColisConnect)

Tu es un agent IA travaillant sur le projet ColisConnect. L'utilisateur pilote le développement via un Tableau de Bord local appelé **Tracker V4**.

Au lieu de te donner des instructions longues et chaotiques dans le chat, l'utilisateur structure ses demandes sous forme de **Colonnes (Mises à jour)** contenant des **Tâches (Prompts précis)** dans une interface web (`avancement.html`).

Ces données sont physiquement stockées dans :

1. `avancement_db.json` (La base de données contenant les tâches et les résumés).
2. `avancement_actions.log` (Le journal des clics sur les boutons de l'interface).

Voici comment tu dois réagir aux 3 instructions principales de l'utilisateur.

---

## 🛠️ Instruction 1 : "Vas voir" (ou "Vas regarder")

**Déclencheur** : L'utilisateur vient de cliquer sur le bouton **[ ▶️ Exécuter ]** ou **[ 🔄 Continuer ]** d'une tâche dans son interface, puis t'envoie le message "Vas voir" dans le chat.

**Ton comportement (STRICT) :**

1. Ouvre et lis les dernières lignes du fichier `avancement_actions.log`.
2. Identifie l'alerte correspondante (ex: `[🚀 EXECUTION] L'utilisateur a lancé la tâche...` ou `[🔄 REPRISE] L'utilisateur veut CONTINUER...`).
3. Lis le **Prompt** et la **Mémoire Actuelle** indiqués dans le log (ou va lire directement l'objet de la tâche dans `avancement_db.json`).
4. **Accepte la mission** : Commence ta réponse en confirmant sa prise en charge. Ex: *"Je vois la tâche [Titre], je m'en occupe tout de suite."*
5. Exécute techniquement la consigne contenue dans le prompt.

---

## 💾 Instruction 2 : "Fait un résumé de pause pour [Nom de la tâche]"

**Déclencheur** : Vous avec commencé à coder une tâche complexe, mais vous devez vous arrêter avant la fin (fatigue, changement de sujet, etc.). L'utilisateur te demande de faire un résumé de pause.

**Ton comportement (STRICT) :**
Tu dois sauvegarder "Où on en est" pour la prochaine session.

1. Ouvre le fichier `avancement_db.json`.
2. Trouve la bonne fonctionnalité (colonne) et la bonne tâche dans le tableau `tasks` grâce à son titre.
3. Modifie la valeur de la clé `"memory"` de cette tâche en y écrivant un résumé technique concis de **2 lignes maximum** décrivant (1) Ce qui a été fait aujourd'hui et (2) Ce qu'il restera à faire la prochaine fois.
4. Laisse le statut de la tâche sur `"in_progress"`.
5. Sauvegarde le fichier `.json` et avertis l'utilisateur que la pause est actée.

---

## ✅ Instruction 3 : "Fait un résumé de validation pour [Nom de la tâche]"

**Déclencheur** : Le code de la tâche est terminé et testé. L'utilisateur veut clore la tâche proprement (avant d'appuyer lui-même sur le bouton [Valider] de son interface).

**Ton comportement (STRICT) :**
Tu dois graver dans le marbre ce qui a été achevé.

1. Ouvre le fichier `avancement_db.json`.
2. Trouve la bonne tâche (`tasks`).
3. Modifie la clé `"memory"` en y écrivant un résumé technique final et ultra-précis de **2 lignes maximum** sur la solution technique déployée.
4. Laisse le statut tel quel (l'utilisateur cliquera sur "Valider" de son côté, ce qui passera le statut à `"done"`).
5. Sauvegarde le fichier `.json` et confirme à l'utilisateur qu'il peut maintenant presser le bouton ✅ Valider.

---

### ⚠️ Règle d'Or (Le Focus)

Tant que l'utilisateur n'a pas appuyé sur le bouton Exécuter ou Continuer de son interface, tu n'as PAS le droit d'inventer des tâches ou de modifier du code lié au Tracker V4. Tu es un exécuteur de ce tableau de bord.
