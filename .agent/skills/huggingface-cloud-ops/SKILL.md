---
name: "huggingface-cloud-ops"
description: "Déploiement et gestion de serveurs HF Spaces (Push, Restart, Setup)."
---

# ☁️ Hugging Face Ops : The CEO Playbook

En tant que CEO ou CTO, tu pourrais décider de déléguer l'hébergement de nos moteurs d'IA (ex: Le serveur OCR de ColisConnect) vers le Cloud Hugging Face. Voici comment l'équipe doit procéder en autonomie.

## 1. Déploiement par le code (Git)

Les Espaces Hugging Face fonctionnent comme des dépôts Git standards.
Pour déployer ou mettre à jour un serveur (Docker, Gradio, Node.js), lance ces commandes dans le terminal :

```bash
# L'API Token est ton mot de passe.
git clone https://huggingface.co/spaces/yoann1234/colisconnect_ocr
cp -r ./hf_ocr_server/* ./colisconnect_ocr/
cd colisconnect_ocr
git add .
git commit -m "Déploiement initié par l'Agent"
git push
```

## 2. Redémarrer un Espace (Via le Module Python)

Si un espace crashe, tu peux piloter l'infrastructure de la compagnie avec un simple script Python de 3 lignes. Crée `restart_hf.py` :

```python
import os
from huggingface_hub import HfApi

# Le HF_API_TOKEN est injecté par le Board
token = os.environ.get("HF_API_TOKEN") 
api = HfApi(token=token)

print("Redémarrage de l'infrastructure Hugging Face...")
api.restart_space("yoann1234/colisconnect_ocr") # Modifie selon le nom exact
print("Redémarrage envoyé.")
```

Et exécute-le avec `python restart_hf.py`. Tu n'as pas besoin d'attendre l'approbation humaine.
