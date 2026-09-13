/**
 * /api/id
 * GET  /api/id?action=verify&id=NFX-EMP-0001  → Public verification
 * GET  /api/id?action=list                    → Admin: all ID cards + staff
 * POST /api/id?action=create                  → Admin: generate card { staff_id }
 * POST /api/id?action=regenerate              → Admin: replace card  { staff_id }
 * POST /api/id?action=deactivate              → Admin: deactivate   { staff_id }
 *
 * NOTE: Only requires ./_config — no other local modules.
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

/* Inline minimal rate limiter (public verify only) */
const hits = new Map();
function rateLimited(req, limit = 20) {
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now - rec.start > 60000) {
        hits.set(ip, { start: now, count: 1 });
        return false;
    }
    rec.count += 1;
    return rec.count > limit;
}

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'verify') {
        if (rateLimited(req)) {
            return errorResponse(res, 'Too many requests. Please try again in a minute.', 429);
        }
        return handleVerify(req, res);
    }
    if (req.method === 'GET' && action === 'list') return handleList(req, res);
    if (req.method === 'POST' && action === 'create') return handleCreate(req, res, false);
    if (req.method === 'POST' && action === 'regenerate') return handleCreate(req, res, true);
    if (req.method === 'POST' && action === 'deactivate') return handleDeactivate(req, res);

    return errorResponse(res, 'Invalid request', 400);
};

/* ---------------- PUBLIC VERIFY ---------------- */
async function handleVerify(req, res) {
    try {
        const { id } = req.query;
        if (!id) return errorResponse(res, 'ID parameter is required', 400);

        if (!/^NFX-EMP-\d{4,}$/i.test(id)) {
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

        if (error || !data || !data.staff) {
            return jsonResponse(res, { success: false, status: 'not_found', message: 'This identification number could not be verified.' });
        }

        if (data.status === 'revoked') {
            return jsonResponse(res, { success: false, status: 'revoked', message: 'This identification card has been revoked.' });
        }

        if (data.status === 'inactive') {
            return jsonResponse(res, { success: false, status: 'inactive', message: 'This employee identification is currently inactive.' });
        }

        const staff = data.staff;

        if (staff.status !== 'active') {
            return jsonResponse(res, {
                success: true,
                status: 'inactive',
                message: 'This employee is currently inactive.',
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
        console.error('Verify error:', error);
        return errorResponse(res, 'Verification failed', 500);
    }
}

/* ---------------- ADMIN LIST ---------------- */
async function handleList(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('id_cards')
            .select(`
                id,
                staff_id,
                employee_id,
                qr_code_url,
                status,
                generated_at,
                expires_at,
                revoked_at,
                staff:staff_id (
                    first_name,
                    last_name,
                    email,
                    position,
                    department,
                    photo_url,
                    status
                )
            `)
            .order('generated_at', { ascending: false });

        if (error) return errorResponse(res, 'Failed to fetch ID cards', 500);

        return jsonResponse(res, { success: true, data: data || [] });

    } catch (error) {
        console.error('ID list error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN CREATE / REGENERATE ---------------- */
async function handleCreate(req, res, isRegenerate) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const staff_id = req.body && req.body.staff_id;
        if (!staff_id) return errorResponse(res, 'staff_id is required', 400);

        const supabase = createAdminClient();

        const { data: staff, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staff_id)
            .single();

        if (staffError || !staff) {
            return errorResponse(res, 'Staff member not found. Refresh the ID Cards page and generate from the list.', 404);
        }

        if (staff.status !== 'active') {
            return errorResponse(res, 'Cannot create an ID card for an inactive staff member', 400);
        }

        const { data: existing } = await supabase
            .from('id_cards')
            .select('id')
            .eq('staff_id', staff_id)
            .single();

        if (existing && !isRegenerate) {
            return errorResponse(res, 'ID card already exists for this staff member. Use Regenerate to replace it.', 409);
        }

        if (existing && isRegenerate) {
            await supabase.from('id_cards').delete().eq('id', existing.id);
        }

        const siteUrl = process.env.SITE_URL || 'https://nifelux.com';
        const qrCodeUrl = `${siteUrl}/verify/?id=${staff.employee_id}`;

        const { data, error } = await supabase
            .from('id_cards')
            .insert({
                staff_id: staff.id,
                employee_id: staff.employee_id,
                qr_code_url: qrCodeUrl,
                status: 'active',
                created_by: auth.user.id
            })
            .select(`
                id,
                staff_id,
                employee_id,
                qr_code_url,
                status,
                generated_at,
                staff:staff_id (
                    first_name,
                    last_name,
                    email,
                    position,
                    department,
                    photo_url,
                    status
                )
            `)
            .single();

        if (error) {
            console.error('ID create error:', error);
            return errorResponse(res, 'Failed to create ID card', 500);
        }

        await logActivity(
            supabase,
            auth.user.id,
            isRegenerate ? 'id_card_regenerated' : 'id_card_created',
            'id_cards',
            data.id,
            `${isRegenerate ? 'Regenerated' : 'Generated'} ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})`
        );

        return jsonResponse(res, {
            success: true,
            message: isRegenerate ? 'ID card regenerated' : 'ID card created',
            data
        });

    } catch (error) {
        console.error('ID create error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/* ---------------- ADMIN DEACTIVATE ---------------- */
async function handleDeactivate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const staff_id = req.body && req.body.staff_id;
        if (!staff_id) return errorResponse(res, 'staff_id is required', 400);

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('id_cards')
            .update({ status: 'inactive', revoked_at: new Date().toISOString() })
            .eq('staff_id', staff_id)
            .select('id, employee_id')
            .single();

        if (error || !data) return errorResponse(res, 'ID card not found for this staff member', 404);

        await logActivity(supabase, auth.user.id, 'id_card_deactivated', 'id_cards', data.id, `Deactivated ID card: ${data.employee_id}`);

        return jsonResponse(res, { success: true, message: 'ID card deactivated' });

    } catch (error) {
        console.error('Deactivate error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
