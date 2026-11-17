-- Plans & prices an admin can change from the Admin page (Admin → Plans & prices).
-- Run this ONCE in the Supabase SQL editor. Safe to run again.
create table if not exists public.plans (
  months int primary key check (months between 1 and 120),
  price numeric(8,2) not null check (price >= 0 and price <= 10000),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Anyone can read the prices (they're shown on the sign-up page before logging in).
drop policy if exists "plans readable by everyone" on public.plans;
create policy "plans readable by everyone" on public.plans for select to anon, authenticated using (true);

-- Only admins can add, change or remove plans.
drop policy if exists "admins manage plans" on public.plans;
create policy "admins manage plans" on public.plans for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;

-- Start with the current prices.
insert into public.plans (months, price) values (1, 7), (4, 15) on conflict (months) do nothing;
