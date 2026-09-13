/**
 * NIFELUX TECHNOLOGIES - CONTACT FORM HANDLER
 * Submits to /api/contact?action=submit when backend is configured.
 * Falls back to a clearly-labelled demo simulation when it is not.
 */

const NifeluxContact = (() => {
    'use strict';

    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');

    function init() {
        if (!form) return;
        form.addEventListener('submit', handleSubmit);

        ['name', 'email', 'phone', 'subject', 'message'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.addEventListener('input', () => clearFieldError(id));
        });
    }

    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);
        if (field) field.classList.add('error');
        if (error) error.textContent = message;
    }

    function clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);
        if (field) field.classList.remove('error');
        if (error) error.textContent = '';
    }

    function clearAllErrors() {
        ['name', 'email', 'phone', 'subject', 'message'].forEach(clearFieldError);
    }

    function validate(data) {
        let isValid = true;

        if (!data.name || data.name.length < 2) {
            showFieldError('name', 'Please enter your full name');
            isValid = false;
        }
        if (!data.email || !NifeluxUtils.isValidEmail(data.email)) {
            showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }
        if (data.phone && !NifeluxUtils.isValidPhone(data.phone)) {
            showFieldError('phone', 'Please enter a valid phone number');
            isValid = false;
        }
        if (!data.subject) {
            showFieldError('subject', 'Please select a subject');
            isValid = false;
        }
        if (!data.message || data.message.length < 10) {
            showFieldError('message', 'Please enter a message (at least 10 characters)');
            isValid = false;
        }

        return isValid;
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        const textEl = submitBtn.querySelector('.btn-text');

        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            if (textEl) textEl.textContent = 'Sending...';
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            if (textEl) textEl.textContent = 'Send Message';
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        clearAllErrors();

        const data = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            company: document.getElementById('company').value.trim(),
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value.trim()
        };

        if (!validate(data)) {
            showError('Please correct the errors in the form.');
            return;
        }

        setLoading(true);

        try {
            await NifeluxAPI.loadConfig();

            if (NifeluxAPI.isConfigured()) {
                const response = await NifeluxAPI.contact.submit(data);
                if (!response.success) {
                    throw new Error(response.error || 'Submission failed');
                }
            } else {
                // Demo mode — no backend configured
                await NifeluxUtils.sleep(1200);
            }

            showSuccess("Message sent successfully! We'll get back to you within 24–48 hours.", { duration: 6000 });
            form.reset();

        } catch (error) {
            console.error('Contact submission error:', error);
            showError(error.message || 'Failed to send message. Please try again or email us directly.');
        } finally {
            setLoading(false);
        }
    }

    return { init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxContact.init);
} else {
    NifeluxContact.init();
}

window.NifeluxContact = NifeluxContact;
