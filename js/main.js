/**
 * NIFELUX TECHNOLOGIES - MAIN APPLICATION
 * Initializes all systems and handles global functionality
 */

const NifeluxApp = (() => {
    'use strict';

    /**
     * Initialize all systems
     */
    function init() {
        console.log('%c Nifelux Technologies ', 
            'background: #00a8ff; color: #0a0e1a; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        console.log('Building the Future of Technology in Africa.');
        
        // Page load animation
        const loader = document.querySelector('.page-loader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 500);
            }, 300);
        }

        // Prevent FOUC - add loaded class
        document.body.classList.add('loaded');
    }

    /**
     * Demo function to test notifications and modals
     * Can be called from browser console for testing
     */
    function demo() {
        console.log('%c Demo Mode Active ', 
            'background: #10b981; color: white; padding: 2px 8px; border-radius: 4px;');
        
        // Demo notifications
        showInfo('Welcome to Nifelux Technologies', { title: 'Welcome' });
        
        setTimeout(() => {
            showSuccess('Systems initialized successfully');
        }, 1000);
        
        setTimeout(() => {
            showWarning('Demo mode: Data will not be saved');
        }, 2000);
    }

    /**
     * Handle global errors
     */
    function handleError(error) {
        console.error('Nifelux Error:', error);
        showError('An unexpected error occurred. Please try again.');
    }

    // Global error handler
    window.addEventListener('error', (e) => {
        handleError(e.error || e.message);
    });

    window.addEventListener('unhandledrejection', (e) => {
        handleError(e.reason);
    });

    return {
        init,
        demo,
        handleError
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxApp.init);
} else {
    NifeluxApp.init();
}

// Expose demo function globally for testing
window.nifeluxDemo = NifeluxApp.demo;
window.NifeluxApp = NifeluxApp;
