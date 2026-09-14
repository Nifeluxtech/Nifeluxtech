/**
 * /api/staff
 * GET    /api/staff?action=leaders        → PUBLIC: leadership profiles (safe fields)
 * GET    /api/staff                       → Admin: list staff
 * GET    /api/staff?id=xxx                → Admin: single staff
 * POST   /api/staff                       → Admin: create staff
 * POST   /api/staff?action=upload-photo   → Admin: upload photo { base64, content_type }
 * PUT    /api/staff                       → Admin: update staff (incl. leadership fields)
 * DELETE /api/staff?id=xxx                → Admin: delete staff
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'leaders') return handlePublicLeaders(req, res);
    if (req.method === 'GET') return handleGet(req, res);
    if (req.method === 'POST' && action === 'upload-photo') return handleUploadPhoto(req, res);
    if (req.method === 'POST') return handleCreate(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);

    return errorResponse(res, 'Method not allowed', 405);
};

/* ---------------- PUBLIC LEADERS ---------------- */
async function handlePublicLeaders(req, res) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('staff')
            .select('first_name, last_name, leadership_title, leadership_bio, photo_url, display_order, position, department')
            .eq('is_leadership', true)
            .eq('status', 'active')
            .order('display_order', { ascending: true })
            .limit(12);

        if (error) return jsonResponse(res, { success: true, data: [] });

        res.setHeader('Cache-Control', 'public, max-age=60');
        return jsonResponse(res, { success: true, data: data || [] });

    } catch (error) {
        return jsonResponse(res, { success: true, data: [] });
    }
}

/* ---------------- ADMIN LIST / GET ---------------- */
async function handleGet(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { id, page = 1, limit = 20, department, status, search } = req.query;

        if (id) {
            const { data, error } = await supabase
                .from('staff')
                .select('*, id_card:id_cards(*)')
                .eq('id', id)
                .single();
            if (error || !data) return errorResponse(res, 'Staff member not found', 404);
            return jsonResponse(res, { success: true, data });
        }

        let query = supabase
            .from('staff')
            .select('*', { count: 'exact' })
            .order('last_name', { ascending: true });

        if (department) query = query.eq('department', department);
        if (status) query = query.eq('status', status);
        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_id.ilike.%${search}%`);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;
        if (error) return errorResponse(res, 'Failed to fetch staff', 500);

        return jsonResponse(res, {
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN UPLOAD PHOTO ---------------- */
async function handleUploadPhoto(req, res) {
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
        const path = `leadership/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const supabase = createAdminClient();

        const { error } = await supabase.storage
            .from('staff-photos')
            .upload(path, buffer, { contentType: content_type, upsert: false });

        if (error) {
            console.error('Upload error:', error);
            return errorResponse(res, 'Failed to upload image', 500);
        }

        const { data: urlData } = supabase.storage.from('staff-photos').getPublicUrl(path);

        await logActivity(supabase, auth.user.id, 'photo_uploaded', 'storage', null, `Uploaded staff photo: ${path}`);

        return jsonResponse(res, { success: true, url: urlData.publicUrl });

    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN CREATE ---------------- */
async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { first_name, last_name, email, phone, position, department, employment_type, join_date } = req.body;

        if (!first_name || !last_name || !position || !department) {
            return errorResponse(res, 'First name, last name, position, and department are required', 400);
        }

        const supabase = createAdminClient();

        const insertData = pickFields(req.body, [
            'first_name', 'last_name', 'email', 'phone', 'position', 'department',
            'employment_type', 'join_date', 'photo_url', 'notes',
            'is_leadership', 'leadership_title', 'leadership_bio', 'display_order'
        ]);
        insertData.status = 'active';
        insertData.created_by = auth.user.id;
        insertData.updated_by = auth.user.id;

        const { data, error } = await supabase.from('staff').insert(insertData).select().single();
        if (error) return errorResponse(res, 'Failed to create staff member', 500);

        await logActivity(supabase, auth.user.id, 'staff_created', 'staff', data.id,
            `Created staff member: ${data.first_name} ${data.last_name} (${data.employee_id})`);

        return jsonResponse(res, { success: true, message: 'Staff member created', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN UPDATE ---------------- */
async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, ...updateData } = req.body;
        if (!id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const filteredData = pickFields(updateData, [
            'first_name', 'last_name', 'email', 'phone', 'position', 'department',
            'employment_type', 'join_date', 'status', 'photo_url', 'notes',
            'is_leadership', 'leadership_title', 'leadership_bio', 'display_order'
        ]);
        filteredData.updated_by = auth.user.id;

        const { data, error } = await supabase.from('staff').update(filteredData).eq('id', id).select().single();
        if (error) return errorResponse(res, 'Failed to update staff member', 500);

        await logActivity(supabase, auth.user.id, 'staff_updated', 'staff', id,
            `Updated staff member: ${data.first_name} ${data.last_name}`);

        return jsonResponse(res, { success: true, message: 'Staff member updated', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN DELETE ---------------- */
async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const { data: staff } = await supabase.from('staff').select('id, first_name, last_name, employee_id').eq('id', id).single();
        if (!staff) return errorResponse(res, 'Staff member not found', 404);

        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete staff member', 500);

        await logActivity(supabase, auth.user.id, 'staff_deleted', 'staff', id,
            `Deleted staff member: ${staff.first_name} ${staff.last_name} (${staff.employee_id})`);

        return jsonResponse(res, { success: true, message: 'Staff member deleted' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- HELPER ---------------- */
function pickFields(source, allowed) {
    const out = {};
    allowed.forEach(field => {
        if (source[field] !== undefined) out[field] = source[field];
    });
    return out;
}
