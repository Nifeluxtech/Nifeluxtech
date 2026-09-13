/**
 * DELETE /api/staff/delete
 * Delete staff member (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'DELETE') {
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

        // Get staff info before deletion for logging
        const { data: staff } = await supabase
            .from('staff')
            .select('id, first_name, last_name, employee_id')
            .eq('id', id)
            .single();

        if (!staff) {
            return errorResponse(res, 'Staff member not found', 404);
        }

        // Delete (cascade will handle ID cards)
        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Staff delete error:', error);
            return errorResponse(res, 'Failed to delete staff member', 500);
        }

        // Log activity
        await logActivity(
            supabase,
            auth.user.id,
            'staff_deleted',
            'staff',
            id,
            `Deleted staff member: ${staff.first_name} ${staff.last_name} (${staff.employee_id})`
        );

        return jsonResponse(res, {
            success: true,
            message: 'Staff member deleted successfully'
        });

    } catch (error) {
        console.error('Staff delete error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
