-- Plans can last days, weeks or months. Run ONCE in the Supabase SQL editor (after plan-offers.sql). Safe to run again.
alter table public.plan_offers add column if not exists amount int;
alter table public.plan_offers add column if not exists unit text not null default 'months';
update public.plan_offers set amount = months where amount is null;
alter table public.plan_offers alter column amount set not null;
alter table public.plan_offers drop constraint if exists plan_offers_unit_check;
alter table public.plan_offers add constraint plan_offers_unit_check check (unit in ('days','weeks','months'));
alter table public.plan_offers drop constraint if exists plan_offers_amount_check;
alter table public.plan_offers add constraint plan_offers_amount_check check (amount between 1 and 3650);
