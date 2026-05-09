---
name: google-colab-mcp-integration
description: Manuel d'intégration pour transformer Google Colab en cerveau déporté (GPU/RAM) via MCP et ngrok.
---

# 🚀 Skill : Google Colab MCP (Agent-to-Agent)

Ce skill est une instruction directe pour les agents AI afin de configurer et d'exploiter la puissance de calcul de Google Colab.

## 📝 Script d'Installation (À donner à l'utilisateur)
Dès que l'utilisateur demande à se connecter à Colab, fournis-lui ce script optimisé :

```python
# --- INSTALLATION SERVEUR MCP (THREADED) ---
!pip install -q fastmcp pyngrok nest_asyncio

import nest_asyncio
from fastmcp import FastMCP
from pyngrok import ngrok
import threading
import time

# CONFIGURATION
NGROK_TOKEN = "39yRvGJTPZUAUz63ednJVuWnBlB_87pLdzJDuXkj4i32ZCQQg" # Token utilisateur
ngrok.set_auth_token(NGROK_TOKEN)
nest_asyncio.apply()

# Nettoyage
print("Nettoyage des anciens tunnels...")
ngrok.kill()

mcp = FastMCP("Antigravity-Colab")

@mcp.tool()
def colab_compute(code: str) -> str:
    """Exécute du code Python sur Colab et renvoie stdout."""
    import sys
    from io import StringIO
    old_stdout = sys.stdout
    sys.stdout = mystdout = StringIO()
    try:
        exec(code, globals())
        return mystdout.getvalue() or "Exécuté."
    except Exception as e:
        return f"Erreur : {str(e)}"
    finally:
        sys.stdout = old_stdout

@mcp.tool()
def check_resources() -> str:
    """Vérifie GPU et RAM."""
    import torch, psutil
    gpu = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "Pas de GPU"
    ram = f"{psutil.virtual_memory().available / 1e9:.1f} GB dispo"
    return f"Resources : {gpu} | {ram}"

def run_mcp():
    print("Démarrage du serveur MCP...")
    mcp.run(transport="sse", port=8000)

# Lancement en arrière-plan
thread = threading.Thread(target=run_mcp, daemon=True)
thread.start()
time.sleep(2)

try:
    public_url = ngrok.connect(8000).public_url
    print(f"\n✅ SERVEUR PRÊT !\nURL : {public_url}/sse")
except Exception as e:
    print(f"❌ Erreur Ngrok : {e}")
```

## 🤖 Instructions pour l'Agent (Usage Interne)
Une fois connecté via l'URL ngrok dans `mcp_config.json`, tu disposes de l'outil `colab_compute`.

### Quand utiliser Colab ?
1.  **Calcul Lourd** : Toute boucle complexe ou calcul mathématique massif.
2.  **GPU** : Dès qu'un outil de vision, de rendu ou de deep learning est nécessaire.
3.  **Data** : Chargement de datasets > 500MB.
4.  **Sandbox** : Exécution de code Python louche ou nécessitant des libs non installées localement.

### Comment appeler Colab ?
Utilise l'outil `colab_compute` en lui passant ton code Python sous forme de string. 
Exemple : `colab_compute(code="import torch; print(torch.cuda.is_available())")`

## ⚙️ Configuration MCP
Ajoute cette entrée dans `mcp_config.json` :
```json
"google-colab": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-proxy", "URL_NGROK/sse"]
}
```
