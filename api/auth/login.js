/**
 * POST /api/auth/login
 * Authenticate admin user with email and password
 */

const { createAdminClient, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return errorResponse(res, 'Email and password are required', 400);
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return errorResponse(res, 'Invalid input format', 400);
        }

        if (password.length < 6) {
            return errorResponse(res, 'Password must be at least 6 characters', 400);
        }

        // Authenticate with Supabase
        const supabase = createAdminClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) {
            return errorResponse(res, 'Invalid email or password', 401);
        }

        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            await supabase.auth.signOut();
            return errorResponse(res, 'User profile not found', 403);
        }

        if (profile.role !== 'admin') {
            await supabase.auth.signOut();
            return errorResponse(res, 'Admin access required', 403);
        }

        if (!profile.is_active) {
            await supabase.auth.signOut();
            return errorResponse(res, 'Account has been deactivated', 403);
        }

        // Update last login
        await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);

        // Log activity
        await supabase.from('activity_logs').insert({
            user_id: data.user.id,
            action: 'login',
            target_type: 'auth',
            description: `Admin logged in: ${profile.email}`,
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Return session data
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
};
