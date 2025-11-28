import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(env: Bindings): SupabaseClient {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

export async function checkSupabaseConnection(env: Bindings): Promise<boolean> {
  try {
    const client = getSupabaseClient(env);
    const { error } = await client.from('climate_profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
