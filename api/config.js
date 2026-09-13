/**
 * GET /api/config
 * Returns public configuration for the frontend
 */

const { jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        return jsonResponse(res, { configured: false, message: 'Backend not configured' });
    }

    return jsonResponse(res, {
        configured: true,
        supabase_url: supabaseUrl,
        supabase_anon_key: anonKey,
        site_url: process.env.SITE_URL || 'https://nifelux.com'
    });
};
