import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
// IMPORTANT: Remplacez ces valeurs par vos propres credentials Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const getRoleFromUser = (user, employee) => {
    const email = (user?.email || employee?.email || '').toLowerCase()
    if (email === 'admin@presencex.com' || email.includes('admin')) {
        return 'admin'
    }

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

class SupabaseClient {
    // Auth methods
    auth = {
        me: async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                throw new Error('Not authenticated')
            }

            // Récupérer les infos de l'employé associé
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', user.id)
                .single()

            const role = getRoleFromUser(user, employee)

            return {
                id: user.id,
                email: user.email,
                full_name: employee?.full_name || user.email?.split('@')[0],
                role,
                employee_id: employee?.id,
                department: employee?.department,
                position: employee?.position
            }
        },

        login: async (email, password) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            // Récupérer l'employé associé
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', data.user.id)
                .single()

            const role = getRoleFromUser(data.user, employee)

            return {
                id: data.user.id,
                email: data.user.email,
                full_name: employee?.full_name || data.user.email?.split('@')[0],
                role,
                employee_id: employee?.id,
                department: employee?.department,
                position: employee?.position
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
            return data.user
        },

        logout: async () => {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            window.location.href = '/login'
        },

        redirectToLogin: () => {
            window.location.href = '/login'
        }
    }

    // Entity methods - Employees
    entities = {
        Employee: {
            list: async (orderBy = 'created_at', limit = 1000) => {
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                const { data, error } = await supabase
                    .from('employees')
                    .select('*')
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return data || []
            },

            filter: async (filters, orderBy = 'created_at', limit = 1000) => {
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
                return data || []
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
                const { error } = await supabase
                    .from('employees')
                    .delete()
                    .eq('id', id)

                if (error) throw error
                return { success: true }
            }
        },

        Attendance: {
            list: async (orderBy = 'created_date', limit = 1000) => {
                const order = orderBy.startsWith('-')
                    ? { column: orderBy.slice(1), ascending: false }
                    : { column: orderBy, ascending: true }

                const { data, error } = await supabase
                    .from('attendances')
                    .select('*')
                    .order(order.column, { ascending: order.ascending })
                    .limit(limit)

                if (error) throw error
                return data || []
            },

            filter: async (filters, orderBy = 'created_date', limit = 1000) => {
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
                return data || []
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
