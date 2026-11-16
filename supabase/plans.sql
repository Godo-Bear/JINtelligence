-- Sign-up plans: a student picks $7 for 1 month or $15 for 6 months when they create an account, and it's
-- shown in Settings and to admins (who choose how many months to add when they unlock or renew someone).
-- Run once in the Supabase SQL editor. Safe to run more than once.
alter table public.profiles add column if not exists plan_months int not null default 6;
