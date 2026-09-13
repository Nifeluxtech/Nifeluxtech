/**
 * /api/news
 * GET    /api/news?action=public  → Published articles only (no auth)
 * GET    /api/news                → Admin list
 * POST   /api/news                → Create (admin)
 * PUT    /api/news                → Update (admin)
 * DELETE /api/news?id=xxx         → Delete (admin)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'public') return handlePublicList(req, res);
    if (req.method === 'GET') return handleList(req, res);
    if (req.method === 'POST') return handleCreate(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);

    return errorResponse(res, 'Method not allowed', 405);
};

/**
 * PUBLIC: published articles only, safe fields only
 */
async function handlePublicList(req, res) {
    try {
        const supabase = createAdminClient();
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const { data, error } = await supabase
            .from('news')
            .select('title, slug, excerpt, featured_image_url, category, author, published_at')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) return jsonResponse(res, { success: true, data: [] });

        res.setHeader('Cache-Control', 'public, max-age=60');
        return jsonResponse(res, { success: true, data: data || [] });

    } catch (error) {
        return jsonResponse(res, { success: true, data: [] });
    }
}

/**
 * ADMIN: full list
 */
async function handleList(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { status, category } = req.query;

        let query = supabase.from('news').select('*').order('created_at', { ascending: false });
        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);

        const { data, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch articles', 500);

        return jsonResponse(res, { success: true, data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/**
 * ADMIN: create
 */
async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { title, excerpt, content, category, status, author } = req.body;

        if (!title || !content) {
            return errorResponse(res, 'Title and content are required', 400);
        }

        const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('news')
            .insert({
                title: String(title).trim(),
                slug,
                excerpt: excerpt || null,
                content,
                category: category || 'General',
                author: author || null,
                status: status || 'draft',
                published_at: status === 'published' ? new Date().toISOString() : null,
                created_by: auth.user.id,
                updated_by: auth.user.id
            })
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to create article', 500);

        await logActivity(supabase, auth.user.id,
            status === 'published' ? 'news_published' : 'news_created',
            'news', data.id, `Created article: ${data.title}`);

        return jsonResponse(res, { success: true, message: 'Article created', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/**
 * ADMIN: update
 */
async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, ...updateData } = req.body;
        if (!id) return errorResponse(res, 'Article ID is required', 400);

        const supabase = createAdminClient();

        if (updateData.title) {
            updateData.slug = String(updateData.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }

        if (updateData.status === 'published') {
            const { data: existing } = await supabase.from('news').select('status').eq('id', id).single();
            if (existing && existing.status !== 'published') {
                updateData.published_at = new Date().toISOString();
            }
        }

        const allowedFields = ['title', 'slug', 'excerpt', 'content', 'featured_image_url', 'category', 'author', 'status', 'published_at'];
        const filteredData = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) filteredData[field] = updateData[field];
        });
        filteredData.updated_by = auth.user.id;

        const { data, error } = await supabase
            .from('news')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update article', 500);

        await logActivity(supabase, auth.user.id,
            updateData.status === 'published' ? 'news_published' : 'news_updated',
            'news', id, `Updated article: ${data.title}`);

        return jsonResponse(res, { success: true, message: 'Article updated', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/**
 * ADMIN: delete
 */
async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Article ID is required', 400);

        const supabase = createAdminClient();

        const { data: article } = await supabase.from('news').select('id, title').eq('id', id).single();
        if (!article) return errorResponse(res, 'Article not found', 404);

        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete article', 500);

        await logActivity(supabase, auth.user.id, 'news_deleted', 'news', id, `Deleted article: ${article.title}`);

        return jsonResponse(res, { success: true, message: 'Article deleted' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
