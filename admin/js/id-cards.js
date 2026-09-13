/**
 * NIFELUX TECHNOLOGIES - ID CARD MANAGEMENT
 * Generate / preview / print / regenerate / deactivate employee ID cards.
 * Always sends the staff UUID (never the employee_id) to the API.
 */

const IdCardsManager = (() => {
    'use strict';

    let staffList = [];
    let cardList = [];
    let currentCard = null;

    /* ---------------- LOAD ---------------- */

    async function init() {
        const ok = await AdminCommon.init();
        if (!ok) return;

        await load();

        const printBtn = document.getElementById('print-card-btn');
        if (printBtn) printBtn.addEventListener('click', () => window.print());

        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.querySelectorAll('[data-close]').forEach(el => {
                el.addEventListener('click', closePreview);
            });
        }
    }

    async function load() {
        const tbody = document.getElementById('idcards-table-body');

        try {
            const [staffRes, cardsRes] = await Promise.all([
                NifeluxAPI.staff.list({ limit: 200 }),
                NifeluxAPI.get('/id?action=list')
            ]);

            staffList = (staffRes.success && staffRes.data) ? staffRes.data : [];
            cardList = (cardsRes.success && cardsRes.data) ? cardsRes.data : [];

        } catch (error) {
            console.error('ID cards load error:', error);
            showError(error.message || 'Failed to load ID card data');
            staffList = [];
            cardList = [];
        }

        render();
    }

    /* ---------------- RENDER ---------------- */

    function cardForStaff(staffId) {
        return cardList.find(c => c.staff_id === staffId);
    }

    function esc(v) {
        return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v));
    }

    function render() {
        const tbody = document.getElementById('idcards-table-body');
        if (!tbody) return;

        if (!staffList.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;color:var(--color-text-muted);">
                        No staff members yet. Add staff first, then generate ID cards here.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = staffList.map(staff => {
            const card = cardForStaff(staff.id);
            const name = `${staff.first_name} ${staff.last_name}`;

            let statusBadge, actions;

            if (!card) {
                statusBadge = '<span class="badge badge-neutral">Not Generated</span>';
                actions = staff.status === 'active'
                    ? `<button class="btn btn-primary btn-sm" onclick="IdCardsManager.generate('${staff.id}')">Generate ID</button>`
                    : '<span style="font-size:var(--fs-xs);color:var(--color-text-subtle);">Staff inactive</span>';
            } else {
                statusBadge = AdminCommon.getStatusBadge(card.status, 'id');
                actions = `
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-sm" onclick="IdCardsManager.preview('${card.id}')" title="Preview">View</button>
                        <button class="btn btn-ghost btn-sm" onclick="IdCardsManager.regenerate('${staff.id}')" title="Regenerate">Regen</button>
                        ${card.status === 'active'
                            ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="IdCardsManager.deactivate('${staff.id}', '${esc(name)}')" title="Deactivate">Deactivate</button>`
                            : ''}
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <div class="table-cell-title">${esc(name)}</div>
                        <div class="table-cell-subtitle">${esc(staff.email || staff.department)}</div>
                    </td>
                    <td><strong>${esc(staff.employee_id)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>${card ? NifeluxUtils.formatDate(card.generated_at) : '—'}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    /* ---------------- ACTIONS ---------------- */

    async function generate(staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) { showError('Staff member not found in the current list. Refresh and try again.'); return; }

        const confirmed = await confirmModal(
            `Generate an official ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})?`,
            { title: 'Generate ID Card', confirmText: 'Generate', type: 'info' }
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.id.create(staffId);
            if (res.success) {
                showSuccess(`ID card created for ${staff.employee_id}`);
                await load();
                if (res.data && res.data.id) preview(res.data.id);
            }
        } catch (error) {
            showError(error.message || 'Failed to generate ID card');
        }
    }

    async function regenerate(staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        const confirmed = await confirmModal(
            `Replace the existing ID card for ${staff.first_name} ${staff.last_name}? The old card will stop working.`,
            { title: 'Regenerate ID Card', confirmText: 'Regenerate', type: 'warning' }
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.post('/id?action=regenerate', { staff_id: staffId });
            if (res.success) {
                showSuccess('ID card regenerated');
                await load();
                if (res.data && res.data.id) preview(res.data.id);
            }
        } catch (error) {
            showError(error.message || 'Failed to regenerate ID card');
        }
    }

    async function deactivate(staffId, name) {
        const confirmed = await confirmModal(
            `Deactivate the ID card for ${name}? Verification will immediately show it as inactive.`,
            { title: 'Deactivate ID', confirmText: 'Deactivate', confirmClass: 'btn-danger', type: 'warning' }
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.id.deactivate(staffId);
            if (res.success) {
                showSuccess('ID card deactivated');
                await load();
            }
        } catch (error) {
            showError(error.message || 'Failed to deactivate ID card');
        }
    }

    /* ---------------- PREVIEW / PRINT ---------------- */

    function preview(cardId) {
        const card = cardList.find(c => c.id === cardId);
        if (!card || !card.staff) { showError('Card data not found. Refresh and try again.'); return; }

        currentCard = card;
        const s = card.staff;
        const name = `${s.first_name} ${s.last_name}`;
        const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(card.qr_code_url || '');

        const area = document.getElementById('idcard-print-area');
        area.innerHTML = `
            <div class="idcard-preview-item">
                <div class="idcard">
                    <div class="idcard-front">
                        <div class="idcard-header">
                            <div class="idcard-brand">
                                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <defs><linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33c0ff"/><stop offset="1" stop-color="#0057e6"/></linearGradient></defs>
                                    <path fill="url(#cardGrad)" d="M10 40 V8 h7 l14 20 V8 h7 v32 h-7 L17 20 v20 Z"/>
                                    <path fill="#e6edf3" d="M17 20 l14 20 h-6 L17 29 Z" opacity=".92"/>
                                </svg>
                                <span class="idcard-brand-text">NIFELUX<span class="accent">.</span></span>
                            </div>
                            <span class="idcard-type">Employee ID</span>
                        </div>
                        <div class="idcard-body">
                            <div class="idcard-photo">
                                ${s.photo_url
                                    ? `<img src="${esc(s.photo_url)}" alt="${esc(name)}">`
                                    : `<div class="idcard-photo-placeholder"><svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2"><circle cx="40" cy="30" r="16"/><path d="M20 70 C20 55 30 45 40 45 C50 45 60 55 60 70"/></svg></div>`}
                            </div>
                            <div class="idcard-info">
                                <div class="idcard-name">${esc(name)}</div>
                                <div class="idcard-position">${esc(s.position)}</div>
                                <div class="idcard-department">${esc(s.department)}</div>
                                <span class="idcard-empid">${esc(card.employee_id)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <span class="idcard-preview-label">Front</span>
            </div>

            <div class="idcard-preview-item">
                <div class="idcard">
                    <div class="idcard-back">
                        <div class="idcard-back-content">
                            <div class="idcard-qr">
                                <img src="${qrSrc}" alt="Verification QR code for ${esc(card.employee_id)}"
                                     onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;font-size:8px;color:#333;text-align:center&quot;>${esc(card.qr_code_url)}</span>';">
                            </div>
                            <div class="idcard-back-info">
                                <div class="idcard-back-title">Verification</div>
                                <p class="idcard-back-text">This card remains the property of Nifelux Technologies. Scan the QR code or visit the verification URL to confirm authenticity.</p>
                                <div class="idcard-verify-url">${esc(card.qr_code_url || '')}</div>
                            </div>
                        </div>
                        <div class="idcard-signature">
                            <div class="idcard-signature-line">
                                <div class="idcard-signature-mark">Nifelux Technologies</div>
                                <div class="idcard-signature-label">Authorized Signature</div>
                            </div>
                            <div class="idcard-validity">
                                Issued: <strong>${esc(NifeluxUtils.formatDate(card.generated_at))}</strong><br>
                                Status: <strong>${esc(card.status)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <span class="idcard-preview-label">Back</span>
            </div>
        `;

        const modal = document.getElementById('preview-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closePreview() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    return { init, generate, regenerate, deactivate, preview, reload: load };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', IdCardsManager.init);
} else {
    IdCardsManager.init();
}

window.IdCardsManager = IdCardsManager;
