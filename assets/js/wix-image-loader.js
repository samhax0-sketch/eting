/**
 * wix-image-loader.js  (+ audio)
 * -------------------------------------------------------------
 * Tujuan: Meringankan beban server dengan memuat aset (gambar &
 * audio) dari Wix CDN terlebih dahulu. Jika gagal (error / timeout
 * / offline), otomatis fallback ke file lokal di folder `img/`
 * atau `sound/`.
 *
 * Cara pakai HTML deklaratif:
 *   <img   data-img="logo.png" alt="logo">
 *   <div   data-bg ="background.png"></div>
 *   <audio data-audio="jump.mp3"></audio>
 *
 * Cara pakai dari JS:
 *   const url = WixImg.url('sprite.png');           // URL Wix utk gambar
 *   const aud = WixAudio.url('jump.mp3');           // URL Wix utk audio
 *   WixImg.load('sprite.png').then(img => ...);     // Image element siap pakai
 *   const a = WixAudio.create('start.mp3');         // Audio element + fallback
 *
 * -------------------------------------------------------------
 */
(function (global) {
    'use strict';

    /* ========================================================== *
     * MAPPING (inline supaya tidak perlu fetch JSON tambahan)     *
     * Sumber: .agent/wix-mapping.json                             *
     * ========================================================== */

    var IMAGE_MAP = {
        "1.png": "https://static.wixstatic.com/media/215118_9c56bbfa85d24b828cb7a1e81183fa41~mv2.png",
        "2.png": "https://static.wixstatic.com/media/215118_b6033af583874124a55e21b6c84e1a62~mv2.png",
        "3.png": "https://static.wixstatic.com/media/215118_099edd35ed3741aa92912e6c7c2c40f9~mv2.png",
        "4.png": "https://static.wixstatic.com/media/215118_07463233e3ba47b5b539df83895cc9d9~mv2.png",
        "6.png": "https://static.wixstatic.com/media/215118_332196a8eecc4f05a434465020c96897~mv2.png",
        "7.png": "https://static.wixstatic.com/media/215118_1e01294c6bfc46679f1f5cb101725207~mv2.png",
        "8.png": "https://static.wixstatic.com/media/215118_dcc1283b3f78496788b7bca5df8866d5~mv2.png",
        "9.png": "https://static.wixstatic.com/media/215118_ad6bb430a96a41138d3b589c9553d0e6~mv2.png",
        "10.png": "https://static.wixstatic.com/media/215118_e1c084bfd9e34328967ab745c3488ab7~mv2.png",
        "11.png": "https://static.wixstatic.com/media/215118_25ae9c8acec443aeae8688244f1d8d18~mv2.png",
        "12.png": "https://static.wixstatic.com/media/215118_9b6e75acde0246eea17ba1d2a9a00ed5~mv2.png",
        "alas.png": "https://static.wixstatic.com/media/215118_95e8a323152d48e0b654c179b2149768~mv2.png",
        "antijudi.png": "https://static.wixstatic.com/media/215118_cac985ef4dfd4307bc2db0d3aef9ebd8~mv2.png",
        "background.png": "https://static.wixstatic.com/media/215118_b0fad155339b4178855b1b76d64013e9~mv2.png",
        "coin.PNG": "https://static.wixstatic.com/media/215118_1ad9bffa916544b7bdf98fa73b41a04d~mv2.png",
        "logo.png": "https://static.wixstatic.com/media/215118_3266d783c4694adaa23af2f778facf46~mv2.png",
        "pipamereng.png": "https://static.wixstatic.com/media/215118_c0b9239ddbf047059b84c9691b1f1294~mv2.png",
        "pipategak.png": "https://static.wixstatic.com/media/215118_24bbf07bf7a246419d0cdf0e5b88c026~mv2.png",
        "semangat.png": "https://static.wixstatic.com/media/215118_bddf71c9a37646149f30c0129a6bf988~mv2.png",
        "sprite.png": "https://static.wixstatic.com/media/215118_caba36b771794fb0aa5d79ec7c388f62~mv2.png",
        "tenun1.png": "https://static.wixstatic.com/media/215118_1b46a6b7f8d1477a9c89c4d2ca861647~mv2.png",
        "tenun2.png": "https://static.wixstatic.com/media/215118_e8276262c1074cb296b6ef16a19895d9~mv2.png",
        "tenun3.png": "https://static.wixstatic.com/media/215118_5cb5dc637a8e4779b0f5c6bb9dd43011~mv2.png",
        "tenun4.png": "https://static.wixstatic.com/media/215118_16c226deb8fd4106a6193cd04a9ae897~mv2.png",
        "32cf6b4e-6c65-4120-86f3-56990d8e77dd.png": "https://static.wixstatic.com/media/215118_516d9791ba474857953403f91d05c1cb~mv2.png",
        "70637dab-c814-4636-a8f6-db707c0ebaa8.png": "https://static.wixstatic.com/media/215118_9bdad445cb0f4f72a5c76b5da57b8092~mv2.png",
        "ee46dc81-9e46-4ec6-8860-a1d6128be2f0.png": "https://static.wixstatic.com/media/215118_bef9ebde759f47e6a5dbe10f05aeaf9b~mv2.png"
    };

    var AUDIO_MAP = {
        "bonus.mp3": "https://static.wixstatic.com/mp3/215118_8e292149c99049ef89574f3bcaeb872f.mp3",
        "jump.mp3": "https://static.wixstatic.com/mp3/215118_79c0c887196e424a8c8b10db9607d997.mp3",
        "nabrak.mp3": "https://static.wixstatic.com/mp3/215118_c231e56634fd4f30a978e69606c2b39b.mp3",
        "start.mp3": "https://static.wixstatic.com/mp3/215118_250450d2f3984583b8beaacb9b9b4482.mp3",
        "winning.mp3": "https://static.wixstatic.com/mp3/215118_39d57627d0054916816bb157626e3848.mp3"
    };

    var IMG_LOCAL_BASE = 'img/';
    var AUDIO_LOCAL_BASE = 'sound/';

    /* ========================================================== *
     * UTIL                                                        *
     * ========================================================== */

    function stripPrefix(name, prefixRe) {
        if (!name) return '';
        var n = String(name).trim();
        n = n.replace(prefixRe, '');
        n = n.replace(/^\//, '');
        return n;
    }

    function normalizeImg(name) { return stripPrefix(name, /^\.?\/?img\//i); }
    function normalizeAudio(name) { return stripPrefix(name, /^\.?\/?sound\//i); }

    function lookup(map, key) {
        if (map[key]) return map[key];
        var lower = key.toLowerCase();
        for (var k in map) {
            if (k.toLowerCase() === lower) return map[k];
        }
        return null;
    }

    /* ========================================================== *
     * IMAGE API                                                   *
     * ========================================================== */

    function imgWix(name) { return lookup(IMAGE_MAP, normalizeImg(name)); }
    function imgLocal(name) { return IMG_LOCAL_BASE + normalizeImg(name); }
    function imgBest(name) { return imgWix(name) || imgLocal(name); }

    function loadImage(name, opts) {
        opts = opts || {};
        var key = normalizeImg(name);
        var primary = imgWix(key);
        var fallback = imgLocal(key);

        return new Promise(function (resolve, reject) {
            var img = new Image();
            if (opts.crossOrigin) img.crossOrigin = opts.crossOrigin;
            var tried = false;
            img.onload = function () { resolve(img); };
            img.onerror = function () {
                if (!tried && primary && primary !== fallback) {
                    tried = true;
                    console.warn('[WixImg] gagal Wix, fallback lokal:', key);
                    img.src = fallback;
                } else {
                    reject(new Error('Gagal load gambar: ' + key));
                }
            };
            img.src = primary || fallback;
        });
    }

    function attachImgFallback(imgEl, name) {
        if (!imgEl) return;
        var key = normalizeImg(name || imgEl.getAttribute('data-img') || '');
        if (!key) return;
        var fallback = imgLocal(key);
        imgEl.addEventListener('error', function () {
            if (imgEl.dataset.wixFallback === '1') return;
            imgEl.dataset.wixFallback = '1';
            console.warn('[WixImg] <img> gagal Wix, fallback lokal:', key);
            imgEl.src = fallback;
        }, { once: true });
    }

    /* ========================================================== *
     * AUDIO API                                                   *
     * ========================================================== */

    function audWix(name) { return lookup(AUDIO_MAP, normalizeAudio(name)); }
    function audLocal(name) { return AUDIO_LOCAL_BASE + normalizeAudio(name); }
    function audBest(name) { return audWix(name) || audLocal(name); }

    /**
     * Bikin <audio> element dengan fallback otomatis.
     * Memakai <source> ganda: Wix dulu, lalu lokal — browser akan
     * otomatis lompat ke source berikutnya kalau source pertama gagal.
     */
    function createAudio(name, opts) {
        opts = opts || {};
        var key = normalizeAudio(name);
        var primary = audWix(key);
        var fallback = audLocal(key);

        var audio = new Audio();
        if (opts.preload) audio.preload = opts.preload;       // 'auto' | 'metadata' | 'none'
        if (opts.loop) audio.loop = true;
        if (typeof opts.volume === 'number') audio.volume = opts.volume;

        // Strategi 1: gunakan <source> child (paling reliable utk fallback)
        if (primary && primary !== fallback) {
            var s1 = document.createElement('source');
            s1.src = primary;
            s1.type = 'audio/mpeg';
            audio.appendChild(s1);
        }
        var s2 = document.createElement('source');
        s2.src = fallback;
        s2.type = 'audio/mpeg';
        audio.appendChild(s2);

        // Strategi 2: tetap pasang handler error sebagai jaring pengaman
        // (untuk kasus dimana audio.src diset eksplisit di tempat lain)
        audio.addEventListener('error', function () {
            if (audio.dataset.wixFallback === '1') return;
            audio.dataset.wixFallback = '1';
            console.warn('[WixAudio] gagal Wix, fallback lokal:', key);
            audio.src = fallback;
            audio.load();
        });

        // Trigger load awal supaya browser mulai mengevaluasi <source>
        try { audio.load(); } catch (_) { }
        return audio;
    }

    /**
     * Pasang fallback pada elemen <audio> yang sudah ada di DOM.
     */
    function attachAudioFallback(audioEl, name) {
        if (!audioEl) return;
        var key = normalizeAudio(name || audioEl.getAttribute('data-audio') || '');
        if (!key) return;
        var fallback = audLocal(key);
        audioEl.addEventListener('error', function () {
            if (audioEl.dataset.wixFallback === '1') return;
            audioEl.dataset.wixFallback = '1';
            console.warn('[WixAudio] <audio> gagal Wix, fallback lokal:', key);
            audioEl.src = fallback;
            audioEl.load();
        }, { once: true });
    }

    /* ========================================================== *
     * DOM AUTO-APPLY                                              *
     * ========================================================== */

    function applyDom(root) {
        root = root || document;

        // <img data-img="filename.png">
        root.querySelectorAll('img[data-img]').forEach(function (el) {
            var name = el.getAttribute('data-img');
            attachImgFallback(el, name);
            el.src = imgBest(name);
        });

        // [data-bg="filename.png"]  -> backgroundImage (dengan probe)
        root.querySelectorAll('[data-bg]').forEach(function (el) {
            var name = el.getAttribute('data-bg');
            var key = normalizeImg(name);
            var primary = imgWix(key);
            var fallback = imgLocal(key);

            if (primary && primary !== fallback) {
                var probe = new Image();
                probe.onload = function () { el.style.backgroundImage = 'url("' + primary + '")'; };
                probe.onerror = function () {
                    console.warn('[WixImg] bg gagal Wix, fallback lokal:', key);
                    el.style.backgroundImage = 'url("' + fallback + '")';
                };
                probe.src = primary;
            } else {
                el.style.backgroundImage = 'url("' + fallback + '")';
            }
        });

        // <audio data-audio="filename.mp3">
        root.querySelectorAll('audio[data-audio]').forEach(function (el) {
            var name = el.getAttribute('data-audio');
            var key = normalizeAudio(name);
            var primary = audWix(key);
            var fallback = audLocal(key);

            // Kosongkan source lama yang dipasang user (opsional)
            if (el.hasAttribute('data-wix-managed')) return;
            el.setAttribute('data-wix-managed', '1');

            // Hapus src lama dan source children, lalu rakit ulang
            el.removeAttribute('src');
            while (el.firstChild) el.removeChild(el.firstChild);

            if (primary && primary !== fallback) {
                var s1 = document.createElement('source');
                s1.src = primary; s1.type = 'audio/mpeg';
                el.appendChild(s1);
            }
            var s2 = document.createElement('source');
            s2.src = fallback; s2.type = 'audio/mpeg';
            el.appendChild(s2);

            attachAudioFallback(el, name);
            try { el.load(); } catch (_) { }
        });
    }

    /* ========================================================== *
     * EXPORT                                                      *
     * ========================================================== */

    global.WixImg = {
        mapping: IMAGE_MAP,
        normalize: normalizeImg,
        url: imgBest,
        wixUrl: imgWix,
        localUrl: imgLocal,
        load: loadImage,
        attachFallback: attachImgFallback,
        applyDom: applyDom
    };

    global.WixAudio = {
        mapping: AUDIO_MAP,
        normalize: normalizeAudio,
        url: audBest,
        wixUrl: audWix,
        localUrl: audLocal,
        create: createAudio,
        attachFallback: attachAudioFallback
    };

    // Auto-apply saat DOM siap.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyDom(); });
    } else {
        applyDom();
    }
})(window);
