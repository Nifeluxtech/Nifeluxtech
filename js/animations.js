/**
 * NIFELUX TECHNOLOGIES - ANIMATION SYSTEM
 * Scroll reveal animations using IntersectionObserver
 */

const NifeluxAnimations = (() => {
    'use strict';

    let observer = null;

    /**
     * Initialize scroll reveal animations
     */
    function initScrollReveal() {
        // Skip animations if user prefers reduced motion
        if (NifeluxUtils.prefersReducedMotion()) {
            document.querySelectorAll('.reveal').forEach(el => {
                el.classList.add('visible');
            });
            return;
        }

        const elements = document.querySelectorAll('.reveal');
        if (!elements.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.1
        };

        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Add slight stagger delay based on position
                    const siblings = Array.from(entry.target.parentElement.children)
                        .filter(el => el.classList.contains('reveal'));
                    const siblingIndex = siblings.indexOf(entry.target);
                    
                    entry.target.style.transitionDelay = `${siblingIndex * 0.1}s`;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        elements.forEach(el => observer.observe(el));
    }

    /**
     * Animate element on scroll
     */
    function animateOnScroll(element, className = 'visible') {
        if (NifeluxUtils.prefersReducedMotion()) {
            element.classList.add(className);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(className);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        observer.observe(element);
    }

    /**
     * Smooth scroll to element
     */
    function smoothScrollTo(targetId) {
        const target = document.querySelector(targetId);
        if (!target) return;

        const offset = 80; // Account for fixed navbar
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
            top: targetPosition,
            behavior: NifeluxUtils.prefersReducedMotion() ? 'auto' : 'smooth'
        });
    }

    /**
     * Initialize smooth scroll for anchor links
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#' || href.length < 2) return;

                e.preventDefault();
                smoothScrollTo(href);
            });
        });
    }

    /**
     * Counter animation for stats
     */
    function animateCounter(element, target, duration = 2000) {
        if (NifeluxUtils.prefersReducedMotion()) {
            element.textContent = target;
            return;
        }

        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * eased);
            
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target;
            }
        }

        requestAnimationFrame(update);
    }

    /**
     * Initialize stat counters
     */
    function initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.count, 10);
                    if (!isNaN(target)) {
                        animateCounter(entry.target, target);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    /**
     * Parallax effect for hero elements
     */
    function initParallax() {
        if (NifeluxUtils.prefersReducedMotion()) return;

        const hero = document.querySelector('.hero');
        if (!hero) return;

        const handleMouseMove = NifeluxUtils.throttle((e) => {
            const x = (e.clientX - window.innerWidth / 2) / 50;
            const y = (e.clientY - window.innerHeight / 2) / 50;

            const visual = hero.querySelector('.hero-visual-inner');
            if (visual) {
                visual.style.transform = `translate(${x}px, ${y}px)`;
            }
        }, 16);

        hero.addEventListener('mousemove', handleMouseMove);

        hero.addEventListener('mouseleave', () => {
            const visual = hero.querySelector('.hero-visual-inner');
            if (visual) {
                visual.style.transition = 'transform 0.5s ease';
                visual.style.transform = 'translate(0, 0)';
                setTimeout(() => {
                    visual.style.transition = '';
                }, 500);
            }
        });
    }

    /**
     * Initialize all animations
     */
    function init() {
        initScrollReveal();
        initSmoothScroll();
        initCounters();
        initParallax();
    }

    /**
     * Cleanup observer
     */
    function destroy() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    return {
        init,
        destroy,
        animateOnScroll,
        smoothScrollTo,
        animateCounter
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NifeluxAnimations.init);
} else {
    NifeluxAnimations.init();
}

window.NifeluxAnimations = NifeluxAnimations;
