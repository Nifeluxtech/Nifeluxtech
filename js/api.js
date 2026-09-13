const endpoints = {
        auth: {
            login: (email, password) => post('/auth?action=login', { email, password }),
            logout: () => post('/auth?action=logout')
        },
        staff: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/staff${query ? '?' + query : ''}`);
            },
            get: (id) => get(`/staff?id=${id}`),
            create: (data) => post('/staff', data),
            update: (id, data) => put('/staff', { id, ...data }),
            delete: (id) => del(`/staff?id=${id}`)
        },
        id: {
            create: (staffId) => post('/id?action=create', { staff_id: staffId }),
            verify: (employeeId) => get(`/id?action=verify&id=${encodeURIComponent(employeeId)}`),
            deactivate: (staffId) => post('/id?action=deactivate', { staff_id: staffId })
        },
        projects: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/projects${query ? '?' + query : ''}`);
            },
            create: (data) => post('/projects', data),
            update: (id, data) => put('/projects', { id, ...data }),
            delete: (id) => del(`/projects?id=${id}`)
        },
        news: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/news${query ? '?' + query : ''}`);
            },
            create: (data) => post('/news', data),
            update: (id, data) => put('/news', { id, ...data }),
            delete: (id) => del(`/news?id=${id}`),
            publish: (id) => put('/news', { id, status: 'published' }),
            unpublish: (id) => put('/news', { id, status: 'draft' })
        },
        contact: {
            submit: (data) => post('/contact?action=submit', data),
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/contact${query ? '?' + query : ''}`);
            },
            update: (id, data) => put('/contact', { id, ...data }),
            delete: (id) => del(`/contact?id=${id}`)
        },
        settings: {
            get: () => get('/settings'),
            update: (data) => put('/settings', data)
        },
        logs: {
            list: (params = {}) => {
                const query = new URLSearchParams(params).toString();
                return get(`/logs${query ? '?' + query : ''}`);
            }
        },
        dashboard: {
            stats: () => get('/dashboard?action=stats'),
            recentActivity: () => get('/dashboard?action=recent-activity')
        }
    };
