-- A daily cap on AI calls for the WHOLE site, so the free Google allowance isn't used up in the first hour.
-- Once the cap is reached, everyone sees "the AI's limit for today has been reached" (admins are exempt).
-- The day rolls over at midnight Pacific time, the same moment Google resets its free allowance.
-- Run once in the Supabase SQL editor. Safe to run again. Change the cap any time in Admin -> AI usage.
create table if not exists public.ai_site_usage (day date primary key, count int not null default 0);
create table if not exists public.ai_site_settings (id int primary key default 1 check (id = 1), daily_cap int not null default 150 check (daily_cap between 0 and 100000));
insert into public.ai_site_settings (id) values (1) on conflict do nothing;
alter table public.ai_site_usage enable row level security;
alter table public.ai_site_settings enable row level security;
drop policy if exists "AI site: read usage" on public.ai_site_usage;
drop policy if exists "AI site: read settings" on public.ai_site_settings;
drop policy if exists "AI site: admin settings" on public.ai_site_settings;
create policy "AI site: read usage" on public.ai_site_usage for select to authenticated using (true);
create policy "AI site: read settings" on public.ai_site_settings for select to authenticated using (true);
create policy "AI site: admin settings" on public.ai_site_settings for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Counts one AI call. Returns false (and counts nothing) once today's cap is used up.
create or replace function public.ai_site_take() returns boolean language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Los_Angeles')::date; cap int; c int;
begin
  select daily_cap into cap from public.ai_site_settings where id = 1;
  insert into public.ai_site_usage (day, count) values (d, 0) on conflict do nothing;
  update public.ai_site_usage set count = count + 1 where day = d and count < coalesce(cap, 150) returning count into c;
  return c is not null;
end $$;
-- How much has been used today, and the cap (for the admin page).
create or replace function public.ai_site_status() returns table (used int, cap int) language sql security definer set search_path = public as $$
  select coalesce((select count from public.ai_site_usage where day = (now() at time zone 'America/Los_Angeles')::date), 0),
         coalesce((select daily_cap from public.ai_site_settings where id = 1), 150);
$$;
grant execute on function public.ai_site_take() to authenticated;
grant execute on function public.ai_site_status() to authenticated;
