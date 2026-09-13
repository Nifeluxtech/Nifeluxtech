/**
 * GET /api/logs
 * List activity logs (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { limit = 50, action } = req.query;

        let query = supabase
            .from('activity_logs')
            .select('*, profiles:user_id (email)')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (action) query = query.eq('action', action);

        const { data, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch logs', 500);

        const logs = (data || []).map(log => ({
            ...log,
            user_email: log.profiles?.email || 'System'
        }));

        return jsonResponse(res, { success: true, data: logs });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
