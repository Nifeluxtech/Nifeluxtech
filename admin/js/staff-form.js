/**
 * NIFELUX TECHNOLOGIES - STAFF FORM
 * Create and edit staff member form handling
 */

const StaffForm = (() => {
    'use strict';

    const form = document.getElementById('staff-form');
    const submitBtn = document.getElementById('submit-btn');
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    const isEdit = !!editId;

    /**
     * Initialize form
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        // Set default join date to today
        const joinDateInput = document.getElementById('join_date');
        if (joinDateInput && !joinDateInput.value) {
            joinDateInput.value = new Date().toISOString().split('T')[0];
        }

        // If editing, load existing data
        if (isEdit) {
            document.querySelector('.form-title').textContent = 'Edit Employee';
            document.querySelector('.form-subtitle').textContent = 'Update staff member information.';
            submitBtn.querySelector('.btn-text').textContent = 'Save Changes';
            await loadStaffData(editId);
        }

        // Form submission
        form.addEventListener('submit', handleSubmit);
    }

    /**
     * Load staff data for editing
     */
    async function loadStaffData(id) {
        try {
            const response = await NifeluxAPI.staff.get(id);
            if (response.success && response.data) {
                populateForm(response.data);
            }
        } catch (error) {
            showError('Failed to load staff data');
            window.location.href = '/admin/staff.html';
        }
    }

    /**
     * Populate form with data
     */
    function populateForm(data) {
        const fields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department', 'employment_type', 'join_date'];
        
        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input && data[field]) {
                input.value = data[field];
            }
        });
    }

    /**
     * Validate form
     */
    function validateForm() {
        let isValid = true;

        // Clear previous errors
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));

        // Required fields
        const required = ['first_name', 'last_name', 'position', 'department', 'employment_type', 'join_date'];
        
        required.forEach(field => {
            const input = document.getElementById(field);
            if (input && !input.value.trim()) {
                showFieldError(field, 'This field is required');
                isValid = false;
            }
        });

        // Email validation
        const email = document.getElementById('email');
        if (email && email.value && !NifeluxUtils.isValidEmail(email.value)) {
            showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Show field error
     */
    function showFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);
        
        if (input) input.classList.add('error');
        if (error) error.textContent = message;
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please correct the errors in the form');
            return;
        }

        const formData = {
            first_name: document.getElementById('first_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
            email: document.getElementById('email').value.trim() || null,
            phone: document.getElementById('phone').value.trim() || null,
            position: document.getElementById('position').value.trim(),
            department: document.getElementById('department').value,
            employment_type: document.getElementById('employment_type').value,
            join_date: document.getElementById('join_date').value
        };

        AdminCommon.setButtonLoading(submitBtn, true, isEdit ? 'Saving...' : 'Creating...');

        try {
            let response;

            if (isEdit) {
                response = await NifeluxAPI.staff.update(editId, formData);
            } else {
                response = await NifeluxAPI.staff.create(formData);
            }

            if (response.success) {
                showSuccess(isEdit ? 'Staff member updated successfully' : 'Staff member created successfully');
                
                setTimeout(() => {
                    window.location.href = '/admin/staff.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Form submission error:', error);
            showError(error.message || 'Failed to save staff member');
            AdminCommon.setButtonLoading(submitBtn, false);
        }
    }

    return { init };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', StaffForm.init);
} else {
    StaffForm.init();
}
