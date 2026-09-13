/**
 * GET /api/staff/list
 * List all staff members (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        // Verify admin authentication
        const auth = await verifyAuth(req, true);
        if (!auth.valid) {
            return errorResponse(res, auth.error, auth.status);
        }

        const supabase = createAdminClient();

        // Parse query parameters
        const { 
            page = 1, 
            limit = 20, 
            department, 
            status,
            search 
        } = req.query;

        // Build query
        let query = supabase
            .from('staff')
            .select('*', { count: 'exact' })
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true });

        // Apply filters
        if (department) {
            query = query.eq('department', department);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_id.ilike.%${search}%`);
        }

        // Apply pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Staff list error:', error);
            return errorResponse(res, 'Failed to fetch staff', 500);
        }

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
        console.error('Staff list error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
