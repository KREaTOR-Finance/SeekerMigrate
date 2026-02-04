-- SMNS Badge Service schema (Supabase/Postgres)
-- Apply in Supabase SQL editor.

create table if not exists public.smns_badge_requests (
  id uuid primary key,
  owner text not null,
  profile_hash text not null,
  profile_json jsonb not null,
  payment_signature text not null,
  cluster text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smns_badge_requests_owner_idx on public.smns_badge_requests(owner);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_smns_badge_requests_updated_at') then
    create trigger set_smns_badge_requests_updated_at
    before update on public.smns_badge_requests
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
