/**
 * NIFELUX TECHNOLOGIES - LEADERSHIP MANAGEMENT
 * Leaders are staff records flagged is_leadership = true.
 * Photos upload to Supabase Storage via /api/staff?action=upload-photo.
 */

const LeadershipManager = (() => {
    'use strict';

    let staffList = [];
    let editingStaffId = null;
    let pendingPhoto = null; // { base64, content_type }

    const MAX_BYTES = 2 * 1024 * 1024;

    function esc(v) { return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v)); }

    /* ---------------- INIT ---------------- */

    async function init() {
        const ok = await AdminCommon.init();
        if (!ok) return;

        document.getElementById('add-leader-btn').addEventListener('click', () => openModal(null));
        document.getElementById('leader-save-btn').addEventListener('click', handleSave);
        document.getElementById('leader-photo').addEventListener('change', handlePhotoSelect);

        const modal = document.getElementById('leader-modal');
        modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));

        await load();
    }

    async function load() {
        try {
            const res = await NifeluxAPI.staff.list({ limit: 200 });
            staffList = (res.success && res.data) ? res.data : [];
        } catch (err) {
            showError('Failed to load staff: ' + (err.message || err));
            staffList = [];
        }
        render();
    }

    function leaders() {
        return staffList
            .filter(s => s.is_leadership)
            .sort((a, b) => (a.display_order || 100) - (b.display_order || 100));
    }

    /* ---------------- RENDER ---------------- */

    function render() {
        const grid = document.getElementById('leaders-grid');
        const empty = document.getElementById('leaders-empty');
        const list = leaders();

        if (!list.length) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';

        grid.innerHTML = list.map(s => `
            <div class="admin-card">
                <div class="admin-card-header">
                    <div class="admin-card-badges"><span class="badge badge-info">#${s.display_order || 100}</span></div>
                    <div class="admin-card-actions">
                        <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm btn-danger-ghost" data-remove="${s.id}" data-name="${esc(s.first_name + ' ' + s.last_name)}">Remove</button>
                    </div>
                </div>
                <div style="padding:16px;text-align:center;">
                    ${s.photo_url
                        ? `<img src="${esc(s.photo_url)}" alt="${esc(s.first_name + ' ' + s.last_name)}" style="width:110px;height:110px;object-fit:cover;border-radius:50%;border:2px solid var(--color-accent);margin-bottom:12px;">`
                        : `<div style="width:110px;height:110px;border-radius:50%;background:var(--color-bg-tertiary);border:1px solid var(--color-border);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:var(--color-text-subtle);font-size:28px;font-weight:700;">${esc((s.first_name[0] || '') + (s.last_name[0] || ''))}</div>`}
                    <div class="table-cell-title">${esc(s.first_name + ' ' + s.last_name)}</div>
                    <div style="color:var(--color-accent);font-size:var(--fs-sm);margin:4px 0;">${esc(s.leadership_title || s.position)}</div>
                    <div class="table-cell-subtitle">${esc(s.leadership_bio || '')}</div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('[data-edit]').forEach(btn =>
            btn.addEventListener('click', () => openModal(btn.dataset.edit)));

        grid.querySelectorAll('[data-remove]').forEach(btn =>
            btn.addEventListener('click', () => removeLeader(btn.dataset.remove, btn.dataset.name)));
    }

    /* ---------------- MODAL ---------------- */

    function openModal(staffId) {
        editingStaffId = staffId;
        pendingPhoto = null;

        const select = document.getElementById('leader-staff');
        const selectGroup = document.getElementById('staff-select-group');
        const preview = document.getElementById('leader-photo-preview');
        const photoInput = document.getElementById('leader-photo');

        photoInput.value = '';
        preview.style.display = 'none';

        if (staffId) {
            const s = staffList.find(x => x.id === staffId);
            if (!s) return;
            selectGroup.style.display = 'none';
            document.getElementById('leader-modal-title').textContent = 'Edit Leader';
            document.getElementById('leader-title').value = s.leadership_title || '';
            document.getElementById('leader-bio').value = s.leadership_bio || '';
            document.getElementById('leader-order').value = s.display_order || 100;
            if (s.photo_url) {
                preview.src = s.photo_url;
                preview.style.display = 'block';
            }
        } else {
            selectGroup.style.display = '';
            document.getElementById('leader-modal-title').textContent = 'Add Leader';
            document.getElementById('leader-title').value = '';
            document.getElementById('leader-bio').value = '';
            document.getElementById('leader-order').value = leaders().length + 1;

            const nonLeaders = staffList.filter(s => !s.is_leadership && s.status === 'active');
            select.innerHTML = '<option value="">Select staff member</option>' +
                nonLeaders.map(s => `<option value="${s.id}">${esc(s.first_name + ' ' + s.last_name)} (${esc(s.employee_id)})</option>`).join('');

            if (!nonLeaders.length) {
                showWarning('No active staff available. Create staff first.');
            }
        }

        const modal = document.getElementById('leader-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        const modal = document.getElementById('leader-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    /* ---------------- PHOTO ---------------- */

    function handlePhotoSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showError('Invalid file type. Use jpg, png, or webp.');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_BYTES) {
            showError('Image too large (max 2MB).');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            const base64 = dataUrl.split(',')[1];
            pendingPhoto = { base64, content_type: file.type };

            const preview = document.getElementById('leader-photo-preview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async function uploadPhoto() {
        if (!pendingPhoto) return null;
        const res = await NifeluxAPI.post('/staff?action=upload-photo', pendingPhoto);
        if (!res.success) throw new Error(res.error || 'Photo upload failed');
        return res.url;
    }

    /* ---------------- SAVE / REMOVE ---------------- */

    async function handleSave() {
        const saveBtn = document.getElementById('leader-save-btn');
        const staffId = editingStaffId || document.getElementById('leader-staff').value;
        const title = document.getElementById('leader-title').value.trim();

        if (!staffId) { showError('Select a staff member.'); return; }
        if (!title) { showError('Leadership title is required.'); return; }

        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            let photoUrl;
            if (pendingPhoto) {
                photoUrl = await uploadPhoto();
            }

            const payload = {
                is_leadership: true,
                leadership_title: title,
                leadership_bio: document.getElementById('leader-bio').value.trim(),
                display_order: parseInt(document.getElementById('leader-order').value, 10) || 100
            };
            if (photoUrl) payload.photo_url = photoUrl;

            const res = await NifeluxAPI.staff.update(staffId, payload);
            if (!res.success) throw new Error(res.error || 'Save failed');

            showSuccess('Leader saved — now visible on the About page');
            closeModal();
            await load();

        } catch (err) {
            console.error('Leader save error:', err);
            showError(`Save failed (${err.status || 'error'}): ${err.message || 'unknown error'}`);
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    async function removeLeader(staffId, name) {
        const confirmed = await confirmModal(
            `Remove ${name} from the leadership team? They remain a staff member.`,
            { title: 'Remove Leader', confirmText: 'Remove', confirmClass: 'btn-danger', type: 'warning' }
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.staff.update(staffId, { is_leadership: false });
            if (!res.success) throw new Error(res.error || 'Remove failed');
            showSuccess('Leader removed');
            await load();
        } catch (err) {
            showError('Remove failed: ' + (err.message || err));
        }
    }

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LeadershipManager.init);
} else {
    LeadershipManager.init();
}
