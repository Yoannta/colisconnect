---
name: paperclip-local-install-anti-galere
description: Guide ultra-detaille pour installer Paperclip en local sur Windows, diagnostiquer les blocages reels, et appliquer les solutions qui ont fonctionne en pratique (Postgres embarque bloque, Neon externe, Codex adapter, HF fallback).
---

# Skill : Installation locale Paperclip (Windows) + anti-galeres

Ce skill sert a **reproduire une installation locale qui marche** sur Windows, avec une base Postgres externe (Neon) pour eviter les blocages de `embedded-postgres`.

Il inclut les erreurs reelles rencontrees et leurs solutions.

---

## 0. Objectif

Obtenir un Paperclip local fonctionnel sur `http://127.0.0.1:3100` avec :

- base de donnees externe (`postgres` via Neon),
- secret agent JWT valide,
- diagnostic `paperclipai doctor` qui passe sur les checks critiques.

---

## 1. Prerequis

### 1.1 Node/NPM

Verifier :

```powershell
node -v
npm.cmd -v
```

> Important Windows: preferer `npm.cmd` et `npx.cmd` dans PowerShell si les scripts `.ps1` sont bloques par ExecutionPolicy.

### 1.2 Installation CLI Paperclip

```powershell
npx.cmd paperclipai --help
```

Si la commande repond, le CLI est disponible.

---

## 2. Initialiser Paperclip

```powershell
npx.cmd paperclipai onboard --yes
npx.cmd paperclipai doctor
```

Config attendue par defaut :

- dossier home: `C:\Users\hp\.paperclip`
- config: `C:\Users\hp\.paperclip\instances\default\config.json`

---

## 3. Erreur critique rencontree (et cause)

### 3.1 Symptome

Au `paperclipai run`:

- `Execution of PostgreSQL by a user with administrative permissions is not permitted.`
- ou `spawn EPERM` au demarrage embedded postgres.

### 3.2 Cause

Le PostgreSQL embarque refuse certains contextes de securite Windows (token admin/UAC/contexte eleve), meme quand l'utilisateur pense etre en terminal "normal".

### 3.3 Conclusion pratique

Ne pas perdre du temps a forcer `embedded-postgres` sur cette machine.
**Basculer en mode `postgres` externe** (Neon), beaucoup plus fiable.

---

## 4. Configuration stable recommandee : Neon (Postgres externe)

### 4.1 Mettre le mode database sur postgres

Modifier `C:\Users\hp\.paperclip\instances\default\config.json` :

- `"database.mode": "postgres"`
- `"database.connectionString": "postgresql://..."`

URL recommandee:

`postgresql://USER:PASSWORD@HOST/DB?sslmode=require`

> Eviter les complications `channel_binding=require` si la stack locale echoue silencieusement.

### 4.2 Script utile deja cree

Script disponible :

`C:\Users\hp\set-paperclip-neon.cmd`

But: injecter `DATABASE_URL` dans la config Paperclip.

---

## 5. Variable JWT: ne pas confondre

### 5.1 Erreur qui a deja eu lieu

Mettre l'URL Neon dans `PAPERCLIP_AGENT_JWT_SECRET` est une erreur.

### 5.2 Ce qu'il faut

`PAPERCLIP_AGENT_JWT_SECRET` doit etre une **chaine aleatoire longue**, pas une URL.

Exemple generation PowerShell:

```powershell
$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
$b=New-Object byte[] 64
$rng.GetBytes($b)
[Convert]::ToBase64String($b)
```

---

## 6. Lancement local robuste

Script deja prepare :

`C:\Users\hp\start-paperclip-local-neon.cmd`

Ce script :

1. charge le JWT secret depuis `C:\Users\hp\.paperclip\jwt_secret.txt`,
2. lance `paperclipai doctor`,
3. lance `paperclipai run`.

Commande :

```cmd
C:\Users\hp\start-paperclip-local-neon.cmd
```

Puis ouvrir:

`http://127.0.0.1:3100`

---

## 7. Diagnostic rapide (checklist)

Si `doctor` echoue:

1. Verifier `config.json`:
   - `database.mode` = `postgres`
   - `connectionString` = URL Neon valide
2. Verifier JWT:
   - env `PAPERCLIP_AGENT_JWT_SECRET` present
   - valeur non vide / aleatoire
3. Retester:
   - `npx.cmd paperclipai doctor`

---

## 8. Codex adapter: point important

Dans environnements serveur/headless (ex: HF Space), l'adapter Codex demande souvent:

- `codex` installe dans l'image,
- `OPENAI_API_KEY` present.

Le login interactif `codex login` n'est pas toujours exploitable comme en local desktop.

---

## 9. Probleme + solution (historique reel)

### Probleme A

`npm`/`pnpm` bloques dans PowerShell (`*.ps1 cannot be loaded`).

Solution:

- utiliser `npm.cmd`, `npx.cmd`, `pnpm.cmd`.

### Probleme B

`paperclipai run` plante sur embedded postgres (admin permissions / EPERM).

Solution:

- abandonner embedded postgres,
- passer en `database.mode = postgres` + Neon.

### Probleme C

`doctor`: `connect ECONNREFUSED 127.0.0.1:5432`.

Cause:

- config pointait encore vers local `127.0.0.1` au lieu de Neon.

Solution:

- corriger `database.connectionString`.

### Probleme D

Codex test probe: `OPENAI_API_KEY is not set`.

Solution:

- ajouter `OPENAI_API_KEY` (surtout en serveur/headless).

---

## 10. Securite operationnelle

1. Ne jamais partager en clair une URL Postgres contenant le mot de passe.
2. Si exposee: rotate immediatement le password DB.
3. Conserver les secrets dans env/secrets manager, pas dans des fichiers commits.

---

## 11. Commandes utiles

```powershell
npx.cmd paperclipai doctor
npx.cmd paperclipai run
npx.cmd paperclipai configure -s llm
npx.cmd paperclipai auth bootstrap-ceo --help
```

---

## 12. Definition of done

Installation locale consideree OK si:

- `doctor` -> "All critical checks passed" ou equivalent avec DB successful,
- `run` demarre sans blocage,
- UI accessible sur `http://127.0.0.1:3100`.

