/**
 * NIFELUX TECHNOLOGIES - MESSAGES MANAGEMENT
 * Contact message inbox and management
 */

const MessagesManager = (() => {
    'use strict';

    let messages = [];
    let currentMessageId = null;

    /**
     * Initialize messages page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadMessages();
        }

        initEventListeners();
    }

    /**
     * Load messages from API
     */
    async function loadMessages() {
        try {
            const response = await NifeluxAPI.contact.list();
            if (response.success) {
                messages = response.data;
                renderMessages(messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            showError('Failed to load messages');
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        messages = [
            {
                id: 'demo-1',
                name: 'Alice Johnson',
                email: 'alice@example.com',
                phone: '+234 800 123 4567',
                company: 'TechCorp Nigeria',
                subject: 'Partnership Opportunity',
                message: 'We are interested in exploring a partnership with Nifelux Technologies for an AI project. Could we schedule a meeting to discuss potential collaboration opportunities?',
                status: 'new',
                created_at: '2026-09-12T14:30:00Z'
            },
            {
                id: 'demo-2',
                name: 'Bob Smith',
                email: 'bob@startup.io',
                company: 'StartupIO',
                subject: 'Project Inquiry',
                message: 'I would like to inquire about your robotics solutions for manufacturing automation. We are looking to modernize our production line.',
                status: 'read',
                created_at: '2026-09-11T09:15:00Z'
            },
            {
                id: 'demo-3',
                name: 'Carol Williams',
                email: 'carol@media.com',
                subject: 'Media / Press',
                message: 'I am writing from TechNews Africa. We would like to feature Nifelux Technologies in our upcoming issue about AI innovation in Nigeria.',
                status: 'replied',
                created_at: '2026-09-10T16:45:00Z'
            }
        ];

        renderMessages(messages);
        showInfo('Demo mode: Showing sample messages');
    }

    /**
     * Render messages list
     */
    function renderMessages(data) {
        const container = document.getElementById('messages-list');
        const emptyState = document.getElementById('empty-state');

        if (!container) return;

        if (!data || data.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = 'var(--space-md)';
        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = data.map(msg => `
            <div class="message-item ${msg.status === 'new' ? 'message-unread' : ''}" onclick="MessagesManager.viewMessage('${msg.id}')">
                <div class="message-item-header">
                    <div class="message-item-sender">
                        <strong>${NifeluxUtils.sanitizeHTML(msg.name)}</strong>
                        ${msg.company ? `<span class="message-item-company">${NifeluxUtils.sanitizeHTML(msg.company)}</span>` : ''}
                    </div>
                    <div class="message-item-meta">
                        ${AdminCommon.getStatusBadge(msg.status)}
                        <span class="message-item-time">${NifeluxUtils.formatRelativeTime(msg.created_at)}</span>
                    </div>
                </div>
                <div class="message-item-subject">${NifeluxUtils.sanitizeHTML(msg.subject)}</div>
                <div class="message-item-preview">${NifeluxUtils.sanitizeHTML(NifeluxUtils.truncate(msg.message, 120))}</div>
                <div class="message-item-actions" onclick="event.stopPropagation();">
                    <button class="btn btn-ghost btn-sm" onclick="MessagesManager.viewMessage('${msg.id}')" title="View">View</button>
                    ${msg.status === 'new' ? `<button class="btn btn-ghost btn-sm" onclick="MessagesManager.markRead('${msg.id}')" title="Mark Read">Mark Read</button>` : ''}
                    <button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="MessagesManager.deleteMessage('${msg.id}')" title="Delete">Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * View message detail
     */
    function viewMessage(id) {
        const msg = messages.find(m => m.id === id);
        if (!msg) return;

        currentMessageId = id;

        // Mark as read if new
        if (msg.status === 'new') {
            markRead(id);
        }

        const content = document.getElementById('message-detail-content');
        content.innerHTML = `
            <div class="message-detail">
                <div class="message-detail-row">
                    <span class="message-detail-label">From:</span>
                    <span class="message-detail-value">${NifeluxUtils.sanitizeHTML(msg.name)} (${NifeluxUtils.sanitizeHTML(msg.email)})</span>
                </div>
                ${msg.phone ? `
                <div class="message-detail-row">
                    <span class="message-detail-label">Phone:</span>
                    <span class="message-detail-value">${NifeluxUtils.sanitizeHTML(msg.phone)}</span>
                </div>
                ` : ''}
                ${msg.company ? `
                <div class="message-detail-row">
                    <span class="message-detail-label">Company:</span>
                    <span class="message-detail-value">${NifeluxUtils.sanitizeHTML(msg.company)}</span>
                </div>
                ` : ''}
                <div class="message-detail-row">
                    <span class="message-detail-label">Subject:</span>
                    <span class="message-detail-value">${NifeluxUtils.sanitizeHTML(msg.subject)}</span>
                </div>
                <div class="message-detail-row">
                    <span class="message-detail-label">Received:</span>
                    <span class="message-detail-value">${NifeluxUtils.formatDateTime(msg.created_at)}</span>
                </div>
                <div class="message-detail-message">
                    <p>${NifeluxUtils.sanitizeHTML(msg.message)}</p>
                </div>
                <div class="message-detail-reply">
                    <a href="mailto:${NifeluxUtils.sanitizeHTML(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject)}" class="btn btn-primary btn-sm">
                        Reply via Email
                    </a>
                </div>
            </div>
        `;

        // Show modal
        const modal = document.getElementById('message-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    /**
     * Mark message as read
     */
    async function markRead(id) {
        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.contact.update(id, { status: 'read' });
            }
            
            const msg = messages.find(m => m.id === id);
            if (msg) msg.status = 'read';
            
            renderMessages(messages);
        } catch (error) {
            console.error('Mark read error:', error);
        }
    }

    /**
     * Mark message as replied
     */
    async function markReplied() {
        if (!currentMessageId) return;

        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.contact.update(currentMessageId, { status: 'replied' });
            }
            
            const msg = messages.find(m => m.id === currentMessageId);
            if (msg) msg.status = 'replied';
            
            renderMessages(messages);
            closeModal();
            showSuccess('Message marked as replied');
        } catch (error) {
            showError(error.message || 'Failed to update message');
        }
    }

    /**
     * Delete message
     */
    async function deleteMessage(id) {
        const confirmed = await confirmDelete('Are you sure you want to delete this message?');
        if (!confirmed) return;

        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.contact.delete(id);
            }
            
            messages = messages.filter(m => m.id !== id);
            renderMessages(messages);
            showSuccess('Message deleted');
        } catch (error) {
            showError(error.message || 'Failed to delete message');
        }
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        const repliedBtn = document.getElementById('mark-replied-btn');
        if (repliedBtn) {
            repliedBtn.addEventListener('click', markReplied);
        }

        const modal = document.getElementById('message-modal');
        if (modal) {
            modal.querySelectorAll('[data-close]').forEach(el => {
                el.addEventListener('click', closeModal);
            });
        }
    }

    /**
     * Close modal
     */
    function closeModal() {
        const modal = document.getElementById('message-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    return {
        init,
        viewMessage,
        markRead,
        markReplied,
        deleteMessage
    };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MessagesManager.init);
} else {
    MessagesManager.init();
}

window.MessagesManager = MessagesManager;
