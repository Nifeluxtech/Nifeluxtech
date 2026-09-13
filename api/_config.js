/**
 * NIFELUX TECHNOLOGIES - SERVERLESS API CONFIGURATION
 * Shared configuration for all API endpoints
 * 
 * SECURITY: Service role key is only used server-side
 * Never expose this to the frontend
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Create Supabase admin client with service role
 * This bypasses RLS - use only in authenticated serverless functions
 */
function createAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase configuration. Check environment variables.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Create Supabase client with user's JWT
 * Respects RLS policies
 */
function createUserClient(jwt) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase configuration.');
    }

    return createClient(supabaseUrl, anonKey, {
        global: {
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Verify user is authenticated and optionally has admin role
 */
async function verifyAuth(req, requireAdmin = true) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'Missing authorization token', status: 401 };
    }

    const token = authHeader.substring(7);

    try {
        const supabase = createAdminClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return { valid: false, error: 'Invalid or expired token', status: 401 };
        }

        // Check admin role if required
        if (requireAdmin) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single();

            if (!profile || profile.role !== 'admin' || !profile.is_active) {
                return { valid: false, error: 'Admin access required', status: 403 };
            }
        }

        return { valid: true, user };

    } catch (error) {
        return { valid: false, error: 'Authentication failed', status: 401 };
    }
}

/**
 * Standard JSON response helper
 */
function jsonResponse(res, data, status = 200) {
    res.status(status).json(data);
}

/**
 * Error response helper
 */
function errorResponse(res, message, status = 500) {
    res.status(status).json({ success: false, error: message });
}

/**
 * Log activity to database
 */
async function logActivity(supabase, userId, action, targetType, targetId, description, metadata = {}) {
    try {
        await supabase.from('activity_logs').insert({
            user_id: userId,
            action,
            target_type: targetType,
            target_id: targetId,
            description,
            metadata
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

module.exports = {
    createAdminClient,
    createUserClient,
    verifyAuth,
    jsonResponse,
    errorResponse,
    logActivity
};
