# 📋 DOSSIER DE PASSATION - COLISCONNECT

## 🎯 OBJECTIF
Finaliser la transition Cloud-Native Supabase et stabiliser l'interface Admin.

## ✅ RÉALISÉ (SESSION PRÉCÉDENTE)
- **Sécurisation API** : Toutes les clés (`DeepSeek`, `Stripe`, `GeniusPay`, `Gemini`) ont été migrées vers **Supabase Secrets**. Le fichier `.env` local est ignoré par Git.
- **Pont Universel (V9)** : `standalone-common.js` centralise désormais tous les appels Cloud.
- **Correction Parasites** : Suppression massive des caractères ``n` injectés par erreur dans les fichiers HTML.
- **Authentification** : Standardisation sur `cc_auth_token`.

## 🚧 EN COURS / À FAIRE IMMÉDIATEMENT
### 1. Erreur de Jointure (Results.html)
**Problème** : `Could not find a relationship between 'offers' and 'profiles'`.
**Solution** : Exécuter ce SQL dans le dashboard Supabase :
```sql
ALTER TABLE offers
ADD CONSTRAINT fk_offers_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;
```

### 2. Finalisation de la page Admin
- La page affiche désormais les données via Supabase, mais certains endpoints avancés (Analytics, Audit Log) sont encore vides (statiques dans le bridge).
- Le bug du "mur de texte Base64" sur l'admin a été corrigé en sécurisant la fonction `api()` de `admin.js`.

### 3. Edge Function "ai-assistant"
- La fonction est créée dans `supabase/functions/ai-assistant`.
- Elle supporte DeepSeek (chat-model), Gemini et Kimi.
- **Action requise** : Déployer (`supabase functions deploy ai-assistant`).

## 🛠️ OUTILS & RÉFÉRENCES
- **Pont UI** : `standalone-common.js`
- **Session** : `localStorage.getItem("cc_auth_token")`.
