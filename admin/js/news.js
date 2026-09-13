/**
 * NIFELUX TECHNOLOGIES - NEWS MANAGEMENT
 * News article CRUD operations
 */

const NewsManager = (() => {
    'use strict';

    let articles = [];
    let editingId = null;

    /**
     * Initialize news page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (!NifeluxAPI.isConfigured()) {
            loadDemoData();
        } else {
            loadArticles();
        }

        initEventListeners();
    }

    /**
     * Load articles from API
     */
    async function loadArticles() {
        try {
            const response = await NifeluxAPI.news.list();
            if (response.success) {
                articles = response.data;
                renderArticles(articles);
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
            showError('Failed to load articles');
            loadDemoData();
        }
    }

    /**
     * Load demo data
     */
    function loadDemoData() {
        articles = [
            {
                id: 'demo-1',
                title: 'Nifelux Expands AI Research Capabilities',
                excerpt: 'Major updates to our flagship NIRA AI platform bring enhanced capabilities.',
                category: 'AI',
                status: 'published',
                published_at: '2026-09-10T10:00:00Z',
                created_at: '2026-09-09T14:30:00Z'
            },
            {
                id: 'demo-2',
                title: 'Robotics Division Announces Partnership',
                excerpt: 'Strategic partnership to deploy automation systems across Nigerian facilities.',
                category: 'Robotics',
                status: 'published',
                published_at: '2026-08-28T09:00:00Z',
                created_at: '2026-08-27T16:00:00Z'
            },
            {
                id: 'demo-3',
                title: 'Quarterly Innovation Report',
                excerpt: 'Overview of our research progress and upcoming initiatives.',
                category: 'Company',
                status: 'draft',
                published_at: null,
                created_at: '2026-09-12T11:00:00Z'
            }
        ];

        renderArticles(articles);
        showInfo('Demo mode: Showing sample articles');
    }

    /**
     * Render articles table
     */
    function renderArticles(data) {
        const tbody = document.getElementById('news-table-body');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        No articles found. Create your first article to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(article => `
            <tr>
                <td>
                    <div class="table-cell-title">${NifeluxUtils.sanitizeHTML(article.title)}</div>
                    <div class="table-cell-subtitle">${NifeluxUtils.sanitizeHTML(NifeluxUtils.truncate(article.excerpt || '', 60))}</div>
                </td>
                <td><span class="badge badge-info">${NifeluxUtils.sanitizeHTML(article.category)}</span></td>
                <td>${getStatusBadge(article.status)}</td>
                <td>${article.published_at ? AdminCommon.formatDate(article.published_at) : '—'}</td>
                <td>
                    <div class="table-actions">
                        ${article.status === 'draft' ? `
                            <button class="btn btn-ghost btn-sm" onclick="NewsManager.publishArticle('${article.id}')" title="Publish">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                        ` : `
                            <button class="btn btn-ghost btn-sm" onclick="NewsManager.unpublishArticle('${article.id}')" title="Unpublish">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            </button>
                        `}
                        <button class="btn btn-ghost btn-sm" onclick="NewsManager.editArticle('${article.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-danger-ghost" onclick="NewsManager.deleteArticle('${article.id}', '${NifeluxUtils.sanitizeHTML(article.title)}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Get status badge
     */
    function getStatusBadge(status) {
        const badges = {
            draft: '<span class="badge badge-neutral">Draft</span>',
            published: '<span class="badge badge-success">Published</span>',
            archived: '<span class="badge badge-neutral">Archived</span>'
        };
        return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        const newBtn = document.getElementById('new-article-btn');
        if (newBtn) {
            newBtn.addEventListener('click', openCreateModal);
        }

        const saveBtn = document.getElementById('article-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        const modal = document.getElementById('article-modal');
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
        document.getElementById('article-modal-title').textContent = 'New Article';
        document.getElementById('article-save-btn').querySelector('.btn-text').textContent = 'Save Article';
        document.getElementById('article-form').reset();
        openModal_();
    }

    /**
     * Edit article
     */
    function editArticle(id) {
        const article = articles.find(a => a.id === id);
        if (!article) return;

        editingId = id;
        document.getElementById('article-modal-title').textContent = 'Edit Article';
        document.getElementById('article-save-btn').querySelector('.btn-text').textContent = 'Save Changes';

        document.getElementById('article-title').value = article.title;
        document.getElementById('article-category').value = article.category;
        document.getElementById('article-status').value = article.status;
        document.getElementById('article-excerpt').value = article.excerpt || '';
        document.getElementById('article-content').value = article.content || '';

        openModal_();
    }

    /**
     * Handle save
     */
    async function handleSave() {
        const title = document.getElementById('article-title').value.trim();
        const category = document.getElementById('article-category').value;
        const content = document.getElementById('article-content').value.trim();

        if (!title || !category || !content) {
            showError('Please fill in all required fields');
            return;
        }

        const formData = {
            title,
            category,
            status: document.getElementById('article-status').value,
            excerpt: document.getElementById('article-excerpt').value.trim(),
            content,
            author: NifeluxAuth.getDisplayName()
        };

        const saveBtn = document.getElementById('article-save-btn');
        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            let response;

            if (editingId) {
                response = await NifeluxAPI.news.update(editingId, formData);
            } else {
                response = await NifeluxAPI.news.create(formData);
            }

            if (response.success) {
                showSuccess(editingId ? 'Article updated' : 'Article created');
                closeModal();
                
                if (NifeluxAPI.isConfigured()) {
                    loadArticles();
                } else {
                    if (editingId) {
                        const idx = articles.findIndex(a => a.id === editingId);
                        if (idx > -1) articles[idx] = { ...articles[idx], ...formData };
                    } else {
                        articles.unshift({ 
                            id: 'demo-' + Date.now(), 
                            ...formData, 
                            published_at: formData.status === 'published' ? new Date().toISOString() : null,
                            created_at: new Date().toISOString()
                        });
                    }
                    renderArticles(articles);
                }
            }

        } catch (error) {
            showError(error.message || 'Failed to save article');
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    /**
     * Publish article
     */
    async function publishArticle(id) {
        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.news.publish(id);
            } else {
                const article = articles.find(a => a.id === id);
                if (article) {
                    article.status = 'published';
                    article.published_at = new Date().toISOString();
                }
            }
            showSuccess('Article published');
            renderArticles(articles);
        } catch (error) {
            showError(error.message || 'Failed to publish article');
        }
    }

    /**
     * Unpublish article
     */
    async function unpublishArticle(id) {
        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.news.unpublish(id);
            } else {
                const article = articles.find(a => a.id === id);
                if (article) {
                    article.status = 'draft';
                    article.published_at = null;
                }
            }
            showSuccess('Article unpublished');
            renderArticles(articles);
        } catch (error) {
            showError(error.message || 'Failed to unpublish article');
        }
    }

    /**
     * Delete article
     */
    async function deleteArticle(id, title) {
        const confirmed = await confirmDelete(
            `Are you sure you want to delete "${title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        try {
            if (NifeluxAPI.isConfigured()) {
                await NifeluxAPI.news.delete(id);
            } else {
                articles = articles.filter(a => a.id !== id);
            }
            showSuccess('Article deleted');
            renderArticles(articles);
        } catch (error) {
            showError(error.message || 'Failed to delete article');
        }
    }

    /**
     * Modal helpers
     */
    function openModal_() {
        const modal = document.getElementById('article-modal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeModal() {
        const modal = document.getElementById('article-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    return {
        init,
        openCreateModal,
        editArticle,
        publishArticle,
        unpublishArticle,
        deleteArticle
    };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NewsManager.init);
} else {
    NewsManager.init();
}

window.NewsManager = NewsManager;
