import { useEffect, useState } from 'react';
import { getCurrentUserSession } from '@/services/authService';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const loadUser = async () => {
            try {
                const currentUser = await getCurrentUserSession();
                if (active) {
                    setUser(currentUser);
                }
            } catch (error) {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadUser();

        return () => {
            active = false;
        };
    }, []);

    return { user, loading };
};
