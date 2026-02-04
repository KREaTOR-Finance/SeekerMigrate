-- Supabase reset helpers for SMNS + Badge Service
-- WARNING: destructive. Review before running.
--
-- Use-case:
-- - Dev reset (wipe all SMNS data but keep tables): use TRUNCATE block.
-- - Full rebuild (drop + recreate): use DROP block, then re-run schema files:
--   1) docs/SMNS_SCHEMA.sql
--   2) docs/BADGE_SCHEMA.sql

-- ==========================================
-- Option A: wipe data only (recommended for dev)
-- ==========================================
-- This keeps the schema intact and just clears rows.

-- begin;
-- truncate table
--   public.smns_badge_requests,
--   public.smns_entitlements,
--   public.smns_primary,
--   public.smns_names,
--   public.smns_nonces
-- restart identity;
-- commit;


-- ==========================================
-- Option B: drop tables (full rebuild)
-- ==========================================
-- Run this, then re-run SMNS_SCHEMA.sql + BADGE_SCHEMA.sql.

-- begin;
--
-- -- Drop badge service first (depends on set_updated_at trigger function)
-- drop table if exists public.smns_badge_requests;
--
-- -- Drop SMNS tables (order matters for FK dependencies)
-- drop table if exists public.smns_entitlements;
-- drop table if exists public.smns_primary;
-- drop table if exists public.smns_names;
-- drop table if exists public.smns_nonces;
--
-- commit;


-- ==========================================
-- Notes
-- ==========================================
-- - `public.set_updated_at()` is created in SMNS_SCHEMA.sql. You can leave it in place.
-- - If you want a truly clean slate, you can also:
--     drop function if exists public.set_updated_at();
--   and then re-run SMNS_SCHEMA.sql.
