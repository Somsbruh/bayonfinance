import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.debug('Initializing Supabase Client:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyPrefix: supabaseAnonKey.slice(0, 15),
    url: supabaseUrl.slice(0, 30) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing! Check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
