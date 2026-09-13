/**
 * NIFELUX TECHNOLOGIES - AUTHENTICATION SYSTEM
 * Handles user authentication, session management, and route protection
 */

const NifeluxAuth = (() => {
    'use strict';

    const SESSION_KEY = 'nifelux_session';
    const USER_KEY = 'nifelux_user';

    /**
     * Store session data
     */
    function saveSession(sessionData) {
        NifeluxUtils.storage.set(SESSION_KEY, {
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
            expires_at: sessionData.expires_at,
            user: sessionData.user
        });
    }

    /**
     * Get current session
     */
    function getSession() {
        return NifeluxUtils.storage.get(SESSION_KEY);
    }

    /**
     * Get current user
     */
    function getUser() {
        const session = getSession();
        return session?.user || null;
    }

    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        const session = getSession();
        if (!session || !session.access_token) return false;

        // Check if session has expired
        if (session.expires_at && Date.now() > session.expires_at * 1000) {
            clearSession();
            return false;
        }

        return true;
    }

    /**
     * Check if user has admin role
     */
    function isAdmin() {
        const user = getUser();
        return user?.role === 'admin';
    }

    /**
     * Clear session data
     */
    function clearSession() {
        NifeluxUtils.storage.remove(SESSION_KEY);
        NifeluxUtils.storage.remove(USER_KEY);
    }

    /**
     * Login with email and password
     */
    async function login(email, password) {
        try {
            const response = await NifeluxAPI.auth.login(email, password);
            
            if (response.success && response.session) {
                saveSession(response.session);
                return { success: true, user: response.session.user };
            }

            return { success: false, error: response.message || 'Login failed' };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message || 'An error occurred during login'
            };
        }
    }

    /**
     * Logout current user
     */
    async function logout() {
        try {
            await NifeluxAPI.auth.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            clearSession();
        }
    }

    /**
     * Require authentication - redirect if not logged in
     */
    function requireAuth(redirectTo = '/admin/login.html') {
        if (!isAuthenticated()) {
            // Store intended destination
            const currentPath = window.location.pathname;
            if (currentPath !== redirectTo) {
                NifeluxUtils.session.set('intended_route', currentPath);
            }
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    /**
     * Require admin role - redirect if not admin
     */
    function requireAdmin(redirectTo = '/admin/login.html') {
        if (!requireAuth(redirectTo)) return false;

        if (!isAdmin()) {
            showWarning('You do not have permission to access this page.');
            window.location.href = '/';
            return false;
        }
        return true;
    }

    /**
     * Redirect to intended route after login
     */
    function redirectToIntended(defaultRoute = '/admin/dashboard.html') {
        const intended = NifeluxUtils.session.get('intended_route');
        NifeluxUtils.session.remove('intended_route');
        window.location.href = intended || defaultRoute;
    }

    /**
     * Get user display name
     */
    function getDisplayName() {
        const user = getUser();
        if (!user) return 'Guest';
        return user.full_name || user.email || 'User';
    }

    /**
     * Get user initials for avatar
     */
    function getInitials() {
        const name = getDisplayName();
        if (name === 'Guest' || name === 'User') return '?';
        
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    /**
     * Update user profile
     */
    async function updateProfile(data) {
        try {
            const response = await NifeluxAPI.put('/auth/profile', data);
            if (response.success) {
                const session = getSession();
                if (session) {
                    session.user = { ...session.user, ...data };
                    saveSession(session);
                }
                return { success: true };
            }
            return { success: false, error: response.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return {
        login,
        logout,
        getSession,
        getUser,
        isAuthenticated,
        isAdmin,
        requireAuth,
        requireAdmin,
        redirectToIntended,
        getDisplayName,
        getInitials,
        updateProfile,
        clearSession
    };
})();

// Make globally available
window.NifeluxAuth = NifeluxAuth;
