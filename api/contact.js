/**
 * /api/contact
 * POST   /api/contact?action=submit  → Public form submission
 * GET    /api/contact                → List messages (admin)
 * PUT    /api/contact                → Update message status (admin)
 * DELETE /api/contact?id=xxx         → Delete message (admin)
 */
// Add this import at the top
const { rateLimit } = require('./_ratelimit');

module.exports = async (req, res) => {
    const { action } = req.query;

    // Stricter limit on public submission: 5 per minute
    if (req.method === 'POST' && action === 'submit') {
        if (!rateLimit(req, res, 5)) return;
        return handleSubmit(req, res);
    }

    if (req.method === 'GET') return handleList(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);
    return errorResponse(res, 'Invalid request', 400);
};

const { createAdminClient, verifyAuth, jsonResponse, errorResponse } = require('./_config');

module.exports = async (req, res) => {
    const { action } = req.query;

    if (req.method === 'POST' && action === 'submit') return handleSubmit(req, res);
    if (req.method === 'GET') return handleList(req, res);
    if (req.method === 'PUT') return handleUpdate(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);

    return errorResponse(res, 'Invalid request', 400);
};

async function handleSubmit(req, res) {
    try {
        const { name, email, phone, company, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return errorResponse(res, 'Name, email, subject, and message are required', 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 'Please provide a valid email address', 400);
        }

        if (message.length < 10 || message.length > 5000) {
            return errorResponse(res, 'Message must be between 10 and 5000 characters', 400);
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('contact_messages')
            .insert({
                name: String(name).trim().substring(0, 255),
                email: String(email).trim().toLowerCase().substring(0, 255),
                phone: phone ? String(phone).trim().substring(0, 50) : null,
                company: company ? String(company).trim().substring(0, 255) : null,
                subject: String(subject).trim().substring(0, 255),
                message: String(message).trim().substring(0, 5000),
                status: 'new',
                ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                user_agent: req.headers['user-agent']
            })
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to submit message', 500);

        return jsonResponse(res, {
            success: true,
            message: 'Your message has been received.',
            id: data.id
        });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleList(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const supabase = createAdminClient();
        const { status } = req.query;

        let query = supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch messages', 500);

        return jsonResponse(res, { success: true, data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleUpdate(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id, status, admin_notes } = req.body;
        if (!id) return errorResponse(res, 'Message ID is required', 400);

        const validStatuses = ['new', 'read', 'replied', 'archived'];
        if (status && !validStatuses.includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }

        const supabase = createAdminClient();

        const updateData = {};
        if (status) updateData.status = status;
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
        if (status === 'replied') {
            updateData.replied_at = new Date().toISOString();
            updateData.replied_by = auth.user.id;
        }

        const { data, error } = await supabase
            .from('contact_messages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update message', 500);

        return jsonResponse(res, { success: true, message: 'Message updated', data });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}

async function handleDelete(req, res) {
    try {
        const auth = await verifyAuth(req, true);
        if (!auth.valid) return errorResponse(res, auth.error, auth.status);

        const { id } = req.query;
        if (!id) return errorResponse(res, 'Message ID is required', 400);

        const supabase = createAdminClient();

        const { error } = await supabase.from('contact_messages').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete message', 500);

        return jsonResponse(res, { success: true, message: 'Message deleted' });

    } catch (error) {
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
}
