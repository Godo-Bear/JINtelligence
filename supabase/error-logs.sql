-- Client error logging: uncaught errors and unhandled promise rejections are reported here
-- automatically, and the Admin page's "Error logs" section lets you browse and clear them.
-- Run once in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  username text,
  context text,
  message text,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

-- Anyone logged in can report an error about their own session; only admins can read or clear the log.
create policy "Error logs: anyone logged in can report" on public.error_logs for insert
  with check (auth.role() = 'authenticated');
create policy "Error logs: admin read" on public.error_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "Error logs: admin delete" on public.error_logs for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
