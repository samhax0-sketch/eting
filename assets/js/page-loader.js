/* ============================================================
 *  ETING — Page Loader
 *  Frosted-glass overlay yang muncul di setiap halaman saat
 *  asset (gambar Wix CDN, font Google) dan data (Supabase
 *  leaderboard) lagi loading. Auto fade-out setelah:
 *    1) window 'load' terpicu, DAN
 *    2) semua Promise yang didaftarkan via PageLoader.waitFor()
 *       sudah selesai (resolve / reject).
 * ------------------------------------------------------------
 *  API:
 *    PageLoader.show()           — paksa tampil
 *    PageLoader.hide()           — paksa sembunyi
 *    PageLoader.waitFor(promise) — tunda hide sampai promise selesai
 *                                  (return promise yang sama, jadi
 *                                  bisa di-chain .then() seperti biasa).
 * ============================================================ */
(function () {
    'use strict';

    // Hindari double-inject (mis. user navigate balik via bfcache)
    if (document.getElementById('pageLoader')) return;

    var loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.setAttribute('aria-label', 'Memuat halaman');
    loader.innerHTML =
        '<div class="page-loader-spinner" aria-hidden="true"></div>' +
        '<div class="page-loader-label">Memuat…</div>';

    // Inject begitu DOM siap (atau langsung kalau body udah ada)
    function inject() {
        if (!document.body) return;
        if (document.getElementById('pageLoader')) return;
        document.body.classList.add('page-loading');
        // Sisipkan di awal supaya selalu di atas
        if (document.body.firstChild) {
            document.body.insertBefore(loader, document.body.firstChild);
        } else {
            document.body.appendChild(loader);
        }
    }
    if (document.body) {
        inject();
    } else {
        document.addEventListener('DOMContentLoaded', inject, { once: true });
    }

    var hidden = false;
    function hide() {
        if (hidden) return;
        hidden = true;
        if (!loader.parentNode) return;
        loader.classList.add('is-hidden');
        if (document.body) document.body.classList.remove('page-loading');
        // Buang dari DOM setelah animasi selesai biar gak bebanin layout
        setTimeout(function () {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 500);
    }

    // ---- Tunggu data ----------------------------------------------------
    // Promises yang didaftarkan via waitFor() ditampung disini.
    // Loader baru hide kalau:
    //   - window.load udah kepicu, DAN
    //   - semua promise (kalau ada) udah settled.
    var pendingPromises = [];
    var windowLoaded = false;
    var waitForUsed = false;       // pernah dipanggil minimal sekali?
    var settleTimer = null;

    var MIN_DISPLAY_MS = 350;      // jangan flicker terlalu cepat
    var WINDOW_LOAD_TIMEOUT = 6000; // fallback kalau window.load gak kepicu
    var DATA_TIMEOUT_MS = 8000;    // fallback kalau data nyangkut
    var t0 = Date.now();

    function trySettle() {
        if (hidden) return;
        if (!windowLoaded) return;
        // Kalau ada user yg pakai waitFor, tunggu semua selesai dulu.
        if (waitForUsed && pendingPromises.length > 0) return;

        var elapsed = Date.now() - t0;
        var wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(hide, wait);
    }

    function waitFor(promise) {
        if (!promise || typeof promise.then !== 'function') {
            // Bukan Promise — abaikan, return as-is
            return promise;
        }
        waitForUsed = true;
        pendingPromises.push(promise);
        var done = function () {
            var idx = pendingPromises.indexOf(promise);
            if (idx >= 0) pendingPromises.splice(idx, 1);
            trySettle();
        };
        promise.then(done, done);
        return promise;
    }

    // window.load → tandai sebagai siap dari sisi asset (image/font/css)
    if (document.readyState === 'complete') {
        windowLoaded = true;
        // Kalau gak ada waitFor yg dipanggil di tick ini, settle di
        // microtask berikutnya supaya halaman sempat panggil waitFor().
        setTimeout(trySettle, 0);
    } else {
        window.addEventListener('load', function () {
            windowLoaded = true;
            trySettle();
        }, { once: true });
        // Safety net: kalau window.load gak kepicu (resource error),
        // anggap saja udah loaded setelah timeout.
        setTimeout(function () {
            if (!windowLoaded) {
                windowLoaded = true;
                trySettle();
            }
        }, WINDOW_LOAD_TIMEOUT);
    }

    // Hard-timeout total: 8 detik dari mulai. Kalau ada satu Promise
    // yg nyangkut (network slow), paksa hide biar user gak liat spinner
    // selamanya.
    setTimeout(function () {
        if (!hidden) {
            // kosongkan pending biar trySettle bisa lolos
            pendingPromises.length = 0;
            windowLoaded = true;
            hide();
        }
    }, DATA_TIMEOUT_MS);

    // Expose API
    window.PageLoader = {
        hide: hide,
        show: function () {
            hidden = false;
            if (!document.getElementById('pageLoader')) {
                inject();
            }
            loader.classList.remove('is-hidden');
            if (document.body) document.body.classList.add('page-loading');
        },
        waitFor: waitFor
    };
})();
