/**
 * NIFELUX TECHNOLOGIES - NAVIGATION
 * Handles responsive navigation and dropdown menus
 */

const NifeluxNavbar = (() => {
    'use strict';

    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navbar-toggle');
    const menu = document.getElementById('navbar-menu');
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    /**
     * Initialize navbar scroll effects
     */
    function initScrollEffect() {
        if (!navbar) return;

        const handleScroll = NifeluxUtils.throttle(() => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, 50);

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
    }

    /**
     * Toggle mobile menu
     */
    function toggleMenu() {
        if (!toggle || !menu) return;

        const isOpen = menu.classList.contains('open');

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        if (!toggle || !menu) return;
        
        menu.classList.add('open');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        if (!toggle || !menu) return;
        
        menu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        // Close all dropdowns
        dropdowns.forEach(dd => dd.classList.remove('open'));
    }

    /**
     * Handle dropdown toggles on mobile
     */
    function initDropdowns() {
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.nav-dropdown-trigger');
            if (!trigger) return;

            trigger.addEventListener('click', (e) => {
                // Only toggle on mobile (when menu is in mobile mode)
                if (window.innerWidth < 1024) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const isOpen = dropdown.classList.contains('open');
                    
                    // Close all dropdowns first
                    dropdowns.forEach(dd => dd.classList.remove('open'));
                    
                    // Toggle current one
                    if (!isOpen) {
                        dropdown.classList.add('open');
                    }
                }
            });
        });
    }

    /**
     * Close mobile menu when clicking a link
     */
    function initMenuLinks() {
        if (!menu) return;

        const links = menu.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    closeMenu();
                }
            });
        });
    }

    /**
     * Close menu when clicking outside
     */
    function initOutsideClick() {
        document.addEventListener('click', (e) => {
            if (window.innerWidth >= 1024) return;
            if (!menu || !toggle) return;
            
            if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                closeMenu();
            }
        });
    }

    /**
     * Close menu on escape key
     */
    function initEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        });
    }

    /**
     * Handle window resize
     */
    function initResizeHandler() {
        window.addEventListener('resize', NifeluxUtils.debounce(() => {
            if (window.innerWidth >= 1024) {
                closeMenu();
            }
        }, 150));
    }

    /**
     * Set active link based on current URL
     */
    function setActiveLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.nav-link');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            if (currentPath === href || (href !== '/' && currentPath.startsWith(href))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Initialize everything
     */
    function init() {
        if (toggle) {
            toggle.addEventListener('click', toggleMenu);
        }
        
        initScrollEffect();
        initDropdowns();
        initMenuLinks();
        initOutsideClick();
        initEscapeKey();
        initResizeHandler();
        setActiveLink();
    }

    return {
        init,
        open: openMenu,
        close: closeMenu,
        toggle: toggleMenu
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxNavbar.init);
} else {
    NifeluxNavbar.init();
}

window.NifeluxNavbar = NifeluxNavbar;
