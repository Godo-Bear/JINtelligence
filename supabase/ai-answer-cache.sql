-- Saved AI answers: when a student asks a general question the AI has already answered for the same year level and language,
-- the saved answer is used instead of calling the AI again (saves the free daily AI allowance). Run once; safe to run again.
create table if not exists public.ai_answer_cache (
  key text primary key,
  answer text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_answer_cache enable row level security;
drop policy if exists "AI cache: read" on public.ai_answer_cache;
drop policy if exists "AI cache: add" on public.ai_answer_cache;
drop policy if exists "AI cache: admin delete" on public.ai_answer_cache;
create policy "AI cache: read" on public.ai_answer_cache for select to authenticated using (true);
create policy "AI cache: add" on public.ai_answer_cache for insert to authenticated with check (length(key) < 400 and length(answer) < 6000);
create policy "AI cache: admin delete" on public.ai_answer_cache for delete to authenticated using (public.is_admin(auth.uid()));
-- To throw away every saved answer (e.g. if one was wrong), run:  delete from public.ai_answer_cache;
