/**
 * NIFELUX TECHNOLOGIES - STAFF MANAGEMENT
 * Create / edit / activate / deactivate / delete staff.
 * Photo upload (jpg/png/webp ≤2MB) → Supabase Storage → photo_url,
 * which is then rendered on generated ID cards automatically.
 */

const StaffManager = (() => {
    'use strict';

    let staffList = [];
    let editingId = null;
    let pendingPhoto = null; // { base64, content_type }

    const MAX_BYTES = 2 * 1024 * 1024;

    function esc(v) { return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v)); }

    /* ---------------- INIT ---------------- */

    async function init() {
        const ok = await AdminCommon.init();
        if (!ok) return;

        document.getElementById('add-staff-btn').addEventListener('click', () => openModal(null));
        document.getElementById('staff-save-btn').addEventListener('click', handleSave);
        document.getElementById('sf-photo').addEventListener('change', handlePhotoSelect);

        const search = document.getElementById('staff-search');
        search.addEventListener('input', NifeluxUtils.debounce(() => load(), 350));
        document.getElementById('filter-department').addEventListener('change', () => load());
        document.getElementById('filter-status').addEventListener('change', () => load());

        const modal = document.getElementById('staff-modal');
        modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));

        /* Row actions (delegated) */
        document.getElementById('staff-table-body').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || btn.closest('.modal-container')) return;

            const id = btn.dataset.staffId;
            const action = btn.dataset.action;

            if (action === 'edit')     openModal(id);
            if (action === 'toggle')   toggleStatus(id, btn.dataset.name, btn.dataset.current);
            if (action === 'delete')   removeStaff(id, btn.dataset.name);
            if (action === 'idcard')   window.location.href = '/admin/id-cards.html';
        });

        await load();
    }

    /* ---------------- LOAD / RENDER ---------------- */

    async function load() {
        const params = { limit: 200 };
        const search = document.getElementById('staff-search').value.trim();
        const dept = document.getElementById('filter-department').value;
        const status = document.getElementById('filter-status').value;
        if (search) params.search = search;
        if (dept) params.department = dept;
        if (status) params.status = status;

        try {
            const res = await NifeluxAPI.staff.list(params);
            staffList = (res.success && res.data) ? res.data : [];
        } catch (err) {
            console.error('Staff load error:', err);
            showError('Failed to load staff: ' + (err.message || err));
            staffList = [];
        }
        render();
    }

    function initials(s) {
        return esc((s.first_name?.[0] || '') + (s.last_name?.[0] || '')) || '?';
    }

    function render() {
        const tbody = document.getElementById('staff-table-body');
        const count = document.getElementById('staff-count');

        count.textContent = `Showing ${staffList.length} staff member${staffList.length === 1 ? '' : 's'}`;

        if (!staffList.length) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--color-text-muted);">
                    No staff found. Click "Add Staff" to create the first record.
                </td></tr>`;
            return;
        }

        tbody.innerHTML = staffList.map(s => {
            const name = `${s.first_name} ${s.last_name}`;
            const thumb = s.photo_url
                ? `<img src="${esc(s.photo_url)}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:50%;border:1px solid var(--color-accent);vertical-align:middle;margin-right:10px;">`
                : `<span style="display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:50%;background:var(--color-bg-tertiary);border:1px solid var(--color-border);color:var(--color-text-subtle);font-size:11px;font-weight:700;vertical-align:middle;margin-right:10px;">${initials(s)}</span>`;

            return `
                <tr>
                    <td>
                        ${thumb}
                        <span style="vertical-align:middle;">
                            <div class="table-cell-title" style="display:inline;">${esc(name)}</div>
                            <div class="table-cell-subtitle">${esc(s.email || '')}</div>
                        </span>
                    </td>
                    <td><strong>${esc(s.employee_id)}</strong></td>
                    <td>${esc(s.department)}</td>
                    <td>${esc(s.position)}</td>
                    <td>${esc(s.employment_type)}</td>
                    <td>${AdminCommon.getStatusBadge(s.status, 'staff')}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-ghost btn-sm" data-action="edit" data-staff-id="${s.id}" title="Edit">Edit</button>
                            <button class="btn btn-ghost btn-sm" data-action="toggle" data-staff-id="${s.id}" data-name="${esc(name)}" data-current="${s.status}">
                                ${s.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-ghost btn-sm" data-action="idcard" title="ID Cards">ID</button>
                            <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete" data-staff-id="${s.id}" data-name="${esc(name)}" title="Delete">Del</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    /* ---------------- MODAL ---------------- */

    function openModal(staffId) {
        editingId = staffId;
        pendingPhoto = null;

        const preview = document.getElementById('sf-photo-preview');
        const photoInput = document.getElementById('sf-photo');
        photoInput.value = '';
        preview.style.display = 'none';

        if (staffId) {
            const s = staffList.find(x => x.id === staffId);
            if (!s) return;
            document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
            document.getElementById('sf-status-group').style.display = '';
            document.getElementById('sf-first').value = s.first_name || '';
            document.getElementById('sf-last').value = s.last_name || '';
            document.getElementById('sf-email').value = s.email || '';
            document.getElementById('sf-phone').value = s.phone || '';
            document.getElementById('sf-position').value = s.position || '';
            document.getElementById('sf-department').value = s.department || '';
            document.getElementById('sf-type').value = s.employment_type || 'Full Time';
            document.getElementById('sf-joindate').value = s.join_date ? String(s.join_date).slice(0, 10) : '';
            document.getElementById('sf-status').value = s.status || 'active';
            if (s.photo_url) {
                preview.src = s.photo_url;
                preview.style.display = 'block';
            }
        } else {
            document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
            document.getElementById('sf-status-group').style.display = 'none';
            document.getElementById('staff-form').reset();
            document.getElementById('sf-type').value = 'Full Time';
            document.getElementById('sf-joindate').value = new Date().toISOString().slice(0, 10);
        }

        const modal = document.getElementById('staff-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        const modal = document.getElementById('staff-modal');
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
            pendingPhoto = { base64: dataUrl.split(',')[1], content_type: file.type };
            const preview = document.getElementById('sf-photo-preview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /* ---------------- SAVE ---------------- */

    async function handleSave() {
        const saveBtn = document.getElementById('staff-save-btn');

        const payload = {
            first_name: document.getElementById('sf-first').value.trim(),
            last_name: document.getElementById('sf-last').value.trim(),
            email: document.getElementById('sf-email').value.trim(),
            phone: document.getElementById('sf-phone').value.trim(),
            position: document.getElementById('sf-position').value.trim(),
            department: document.getElementById('sf-department').value,
            employment_type: document.getElementById('sf-type').value,
            join_date: document.getElementById('sf-joindate').value || null
        };

        if (!payload.first_name || !payload.last_name || !payload.position || !payload.department) {
            showError('First name, last name, position and department are required.');
            return;
        }
        if (payload.email && !NifeluxUtils.isValidEmail(payload.email)) {
            showError('Please enter a valid email address.');
            return;
        }

        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            /* Upload photo first if a new one was chosen */
            if (pendingPhoto) {
                const up = await NifeluxAPI.post('/staff?action=upload-photo', pendingPhoto);
                if (!up.success) throw new Error(up.error || 'Photo upload failed');
                payload.photo_url = up.url;
            }

            let res;
            if (editingId) {
                payload.status = document.getElementById('sf-status').value;
                res = await NifeluxAPI.staff.update(editingId, payload);
            } else {
                res = await NifeluxAPI.staff.create(payload);
            }

            if (!res.success) throw new Error(res.error || 'Save failed');

            showSuccess(editingId
                ? 'Staff member updated'
                : `Staff created — Employee ID ${res.data?.employee_id || ''}`);
            closeModal();
            await load();

        } catch (err) {
            console.error('Staff save error:', err);
            showError(`Save failed (${err.status || 'error'}): ${err.message || 'unknown error'}`);
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    /* ---------------- TOGGLE / DELETE ---------------- */

    async function toggleStatus(id, name, current) {
        const next = current === 'active' ? 'inactive' : 'active';
        const confirmed = await confirmModal(
            `${next === 'active' ? 'Activate' : 'Deactivate'} ${name}?` +
            (next === 'inactive' ? ' Their ID card verification will show as inactive.' : ''),
            { title: next === 'active' ? 'Activate Staff' : 'Deactivate Staff',
              confirmText: next === 'active' ? 'Activate' : 'Deactivate',
              confirmClass: next === 'active' ? 'btn-primary' : 'btn-danger',
              type: 'warning' }
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.staff.update(id, { status: next });
            if (!res.success) throw new Error(res.error || 'Update failed');
            showSuccess(`Staff ${next === 'active' ? 'activated' : 'deactivated'}`);
            await load();
        } catch (err) {
            showError('Update failed: ' + (err.message || err));
        }
    }

    async function removeStaff(id, name) {
        const confirmed = await confirmDelete(
            `Delete ${name}? This also removes their ID card. This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.staff.delete(id);
            if (!res.success) throw new Error(res.error || 'Delete failed');
            showSuccess('Staff member deleted');
            await load();
        } catch (err) {
            showError('Delete failed: ' + (err.message || err));
        }
    }

    return { init, reload: load };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', StaffManager.init);
} else {
    StaffManager.init();
}

window.StaffManager = StaffManager;
