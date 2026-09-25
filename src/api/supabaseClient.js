import { createClient } from '@supabase/supabase-js'

import { getCachedOfflineSession, getCachedOfflineEmployee, cacheOfflineSession, clearOfflineSession } from '@/services/offlineAttendanceStore';
import { isOfflinePinConfigured, lockOfflineSession } from '@/services/offlinePinService';

// Configuration Supabase
// IMPORTANT: Remplacez ces valeurs par vos propres credentials Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const getRoleFromUser = (user, employee) => {
    const email = (user?.email || employee?.email || '').toLowerCase()
    const explicitRole = (
        employee?.role ||
        user?.role ||
        user?.user_role ||
        user?.user_metadata?.role ||
        user?.app_metadata?.role
    )?.toString().toLowerCase()

    if (explicitRole === 'admin' || explicitRole === 'super_admin') {
        return 'admin'
    }

    if (user?.is_admin === true || user?.isAdmin === true) {
        return 'admin'
    }

    return 'employee'
}

const filterAdminEmployees = (employees = []) =>
    (employees || []).filter((employee) => {
        const role = String(
            employee?.role ||
            employee?.user_role ||
            employee?.user_metadata?.role ||
            employee?.app_metadata?.role ||
            ''
        ).toLowerCase();

        const email = String(employee?.email || '').toLowerCase();

        if (employee?.is_admin === true || employee?.isAdmin === true) {
            return false;
        }

        return role !== 'admin' && role !== 'super_admin' && email !== 'admin@presencex.com';
    });

const normalizeAttendanceRecords = (attendances = []) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const automaticCloseAllowed = nowMinutes >= 21 * 60 + 30;

    return (attendances || []).map((attendance) => {
        if (attendance.check_out || (attendance.date === today && !automaticCloseAllowed)) return attendance;

        const [checkInHour, checkInMinute] = String(attendance.check_in || '').split(':').map(Number);
        const checkInMinutes = checkInHour * 60 + checkInMinute;
        const [lunchStartHour, lunchStartMinute] = String(attendance.lunch_start || '').split(':').map(Number);
        const [lunchEndHour, lunchEndMinute] = String(attendance.lunch_end || '').split(':').map(Number);
        const lunchMinutes = Number.isFinite(lunchStartHour) && Number.isFinite(lunchEndHour)
            ? (lunchEndHour * 60 + lunchEndMinute) - (lunchStartHour * 60 + lunchStartMinute)
            : 0;
        const hoursWorked = Number.isFinite(checkInMinutes)
            ? Math.max(0, (19 * 60 - checkInMinutes - lunchMinutes) / 60)
            : null;

        return {
            ...attendance,
            check_out: '19:00',
            hours_worked: Number.isFinite(Number(attendance.hours_worked)) ? attendance.hours_worked : hoursWorked,
            automatic_departure: true,
        };
    });
};

class SupabaseClient {
    // Auth methods
    auth = {
        me: async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                const cached = !navigator.onLine ? getCachedOfflineSession() : null
                if (cached) return cached
                throw new Error('Not authenticated')
            }

            // Récupérer les infos de l'employé associé, puis utiliser le cache hors connexion.
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle()

