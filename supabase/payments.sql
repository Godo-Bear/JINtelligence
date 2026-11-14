-- Online payments (Stripe). Logs each completed checkout so the stripe-webhook edge function can't
-- double-extend someone's access if Stripe retries a webhook delivery. Only the edge function (using
-- the service role key, which bypasses RLS) ever writes to this table. Run once in the Supabase SQL
-- editor. Safe to run more than once.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  amount_cents int,
  currency text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Payments: own read" on public.payments for select using (auth.uid() = user_id);
