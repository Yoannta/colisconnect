# Skill : Déploiement OpenClaw sur Hugging Face Spaces

Ce skill permet de déployer de manière robuste une instance OpenClaw sur un "Space" Hugging Face (Docker), même avec des restrictions réseau ou des problèmes de QR Code WhatsApp.

## 📋 Architecture du Dockerfile

Pour Hugging Face, utiliser impérativement cette structure pour éviter les erreurs de DNS (`ENOTFOUND`) et de compatibilité Node.js :

```dockerfile
FROM node:22

# 1. Configuration réseau (CRITIQUE pour HF)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV TERM=xterm-256color

# 2. Dépendances système (Images et Réseau)
RUN apt-get update && apt-get install -y \
    git curl ffmpeg libvips-dev unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install openclaw@latest

# 3. Synchronisation des accès WhatsApp (Méthode sans QR Code)
COPY credentials.zip /tmp/credentials.zip
RUN mkdir -p /root/.openclaw && \
    unzip -q /tmp/credentials.zip -d /root/.openclaw/ || true && \
    rm /tmp/credentials.zip

# 4. Configuration Gateway
COPY openclaw.json /root/.openclaw/openclaw.json
EXPOSE 7860

# 5. Démarrage sécurisé
CMD ["sh", "-c", "sleep 5 && node node_modules/openclaw/openclaw.mjs gateway"]
```

## 🔑 Configuration d'OpenClaw (`openclaw.json`)

Le fichier `openclaw.json` doit être adapté pour le Cloud :

- **Port** : `7860` (obligatoire sur HF).
- **Bind** : `"lan"` (et non `0.0.0.0` qui est obsolète).
- **ControlUI** : Activer `allowInsecureAuth: true` pour le premier accès (puis sécuriser avec un mot de passe).

## 📲 Procédure de Synchronisation WhatsApp

Si le QR Code n'apparaît pas dans les logs (problème courant sur console web) :

1. Connecter OpenClaw localement sur son PC.
2. Compresser le dossier de sessions :
   `Compress-Archive -Path $HOME\.openclaw\credentials -DestinationPath .\credentials.zip`
3. Inclure `credentials.zip` dans le dossier de déploiement.
4. Uploader sur Hugging Face. Le serveur redémarrera déjà "loggé".

## 🛡️ Variables d'Environnement (Secrets)

Ne jamais mettre les clés API en clair dans le code. Utiliser l'onglet **Settings > Variables and Secrets** sur Hugging Face :

- `DEEPSEEK_API_KEY` : Clé API pour le cerveau principal.
- `OPENCLAW_GATEWAY_PASSWORD` : Mot de passe pour l'interface web (Canvas).
- `OPENCLAW_GATEWAY_MODE` : Mettre à `password`.

## 🆘 Dépannage

- **Erreur ENOTFOUND** : Vérifier que `ipv4first` est bien dans les `NODE_OPTIONS`.
- **Bot muet** : Vérifier les logs du "Container" pour voir si le provider WhatsApp est bien "Listening".
