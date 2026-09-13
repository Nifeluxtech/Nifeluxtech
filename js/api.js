/**
 * NIFELUX TECHNOLOGIES - API CLIENT
 * Centralized API communication layer
 * Handles all HTTP requests to serverless endpoints
 */

const NifeluxAPI = (() => {
    'use strict';

    const BASE_URL = '/api';
    
    // Configuration check
    const SUPABASE_URL = typeof window !== 'undefined' 
        ? (window.SUPABASE_URL || document.querySelector('meta[name="supabase-url"]')?.content)
        : null;

    /**
     * Check if backend is configured
     */
    function isConfigured() {
        return !!SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL';
    }

    /**
     * Get auth token from storage
     */
    function getAuthToken() {
        try {
            const session = NifeluxUtils.storage.get('nifelux_session');
            return session?.access_token || null;
        } catch {
            return null;
        }
    }

    /**
     * Build request headers
     */
    function buildHeaders(options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async function handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let data;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const error = new Error(data.message || data.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;

            // Handle specific error codes
            switch (response.status) {
                case 401:
                    error.type = 'unauthorized';
                    error.message = 'Authentication required. Please log in.';
                    break;
                case 403:
                    error.type = 'forbidden';
                    error.message = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    error.type = 'not_found';
                    error.message = 'The requested resource was not found.';
                    break;
                case 429:
                    error.type = 'rate_limited';
                    error.message = 'Too many requests. Please try again later.';
                    break;
                case 500:
                    error.type = 'server_error';
                    error.message = 'An internal server error occurred.';
                    break;
                default:
                    error.type = 'error';
            }

            throw error;
        }

        return data;
    }

    /**
     * Make API request with full error handling
     */
    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: buildHeaders(options),
            ...options
        };

        // Add body for non-GET requests
        if (options.body && config.method !== 'GET') {
            config.body = JSON.stringify(options.body);
        }

        try {
            // Check if offline
            if (!navigator.onLine) {
                throw { type: 'network', message: 'You appear to be offline. Please check your connection.' };
            }

            const response = await fetch(url, config);
            return await handleResponse(response);

        } catch (error) {
            if (error.type === 'network') {
                throw error;
            }
            
            // Network errors from fetch
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw { type: 'network', message: 'Unable to connect to the server. Please try again.' };
            }

            throw error;
        }
    }

    /**
     * HTTP method shortcuts
     */
    const get = (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' });
    const post = (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body });
    const put = (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body });
    const patch = (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body });
    const del = (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' });

    /**
     * API endpoint methods
     */
    const endpoints = {
        // Authentication
        auth: {
            login: (email, password) => post('/auth/login', { email, password }),
            logout: () => post('/auth/logout'),
            getSession: () => get('/auth/session'),
            refresh: () => post('/auth/refresh')
        },

        // Staff management
        staff: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/staff/list${query ? '?' + query : ''}`);
            },
            get: (id) => get(`/staff/get?id=${id}`),
            create: (data) => post('/staff/create', data),
            update: (id, data) => put('/staff/update', { id, ...data }),
            delete: (id) => del(`/staff/delete?id=${id}`)
        },

        // ID cards
        id: {
            create: (staffId) => post('/id/create', { staff_id: staffId }),
            verify: (employeeId) => get(`/id/verify?id=${encodeURIComponent(employeeId)}`),
            regenerate: (staffId) => post('/id/regenerate', { staff_id: staffId }),
            deactivate: (staffId) => post('/id/deactivate', { staff_id: staffId })
        },

        // Projects
        projects: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/projects/list${query ? '?' + query : ''}`);
            },
            get: (id) => get(`/projects/get?id=${id}`),
            create: (data) => post('/projects/create', data),
            update: (id, data) => put('/projects/update', { id, ...data }),
            delete: (id) => del(`/projects/delete?id=${id}`)
        },

        // News
        news: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/news/list${query ? '?' + query : ''}`);
            },
            get: (id) => get(`/news/get?id=${id}`),
            create: (data) => post('/news/create', data),
            update: (id, data) => put('/news/update', { id, ...data }),
            delete: (id) => del(`/news/delete?id=${id}`),
            publish: (id) => post('/news/publish', { id }),
            unpublish: (id) => post('/news/unpublish', { id })
        },

        // Contact messages
        contact: {
            submit: (data) => post('/contact/submit', data),
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/contact/list${query ? '?' + query : ''}`);
            },
            update: (id, data) => put('/contact/update', { id, ...data }),
            delete: (id) => del(`/contact/delete?id=${id}`)
        },

        // Site settings
        settings: {
            get: () => get('/settings/get'),
            getPublic: () => get('/settings/public'),
            update: (data) => put('/settings/update', data)
        },

        // Activity logs
        logs: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/logs/list${query ? '?' + query : ''}`);
            }
        },

        // Dashboard stats
        dashboard: {
            stats: () => get('/dashboard/stats'),
            recentActivity: () => get('/dashboard/recent-activity')
        }
    };

    return {
        isConfigured,
        request,
        get,
        post,
        put,
        patch,
        delete: del,
        ...endpoints
    };
})();

// Make globally available
window.NifeluxAPI = NifeluxAPI;
