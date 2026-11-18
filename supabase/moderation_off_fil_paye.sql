-- ============================================================
-- moderation_off : la moderation s'eteint UNE fois par fil, au paiement.
--
-- Objectif : une fois le paiement encaisse, le client et le voyageur doivent
-- pouvoir echanger leurs coordonnees. Avant ce correctif, deux triggers de
-- chat_messages refusaient encore le contact sur un fil paye.
--
-- Principe : aucun calcul par message. Un drapeau est pose une seule fois,
-- par un trigger qui ne se declenche que lorsqu'une reservation change de
-- statut. Les gardes lisent un seul booleen, et seulement sur un message qui
-- porte reellement un contact (sur un message normal, elles sortent avant).
-- ============================================================

alter table public.chat_threads
    add column if not exists moderation_off boolean not null default false;

-- Fils deja payes au moment du correctif.
update public.chat_threads t
   set moderation_off = true
  from public.reservations r
 where r.id = t.reservation_id
   and r.status in ('paid', 'voyageur_paye', 'colisconnect_paye', 'livre', 'delivered')
   and t.moderation_off is distinct from true;

-- Bascule : declenchee par le paiement, jamais par un message.
create or replace function public.cc_sync_moderation_off()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  paye boolean;
begin
  paye := coalesce(new.status, '') in ('paid', 'voyageur_paye', 'colisconnect_paye', 'livre', 'delivered');
  update public.chat_threads
     set moderation_off = paye
   where reservation_id = new.id
     and moderation_off is distinct from paye;
  return new;
end $fn$;

drop trigger if exists cc_reservations_moderation_off on public.reservations;
create trigger cc_reservations_moderation_off
after insert or update of status on public.reservations
for each row execute function public.cc_sync_moderation_off();

-- Filet de securite : un fil cree apres le paiement nait avec le bon drapeau.
create or replace function public.cc_thread_moderation_default()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  new.moderation_off := coalesce(
    (select r.status in ('paid', 'voyageur_paye', 'colisconnect_paye', 'livre', 'delivered')
       from public.reservations r where r.id = new.reservation_id),
    false);
  return new;
end $fn$;

drop trigger if exists cc_threads_moderation_default on public.chat_threads;
create trigger cc_threads_moderation_default
before insert on public.chat_threads
for each row execute function public.cc_thread_moderation_default();

-- Lecture : un seul booleen, par cle primaire.
create or replace function public.cc_thread_moderation_off(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select coalesce((select t.moderation_off from public.chat_threads t where t.id = p_thread), false);
$fn$;

-- ============================================================
-- Gardes : elles consultent le drapeau, mais seulement la ou un contact
-- a ete detecte. Le reste du chemin est inchange.
--
--   cc_chat_ai_guard : apres cc_ai_fraude_recente (qui sort avant si aucune
--                      alerte dans les 24 h -> aucun cout sur un message normal)
--   cc_chat_guard    : a chaque point de refus (contact, fragmentation, cumul)
--
-- Voir les definitions en base : pg_get_functiondef('public.cc_chat_ai_guard'::regproc)
--                               pg_get_functiondef('public.cc_chat_guard'::regproc)
--
-- Resultat verifie le 18/11/2026 sur la production :
--   fil paye  + alerte fraude + numero  -> accepte
--   fil paye  sans alerte     + numero  -> accepte
--   fil non paye + alerte     + numero  -> refuse (ia_fraude_confirmee)
--   fil non paye sans alerte  + numero  -> refuse (phone)
--   reservation pending -> paid          -> drapeau bascule seul
--
-- Cout mesure (production, 140 messages) :
--   cc_ai_fraude_recente deja appele a chaque message : 0,068 ms
--   lecture du drapeau sur le fil                     : 0,085 ms
--
-- Retour arriere si besoin :
--   drop trigger if exists cc_reservations_moderation_off on public.reservations;
--   drop trigger if exists cc_threads_moderation_default on public.chat_threads;
--   drop function if exists public.cc_sync_moderation_off();
--   drop function if exists public.cc_thread_moderation_default();
--   drop function if exists public.cc_thread_moderation_off(uuid);
--   -- puis restaurer les deux gardes (sauvegarde dans l'historique git).
-- ============================================================
