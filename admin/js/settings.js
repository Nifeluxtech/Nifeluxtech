/**
 * NIFELUX TECHNOLOGIES - SETTINGS MANAGEMENT
 * Site settings configuration
 */

const SettingsManager = (() => {
    'use strict';

    /**
     * Initialize settings page
     */
    async function init() {
        await NifeluxAPI.loadConfig();

        if (NifeluxAPI.isConfigured()) {
            loadSettings();
        }

        initEventListeners();
    }

    /**
     * Load settings from API
     */
    async function loadSettings() {
        try {
            const response = await NifeluxAPI.settings.get();
            if (response.success && response.data) {
                populateForm(response.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Populate form with settings
     */
    function populateForm(settings) {
        const fieldMap = {
            company_name: 'company-name',
            company_email: 'company-email',
            company_phone: 'company-phone',
            company_address: 'company-address',
            company_description: 'company-description',
            social_twitter: 'social-twitter',
            social_linkedin: 'social-linkedin',
            social_github: 'social-github',
            footer_text: 'footer-text'
        };

        Object.entries(fieldMap).forEach(([key, elementId]) => {
            const element = document.getElementById(elementId);
            if (element && settings[key] !== undefined) {
                element.value = settings[key];
            }
        });
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        const form = document.getElementById('settings-form');
        if (form) {
            form.addEventListener('submit', handleSave);
        }
    }

    /**
     * Handle save
     */
    async function handleSave(e) {
        e.preventDefault();

        const formData = {
            company_name: document.getElementById('company-name').value.trim(),
            company_email: document.getElementById('company-email').value.trim(),
            company_phone: document.getElementById('company-phone').value.trim(),
            company_address: document.getElementById('company-address').value.trim(),
            company_description: document.getElementById('company-description').value.trim(),
            social_twitter: document.getElementById('social-twitter').value.trim(),
            social_linkedin: document.getElementById('social-linkedin').value.trim(),
            social_github: document.getElementById('social-github').value.trim(),
            footer_text: document.getElementById('footer-text').value.trim()
        };

        const saveBtn = document.getElementById('save-settings-btn');
        AdminCommon.setButtonLoading(saveBtn, true, 'Saving...');

        try {
            if (NifeluxAPI.isConfigured()) {
                const response = await NifeluxAPI.settings.update(formData);
                if (response.success) {
                    showSuccess('Settings saved successfully');
                }
            } else {
                // Demo mode
                await NifeluxUtils.sleep(1000);
                showSuccess('Settings saved (demo mode)');
            }
        } catch (error) {
            showError(error.message || 'Failed to save settings');
        } finally {
            AdminCommon.setButtonLoading(saveBtn, false);
        }
    }

    return { init };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SettingsManager.init);
} else {
    SettingsManager.init();
}
