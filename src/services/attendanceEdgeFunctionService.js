import { supabase } from '@/api/supabaseClient';

export const getSupabaseJwt = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session?.access_token) throw new Error('No active Supabase session');

    return session.access_token;
};

export const callAttendanceEdgeFunction = async ({ action, payload }) => {
    const jwt = await getSupabaseJwt();

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/attendance-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Edge Function call failed');
    }

    return result;
};
