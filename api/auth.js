/**
 * /api/auth
 * POST /api/auth?action=login    → Login
 * POST /api/auth?action=logout   → Logout
 */

const { createAdminClient, jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    const { action } = req.query;

    if (action === 'login') return handleLogin(req, res);
    if (action === 'logout') return handleLogout(req, res);

    return errorResponse(res, 'Invalid action', 400);
};

async function handleLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email and password are required', 400);
        }

        if (password.length < 6) {
            return errorResponse(res, 'Password must be at least 6 characters', 400);
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) {
            return errorResponse(res, 'Invalid email or password', 401);
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', data.user.id)
            .single();

        if (!profile || profile.role !== 'admin' || !profile.is_active) {
            await supabase.auth.signOut();
            return errorResponse(res, 'Admin access required', 403);
        }

        await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);

        await supabase.from('activity_logs').insert({
            user_id: data.user.id,
            action: 'login',
            target_type: 'auth',
            description: `Admin logged in: ${profile.email}`,
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        return jsonResponse(res, {
            success: true,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                user: {
                    id: profile.id,
                    email: profile.email,
                    full_name: profile.full_name,
                    role: profile.role
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return errorResponse(res, 'An error occurred during login', 500);
    }
}

async function handleLogout(req, res) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const supabase = createAdminClient();
            await supabase.auth.admin.signOut(token);
        }

        return jsonResponse(res, { success: true, message: 'Logged out successfully' });
    } catch (error) {
        return jsonResponse(res, { success: true, message: 'Logged out' });
    }
}
