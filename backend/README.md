# Backend ColisConnect (SQL + Auth)

## Lancer le backend

Depuis `C:\Users\hp\.gemini\antigravity\scratch\colis_connect`:

```powershell
node backend/server.js
```

Ouvrir ensuite:

`http://127.0.0.1:8080`

## Ce que fait ce backend

- Sert le frontend (HTML/CSS/JS)
- Expose une API REST
- Gère une base SQL SQLite: `backend/colisconnect.sqlite`
- Gère les comptes utilisateurs + sessions (token Bearer)

## Endpoints principaux

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/travelers`
- `POST /api/trips` (auth requis)
- `GET /api/conversations` (auth requis)
- `POST /api/conversations/by-traveler` (auth requis)
- `GET /api/conversations/:id/messages` (auth requis)
- `POST /api/conversations/:id/messages` (auth requis)

## Reset base SQL

Supprimer le fichier:

`backend/colisconnect.sqlite`

Puis relancer le serveur. Le schéma sera recréé et un compte admin par défaut peut être ajouté, mais aucune offre de démonstration n'est seedée automatiquement.
