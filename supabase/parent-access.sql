-- Parent accounts: a student generates a code (Settings → Parent access) that a parent enters on their
-- own account to see that student's progress, read-only. Run once in the Supabase SQL editor.
-- Safe to run more than once. Works from ANY logged-in account — no special "parent" flag is needed.

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_children (
  parent_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

alter table public.parent_links enable row level security;
alter table public.parent_children enable row level security;

-- Parent links: a student manages their own code; any logged-in account can look one up to redeem it.
create policy "Parent links: student manages own" on public.parent_links for all
  using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "Parent links: anyone logged in can look up" on public.parent_links for select
  using (auth.role() = 'authenticated');

-- Parent-child links: a parent manages their own list of linked children; a student can see who's linked to them.
create policy "Parent children: parent manages own" on public.parent_children for all
  using (auth.uid() = parent_id) with check (auth.uid() = parent_id);
create policy "Parent children: student sees who's linked to them" on public.parent_children for select
  using (auth.uid() = student_id);
create policy "Parent children: student can revoke their own links" on public.parent_children for delete
  using (auth.uid() = student_id);
