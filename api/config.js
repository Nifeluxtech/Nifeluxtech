/**
 * GET /api/config
 * Returns public configuration for the frontend
 * Only exposes values that are safe for client-side use
 */

const { jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
            return jsonResponse(res, {
                configured: false,
                message: 'Backend not configured'
            });
        }

        // Only return PUBLIC values
        // NEVER expose service_role key here
        return jsonResponse(res, {
            configured: true,
            supabase_url: supabaseUrl,
            supabase_anon_key: anonKey,
            site_url: process.env.SITE_URL || 'https://nifelux.com'
        });

    } catch (error) {
        return errorResponse(res, 'Failed to load config', 500);
    }
};
