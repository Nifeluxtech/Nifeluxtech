/**
 * NIFELUX TECHNOLOGIES - ADMIN DASHBOARD
 *
 * Hardened version:
 * - Logout & mobile menu are wired FIRST (never blocked by data errors)
 * - Logout works even if the modal or API is broken
 * - 401/403 responses force a clean re-login instead of fake data
 * - Self-contained: does not require admin-common.js
 */

const AdminDashboard = (() => {
    'use strict';

    let initialized = false;

    /* ==========================================================
       INIT
       ========================================================== */

    function init() {
        if (initialized) return;
        initialized = true;

        // 1) Wire critical UI FIRST so these always work,
        //    even if everything below fails.
        initLogout();
        initMobileMenu();

        // 2) Auth guard
        if (!NifeluxAuth.requireAuth('/admin/login.html')) return;

        // 3) Topbar user info
        loadUserInfo();

        // 4) Load data
        bootstrap();
    }

    async function bootstrap() {
        try {
            await NifeluxAPI.loadConfig();
        } catch (e) {
            console.warn('Config load failed:', e);
        }

        if (!NifeluxAPI.isConfigured()) {
            showDemoMode();
            loadDemoData();
        } else {
            loadDashboardData();
        }
    }

    /* ==========================================================
       USER INFO
       ========================================================== */

    function loadUserInfo() {
        const nameEl = document.getElementById('user-name');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = NifeluxAuth.getDisplayName();
        if (avatarEl) avatarEl.textContent = NifeluxAuth.getInitials();
    }

    /* ==========================================================
       LOGOUT  (hardened — always works)
       ========================================================== */

    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async () => {
            // Prevent double clicks
            if (logoutBtn.disabled) return;
            logoutBtn.disabled = true;

            // 1) Ask for confirmation — but never let a broken modal block logout
            let confirmed = true;
            try {
                if (typeof confirmModal === 'function') {
                    confirmed = await confirmModal('Are you sure you want to log out?', {
                        title: 'Logout',
                        confirmText: 'Logout',
                        confirmClass: 'btn-danger',
                        type: 'warning'
                    });
                }
            } catch (e) {
                console.warn('Confirmation modal failed, proceeding with logout:', e);
                confirmed = true;
            }

            if (!confirmed) {
                logoutBtn.disabled = false;
                return;
            }

            // 2) Call logout API — failure must NOT block session clearing
            try {
                await NifeluxAuth.logout();
            } catch (e) {
                console.warn('Logout API call failed:', e);
            }

            // 3) Belt & braces: clear session storage directly
            try {
                NifeluxUtils.storage.remove('nifelux_session');
                NifeluxUtils.session.remove('nifelux_session');
                NifeluxUtils.session.remove('intended_route');
            } catch (e) { /* ignore */ }

            // 4) Redirect (replace so Back button can't return to dashboard)
            window.location.replace('/admin/login.html');
        });
    }

    /* ==========================================================
       MOBILE MENU
       ========================================================== */

    function initMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (!menuBtn || !sidebar || !overlay) return;

        const close = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
            menuBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        };

        menuBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('visible', isOpen);
            menuBtn.setAttribute('aria-expanded', String(isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        overlay.addEventListener('click', close);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) close();
        });
    }

    /* ==========================================================
       DATA LOADING
       ========================================================== */

    async function loadDashboardData() {
        try {
            const [stats, activity] = await Promise.all([
                NifeluxAPI.dashboard.stats(),
                NifeluxAPI.dashboard.recentActivity()
            ]);

            if (stats.success && stats.data) {
                updateStat('stat-total-staff', stats.data.total_staff);
                updateStat('stat-active-staff', stats.data.active_staff);
                updateStat('stat-inactive-staff', stats.data.inactive_staff);
                updateStat('stat-total-projects', stats.data.total_projects);
                updateStat('stat-published-news', stats.data.published_news);
                updateStat('stat-unread-messages', stats.data.unread_messages);

                const badge = document.getElementById('message-badge');
                if (badge) badge.textContent = stats.data.unread_messages || 0;
            }

            if (activity.success) {
                renderActivity(activity.data);
            }

        } catch (error) {
            console.error('Dashboard load error:', error);

            // Auth problems → force clean re-login, do NOT fake data
            if (error.status === 401 || error.status === 403) {
                showError('Your session is invalid or lacks permission. Please log in again.');
                setTimeout(() => {
                    try {
                        NifeluxUtils.storage.remove('nifelux_session');
                    } catch (e) { /* ignore */ }
                    window.location.replace('/admin/login.html');
                }, 2000);
                return;
            }

            // Server/network problems → inform, then fall back to demo
            showError(`Failed to load dashboard data (HTTP ${error.status || 'network error'}). Showing sample data.`);
            loadDemoData();
        }
    }

    function loadDemoData() {
        setTimeout(() => {
            updateStat('stat-total-staff', 12);
            updateStat('stat-active-staff', 10);
            updateStat('stat-inactive-staff', 2);
            updateStat('stat-total-projects', 8);
            updateStat('stat-published-news', 5);
            updateStat('stat-unread-messages', 3);

            const badge = document.getElementById('message-badge');
            if (badge) badge.textContent = '3';

            renderActivity([
                { icon: '🆔', title: 'ID card created', detail: 'NFX-EMP-0007', time: '2 hours ago' },
                { icon: '🚀', title: 'Project published', detail: 'NIRA AI', time: '5 hours ago' },
                { icon: '📰', title: 'News article published', detail: 'Nifelux expands AI research', time: '1 day ago' },
                { icon: '👤', title: 'Staff updated', detail: 'Employee record updated', time: '2 days ago' },
                { icon: '⚙️', title: 'Settings changed', detail: 'Company information updated', time: '3 days ago' }
            ]);
        }, 600);
    }

    function showDemoMode() {
        const notice = document.getElementById('demo-notice');
        if (notice) notice.style.display = 'flex';
    }

    /* ==========================================================
       RENDERING
       ========================================================== */

    function updateStat(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = (value === undefined || value === null) ? '0' : value;
        el.classList.add('loaded');
    }

    function iconFor(action) {
        if (!action) return '📋';
        if (action.includes('id_card')) return '🆔';
        if (action.includes('project')) return '🚀';
        if (action.includes('news')) return '📰';
        if (action.includes('staff')) return '👤';
        if (action.includes('settings')) return '⚙️';
        if (action.includes('login')) return '🔐';
        if (action.includes('message') || action.includes('contact')) return '✉️';
        return '📋';
    }

    function formatAction(action) {
        return String(action)
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    function renderActivity(items) {
        const container = document.getElementById('activity-list');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="activity-empty"><p>No recent activity yet.</p></div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const icon = item.icon || iconFor(item.action);
            const title = item.title || formatAction(item.action || 'activity');
            const detail = item.detail || item.description || '';
            const time = item.time || NifeluxUtils.formatRelativeTime(item.created_at);

            return `
                <div class="activity-item">
                    <div class="activity-icon" aria-hidden="true">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${NifeluxUtils.sanitizeHTML(title)}</div>
                        <div class="activity-detail">${NifeluxUtils.sanitizeHTML(detail)}</div>
                    </div>
                    <div class="activity-time">${NifeluxUtils.sanitizeHTML(time)}</div>
                </div>
            `;
        }).join('');
    }

    /* ==========================================================
       PUBLIC API
       ========================================================== */

    return {
        init,
        refresh: loadDashboardData,
        renderActivity
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AdminDashboard.init);
} else {
    AdminDashboard.init();
}

window.AdminDashboard = AdminDashboard;
