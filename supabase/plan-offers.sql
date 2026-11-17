-- Plans an admin can make from the Admin page (Admin -> Plans & prices): a title, description, months, price and badge.
-- Run this ONCE in the Supabase SQL editor. Safe to run again.
create table if not exists public.plan_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  description text not null default '' check (char_length(description) <= 140),
  months int not null check (months between 1 and 120),
  price numeric(8,2) not null check (price >= 0 and price <= 10000),
  badge text not null default '' check (char_length(badge) <= 24),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.plan_offers enable row level security;

-- Anyone can read the plans (they're shown on the sign-up page before logging in).
drop policy if exists "plan offers readable by everyone" on public.plan_offers;
create policy "plan offers readable by everyone" on public.plan_offers for select to anon, authenticated using (true);

-- Only admins can add, change or delete plans.
drop policy if exists "admins manage plan offers" on public.plan_offers;
create policy "admins manage plan offers" on public.plan_offers for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select on public.plan_offers to anon, authenticated;
grant insert, update, delete on public.plan_offers to authenticated;

-- Remember which plan someone picked (its title), next to the months already stored.
alter table public.profiles add column if not exists plan_name text;

-- Start with the plans you already had (copied from the earlier "plans" table if you made it), or $7 / $15.
do $$
begin
  if not exists (select 1 from public.plan_offers) then
    if to_regclass('public.plans') is not null then
      insert into public.plan_offers (title, months, price, sort_order)
        select months || case when months = 1 then ' month' else ' months' end, months, price, months from public.plans;
    end if;
    if not exists (select 1 from public.plan_offers) then
      insert into public.plan_offers (title, months, price, sort_order) values ('1 month', 1, 7, 0), ('4 months', 4, 15, 1);
    end if;
  end if;
end $$;
