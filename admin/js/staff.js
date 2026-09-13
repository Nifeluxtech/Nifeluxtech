/**
 * NIFELUX TECHNOLOGIES - STAFF MANAGEMENT
 * Staff listing, search, and actions
 */

const StaffManager = (() => {
    'use strict';

    let staffData = [];
    let currentPage = 1;
    let totalPages = 1;
    const perPage = 10;

    /**
     * Initialize staff page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadStaff();
        }

        initSearch();
        initFilters();
    }

    /**
     * Load staff from API
     */
    async function loadStaff(page = 1) {
        currentPage = page;

        try {
            const response = await NifeluxAPI.staff.list({
                page,
                limit: perPage
            });

            if (response.success) {
                staffData = response.data;
                totalPages = response.pagination.pages;
                renderStaffTable(staffData);
                renderPagination(response.pagination);
            }

        } catch (error) {
            console.error('Failed to load staff:', error);
            showError('Failed to load staff data');
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        staffData = [
            {
                id: 'demo-1',
                employee_id: 'NFX-EMP-0001',
                first_name: 'John',
                last_name: 'Doe',
                department: 'Engineering',
                position: 'Senior Developer',
                employment_type: 'Full Time',
                status: 'active'
            },
            {
                id: 'demo-2',
                employee_id: 'NFX-EMP-0002',
                first_name: 'Jane',
                last_name: 'Smith',
                department: 'Artificial Intelligence',
                position: 'AI Researcher',
                employment_type: 'Full Time',
                status: 'active'
            },
            {
                id: 'demo-3',
                employee_id: 'NFX-EMP-0003',
                first_name: 'Bob',
                last_name: 'Johnson',
                department: 'Finance',
                position: 'Financial Analyst',
                employment_type: 'Contractor',
                status: 'inactive'
            }
        ];

        renderStaffTable(staffData);
        showInfo('Demo mode: Showing sample data');
    }

    /**
     * Render staff table
     */
    function renderStaffTable(staff) {
        const tbody = document.getElementById('staff-table-body');
        if (!tbody) return;

        if (!staff || staff.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        No staff members found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = staff.map(member => `
            <tr>
                <td>
                    <div class="table-user">
                        <div class="table-user-avatar">${member.first_name[0]}${member.last_name[0]}</div>
                        <div class="table-user-info">
                            <span class="table-user-name">${NifeluxUtils.sanitizeHTML(member.first_name)} ${NifeluxUtils.sanitizeHTML(member.last_name)}</span>
                            <span class="table-user-email">${NifeluxUtils.sanitizeHTML(member.email || '—')}</span>
                        </div>
                    </div>
                </td>
                <td><span class="employee-id-badge">${NifeluxUtils.sanitizeHTML(member.employee_id)}</span></td>
                <td>${NifeluxUtils.sanitizeHTML(member.department)}</td>
                <td>${NifeluxUtils.sanitizeHTML(member.position)}</td>
                <td>${NifeluxUtils.sanitizeHTML(member.employment_type)}</td>
                <td>${AdminCommon.getStatusBadge(member.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-sm" onclick="StaffManager.editStaff('${member.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="StaffManager.generateId('${member.id}')" title="Generate ID Card">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h6M14 14h4"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="StaffManager.deleteStaff('${member.id}', '${member.first_name} ${member.last_name}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render pagination
     */
    function renderPagination(pagination) {
        const info = document.getElementById('pagination-info');
        const buttons = document.getElementById('pagination-buttons');

        if (info) {
            info.textContent = `Showing ${pagination.total} staff members`;
        }

        if (buttons && pagination.pages > 1) {
            let html = '';

            if (pagination.page > 1) {
                html += `<button class="btn btn-outline btn-sm" onclick="StaffManager.loadPage(${pagination.page - 1})">Prev</button>`;
            }

            for (let i = 1; i <= pagination.pages; i++) {
                if (i === pagination.page) {
                    html += `<button class="btn btn-primary btn-sm">${i}</button>`;
                } else if (i === 1 || i === pagination.pages || Math.abs(i - pagination.page) <= 2) {
                    html += `<button class="btn btn-outline btn-sm" onclick="StaffManager.loadPage(${i})">${i}</button>`;
                } else if (Math.abs(i - pagination.page) === 3) {
                    html += `<span class="pagination-ellipsis">...</span>`;
                }
            }

            if (pagination.page < pagination.pages) {
                html += `<button class="btn btn-outline btn-sm" onclick="StaffManager.loadPage(${pagination.page + 1})">Next</button>`;
            }

            buttons.innerHTML = html;
        }
    }

    /**
     * Load specific page
     */
    function loadPage(page) {
        loadStaff(page);
    }

    /**
     * Initialize search
     */
    function initSearch() {
        const searchInput = document.getElementById('staff-search');
        if (!searchInput) return;

        const debouncedSearch = NifeluxUtils.debounce(async (query) => {
            if (!query) {
                loadStaff(1);
                return;
            }

            try {
                const response = await NifeluxAPI.staff.list({ search: query });
                if (response.success) {
                    renderStaffTable(response.data);
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }

    /**
     * Initialize filters
     */
    function initFilters() {
        const deptFilter = document.getElementById('filter-department');
        const statusFilter = document.getElementById('filter-status');

        if (deptFilter) {
            deptFilter.addEventListener('change', () => applyFilters());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => applyFilters());
        }
    }

    /**
     * Apply filters
     */
    async function applyFilters() {
        const dept = document.getElementById('filter-department')?.value;
        const status = document.getElementById('filter-status')?.value;

        try {
            const params = {};
            if (dept) params.department = dept;
            if (status) params.status = status;

            const response = await NifeluxAPI.staff.list(params);
            if (response.success) {
                renderStaffTable(response.data);
            }
        } catch (error) {
            console.error('Filter error:', error);
        }
    }

    /**
     * Edit staff member
     */
    function editStaff(id) {
        window.location.href = `/admin/staff-edit.html?id=${id}`;
    }

    /**
     * Generate ID card for staff
     */
    async function generateId(staffId) {
        const confirmed = await confirmModal(
            'Generate an ID card for this staff member?',
            {
                title: 'Generate ID Card',
                confirmText: 'Generate',
                confirmClass: 'btn-primary'
            }
        );

        if (!confirmed) return;

        try {
            const response = await NifeluxAPI.id.create(staffId);
            if (response.success) {
                showSuccess(`ID card created: ${response.data.employee_id}`);
            }
        } catch (error) {
            showError(error.message || 'Failed to generate ID card');
        }
    }

    /**
     * Delete staff member
     */
    async function deleteStaff(id, name) {
        const confirmed = await confirmDelete(
            `Are you sure you want to delete ${name}? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const response = await NifeluxAPI.staff.delete(id);
            if (response.success) {
                showSuccess('Staff member deleted');
                loadStaff(currentPage);
            }
        } catch (error) {
            showError(error.message || 'Failed to delete staff member');
        }
    }

    return {
        init,
        loadPage,
        editStaff,
        generateId,
        deleteStaff
    };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', StaffManager.init);
} else {
    StaffManager.init();
}

window.StaffManager = StaffManager;
