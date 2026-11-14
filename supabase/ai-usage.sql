-- Daily AI usage limits (tutor chat + AI-made tests). One row per student per day; admins are exempt
-- in the app itself, not here. Run once in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  tutor_count int not null default 0,
  aitest_count int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "AI usage: own read" on public.ai_usage for select using (auth.uid() = user_id);
create policy "AI usage: own insert" on public.ai_usage for insert with check (auth.uid() = user_id);
create policy "AI usage: own update" on public.ai_usage for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
