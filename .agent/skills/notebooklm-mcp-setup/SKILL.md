---
name: notebooklm-mcp-setup
description: Guide complet d'installation, configuration et dépannage du serveur MCP NotebookLM. Couvre l'installation pip, l'authentification Google, la configuration IDE, et les solutions aux erreurs courantes (EOF, context deadline exceeded, auth expired).
---

# NotebookLM MCP Server — Guide Complet

## 1. Prérequis

- **Python 3.10+** installé et accessible via `python` ou `python3`
- **pip** à jour (`python -m pip install --upgrade pip`)
- **Google Chrome** installé (nécessaire pour l'authentification)
- Un **compte Google** avec accès à [notebooklm.google.com](https://notebooklm.google.com)

## 2. Installation

```bash
pip install notebooklm-mcp-server
```

Vérifier l'installation :

```bash
pip show notebooklm-mcp-server
# Doit afficher : Name: notebooklm-mcp-server, Version: 0.1.15+
```

Vérifier que l'exécutable est accessible :

```bash
notebooklm-mcp --help
# Doit afficher l'aide avec les options --transport, --host, --port, etc.
```

## 3. Authentification Google

### 3.1 Commande d'authentification automatique

```bash
notebooklm-mcp-auth
```

Cette commande :

1. Ouvre Chrome automatiquement sur `notebooklm.google.com`
2. Extrait les cookies de session Google
3. Sauvegarde les tokens dans `~/.notebooklm-mcp/auth.json`

> [!IMPORTANT]
> Vous devez être **déjà connecté à votre compte Google** dans Chrome avant de lancer cette commande.

### 3.2 Vérifier les tokens

```bash
# Windows PowerShell
type $HOME\.notebooklm-mcp\auth.json | python -c "import sys,json,time; d=json.load(sys.stdin); print(f'Cookies: {len(d.get(chr(99)+chr(111)+chr(111)+chr(107)+chr(105)+chr(101)+chr(115),{}))}  Age: {(time.time()-d.get(chr(101)+chr(120)+chr(116)+chr(114)+chr(97)+chr(99)+chr(116)+chr(101)+chr(100)+chr(95)+chr(97)+chr(116),0))/60:.0f}min')"
```

Résultat attendu : `Cookies: 15  Age: Xmin` (X < 10080 = 1 semaine)

### 3.3 Fichier auth.json

Emplacement : `C:\Users\<USER>\.notebooklm-mcp\auth.json`  
Structure :

```json
{
  "cookies": { "SID": "...", "HSID": "...", "SSID": "...", "APISID": "...", "SAPISID": "...", ... },
  "csrf_token": "",
  "session_id": "",
  "extracted_at": 1742397600.0
}
```

Les cookies essentiels sont : **SID, HSID, SSID, APISID, SAPISID**. Le `csrf_token` et `session_id` sont auto-extraits au premier appel API.

## 4. Configuration IDE

### 4.1 Fichier mcp_config.json

Créer le fichier de configuration MCP requis par votre IDE :

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "notebooklm-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

**Emplacements selon l'IDE :**

| IDE | Emplacement du fichier |
|-----|----------------------|
| Gemini CLI / Antigravity | `~/.gemini/antigravity/mcp_config.json` |
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` dans le projet |
| VS Code (Copilot) | `.vscode/mcp.json` dans le projet |

### 4.2 Rechargement

Après toute modification du fichier de config :

1. Recharger les outils MCP dans l'IDE (bouton refresh ou commande)
2. Attendre que les outils `mcp_notebooklm_*` apparaissent
3. Tester avec `mcp_notebooklm_notebook_list`

## 5. Correctif Obligatoire : Bannière FastMCP

> [!CAUTION]
> Le package original a un **bug critique** : FastMCP affiche une bannière ASCII sur stdout au démarrage en mode stdio, ce qui **corrompt le protocole JSON-RPC** et cause des erreurs `EOF` ou `context deadline exceeded`.

### 5.1 Appliquer le correctif

Trouver le fichier `server.py` :

```bash
python -c "import notebooklm_mcp; print(notebooklm_mcp.__path__[0])"
# Exemple : C:\Users\hp\AppData\Local\Programs\Python\Python313\Lib\site-packages\notebooklm_mcp
```

Ouvrir `server.py` et trouver la fonction `main()` (vers la fin du fichier). Chercher :

```python
    else:
        # Default: stdio transport (no message - stdio should be silent)
        mcp.run()
```

Remplacer par :

```python
    else:
        # Default: stdio transport - banner MUST be disabled to avoid
        # corrupting the JSON-RPC protocol on stdout
        mcp.run(show_banner=False)
```

### 5.2 Vérifier le correctif

```bash
notebooklm-mcp 2>&1 | head -1
# NE DOIT PAS afficher la bannière "+----...FastMCP..."
# Doit être silencieux (attente de commandes JSON-RPC sur stdin)
```

## 6. Dépannage — Erreurs Courantes

### 6.1 Erreur : `EOF` (connection closed)

**Symptôme :** `error executing cascade step: CORTEX_STEP_TYPE_MCP_TOOL: connection closed: calling "tools/call": client is closing: EOF`

**Causes possibles (par ordre de probabilité) :**

1. **Bannière FastMCP sur stdout** → Appliquer le correctif §5.1
2. **Processus MCP zombie** → Tuer et relancer :

   ```powershell
   Get-Process | Where-Object { $_.Path -like '*notebooklm*' } | Stop-Process -Force
   ```

3. **Fichier server.py corrompu** → Réinstaller :

   ```bash
   pip install --force-reinstall notebooklm-mcp-server
   ```

   Puis réappliquer le correctif §5.1

### 6.2 Erreur : `context deadline exceeded`

**Symptôme :** Le JSON de réponse MCP s'affiche mais suivi de `context deadline exceeded`

**Cause :** L'IDE a un timeout court pour l'initialisation MCP, et le démarrage Python + chargement des modules est trop lent.

**Solutions :**

1. Vérifier que le correctif §5.1 est appliqué (la bannière ajoute du délai)
2. S'assurer qu'aucun autre processus `notebooklm-mcp` ne tourne :

   ```powershell
   Get-Process | Where-Object { $_.Path -like '*notebooklm*' }
   ```

3. Si le problème persiste, relancer l'IDE complètement

### 6.3 Erreur : `RPC Error 16: Authentication expired`

**Symptôme :** L'outil répond mais dit que l'authentification a expiré.

**Solution :**

1. Relancer l'authentification :

   ```bash
   notebooklm-mcp-auth
   ```

2. Puis dans l'IDE, appeler `mcp_notebooklm_refresh_auth` pour recharger les tokens

### 6.4 Erreur : `No authentication found`

**Symptôme :** Le serveur ne démarre pas car aucun token n'est trouvé.

**Solution :**

1. Vérifier que `~/.notebooklm-mcp/auth.json` existe
2. Si non, lancer `notebooklm-mcp-auth`
3. Si Chrome ne s'ouvre pas, vérifier l'installation de Chrome

### 6.5 Erreur : `WinError 10060` (Timeout réseau)

**Symptôme :** Erreurs de timeout lors des appels à l'API NotebookLM.

**Cause :** Connexion internet lente (latence > 500ms vers Google).

**Diagnostic :**

```bash
ping notebooklm.google.com
# Si > 500ms, la connexion est trop lente pour les timeouts par défaut
```

**Solution :** Augmenter les timeouts dans `api_client.py` :

```python
# Trouver ces lignes (vers le début du fichier) :
DEFAULT_TIMEOUT = 30.0
SOURCE_ADD_TIMEOUT = 120.0

# Remplacer par des valeurs plus élevées :
DEFAULT_TIMEOUT = 120.0
SOURCE_ADD_TIMEOUT = 300.0
```

## 7. Réinstallation Complète (Reset Total)

Si rien ne fonctionne, voici la procédure de reset complet :

```powershell
# 1. Tuer tous les processus MCP
Get-Process | Where-Object { $_.Path -like '*notebooklm*' } | Stop-Process -Force

# 2. Désinstaller
pip uninstall notebooklm-mcp-server -y

# 3. Nettoyer le cache d'auth (optionnel)
Remove-Item "$HOME\.notebooklm-mcp\auth.json" -ErrorAction SilentlyContinue

# 4. Réinstaller
pip install notebooklm-mcp-server

# 5. Appliquer le correctif bannière (§5.1)
# Ouvrir server.py et changer mcp.run() en mcp.run(show_banner=False)

# 6. Ré-authentifier
notebooklm-mcp-auth

# 7. Recharger les outils MCP dans l'IDE
# 8. Tester : mcp_notebooklm_notebook_list
```

## 8. Outils MCP Disponibles

| Outil | Description |
|-------|-------------|
| `notebook_list` | Lister tous les notebooks |
| `notebook_get` | Détails d'un notebook avec ses sources |
| `notebook_create` | Créer un nouveau notebook |
| `notebook_rename` | Renommer un notebook |
| `notebook_delete` | Supprimer un notebook (irréversible) |
| `notebook_query` | Poser une question à l'IA sur les sources existantes |
| `notebook_describe` | Résumé IA + sujets suggérés |
| `notebook_add_url` | Ajouter une URL comme source |
| `notebook_add_text` | Ajouter du texte comme source |
| `notebook_add_drive` | Ajouter un document Google Drive |
| `source_describe` | Résumé IA d'une source |
| `source_get_content` | Contenu brut d'une source |
| `source_delete` | Supprimer une source |
| `research_start` | Lancer une recherche web ou Drive |
| `research_status` | Vérifier l'état d'une recherche |
| `research_import` | Importer les résultats dans le notebook |
| `report_create` | Générer un rapport |
| `audio_overview_create` | Générer un overview audio |
| `video_overview_create` | Générer un overview vidéo |
| `quiz_create` | Générer un quiz |
| `flashcards_create` | Générer des flashcards |
| `mind_map_create` | Générer une mind map |
| `infographic_create` | Générer une infographie |
| `slide_deck_create` | Générer un slide deck |
| `studio_status` | Vérifier l'état de génération studio |
| `refresh_auth` | Recharger les tokens d'authentification |

## 9. Architecture Technique

```
IDE (Gemini/Claude/Cursor)
    ↕ JSON-RPC via stdio (stdout/stdin)
notebooklm-mcp.exe (FastMCP 3.x)
    ↕ HTTPS (httpx)
notebooklm.google.com (API interne Google)
```

**Fichiers clés :**

- `server.py` : Serveur MCP, définition des outils, fonction `main()`
- `api_client.py` : Client HTTP vers l'API NotebookLM, gestion auth/CSRF
- `auth.py` : Gestion du cache de tokens (`auth.json`)
- `constants.py` : Codes et mappings de l'API
