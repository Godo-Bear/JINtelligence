-- Day planner: students plan their day hour by hour (Notes & calendar -> Day planner), and a parent linked with the
-- student's code can READ the day plan and the calendar (never change them).
-- Run this ONCE in the Supabase SQL editor. Safe to run again.
-- (The parent part needs the parent_links / parent_children tables from supabase/parent-access.sql, which you already
--  have if parent codes work. If they don't exist yet it skips that part and tells you.)

create table if not exists public.day_plans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  start_time text not null default '' check (start_time = '' or start_time ~ '^[0-9]{2}:[0-9]{2}$'),
  end_time text not null default '' check (end_time = '' or end_time ~ '^[0-9]{2}:[0-9]{2}$'),
  title text not null default '',
  kind text not null default 'study',
  subject text not null default '',
  details text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists day_plans_user_idx on public.day_plans (user_id, date);

alter table public.day_plans enable row level security;

-- Students manage their own day plan.
drop policy if exists "Own day plan: read" on public.day_plans;
drop policy if exists "Own day plan: insert" on public.day_plans;
drop policy if exists "Own day plan: update" on public.day_plans;
drop policy if exists "Own day plan: delete" on public.day_plans;
create policy "Own day plan: read" on public.day_plans for select using (auth.uid() = user_id);
create policy "Own day plan: insert" on public.day_plans for insert with check (auth.uid() = user_id);
create policy "Own day plan: update" on public.day_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own day plan: delete" on public.day_plans for delete using (auth.uid() = user_id);

-- A parent who linked to the student (with their code) can read the day plan and the calendar.
do $$
begin
  if to_regclass('public.parent_children') is null then
    raise notice 'parent_children does not exist yet: run supabase/parent-access.sql, then run this file again to let parents see the schedule.';
  else
    drop policy if exists "Day plan: linked parent can read" on public.day_plans;
    create policy "Day plan: linked parent can read" on public.day_plans for select using (
      exists (select 1 from public.parent_children pc where pc.parent_id = auth.uid() and pc.student_id = day_plans.user_id));
    if to_regclass('public.calendar_events') is not null then
      drop policy if exists "Calendar: linked parent can read" on public.calendar_events;
      create policy "Calendar: linked parent can read" on public.calendar_events for select using (
        exists (select 1 from public.parent_children pc where pc.parent_id = auth.uid() and pc.student_id = calendar_events.user_id));
    end if;
  end if;
end $$;
