/**
 * POST /api/id/create
 * Generate ID card for a staff member (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) {
            return errorResponse(res, auth.error, auth.status);
        }

        const { staff_id } = req.body;

        if (!staff_id) {
            return errorResponse(res, 'Staff ID is required', 400);
        }

        const supabase = createAdminClient();

        // Check if staff exists and is active
        const { data: staff, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staff_id)
            .single();

        if (staffError || !staff) {
            return errorResponse(res, 'Staff member not found', 404);
        }

        if (staff.status !== 'active') {
            return errorResponse(res, 'Cannot create ID for inactive staff', 400);
        }

        // Check if ID card already exists
        const { data: existingCard } = await supabase
            .from('id_cards')
            .select('id')
            .eq('staff_id', staff_id)
            .single();

        if (existingCard) {
            return errorResponse(res, 'ID card already exists for this staff member', 409);
        }

        // Generate QR code URL
        const qrCodeUrl = `https://nifelux.com/verify/?id=${staff.employee_id}`;

        // Create ID card
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

        if (error) {
            console.error('ID card creation error:', error);
            return errorResponse(res, 'Failed to create ID card', 500);
        }

        // Log activity
        await logActivity(
            supabase,
            auth.user.id,
            'id_card_created',
            'id_cards',
            data.id,
            `Generated ID card for ${staff.first_name} ${staff.last_name} (${staff.employee_id})`
        );

        return jsonResponse(res, {
            success: true,
            message: 'ID card created successfully',
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
        console.error('ID create error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
