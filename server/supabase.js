// ============================================================
// Supabase Client — Server Side
// Uses service_role key for admin operations
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  if (process.env.DEMO_MODE !== 'true') {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set DEMO_MODE=true for mock data.');
  }
}

// Service-role client (bypass RLS — for admin/server operations only)
const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Anon client (respects RLS — for user-scoped operations)
const supabaseAnon = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Creates a user-scoped client from their JWT token
function getSupabaseClient(token) {
  const client = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
  return client;
}

module.exports = { supabaseAdmin, supabaseAnon, getSupabaseClient };
