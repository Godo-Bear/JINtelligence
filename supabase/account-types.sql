-- Account types: people choose Student, Parent / guardian or Teacher when they sign up. Teacher is only a
-- request: the Teacher page stays locked until an admin verifies it (Admin -> Manage -> "Verify teacher"),
-- which sets is_teacher — a field students can't change themselves. Run once in the Supabase SQL editor.
-- Safe to run more than once.
alter table public.profiles add column if not exists account_type text not null default 'student';
