/**
 * GET /api/staff/get
 * Get single staff member (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) {
            return errorResponse(res, auth.error, auth.status);
        }

        const { id } = req.query;

        if (!id) {
            return errorResponse(res, 'Staff ID is required', 400);
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('staff')
            .select(`
                *,
                id_card:id_cards(*)
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            return errorResponse(res, 'Staff member not found', 404);
        }

        return jsonResponse(res, {
            success: true,
            data
        });

    } catch (error) {
        console.error('Staff get error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
