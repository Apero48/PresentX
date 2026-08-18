import { supabaseClient } from '@/api/supabaseClient';
import { logError } from '@/lib/logger';

export const normalizeRole = (record = {}) => {
    const email = (record?.email || '').toLowerCase();
    if (email === 'admin@presencex.com') {
        return 'admin';
    }

    const explicitRole = (
        record?.role ||
        record?.user_role ||
        record?.user_metadata?.role ||
        record?.app_metadata?.role
    )?.toString().toLowerCase();

    if (explicitRole === 'admin' || explicitRole === 'super_admin') {
        return 'admin';
    }

    if (record?.is_admin === true || record?.isAdmin === true) {
        return 'admin';
    }

    return 'employee';
};

export const getCurrentUserSession = async () => {
    try {
        const currentUser = await supabaseClient.auth.me();
        return currentUser;
    } catch (error) {
        logError(error, 'auth.getCurrentUserSession');
        return null;
    }
};

export const signIn = async (email, password) => {
    try {
        return await supabaseClient.auth.login(email, password);
    } catch (error) {
        logError(error, 'auth.signIn');
        throw error;
    }
};

export const signUp = async (email, password, userData) => {
    try {
        return await supabaseClient.auth.signup(email, password, userData);
    } catch (error) {
        logError(error, 'auth.signUp');
        throw error;
    }
};

export const signOut = async () => {
    try {
        await supabaseClient.auth.logout();
    } catch (error) {
        logError(error, 'auth.signOut');
        throw error;
    }
};
