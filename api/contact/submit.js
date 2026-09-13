/**
 * POST /api/contact/submit
 * Handle public contact form submissions
 */

const { createAdminClient, jsonResponse, errorResponse } = require('../_config');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return errorResponse(res, 'Method not allowed', 405);
    }

    try {
        const { name, email, phone, company, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return errorResponse(res, 'Name, email, subject, and message are required', 400);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 'Please provide a valid email address', 400);
        }

        // Validate lengths
        if (name.length > 255) {
            return errorResponse(res, 'Name is too long', 400);
        }

        if (message.length > 5000) {
            return errorResponse(res, 'Message is too long (max 5000 characters)', 400);
        }

        if (message.length < 10) {
            return errorResponse(res, 'Message is too short (min 10 characters)', 400);
        }

        // Sanitize inputs
        const sanitizedData = {
            name: String(name).trim().substring(0, 255),
            email: String(email).trim().toLowerCase().substring(0, 255),
            phone: phone ? String(phone).trim().substring(0, 50) : null,
            company: company ? String(company).trim().substring(0, 255) : null,
            subject: String(subject).trim().substring(0, 255),
            message: String(message).trim().substring(0, 5000),
            status: 'new',
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            user_agent: req.headers['user-agent']
        };

        // Insert into database
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('contact_messages')
            .insert(sanitizedData)
            .select()
            .single();

        if (error) {
            console.error('Contact submission error:', error);
            return errorResponse(res, 'Failed to submit message. Please try again.', 500);
        }

        return jsonResponse(res, {
            success: true,
            message: 'Your message has been received. We\'ll get back to you soon.',
            id: data.id
        });

    } catch (error) {
        console.error('Contact submit error:', error);
        return errorResponse(res, 'An unexpected error occurred', 500);
    }
};
