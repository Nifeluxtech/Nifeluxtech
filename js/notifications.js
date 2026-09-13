/**
 * NIFELUX TECHNOLOGIES - NOTIFICATION SYSTEM
 * Custom toast notification system with animations and auto-dismiss
 */

const NifeluxNotifications = (() => {
    'use strict';

    const DEFAULT_DURATION = 5000;
    const container = document.getElementById('toast-container');

    /**
     * Get icon based on notification type
     */
    function getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get default title based on type
     */
    function getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Show a toast notification
     * @param {string} message - The notification message
     * @param {string} type - Type: 'success' | 'error' | 'warning' | 'info'
     * @param {object} options - Additional options
     */
    function showToast(message, type = 'info', options = {}) {
        if (!container) {
            console.error('Toast container not found');
            return;
        }

        const {
            title = getDefaultTitle(type),
            duration = DEFAULT_DURATION,
            closable = true,
            autoDismiss = true
        } = options;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        toast.innerHTML = `
            <div class="toast-icon" aria-hidden="true">${getIcon(type)}</div>
            <div class="toast-content">
                <div class="toast-title">${NifeluxUtils.sanitizeHTML(title)}</div>
                <div class="toast-message">${NifeluxUtils.sanitizeHTML(message)}</div>
            </div>
            ${closable ? '<button class="toast-close" aria-label="Close notification">×</button>' : ''}
            ${autoDismiss && duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Set progress animation duration
        if (autoDismiss && duration > 0) {
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                progress.style.animationDuration = `${duration}ms`;
            }
        }

        // Close button handler
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => removeToast(toast));
        }

        // Add to container
        container.appendChild(toast);

        // Auto-dismiss
        if (autoDismiss && duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }

        // Keyboard accessibility - Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && toast.contains(document.activeElement)) {
                removeToast(toast);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return toast;
    }

    /**
     * Remove a toast with animation
     */
    function removeToast(toast) {
        if (!toast || toast.classList.contains('removing')) return;
        
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Convenience methods for each type
     */
    const success = (message, options = {}) => showToast(message, 'success', options);
    const error = (message, options = {}) => showToast(message, 'error', options);
    const warning = (message, options = {}) => showToast(message, 'warning', options);
    const info = (message, options = {}) => showToast(message, 'info', options);

    /**
     * Clear all toasts
     */
    function clearAll() {
        if (!container) return;
        const toasts = container.querySelectorAll('.toast');
        toasts.forEach(toast => removeToast(toast));
    }

    return {
        show: showToast,
        success,
        error,
        warning,
        info,
        remove: removeToast,
        clearAll
    };
})();

// Make globally available
window.showToast = NifeluxNotifications.show;
window.showSuccess = NifeluxNotifications.success;
window.showError = NifeluxNotifications.error;
window.showWarning = NifeluxNotifications.warning;
window.showInfo = NifeluxNotifications.info;
window.NifeluxNotifications = NifeluxNotifications;
