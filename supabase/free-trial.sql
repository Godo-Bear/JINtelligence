-- FREE TRIAL: run this once in the Supabase SQL editor (safe to run again). It includes the whole profile-protection function.
-- ALL-IN-ONE for the profile changes: plans, account types, AI bonus, teacher flag, one-device login and
-- admin-set year levels. Run this ONCE (paste the whole thing) in the Supabase SQL editor. Safe to run more
-- than once. The columns are added first and the protective trigger last, so the order can't go wrong.
alter table public.profiles add column if not exists is_teacher boolean not null default false;
alter table public.profiles add column if not exists ai_bonus_pct int not null default 0;
alter table public.profiles add column if not exists plan_months int not null default 4;
alter table public.profiles add column if not exists account_type text not null default 'student';
alter table public.profiles add column if not exists active_session text;
alter table public.profiles add column if not exists allow_multi_device boolean not null default false;
alter table public.profiles add column if not exists year_level text;
alter table public.profiles add column if not exists trial_ends_at timestamptz;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin(auth.uid()) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.id <> auth.uid() then
      raise exception 'You can only change your own account';
    end if;
    return old;
  end if;
  if new.id <> auth.uid() or (tg_op = 'UPDATE' and old.id <> auth.uid()) then
    raise exception 'You can only change your own account';
  end if;

  if tg_op = 'INSERT' then
    new.has_paid := false;
    new.paid_until := null;
    new.is_admin := false;
    new.is_teacher := false;
    new.ai_bonus_pct := 0;
    new.allow_multi_device := false;
    -- a student picks their year level when they sign up; after that only an admin can change it (see the update branch below)
    if new.year_level is not null and new.year_level not in ('p2','y34','y56','y7','y8','y9','y10','y11','y12','uni','adult') then new.year_level := null; end if;
    -- a free trial lasts 90 minutes from sign-up (set here by the server, so it can't be made longer); parent accounts are free anyway
    if new.trial_ends_at is not null and coalesce(new.account_type, 'student') <> 'parent' then new.trial_ends_at := now() + interval '90 minutes'; else new.trial_ends_at := null; end if;
    new.deleted := false;
    return new;
  end if;

  new.has_paid := old.has_paid;
  new.paid_until := old.paid_until;
  new.is_admin := old.is_admin;
  new.is_teacher := old.is_teacher;
  new.ai_bonus_pct := old.ai_bonus_pct;
  new.allow_multi_device := old.allow_multi_device;
  new.year_level := old.year_level;
  new.trial_ends_at := old.trial_ends_at; -- only an admin can change it
  new.account_type := old.account_type; -- chosen at sign-up; only an admin can change it (so a parent account can't become a student one)
  new.deleted := old.deleted;
  return new;
end;
$$;

-- The site reads the server's clock for the trial countdown, so changing the device clock doesn't extend it.
create or replace function public.server_time() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.server_time() to anon, authenticated;
