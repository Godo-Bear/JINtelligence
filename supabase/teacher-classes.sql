-- Teacher accounts: classes with join codes, assignments (tests or writing prompts) with due dates,
-- and each student's results. Run this once in the Supabase SQL editor. Safe to run more than once.

-- Lets an admin make someone a teacher (Admin page → Manage → Make teacher).
alter table public.profiles add column if not exists is_teacher boolean not null default false;

-- IMPORTANT: protect-profiles.sql's trigger stops students granting themselves has_paid/paid_until/
-- is_admin/deleted — it doesn't know about is_teacher yet, so without this update a student could make
-- themselves a teacher directly through the API. This re-defines the same trigger function (safe to run
-- more than once) adding is_teacher to the protected list; everything else is unchanged from that file.
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
    new.deleted := false;
    return new;
  end if;

  new.has_paid := old.has_paid;
  new.paid_until := old.paid_until;
  new.is_admin := old.is_admin;
  new.is_teacher := old.is_teacher;
  new.deleted := old.deleted;
  return new;
end;
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  kind text not null check (kind in ('test', 'writing')),
  title text not null,
  questions jsonb,      -- kind = 'test': the fixed list of questions every student in the class gets
  prompt text,          -- kind = 'writing': the essay/writing prompt
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_results (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  score int,             -- kind = 'test'
  total int,             -- kind = 'test'
  content text,          -- kind = 'writing'
  completed_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_results enable row level security;

-- Classes: a teacher manages their own; any logged-in student can look one up (by join code) to join it.
create policy "Classes: teacher manages own" on public.classes for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "Classes: anyone logged in can look up" on public.classes for select
  using (auth.role() = 'authenticated');

-- Class members: a teacher can see who's in their own classes; a student manages their own membership.
create policy "Class members: teacher views own classes" on public.class_members for select
  using (exists (select 1 from public.classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()));
create policy "Class members: student manages own membership" on public.class_members for all
  using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- Assignments: a teacher manages assignments for their own classes; a student in the class can read them.
create policy "Assignments: teacher manages own classes" on public.assignments for all
  using (exists (select 1 from public.classes c where c.id = assignments.class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = assignments.class_id and c.teacher_id = auth.uid()));
create policy "Assignments: student in the class can read" on public.assignments for select
  using (exists (select 1 from public.class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid()));

-- Assignment results: a student manages their own result; a teacher can read results for their own classes.
create policy "Assignment results: student manages own" on public.assignment_results for all
  using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "Assignment results: teacher reads own classes" on public.assignment_results for select
  using (exists (
    select 1 from public.assignments a join public.classes c on c.id = a.class_id
    where a.id = assignment_results.assignment_id and c.teacher_id = auth.uid()
  ));
