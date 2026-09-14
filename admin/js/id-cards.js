/**
 * NIFELUX TECHNOLOGIES - ID CARD MANAGEMENT (v5)
 * ------------------------------------------------
 * - Delegated click events (no inline onclick)
 * - Ignores clicks originating inside modals (modal-container guard)
 * - Confirmation degrades safely if modal system is missing
 * - Console tracing at every step for diagnostics
 * - Last-resort visible banner if toast system is unavailable
 * - Legacy endpoint fallback (/id/create) if new path 404s
 * - Preview mirrors cards into #print-root for reliable printing
 *   (front = page 1, back = page 2)
 *
 * Endpoints used:
 *   GET  /api/staff?limit=200        → staff list (admin)
 *   GET  /api/id?action=list         → ID cards (admin)
 *   POST /api/id?action=create       → generate   { staff_id }
 *   POST /api/id?action=regenerate   → replace    { staff_id }
 *   POST /api/id?action=deactivate   → deactivate { staff_id }
 */

const IdCardsManager = (() => {
    'use strict';

    const VERSION = '5.0.0';
    window.IDCARDS_VERSION = VERSION;
    console.log('%c[id-cards] v' + VERSION + ' loaded', 'color:#00a8ff;font-weight:bold');

    let staffList = [];
    let cardList = [];

    /* ==========================================================
       FEEDBACK HELPERS
       ========================================================== */

    function lastResort(msg) {
        try {
            if (typeof showInfo === 'function') { showInfo(msg); return; }
        } catch (e) { /* fall through to raw banner */ }

        const d = document.createElement('div');
        d.textContent = msg;
        d.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;' +
            'background:#1a2340;color:#fff;padding:12px 20px;border-radius:8px;border:1px solid #00a8ff;' +
            'font:14px Inter,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:90vw';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 6000);
    }

    function ok(msg) {
        try { showSuccess(msg); } catch (e) { lastResort(msg); }
    }

    function fail(msg) {
        try { showError(msg); } catch (e) { lastResort(msg); }
    }

    function esc(v) {
        return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v));
    }

    /**
     * Confirmation that degrades safely if the modal system is unavailable.
     */
    async function safeConfirm(message, options) {
        const container = document.getElementById('modal-container');
        if (typeof confirmModal !== 'function' || !container) {
            console.warn('[id-cards] modal system unavailable -> proceeding without confirmation');
            return true;
        }
        return confirmModal(message, options);
    }

    /* ==========================================================
       INIT
       ========================================================== */

    function init() {
        console.log('[id-cards] init start');

        /* Delegated actions — attached immediately, before any await.
           IMPORTANT: ignore clicks that originate inside modals so we
           never swallow the confirmation dialog's own buttons. */
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            if (btn.closest('.modal-container')) return; // modal guard

            const action = btn.dataset.action;
            const staffId = btn.dataset.staffId;
            const cardId = btn.dataset.cardId;

            console.log('[id-cards] click ->', action, staffId || cardId || '');

            if (action === 'generate')   generate(staffId);
            if (action === 'regenerate') regenerate(staffId);
            if (action === 'deactivate') deactivate(staffId, btn.dataset.name || 'this employee');
            if (action === 'preview')    preview(cardId);
        });

        /* Print button */
        const printBtn = document.getElementById('print-card-btn');
        if (printBtn) printBtn.addEventListener('click', () => window.print());

        /* Preview modal close handlers */
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.querySelectorAll('[data-close]').forEach(el => {
                el.addEventListener('click', closePreview);
            });
        }

        /* Auth + bootstrap */
        (async () => {
            try {
                const authed = await AdminCommon.init();
                if (!authed) {
                    console.warn('[id-cards] not authenticated');
                    return;
                }
                await load();
            } catch (err) {
                console.error('[id-cards] init error:', err);
                fail('Init error: ' + (err.message || err));
            }
        })();
    }

    /* ==========================================================
       LOAD
       ========================================================== */

    async function load() {
        console.log('[id-cards] loading data...');

        /* Staff */
        try {
            const staffRes = await NifeluxAPI.staff.list({ limit: 200 });
            staffList = (staffRes.success && staffRes.data) ? staffRes.data : [];
            console.log('[id-cards] staff loaded:', staffList.length);
        } catch (err) {
            console.error('[id-cards] staff load error:', err);
            fail('Staff load failed (' + (err.status || 'network') + '): ' + err.message);
            staffList = [];
        }

        /* ID cards */
        try {
            const cardsRes = await NifeluxAPI.get('/id?action=list');
            cardList = (cardsRes.success && cardsRes.data) ? cardsRes.data : [];
            console.log('[id-cards] cards loaded:', cardList.length);
        } catch (err) {
            console.error('[id-cards] card list error:', err);
            cardList = [];
            if (err.status === 404) {
                fail('ID list endpoint missing (404) — deploy the latest api/id.js');
            }
        }

        render();
    }

    /* ==========================================================
       RENDER
       ========================================================== */

    function cardForStaff(staffId) {
        return cardList.find(c => c.staff_id === staffId);
    }

    function render() {
        const tbody = document.getElementById('idcards-table-body');
        if (!tbody) {
            console.error('[id-cards] #idcards-table-body not found');
            return;
        }

        if (!staffList.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:40px;color:var(--color-text-muted);">
                        No staff members yet. Add staff first, then generate ID cards here.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = staffList.map(staff => {
            const card = cardForStaff(staff.id);
            const name = `${staff.first_name} ${staff.last_name}`;

            let statusBadge, actions;

            if (!card) {
                statusBadge = '<span class="badge badge-neutral">Not Generated</span>';
                actions = staff.status === 'active'
                    ? `<button class="btn btn-primary btn-sm" data-action="generate" data-staff-id="${staff.id}">Generate ID</button>`
                    : '<span style="font-size:var(--fs-xs);color:var(--color-text-subtle);">Staff inactive</span>';
            } else {
                statusBadge = AdminCommon.getStatusBadge(card.status, 'id');
                actions = `
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-sm" data-action="preview" data-card-id="${card.id}">View</button>
                        <button class="btn btn-ghost btn-sm" data-action="regenerate" data-staff-id="${staff.id}">Regen</button>
                        ${card.status === 'active'
                            ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="deactivate" data-staff-id="${staff.id}" data-name="${esc(name)}">Deactivate</button>`
                            : ''}
                    </div>`;
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
                </tr>`;
        }).join('');

        console.log('[id-cards] table rendered');
    }

    /* ==========================================================
       GENERATE
       ========================================================== */

    async function generate(staffId) {
        console.log('[generate] start', staffId);

        const staff = staffList.find(s => s.id === staffId);
        if (!staff) {
            fail('Staff not found in list. Refresh the page and try again.');
            return;
        }

        const confirmed = await safeConfirm(
            `Generate an official ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})?`,
            { title: 'Generate ID Card', confirmText: 'Generate', type: 'info' }
        );
        console.log('[generate] confirmed =', confirmed);
        if (!confirmed) return;

        try {
            console.log('[generate] calling API...');
            let res;
            try {
                res = await NifeluxAPI.post('/id?action=create', { staff_id: staffId });
            } catch (firstErr) {
                if (firstErr.status === 404) {
                    console.warn('[generate] 404 on new endpoint, trying legacy /id/create');
                    res = await NifeluxAPI.post('/id/create', { staff_id: staffId });
                } else {
                    throw firstErr;
                }
            }

            console.log('[generate] API response:', res);

            if (res && res.success) {
                ok(`ID card created for ${staff.employee_id}`);
                await load();
                if (res.data && res.data.id) preview(res.data.id);
            } else {
                fail((res && res.error) || 'Generation returned no success flag');
            }

        } catch (err) {
            console.error('[generate] ERROR:', err);
            fail(`Generate failed (${err.status || 'network'}): ${err.message || 'unknown error'}`);
        }
    }

    /* ==========================================================
       REGENERATE
       ========================================================== */

    async function regenerate(staffId) {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        const confirmed = await safeConfirm(
            `Replace the existing ID card for ${staff.first_name} ${staff.last_name}? The old card will stop working.`,
            { title: 'Regenerate ID Card', confirmText: 'Regenerate', type: 'warning' }
        );
        console.log('[regenerate] confirmed =', confirmed);
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.post('/id?action=regenerate', { staff_id: staffId });
            console.log('[regenerate] API response:', res);

            if (res && res.success) {
                ok('ID card regenerated');
                await load();
                if (res.data && res.data.id) preview(res.data.id);
            } else {
                fail((res && res.error) || 'Regenerate failed');
            }
        } catch (err) {
            console.error('[regenerate] ERROR:', err);
            fail(`Regenerate failed (${err.status || 'network'}): ${err.message || 'unknown error'}`);
        }
    }

    /* ==========================================================
       DEACTIVATE
       ========================================================== */

    async function deactivate(staffId, name) {
        const container = document.getElementById('modal-container');
        if (!container || typeof confirmModal !== 'function') {
            fail('Confirmation system unavailable on this page.');
            return;
        }

        const confirmed = await confirmModal(
            `Deactivate the ID card for ${name}? Verification will immediately show it as inactive.`,
            { title: 'Deactivate ID', confirmText: 'Deactivate', confirmClass: 'btn-danger', type: 'warning' }
        );
        console.log('[deactivate] confirmed =', confirmed);
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.id.deactivate(staffId);
            console.log('[deactivate] API response:', res);

            if (res && res.success) {
                ok('ID card deactivated');
                await load();
            } else {
                fail((res && res.error) || 'Deactivate failed');
            }
        } catch (err) {
            console.error('[deactivate] ERROR:', err);
            fail(`Deactivate failed (${err.status || 'network'}): ${err.message || 'unknown error'}`);
        }
    }

    /* ==========================================================
       PREVIEW / PRINT
       ========================================================== */

    function buildCardHTML(card) {
        const s = card.staff;
        const name = `${s.first_name} ${s.last_name}`;
        const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
            encodeURIComponent(card.qr_code_url || '');

        return `
            <div class="idcard-preview-item" data-side="front">
                <div class="idcard">
                    <div class="idcard-front">
                        <div class="idcard-header">
                            <div class="idcard-brand">
                                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <defs>
                                        <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0" stop-color="#33c0ff"/>
                                            <stop offset="1" stop-color="#0057e6"/>
                                        </linearGradient>
                                    </defs>
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

            <div class="idcard-preview-item" data-side="back">
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
            </div>`;
    }

    function preview(cardId) {
        const card = cardList.find(c => c.id === cardId);
        if (!card || !card.staff) {
            fail('Card data not found. Refresh and try again.');
            return;
        }

        const area = document.getElementById('idcard-print-area');
        if (!area) {
            fail('Preview area missing on this page.');
            return;
        }

        const cardHTML = buildCardHTML(card);

        /* Screen preview */
        area.innerHTML = cardHTML;

        /* Print root (normal flow) — this is what actually prints */
        const printRoot = document.getElementById('print-root');
        if (printRoot) printRoot.innerHTML = cardHTML;

        console.log('[preview] sides:', area.querySelectorAll('[data-side]').length,
                    '| print-root synced:', !!printRoot);

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

    /* ==========================================================
       PUBLIC API
       ========================================================== */

    return {
        init,
        generate,
        regenerate,
        deactivate,
        preview,
        reload: load,
        VERSION
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', IdCardsManager.init);
} else {
    IdCardsManager.init();
}

window.IdCardsManager = IdCardsManager;
