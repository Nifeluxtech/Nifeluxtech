/**
 * NIFELUX TECHNOLOGIES - ID VERIFICATION
 * Public verification page logic
 */

const NifeluxVerification = (() => {
    'use strict';

    const form = document.getElementById('verify-form');
    const input = document.getElementById('verify-input');
    const btn = document.getElementById('verify-btn');
    const loading = document.getElementById('verify-loading');
    const result = document.getElementById('verify-result');

    /**
     * Initialize verification page
     */
    function init() {
        // Check for ID in URL (from QR code scan)
        const urlId = NifeluxUtils.getUrlParameter('id');
        if (urlId) {
            input.value = urlId.toUpperCase();
            // Auto-verify if ID is in URL
            setTimeout(() => verifyId(urlId), 500);
        }

        // Form submission
        form.addEventListener('submit', handleSubmit);

        // Auto-format input
        input.addEventListener('input', handleInput);
    }

    /**
     * Handle input formatting
     */
    function handleInput(e) {
        let value = e.target.value.toUpperCase();
        
        // Auto-add NFX-EMP- prefix if user just types numbers
        if (/^\d+$/.test(value)) {
            value = 'NFX-EMP-' + value;
        }
        
        e.target.value = value;
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const id = input.value.trim().toUpperCase();

        if (!id) {
            showError('Please enter an employee ID');
            input.focus();
            return;
        }

        // Validate format
        const idRegex = /^NFX-EMP-\d{4,}$/i;
        if (!idRegex.test(id)) {
            showError('Invalid ID format. Expected: NFX-EMP-0001');
            return;
        }

        await verifyId(id);
    }

    /**
     * Verify ID against API
     */
    async function verifyId(id) {
        // Show loading
        setLoading(true);
        hideResult();

        try {
            // Check if API is configured
            await NifeluxAPI.loadConfig();

            if (!NifeluxAPI.isConfigured()) {
                // Demo mode
                await NifeluxUtils.sleep(1000);
                showDemoResult(id);
                return;
            }

            const response = await NifeluxAPI.id.verify(id);

            if (response.success) {
                if (response.status === 'verified') {
                    showSuccessResult(response.data);
                } else if (response.status === 'inactive') {
                    showInactiveResult(response.data);
                }
            } else {
                showErrorResult(response.message || 'ID not found');
            }

        } catch (error) {
            console.error('Verification error:', error);
            
            if (error.status === 404 || error.message?.includes('not found')) {
                showErrorResult('This identification number could not be verified.');
            } else {
                showErrorResult('Verification service unavailable. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    }

    /**
     * Show demo result when API not configured
     */
    function showDemoResult(id) {
        showSuccessResult({
            name: 'Demo Employee',
            position: 'Software Engineer',
            department: 'Engineering',
            employee_id: id,
            status: 'active'
        });
        showInfo('Demo mode: Configure Supabase for real verification');
    }

    /**
     * Show success result
     */
    function showSuccessResult(data) {
        result.className = 'verify-result verify-result-success visible';
        result.innerHTML = `
            <div class="verify-result-header">
                <div class="verify-result-icon">✓</div>
                <div>
                    <h2 class="verify-result-title">VERIFIED</h2>
                    <p class="verify-result-message">This employee ID is valid and active.</p>
                </div>
            </div>
            <div class="verify-details">
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Name</span>
                    <span class="verify-detail-value">${NifeluxUtils.sanitizeHTML(data.name)}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Position</span>
                    <span class="verify-detail-value">${NifeluxUtils.sanitizeHTML(data.position)}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Department</span>
                    <span class="verify-detail-value">${NifeluxUtils.sanitizeHTML(data.department)}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Employee ID</span>
                    <span class="verify-detail-value">${NifeluxUtils.sanitizeHTML(data.employee_id)}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Status</span>
                    <span class="verify-detail-value" style="color: var(--color-success);">Active</span>
                </div>
            </div>
        `;
    }

    /**
     * Show inactive result
     */
    function showInactiveResult(data) {
        result.className = 'verify-result verify-result-warning visible';
        result.innerHTML = `
            <div class="verify-result-header">
                <div class="verify-result-icon">⚠</div>
                <div>
                    <h2 class="verify-result-title">ID INACTIVE</h2>
                    <p class="verify-result-message">This employee identification is currently inactive.</p>
                </div>
            </div>
            <div class="verify-details">
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Employee ID</span>
                    <span class="verify-detail-value">${NifeluxUtils.sanitizeHTML(data?.employee_id || 'N/A')}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Status</span>
                    <span class="verify-detail-value" style="color: var(--color-warning);">Inactive</span>
                </div>
            </div>
        `;
    }

    /**
     * Show error result
     */
    function showErrorResult(message) {
        result.className = 'verify-result verify-result-error visible';
        result.innerHTML = `
            <div class="verify-result-header">
                <div class="verify-result-icon">✕</div>
                <div>
                    <h2 class="verify-result-title">ID NOT VERIFIED</h2>
                    <p class="verify-result-message">${NifeluxUtils.sanitizeHTML(message)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Set loading state
     */
    function setLoading(isLoading) {
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.querySelector('.btn-text').textContent = 'Verifying...';
            loading.classList.add('visible');
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.querySelector('.btn-text').textContent = 'Verify ID';
            loading.classList.remove('visible');
        }
    }

    /**
     * Hide result
     */
    function hideResult() {
        result.className = 'verify-result';
        result.innerHTML = '';
    }

    return { init, verifyId };
})();

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxVerification.init);
} else {
    NifeluxVerification.init();
}
