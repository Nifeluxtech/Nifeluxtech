/**
 * NIFELUX TECHNOLOGIES - ID CARDS MANAGEMENT
 * ID card listing, preview, and actions
 */

const IDCardsManager = (() => {
    'use strict';

    let idCards = [];

    /**
     * Initialize ID cards page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadIDCards();
        }

        initPrintButton();
    }

    /**
     * Load ID cards from API
     */
    async function loadIDCards() {
        try {
            // This would need an API endpoint - for now using staff list with ID card info
            const response = await NifeluxAPI.staff.list({ has_id: true });
            
            if (response.success) {
                idCards = response.data.filter(s => s.id_card);
                renderIDCards(idCards);
            }

        } catch (error) {
            console.error('Failed to load ID cards:', error);
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        idCards = [
            {
                employee_id: 'NFX-EMP-0001',
                first_name: 'John',
                last_name: 'Doe',
                position: 'Senior Developer',
                department: 'Engineering',
                status: 'active'
            },
            {
                employee_id: 'NFX-EMP-0002',
                first_name: 'Jane',
                last_name: 'Smith',
                position: 'AI Researcher',
                department: 'Artificial Intelligence',
                status: 'active'
            }
        ];

        renderIDCards(idCards);
        showInfo('Demo mode: Showing sample ID cards');
    }

    /**
     * Render ID cards grid
     */
    function renderIDCards(cards) {
        const grid = document.getElementById('id-cards-grid');
        const emptyState = document.getElementById('empty-state');

        if (!grid) return;

        if (!cards || cards.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = cards.map(card => `
            <div class="id-card-item">
                <div class="id-card-item-header">
                    <div>
                        <div class="id-card-item-name">${NifeluxUtils.sanitizeHTML(card.first_name)} ${NifeluxUtils.sanitizeHTML(card.last_name)}</div>
                        <div class="id-card-item-id">${NifeluxUtils.sanitizeHTML(card.employee_id)}</div>
                    </div>
                    ${AdminCommon.getStatusBadge(card.status)}
                </div>
                <div style="font-size: var(--fs-sm); color: var(--color-text-muted); margin-bottom: 8px;">
                    ${NifeluxUtils.sanitizeHTML(card.position)} · ${NifeluxUtils.sanitizeHTML(card.department)}
                </div>
                <div class="id-card-item-actions">
                    <button class="btn btn-outline btn-sm" onclick="IDCardsManager.previewCard('${card.employee_id}')">
                        Preview
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="IDCardsManager.printCard('${card.employee_id}')">
                        Print
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Preview ID card in modal
     */
    function previewCard(employeeId) {
        const card = idCards.find(c => c.employee_id === employeeId);
        if (!card) return;

        const modal = document.getElementById('id-card-modal');
        const preview = document.getElementById('id-card-preview');

        if (!modal || !preview) return;

        // Generate QR code URL
        const qrUrl = `https://nifelux.com/verify/?id=${card.employee_id}`;

        preview.innerHTML = `
            <div class="id-card">
                <div class="id-card-front">
                    <div class="id-card-header">
                        <div class="id-card-company">
                            <svg class="id-card-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="cardLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#00a8ff;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:0.7" />
                                    </linearGradient>
                                </defs>
                                <path d="M20 2 L35 11 L35 29 L20 38 L5 29 L5 11 Z" fill="none" stroke="url(#cardLogoGrad)" stroke-width="2"/>
                                <path d="M14 20 L20 14 L26 20 L20 26 Z" fill="url(#cardLogoGrad)"/>
                            </svg>
                            <span class="id-card-company-name">Nifelux Technologies</span>
                        </div>
                        <span class="id-card-type">Employee ID</span>
                    </div>
                    <div class="id-card-body">
                        <div class="id-card-photo">
                            <div class="id-card-photo-placeholder">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                        </div>
                        <div class="id-card-info">
                            <div class="id-card-name">${NifeluxUtils.sanitizeHTML(card.first_name)} ${NifeluxUtils.sanitizeHTML(card.last_name)}</div>
                            <div class="id-card-position">${NifeluxUtils.sanitizeHTML(card.position)}</div>
                            <div class="id-card-details">
                                <div class="id-card-detail">
                                    <span class="id-card-detail-label">Department</span>
                                    <span class="id-card-detail-value">${NifeluxUtils.sanitizeHTML(card.department)}</span>
                                </div>
                                <div class="id-card-detail">
                                    <span class="id-card-detail-label">Employee ID</span>
                                    <span class="id-card-detail-value">${NifeluxUtils.sanitizeHTML(card.employee_id)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="id-card-footer">
                        <div class="id-card-employee-id">${NifeluxUtils.sanitizeHTML(card.employee_id)}</div>
                        <div class="id-card-qr" id="qr-code-${card.employee_id}">
                            <div style="width: 100%; height: 100%; background: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 8px 8px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Generate actual QR code if library available
        generateQRCode(`qr-code-${card.employee_id}`, qrUrl);
    }

    /**
     * Generate QR code
     */
    function generateQRCode(containerId, url) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Use QR code API as fallback
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
        img.alt = 'QR Code';
        img.style.width = '100%';
        img.style.height = '100%';
        container.innerHTML = '';
        container.appendChild(img);
    }

    /**
     * Print ID card
     */
    function printCard(employeeId) {
        previewCard(employeeId);
        
        setTimeout(() => {
            window.print();
        }, 500);
    }

    /**
     * Initialize print button
     */
    function initPrintButton() {
        const printBtn = document.getElementById('print-card-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Close modal on overlay click
        const modal = document.getElementById('id-card-modal');
        if (modal) {
            modal.querySelector('.modal-overlay')?.addEventListener('click', () => {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            });

            modal.querySelector('.modal-close')?.addEventListener('click', () => {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            });
        }
    }

    return {
        init,
        previewCard,
        printCard
    };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', IDCardsManager.init);
} else {
    IDCardsManager.init();
}

window.IDCardsManager = IDCardsManager;
