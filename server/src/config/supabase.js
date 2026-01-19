import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️  Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Get a Supabase client authenticated with a user's access token
 * This is used to verify tokens and get user info
 */
export function getSupabaseClient(accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export default supabase;
