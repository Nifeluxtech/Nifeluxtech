/**
 * PUT /api/staff/update
 * Update staff member (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'PUT') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) {
            return errorResponse(res, auth.error, auth.status);
        }

        const { id, ...updateData } = req.body;

        if (!id) {
            return errorResponse(res, 'Staff ID is required', 400);
        }

        const supabase = createAdminClient();

        // Check staff exists
        const { data: existing } = await supabase
            .from('staff')
            .select('id, first_name, last_name')
            .eq('id', id)
            .single();

        if (!existing) {
            return errorResponse(res, 'Staff member not found', 404);
        }

        // Build update object (only allowed fields)
        const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department', 'employment_type', 'join_date', 'status', 'photo_url', 'notes'];
        const filteredData = {};

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        });

        filteredData.updated_by = auth.user.id;

        // Update
        const { data, error } = await supabase
            .from('staff')
            .update(filteredData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Staff update error:', error);
            return errorResponse(res, 'Failed to update staff member', 500);
        }

        // Log activity
        await logActivity(
            supabase,
            auth.user.id,
            'staff_updated',
            'staff',
            id,
            `Updated staff member: ${data.first_name} ${data.last_name}`
        );

        return jsonResponse(res, {
            success: true,
            message: 'Staff member updated successfully',
            data
        });

    } catch (error) {
        console.error('Staff update error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
