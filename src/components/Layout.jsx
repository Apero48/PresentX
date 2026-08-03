import React from 'react';
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

export default function Layout({ children, currentPageName }) {
    const { user, loading } = useAuth();

    const isAdmin = normalizeRole(user) === 'admin';

    const adminPages = [
        { name: 'Home', path: 'Dashboard', icon: Home },
        { name: 'Employés', path: 'Employees', icon: Users },
        { name: 'Analytics', path: 'Reports', icon: BarChart3 },
        { name: 'History', path: 'History', icon: History },
        { name: 'Profile', path: 'Profile', icon: UserCircle }
    ];

    const employeePages = [
        { name: 'Home', path: 'Scanner', icon: Home },
        { name: 'Scanner', path: 'Scanner', icon: QrCode },
        { name: 'History', path: 'MyHistory', icon: History },
        { name: 'Profile', path: 'Profile', icon: UserCircle }
    ];

    const pages = isAdmin ? adminPages : employeePages;

    const handleLogout = () => {
        supabaseClient.auth.logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        supabaseClient.auth.redirectToLogin();
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 pb-24">
            {/* Header avec notifications pour admin */}
            {isAdmin && (
                <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                    PX
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900">PresenceX</h1>
                                    <p className="text-xs text-gray-500">Administration</p>
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
                                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50'
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
                                            ? 'text-blue-600'
                                            : 'text-gray-500 group-hover:text-gray-700'
                                        }
                  `}>
                                        {page.name}
                                    </span>
                                    {isActive && (
                                        <div className="absolute -top-1 w-10 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
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
