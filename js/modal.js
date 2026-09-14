/**
 * NIFELUX TECHNOLOGIES - MODAL SYSTEM (v2 — confirm bug fixed)
 * Custom confirmation and dialog modal system.
 */

const NifeluxModal = (() => {
    'use strict';

    const container = document.getElementById('modal-container');
    let currentModal = null;
    let previousFocus = null;

    function getIcon(type) {
        const icons = { warning: '⚠', danger: '⚠', info: 'i', success: '✓' };
        return icons[type] || 'i';
    }

    /**
     * Open a modal dialog. Resolves true on confirm, false on cancel/close.
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

            previousFocus = document.activeElement;

            container.innerHTML = `
                <div class="modal-overlay" ${closeOnOverlay ? 'data-close="true"' : ''}></div>
                <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
                    <button class="modal-close" aria-label="Close dialog">×</button>
                    <div class="modal-header">
                        <div class="modal-icon ${type}" aria-hidden="true">${getIcon(type)}</div>
                        <h3 class="modal-title">${NifeluxUtils.sanitizeHTML(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${NifeluxUtils.sanitizeHTML(message)}</p>
                    </div>
                    <div class="modal-footer">
                        ${showCancel ? `<button class="btn btn-outline" data-modal-action="cancel">${NifeluxUtils.sanitizeHTML(cancelText)}</button>` : ''}
                        <button class="btn ${confirmClass}" data-modal-action="confirm">${NifeluxUtils.sanitizeHTML(confirmText)}</button>
                    </div>
                </div>
            `;

            currentModal = container.querySelector('.modal');

            requestAnimationFrame(() => {
                container.classList.add('active');
                container.setAttribute('aria-hidden', 'false');
                if (currentModal) currentModal.focus();
            });

            document.body.style.overflow = 'hidden';

            /* FIXED: resolve with a real boolean */
            const finish = (confirmed) => {
                closeModal();
                resolve(confirmed === true);
            };

            container.querySelector('.modal-close').addEventListener('click', () => finish(false));

            const cancelBtn = container.querySelector('[data-modal-action="cancel"]');
            if (cancelBtn) cancelBtn.addEventListener('click', () => finish(false));

            const confirmBtn = container.querySelector('[data-modal-action="confirm"]');
            if (confirmBtn) confirmBtn.addEventListener('click', () => finish(true));

            if (closeOnOverlay) {
                container.querySelector('.modal-overlay').addEventListener('click', () => finish(false));
            }

            if (closeOnEscape) {
                const onEscape = (e) => {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', onEscape);
                        finish(false);
                    }
                };
                document.addEventListener('keydown', onEscape);
            }

            trapFocus(currentModal);
        });
    }

    function closeModal() {
        if (!container || !currentModal) return;

        container.classList.remove('active');
        container.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        setTimeout(() => {
            if (container) container.innerHTML = '';
            currentModal = null;
            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
                previousFocus = null;
            }
        }, 300);
    }

    function trapFocus(element) {
        if (!element) return;
        const focusable = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
    }

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

    return { open: openModal, close: closeModal, confirm, confirmDelete, alert };
})();

window.openModal = NifeluxModal.open;
window.closeModal = NifeluxModal.close;
window.confirmModal = NifeluxModal.confirm;
window.confirmDelete = NifeluxModal.confirmDelete;
window.alertModal = NifeluxModal.alert;
window.NifeluxModal = NifeluxModal;
