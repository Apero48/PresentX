// Base44 API Client
const API_BASE = 'https://app.base44.com/api/apps/6920cf5a7a629a1e6c9f5a55';
const API_KEY = '239540eded664181a1a5ba5225de235b';

class Base44Client {
    constructor() {
        this.apiKey = API_KEY;
        this.baseUrl = API_BASE;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'api_key': this.apiKey,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Auth methods
    auth = {
        me: async () => {
            // For demo purposes, return a mock user
            // In production, this would be a real API call
            const mockUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (!mockUser) {
                throw new Error('Not authenticated');
            }
            return mockUser;
        },

        login: async (email, password) => {
            // Mock login - in production this would be a real API call
            const mockUser = {
                id: '1',
                email: email,
                full_name: email.includes('admin') ? 'Admin User' : 'Employee User',
                role: email.includes('admin') ? 'admin' : 'employee',
            };
            localStorage.setItem('currentUser', JSON.stringify(mockUser));
            return mockUser;
        },

        logout: () => {
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
        },

        redirectToLogin: () => {
            window.location.href = '/login';
        }
    };

    // Entity methods
    entities = {
        Employee: {
            list: async (orderBy = '-created_date', limit = 1000) => {
                return await base44.request('/entities/Employee');
            },

            filter: async (filters, orderBy = '-created_date', limit = 1000) => {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    params.append(key, value);
                });
                return await base44.request(`/entities/Employee?${params}`);
            },

            create: async (data) => {
                return await base44.request('/entities/Employee', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            },

            update: async (id, data) => {
                return await base44.request(`/entities/Employee/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            },

            delete: async (id) => {
                return await base44.request(`/entities/Employee/${id}`, {
                    method: 'DELETE',
                });
            },
        },

        Attendance: {
            list: async (orderBy = '-created_date', limit = 1000) => {
                return await base44.request('/entities/Attendance');
            },

            filter: async (filters, orderBy = '-created_date', limit = 1000) => {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    params.append(key, value);
                });
                return await base44.request(`/entities/Attendance?${params}`);
            },

            create: async (data) => {
                return await base44.request('/entities/Attendance', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            },

            update: async (id, data) => {
                return await base44.request(`/entities/Attendance/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            },

            delete: async (id) => {
                return await base44.request(`/entities/Attendance/${id}`, {
                    method: 'DELETE',
                });
            },
        },
    };

    // Agent methods for AI reports
    agents = {
        createConversation: async ({ agent_name, metadata }) => {
            // Mock conversation for demo
            return {
                id: Date.now().toString(),
                agent_name,
                metadata,
                messages: [],
            };
        },

        addMessage: async (conversation, message) => {
            // Mock AI response
            return {
                role: 'assistant',
                content: 'Ceci est une réponse de démonstration. L\'IA analyse vos données de présence...',
            };
        },

        subscribeToConversation: (conversationId, callback) => {
            // Mock subscription - returns unsubscribe function
            return () => { };
        },
    };
}

export const base44 = new Base44Client();
