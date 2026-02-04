-- SMNS schema (Supabase/Postgres)
-- Apply in Supabase SQL editor.

create table if not exists public.smns_names (
  canonical_name text primary key,
  display_name text not null,
  mirror_name text not null,
  label text not null,
  tld text not null,
  owner text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smns_names_owner_idx on public.smns_names(owner);

create table if not exists public.smns_primary (
  owner text primary key,
  canonical_name text not null references public.smns_names(canonical_name) on delete cascade,
  display_name text not null,
  mirror_name text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.smns_nonces (
  nonce uuid primary key,
  owner text not null,
  action text not null,
  name text not null,
  subdomain text null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists smns_nonces_owner_idx on public.smns_nonces(owner);

create table if not exists public.smns_entitlements (
  id bigserial primary key,
  owner text not null,
  product text not null,
  payment_signature text not null,
  usd numeric not null,
  matched_lamports bigint not null,
  cluster text not null,
  created_at timestamptz not null default now()
);

create index if not exists smns_entitlements_owner_idx on public.smns_entitlements(owner);

-- Auto-update updated_at on smns_names
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_smns_names_updated_at') then
    create trigger set_smns_names_updated_at
    before update on public.smns_names
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
