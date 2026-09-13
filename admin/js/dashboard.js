/**
 * NIFELUX TECHNOLOGIES - ADMIN DASHBOARD
 * Dashboard functionality, stats loading, and activity feed
 */

const AdminDashboard = (() => {
    'use strict';

    /**
     * Initialize dashboard
     */
    function init() {
        // Check authentication
        if (!NifeluxAuth.requireAuth()) return;

        // Load user info
        loadUserInfo();

        // Check if backend is configured
        if (!NifeluxAPI.isConfigured()) {
            showDemoMode();
            loadDemoData();
        } else {
            loadDashboardData();
        }

        // Initialize mobile menu
        initMobileMenu();

        // Initialize logout
        initLogout();
    }

    /**
     * Load user information into topbar
     */
    function loadUserInfo() {
        const user = NifeluxAuth.getUser();
        if (!user) return;

        const nameEl = document.getElementById('user-name');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) {
            nameEl.textContent = NifeluxAuth.getDisplayName();
        }

        if (avatarEl) {
            avatarEl.textContent = NifeluxAuth.getInitials();
        }
    }

    /**
     * Show demo mode notice
     */
    function showDemoMode() {
        const notice = document.getElementById('demo-notice');
        if (notice) {
            notice.style.display = 'flex';
        }
    }

    /**
     * Load demo data when Supabase is not configured
     */
    function loadDemoData() {
        // Simulate loading delay
        setTimeout(() => {
            // Update stats with demo values
            updateStat('stat-total-staff', '12');
            updateStat('stat-active-staff', '10');
            updateStat('stat-inactive-staff', '2');
            updateStat('stat-total-projects', '8');
            updateStat('stat-published-news', '5');
            updateStat('stat-unread-messages', '3');

            // Update message badge
            const badge = document.getElementById('message-badge');
            if (badge) badge.textContent = '3';

            // Load demo activity
            loadDemoActivity();
        }, 800);
    }

    /**
     * Load real dashboard data from API
     */
    async function loadDashboardData() {
        try {
            const [stats, activity] = await Promise.all([
                NifeluxAPI.dashboard.stats(),
                NifeluxAPI.dashboard.recentActivity()
            ]);

            if (stats.success) {
                updateStat('stat-total-staff', stats.data.total_staff);
                updateStat('stat-active-staff', stats.data.active_staff);
                updateStat('stat-inactive-staff', stats.data.inactive_staff);
                updateStat('stat-total-projects', stats.data.total_projects);
                updateStat('stat-published-news', stats.data.published_news);
                updateStat('stat-unread-messages', stats.data.unread_messages);

                const badge = document.getElementById('message-badge');
                if (badge) badge.textContent = stats.data.unread_messages;
            }

            if (activity.success) {
                renderActivity(activity.data);
            }

        } catch (error) {
            console.error('Dashboard load error:', error);
            showError('Failed to load dashboard data');
            loadDemoData(); // Fallback to demo
        }
    }

    /**
     * Update stat card value
     */
    function updateStat(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = value;
            el.classList.add('loaded');
        }
    }

    /**
     * Load demo activity feed
     */
    function loadDemoActivity() {
        const demoActivities = [
            {
                icon: '🆔',
                title: 'ID card created',
                detail: 'NFX-EMP-0007',
                time: '2 hours ago'
            },
            {
                icon: '🚀',
                title: 'Project published',
                detail: 'NIRA AI',
                time: '5 hours ago'
            },
            {
                icon: '📰',
                title: 'News article published',
                detail: 'Nifelux expands AI research',
                time: '1 day ago'
            },
            {
                icon: '👤',
                title: 'Staff updated',
                detail: 'Employee record updated',
                time: '2 days ago'
            },
            {
                icon: '⚙️',
                title: 'Settings changed',
                detail: 'Company information updated',
                time: '3 days ago'
            }
        ];

        renderActivity(demoActivities);
    }

    /**
     * Render activity feed
     */
    function renderActivity(activities) {
        const container = document.getElementById('activity-list');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="activity-empty">
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon || '📋'}</div>
                <div class="activity-content">
                    <div class="activity-title">${NifeluxUtils.sanitizeHTML(activity.title || activity.action)}</div>
                    <div class="activity-detail">${NifeluxUtils.sanitizeHTML(activity.detail || activity.description || '')}</div>
                </div>
                <div class="activity-time">${activity.time || NifeluxUtils.formatRelativeTime(activity.created_at)}</div>
            </div>
        `).join('');
    }

    /**
     * Initialize mobile menu
     */
    function initMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (!menuBtn || !sidebar || !overlay) return;

        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('visible');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
            document.body.style.overflow = '';
        });
    }

    /**
     * Initialize logout
     */
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async () => {
            const confirmed = await confirmModal('Are you sure you want to log out?', {
                title: 'Logout',
                confirmText: 'Logout',
                confirmClass: 'btn-danger'
            });

            if (confirmed) {
                await NifeluxAuth.logout();
                window.location.href = '/admin/login.html';
            }
        });
    }

    return { init };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AdminDashboard.init);
} else {
    AdminDashboard.init();
}
