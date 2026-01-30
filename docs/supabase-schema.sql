-- SeekerMigrate content tables (Supabase)
-- Enable required extension for gen_random_uuid if needed
-- create extension if not exists pgcrypto;

-- 1) Featured dApps
create table if not exists public.featured_dapps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tagline text,
  category text,
  status text[] not null default '{}',
  url text,
  image_url text,
  rank int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Ads
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  placement text not null, -- hero | profile | featured | checkout
  title text,
  image_url text,
  target_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Social links
create table if not exists public.social_links (
  id text primary key, -- e.g. website, x, discord
  label text not null,
  url text not null,
  sort int not null default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Helper: updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_featured_dapps_updated on public.featured_dapps;
create trigger trg_featured_dapps_updated
before update on public.featured_dapps
for each row execute function public.set_updated_at();

drop trigger if exists trg_ads_updated on public.ads;
create trigger trg_ads_updated
before update on public.ads
for each row execute function public.set_updated_at();

-- RLS
alter table public.featured_dapps enable row level security;
alter table public.ads enable row level security;
alter table public.social_links enable row level security;

-- Policies: public read, admin writes (you can tighten later)
-- Allow anonymous SELECT on active rows
drop policy if exists "featured_dapps_read" on public.featured_dapps;
create policy "featured_dapps_read" on public.featured_dapps
for select using (active = true);

drop policy if exists "ads_read" on public.ads;
create policy "ads_read" on public.ads
for select using (active = true);

drop policy if exists "social_links_read" on public.social_links;
create policy "social_links_read" on public.social_links
for select using (active = true);

-- NOTE: Writes should be handled via service role on server/admin UI.
-- If you plan to edit in Supabase Studio only, no write policy is needed.
