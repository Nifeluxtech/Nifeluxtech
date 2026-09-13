/**
 * POST /api/auth/logout
 * Invalidate current session
 */

const { createAdminClient, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const supabase = createAdminClient();
            
            // Sign out the specific session
            await supabase.auth.admin.signOut(token);
        }

        return jsonResponse(res, { success: true, message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        // Still return success even if token is invalid
        return jsonResponse(res, { success: true, message: 'Logged out' });
    }
};