            const normalizedEmployee = employee && !filterAdminEmployees([employee]).length ? null : employee;
            const cachedEmployee = normalizedEmployee || getCachedOfflineEmployee()
            const role = getRoleFromUser(user, cachedEmployee)
            const sessionUser = {
                id: user.id,
                email: user.email,
                full_name: cachedEmployee?.full_name || user.email?.split('@')[0],
                role,
                employee_id: role === 'admin' ? null : cachedEmployee?.id,
                department: cachedEmployee?.department,
                position: cachedEmployee?.position
            }
            if (cachedEmployee) cacheOfflineSession(sessionUser, cachedEmployee)
            return sessionUser
        },

        login: async (email, password) => {
            const normalizedEmail = email.trim().toLowerCase()
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password
            })

            if (error) throw error

            // Récupérer l'employé associé
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', data.user.id)
                .maybeSingle()

            const normalizedEmployee = employee && !filterAdminEmployees([employee]).length ? null : employee;

            const role = getRoleFromUser(data.user, normalizedEmployee)

            return {
                id: data.user.id,
                email: data.user.email,
                full_name: normalizedEmployee?.full_name || data.user.email?.split('@')[0],
                role,
                employee_id: role === 'admin' ? null : normalizedEmployee?.id,
                department: normalizedEmployee?.department,
                position: normalizedEmployee?.position
            }
        },

        signup: async (email, password, userData) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            })

            if (error) throw error
            return data
        },

        createEmployeeAccount: async (employeeData) => {
            const { data, error } = await supabase.functions.invoke('create-employee', {
                body: employeeData
            })

            if (error) throw error
            if (!data?.success) throw new Error(data?.error || 'Création du compte impossible')
            return data.employee
        },

        deleteEmployeeAccount: async (employee_id) => {
            const { data, error } = await supabase.functions.invoke('remove-employee', {
                body: { employee_id }
            })

            if (error) throw error
            if (!data?.success) throw new Error(data?.error || 'Suppression du compte impossible')
            return data
        },

        logout: async () => {
            try {
                const { error } = await supabase.auth.signOut()
                if (error) throw error
            } finally {
                if (isOfflinePinConfigured()) {
                    lockOfflineSession();
                } else {
                    clearOfflineSession();
                }
                window.location.href = '/login'
            }
        },

        redirectToLogin: () => {
            window.location.href = '/login'
        }
    }

    // Entity methods - Employees
    entities = {
        Employee: {
            list: async (orderBy = 'full_name', limit = 1000) => {
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                const { data, error } = await supabase
                    .from('employees')
                    .select('*')
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return filterAdminEmployees(data || [])
            },

            filter: async (filters, orderBy = 'full_name', limit = 1000) => {
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                let query = supabase.from('employees').select('*')

                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value)
                })

                const { data, error } = await query
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return filterAdminEmployees(data || [])
            },

            create: async (employeeData) => {
                const { data, error } = await supabase
                    .from('employees')
                    .insert([employeeData])
                    .select()
                    .single()

                if (error) throw error
                return data
            },

            update: async (id, employeeData) => {
                const { data, error } = await supabase
                    .from('employees')
                    .update(employeeData)
                    .eq('id', id)
                    .select()
                    .single()

                if (error) throw error
                return data
            },

            delete: async (id) => {
                const { data, error } = await supabase.functions.invoke('remove-employee', {
                    body: { employee_id: id }
                })

                if (error) throw error
                if (!data?.success) throw new Error(data?.error || data?.warning || 'Suppression impossible')
                return data
            }
        },

        Attendance: {
            closeOpenAttendancesAutomatically: async () => {
                const now = new Date();
                if (now.getHours() * 60 + now.getMinutes() < 21 * 60 + 30) return;
                try {
                    await supabase.functions.invoke('auto-close-attendance', {
                        body: { source: 'history-load' }
                    });
                } catch {
                    // The UI fallback still displays 19:00 when the function is unavailable.
                }
            },

            list: async (orderBy = '-date', limit = 1000) => {
                await this.entities.Attendance.closeOpenAttendancesAutomatically()
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                const { data, error } = await supabase
                    .from('attendances')
                    .select('*')
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return normalizeAttendanceRecords(data || [])
            },

            filter: async (filters, orderBy = '-date', limit = 1000) => {
                await this.entities.Attendance.closeOpenAttendancesAutomatically()
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                let query = supabase.from('attendances').select('*')

                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value)
                })

                const { data, error } = await query
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return normalizeAttendanceRecords(data || [])
            },

            create: async (attendanceData) => {
                const { data, error } = await supabase
                    .from('attendances')
                    .insert([attendanceData])
                    .select()
                    .single()

                if (error) throw error
                return data
            },

            update: async (id, attendanceData) => {
                const { data, error } = await supabase
                    .from('attendances')
                    .update(attendanceData)
                    .eq('id', id)
                    .select()
                    .single()

                if (error) throw error
                return data
            },

            delete: async (id) => {
                const { error } = await supabase
                    .from('attendances')
                    .delete()
                    .eq('id', id)

                if (error) throw error
                return { success: true }
            }
        }
    }

    // Agent methods for AI reports (simulation for now)
    agents = {
        createConversation: async ({ agent_name, metadata }) => {
            // Pour l'instant, simulation locale
            // TODO: Intégrer OpenAI ou créer une Edge Function Supabase
            return {
                id: Date.now().toString(),
                agent_name,
                metadata,
                messages: []
            }
        },

        addMessage: async (conversation, message) => {
            // Simulation de réponse IA
            return {
                role: 'assistant',
                content: `Je suis un assistant IA (mode démo). Pour activer l'IA complète, intégrez OpenAI API ou utilisez Supabase Edge Functions.\n\nVotre question: "${message.content}"\n\nPour analyser vos données de présence en temps réel, configurez l'intégration IA dans le fichier supabaseClient.js.`
            }
        },

        subscribeToConversation: (conversationId, callback) => {
            // Simulation - pas de vraie subscription pour l'instant
            return () => { }
        }
    }

    // Real-time subscriptions
    subscribeToTable = (table, callback) => {
        const channel = supabase
            .channel(`${table}-changes`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: table },
                callback
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }
}

export const supabaseClient = new SupabaseClient()

// Export for backward compatibility
export { supabaseClient as default }
