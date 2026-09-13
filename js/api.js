/**
 * NIFELUX TECHNOLOGIES - API CLIENT
 * Centralized API communication layer
 */

const NifeluxAPI = (() => {
    'use strict';

    const BASE_URL = '/api';

    // Configuration state
    let _config = null;
    let _configLoaded = false;
    let _configPromise = null;

    /**
     * Load configuration from server
     */
    async function loadConfig() {
        if (_configLoaded) return _config;
        if (_configPromise) return _configPromise;

        _configPromise = (async () => {
            try {
                const response = await fetch(`${BASE_URL}/config`);
                if (!response.ok) {
                    throw new Error('Config endpoint failed');
                }
                const data = await response.json();
                _config = data;
                _configLoaded = true;
                return _config;
            } catch (error) {
                console.warn('Failed to load config:', error);
                _config = { configured: false };
                _configLoaded = true;
                return _config;
            }
        })();

        return _configPromise;
    }

    /**
     * Check if backend is configured
     */
    function isConfigured() {
        return _config?.configured === true;
    }

    /**
     * Get Supabase URL (for direct queries if needed)
     */
    function getSupabaseUrl() {
        return _config?.supabase_url || null;
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
     * Make API request
     */
    async function request(endpoint, options = {}) {
        // Ensure config is loaded before making requests
        if (!_configLoaded) {
            await loadConfig();
        }

        const url = `${BASE_URL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: buildHeaders(options),
            ...options
        };

        if (options.body && config.method !== 'GET') {
            config.body = JSON.stringify(options.body);
        }

        try {
            if (!navigator.onLine) {
                throw { type: 'network', message: 'You appear to be offline. Please check your connection.' };
            }

            const response = await fetch(url, config);
            return await handleResponse(response);

        } catch (error) {
            if (error.type === 'network') throw error;

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
        auth: {
            login: (email, password) => post('/auth/login', { email, password }),
            logout: () => post('/auth/logout'),
            getSession: () => get('/auth/session'),
            refresh: () => post('/auth/refresh')
        },
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
        id: {
            create: (staffId) => post('/id/create', { staff_id: staffId }),
            verify: (employeeId) => get(`/id/verify?id=${encodeURIComponent(employeeId)}`),
            regenerate: (staffId) => post('/id/regenerate', { staff_id: staffId }),
            deactivate: (staffId) => post('/id/deactivate', { staff_id: staffId })
        },
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
        contact: {
            submit: (data) => post('/contact/submit', data),
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/contact/list${query ? '?' + query : ''}`);
            },
            update: (id, data) => put('/contact/update', { id, ...data }),
            delete: (id) => del(`/contact/delete?id=${id}`)
        },
        settings: {
            get: () => get('/settings/get'),
            getPublic: () => get('/settings/public'),
            update: (data) => put('/settings/update', data)
        },
        logs: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/logs/list${query ? '?' + query : ''}`);
            }
        },
        dashboard: {
            stats: () => get('/dashboard/stats'),
            recentActivity: () => get('/dashboard/recent-activity')
        }
    };

    return {
        loadConfig,
        isConfigured,
        getSupabaseUrl,
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
