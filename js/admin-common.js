/**
 * NIFELUX TECHNOLOGIES - ADMIN COMMON
 * Shared functionality for all admin pages
 */

const AdminCommon = (() => {
    'use strict';

    /**
     * Initialize common admin functionality
     */
    function init() {
        // Check authentication
        if (!NifeluxAuth.requireAuth()) return;

        // Load user info
        loadUserInfo();

        // Initialize mobile menu
        initMobileMenu();

        // Initialize logout
        initLogout();
    }

    /**
     * Load user info into topbar
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

    /**
     * Show loading state for a button
     */
    function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            const textEl = btn.querySelector('.btn-text');
            if (textEl) {
                btn.dataset.originalText = textEl.textContent;
                textEl.textContent = loadingText;
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            const textEl = btn.querySelector('.btn-text');
            if (textEl && btn.dataset.originalText) {
                textEl.textContent = btn.dataset.originalText;
            }
        }
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return '—';
        return NifeluxUtils.formatDate(dateString);
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        const badges = {
            active: '<span class="badge badge-success">Active</span>',
            inactive: '<span class="badge badge-neutral">Inactive</span>',
            suspended: '<span class="badge badge-error">Suspended</span>',
            draft: '<span class="badge badge-neutral">Draft</span>',
            published: '<span class="badge badge-success">Published</span>',
            archived: '<span class="badge badge-neutral">Archived</span>',
            new: '<span class="badge badge-info">New</span>',
            read: '<span class="badge badge-neutral">Read</span>',
            replied: '<span class="badge badge-success">Replied</span>'
        };
        return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
    }

    return {
        init,
        setButtonLoading,
        formatDate,
        getStatusBadge
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AdminCommon.init);
} else {
    AdminCommon.init();
}

window.AdminCommon = AdminCommon;
