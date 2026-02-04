import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
// Use service role key for server-side writes.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
