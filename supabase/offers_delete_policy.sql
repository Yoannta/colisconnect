-- =========================================================
-- ColisConnect — Autoriser la suppression DEFINITIVE de ses offres
-- Exécuter dans l'éditeur SQL de Supabase (SQL Editor → New query → Run)
-- =========================================================
--
-- Sans cette policy, le bouton « Supprimer » retire bien l'annonce
-- (elle est archivée : elle disparaît du tableau de bord et n'est plus
-- comptée dans la limite de publication), mais la ligne reste en base.
--
-- Avec cette policy, la suppression est DEFINITIVE.

-- 1. Supprimer ses propres offres
drop policy if exists "offers_delete_own" on public.offers;
create policy "offers_delete_own"
  on public.offers
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Modifier ses propres offres (si pas déjà fait)
drop policy if exists "offers_update_own" on public.offers;
create policy "offers_update_own"
  on public.offers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Lire ses propres offres
drop policy if exists "offers_select_own" on public.offers;
create policy "offers_select_own"
  on public.offers
  for select
  to authenticated
  using (auth.uid() = user_id);
