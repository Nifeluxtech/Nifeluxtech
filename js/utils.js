/**
 * NIFELUX TECHNOLOGIES - UTILITY FUNCTIONS
 * Reusable helper functions for the entire application
 */

const NifeluxUtils = (() => {
    'use strict';

    /**
     * Format date to a human-readable string
     */
    function formatDate(dateInput, options = {}) {
        if (!dateInput) return '—';
        
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '—';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    /**
     * Format date with time
     */
    function formatDateTime(dateInput) {
        return formatDate(dateInput, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    function formatRelativeTime(dateInput) {
        if (!dateInput) return '—';
        
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return '—';
        
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        const diffWeek = Math.floor(diffDay / 7);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        if (diffWeek < 5) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
        if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
        return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
    }

    /**
     * Debounce function
     */
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     */
    function throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * Generate unique ID
     */
    function generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate employee ID (NFX-EMP-0001 format)
     */
    function generateEmployeeId(sequence) {
        const padded = String(sequence).padStart(4, '0');
        return `NFX-EMP-${padded}`;
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    function sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        if (!email) return false;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Validate phone number (basic)
     */
    function isValidPhone(phone) {
        if (!phone) return false;
        const regex = /^[\d\s\-\+\(\)]{7,20}$/;
        return regex.test(phone);
    }

    /**
     * Truncate string with ellipsis
     */
    function truncate(str, maxLength = 100) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength).trim() + '...';
    }

    /**
     * Copy text to clipboard
     */
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            return false;
        }
    }

    /**
     * Wait for specified milliseconds
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get URL parameter
     */
    function getUrlParameter(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * Check if user prefers reduced motion
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Escape regex characters
     */
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Deep clone object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Local storage wrapper with JSON support
     */
    const storage = {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        },
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch {
                return false;
            }
        }
    };

    /**
     * Session storage wrapper
     */
    const session = {
        get(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        }
    };

    // Public API
    return {
        formatDate,
        formatDateTime,
        formatRelativeTime,
        debounce,
        throttle,
        generateId,
        generateEmployeeId,
        sanitizeHTML,
        isValidEmail,
        isValidPhone,
        truncate,
        copyToClipboard,
        sleep,
        getUrlParameter,
        prefersReducedMotion,
        formatFileSize,
        escapeRegex,
        deepClone,
        storage,
        session
    };
})();

// Make globally available
window.NifeluxUtils = NifeluxUtils;
