import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabaseClient } from '@/api/supabaseClient';
import {
    Home,
    Users,
    QrCode,
    BarChart3,
    History,
    UserCircle,
    LogOut
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRole } from '@/services/authService';
import { getOfflinePinStatus, verifyOfflinePin, unlockOfflineSession } from '@/services/offlinePinService';

export default function Layout({ children, currentPageName }) {
    const { user, loading } = useAuth();
    const [offlinePinStatus, setOfflinePinStatus] = useState(() => getOfflinePinStatus());
    const [offlinePin, setOfflinePin] = useState('');
    const [offlinePinError, setOfflinePinError] = useState('');

    const isAdmin = normalizeRole(user) === 'admin';

    useEffect(() => {
        const refreshOfflineLock = () => setOfflinePinStatus(getOfflinePinStatus());
        window.addEventListener('online', refreshOfflineLock);
        window.addEventListener('offline', refreshOfflineLock);
        return () => {
            window.removeEventListener('online', refreshOfflineLock);
            window.removeEventListener('offline', refreshOfflineLock);
        };
    }, []);

    const handleOfflineUnlock = async (event) => {
        event.preventDefault();
        try {
            const valid = await verifyOfflinePin(offlinePin);
            if (!valid) {
                setOfflinePinError('PIN incorrect.');
                setOfflinePin('');
                return;
            }
            unlockOfflineSession();
            setOfflinePinStatus(getOfflinePinStatus());
            setOfflinePinError('');
            setOfflinePin('');
        } catch (error) {
            setOfflinePinError(error?.message || 'Déverrouillage impossible.');
        }
    };

    const adminPages = [
        { name: 'Dashboard', path: 'Dashboard', icon: Home },
        { name: 'Employés', path: 'Employees', icon: Users },
        { name: 'Pointages', path: 'History', icon: BarChart3 },
        { name: 'Paramètres', path: 'Profile', icon: UserCircle }
    ];

    const employeePages = [
        { name: 'Accueil', path: 'Scanner', icon: Home },
        { name: 'Historique', path: 'MyHistory', icon: History },
        { name: 'Profil', path: 'Profile', icon: UserCircle }
    ];

    const pages = isAdmin ? adminPages : employeePages;

    const handleLogout = () => {
        supabaseClient.auth.logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center msa-gradient-soft">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

        if (!user) {
        supabaseClient.auth.redirectToLogin();
        return null;
    }

    const mustUnlockOffline = !navigator.onLine && offlinePinStatus.configured && offlinePinStatus.locked;

    if (mustUnlockOffline) {
        return (
            <div className="min-h-screen flex items-center justify-center msa-gradient-soft p-6">
                <form onSubmit={handleOfflineUnlock} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl space-y-5">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-900">Accès hors connexion</h1>
                        <p className="mt-2 text-sm text-slate-600">Internet est indisponible. Entrez votre PIN local pour ouvrir Scanner.</p>
                    </div>
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoFocus
                        value={offlinePin}
                        onChange={(event) => setOfflinePin(event.target.value.replace(/\\D/g, ''))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center text-2xl tracking-[0.5em]"
                        placeholder="••••"
                    />
                    {offlinePinError && <p className="text-center text-sm text-red-600">{offlinePinError}</p>}
                    <button type="submit" className="w-full rounded-xl bg-[#1458B8] py-4 font-semibold text-white">Déverrouiller</button>
                </form>
            </div>
        );
    }

    return (

        <div className="min-h-screen msa-gradient-soft pb-24">
            {/* Header avec notifications pour admin */}
            {isAdmin && (
                <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <div className="w-28 h-12 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden p-1">
                                    <img
                                        src="/assets/msa-inter-logo.png"
                                        alt="MSA INTER"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-[#1458B8]">MSA INTER</h1>
                                    <p className="text-xs text-slate-500">Gestion de présence</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <NotificationCenter user={user} />
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Bottom Navigation Bar - Style moderne */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-around h-20">
                        {pages.map((page) => {
                            const Icon = page.icon;
                            const isActive = currentPageName === page.path;
                            return (
                                <Link
                                    key={page.path}
                                    to={createPageUrl(page.path)}
                                    className="flex flex-col items-center justify-center gap-1 group relative"
                                >
                                    <div className={`
                    p-3 rounded-2xl transition-all duration-300
                    ${isActive
                                            ? 'msa-gradient shadow-lg shadow-[#1458B8]/30'
                                            : 'bg-transparent group-hover:bg-gray-100'
                                        }
                  `}>
                                        <Icon className={`
                      w-6 h-6 transition-all duration-300
                      ${isActive
                                                ? 'text-white'
                                                : 'text-gray-500 group-hover:text-gray-700'
                                            }
                    `} />
                                    </div>
                                    <span className={`
                    text-xs font-medium transition-all duration-300
                    ${isActive
                                            ? 'text-[#1458B8]'
                                            : 'text-gray-500 group-hover:text-gray-700'
                                        }
                  `}>
                                        {page.name}
                                    </span>
                                    {isActive && (
                                        <div className="absolute -top-1 w-10 h-1 msa-gradient rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </div>
    );
}
