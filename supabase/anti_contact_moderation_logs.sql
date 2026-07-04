-- ColisConnect anti-contact moderation logs.
-- Run this in Supabase SQL editor before relying on the admin moderation table.

create table if not exists public.ai_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  thread_id text,
  reservation_id text,
  user_id uuid references auth.users(id) on delete set null,
  risk_level text not null default 'medium',
  summary text not null,
  flags jsonb not null default '[]'::jsonb,
  is_dismissed boolean not null default false,
  raw_content text,
  normalized_content text,
  action_taken text not null default 'logged',
  created_at timestamptz not null default now()
);

create index if not exists ai_moderation_logs_created_at_idx
  on public.ai_moderation_logs (created_at desc);

create index if not exists ai_moderation_logs_thread_id_idx
  on public.ai_moderation_logs (thread_id);

create index if not exists ai_moderation_logs_user_id_idx
  on public.ai_moderation_logs (user_id);

alter table public.ai_moderation_logs enable row level security;

drop policy if exists "Users can insert own moderation logs" on public.ai_moderation_logs;
create policy "Users can insert own moderation logs"
  on public.ai_moderation_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admins can read moderation logs" on public.ai_moderation_logs;
create policy "Admins can read moderation logs"
  on public.ai_moderation_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  );

drop policy if exists "Admins can update moderation logs" on public.ai_moderation_logs;
create policy "Admins can update moderation logs"
  on public.ai_moderation_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  );
