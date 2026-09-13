/**
 * NIFELUX TECHNOLOGIES - ID CARD MANAGEMENT
 * Generate / preview / print / regenerate / deactivate employee ID cards.
 * Always sends the staff UUID (never employee_id) to the API.
 */

const IdCardsManager = (() => {
    'use strict';

    let staffList = [];
    let cardList = [];

    /* ---------------- HELPERS ---------------- */

    function esc(v) {
        return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v));
    }

    /**
     * Confirmation that degrades safely if the modal system is unavailable
     * (prevents the silent-abort bug when #modal-container is missing).
     */
    async function safeConfirm(message, options) {
        const container = document.getElementById('modal-container');
        if (typeof confirmModal !== 'function' || !container) {
            console.warn('Confirmation modal unavailable — proceeding without confirmation.');
            return true;
        }
        return confirmModal(message, options);
    }

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
        try {
            const staffRes = await NifeluxAPI.staff.list({ limit: 200 });
            staffList = (staffRes.success && staffRes.data) ? staffRes.data : [];
        } catch (error) {
            console.error('Staff load error:', error);
            showError('Failed to load staff: ' + (error.message || 'unknown error'));
            staffList = [];
        }

        try {
            const cardsRes = await NifeluxAPI.get('/id?action=list');
            cardList = (cardsRes.success && cardsRes.data) ? cardsRes.data : [];
        } catch (error) {
            console.error('ID list error:', error);
            cardList = [];
            if (error.status === 404) {
                showError('ID list endpoint missing — deploy the latest api/id.js');
            } else if (error.status !== 401) {
                showError('Failed to load ID cards: ' + (error.message || 'unknown error'));
            }
        }

        render();
    }

    /* ---------------- RENDER ---------------- */

    function cardForStaff(staffId) {
        return cardList.find(c => c.staff_id === staffId);
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
                        <button class="btn btn-ghost btn-sm" onclick="IdCardsManager.preview('${card.id}')">View</button>
                        <button class="btn btn-ghost btn-sm" onclick="IdCardsManager.regenerate('${staff.id}')">Regen</button>
                        ${card.status === 'active'
                            ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="IdCardsManager.deactivate('${staff.id}', '${esc(name)}')">Deactivate</button>`
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

    /* ---------------- GENERATE / REGENERATE / DEACTIVATE ---------------- */

    async function generate(staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) {
            showError('Staff member not found in the current list. Refresh and try again.');
            return;
        }

        const confirmed = await safeConfirm(
            `Generate an official ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})?`,
            { title: 'Generate ID Card', confirmText: 'Generate', type: 'info' }
        );
        if (!confirmed) return;

        try {
            let res;
            try {
                res = await NifeluxAPI.post('/id?action=create', { staff_id: staffId });
            } catch (firstError) {
                // Fallback for repos still using the legacy endpoint layout
                if (firstError.status === 404) {
                    res = await NifeluxAPI.post('/id/create', { staff_id: staffId });
                } else {
                    throw firstError;
                }
            }

            if (res && res.success) {
                showSuccess(`ID card created for ${staff.employee_id}`);
                await load();
                if (res.data && res.data.id) preview(res.data.id);
            } else {
                showError((res && res.error) || 'Generation failed without an error message');
            }

        } catch (error) {
            console.error('Generate error:', error);
            showError(`Generate failed (${error.status || 'network'}): ${error.message || 'unknown error'}`);
        }
    }

    async function regenerate(staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        const confirmed = await safeConfirm(
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
            console.error('Regenerate error:', error);
            showError(`Regenerate failed (${error.status || 'network'}): ${error.message || 'unknown error'}`);
        }
    }

    async function deactivate(staffId, name) {
        const container = document.getElementById('modal-container');
        if (!container || typeof confirmModal !== 'function') {
            showError('Confirmation system unavailable. Add #modal-container to this page.');
            return;
        }

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
            showError(`Deactivate failed (${error.status || 'network'}): ${error.message || 'unknown error'}`);
        }
    }

    /* ---------------- PREVIEW / PRINT ---------------- */

    function preview(cardId) {
        const card = cardList.find(c => c.id === cardId);
        if (!card || !card.staff) {
            showError('Card data not found. Refresh and try again.');
            return;
        }

        const s = card.staff;
        const name = `${s.first_name} ${s.last_name}`;
        const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(card.qr_code_url || '');

        const area = document.getElementById('idcard-print-area');
        if (!area) return;

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
                                     onerror="this.style.display='none';">
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
