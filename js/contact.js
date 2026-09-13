/**
 * NIFELUX TECHNOLOGIES - CONTACT FORM HANDLER
 * Handles form validation and submission for the contact page
 * Phase 2: Frontend validation only; API integration in Phase 3
 */

const NifeluxContact = (() => {
    'use strict';

    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');

    /**
     * Show field error
     */
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);
        
        if (field) field.classList.add('error');
        if (error) error.textContent = message;
    }

    /**
     * Clear field error
     */
    function clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);
        
        if (field) field.classList.remove('error');
        if (error) error.textContent = '';
    }

    /**
     * Clear all errors
     */
    function clearAllErrors() {
        ['name', 'email', 'phone', 'subject', 'message'].forEach(clearFieldError);
    }

    /**
     * Validate form
     */
    function validateForm(data) {
        let isValid = true;
        clearAllErrors();

        // Name validation
        if (!data.name || data.name.trim().length < 2) {
            showFieldError('name', 'Please enter your full name');
            isValid = false;
        }

        // Email validation
        if (!data.email || !NifeluxUtils.isValidEmail(data.email)) {
            showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Phone validation (optional but if provided must be valid)
        if (data.phone && !NifeluxUtils.isValidPhone(data.phone)) {
            showFieldError('phone', 'Please enter a valid phone number');
            isValid = false;
        }

        // Subject validation
        if (!data.subject) {
            showFieldError('subject', 'Please select a subject');
            isValid = false;
        }

        // Message validation
        if (!data.message || data.message.trim().length < 10) {
            showFieldError('message', 'Please enter a message (at least 10 characters)');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Set button loading state
     */
    function setLoading(isLoading) {
        if (!submitBtn) return;

        if (isLoading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').textContent = 'Sending...';
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = 'Send Message';
        }
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            company: document.getElementById('company').value.trim(),
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value.trim()
        };

        if (!validateForm(formData)) {
            showError('Please correct the errors in the form.');
            return;
        }

        setLoading(true);

        try {
            // PHASE 2: Simulate API call
            // In Phase 3, this will be replaced with: await NifeluxAPI.post('/api/contact/submit', formData);
            
            // Simulate network delay
            await NifeluxUtils.sleep(1500);

            // Simulate success
            showSuccess('Message sent successfully! We\'ll get back to you within 24–48 hours.', {
                duration: 6000
            });

            form.reset();
            clearAllErrors();
        } catch (error) {
            console.error('Contact form error:', error);
            showError('Failed to send message. Please try again or email us directly.');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Handle real-time validation on blur
     */
    function initRealtimeValidation() {
        const fields = ['name', 'email', 'phone', 'subject', 'message'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => {
                    clearFieldError(fieldId);
                });
            }
        });
    }

    /**
     * Initialize contact form
     */
    function init() {
        if (!form) return;

        form.addEventListener('submit', handleSubmit);
        initRealtimeValidation();
    }

    return { init };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxContact.init);
} else {
    NifeluxContact.init();
}

window.NifeluxContact = NifeluxContact;
