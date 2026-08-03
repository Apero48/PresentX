import { supabase } from '@/api/supabaseClient';

export const getSupabaseJwt = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.access_token) throw new Error('No active Supabase session');
    return session.access_token;
};
