/**
 * /api/id
 * GET  /api/id?action=verify&id=NFX-EMP-0001  → Public verification
 * POST /api/id?action=create                   → Generate ID card (admin)
 * POST /api/id?action=deactivate               → Deactivate ID (admin)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'verify') return handleVerify(req, res);
    if (req.method === 'POST' && action === 'create') return handleCreate(req, res);
    if (req.method === 'POST' && action === 'deactivate') return handleDeactivate(req, res);

    return errorResponse(res, 'Invalid request', 400);
};

async function handleVerify(req, res) {
    try {
        const { id } = req.query;

        if (!id) return errorResponse(res, 'ID parameter is required', 400);

        const idRegex = /^NFX-EMP-\d{4,}$/i;
        if (!idRegex.test(id)) {
            return jsonResponse(res, { success: false, status: 'invalid', message: 'Invalid ID format' });
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('id_cards')
            .select(`
                employee_id,
                status,
                generated_at,
                staff:staff_id (
                    first_name,
                    last_name,
                    position,
                    department,
                    status
                )
            `)
            .eq('employee_id', id.toUpperCase())
            .single();

        if (error || !data) {
            return jsonResponse(res, { success: false, status: 'not_found', message: 'ID not found' });
        }

        if (data.status === 'revoked') {
            return jsonResponse(res, { success: false, status: 'revoked', message: 'This ID has been revoked' });
        }

        if (data.status === 'inactive') {
            return jsonResponse(res, { success: false, status: 'inactive', message: 'This ID is currently inactive' });
        }

        const staff = data.staff;
        if (staff.status === 'inactive') {
            return jsonResponse(res, {
                success: true,
                status: 'inactive',
                message: 'This employee is currently inactive',
                data: {
                    name: `${staff.first_name} ${staff.last_name}`,
                    position: staff.position,
                    department: staff.department,
                    employee_id: data.employee_id,
                    status: 'inactive'
                }
            });
        }

        return jsonResponse(res, {
            success: true,
            status: 'verified',
            message: 'ID verified successfully',
            data: {
                name: `${staff.first_name} ${staff.last_name}`,
                position: staff.position,
                department: staff.department,
                employee_id: data.employee_id,
                status: 'active'
            }
        });

    } catch (error) {
        return errorResponse(res, 'Verification failed', 500);
    }
}

async function handleCreate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { staff_id } = req.body;
        if (!staff_id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const { data: staff } = await supabase.from('staff').select('*').eq('id', staff_id).single();
        if (!staff) return errorResponse(res, 'Staff member not found', 404);
        if (staff.status !== 'active') return errorResponse(res, 'Cannot create ID for inactive staff', 400);

        const { data: existing } = await supabase.from('id_cards').select('id').eq('staff_id', staff_id).single();
        if (existing) return errorResponse(res, 'ID card already exists for this staff member', 409);

        const qrCodeUrl = `https://nifelux.com/verify/?id=${staff.employee_id}`;

        const { data, error } = await supabase
            .from('id_cards')
            .insert({
                staff_id,
                employee_id: staff.employee_id,
                qr_code_url: qrCodeUrl,
                status: 'active',
                created_by: auth.user.id
            })
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to create ID card', 500);

        await logActivity(supabase, auth.user.id, 'id_card_created', 'id_cards', data.id,
            `Generated ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})`);

        return jsonResponse(res, {
            success: true,
            message: 'ID card created',
            data: {
                ...data,
                staff: {
                    name: `${staff.first_name} ${staff.last_name}`,
                    position: staff.position,
                    department: staff.department,
                    employee_id: staff.employee_id,
                    photo_url: staff.photo_url
                }
            }
        });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleDeactivate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { staff_id } = req.body;
        if (!staff_id) return errorResponse(res, 'Staff ID is required', 400);

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('id_cards')
            .update({ status: 'inactive', revoked_at: new Date().toISOString() })
            .eq('staff_id', staff_id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to deactivate ID card', 500);

        await logActivity(supabase, auth.user.id, 'id_card_deactivated', 'id_cards', data.id,
            `Deactivated ID card: ${data.employee_id}`);

        return jsonResponse(res, { success: true, message: 'ID card deactivated' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
