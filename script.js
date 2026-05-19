// ========================================
// E-TING - Script Interaktif
// ========================================

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Mobile Menu Toggle ----------
    const navToggle = document.querySelector('.navbar-toggle');
    const navLinks = document.querySelector('.navbar-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = navToggle.querySelector('.material-symbols-rounded');
            if (navLinks.classList.contains('active')) {
                icon.textContent = 'close';
            } else {
                icon.textContent = 'menu';
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.querySelector('.material-symbols-rounded').textContent = 'menu';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                navToggle.querySelector('.material-symbols-rounded').textContent = 'menu';
            }
        });
    }

    // ---------- Active Nav Link ----------
    // PENTING: Hanya tambah handler untuk link placeholder (#).
    // Link dengan href ke file lain (index.html, main-game.html, dll)
    // biarkan browser navigasi normal — JANGAN attach handler apapun
    // agar tidak ada risiko preventDefault.
    const navLinkItems = document.querySelectorAll('.nav-link');
    navLinkItems.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href === '') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navLinkItems.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        }
    });

    // ---------- Profile Dropdown (placeholder) ----------
    const profileBtn = document.querySelector('.navbar-profile');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            // Placeholder for dropdown menu
            console.log('Profile dropdown toggled');
        });
    }

    // ---------- Animate Progress Bars on Scroll ----------
    const observerOptions = {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
    };

    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                animateOnScroll.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe cards for animation
    document.querySelectorAll('.card').forEach(card => {
        animateOnScroll.observe(card);
    });

    // ---------- CTA Button Ripple Effect ----------
    const ctaBtn = document.querySelector('.hero-cta');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', (e) => {
            // Visual feedback
            ctaBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                ctaBtn.style.transform = '';
            }, 150);
        });
    }

    // ---------- Challenge Button ----------
    const challengeBtn = document.querySelector('.challenge-btn');
    if (challengeBtn) {
        challengeBtn.addEventListener('click', () => {
            challengeBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                challengeBtn.style.transform = '';
            }, 150);
        });
    }

    // ---------- Card Footer Hover Animation ----------
    document.querySelectorAll('.card-footer').forEach(footer => {
        footer.addEventListener('mouseenter', () => {
            const arrow = footer.querySelector('.material-symbols-rounded');
            if (arrow) {
                arrow.style.transform = 'translateX(4px)';
            }
        });
        footer.addEventListener('mouseleave', () => {
            const arrow = footer.querySelector('.material-symbols-rounded');
            if (arrow) {
                arrow.style.transform = '';
            }
        });
    });

    // ---------- Leaderboard Filter ----------
    const lbFilter = document.querySelector('.leaderboard-filter');
    if (lbFilter) {
        lbFilter.addEventListener('change', (e) => {
            console.log('Leaderboard filter changed to:', e.target.value);
            // Placeholder for filtering logic
        });
    }

    // ---------- Video Lazy Load (Hindari Error 153 dari file://) ----------
    const videoWrapper = document.getElementById('videoWrapper');
    if (videoWrapper) {
        const playBtn = videoWrapper.querySelector('.video-play-btn');
        const videoId = videoWrapper.dataset.videoId;
        const videoToken = videoWrapper.dataset.videoToken || '';

        const loadVideo = () => {
            if (location.protocol === 'file:') {
                window.open('https://www.youtube.com/watch?v=' + videoId, '_blank', 'noopener');
                return;
            }
            const iframe = document.createElement('iframe');
            iframe.setAttribute('width', '560');
            iframe.setAttribute('height', '315');
            iframe.setAttribute('src',
                'https://www.youtube.com/embed/' + videoId + '?si=' + videoToken + '&autoplay=1&rel=0');
            iframe.setAttribute('title', 'YouTube video player');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow',
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            iframe.setAttribute('allowfullscreen', '');
            videoWrapper.innerHTML = '';
            videoWrapper.appendChild(iframe);
            videoWrapper.classList.add('video-loaded');
        };

        if (playBtn) playBtn.addEventListener('click', loadVideo);
        const poster = videoWrapper.querySelector('.video-poster');
        if (poster) poster.addEventListener('click', loadVideo);
    }

});
