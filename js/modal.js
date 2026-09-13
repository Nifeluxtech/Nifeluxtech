/**
 * NIFELUX TECHNOLOGIES - MODAL SYSTEM
 * Custom confirmation and dialog modal system
 */

const NifeluxModal = (() => {
    'use strict';

    const container = document.getElementById('modal-container');
    let currentModal = null;
    let previousFocus = null;

    /**
     * Get icon based on modal type
     */
    function getIcon(type) {
        const icons = {
            warning: '⚠',
            danger: '⚠',
            info: 'i',
            success: '✓'
        };
        return icons[type] || 'i';
    }

    /**
     * Open a modal dialog
     * @param {object} options - Modal configuration
     * @returns {Promise} - Resolves with user action
     */
    function openModal(options = {}) {
        return new Promise((resolve) => {
            if (!container) {
                console.error('Modal container not found');
                resolve(false);
                return;
            }

            const {
                title = 'Confirm Action',
                message = 'Are you sure?',
                type = 'warning',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                showCancel = true,
                confirmClass = 'btn-primary',
                closeOnOverlay = true,
                closeOnEscape = true
            } = options;

            // Save previous focus
            previousFocus = document.activeElement;

            // Create modal HTML
            container.innerHTML = `
                <div class="modal-overlay" ${closeOnOverlay ? 'data-close="true"' : ''}></div>
                <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title-${Date.now()}" tabindex="-1">
                    <button class="modal-close" aria-label="Close dialog">×</button>
                    <div class="modal-header">
                        <div class="modal-icon ${type}" aria-hidden="true">${getIcon(type)}</div>
                        <h3 class="modal-title" id="modal-title-${Date.now()}">${NifeluxUtils.sanitizeHTML(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${NifeluxUtils.sanitizeHTML(message)}</p>
                    </div>
                    <div class="modal-footer">
                        ${showCancel ? `<button class="btn btn-outline" data-action="cancel">${NifeluxUtils.sanitizeHTML(cancelText)}</button>` : ''}
                        <button class="btn ${confirmClass}" data-action="confirm">${NifeluxUtils.sanitizeHTML(confirmText)}</button>
                    </div>
                </div>
            `;

            currentModal = container.querySelector('.modal');

            // Show modal
            requestAnimationFrame(() => {
                container.classList.add('active');
                container.setAttribute('aria-hidden', 'false');
                
                // Focus the modal
                currentModal.focus();
            });

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Event handlers
            const handleAction = (action) => {
                closeModal();
                resolve(action === 'confirm');
            };

            // Close button
            container.querySelector('.modal-close').addEventListener('click', () => handleAction(false));

            // Cancel button
            if (showCancel) {
                container.querySelector('[data-action="cancel"]').addEventListener('click', () => handleAction(false));
            }

            // Confirm button
            container.querySelector('[data-action="confirm"]').addEventListener('click', () => handleAction(true));

            // Overlay click
            if (closeOnOverlay) {
                container.querySelector('.modal-overlay').addEventListener('click', () => handleAction(false));
            }

            // Escape key
            if (closeOnEscape) {
                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', handleEscape);
                        handleAction(false);
                    }
                };
                document.addEventListener('keydown', handleEscape);
            }

            // Trap focus within modal
            trapFocus(currentModal);
        });
    }

    /**
     * Close the current modal
     */
    function closeModal() {
        if (!container || !currentModal) return;

        container.classList.remove('active');
        container.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        setTimeout(() => {
            if (container) {
                container.innerHTML = '';
            }
            currentModal = null;

            // Restore focus
            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
                previousFocus = null;
            }
        }, 300);
    }

    /**
     * Trap focus within modal for accessibility
     */
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        });
    }

    /**
     * Convenience methods
     */
    async function confirm(message, options = {}) {
        return openModal({
            title: options.title || 'Confirm',
            message,
            type: options.type || 'warning',
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            ...options
        });
    }

    async function confirmDelete(message = 'This action cannot be undone. Continue?') {
        return openModal({
            title: 'Delete',
            message,
            type: 'danger',
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
    }

    async function alert(message, options = {}) {
        return openModal({
            title: options.title || 'Notice',
            message,
            type: options.type || 'info',
            showCancel: false,
            confirmText: 'OK'
        });
    }

    return {
        open: openModal,
        close: closeModal,
        confirm,
        confirmDelete,
        alert
    };
})();

// Make globally available
window.openModal = NifeluxModal.open;
window.closeModal = NifeluxModal.close;
window.confirmModal = NifeluxModal.confirm;
window.confirmDelete = NifeluxModal.confirmDelete;
window.alertModal = NifeluxModal.alert;
window.NifeluxModal = NifeluxModal;
