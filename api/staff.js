/**
 * /api/staff
 * GET    /api/staff              → List all staff
 * GET    /api/staff?id=xxx       → Get single staff
 * POST   /api/staff              → Create staff
 * PUT    /api/staff              → Update staff
 * DELETE /api/staff?id=xxx       → Delete staff
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    switch (req.method) {
        case 'GET': return handleGet(req, res);
        case 'POST': return handleCreate(req, res);
        case 'PUT': return handleUpdate(req, res);
        case 'DELETE': return handleDelete(req, res);
        default: return errorResponse(res, 'Method not allowed', 405);
    }
};

async function handleGet(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { id, page = 1, limit = 20, department, status, search } = req.query;

        // Single staff member
        if (id) {
            const { data, error } = await supabase
                .from('staff')
                .select('*, id_card:id_cards(*)')
                .eq('id', id)
                .single();

            if (error || !data) return errorResponse(res, 'Staff member not found', 404);
            return jsonResponse(res, { success: true, data });
        }

        // List with filters
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

async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { first_name, last_name, email, phone, position, department, employment_type, join_date } = req.body;

        if (!first_name || !last_name || !position || !department) {
            return errorResponse(res, 'First name, last name, position, and department are required', 400);
        }

        const validDepartments = ['Executive', 'Robotics', 'Artificial Intelligence', 'Finance', 'Innovation', 'Engineering', 'Operations', 'Marketing', 'Administration'];
        if (!validDepartments.includes(department)) {
            return errorResponse(res, 'Invalid department', 400);
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('staff')
            .insert({
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email ? email.trim().toLowerCase() : null,
                phone: phone ? phone.trim() : null,
                position: position.trim(),
                department,
                employment_type: employment_type || 'Full Time',
                join_date: join_date || new Date().toISOString().split('T')[0],
                status: 'active',
                created_by: auth.user.id,
                updated_by: auth.user.id
            })
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to create staff member', 500);

        await logActivity(supabase, auth.user.id, 'staff_created', 'staff', data.id,
            `Created staff member: ${data.first_name} ${data.last_name} (${data.employee_id})`);

        return jsonResponse(res, { success: true, message: 'Staff member created', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, ...updateData } = req.body;
        if (!id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department', 'employment_type', 'join_date', 'status', 'photo_url', 'notes'];
        const filteredData = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) filteredData[field] = updateData[field];
        });
        filteredData.updated_by = auth.user.id;

        const { data, error } = await supabase
            .from('staff')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update staff member', 500);

        await logActivity(supabase, auth.user.id, 'staff_updated', 'staff', id,
            `Updated staff member: ${data.first_name} ${data.last_name}`);

        return jsonResponse(res, { success: true, message: 'Staff member updated', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const { data: staff } = await supabase
            .from('staff')
            .select('id, first_name, last_name, employee_id')
            .eq('id', id)
            .single();

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
