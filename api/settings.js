/**
 * /api/settings
 * GET /api/settings?action=public  → Public settings (no auth, public keys only)
 * GET /api/settings                → All settings (admin only)
 * PUT /api/settings                → Update settings (admin only)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'GET' && action === 'public') return handlePublicGet(req, res);
    if (req.method === 'GET') return handleGet(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);

    return errorResponse(res, 'Method not allowed', 405);
};

/**
 * PUBLIC: returns only keys flagged is_public = true
 */
async function handlePublicGet(req, res) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('site_settings')
            .select('key, value')
            .eq('is_public', true);

        if (error) {
            // Fail soft: public site keeps its hardcoded defaults
            return jsonResponse(res, { success: true, data: {} });
        }

        const settings = {};
        (data || []).forEach(s => { settings[s.key] = s.value; });

        // Short CDN cache so admin changes propagate within ~1 minute
        res.setHeader('Cache-Control', 'public, max-age=60');
        return jsonResponse(res, { success: true, data: settings });

    } catch (error) {
        // Supabase not configured → public site uses defaults
        return jsonResponse(res, { success: true, data: {} });
    }
}

/**
 * ADMIN: all settings
 */
async function handleGet(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();

        const { data, error } = await supabase.from('site_settings').select('*');
        if (error) return errorResponse(res, 'Failed to fetch settings', 500);

        const settings = {};
        (data || []).forEach(s => { settings[s.key] = s.value; });

        return jsonResponse(res, { success: true, data: settings });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

/**
 * ADMIN: update settings
 */
async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const settings = req.body;
        if (!settings || typeof settings !== 'object') {
            return errorResponse(res, 'Invalid settings data', 400);
        }

        const supabase = createAdminClient();

        const updates = Object.entries(settings).map(([key, value]) =>
            supabase
                .from('site_settings')
                .upsert({
                    key,
                    value: String(value || ''),
                    updated_by: auth.user.id,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' })
        );

        await Promise.all(updates);

        await logActivity(supabase, auth.user.id, 'settings_changed', 'site_settings', null, 'Site settings updated');

        return jsonResponse(res, { success: true, message: 'Settings updated' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
