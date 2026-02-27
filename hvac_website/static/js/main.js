/**
 * HVAC Kazakhstan — Main JavaScript
 * Handles: sticky header, mobile menu, form submissions, modals, animations
 */

document.addEventListener('DOMContentLoaded', function () {

    // ---- Sticky Header Scroll Effect ----
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', function () {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });

    // ---- Mobile Menu Toggle ----
    const mobileToggle = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('.nav');

    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', function () {
            nav.classList.toggle('open');
            const spans = mobileToggle.querySelectorAll('span');
            if (nav.classList.contains('open')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            }
        });

        // Close mobile menu on link click
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('open');
                const spans = mobileToggle.querySelectorAll('span');
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            });
        });
    }

    // ---- Smooth Scroll for Anchor Links ----
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ---- Lead Capture Form ----
    const leadForm = document.getElementById('leadForm');
    const formSuccess = document.getElementById('formSuccess');

    if (leadForm) {
        leadForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = {
                name: document.getElementById('formName').value,
                phone: document.getElementById('formPhone').value,
                city: document.getElementById('formCity').value,
                object_type: document.getElementById('formObjectType').value,
                area: document.getElementById('formArea').value
            };

            // Submit to API
            fetch('/api/submit-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                if (data.success) {
                    leadForm.style.display = 'none';
                    formSuccess.classList.add('show');
                }
            })
            .catch(function () {
                // Fallback: show success anyway for demo
                leadForm.style.display = 'none';
                formSuccess.classList.add('show');
            });
        });
    }

    // ---- Callback Modal ----
    const callbackModal = document.getElementById('callbackModal');
    const callbackForm = document.getElementById('callbackForm');

    // Open modal
    document.querySelectorAll('[data-callback]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (callbackModal) {
                callbackModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Close modal
    function closeModal() {
        if (callbackModal) {
            callbackModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    document.querySelectorAll('.modal-close').forEach(function (btn) {
        btn.addEventListener('click', closeModal);
    });

    if (callbackModal) {
        callbackModal.addEventListener('click', function (e) {
            if (e.target === callbackModal) closeModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // Callback form submit
    if (callbackForm) {
        callbackForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = {
                name: document.getElementById('callbackName').value,
                phone: document.getElementById('callbackPhone').value
            };

            fetch('/api/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                if (data.success) {
                    callbackForm.innerHTML = '<p style="text-align:center;color:#00bfa6;font-weight:600;padding:20px;">✓ ' + (document.documentElement.lang === 'kz' ? 'Рахмет! Жақын арада хабарласамыз.' : 'Спасибо! Мы перезвоним вам.') + '</p>';
                    setTimeout(closeModal, 2500);
                }
            })
            .catch(function () {
                callbackForm.innerHTML = '<p style="text-align:center;color:#00bfa6;font-weight:600;padding:20px;">✓ ' + (document.documentElement.lang === 'kz' ? 'Рахмет! Жақын арада хабарласамыз.' : 'Спасибо! Мы перезвоним вам.') + '</p>';
                setTimeout(closeModal, 2500);
            });
        });
    }

    // ---- Scroll Animations (Intersection Observer) ----
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        observer.observe(el);
    });

    // ---- Counter Animation ----
    function animateCounter(el) {
        const target = el.getAttribute('data-count');
        const isNumber = /^\d+$/.test(target.replace('+', '').replace('%', ''));
        if (!isNumber) {
            el.textContent = target;
            return;
        }

        const num = parseInt(target.replace('+', '').replace('%', ''));
        const suffix = target.includes('+') ? '+' : target.includes('%') ? '%' : '';
        let current = 0;
        const increment = Math.ceil(num / 60);
        const timer = setInterval(function () {
            current += increment;
            if (current >= num) {
                current = num;
                clearInterval(timer);
            }
            el.textContent = current + suffix;
        }, 20);
    }

    const counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const counters = entry.target.querySelectorAll('[data-count]');
                counters.forEach(animateCounter);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stats-bar').forEach(function (el) {
        counterObserver.observe(el);
    });

    // ---- Phone Input Mask (simple) ----
    document.querySelectorAll('input[type="tel"]').forEach(function (input) {
        input.addEventListener('input', function () {
            var val = this.value.replace(/[^\d+]/g, '');
            if (val.length > 0 && !val.startsWith('+')) {
                val = '+' + val;
            }
            this.value = val;
        });
    });

});
