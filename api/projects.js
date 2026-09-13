/**
 * /api/projects
 * GET    /api/projects         → List projects
 * POST   /api/projects         → Create project
 * PUT    /api/projects         → Update project
 * DELETE /api/projects?id=xxx  → Delete project
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    switch (req.method) {
        case 'GET': return handleList(req, res);
        case 'POST': return handleCreate(req, res);
        case 'PUT': return handleUpdate(req, res);
        case 'DELETE': return handleDelete(req, res);
        default: return errorResponse(res, 'Method not allowed', 405);
    }
};

async function handleList(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { category, status } = req.query;

        let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch projects', 500);

        return jsonResponse(res, { success: true, data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { title, description, category, status, launch_date, url, featured } = req.body;

        if (!title || !category) {
            return errorResponse(res, 'Title and category are required', 400);
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('projects')
            .insert({
                title: title.trim(),
                description: description || null,
                category,
                status: status || 'research',
                launch_date: launch_date || null,
                url: url || null,
                featured: featured || false,
                created_by: auth.user.id,
                updated_by: auth.user.id
            })
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to create project', 500);

        await logActivity(supabase, auth.user.id, 'project_created', 'projects', data.id,
            `Created project: ${data.title}`);

        return jsonResponse(res, { success: true, message: 'Project created', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, ...updateData } = req.body;
        if (!id) return errorResponse(res, 'Project ID is required', 400);

        const supabase = createAdminClient();

        const allowedFields = ['title', 'description', 'category', 'image_url', 'status', 'launch_date', 'url', 'featured'];
        const filteredData = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) filteredData[field] = updateData[field];
        });
        filteredData.updated_by = auth.user.id;

        const { data, error } = await supabase
            .from('projects')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update project', 500);

        await logActivity(supabase, auth.user.id, 'project_updated', 'projects', id,
            `Updated project: ${data.title}`);

        return jsonResponse(res, { success: true, message: 'Project updated', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Project ID is required', 400);

        const supabase = createAdminClient();

        const { data: project } = await supabase.from('projects').select('id, title').eq('id', id).single();
        if (!project) return errorResponse(res, 'Project not found', 404);

        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete project', 500);

        await logActivity(supabase, auth.user.id, 'project_deleted', 'projects', id,
            `Deleted project: ${project.title}`);

        return jsonResponse(res, { success: true, message: 'Project deleted' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
