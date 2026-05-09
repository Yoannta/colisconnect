---
name: optimisation-systeme-haute-performance
description: Utilisez ce skill quand vous devez analyser, diagnostiquer ou améliorer les performances d'un système informatique (CPU, RAM, stockage, réseau, bases de données). Il applique les méthodologies Lean Six Sigma, la Théorie des Contraintes (TOC) et l'Ingénierie de la Valeur pour éliminer les goulots d'étranglement et réduire les gaspillages de ressources.
---

# Optimisation Système Haute Performance

## I. MÉTADONNÉES

* **Objectif** : Maximiser le débit (Throughput) du système tout en minimisant les coûts opérationnels et la variabilité.
* **Cadre méthodologique** : Cycle DMAIC (Définir, Mesurer, Analyser, Innover/Améliorer, Contrôler).
* **Principes clés** : Identification du goulot d'étranglement unique, limitation des encours (WIP), et analyse fonctionnelle.

## II. INSTRUCTIONS PRÉCISES

### 1. Phase de Diagnostic (Définir & Mesurer)

* **Cartographie des flux (VSM)** : Visualisez le parcours d'une requête ou d'une donnée de l'entrée à la sortie pour identifier les étapes à non-valeur ajoutée.
* **Identification de la Contrainte (TOC)** : Localisez la ressource saturée (CPU à 100%, RAM saturée, I/O disque) qui limite la performance globale.
* **Mesure de la variabilité (Six Sigma)** : Calculez l'écart-type des temps de réponse pour identifier les pics d'instabilité (Mura).
* **Application de la Loi de Little** : Réduisez le nombre de tâches en parallèle (WIP) pour diminuer mécaniquement le temps de cycle (Lead Time).

### 2. Phase d'Analyse (Causes Racines)

* **Diagramme d'Ishikawa** : Classez les causes de ralentissement par catégories : Logiciel (code), Matériel (CPU/RAM), Méthodes (algorithmes), Données (BDD).
* **Technique des 5 Pourquoi** : Remontez à la source. Si une base de données est lente, est-ce dû à un index manquant ou à une configuration serveur inadaptée ?
* **Analyse de Pareto** : Concentrez vos efforts sur les 20% de processus qui causent 80% des latences.

### 3. Phase d'Optimisation (Améliorer/Innover)

* **Exploitation de la contrainte** : Assurez-vous que la ressource critique (ex: le processeur) ne traite que des tâches essentielles. Supprimez les processus d'arrière-plan inutiles.
* **Ingénierie de la Valeur (VA/VE)** : Analysez chaque fonctionnalité système. Si une fonction consomme des ressources sans apporter de valeur à l'utilisateur final, supprimez-la ou simplifiez-la.
* **Mécanisme Drum-Buffer-Rope** : Synchronisez l'arrivée des requêtes (Rope) sur le rythme du goulot (Drum) et protégez ce goulot par une file d'attente optimisée (Buffer).
* **Automatisation** : Automatisez les tâches de maintenance répétitives pour réduire les erreurs humaines et libérer de la capacité.

### 4. Phase de Pérennisation (Contrôler)

* **Standardisation** : Documentez la configuration optimale pour éviter tout retour à l'état antérieur.
* **Cycle PDCA** : Planifiez des tests de charge réguliers, vérifiez les résultats et ajustez en continu.

## III. EXEMPLES ET GESTION DES ERREURS

### Exemples d'application

* **Saturations RAM** : Au lieu d'ajouter physiquement de la mémoire, appliquez le Lean pour identifier les fuites de mémoire (gaspillage/Muda) et les processus redondants.
* **Latence Réseau** : Utilisez la TOC pour identifier si le goulot est le commutateur, la bande passante ou la pile logicielle, puis subordonnez le reste du flux à cette capacité.

### Gestion des erreurs et actions correctives

| Problème rencontré | Principe d'optimisation violé | Action corrective concrète |
| :--- | :--- | :--- |
| **Le goulot se déplace après une correction** | Mauvaise subordination | Recommencer le cycle à l'étape 1 pour identifier la nouvelle contrainte système. |
| **Instabilité des temps de réponse** | Présence de Mura (variations) | Utiliser le DMAIC pour réduire la variabilité des processus de traitement de données. |
| **Accumulation de requêtes en attente** | Excès de WIP (encours) | Implémenter une limite stricte sur les tâches simultanées via un tableau Kanban virtuel. |
| **Coûts serveurs élevés pour peu de valeur** | Échec de l'Ingénierie de la Valeur | Réaliser une analyse fonctionnelle pour supprimer les services cloud sous-utilisés. |
| **Résistance du système au changement** | Manque d'implication culturelle | Former les équipes aux principes de l'amélioration continue (Kaizen). |
