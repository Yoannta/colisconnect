-- =========================================================
-- MIGRATION : Ajout de la colonne profile_type dans profiles
-- Exécuter dans l'éditeur SQL de Supabase (cftijcrpawnjmmpkigei)
-- =========================================================

-- 1. Ajout de la colonne (si elle n'existe pas déjà)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_type TEXT
CHECK (profile_type IN ('client', 'traveler', 'cargo'));

-- 2. Valeur par défaut : NULL (pas encore classé)
-- Aucun défaut imposé, reste NULL jusqu'à action métier

-- 3. Commentaire
COMMENT ON COLUMN public.profiles.profile_type IS 
'Type de profil métier. NULL = non classé, client = cherche à envoyer des colis, traveler = voyageur simple, cargo = entreprise import/export';
