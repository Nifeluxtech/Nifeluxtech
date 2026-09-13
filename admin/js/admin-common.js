/**
 * NIFELUX TECHNOLOGIES - ADMIN COMMON UTILITIES
 * Shared functionality for all admin pages:
 * - Authentication guard
 * - Sidebar / mobile menu
 * - User info display
 * - Logout handling
 * - Formatting helpers
 * - Button loading states
 */

const AdminCommon = (() => {
    'use strict';

    /**
     * Initialize common admin functionality.
     * Call this at the top of every admin page's init().
     */
    async function init() {
        // Guard: require authentication before anything else
        if (!NifeluxAuth.requireAuth('/admin/login.html')) {
            return false;
        }

        loadUserInfo();
        initMobileMenu();
        initLogout();

        return true;
    }

    /**
     * Load user info into the topbar
     */
    function loadUserInfo() {
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
     * Initialize mobile sidebar toggle
     */
    function initMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (!menuBtn || !sidebar || !overlay) return;

        menuBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('visible', isOpen);
            menuBtn.setAttribute('aria-expanded', String(isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
            menuBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                overlay.click();
            }
        });
    }

    /**
     * Initialize logout with confirmation
     */
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async () => {
            const confirmed = await confirmModal('Are you sure you want to log out?', {
                title: 'Logout',
                confirmText: 'Logout',
                confirmClass: 'btn-danger',
                type: 'warning'
            });

            if (confirmed) {
                await NifeluxAuth.logout();
                window.location.href = '/admin/login.html';
            }
        });
    }

    /**
     * Format a date for display
     */
    function formatDate(dateInput) {
        return NifeluxUtils.formatDate(dateInput);
    }

    /**
     * Format date with time
     */
    function formatDateTime(dateInput) {
        return NifeluxUtils.formatDateTime(dateInput);
    }

    /**
     * Format relative time
     */
    function formatRelativeTime(dateInput) {
        return NifeluxUtils.formatRelativeTime(dateInput);
    }

    /**
     * Set button loading state
     * @param {HTMLElement} btn - Button element
     * @param {boolean} isLoading - Loading state
     * @param {string} loadingText - Text to show while loading
     */
    function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
        if (!btn) return;

        const textEl = btn.querySelector('.btn-text');
        const originalText = btn.dataset.originalText || (textEl ? textEl.textContent : btn.textContent);

        if (isLoading) {
            btn.dataset.originalText = originalText;
            btn.classList.add('loading');
            btn.disabled = true;
            if (textEl) textEl.textContent = loadingText;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
            if (textEl) textEl.textContent = originalText;
        }
    }

    /**
     * Get a status badge HTML string
     * @param {string} status - The status value
     * @param {string} type - Optional type context (staff, project, news, message)
     */
    function getStatusBadge(status, type = 'general') {
        const maps = {
            staff: {
                active: ['badge-success', 'Active'],
                inactive: ['badge-neutral', 'Inactive'],
                suspended: ['badge-error', 'Suspended']
            },
            project: {
                research: ['badge-info', 'Research'],
                development: ['badge-warning', 'Development'],
                active: ['badge-success', 'Active'],
                coming_soon: ['badge-info', 'Coming Soon'],
                archived: ['badge-neutral', 'Archived']
            },
            news: {
                draft: ['badge-neutral', 'Draft'],
                published: ['badge-success', 'Published'],
                archived: ['badge-neutral', 'Archived']
            },
            message: {
                new: ['badge-info', 'New'],
                read: ['badge-neutral', 'Read'],
                replied: ['badge-success', 'Replied'],
                archived: ['badge-neutral', 'Archived']
            },
            id: {
                active: ['badge-success', 'Active'],
                inactive: ['badge-warning', 'Inactive'],
                revoked: ['badge-error', 'Revoked']
            },
            general: {
                active: ['badge-success', 'Active'],
                inactive: ['badge-neutral', 'Inactive']
            }
        };

        const map = maps[type] || maps.general;
        const [cls, label] = map[status] || ['badge-neutral', status];
        return `<span class="badge ${cls}">${NifeluxUtils.sanitizeHTML(label)}</span>`;
    }

    /**
     * Render an empty state
     */
    function renderEmptyState(container, icon, title, message, actionHtml = '') {
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                ${icon || ''}
                <h3>${NifeluxUtils.sanitizeHTML(title)}</h3>
                <p>${NifeluxUtils.sanitizeHTML(message)}</p>
                ${actionHtml}
            </div>
        `;
    }

    /**
     * Debounced search helper
     */
    function createSearchHandler(callback, delay = 300) {
        return NifeluxUtils.debounce((value) => callback(value), delay);
    }

    return {
        init,
        loadUserInfo,
        initMobileMenu,
        initLogout,
        formatDate,
        formatDateTime,
        formatRelativeTime,
        setButtonLoading,
        getStatusBadge,
        renderEmptyState,
        createSearchHandler
    };
})();

// Make globally available
window.AdminCommon = AdminCommon;
