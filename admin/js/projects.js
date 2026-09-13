/**
 * NIFELUX TECHNOLOGIES - PROJECT MANAGEMENT
 * Project CRUD operations and UI management
 */

const ProjectsManager = (() => {
    'use strict';

    let projects = [];
    let editingId = null;

    /**
     * Initialize projects page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadProjects();
        }

        initEventListeners();
    }

    /**
     * Load projects from API
     */
    async function loadProjects() {
        try {
            const response = await NifeluxAPI.projects.list();
            if (response.success) {
                projects = response.data;
                renderProjects(projects);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            showError('Failed to load projects');
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        projects = [
            {
                id: 'demo-1',
                title: 'NIRA AI Platform',
                description: 'Our flagship intelligent assistant designed for education, career development, and conversational AI.',
                category: 'Artificial Intelligence',
                status: 'active',
                featured: true,
                launch_date: '2025-06-15'
            },
            {
                id: 'demo-2',
                title: 'Nifelux Automation System',
                description: 'Intelligent automation systems designed for industrial and commercial applications.',
                category: 'Robotics',
                status: 'development',
                featured: false,
                launch_date: null
            },
            {
                id: 'demo-3',
                title: 'Digital Finance Infrastructure',
                description: 'Next-generation financial technology solutions for Africa.',
                category: 'Finance',
                status: 'coming_soon',
                featured: false,
                launch_date: '2026-12-01'
            }
        ];

        renderProjects(projects);
        showInfo('Demo mode: Showing sample projects');
    }

    /**
     * Render projects grid
     */
    function renderProjects(data) {
        const grid = document.getElementById('projects-grid');
        const emptyState = document.getElementById('empty-state');

        if (!grid) return;

        if (!data || data.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = data.map(project => `
            <div class="admin-card">
                <div class="admin-card-header">
                    <div class="admin-card-badges">
                        ${getStatusBadge(project.status)}
                        ${project.featured ? '<span class="badge badge-info">Featured</span>' : ''}
                    </div>
                    <div class="admin-card-actions">
                        <button class="btn btn-ghost btn-sm" onclick="ProjectsManager.editProject('${project.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="ProjectsManager.deleteProject('${project.id}', '${NifeluxUtils.sanitizeHTML(project.title)}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="admin-card-body">
                    <span class="admin-card-category">${NifeluxUtils.sanitizeHTML(project.category)}</span>
                    <h3 class="admin-card-title">${NifeluxUtils.sanitizeHTML(project.title)}</h3>
                    <p class="admin-card-desc">${NifeluxUtils.sanitizeHTML(NifeluxUtils.truncate(project.description, 120))}</p>
                </div>
                <div class="admin-card-footer">
                    ${project.launch_date ? `<span class="admin-card-date">Launch: ${AdminCommon.formatDate(project.launch_date)}</span>` : '<span class="admin-card-date">No launch date</span>'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        const badges = {
            research: '<span class="badge badge-info">Research</span>',
            development: '<span class="badge badge-warning">Development</span>',
            active: '<span class="badge badge-success">Active</span>',
            coming_soon: '<span class="badge badge-info">Coming Soon</span>',
            archived: '<span class="badge badge-neutral">Archived</span>'
        };
        return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        const newBtn = document.getElementById('new-project-btn');
        if (newBtn) {
            newBtn.addEventListener('click', openCreateModal);
        }

        const saveBtn = document.getElementById('project-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        // Close modal on overlay/close click
        const modal = document.getElementById('project-modal');
        if (modal) {
            modal.querySelectorAll('[data-close]').forEach(el => {
                el.addEventListener('click', closeModal);
            });
        }
    }

    /**
     * Open create modal
     */
    function openCreateModal() {
        editingId = null;
        document.getElementById('project-modal-title').textContent = 'New Project';
        document.getElementById('project-save-btn').querySelector('.btn-text').textContent = 'Create Project';
        document.getElementById('project-form').reset();
        openModal_();
    }

    /**
     * Edit project
     */
    function editProject(id) {
        const project = projects.find(p => p.id === id);
        if (!project) return;

        editingId = id;
        document.getElementById('project-modal-title').textContent = 'Edit Project';
        document.getElementById('project-save-btn').querySelector('.btn-text').textContent = 'Save Changes';

        // Populate form
        document.getElementById('proj-title').value = project.title;
        document.getElementById('proj-category').value = project.category;
        document.getElementById('proj-status').value = project.status;
        document.getElementById('proj-launch-date').value = project.launch_date || '';
        document.getElementById('proj-url').value = project.url || '';
        document.getElementById('proj-description').value = project.description;
        document.getElementById('proj-featured').checked = project.featured;

        openModal_();
    }

    /**
     * Handle save (create or update)
     */
    async function handleSave() {
        const title = document.getElementById('proj-title').value.trim();
        const category = document.getElementById('proj-category').value;
        const status = document.getElementById('proj-status').value;
        const description = document.getElementById('proj-description').value.trim();

        // Validate
        if (!title || !category || !status || !description) {
            showError('Please fill in all required fields');
            return;
        }

        const formData = {
            title,
            category,
            status,
            description,
            launch_date: document.getElementById('proj-launch-date').value || null,
            url: document.getElementById('proj-url').value.trim() || null,
            featured: document.getElementById('proj-featured').checked
        };

        const saveBtn = document.getElementById('project-save-btn');
        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            let response;

            if (editingId) {
                response = await NifeluxAPI.projects.update(editingId, formData);
            } else {
                response = await NifeluxAPI.projects.create(formData);
            }

            if (response.success) {
                showSuccess(editingId ? 'Project updated successfully' : 'Project created successfully');
                closeModal();
                
                if (NifeluxAPI.isConfigured()) {
                    loadProjects();
                } else {
                    // Update local demo data
                    if (editingId) {
                        const idx = projects.findIndex(p => p.id === editingId);
                        if (idx > -1) projects[idx] = { ...projects[idx], ...formData };
                    } else {
                        projects.unshift({ id: 'demo-' + Date.now(), ...formData });
                    }
                    renderProjects(projects);
                }
            }

        } catch (error) {
            console.error('Project save error:', error);
            showError(error.message || 'Failed to save project');
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    /**
     * Delete project
     */
    async function deleteProject(id, title) {
        const confirmed = await confirmDelete(
            `Are you sure you want to delete "${title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            if (NifeluxAPI.isConfigured()) {
                const response = await NifeluxAPI.projects.delete(id);
                if (response.success) {
                    showSuccess('Project deleted');
                    loadProjects();
                }
            } else {
                // Demo mode
                projects = projects.filter(p => p.id !== id);
                renderProjects(projects);
                showSuccess('Project deleted (demo mode)');
            }
        } catch (error) {
            showError(error.message || 'Failed to delete project');
        }
    }

    /**
     * Open modal helper
     */
    function openModal_() {
        const modal = document.getElementById('project-modal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Close modal helper
     */
    function closeModal() {
        const modal = document.getElementById('project-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    return {
        init,
        openCreateModal,
        editProject,
        deleteProject
    };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ProjectsManager.init);
} else {
    ProjectsManager.init();
}

window.ProjectsManager = ProjectsManager;
