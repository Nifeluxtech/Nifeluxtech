/**
 * GET /api/id/verify
 * Public endpoint to verify employee ID
 * Returns limited information only
 */

const { createAdminClient, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const { id } = req.query;

        if (!id) {
            return errorResponse(res, 'ID parameter is required', 400);
        }

        // Validate ID format (NFX-EMP-XXXX)
        const idRegex = /^NFX-EMP-\d{4,}$/i;
        if (!idRegex.test(id)) {
            return jsonResponse(res, {
                success: false,
                status: 'invalid',
                message: 'Invalid ID format'
            });
        }

        const supabase = createAdminClient();

        // Query ID card with staff info
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
            return jsonResponse(res, {
                success: false,
                status: 'not_found',
                message: 'ID not found'
            });
        }

        // Check ID card status
        if (data.status === 'revoked') {
            return jsonResponse(res, {
                success: false,
                status: 'revoked',
                message: 'This ID has been revoked'
            });
        }

        if (data.status === 'inactive') {
            return jsonResponse(res, {
                success: false,
                status: 'inactive',
                message: 'This ID is currently inactive'
            });
        }

        // Check staff status
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

        // Return verified data (limited fields only)
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
        console.error('ID verification error:', error);
        return errorResponse(res, 'Verification failed', 500);
    }
};
