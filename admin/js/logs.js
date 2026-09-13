/**
 * NIFELUX TECHNOLOGIES - ACTIVITY LOGS
 * View system activity and audit trail
 */

const LogsManager = (() => {
    'use strict';

    let logs = [];

    /**
     * Initialize logs page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadLogs();
        }
    }

    /**
     * Load logs from API
     */
    async function loadLogs() {
        try {
            const response = await NifeluxAPI.logs.list({ limit: 50 });
            if (response.success) {
                logs = response.data;
                renderLogs(logs);
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            showError('Failed to load activity logs');
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        logs = [
            {
                id: 'demo-1',
                action: 'id_card_created',
                description: 'Generated ID card for John Doe (NFX-EMP-0001)',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-12T14:30:00Z'
            },
            {
                id: 'demo-2',
                action: 'project_published',
                description: 'Project published: NIRA AI',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-12T10:15:00Z'
            },
            {
                id: 'demo-3',
                action: 'news_published',
                description: 'News article published: Nifelux expands AI research',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-11T16:45:00Z'
            },
            {
                id: 'demo-4',
                action: 'staff_updated',
                description: 'Updated staff member: Jane Smith',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-11T09:20:00Z'
            },
            {
                id: 'demo-5',
                action: 'settings_changed',
                description: 'Company information updated',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-10T11:00:00Z'
            },
            {
                id: 'demo-6',
                action: 'login',
                description: 'Admin logged in: admin@nifelux.com',
                user_email: 'admin@nifelux.com',
                created_at: '2026-09-10T08:30:00Z'
            }
        ];

        renderLogs(logs);
        showInfo('Demo mode: Showing sample activity logs');
    }

    /**
     * Render logs table
     */
    function renderLogs(data) {
        const tbody = document.getElementById('logs-table-body');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        No activity logs found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(log => `
            <tr>
                <td style="white-space: nowrap;">${NifeluxUtils.formatDateTime(log.created_at)}</td>
                <td><span class="badge ${getActionBadgeClass(log.action)}">${formatAction(log.action)}</span></td>
                <td>${NifeluxUtils.sanitizeHTML(log.description)}</td>
                <td>${NifeluxUtils.sanitizeHTML(log.user_email || 'System')}</td>
            </tr>
        `).join('');
    }

    /**
     * Format action name for display
     */
    function formatAction(action) {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get badge class based on action type
     */
    function getActionBadgeClass(action) {
        if (action.includes('delete') || action.includes('revoked')) {
            return 'badge-error';
        }
        if (action.includes('create') || action.includes('published') || action.includes('login')) {
            return 'badge-success';
        }
        if (action.includes('update') || action.includes('changed')) {
            return 'badge-warning';
        }
        return 'badge-info';
    }

    return { init };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LogsManager.init);
} else {
    LogsManager.init();
}
