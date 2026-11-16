-- Year levels are chosen by an admin (Admin -> Manage -> "Year level…"), not by students. Until an admin
-- sets one, a student's level is "Any level" (the AI works it out). Run once in the Supabase SQL editor.
-- Safe to run more than once. Re-defines protect_profile_fields() so students can't change their own year
-- level through the API — this is the full, cumulative version of the trigger; nothing from the earlier
-- versions is dropped.
alter table public.profiles add column if not exists year_level text;

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
    new.year_level := null;
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
  new.deleted := old.deleted;
  return new;
end;
$$;
