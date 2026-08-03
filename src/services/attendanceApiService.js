import { supabase } from '@/api/supabaseClient';

export const callAttendanceEdgeFunction = async ({ action, payload }) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('No active session');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/attendance-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Edge Function failed');
    }

    return result;
};
