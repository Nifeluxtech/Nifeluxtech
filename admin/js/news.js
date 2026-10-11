/**
 * NIFELUX TECHNOLOGIES - NEWS MANAGEMENT (v2)
 * Create / edit / publish / unpublish / delete articles.
 * Featured image upload → Supabase Storage (news-images bucket).
 * Author defaults to the logged-in admin's full name (server-side).
 */

const NewsManager = (() => {
    'use strict';

    let articles = [];
    let editingId = null;
    let pendingImage = null; // { base64, content_type }

    const MAX_BYTES = 2 * 1024 * 1024;

    function esc(v) { return NifeluxUtils.sanitizeHTML(v == null ? '' : String(v)); }

    /* ---------------- INIT ---------------- */

    async function init() {
        const ok = await AdminCommon.init();
        if (!ok) return;

        document.getElementById('new-article-btn').addEventListener('click', () => openModal(null));
        document.getElementById('article-save-btn').addEventListener('click', handleSave);
        document.getElementById('article-image').addEventListener('change', handleImageSelect);

        const modal = document.getElementById('article-modal');
        modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));

        /* Row actions (delegated) */
        document.getElementById('news-table-body').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || btn.closest('.modal-container')) return;

            const id = btn.dataset.articleId;
            const action = btn.dataset.action;

            if (action === 'edit')      openModal(id);
            if (action === 'publish')   setStatus(id, 'published');
            if (action === 'unpublish') setStatus(id, 'draft');
            if (action === 'delete')    removeArticle(id, btn.dataset.title);
        });

        await load();
    }

    /* ---------------- LOAD / RENDER ---------------- */

    async function load() {
        try {
            const res = await NifeluxAPI.news.list();
            articles = (res.success && res.data) ? res.data : [];
        } catch (err) {
            console.error('News load error:', err);
            showError('Failed to load articles: ' + (err.message || err));
            articles = [];
        }
        render();
    }

    function render() {
        const tbody = document.getElementById('news-table-body');
        if (!tbody) return;

        if (!articles.length) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text-muted);">
                    No articles yet. Click "New Article" to write your first post.
                </td></tr>`;
            return;
        }

        tbody.innerHTML = articles.map(a => `
            <tr>
                <td>
                    <div class="table-cell-title">${esc(a.title)}</div>
                    <div class="table-cell-subtitle">${esc(NifeluxUtils.truncate(a.excerpt || '', 60))}</div>
                </td>
                <td><span class="badge badge-info">${esc(a.category)}</span></td>
                <td>${AdminCommon.getStatusBadge(a.status, 'news')}</td>
                <td>${a.author ? esc(a.author) : '—'}</td>
                <td>${a.published_at ? AdminCommon.formatDate(a.published_at) : '—'}</td>
                <td>
                    <div class="table-actions">
                        ${a.status === 'published'
                            ? `<button class="btn btn-ghost btn-sm" data-action="unpublish" data-article-id="${a.id}">Unpublish</button>`
                            : `<button class="btn btn-ghost btn-sm" data-action="publish" data-article-id="${a.id}">Publish</button>`}
                        <button class="btn btn-ghost btn-sm" data-action="edit" data-article-id="${a.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete" data-article-id="${a.id}" data-title="${esc(a.title)}">Del</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /* ---------------- MODAL ---------------- */

    function openModal(articleId) {
        editingId = articleId;
        pendingImage = null;

        const preview = document.getElementById('article-image-preview');
        const input = document.getElementById('article-image');
        input.value = '';
        preview.style.display = 'none';

        if (articleId) {
            const a = articles.find(x => x.id === articleId);
            if (!a) return;
            document.getElementById('article-modal-title').textContent = 'Edit Article';
            document.getElementById('article-title').value = a.title || '';
            document.getElementById('article-category').value = a.category || '';
            document.getElementById('article-status').value = a.status || 'draft';
            document.getElementById('article-excerpt').value = a.excerpt || '';
            document.getElementById('article-content').value = a.content || '';
            if (a.featured_image_url) {
                preview.src = a.featured_image_url;
                preview.style.display = 'block';
            }
        } else {
            document.getElementById('article-modal-title').textContent = 'New Article';
            document.getElementById('article-form').reset();
            document.getElementById('article-status').value = 'draft';
        }

        const modal = document.getElementById('article-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        const modal = document.getElementById('article-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    /* ---------------- IMAGE ---------------- */

    function handleImageSelect(e) {
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
            pendingImage = { base64: dataUrl.split(',')[1], content_type: file.type };
            const preview = document.getElementById('article-image-preview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /* ---------------- SAVE ---------------- */

    async function handleSave() {
        const saveBtn = document.getElementById('article-save-btn');

        const title = document.getElementById('article-title').value.trim();
        const category = document.getElementById('article-category').value;
        const content = document.getElementById('article-content').value.trim();

        if (!title || !category || !content) {
            showError('Title, category and content are required.');
            return;
        }

        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            const payload = {
                title,
                category,
                status: document.getElementById('article-status').value,
                excerpt: document.getElementById('article-excerpt').value.trim(),
                content
            };

            /* Upload featured image first if a new one was chosen */
            if (pendingImage) {
                const up = await NifeluxAPI.post('/news?action=upload-image', pendingImage);
                if (!up.success) throw new Error(up.error || 'Image upload failed');
                payload.featured_image_url = up.url;
            }

            let res;
            if (editingId) {
                res = await NifeluxAPI.news.update(editingId, payload);
            } else {
                res = await NifeluxAPI.news.create(payload); // author set server-side
            }

            if (!res.success) throw new Error(res.error || 'Save failed');

            showSuccess(editingId ? 'Article updated' : 'Article created');
            closeModal();
            await load();

        } catch (err) {
            console.error('Article save error:', err);
            showError(`Save failed (${err.status || 'error'}): ${err.message || 'unknown error'}`);
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    /* ---------------- PUBLISH / UNPUBLISH / DELETE ---------------- */

    async function setStatus(id, status) {
        try {
            const res = await NifeluxAPI.news.update(id, { status });
            if (!res.success) throw new Error(res.error || 'Update failed');
            showSuccess(status === 'published' ? 'Article published' : 'Article unpublished');
            await load();
        } catch (err) {
            showError('Update failed: ' + (err.message || err));
        }
    }

    async function removeArticle(id, title) {
        const confirmed = await confirmDelete(`Delete "${title}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            const res = await NifeluxAPI.news.delete(id);
            if (!res.success) throw new Error(res.error || 'Delete failed');
            showSuccess('Article deleted');
            await load();
        } catch (err) {
            showError('Delete failed: ' + (err.message || err));
        }
    }

    return { init, reload: load };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NewsManager.init);
} else {
    NewsManager.init();
}

window.NewsManager = NewsManager;
