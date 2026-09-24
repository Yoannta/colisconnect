# RAPPORT — Edge Function Supabase `chat` (ColisConnect ↔ DeepSeek)

**Fichier livré :** `supabase/functions/chat/index.ts`
**Statut :** créé, syntaxe vérifiée (aucune erreur). **NON déployé** (déploiement à faire par le propriétaire après validation).

---

## 1. Contrat de réponse exact (JSON strict)

Le serveur ne renvoie **jamais** le texte brut de DeepSeek. Il parse, valide, borne,
puis **re-sérialise** lui-même l'objet. Trois types seulement :

| Type | Forme | Usage |
|---|---|---|
| `chat` | `{ "type": "chat", "message": "..." }` | réponse normale de conversation |
| `guide` | `{ "type": "guide", "intent": "publish_trip" }` | le visiteur a demandé explicitement qu'on lui montre |
| `guide_confirmation` | `{ "type": "guide_confirmation", "intent": "find_country", "message": "Je peux te montrer." }` | demande ambiguë → le site affiche un bouton [Me montrer] |

**Liste blanche des intentions** (aucune autre n'est acceptée) :
`find_country`, `find_offer`, `publish_trip`, `set_phone`, `my_profile`
(identique à `guide-intents.js` côté site — vérifié dans le code source).

---

## 2. Validation côté serveur (le point de sécurité)

1. La réponse du modèle est **parsée** (tolérance : on isole la 1re `{` → dernière `}` si le modèle ajoute du bruit).
2. Si ce n'est **pas du JSON valide** → **une seule** nouvelle tentative avec une consigne plus stricte, puis **message de secours**.
3. Le `type` doit être exactement `chat` / `guide` / `guide_confirmation`, sinon rejet.
4. Pour `guide` et `guide_confirmation`, l'`intent` **doit être dans la liste blanche**, sinon **dégradation** en `{ type: "chat", message: "..." }` (aucune intention inventée ne sort).
5. `guide_confirmation` exige un `message` non vide, sinon dégradation.
6. **Borne de taille** sur `message` : 600 caractères max.
7. Re-sérialisation serveur : l'objet renvoyé est reconstruit champ par champ (jamais d'écho du texte brut).

---

## 3. Limites anti-abus

| Limite | Valeur | Comportement |
|---|---|---|
| Taille du message entrant | **500 caractères** | refus `400` au-delà |
| Débit par visiteur | **20 requêtes / 10 min** (par IP, fenêtre glissante, en mémoire) | réponse `429` avec message propre |
| `max_tokens` | **300** plafonné | évite les factures surprises |
| Timeout DeepSeek | **15 s** (`AbortController`) | réponse de secours |
| Gestion d'erreur | jamais de `500` brut | toujours un objet JSON exploitable |

- L'IP est lue depuis `x-forwarded-for` (puis `x-real-ip`, `cf-connecting-ip`, sinon `unknown`).
- **Attention (limite connue)** : le rate-limit est **en mémoire = par instance** d'Edge Function. C'est un premier filet suffisant pour un site public, pas une garantie distribuée (si besoin, passer par une table Postgres ou un KV).

---

## 4. CORS

Identique à `ai-assistant` : `Access-Control-Allow-Origin: *` (site sur GitHub Pages), méthode `POST`, préflight `OPTIONS` géré. Le corps attendu est `{ "prompt": "..." }` (le champ `systemPrompt`/`model` n'est **pas** accepté ici, pour verrouiller le contrat).

---

## 5. Comment tester

**Prérequis :** fonction déployée + secret `DEEPSEEK_API_KEY` déjà présent sur le projet (réutilisé).

### Local (sans déploiement)
```bash
supabase functions serve chat --no-verify-jwt --env-file supabase/.env.local
# puis :
curl -sS -X POST http://localhost:54321/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"montre-moi où choisir le pays de départ"}'
```

### Production (après déploiement)
```bash
curl -sS -X POST "https://cftijcrpawnjmmpkigei.supabase.co/functions/v1/chat" \
  -H "apikey: <VOTRE_CLE_ANON>" \
  -H "Authorization: Bearer <VOTRE_CLE_ANON>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"je ne trouve pas le champ du pays"}'
```

Réponses attendues :
- `{"type":"guide","intent":"find_country"}`
- `{"type":"guide_confirmation","intent":"find_country","message":"Je peux te montrer."}`
- `{"type":"chat","message":"..."}` pour toute question hors guidage.

### Tests de robustesse à faire
```bash
# 1. Message trop long (501+ caractères) → 400
# 2. Corps sans "prompt" → 400
# 3. Envoyer 21 requêtes en < 10 min depuis la même IP → la 21e = 429
# 4. Méthode GET → 405
```

---

## 6. Ce qui reste à faire (hors périmètre de cette tâche)

1. **Déploiement** (par le propriétaire) :
   ```bash
   supabase functions deploy chat --no-verify-jwt --project-ref cftijcrpawnjmmpkigei
   ```
   `--no-verify-jwt` est **obligatoire** : la fonction doit rester publique comme `ai-assistant`
   (sinon 401). Alternative durable : ajouter dans `supabase/config.toml` :
   ```toml
   [functions.chat]
   verify_jwt = false
   ```
   ⚠️ Ne pas modifier `supabase/functions/ai-assistant/index.ts` (inchangé, sert encore à l'admin).

2. **Brancher le front** : le site appelle aujourd'hui `ai-assistant` via le bridge
   `standalone-common.js` (`functions.invoke('ai-assistant', …)`). Pour utiliser le guidage
   structuré, il faut pointer les appels de la mascotte vers la fonction **`chat`** et
   brancher la réponse sur `CCGuideIntents.valider(...)` / le guide-controller existant.

3. **(Optionnel) Durcir le rate-limit** en le déplaçant en stockage partagé (Postgres) si on
   constate des contournements entre instances.

---

## 7. Fichiers touchés

- **Créé :** `supabase/functions/chat/index.ts` (nouvelle fonction dédiée).
- **Non modifiés :** `supabase/functions/ai-assistant/index.ts` et tout le reste.
- Aucun fichier existant n'a nécessité de sauvegarde (la fonction `chat` est nouvelle).
