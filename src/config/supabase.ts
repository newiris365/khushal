import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Key is missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.');
}

// Admin client to bypass RLS for administrative updates (like auth syncs)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export let isSupabaseOffline = false;

// Simple connectivity check
async function checkConnectivity() {
  if (!supabaseUrl || !supabaseServiceKey) {
    isSupabaseOffline = true;
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: supabaseServiceKey },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok && res.status !== 404 && res.status !== 401) {
      isSupabaseOffline = true;
    }
  } catch (err) {
    isSupabaseOffline = true;
    console.warn(`[SUPABASE CONNECTIVITY] Supabase is offline or unreachable (${supabaseUrl}). Running in simulated offline sandbox mode.`);
  }
}
checkConnectivity();

