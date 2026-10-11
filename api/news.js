/**
 * /api/news
 * GET    /api/news?action=public            → Public: published articles (list)
 * GET    /api/news?action=public&slug=xxx   → Public: single published article (with content)
 * GET    /api/news                          → Admin: list all articles
 * POST   /api/news                          → Admin: create article (author defaults to admin full name)
 * POST   /api/news?action=upload-image      → Admin: upload featured image { base64, content_type }
 * PUT    /api/news                          → Admin: update article
 * DELETE /api/news?id=xxx                   → Admin: delete article
 *
 * NOTE: Only requires ./_config — no other local modules.
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'public') return handlePublic(req, res);
    if (req.method === 'GET') return handleList(req, res);
    if (req.method === 'POST' && action === 'upload-image') return handleUploadImage(req, res);
    if (req.method === 'POST') return handleCreate(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);

    return errorResponse(res, 'Method not allowed', 405);
};

/* ==========================================================
   PUBLIC ENDPOINTS (no auth)
   ========================================================== */

async function handlePublic(req, res) {
    try {
        const supabase = createAdminClient();
        const { slug } = req.query;

        /* ---- Single published article ---- */
        if (slug) {
            const { data, error } = await supabase
                .from('news')
                .select('title, slug, excerpt, content, featured_image_url, category, author, published_at')
                .eq('status', 'published')
                .eq('slug', slug)
                .single();

            if (error || !data) {
                return jsonResponse(res, { success: false, data: null });
            }

            res.setHeader('Cache-Control', 'public, max-age=60');
            return jsonResponse(res, { success: true, data });
        }

        /* ---- List of published articles ---- */
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const { data, error } = await supabase
            .from('news')
            .select('title, slug, excerpt, featured_image_url, category, author, published_at')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) {
            return jsonResponse(res, { success: true, data: [] });
        }

        res.setHeader('Cache-Control', 'public, max-age=60');
        return jsonResponse(res, { success: true, data: data || [] });

    } catch (error) {
        /* Supabase not configured → empty, public site shows empty state */
        return jsonResponse(res, { success: true, data: [] });
    }
}

/* ==========================================================
   ADMIN: LIST
   ========================================================== */

async function handleList(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { status, category } = req.query;

        let query = supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);

        const { data, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch articles', 500);

        return jsonResponse(res, { success: true, data });

    } catch (error) {
        console.error('News list error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ==========================================================
   ADMIN: UPLOAD FEATURED IMAGE
   ========================================================== */

async function handleUploadImage(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { base64, content_type } = req.body || {};

        if (!base64 || !content_type) {
            return errorResponse(res, 'base64 and content_type are required', 400);
        }
        if (!ALLOWED_IMAGE_TYPES.includes(content_type)) {
            return errorResponse(res, 'Invalid image type. Allowed: jpg, png, webp', 400);
        }

        const buffer = Buffer.from(base64, 'base64');
        if (buffer.length > MAX_IMAGE_BYTES) {
            return errorResponse(res, 'Image too large (max 2MB)', 400);
        }

        const ext = content_type === 'image/jpeg' ? 'jpg' : content_type.split('/')[1];
        const path = `articles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const supabase = createAdminClient();

        const { error } = await supabase.storage
            .from('news-images')
            .upload(path, buffer, { contentType: content_type, upsert: false });

        if (error) {
            console.error('News image upload error:', error);
            return errorResponse(res, 'Failed to upload image', 500);
        }

        const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(path);

        await logActivity(supabase, auth.user.id, 'news_image_uploaded', 'storage', null, `Uploaded article image: ${path}`);

        return jsonResponse(res, { success: true, url: urlData.publicUrl });

    } catch (error) {
        console.error('News image upload error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ==========================================================
   ADMIN: CREATE
   ========================================================== */

async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { title, excerpt, content, category, status, author, featured_image_url } = req.body;

        if (!title || !content) {
            return errorResponse(res, 'Title and content are required', 400);
        }

        const supabase = createAdminClient();

        /* Default author = admin's profile full name */
        let authorName = author || null;
        if (!authorName) {
            const { data: prof } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', auth.user.id)
                .single();
            authorName = prof?.full_name || null;
        }

        /* Ensure slug uniqueness */
        const baseSlug = makeSlug(title);
        let finalSlug = baseSlug;
        let suffix = 2;
        for (;;) {
            const { data: dup } = await supabase.from('news').select('id').eq('slug', finalSlug).single();
            if (!dup) break;
            finalSlug = `${baseSlug}-${suffix++}`;
        }

        const { data, error } = await supabase
            .from('news')
            .insert({
                title: String(title).trim(),
                slug: finalSlug,
                excerpt: excerpt || null,
                content,
                featured_image_url: featured_image_url || null,
                category: category || 'General',
                author: authorName,
                status: status || 'draft',
                published_at: status === 'published' ? new Date().toISOString() : null,
                created_by: auth.user.id,
                updated_by: auth.user.id
            })
            .select()
            .single();

        if (error) {
            console.error('News create error:', error);
            return errorResponse(res, 'Failed to create article', 500);
        }

        await logActivity(
            supabase,
            auth.user.id,
            status === 'published' ? 'news_published' : 'news_created',
            'news',
            data.id,
            `${status === 'published' ? 'Published' : 'Created'} article: ${data.title}`
        );

        return jsonResponse(res, { success: true, message: 'Article created', data });

    } catch (error) {
        console.error('News create error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ==========================================================
   ADMIN: UPDATE
   ========================================================== */

async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, ...updateData } = req.body;
        if (!id) return errorResponse(res, 'Article ID is required', 400);

        const supabase = createAdminClient();

        /* Regenerate slug if title changed */
        if (updateData.title) {
            updateData.slug = makeSlug(updateData.title);
        }

        /* Set published_at when transitioning to published */
        if (updateData.status === 'published') {
            const { data: existing } = await supabase
                .from('news')
                .select('status, published_at')
                .eq('id', id)
                .single();

            if (existing && existing.status !== 'published') {
                updateData.published_at = new Date().toISOString();
            }
        }

        const filteredData = pickFields(updateData, [
            'title', 'slug', 'excerpt', 'content', 'featured_image_url',
            'category', 'author', 'status', 'published_at'
        ]);
        filteredData.updated_by = auth.user.id;

        const { data, error } = await supabase
            .from('news')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update article', 500);

        await logActivity(
            supabase,
            auth.user.id,
            updateData.status === 'published' ? 'news_published' : 'news_updated',
            'news',
            id,
            `${updateData.status === 'published' ? 'Published' : 'Updated'} article: ${data.title}`
        );

        return jsonResponse(res, { success: true, message: 'Article updated', data });

    } catch (error) {
        console.error('News update error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ==========================================================
   ADMIN: DELETE
   ========================================================== */

async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Article ID is required', 400);

        const supabase = createAdminClient();

        const { data: article } = await supabase
            .from('news')
            .select('id, title')
            .eq('id', id)
            .single();

        if (!article) return errorResponse(res, 'Article not found', 404);

        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete article', 500);

        await logActivity(supabase, auth.user.id, 'news_deleted', 'news', id, `Deleted article: ${article.title}`);

        return jsonResponse(res, { success: true, message: 'Article deleted' });

    } catch (error) {
        console.error('News delete error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ==========================================================
   HELPERS
   ========================================================== */

function makeSlug(title) {
    return String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 120) || 'article';
}

function pickFields(source, allowed) {
    const out = {};
    allowed.forEach(field => {
        if (source[field] !== undefined) out[field] = source[field];
    });
    return out;
}
