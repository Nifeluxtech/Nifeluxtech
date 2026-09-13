/**
 * /api/dashboard
 * GET /api/dashboard?action=stats            → Dashboard statistics
 * GET /api/dashboard?action=recent-activity  → Recent activity feed
 */

const { createAdminClient, verifyAuth, jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    const { action } = req.query;

    if (action === 'stats') return handleStats(req, res);
    if (action === 'recent-activity') return handleRecentActivity(req, res);

    return errorResponse(res, 'Invalid action', 400);
};

async function handleStats(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();

        const [
            { count: totalStaff },
            { count: activeStaff },
            { count: inactiveStaff },
            { count: totalProjects },
            { count: publishedNews },
            { count: unreadMessages }
        ] = await Promise.all([
            supabase.from('staff').select('*', { count: 'exact', head: true }),
            supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
            supabase.from('projects').select('*', { count: 'exact', head: true }),
            supabase.from('news').select('*', { count: 'exact', head: true }).eq('status', 'published'),
            supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'new')
        ]);

        return jsonResponse(res, {
            success: true,
            data: {
                total_staff: totalStaff || 0,
                active_staff: activeStaff || 0,
                inactive_staff: inactiveStaff || 0,
                total_projects: totalProjects || 0,
                published_news: publishedNews || 0,
                unread_messages: unreadMessages || 0
            }
        });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleRecentActivity(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) return errorResponse(res, 'Failed to fetch activity', 500);

        const icons = {
            id_card: '🆔', project: '🚀', news: '📰',
            staff: '👤', settings: '⚙️', login: '🔐', message: '✉️'
        };

        const activity = (data || []).map(log => {
            const iconKey = Object.keys(icons).find(k => log.action.includes(k));
            return { ...log, icon: icons[iconKey] || '📋' };
        });

        return jsonResponse(res, { success: true, data: activity });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
