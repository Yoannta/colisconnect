# 🔐 Guide de Déploiement : Authentification Google Elite (STATUT : OPÉRATIONNEL)

L'ID Client a été intégré avec succès. Votre système est maintenant armé pour l'excellence.

1. **L'Identité (Client ID)** : Comme une plaque d'immatriculation, Google doit savoir quel site demande l'accès aux données. C'est pour cela qu'un Client ID est **obligatoire**.
2. **Le Domaine (HTTPS)** : Google refuse de renvoyer des données vers un simple fichier sur votre ordinateur (`file://`). Le site doit être hébergé.

## 🚀 La solution : Utiliser GitHub Pages

Votre idée de passer par le lien GitHub est excellente. C'est la méthode "pro" :

## 🗺️ Carte de Navigation (À faire après le MFA)

Une fois que vous avez passé l'écran de sécurité (MFA), suivez ce chemin précis :

1. **Menu Principal** : Cliquez sur les 3 barres horizontales (en haut à gauche) > **APIs et services** > **Identifiants**.
2. **Création** : Cliquez sur le bouton bleu **[+ CRÉER DES IDENTIFIANTS]** en haut de la page.
3. **Type** : Choisissez **ID de client OAuth**.
4. **Configuration** :
    - *Type d'application* : **Application Web**.
    - *Nom* : "Ecole Ecommerce".
    - *Origines JavaScript autorisées* : `https://yoannta.github.io`
    - *URIs de redirection autorisés* : `https://yoannta.github.io/e-commerce/auth.html`
5. **Validation** : Cliquez sur **CRÉER**.

> [!IMPORTANT]
> **Le Saint Graal** : Une fenêtre va s'ouvrir avec un "ID de client". Copiez ce texte (ex: `12345-abcde.apps.googleusercontent.com`) et donnez-le moi.

### Pourquoi je ne peux pas le faire pour vous ?

Même en "mode agent", je n'ai pas accès à vos mots de passe Google personnels. C'est une protection de Google pour vous protéger. Si je pouvais me connecter à votre place, n'importe qui pourrait le faire !

## 2. Lier l'ID au Projet

- Ouvrez `auth.html`.
- Allez à la ligne **734** (environ).
- Remplacez `"VOTRE_ID_CLIENT_GOOGLE.apps.googleusercontent.com"` par votre ID copié.

## 3. Lancer le Serveur Local (Obligatoire)

Google refuse les connexions via `file://`. Vous devez lancer le site via un serveur :

- **Si vous avez VS Code** : Installez l'extension "Live Server", faites un clic droit sur `index.html` > "Open with Live Server".
- **Via Terminal** (si vous avez Python) :

    ```bash
    python -m http.server 5500
    ```

    Puis ouvrez `http://localhost:5500`.

---
*Maintenu par Antigravity. Prêt pour l'excellence.*
