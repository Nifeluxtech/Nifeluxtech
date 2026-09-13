/**
 * NIFELUX TECHNOLOGIES - PUBLIC DYNAMIC CONTENT
 * Hydrates the homepage "Featured Projects" section with real
 * database projects. If there are none (or the backend is
 * unreachable), the section stays hidden — no fake content.
 */

const NifeluxPublicContent = (() => {
    'use strict';

    const STATUS_MAP = {
        research: ['status-research', 'Research'],
        development: ['status-development', 'Development'],
        active: ['status-active', 'Active'],
        coming_soon: ['status-coming-soon', 'Coming Soon']
    };

    function esc(value) {
        return NifeluxUtils.sanitizeHTML(value == null ? '' : String(value));
    }

    function safeImage(url) {
        const u = String(url || '');
        return /^(https?:\/\/|\/)/i.test(u) ? u : '';
    }

    function statusBadge(status) {
        const [cls, label] = STATUS_MAP[status] || ['status-development', esc(status)];
        return `<span class="project-status ${cls}">${label}</span>`;
    }

    function cardHTML(project) {
        const img = safeImage(project.image_url);
        const media = img
            ? `<img src="${esc(img)}" alt="${esc(project.title)}" loading="lazy">`
            : `<div class="project-placeholder" aria-hidden="true"></div>`;

        const desc = NifeluxUtils.truncate(project.description || '', 140);

        return `
            <article class="project-card" tabindex="0">
                <div class="project-card-image">
                    ${media}
                    ${statusBadge(project.status)}
                </div>
                <div class="project-card-body">
                    <span class="project-category">${esc(project.category)}</span>
                    <h3 class="project-title">${esc(project.title)}</h3>
                    <p class="project-desc">${esc(desc)}</p>
                </div>
            </article>
        `;
    }

    /**
     * Load and render homepage featured projects
     */
    async function loadHomeProjects() {
        const section = document.getElementById('home-projects-section');
        const grid = document.getElementById('home-projects-grid');
        if (!section || !grid) return; // not on homepage

        try {
            const response = await fetch('/api/projects?action=public&limit=3');
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const json = await response.json();
            const projects = (json.success && Array.isArray(json.data)) ? json.data : [];

            if (projects.length === 0) {
                section.hidden = true;   // nothing configured → hide section
                return;
            }

            grid.innerHTML = projects.map(cardHTML).join('');
            section.hidden = false;

        } catch (error) {
            console.warn('Featured projects unavailable:', error);
            section.hidden = true;       // fail silent, never show fake data
        }
    }

    function init() {
        loadHomeProjects();
    }

    return { init, loadHomeProjects };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxPublicContent.init);
} else {
    NifeluxPublicContent.init();
}

window.NifeluxPublicContent = NifeluxPublicContent;
