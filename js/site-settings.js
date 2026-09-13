/**
 * NIFELUX TECHNOLOGIES - PUBLIC SITE SETTINGS
 * Applies admin-configured settings to the public website.
 *
 * Usage in HTML:
 *   <p data-site-setting="footer_text">© 2026 Nifelux Technologies...</p>
 *   <a href="#" data-site-setting="social_twitter" data-site-setting-attr="href">Twitter</a>
 *
 * If the backend is unreachable or a setting is empty, the
 * hardcoded HTML default is kept (graceful fallback).
 */

const NifeluxSiteSettings = (() => {
    'use strict';

    const CACHE_KEY = 'nifelux_site_settings';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Load settings: cache first, then network
     */
    async function load() {
        // 1) Browser cache
        try {
            const cached = NifeluxUtils.storage.get(CACHE_KEY);
            if (cached && cached.expires > Date.now() && cached.data) {
                return cached.data;
            }
        } catch (e) { /* ignore */ }

        // 2) Network
        try {
            const response = await fetch('/api/settings?action=public');
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const json = await response.json();
            if (json.success && json.data) {
                try {
                    NifeluxUtils.storage.set(CACHE_KEY, {
                        expires: Date.now() + CACHE_TTL,
                        data: json.data
                    });
                } catch (e) { /* ignore */ }
                return json.data;
            }
        } catch (e) {
            console.warn('Site settings unavailable, using defaults:', e);
        }

        return null;
    }

    /**
     * Safety check for URL attributes (blocks javascript: etc.)
     */
    function isSafeUrl(value) {
        return /^https?:\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:');
    }

    /**
     * Apply settings to all tagged elements
     */
    function apply(settings) {
        if (!settings) return;

        document.querySelectorAll('[data-site-setting]').forEach(el => {
            const key = el.getAttribute('data-site-setting');
            const value = settings[key];

            // Empty/missing setting → keep hardcoded default
            if (value === undefined || value === null || String(value).trim() === '') return;

            const attr = el.getAttribute('data-site-setting-attr');

            if (attr) {
                // Attribute injection (e.g., href) — validate URLs
                if (attr === 'href' || attr === 'src') {
                    if (!isSafeUrl(String(value))) return;
                }
                el.setAttribute(attr, value);
            } else {
                // Text content (safe: textContent, not innerHTML)
                el.textContent = value;
            }
        });
    }

    /**
     * Initialize on page load
     */
    async function init() {
        const settings = await load();
        apply(settings);
    }

    /**
     * Clear cached settings (forces refresh on next load)
     */
    function clearCache() {
        try {
            NifeluxUtils.storage.remove(CACHE_KEY);
        } catch (e) { /* ignore */ }
    }

    return { init, load, apply, clearCache };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxSiteSettings.init);
} else {
    NifeluxSiteSettings.init();
}

window.NifeluxSiteSettings = NifeluxSiteSettings;
