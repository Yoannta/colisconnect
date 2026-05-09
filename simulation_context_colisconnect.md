# Contexte de Simulation ColisConnect (2026)

Ce document sert de base pour simuler l'environnement opérationnel, technique et financier de la plateforme ColisConnect. Il est conçu pour tester les limites du système face à des crises réelles.

---

## 1. Identité et Vision

* **Produit** : Plateforme de mise en relation pour le transport de colis entre particuliers (Crowd-shipping).
* **Mission** : Éradiquer les frais de port excessifs et les délais interminables vers l'Afrique en utilisant les bagages inutilisés des voyageurs.
* **Architecture** : Système hybride avec Backend Node.js (Smart Payment Router) et Frontend dynamique (Mobile-first).

---

## 2. Écosystème Technique (Détails Clés)

### A. Flux de Paiement (Waterfall Strategy)

* **Commission (Revenue)** : Prélevée automatiquement dès qu'une réservation est faite.
  * *Routeur* : Sélectionne FedaPay (UEMOA/CEMAC) ou Paystack (Zone Anglophone) selon la devise native du pays de départ.
  * *Enjeu* : Si l'agrégateur tombe, le système doit basculer sur un mode manuel sans bloquer l'utilisateur.
* **Paiement Voyageur (P2P)** : Transaction directe entre le client et le voyageur.
  * *Méthode* : Mobile Money local.
  * *Preuve* : Capture d'écran envoyée dans le chat et validée par une IA Vision ou manuellement.

### B. Géographie et Devises

* **Couverture** : 12 pays (Bénin, Togo, Sénégal, Côte d'Ivoire, Cameroun, Niger, Nigeria, Ghana, Kenya, Afrique du Sud, Égypte, Madagascar).
* **Multi-devises** : Gestion en temps réel de 7+ monnaies (XOF, XAF, NGN, GHS, EGP, USD, EUR) avec taux de conversion dynamiques.

---

## 3. Scénarios de Crise (À Simuler)

### Scénario 1 : Panne d'Agrégateur (FedaPay/Paystack)

* **Contexte** : Un client en Côte d'Ivoire essaie de payer sa commission, mais l'API de l'agrégateur renvoie une erreur 500.
* **Risque** : Abandon de l'utilisateur.
* **Simulation** : Tester le basculement (Fallback) vers le mode "Virement/Cash" et la notification manuelle de l'admin.

### Scénario 2 : Fraude à la Preuve d'Image

* **Contexte** : Un client télécharge une fausse capture d'écran de transfert Mobile Money (montage Photoshop) pour débloquer la conversation sans payer le voyageur.
* **Risque** : Perte financière pour le voyageur, perte de confiance envers ColisConnect.
* **Simulation** : Tester les algorithmes de vérification de métadonnées d'image ou l'alerte "Suspicion de fraude" envoyée au voyageur.

### Scénario 3 : Conflit de Poids (Le Syndrome du Kilo)

* **Contexte** : Le voyageur déclare avoir 23kg, mais une fois à l'aéroport avec les colis, il se rend compte qu'il n'en a que 15kg exploitables.
* **Risque** : Des clients ont déjà payé pour les 8kg manquants.
* **Simulation** : Processus de remboursement partiel de la commission et notification automatique du client pour "Indisponibilité de poids".

### Scénario 4 : Blocage Légal en Côte d'Ivoire

* **Contexte** : Les autorités exigent la preuve de légalisation (CEPICI) pour continuer à opérer avec les réseaux Mobile Money locaux.
* **Risque** : Coupure brutale des flux financiers Orange/MTN.
* **Simulation** : Transition rapide vers un modèle de "Partenariat avec agences locales" (Cash-in/Cash-out) pour contourner le blocage numérique.

---

## 4. Paramètres de Stress

* **Volume** : Simuler 10 000 demandes de trajets simultanées sur des zones à faible débit internet.
* **Latence** : Impact d'un délai de 10 secondes sur l'initialisation du lien de paiement.
* **Erreur Humaine** : Voyageur qui entre un mauvais numéro de compte Orange Money et valide son offre.

---

## 5. Objectif de la Simulation

Déterminer à quel moment le système "casse" et produire un rapport de remédiation pour chaque faille identifiée (Technical Slop detection).
