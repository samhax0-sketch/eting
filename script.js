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

    // ---------- Leaderboard (fetch dari /api/leaderboard) ----------
    const leaderboardList = document.getElementById('leaderboardList');

    function escapeHtmlLb(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function renderLeaderboard(items) {
        if (!leaderboardList) return;
        if (!items || !items.length) {
            leaderboardList.innerHTML =
                '<div class="leaderboard-empty">Belum ada skor. Jadilah yang pertama!</div>';
            return;
        }
        const html = items.slice(0, 10).map((it, i) => {
            const rank = i + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
            const scoreFmt = (it.score || 0).toLocaleString('id-ID');
            const school = it.school ? escapeHtmlLb(it.school) : '—';
            return (
                '<div class="leaderboard-item">' +
                '<span class="rank ' + rankClass + '">' + rank + '</span>' +
                '<div class="lb-avatar">' +
                '<span class="material-symbols-rounded">person</span>' +
                '</div>' +
                '<div class="lb-info">' +
                '<strong>' + escapeHtmlLb(it.name || 'Pemain') + '</strong>' +
                '<span>' + school + '</span>' +
                '</div>' +
                '<span class="lb-score">' + scoreFmt + '</span>' +
                '</div>'
            );
        }).join('');
        leaderboardList.innerHTML = html;
    }

    function fetchLeaderboard() {
        if (!leaderboardList) return;
        try {
            fetch('/api/leaderboard?limit=50')
                .then((r) => r.ok ? r.json() : [])
                .then((data) => renderLeaderboard(data))
                .catch(() => {
                    leaderboardList.innerHTML =
                        '<div class="leaderboard-empty">Tidak dapat memuat leaderboard.</div>';
                });
        } catch (e) {
            leaderboardList.innerHTML =
                '<div class="leaderboard-empty">Tidak dapat memuat leaderboard.</div>';
        }
    }

    fetchLeaderboard();

    // Filter (placeholder — refresh ulang saat user ganti)
    const lbFilter = document.querySelector('.leaderboard-filter');
    if (lbFilter) {
        lbFilter.addEventListener('change', () => {
            fetchLeaderboard();
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
