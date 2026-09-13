/**
 * /api/settings
 * GET /api/settings  → Get all settings (admin)
 * PUT /api/settings  → Update settings (admin)
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse, logActivity } = require('./_config');

module.exports = async (req, res) => {
    switch (req.method) {
        case 'GET': return handleGet(req, res);
        case 'PUT': return handleUpdate(req, res);
        default: return errorResponse(res, 'Method not allowed', 405);
    }
};

async function handleGet(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();

        const { data, error } = await supabase.from('site_settings').select('*');
        if (error) return errorResponse(res, 'Failed to fetch settings', 500);

        const settings = {};
        if (data) {
            data.forEach(setting => {
                settings[setting.key] = setting.value;
            });
        }

        return jsonResponse(res, { success: true, data: settings });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

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
