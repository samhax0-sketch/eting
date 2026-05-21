// ========================================
// TENUN FLAP - Flappy Bird Style Game
// Edukasi Anti Judol & Tenun Kaltim
// ========================================

(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return; // bukan halaman game
    const ctx = canvas.getContext('2d');

    // Logical resolution — adaptif mengikuti ukuran CSS canvas
    let W = 1280;
    let H = 500;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const newW = Math.max(320, Math.round(rect.width));
        const newH = Math.max(300, Math.round(rect.height));
        // Hanya update kalau berubah signifikan
        if (Math.abs(newW - W) < 2 && Math.abs(newH - H) < 2) return;
        W = newW;
        H = newH;
        canvas.width = W;
        canvas.height = H;
        // Reposition player horizontal proporsional
        player.x = Math.round(W * 0.18);
        // Clamp player.y agar tidak keluar
        if (player.y > H - 40) player.y = H / 2;
    }

    // ===== Bank Pertanyaan =====
    const QUESTIONS = [
        {
            q: 'Apa hukum bermain judi online di Indonesia?',
            options: ['Boleh asal kecil', 'Dilarang dan pidana', 'Hanya pajak', 'Bebas'],
            correct: 1,
            explain: 'Judi online dilarang & dapat dipidana berdasarkan UU ITE Pasal 27 ayat (2).'
        },
        {
            q: 'Sanksi pidana bagi pelaku judi online (UU ITE) maksimal?',
            options: ['1 tahun', '5 tahun', '10 tahun', '6 tahun'],
            correct: 3,
            explain: 'Maksimal 6 tahun penjara dan/atau denda hingga Rp1 miliar.'
        },
        {
            q: 'Tenun khas Kalimantan Timur yang terkenal adalah?',
            options: ['Tenun Ulos', 'Tenun Sasirangan', 'Tenun Sarung Samarinda', 'Songket Palembang'],
            correct: 2,
            explain: 'Sarung Samarinda adalah kerajinan tenun ikonik dari Kalimantan Timur.'
        },
        {
            q: 'Jika diajak main slot online oleh teman, sikap kamu?',
            options: ['Ikut sedikit', 'Tolak & ingatkan', 'Diam saja', 'Coba dulu'],
            correct: 1,
            explain: 'Tolak dengan tegas & ingatkan bahaya judi online ke teman.'
        },
        {
            q: 'Dampak utama kecanduan judi online pada pelajar?',
            options: ['Naik prestasi', 'Hemat uang', 'Rusak masa depan & utang', 'Tambah teman'],
            correct: 2,
            explain: 'Judi online merusak finansial, mental, & masa depan pelajar.'
        },
        {
            q: 'Motif khas tenun Dayak Kaltim biasanya bertema?',
            options: ['Alam & hewan', 'Robot', 'Mobil', 'Bangunan modern'],
            correct: 0,
            explain: 'Motif tenun Dayak banyak terinspirasi flora, fauna, & alam.'
        },
        {
            q: 'Iklan judi online di sosmed sebaiknya?',
            options: ['Di-klik', 'Dibagikan', 'Dilaporkan & blokir', 'Diabaikan'],
            correct: 2,
            explain: 'Laporkan ke platform agar konten judol diblokir & dihapus.'
        },
        {
            q: 'UU yang mengatur tindak pidana judi online di Indonesia?',
            options: ['UU ITE', 'UU Pajak', 'UU Lalu Lintas', 'UU Ketenagakerjaan'],
            correct: 0,
            explain: 'UU ITE Pasal 27 ayat (2) mengatur larangan perjudian online.'
        },
        {
            q: 'Kenapa tenun perlu dilestarikan?',
            options: ['Ikut tren', 'Warisan budaya & ekonomi lokal', 'Tugas wajib', 'Gak penting'],
            correct: 1,
            explain: 'Tenun adalah warisan budaya yang menghidupi ekonomi perajin lokal.'
        },
        {
            q: 'Slogan tepat melawan judi online?',
            options: ['Coba dulu', 'Stop Judol, Selamatkan Masa Depan!', 'Untung kecil', 'Hoki dulu'],
            correct: 1,
            explain: 'Stop Judol! Lindungi mental, finansial, & masa depan kita.'
        }
    ];

    // ===== Sound Effects =====
    // Pakai HTMLAudioElement (lebih simpel dari WebAudio, cukup untuk SFX pendek).
    // Tiap panggilan SFX.xxx() me-rewind audio ke 0 lalu play, supaya bisa di-trigger
    // beruntun (cth: flap-flap-flap cepat). Jika gagal play (autoplay policy), abaikan.
    const SFX = (function () {
        // Cache audio objek (1 instance per file).
        // Kalau butuh overlap sound yang sama, bisa pakai .cloneNode().
        function load(src, volume) {
            const a = new Audio(src);
            a.preload = 'auto';
            a.volume = (typeof volume === 'number') ? volume : 0.6;
            // Tangkap error supaya tidak meledak kalau file tidak ada
            a.addEventListener('error', () => {
                console.warn('[SFX] gagal load:', src);
            });
            return a;
        }
        const aJump = load('https://static.wixstatic.com/mp3/215118_79c0c887196e424a8c8b10db9607d997.mp3', 0.5);
        const aBonus = load('https://static.wixstatic.com/mp3/215118_8e292149c99049ef89574f3bcaeb872f.mp3', 0.7);
        const aNabrak = load('https://static.wixstatic.com/mp3/215118_c231e56634fd4f30a978e69606c2b39b.mp3', 0.8);
        const aStart = load('https://static.wixstatic.com/mp3/215118_250450d2f3984583b8beaacb9b9b4482.mp3', 0.6);
        const aWinning = load('https://static.wixstatic.com/mp3/215118_39d57627d0054916816bb157626e3848.mp3', 0.7);

        // Helper play: rewind + play, abaikan error (autoplay policy / belum ada user gesture).
        function play(audio) {
            if (!audio) return;
            try {
                audio.currentTime = 0;
                const p = audio.play();
                if (p && typeof p.catch === 'function') p.catch(() => { /* abaikan */ });
            } catch (e) { /* abaikan */ }
        }
        // Untuk efek yang sering overlap (flap), pakai clone supaya tidak saling memotong.
        function playClone(audio) {
            if (!audio) return;
            try {
                const c = audio.cloneNode();
                c.volume = audio.volume;
                const p = c.play();
                if (p && typeof p.catch === 'function') p.catch(() => { });
            } catch (e) { /* abaikan */ }
        }

        return {
            flap() { playClone(aJump); },        // lompat burung
            score() { /* silent: pass pipa, biar tidak rame */ },
            coin() { play(aBonus); },            // ambil coin
            correct() { play(aBonus); },            // jawab quiz/puzzle benar
            wrong() { /* silent: tidak ada file salah */ },
            levelUp() { play(aWinning); },          // naik checkpoint/level
            hit() { play(aNabrak); },           // tabrak pipa / game over
            die() { /* sudah ditutup hit() */ },
            countdown() { /* silent: countdown 5..1 */ },
            go() { play(aStart); },            // mulai bermain (setelah GO!)
            puzzlePlace() { /* silent: letakkan puzzle */ },
            startUI() { play(aStart); }             // tombol Mulai / Main Lagi
        };
    })();

    // ===== State =====
    let state = 'start'; // 'start' | 'play' | 'gameover' | 'paused' | 'countdown' | 'ready'
    let score = 0;
    let coins = 0;
    let level = 1;
    let pointsToCheckpoint = 0; // count gates passed in current level
    const GATES_PER_CHECKPOINT = 5;

    // ===== Player name & school (persistent) =====
    let playerName = '';
    let playerSchool = '';
    try {
        playerName = localStorage.getItem('eting_player_name') || '';
        playerSchool = localStorage.getItem('eting_player_school') || '';
    } catch (e) {
        playerName = '';
        playerSchool = '';
    }
    let lastSubmittedScore = -1; // hindari double submit untuk skor yang sama

    // ===== Difficulty config per level — RESPONSIVE TUNING (untuk lomba) =====
    // gravity ringan-medium + flap tegas → snappy, tidak slow-motion di HP/desktop
    // speedMul start dari 0.95 supaya gerakan pipa sudah terasa cepat sejak level 1
    function getDifficulty(lv) {
        // Pergerakan burung dibuat LEBIH PELAN supaya tidak terasa cepat/nyentak.
        // gravity rendah → burung tidak ngedrop liar.
        // flapPower kecil → lompatan halus, tidak melompat jauh.
        if (lv <= 1) return { gapBonus: 80, spawnBonus: 100, speedMul: 0.85, gravity: 0.12, flapPower: -4.0 };
        if (lv === 2) return { gapBonus: 55, spawnBonus: 65, speedMul: 0.92, gravity: 0.14, flapPower: -4.2 };
        if (lv === 3) return { gapBonus: 28, spawnBonus: 35, speedMul: 1.00, gravity: 0.16, flapPower: -4.5 };
        // Level 4+ tetap paling sulit, tapi masih lebih kalem dari sebelumnya
        return { gapBonus: 0, spawnBonus: 0, speedMul: 1.08, gravity: 0.18, flapPower: -4.8 };
    }

    // Inset persentase: bagian transparan halo kiri/kanan di gambar pipategak.png
    // (analisis opacity bbox menunjukkan core solid ≈ 83% lebar; padding ~8.5% per sisi)
    // Dipakai untuk hitbox supaya FAIR (tidak nabrak transparan).
    const PIPE_CORE_INSET = 0.085;

    // ===== Player (burung Enggang) =====
    const player = {
        x: 150,
        y: 250,
        vy: 0,
        size: 32,
        gravity: 0.12,       // KALEM — pergerakan tidak terasa cepat
        flapPower: -4.0,     // lompatan halus, tidak menyentak
        rotation: 0,
        maxFallSpeed: 4,     // terminal velocity dibatasi supaya tidak nyungsep
        hitboxScale: 0.72    // hitbox 72% dari visual size (visual > hitbox = fair)
    };

    // ===== Pipes & Items =====
    let pipes = [];     // {x, gapY, gapH, passed}
    let coinItems = []; // {x, y, taken}
    let checkpoints = []; // {x, hit}
    let spawnTimer = 0;
    let baseSpeed = 0.9;
    let speed = baseSpeed;

    // ===== Asset Images =====
    // Background dipakai LOOPING berurutan dari list (urutan 1..12, file 5 tidak ada → diskip)
    const BG_FILES = [
        'https://static.wixstatic.com/media/215118_9c56bbfa85d24b828cb7a1e81183fa41~mv2.png',
        'https://static.wixstatic.com/media/215118_b6033af583874124a55e21b6c84e1a62~mv2.png',
        'https://static.wixstatic.com/media/215118_099edd35ed3741aa92912e6c7c2c40f9~mv2.png',
        'https://static.wixstatic.com/media/215118_07463233e3ba47b5b539df83895cc9d9~mv2.png',
        'https://static.wixstatic.com/media/215118_332196a8eecc4f05a434465020c96897~mv2.png',
        'https://static.wixstatic.com/media/215118_1e01294c6bfc46679f1f5cb101725207~mv2.png',
        'https://static.wixstatic.com/media/215118_dcc1283b3f78496788b7bca5df8866d5~mv2.png',
        'https://static.wixstatic.com/media/215118_ad6bb430a96a41138d3b589c9553d0e6~mv2.png',
        'https://static.wixstatic.com/media/215118_e1c084bfd9e34328967ab745c3488ab7~mv2.png',
        'https://static.wixstatic.com/media/215118_25ae9c8acec443aeae8688244f1d8d18~mv2.png',
        'https://static.wixstatic.com/media/215118_9b6e75acde0246eea17ba1d2a9a00ed5~mv2.png'
    ];
    const assets = {
        bgs: [],          // array of {img, ready}
        bgReadyCount: 0,
        pipe: null,
        pipeSlant: null,
        coin: null,
        alas: null,
        sprite: null,     // sprite sheet burung enggang (sudah transparan via preprocessing offline)
        pipeReady: false,
        pipeSlantReady: false,
        coinReady: false,
        alasReady: false,
        spriteReady: false
    };
    // Sprite sheet burung: 1448x1086, grid 3 kolom x 2 baris
    // Baris 0: animasi flap (col 0 = sayap atas, 1 = tengah, 2 = bawah)
    const SPRITE_COLS = 3;
    const SPRITE_ROWS = 2;
    // Background scroll offset (parallax) & index looping
    let bgOffset = 0;
    let bgIndex = 0; // index aktif di BG_FILES
    // Alas scroll offset — atap & lantai ikut bergerak biar terasa hidup
    let alasOffset = 0;

    // Mudahnya cek bg ready: ada minimal 1 gambar yang ter-load di slot index aktif
    function isBgReady() {
        const slot = assets.bgs[bgIndex];
        return !!(slot && slot.ready);
    }
    function getCurrentBg() {
        const slot = assets.bgs[bgIndex];
        return slot && slot.ready ? slot.img : null;
    }

    // ===== Loading progress tracking =====
    // Total asset = 11 BG + 5 single (pipe, pipeSlant, coin, alas, sprite) = 16
    const TOTAL_ASSETS = BG_FILES.length + 5;
    let loadedCount = 0;
    const loadingScreenEl = document.getElementById('gameLoadingScreen');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingPercentEl = document.getElementById('loadingPercent');
    const loadingStatusEl = document.getElementById('loadingStatus');
    const loadingTipEl = document.getElementById('loadingTip');

    // Daftar tip rotating supaya loading tidak monoton
    const LOADING_TIPS = [
        'Tip: Klik atau tap layar untuk membuat burung terbang!',
        'Tip: Jawab quiz dengan benar untuk hidup lagi setelah game over.',
        'Tip: Susun puzzle motif tenun untuk dapat bonus revive!',
        'Tip: Kumpulkan koin tenun untuk poin tambahan & quiz edukasi.',
        'Tip: Setiap level kecepatan bertambah — siap-siap lebih fokus!',
        'Tahukah kamu? Tenun Kalimantan punya motif khas Dayak yang sarat makna.'
    ];
    let tipIndex = 0;
    let tipRotator = null;
    if (loadingTipEl) {
        loadingTipEl.textContent = LOADING_TIPS[0];
        tipRotator = setInterval(() => {
            tipIndex = (tipIndex + 1) % LOADING_TIPS.length;
            if (loadingTipEl) {
                loadingTipEl.style.opacity = '0';
                setTimeout(() => {
                    loadingTipEl.textContent = LOADING_TIPS[tipIndex];
                    loadingTipEl.style.opacity = '1';
                }, 200);
            }
        }, 2800);
    }

    function setLoadingStatus(text) {
        if (loadingStatusEl) loadingStatusEl.textContent = text;
    }

    function bumpProgress(label) {
        loadedCount++;
        const pct = Math.min(100, Math.round((loadedCount / TOTAL_ASSETS) * 100));
        if (loadingProgressBar) loadingProgressBar.style.width = pct + '%';
        if (loadingPercentEl) loadingPercentEl.textContent = pct + '%';
        if (label) setLoadingStatus(label);
        if (loadedCount >= TOTAL_ASSETS) {
            // Semua asset siap — fade out loading screen setelah delay singkat
            // supaya progress 100% sempat terlihat.
            setLoadingStatus('Siap! Selamat bermain');
            setTimeout(hideLoadingScreen, 450);
        }
    }

    function hideLoadingScreen() {
        if (tipRotator) { clearInterval(tipRotator); tipRotator = null; }
        if (loadingScreenEl) {
            loadingScreenEl.classList.add('loading-hidden');
            // Hapus dari DOM setelah transisi
            setTimeout(() => {
                if (loadingScreenEl && loadingScreenEl.parentNode) {
                    loadingScreenEl.parentNode.removeChild(loadingScreenEl);
                }
            }, 700);
        }
    }

    // Safety fallback: maksimal 12 detik loading. Kalau ada asset stuck/timeout,
    // tetap lanjut supaya user tidak terjebak di loading screen forever.
    setTimeout(() => {
        if (loadedCount < TOTAL_ASSETS) {
            console.warn('Loading timeout: ' + loadedCount + '/' + TOTAL_ASSETS + ' selesai. Lanjut paksa.');
            setLoadingStatus('Memulai dengan asset tersedia...');
            // Force progress ke 100% untuk visual
            if (loadingProgressBar) loadingProgressBar.style.width = '100%';
            if (loadingPercentEl) loadingPercentEl.textContent = '100%';
            setTimeout(hideLoadingScreen, 600);
        }
    }, 12000);

    (function loadAssets() {
        setLoadingStatus('Memuat latar belakang...');

        // Preload semua background untuk looping mulus
        BG_FILES.forEach((src, i) => {
            const slot = { img: new Image(), ready: false };
            slot.img.onload = () => {
                slot.ready = true;
                assets.bgReadyCount++;
                bumpProgress('Latar belakang ' + (i + 1) + '/' + BG_FILES.length);
            };
            slot.img.onerror = () => {
                console.warn(src + ' gagal dimuat');
                bumpProgress('Latar ' + (i + 1) + ' dilewati');
            };
            slot.img.src = src;
            assets.bgs[i] = slot;
        });

        const pipeImg = new Image();
        pipeImg.onload = () => {
            assets.pipe = pipeImg; assets.pipeReady = true;
            bumpProgress('Memuat pipa tenun...');
        };
        pipeImg.onerror = () => { console.warn('pipategak.png gagal dimuat'); bumpProgress('Pipa dilewati'); };
        pipeImg.src = 'https://static.wixstatic.com/media/215118_24bbf07bf7a246419d0cdf0e5b88c026~mv2.png';

        const pipeSlantImg = new Image();
        pipeSlantImg.onload = () => {
            assets.pipeSlant = pipeSlantImg; assets.pipeSlantReady = true;
            bumpProgress('Memuat pipa miring...');
        };
        pipeSlantImg.onerror = () => { console.warn('pipamereng.png gagal dimuat'); bumpProgress('Pipa miring dilewati'); };
        pipeSlantImg.src = 'https://static.wixstatic.com/media/215118_c0b9239ddbf047059b84c9691b1f1294~mv2.png';

        const coinImg = new Image();
        coinImg.onload = () => {
            assets.coin = coinImg; assets.coinReady = true;
            bumpProgress('Memuat koin...');
        };
        coinImg.onerror = () => { console.warn('coin.PNG gagal dimuat'); bumpProgress('Koin dilewati'); };
        coinImg.src = 'https://static.wixstatic.com/media/215118_1ad9bffa916544b7bdf98fa73b41a04d~mv2.png';

        const alasImg = new Image();
        alasImg.onload = () => {
            assets.alas = alasImg; assets.alasReady = true;
            bumpProgress('Memuat alas tenun...');
        };
        alasImg.onerror = () => { console.warn('alas.png gagal dimuat'); bumpProgress('Alas dilewati'); };
        alasImg.src = 'https://static.wixstatic.com/media/215118_95e8a323152d48e0b654c179b2149768~mv2.png';

        // ===== Sprite burung enggang =====
        // Background sudah transparan + cropped via tools/preprocess_sprite.py (pre-build, offline).
        // Tidak ada lagi chroma-key runtime di client → ringan, tidak bebani CPU/GPU.
        const spriteImg = new Image();
        spriteImg.onload = () => {
            assets.sprite = spriteImg;
            assets.spriteReady = true;
            bumpProgress('Sprite burung siap!');
        };
        spriteImg.onerror = () => {
            console.warn('sprite.png gagal dimuat');
            bumpProgress('Sprite dilewati');
        };
        spriteImg.src = 'https://static.wixstatic.com/media/215118_b32d863a754f425084be3f51fcbec519~mv2.png';
    })();

    // Counter pipa untuk spawn coin yang jarang (tiap 3-5 pipa random)
    let pipesSinceLastCoin = 0;
    let nextCoinAfter = 3 + Math.floor(Math.random() * 3); // 3..5

    // ===== Clouds bg parallax =====
    const clouds = Array.from({ length: 5 }, () => ({
        x: Math.random() * W,
        y: 30 + Math.random() * 180,
        size: 30 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.4
    }));

    // ===== DOM refs =====
    const hudScore = document.getElementById('hudScore');
    const hudLevel = document.getElementById('hudLevel');
    const hudCoins = document.getElementById('hudCoins');
    const hudPlayerEl = document.getElementById('hudPlayer');
    const overlayName = document.getElementById('overlayName');
    const overlayStart = document.getElementById('overlayStart');
    const overlayGameOver = document.getElementById('overlayGameOver');
    const overlayCheckpoint = document.getElementById('overlayCheckpoint');
    const inputPlayerName = document.getElementById('inputPlayerName');
    const inputPlayerSchool = document.getElementById('inputPlayerSchool');
    const btnSaveName = document.getElementById('btnSaveName');
    const btnChangeName = document.getElementById('btnChangeName');
    const gameLeaderboardList = document.getElementById('gameLeaderboardList');
    const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');
    const gameLeaderboardPanel = document.getElementById('gameLeaderboardPanel');
    const btnToggleLeaderboard = document.getElementById('btnToggleLeaderboard');
    const btnStart = document.getElementById('btnStart');
    const btnRevive = document.getElementById('btnRevive');
    const btnRestart = document.getElementById('btnRestart');
    const btnContinueLevel = document.getElementById('btnContinueLevel');
    const finalScoreEl = document.getElementById('finalScore');
    const newLevelEl = document.getElementById('newLevel');
    const greetNameEl = document.getElementById('greetName');
    const loseNameEl = document.getElementById('loseName');
    const quizModal = document.getElementById('quizModal');
    const quizBadge = document.getElementById('quizBadge');
    const quizQuestionEl = document.getElementById('quizQuestion');
    const quizOptionsEl = document.getElementById('quizOptions');
    const quizFeedbackEl = document.getElementById('quizFeedback');
    const countdownEl = document.getElementById('gameCountdown');
    const countdownNumberEl = document.getElementById('countdownNumber');
    const countdownLabelEl = document.getElementById('countdownLabel');
    const readyHintEl = document.getElementById('readyHint');

    function showReadyHint() {
        if (readyHintEl) readyHintEl.classList.add('active');
    }
    function hideReadyHint() {
        if (readyHintEl) readyHintEl.classList.remove('active');
    }

    // Puzzle Menenun
    const puzzleModal = document.getElementById('puzzleModal');
    const puzzleBoard = document.getElementById('puzzleBoard');
    const puzzleTray = document.getElementById('puzzleTray');
    const puzzleTargetImg = document.getElementById('puzzleTargetImg');
    const puzzleTitleEl = document.getElementById('puzzleTitle');
    const puzzleBadgeEl = document.getElementById('puzzleBadge');
    const puzzleFeedbackEl = document.getElementById('puzzleFeedback');
    const btnPuzzleShuffle = document.getElementById('btnPuzzleShuffle');
    const btnPuzzleContinue = document.getElementById('btnPuzzleContinue');
    const btnPuzzleContinueText = document.getElementById('btnPuzzleContinueText');
    const PUZZLE_IMAGES = ['https://static.wixstatic.com/media/215118_1b46a6b7f8d1477a9c89c4d2ca861647~mv2.png', 'https://static.wixstatic.com/media/215118_e8276262c1074cb296b6ef16a19895d9~mv2.png', 'https://static.wixstatic.com/media/215118_5cb5dc637a8e4779b0f5c6bb9dd43011~mv2.png', 'https://static.wixstatic.com/media/215118_16c226deb8fd4106a6193cd04a9ae897~mv2.png'];

    // Puzzle: SELALU 3x3 (9 keping) untuk semua level
    function getPuzzleGrid(_lv) {
        return 3; // selalu 3x3
    }
    function getPuzzlePreplaced(grid) {
        return grid === 2 ? 1 : 2; // beri 1-2 petunjuk
    }

    // ===== Helpers =====
    function updateHUD() {
        hudScore.textContent = score;
        hudLevel.textContent = level;
        hudCoins.textContent = coins;
        if (hudPlayerEl) hudPlayerEl.textContent = playerName || 'Pemain';
    }

    function applyDifficulty(lv) {
        const d = getDifficulty(lv);
        player.gravity = d.gravity;
        player.flapPower = d.flapPower;
        speed = baseSpeed * d.speedMul;
    }

    function resetGame() {
        score = 0;
        coins = 0;
        level = 1;
        pointsToCheckpoint = 0;
        lastSubmittedScore = -1;
        baseSpeed = 0.9;
        speed = baseSpeed;
        player.x = Math.round(W * 0.18);
        player.y = H / 2;
        player.vy = 0;
        player.rotation = 0;
        player.idleAnchor = H / 2;
        pipes = [];
        coinItems = [];
        checkpoints = [];
        pipesSinceLastCoin = 0;
        nextCoinAfter = 3 + Math.floor(Math.random() * 3); // 3..5
        spawnTimer = 0;
        applyDifficulty(level);
        updateHUD();
        hideReadyHint();
    }

    function showOverlay(el) {
        // overlayCheckpoint sekarang champion-overlay (pakai class .show, bukan game-overlay-hidden)
        [overlayName, overlayStart, overlayGameOver].forEach(o => {
            if (o) o.classList.add('game-overlay-hidden');
        });
        if (el) el.classList.remove('game-overlay-hidden');
    }

    function hideAllOverlays() {
        // Pastikan puzzle modal juga tertutup
        if (puzzleModal) puzzleModal.classList.remove('show');
        // Champion overlay disembunyikan via class .show (dikontrol showChampionEffect)
        if (overlayCheckpoint) overlayCheckpoint.classList.remove('show', 'fade-out');
        [overlayName, overlayStart, overlayGameOver].forEach(o => {
            if (o) o.classList.add('game-overlay-hidden');
        });
    }

    function flap() {
        if (state !== 'play') return;
        player.vy = player.flapPower;
        SFX.flap();
    }

    // ===== Spawn =====
    // Lebar pipa (default tegak) dibuat lebih besar agar tidak ramping
    const PIPE_W_DEFAULT = 84;
    const PIPE_W_SLANT = 110; // pipa miring biasanya tampak lebih lebar
    // Jarak HORIZONTAL antar pipa (px). Ini yang membuat respawn konsisten,
    // bukan timer frame (yang acak-acakan saat speed berubah).
    function getPipeSpacing() {
        // Lebih sempit di level tinggi supaya lebih menantang, tapi minimum aman:
        // - minimum 280px (cukup untuk burung bermanuver di gap 160px)
        // - maksimum ~360px di level 1 (lega untuk pemula)
        const base = 360 - (level - 1) * 18;
        return Math.max(280, base);
    }

    // Cegah gapY pipa baru terlalu jauh dari pipa sebelumnya supaya tidak
    // mustahil dilewati (vertical delta maksimum proporsional spacing).
    function pickGapY(gapH, alasH) {
        const topPad = alasH + 24;
        const botPad = alasH + 24;
        const minY = topPad;
        const maxY = Math.max(minY + 1, H - botPad - gapH);

        // Jika ada pipa sebelumnya, batasi delta vertikal supaya transisi smooth
        const last = pipes[pipes.length - 1];
        if (last) {
            const lastCenter = last.gapY + last.gapH / 2;
            // Max delta center = 35% dari area main yang bisa dipakai
            const usable = maxY - minY;
            const maxDelta = Math.max(40, usable * 0.35);
            const desiredCenterMin = Math.max(minY + gapH / 2, lastCenter - maxDelta);
            const desiredCenterMax = Math.min(maxY + gapH / 2, lastCenter + maxDelta);
            const centerMin = Math.max(minY + gapH / 2, desiredCenterMin);
            const centerMax = Math.min(maxY + gapH / 2, desiredCenterMax);
            if (centerMax > centerMin) {
                const center = centerMin + Math.random() * (centerMax - centerMin);
                return center - gapH / 2;
            }
        }
        return minY + Math.random() * (maxY - minY);
    }

    function spawnPipe() {
        const d = getDifficulty(level);
        const baseGap = 210 - level * 5;
        const gapH = Math.max(160, baseGap) + d.gapBonus;
        const alasH = getAlasDrawHeight();
        const gapY = pickGapY(gapH, alasH);

        // Variasi pipa MIRING (pipamereng) DINONAKTIFKAN.
        // Alasan: pipamereng.png menampakkan ujung botol/ornamen yang ketika
        // di-rotate + flip tidak menempel ke atap/lantai → terlihat "patah"
        // dan membingungkan pemain (sumber: feedback user + screenshot).
        // Selalu pakai pipa tegak supaya gameplay jelas & konsisten.
        const useSlant = false;
        const variant = 'tegak';
        const slantDir = 1;

        pipes.push({
            x: W + 20,
            gapY,
            gapH,
            passed: false,
            variant,
            slantDir,
            w: useSlant ? PIPE_W_SLANT : PIPE_W_DEFAULT
        });

        // Coin muncul JARANG: tiap 3..5 pipa secara acak, satu coin
        pipesSinceLastCoin++;
        if (pipesSinceLastCoin >= nextCoinAfter) {
            pipesSinceLastCoin = 0;
            nextCoinAfter = 3 + Math.floor(Math.random() * 3); // reset 3..5
            // Posisi coin di tengah gap pipa berikutnya supaya kelihatan & masih bisa diambil
            coinItems.push({ x: W + 20 + 30, y: gapY + gapH / 2, taken: false });
        }
    }

    function spawnCheckpoint() {
        checkpoints.push({ x: W + 20, hit: false });
    }

    // Setelah respawn (revive), supaya tidak terasa "ngulang dari awal"
    // (pipa kosong → harus nunggu lama sampai pipa baru muncul dari kanan),
    // kita seed satu pipa pada jarak NYAMAN di kanan burung.
    // - Jarak cukup buat reaksi (~aman, gap tinggi tengah)
    // - Tidak terlalu jauh → terasa kompak / nyambung
    function seedPipeAfterRespawn() {
        const d = getDifficulty(level);
        const baseGap = 210 - level * 5;
        // Gap sedikit lebih lega saat respawn supaya fair (bonus 30px)
        const gapH = Math.max(160, baseGap) + d.gapBonus + 30;
        const alasH = getAlasDrawHeight();
        // Tempatkan gap kira-kira di tinggi burung sekarang, biar bisa langsung dilewati
        const topPad = alasH + 24;
        const botPad = alasH + 24;
        const minY = topPad;
        const maxY = Math.max(minY + 1, H - botPad - gapH);
        let gapY = (player.y || H / 2) - gapH / 2;
        if (gapY < minY) gapY = minY;
        if (gapY > maxY) gapY = maxY;

        // Posisi X: cukup di kanan burung supaya kompak (tidak terasa restart),
        // tapi masih ada ruang reaksi.
        const seedX = (player.x || 120) + 320;

        pipes.push({
            x: seedX,
            gapY,
            gapH,
            passed: false,
            variant: 'tegak', // pipa seed selalu tegak biar paling mudah dibaca
            slantDir: 1,
            w: PIPE_W_DEFAULT
        });
    }

    // ===== Update =====
    function update() {
        // Idle bobbing: saat menunggu player tap (state='ready'), burung melayang naik-turun pelan
        if (state === 'ready') {
            player.vy = 0;
            // sinus halus pakai performance.now
            const t = performance.now() / 350;
            player.y = (player.idleAnchor || 250) + Math.sin(t) * 8;
            player.rotation = Math.sin(t) * 0.08;
            return;
        }
        // Level up freeze + countdown: game pause, burung idle bobbing supaya tetap hidup visualnya
        if (state === 'levelup' || state === 'countdown') {
            player.vy = 0;
            const t = performance.now() / 350;
            player.y = (player.idleAnchor || H / 2) + Math.sin(t) * 6;
            player.rotation = Math.sin(t) * 0.08;
            return;
        }
        if (state !== 'play') return;

        // Player physics (Flappy Bird style)
        player.vy += player.gravity;
        // Terminal velocity supaya jatuh tidak makin liar
        if (player.vy > player.maxFallSpeed) player.vy = player.maxFallSpeed;
        player.y += player.vy;
        // Rotasi proporsional vy: saat flap → menengadah, saat jatuh → menukik
        player.rotation = Math.max(-0.5, Math.min(1.4, player.vy * 0.06));

        // Boundary collision — pakai tinggi alas (atas = plafon, bawah = lantai)
        const alasH = getAlasDrawHeight();
        const hitR = (player.size / 2) * player.hitboxScale;
        if (player.y - hitR < alasH) {
            // Mentok plafon: pantul ke bawah sedikit (jangan langsung game over biar fair)
            player.y = alasH + hitR;
            if (player.vy < 0) player.vy = 0;
        }
        if (player.y + hitR > H - alasH) { // mentok lantai
            gameOver();
            return;
        }

        // Spawn pipes BERBASIS JARAK (px), bukan frame timer.
        // Ini fix "respown acak-acakan": jarak antar pipa konsisten apapun speed.
        const targetSpacing = getPipeSpacing();
        const lastPipe = pipes[pipes.length - 1];
        const needSpawn = !lastPipe || (W - lastPipe.x) >= targetSpacing;
        if (needSpawn) {
            spawnPipe();
        }

        // Move pipes
        for (const p of pipes) {
            p.x -= speed;
            // Score on pass
            if (!p.passed && p.x + (p.w || PIPE_W_DEFAULT) < player.x) {
                p.passed = true;
                score += 5; // pipa = 5 poin
                SFX.score();
                updateHUD();
                // Level up tiap kelipatan 100 score
                const newLevel = Math.floor(score / 100) + 1;
                if (newLevel > level) {
                    onLevelUp(newLevel);
                }
            }
        }
        pipes = pipes.filter(p => p.x > -80);

        // Move coins
        for (const c of coinItems) {
            c.x -= speed;
            if (!c.taken && circleRectCollideCoin(c)) {
                c.taken = true;
                coins++;
                SFX.coin();
                showQuiz('coin');
            }
        }
        coinItems = coinItems.filter(c => c.x > -40 && !c.taken);

        // (Checkpoint flag dihapus — level up sekarang via kelipatan 100 score)

        // Pipe collision
        for (const p of pipes) {
            if (rectCollidePipe(p)) {
                gameOver();
                return;
            }
        }

        // Clouds
        for (const cl of clouds) {
            cl.x -= cl.speed;
            if (cl.x + cl.size < 0) {
                cl.x = W + cl.size;
                cl.y = 30 + Math.random() * 180;
            }
        }

        // Background parallax scroll
        bgOffset -= speed * 0.4;

        // Alas (atap + lantai) DIAM — tidak scroll supaya tidak bikin pusing
        // dan terasa seperti "frame" tetap di sekitar arena gameplay.
        // alasOffset sengaja tidak di-update.
    }

    function rectCollidePipe(p) {
        const pw = p.w || PIPE_W_DEFAULT;
        // Inset hitbox horizontal supaya area transparan di kiri/kanan gambar pipa
        // (≈ 8.5% per sisi) TIDAK dianggap solid. Hitbox player juga di-scale.
        const insetX = pw * PIPE_CORE_INSET;
        const px = p.x + insetX;
        const corePw = pw - insetX * 2;
        const hitR = (player.size / 2) * player.hitboxScale;
        const inX = player.x + hitR > px && player.x - hitR < px + corePw;
        if (!inX) return false;
        // Vertikal: sedikit tolerance supaya tidak terasa "kepala kena udara"
        const vTol = 2;
        const inGapY = player.y - hitR > p.gapY - vTol && player.y + hitR < p.gapY + p.gapH + vTol;
        return !inGapY;
    }

    function circleRectCollideCoin(c) {
        const r = 18; // disesuaikan dengan ukuran visual coin (~32px)
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        return Math.sqrt(dx * dx + dy * dy) < player.size / 2 + r;
    }

    // ===== Events =====
    function gameOver() {
        state = 'gameover';
        SFX.hit();
        setTimeout(() => SFX.die(), 240);
        finalScoreEl.textContent = score;
        showOverlay(overlayGameOver);
        // Kirim skor ke leaderboard (async, non-blocking)
        try { submitScoreToLeaderboard(); } catch (e) { }
    }

    function onLevelUp(newLevel) {
        // Update state level dulu
        level = newLevel;
        baseSpeed += 0.12;
        applyDifficulty(level);
        newLevelEl.textContent = level;
        updateHUD();

        // Tampilkan efek juara (overlay non-blocking)
        showChampionEffect();

        // PAUSE sebentar lalu COUNTDOWN 5→1→GO sebelum lanjut.
        // state='levelup' → update() skip physics/spawn (burung idle bobbing).
        state = 'levelup';
        // Anchor burung di posisi sekarang supaya tidak loncat saat pause
        player.idleAnchor = player.y;
        player.vy = 0;
        // Tunggu efek juara selesai (~1.7s), lalu mulai countdown
        setTimeout(() => {
            if (state !== 'levelup') return; // safety
            startCountdown(() => { state = 'play'; }, {
                label: 'Level ' + level + '!',
                startFrom: 5
            });
        }, 1700);
    }

    // ===== Efek "Juara" saat Checkpoint (overlay non-blocking) =====
    function showChampionEffect() {
        if (!overlayCheckpoint) return;
        overlayCheckpoint.classList.remove('fade-out');
        overlayCheckpoint.classList.add('show');
        SFX.levelUp();
        burstConfetti(overlayCheckpoint, { count: 70 });
        // Auto-dismiss setelah 1.6 detik
        setTimeout(() => {
            overlayCheckpoint.classList.add('fade-out');
            setTimeout(() => {
                overlayCheckpoint.classList.remove('show', 'fade-out');
            }, 350);
        }, 1600);
    }

    // ===== Puzzle Menenun (Revive context) =====
    let puzzlePieces = [];   // { id, placedAt: number|null }
    let puzzleImageUrl = '';
    let puzzleDragId = null;
    let puzzleGrid = 2;
    let puzzleContext = null; // 'revive'
    let puzzleSolved = false;

    function openPuzzle(context) {
        puzzleContext = context || 'revive';
        puzzleSolved = false;
        // Grid adaptif berdasar level
        puzzleGrid = getPuzzleGrid(level);
        // Gambar RANDOM (tidak berurutan)
        puzzleImageUrl = PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
        puzzleTargetImg.src = puzzleImageUrl;
        if (puzzleTitleEl) puzzleTitleEl.textContent = 'Susun Pola Tenun';
        if (puzzleBadgeEl) puzzleBadgeEl.textContent = puzzleContext === 'revive' ? '💀 Hidup Lagi' : '🧵 Puzzle';
        if (btnPuzzleContinueText) btnPuzzleContinueText.textContent = puzzleContext === 'revive' ? 'Coba' : 'Lanjut';
        puzzleFeedbackEl.className = 'puzzle-feedback';
        puzzleFeedbackEl.textContent = 'Tarik keping ke pola yang sesuai';
        btnPuzzleContinue.disabled = false;
        buildPuzzle();
        puzzleModal.classList.add('show');
    }

    function closePuzzle() {
        puzzleModal.classList.remove('show');
    }

    function buildPuzzle() {
        const grid = puzzleGrid;
        const n = grid * grid;
        puzzleBoard.style.setProperty('--grid', String(grid));
        puzzleBoard.innerHTML = '';
        const slotEls = [];
        for (let i = 0; i < n; i++) {
            const slot = document.createElement('div');
            slot.className = 'puzzle-slot';
            slot.dataset.slotIndex = String(i);
            slot.addEventListener('dragover', onSlotDragOver);
            slot.addEventListener('dragleave', onSlotDragLeave);
            slot.addEventListener('drop', onSlotDrop);
            puzzleBoard.appendChild(slot);
            slotEls.push(slot);
        }
        puzzlePieces = [];
        for (let i = 0; i < n; i++) {
            puzzlePieces.push({ id: i, placedAt: null });
        }
        // Auto-pasang 1-2 keping sebagai petunjuk
        const indices = [];
        for (let i = 0; i < n; i++) indices.push(i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const prePlaceCount = Math.min(getPuzzlePreplaced(grid), n - 1);
        for (let k = 0; k < prePlaceCount; k++) {
            const id = indices[k];
            const piece = puzzlePieces[id];
            piece.placedAt = id;
            piece.correct = true;
            const slotEl = slotEls[id];
            const pieceEl = makePieceEl(piece);
            pieceEl.classList.add('placed', 'prefilled');
            pieceEl.draggable = false;
            slotEl.classList.add('filled', 'correct');
            slotEl.appendChild(pieceEl);
        }
        renderPuzzleTray(true);
    }

    function renderPuzzleTray(shuffle) {
        puzzleTray.innerHTML = '';
        const unplaced = puzzlePieces.filter(p => p.placedAt === null);
        if (shuffle) {
            for (let i = unplaced.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unplaced[i], unplaced[j]] = [unplaced[j], unplaced[i]];
            }
        }
        if (unplaced.length === 0) {
            return;
        }
        const frag = document.createDocumentFragment();
        unplaced.forEach(p => {
            const el = makePieceEl(p);
            frag.appendChild(el);
        });
        puzzleTray.appendChild(frag);
    }

    function makePieceEl(piece) {
        const el = document.createElement('div');
        el.className = 'puzzle-piece';
        el.draggable = true;
        el.dataset.pieceId = String(piece.id);
        const grid = puzzleGrid;
        const col = piece.id % grid;
        const row = Math.floor(piece.id / grid);
        // Untuk grid 2: posisi 0% & 100% (step 100). Untuk grid 3: 0%, 50%, 100%.
        const stepPercent = grid > 1 ? 100 / (grid - 1) : 0;
        el.style.backgroundImage = "url('" + puzzleImageUrl + "')";
        el.style.backgroundPosition = (col * stepPercent) + '% ' + (row * stepPercent) + '%';

        // Label angka posisi piece (1-9) — supaya player tahu piece ini untuk slot mana
        const label = document.createElement('span');
        label.className = 'piece-label';
        label.textContent = String(piece.id + 1);
        el.appendChild(label);

        // Drag events
        el.addEventListener('dragstart', onPieceDragStart);
        el.addEventListener('dragend', onPieceDragEnd);
        // Touch fallback (passive untuk start agar tidak lag — preventDefault via touch-action CSS)
        el.addEventListener('touchstart', onPieceTouchStart, { passive: false });
        return el;
    }

    function onPieceDragStart(e) {
        const id = parseInt(this.dataset.pieceId, 10);
        puzzleDragId = id;
        this.classList.add('dragging');
        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        } catch (err) { /* ignore */ }
    }

    function onPieceDragEnd() {
        this.classList.remove('dragging');
        puzzleDragId = null;
        puzzleBoard.querySelectorAll('.puzzle-slot.drag-over').forEach(s => {
            s.classList.remove('drag-over');
        });
    }

    function onSlotDragOver(e) {
        e.preventDefault();
        if (this.classList.contains('filled')) return;
        this.classList.add('drag-over');
    }

    function onSlotDragLeave() {
        this.classList.remove('drag-over');
    }

    function onSlotDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (this.classList.contains('filled')) return;
        let id = puzzleDragId;
        if (id === null || isNaN(id)) {
            const raw = e.dataTransfer && e.dataTransfer.getData('text/plain');
            id = raw ? parseInt(raw, 10) : null;
        }
        if (id === null || isNaN(id)) return;
        const slotIndex = parseInt(this.dataset.slotIndex, 10);
        placePiece(id, slotIndex, this);
    }

    function placePiece(pieceId, slotIndex, slotEl) {
        const piece = puzzlePieces[pieceId];
        if (!piece || piece.placedAt !== null) return;
        if (slotEl.classList.contains('filled')) return;
        const correct = (pieceId === slotIndex);
        piece.placedAt = slotIndex;
        piece.correct = correct;
        const pieceEl = makePieceEl(piece);
        pieceEl.classList.add('placed');
        pieceEl.draggable = false;
        slotEl.classList.add('filled');
        if (correct) slotEl.classList.add('correct');
        else slotEl.classList.add('wrong');
        slotEl.appendChild(pieceEl);
        renderPuzzleTray(false);

        const total = puzzleGrid * puzzleGrid;
        const allCorrect = puzzlePieces.every(p => p.placedAt !== null && p.placedAt === p.id);
        if (allCorrect && !puzzleSolved) {
            puzzleSolved = true;
            SFX.correct();
            puzzleFeedbackEl.className = 'puzzle-feedback success';
            puzzleFeedbackEl.textContent = '🎉 Sempurna! +10 poin';
            score += 10; // puzzle benar = 10 poin
            updateHUD();
            burstConfetti(puzzleBoard, { count: 60 });
            // Untuk revive: auto-resume setelah jeda
            if (puzzleContext === 'revive') {
                if (btnPuzzleContinueText) btnPuzzleContinueText.textContent = 'Hidup!';
                setTimeout(() => finishPuzzleRevive(true), 1200);
            }
        } else if (correct) {
            SFX.puzzlePlace();
            puzzleFeedbackEl.className = 'puzzle-feedback success';
            puzzleFeedbackEl.textContent = '✓ Pas! (' + countPlaced() + '/' + total + ')';
        } else {
            SFX.wrong();
            puzzleFeedbackEl.className = 'puzzle-feedback error';
            puzzleFeedbackEl.textContent = '✗ Bukan slot ini. Coba lagi (' + countPlaced() + '/' + total + ')';
            // Auto-kembalikan keping yang salah setelah jeda
            setTimeout(() => {
                if (piece.placedAt === slotIndex && !piece.correct) {
                    piece.placedAt = null;
                    piece.correct = false;
                    slotEl.classList.remove('filled', 'wrong');
                    slotEl.innerHTML = '';
                    renderPuzzleTray(false);
                    if (!puzzleSolved) {
                        puzzleFeedbackEl.className = 'puzzle-feedback';
                        puzzleFeedbackEl.textContent = 'Coba lagi (' + countPlaced() + '/' + total + ')';
                    }
                }
            }, 700);
        }
    }

    function finishPuzzleRevive(success) {
        closePuzzle();
        if (success) {
            // Revive — beri zona aman:
            //   1. Reset posisi burung ke tengah.
            //   2. HAPUS semua pipa (bukan filter) supaya tidak langsung mati lagi.
            //      Pipa baru akan respawn otomatis dari kanan layar via
            //      logika spawn-by-distance di update().
            //   3. Bersihkan coinItems & checkpoint di area dekat burung.
            player.y = H / 2;
            player.vy = 0;
            player.rotation = 0;
            pipes = [];
            coinItems = coinItems.filter(c => c.x > player.x + 200);
            checkpoints = checkpoints.filter(cp => cp.x > player.x + 200);
            spawnTimer = 0;
            // Seed pipa terdekat supaya tidak terasa "ngulang dari awal"
            seedPipeAfterRespawn();
            hideAllOverlays();
            startCountdown(() => { state = 'play'; }, {
                label: 'Hidup Lagi, ' + (playerName || 'Pemain') + '!'
            });
        } else {
            showOverlay(overlayGameOver);
        }
    }

    function countPlaced() {
        return puzzlePieces.reduce((n, p) => n + (p.placedAt !== null ? 1 : 0), 0);
    }

    // ===== Efek konfeti meriah =====
    function burstConfetti(anchorEl, opts) {
        opts = opts || {};
        const count = opts.count || 80;
        const colors = ['#ff8c1a', '#ffd34d', '#2d8f6f', '#7b5ea7', '#d94f4f', '#4a7fb5', '#ffb547'];
        let container = document.getElementById('confettiLayer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'confettiLayer';
            container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;';
            document.body.appendChild(container);
        }
        // Tentukan titik pusat ledakan
        let cx = window.innerWidth / 2;
        let cy = window.innerHeight / 2;
        if (anchorEl && anchorEl.getBoundingClientRect) {
            const r = anchorEl.getBoundingClientRect();
            cx = r.left + r.width / 2;
            cy = r.top + r.height / 2;
        }
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const size = 6 + Math.random() * 8;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = Math.random() * Math.PI * 2;
            const power = 120 + Math.random() * 260;
            const dx = Math.cos(angle) * power;
            const dy = Math.sin(angle) * power - 80; // sedikit ke atas
            const rot = (Math.random() * 720 - 360) + 'deg';
            const dur = 900 + Math.random() * 900;
            const shape = Math.random() < 0.4 ? '50%' : (Math.random() < 0.5 ? '2px' : '0');
            p.style.cssText =
                'position:absolute;left:' + cx + 'px;top:' + cy + 'px;' +
                'width:' + size + 'px;height:' + (size * (0.5 + Math.random() * 0.8)) + 'px;' +
                'background:' + color + ';border-radius:' + shape + ';' +
                'transform:translate(-50%,-50%);opacity:1;' +
                'will-change:transform,opacity;';
            container.appendChild(p);
            p.animate(
                [
                    { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
                    { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + ')', opacity: 1, offset: 0.7 },
                    { transform: 'translate(calc(-50% + ' + (dx * 1.1) + 'px), calc(-50% + ' + (dy + 220) + 'px)) rotate(' + rot + ')', opacity: 0 }
                ],
                { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
            );
            setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, dur + 50);
        }
    }

    // ===== Touch drag support =====
    let touchDragEl = null;
    let touchGhostEl = null;
    let touchPieceId = null;

    function onPieceTouchStart(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        touchPieceId = parseInt(this.dataset.pieceId, 10);
        touchDragEl = this;
        const rect = this.getBoundingClientRect();
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        touchGhostEl = this.cloneNode(true);
        touchGhostEl.classList.add('ghost');
        touchGhostEl.style.width = rect.width + 'px';
        touchGhostEl.style.height = rect.height + 'px';
        touchGhostEl.style.left = '0px';
        touchGhostEl.style.top = '0px';
        const setGhostPos = (cx, cy) => {
            touchGhostEl.style.transform = 'translate3d(' + (cx - halfW) + 'px,' + (cy - halfH) + 'px,0) scale(1.06)';
        };
        setGhostPos(rect.left + halfW, rect.top + halfH);
        document.body.appendChild(touchGhostEl);
        this.classList.add('dragging');

        let lastX = 0, lastY = 0, rafPending = false;
        let currentHoverSlot = null;

        const updateHover = () => {
            rafPending = false;
            setGhostPos(lastX, lastY);
            const elBelow = document.elementFromPoint(lastX, lastY);
            const slot = elBelow && elBelow.closest && elBelow.closest('.puzzle-slot');
            if (slot !== currentHoverSlot) {
                if (currentHoverSlot) currentHoverSlot.classList.remove('drag-over');
                if (slot && !slot.classList.contains('filled')) {
                    slot.classList.add('drag-over');
                    currentHoverSlot = slot;
                } else {
                    currentHoverSlot = null;
                }
            }
        };

        const onMove = (ev) => {
            if (ev.touches.length !== 1) return;
            ev.preventDefault();
            const t = ev.touches[0];
            lastX = t.clientX;
            lastY = t.clientY;
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(updateHover);
            }
        };
        const onEnd = (ev) => {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('touchcancel', onEnd);
            const t = (ev.changedTouches && ev.changedTouches[0]) || null;
            if (currentHoverSlot) currentHoverSlot.classList.remove('drag-over');
            currentHoverSlot = null;
            if (touchGhostEl && touchGhostEl.parentNode) touchGhostEl.parentNode.removeChild(touchGhostEl);
            touchGhostEl = null;
            if (touchDragEl) touchDragEl.classList.remove('dragging');
            if (t) {
                const elBelow = document.elementFromPoint(t.clientX, t.clientY);
                const slot = elBelow && elBelow.closest && elBelow.closest('.puzzle-slot');
                if (slot && !slot.classList.contains('filled') && touchPieceId !== null) {
                    const slotIndex = parseInt(slot.dataset.slotIndex, 10);
                    placePiece(touchPieceId, slotIndex, slot);
                }
            }
            touchDragEl = null;
            touchPieceId = null;
        };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd);
    }

    // ===== Quiz =====
    let quizContext = null; // 'coin' | 'revive'
    function showQuiz(context) {
        quizContext = context;
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

        if (context === 'coin') {
            quizBadge.textContent = '🪙 Koin +10';
            quizBadge.className = 'quiz-badge quiz-badge-coin';
        } else {
            quizBadge.textContent = '💀 Hidup Lagi';
            quizBadge.className = 'quiz-badge';
        }

        quizQuestionEl.textContent = q.q;
        quizOptionsEl.innerHTML = '';
        quizFeedbackEl.className = 'quiz-feedback';
        quizFeedbackEl.textContent = '';

        const letters = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.innerHTML =
                '<span class="quiz-option-letter">' + letters[i] + '</span>' +
                '<span>' + opt + '</span>';
            btn.addEventListener('click', () => answerQuiz(i, q));
            quizOptionsEl.appendChild(btn);
        });

        quizModal.classList.add('quiz-modal-active');
        // Pause game during quiz
        if (state === 'play') state = 'paused';
    }

    function answerQuiz(idx, q) {
        const buttons = quizOptionsEl.querySelectorAll('.quiz-option');
        buttons.forEach(b => b.classList.add('quiz-disabled'));
        const correct = idx === q.correct;
        buttons[idx].classList.add(correct ? 'quiz-correct' : 'quiz-wrong');
        if (!correct) {
            buttons[q.correct].classList.add('quiz-correct');
        }

        if (correct) {
            SFX.correct();
            quizFeedbackEl.className = 'quiz-feedback quiz-feedback-success';
            if (quizContext === 'coin') {
                score += 10; // quiz benar = 10 poin
                quizFeedbackEl.textContent = '✅ Benar! +10 poin. ' + q.explain;
            } else {
                quizFeedbackEl.textContent = '✅ Benar! Kamu hidup lagi. ' + q.explain;
            }
            updateHUD();
        } else {
            SFX.wrong();
            quizFeedbackEl.className = 'quiz-feedback quiz-feedback-error';
            quizFeedbackEl.textContent = '❌ Salah. ' + q.explain;
        }

        setTimeout(() => {
            quizModal.classList.remove('quiz-modal-active');
            if (quizContext === 'revive') {
                if (correct) {
                    // Revive — zona aman: hapus SEMUA pipa supaya burung
                    // tidak langsung mati lagi setelah jawab benar.
                    player.y = H / 2;
                    player.vy = 0;
                    player.rotation = 0;
                    pipes = [];
                    coinItems = coinItems.filter(c => c.x > player.x + 200);
                    checkpoints = checkpoints.filter(cp => cp.x > player.x + 200);
                    spawnTimer = 0;
                    // Seed pipa terdekat supaya tidak terasa "ngulang dari awal"
                    seedPipeAfterRespawn();
                    hideAllOverlays();
                    startCountdown(() => { state = 'play'; }, {
                        label: 'Hidup Lagi, ' + (playerName || 'Pemain') + '!'
                    });
                } else {
                    // Stay on game over screen
                    showOverlay(overlayGameOver);
                }
            } else {
                // coin context — jawab benar => bersihkan pipa di sekitar burung
                // supaya tidak langsung mati setelah modal quiz tertutup.
                if (correct) {
                    // Hapus pipa dalam zona aman: 150px di kiri, 400px di kanan burung
                    // (zona dipersempit dari 500 → 400 supaya pipa berikutnya
                    //  tidak terasa terlalu jauh setelah dapat coin)
                    pipes = pipes.filter(p => {
                        const pipeRight = p.x + p.w;
                        const pipeLeft = p.x;
                        return pipeRight < player.x - 150 || pipeLeft > player.x + 400;
                    });
                    // Reset spawn timer agar pipa baru tidak langsung muncul
                    spawnTimer = 0;
                    // Jika tidak ada pipa di kanan dekat, seed satu pipa supaya
                    // tidak terasa "kosong" / ngulang setelah dapat coin.
                    const hasNearbyPipe = pipes.some(p =>
                        p.x > player.x && p.x < player.x + 600
                    );
                    if (!hasNearbyPipe) {
                        seedPipeAfterRespawn();
                    }
                }
                startCountdown(() => { state = 'play'; }, {
                    label: 'Lanjutkan, ' + (playerName || 'Pemain') + '!'
                });
            }
        }, 2200);
    }

    // ===== Render =====
    function draw() {
        const bgImg = getCurrentBg();
        if (bgImg) {
            // Background image scrolling dengan LOOPING berurutan 1..12.
            // Saat satu tile gambar habis (offset selesai melewati layar),
            // pindah ke index berikutnya supaya variasi background terus berganti.
            const ratio = bgImg.height > 0 ? H / bgImg.height : 1;
            const drawW = Math.max(1, bgImg.width * ratio);

            // Normalisasi bgOffset: jika sudah melewati 1 tile, advance index
            // Catatan: bgOffset menurun (negatif) karena scroll ke kiri.
            while (bgOffset <= -drawW) {
                bgOffset += drawW;
                bgIndex = (bgIndex + 1) % assets.bgs.length;
                // Skip slot yang belum ready (mis. masih loading) — pakai yang ready
                let tries = 0;
                while (!assets.bgs[bgIndex] || !assets.bgs[bgIndex].ready) {
                    bgIndex = (bgIndex + 1) % assets.bgs.length;
                    if (++tries > assets.bgs.length) break;
                }
            }

            // Gambar tile pertama (bg aktif) lalu tile berikutnya untuk transisi mulus
            const firstImg = getCurrentBg() || bgImg;
            const firstRatio = firstImg.height > 0 ? H / firstImg.height : 1;
            const firstW = Math.max(1, firstImg.width * firstRatio);
            ctx.drawImage(firstImg, bgOffset, 0, firstW, H);

            // Tile berikutnya untuk menyambung di sebelah kanan
            let cursorX = bgOffset + firstW;
            let nextIdx = (bgIndex + 1) % assets.bgs.length;
            let safety = 0;
            while (cursorX < W && safety < assets.bgs.length + 2) {
                const slot = assets.bgs[nextIdx];
                if (slot && slot.ready) {
                    const r = slot.img.height > 0 ? H / slot.img.height : 1;
                    const w = Math.max(1, slot.img.width * r);
                    ctx.drawImage(slot.img, cursorX, 0, w, H);
                    cursorX += w;
                }
                nextIdx = (nextIdx + 1) % assets.bgs.length;
                safety++;
            }
        } else {
            // Fallback sky background
            const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
            skyGrad.addColorStop(0, '#87ceeb');
            skyGrad.addColorStop(1, '#c8e8f5');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, W, H);

            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            for (const cl of clouds) {
                ctx.beginPath();
                ctx.arc(cl.x, cl.y, cl.size, 0, Math.PI * 2);
                ctx.arc(cl.x + cl.size * 0.7, cl.y + 5, cl.size * 0.8, 0, Math.PI * 2);
                ctx.arc(cl.x - cl.size * 0.6, cl.y + 8, cl.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }

            // Distant mountains
            ctx.fillStyle = '#6b8e6b';
            ctx.beginPath();
            ctx.moveTo(0, H - 30);
            for (let i = 0; i <= W; i += 50) {
                ctx.lineTo(i, H - 30 - 60 - Math.sin(i * 0.02) * 30);
            }
            ctx.lineTo(W, H - 30);
            ctx.closePath();
            ctx.fill();
        }

        // Pipes (bambu / kayu motif tenun)
        for (const p of pipes) {
            drawPipe(p);
        }

        // Coins
        for (const c of coinItems) {
            if (c.taken) continue;
            drawCoin(c);
        }

        // Checkpoints
        for (const cp of checkpoints) {
            if (cp.hit) continue;
            drawCheckpoint(cp);
        }

        // Alas (plafon atas + lantai bawah). Pakai gambar alas.png yang
        // di-tile horizontal. Atap = alas di-flip vertikal.
        drawAlas();

        // Player (burung Enggang stylized)
        drawPlayer();
    }

    // Tinggi alas (atap & lantai) yang ditampilkan di canvas.
    // Dibatasi: maks 5% tinggi canvas DAN maks 36px (supaya tidak terlalu besar
    // di desktop tapi tetap proporsional di mobile). Fallback 24px.
    function getAlasDrawHeight() {
        if (!assets.alasReady || !assets.alas) return 24;
        // Di canvas vertikal (mobile portrait, H > W) atap/lantai harus
        // lebih tebal supaya tetap kelihatan jelas. Skala dengan tinggi canvas.
        const isPortrait = H > W;
        const ratio = isPortrait ? 0.07 : 0.05;
        const maxCap = isPortrait ? 56 : 36;
        const cap = Math.min(maxCap, Math.round(H * ratio));
        return Math.max(20, cap);
    }

    function drawAlas() {
        const drawH = (assets.alasReady && assets.alas) ? getAlasDrawHeight() : 30;
        if (!assets.alasReady || !assets.alas) {
            // Fallback solid kalau gambar gagal load — masih scroll dengan striping
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(0, 0, W, drawH);              // atap
            ctx.fillRect(0, H - drawH, W, drawH);      // lantai
            ctx.fillStyle = '#6b3410';
            const stripe = 20;
            const off = ((alasOffset % stripe) + stripe) % stripe;
            for (let i = -off; i < W; i += stripe) {
                ctx.fillRect(i, drawH - 4, 10, 4);
                ctx.fillRect(i, H - drawH, 10, 4);
            }
            return;
        }
        const img = assets.alas;
        const ratio = drawH / img.height;
        const tileW = Math.max(1, img.width * ratio);

        // Offset modulo tileW supaya tile loop mulus tanpa lompatan
        const off = ((alasOffset % tileW) + tileW) % tileW;

        // Lantai bawah (scroll)
        let x = -off;
        while (x < W) {
            ctx.drawImage(img, x, H - drawH, tileW, drawH);
            x += tileW;
        }
        // Atap atas (flip vertikal + scroll)
        ctx.save();
        ctx.translate(0, drawH);
        ctx.scale(1, -1);
        x = -off;
        while (x < W) {
            ctx.drawImage(img, x, 0, tileW, drawH);
            x += tileW;
        }
        ctx.restore();
    }

    // Helper: gambar pipa dengan strategi CROP (bukan stretch) supaya
    // proporsi gambar asli tidak berubah. Aspect ratio tetap natural.
    //
    // Cara kerja:
    //   - Lebar pipa di canvas = pw, target tinggi area = targetH.
    //   - Kita pertahankan aspect ratio gambar asli: hitung "tinggi natural"
    //     gambar bila di-render dengan lebar pw → naturalH = img.height * (pw/img.width).
    //   - Bila naturalH >= targetH → CROP source bagian belakang (ekor pipa).
    //     Mulut pipa (kepala) selalu menempel ke tepi gap; ekor "dipotong".
    //   - Bila naturalH < targetH → pipa akan tampak lebih pendek dari area,
    //     tapi kita TIDAK stretch — biarkan pipa muncul dari tepi gap dan
    //     bawahnya "keluar canvas" (kasus jarang krn pipe.png tinggi 689px).
    //
    // - flipY=true → pipa atas: "mulut" di bawah (tepi gap atas).
    // - flipY=false → pipa bawah: "mulut" di atas (tepi gap bawah).
    function drawPipeNatural(img, x, y, pw, targetH, options) {
        if (targetH <= 0) return;
        const opts = options || {};
        const flipY = !!opts.flipY;
        const angle = opts.angle || 0;

        const iw = img.width;
        const ih = img.height;
        if (iw <= 0 || ih <= 0) return;

        // Aspect ratio asli kalau lebar = pw
        const scale = pw / iw;
        const naturalH = ih * scale;

        ctx.save();
        ctx.translate(x + pw / 2, y + targetH / 2);
        if (angle) ctx.rotate(angle);
        if (flipY) ctx.scale(1, -1);

        const dx = -pw / 2;
        const dyTop = -targetH / 2; // tepi yang menempel ke gap (mulut)

        if (targetH <= naturalH) {
            // CASE A: pipa cukup panjang → crop ekor (tail) saja.
            // Mulut pipa (y=0 source) ditempel ke gap.
            const srcSh = targetH / scale;
            ctx.drawImage(img, 0, 0, iw, srcSh, dx, dyTop, pw, targetH);
        } else {
            // CASE B: pipa terlalu pendek dibanding area target.
            // Gambar "kepala" (mulut) di atas, lalu TILE slice tengah (looping)
            // untuk menutupi area sisa sampai ke bawah. Tidak masalah tidak
            // ada "dasar" — overshoot akan tertutup oleh alas.
            //
            // Slice komposisi:
            //   - HEAD: 40% atas gambar source (kepala/mulut yang khas)
            //   - LOOP: slice tengah ~30% gambar source, di-tile berulang
            const headSrcFrac = 0.40;
            const loopSrcFrac = 0.30;
            const headSrcH = ih * headSrcFrac;
            const loopSrcH = ih * loopSrcFrac;
            const loopSrcY = ih * 0.35;        // mulai sedikit di bawah head
            const headDstH = headSrcH * scale;
            const loopDstH = loopSrcH * scale;

            // 1) Gambar head di atas
            ctx.drawImage(img, 0, 0, iw, headSrcH, dx, dyTop, pw, headDstH);

            // 2) Tile loop slice ke bawah sampai menutupi sisa area
            let drawnY = dyTop + headDstH;
            const endY = dyTop + targetH;
            // Safeguard: maksimum 50 iterasi (jaga-jaga)
            let safety = 50;
            while (drawnY < endY && safety-- > 0) {
                const remain = endY - drawnY;
                if (remain >= loopDstH) {
                    ctx.drawImage(img, 0, loopSrcY, iw, loopSrcH, dx, drawnY, pw, loopDstH);
                    drawnY += loopDstH;
                } else {
                    // Sisa terakhir < satu loop full → crop loop sebagian
                    const partialSrcH = remain / scale;
                    ctx.drawImage(img, 0, loopSrcY, iw, partialSrcH, dx, drawnY, pw, remain);
                    drawnY = endY;
                }
            }
        }

        ctx.restore();
    }

    function drawPipe(p) {
        const pw = p.w || PIPE_W_DEFAULT;
        // Atap & lantai = alas. Pipa atas dari atap → tepi gap atas.
        // Pipa bawah dari tepi gap bawah → tepi atas lantai (boleh overshoot
        // ditutupi alas sehingga "panjang gak masalah bawahnya gak kelihatan").
        const alasH = getAlasDrawHeight();
        const ceilingY = alasH;
        const groundY = H - alasH;
        const topH = Math.max(0, p.gapY - ceilingY);
        const bottomH = Math.max(0, groundY - (p.gapY + p.gapH));

        // Varian "slant" = pakai gambar pipamereng yang memang sudah miring.
        const useSlant = p.variant === 'slant' && assets.pipeSlantReady;
        if (useSlant) {
            const slantImg = assets.pipeSlant;
            // Sedikit rotasi tambahan biar variatif, tapi kecil saja (~5°)
            const extraAngle = (p.slantDir || 1) * 0.08;
            drawPipeNatural(slantImg, p.x, ceilingY, pw, topH, { flipY: true, angle: extraAngle });
            drawPipeNatural(slantImg, p.x, p.gapY + p.gapH, pw, bottomH, { flipY: false, angle: -extraAngle });
            return;
        }

        if (assets.pipeReady) {
            const img = assets.pipe;
            drawPipeNatural(img, p.x, ceilingY, pw, topH, { flipY: true });
            drawPipeNatural(img, p.x, p.gapY + p.gapH, pw, bottomH, { flipY: false });
        } else {
            // Fallback: pipa hijau original
            const grad = ctx.createLinearGradient(p.x, 0, p.x + pw, 0);
            grad.addColorStop(0, '#2e7d4f');
            grad.addColorStop(0.5, '#4caf6f');
            grad.addColorStop(1, '#1a4a2d');
            ctx.fillStyle = grad;
            ctx.fillRect(p.x, ceilingY, pw, topH);
            ctx.fillRect(p.x, p.gapY + p.gapH, pw, bottomH);

            // Pipe caps
            ctx.fillStyle = '#1a4a2d';
            ctx.fillRect(p.x - 4, p.gapY - 16, pw + 8, 16);
            ctx.fillRect(p.x - 4, p.gapY + p.gapH, pw + 8, 16);

            // Motif tenun stripes
            ctx.fillStyle = 'rgba(192, 57, 43, 0.4)';
            for (let y = 20; y < p.gapY - 30; y += 30) {
                ctx.fillRect(p.x + 6, y, pw - 12, 4);
            }
            for (let y = p.gapY + p.gapH + 30; y < groundY; y += 30) {
                ctx.fillRect(p.x + 6, y, pw - 12, 4);
            }
        }
    }

    function drawCoin(c) {
        const t = Date.now() * 0.005;
        // wobble untuk efek 3D berputar (lebar berubah, tinggi tetap)
        const wobble = Math.cos(t);            // -1..1
        const scaleX = Math.abs(wobble) * 0.6 + 0.4; // 0.4..1.0
        const size = 32;                       // tinggi target coin di canvas
        const bobY = Math.sin(t * 0.6) * 3;   // sedikit melayang naik turun

        ctx.save();
        ctx.translate(c.x, c.y + bobY);

        if (assets.coinReady) {
            const w = size * scaleX;
            const h = size;
            ctx.drawImage(assets.coin, -w / 2, -h / 2, w, h);
        } else {
            // Fallback bila gambar belum ready
            const w = 14 + Math.abs(wobble) * 6;
            ctx.beginPath();
            ctx.fillStyle = '#e0a020';
            ctx.ellipse(0, 0, w, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#f4d35e';
            ctx.ellipse(0, 0, w * 0.7, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b5a10';
            ctx.font = 'bold 14px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, 1);
        }
        ctx.restore();
    }

    function drawCheckpoint(cp) {
        const x = cp.x;
        // Flag pole
        ctx.fillStyle = '#4a1a08';
        ctx.fillRect(x, 50, 4, H - 80);
        // Flag
        const grad = ctx.createLinearGradient(x, 50, x + 60, 50);
        grad.addColorStop(0, '#c0392b');
        grad.addColorStop(0.5, '#e07a1f');
        grad.addColorStop(1, '#f4d35e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x + 4, 50);
        ctx.lineTo(x + 60, 65);
        ctx.lineTo(x + 4, 80);
        ctx.closePath();
        ctx.fill();
        // Text on flag
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('LV+', x + 25, 70);
    }

    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.rotation);

        if (assets.spriteReady && assets.sprite) {
            // Pakai sprite enggang (background sudah transparan dari preprocessing)
            const sheet = assets.sprite;
            const cellW = sheet.width / SPRITE_COLS;
            const cellH = sheet.height / SPRITE_ROWS;
            // Pilih frame baris 0 berdasarkan state vy:
            //   vy < -1.5 → sayap atas (baru flap)
            //   vy < 1.5  → sayap tengah (glide)
            //   else      → sayap bawah (menukik)
            let col;
            if (state === 'ready') {
                // Idle: animasi flap halus berdasar waktu
                col = Math.floor((Date.now() / 180) % 3);
            } else if (player.vy < -1.5) {
                col = 0;
            } else if (player.vy < 1.5) {
                col = 1;
            } else {
                col = 2;
            }
            const sx = col * cellW;
            const sy = 0; // selalu baris 0
            // Tampilan: dibesarkan supaya mascot enggang jelas terlihat.
            // Hitbox tetap pakai player.size (32) × hitboxScale (0.72), jadi
            // visual yang lebih besar TIDAK mempengaruhi tingkat kesulitan.
            const targetH = player.size * 2.4; // ~77px untuk size=32 (lebih ekspresif)
            const aspect = cellW / cellH;
            const targetW = targetH * aspect;
            ctx.drawImage(sheet, sx, sy, cellW, cellH, -targetW / 2, -targetH / 2, targetW, targetH);
        } else {
            // Fallback: prosedural sederhana (oranye)
            ctx.fillStyle = '#e07a1f';
            ctx.beginPath();
            ctx.ellipse(0, 0, player.size / 2, player.size / 2.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c0392b';
            const flapPhase = Math.sin(Date.now() * 0.025);
            ctx.beginPath();
            ctx.ellipse(-4, 2 + flapPhase * 3, 9, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f4d35e';
            ctx.beginPath();
            ctx.moveTo(player.size / 2 - 2, -2);
            ctx.lineTo(player.size / 2 + 8, 0);
            ctx.lineTo(player.size / 2 - 2, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(5, -4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(6, -4, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ===== Game loop =====
    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // ===== Input =====
    function handleInput(e) {
        if (state === 'play') {
            flap();
        } else if (state === 'ready') {
            // Player tap/space → mulai main, langsung flap pertama
            state = 'play';
            countdownEl.classList.remove('active');
            hideReadyHint();
            if (typeof pendingReadyCallback === 'function') {
                try { pendingReadyCallback(); } catch (err) { /* ignore */ }
            }
            pendingReadyCallback = null;
            flap();
        }
    }

    // Catatan: keyboard Space DIHAPUS. Game hanya bisa dimainkan via klik mouse
    // dan layar sentuh, agar input form (nama/sekolah) bebas pakai spasi.

    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput(e);
    }, { passive: false });

    // ===== Countdown 5-4-3-2-1-GO =====
    // Setelah hitungan selesai, game TIDAK auto-start.
    // Tampilkan "TAP/SPACE untuk Mulai" → tunggu input player baru play.
    // (Mirip Flappy Bird: layar awal "get ready" sebelum tap pertama.)
    let countdownActive = false;
    function startCountdown(callback, opts) {
        if (countdownActive) return;
        opts = opts || {};
        const label = opts.label || 'Bersiap...';
        const startFrom = opts.startFrom || 5;

        countdownActive = true;
        state = 'countdown';
        countdownLabelEl.textContent = label;
        countdownEl.classList.add('active');

        let current = startFrom;
        const tick = () => {
            // Replay animation by removing & adding class
            countdownNumberEl.classList.remove('go');
            countdownNumberEl.style.animation = 'none';
            // Force reflow
            void countdownNumberEl.offsetWidth;
            countdownNumberEl.style.animation = '';

            if (current > 0) {
                countdownNumberEl.textContent = current;
                SFX.countdown();
                current--;
                setTimeout(tick, 800);
            } else {
                // Tampilkan "GO!" sebentar, lalu fade out dan ganti dengan hint kecil
                countdownNumberEl.textContent = 'GO!';
                countdownNumberEl.classList.add('go');
                countdownLabelEl.textContent = '';
                SFX.go();
                // State 'ready' = menunggu input pertama dari player (burung melayang)
                state = 'ready';
                // Simpan posisi anchor burung saat ini supaya idle bobbing tidak loncat
                player.idleAnchor = player.y;
                countdownActive = false;
                if (typeof callback === 'function') {
                    pendingReadyCallback = callback;
                } else {
                    pendingReadyCallback = null;
                }
                // Setelah ~700ms, sembunyikan overlay GO besar dan munculkan HINT kecil di canvas
                setTimeout(() => {
                    if (state !== 'ready') return; // user sudah tap duluan
                    countdownEl.classList.remove('active');
                    showReadyHint();
                }, 700);
            }
        };
        tick();
    }
    let pendingReadyCallback = null;

    // ===== Player name & school handling =====
    function setPlayerName(name) {
        name = (name || '').trim().slice(0, 16);
        if (!name) name = 'Pemain';
        playerName = name;
        try { localStorage.setItem('eting_player_name', playerName); } catch (e) { }
        updateHUD();
        if (greetNameEl) greetNameEl.textContent = playerName;
        if (loseNameEl) loseNameEl.textContent = playerName;
    }

    function setPlayerSchool(school) {
        school = (school || '').trim().slice(0, 48);
        playerSchool = school;
        try {
            if (playerSchool) {
                localStorage.setItem('eting_player_school', playerSchool);
            } else {
                localStorage.removeItem('eting_player_school');
            }
        } catch (e) { }
    }

    function promptName() {
        // Profil (nama + sekolah) sekarang diinput di Game Hub.
        // Kembalikan user ke hub agar bisa edit profil di sana.
        try {
            if (window.MiniGames && typeof window.MiniGames.showHub === 'function') {
                window.MiniGames.showHub();
                return;
            }
        } catch (e) { /* fallback di bawah */ }
        // Fallback: redirect ke main-game.html (hub default)
        try { window.location.href = 'main-game.html'; } catch (e) { }
    }

    // ===== Leaderboard submit & fetch (Supabase via window.EtingDB) =====
    function submitScoreToLeaderboard() {
        if (!playerName || playerName === 'Pemain') return;
        if (score <= 0) return;
        if (score === lastSubmittedScore) return; // hindari dobel kirim skor match yg sama
        lastSubmittedScore = score;
        var api = window.EtingDB && (window.EtingDB.addScore || window.EtingDB.upsertScore);
        if (!api) return;
        // addScore = AKUMULATIF: score_db_baru = score_db_lama + score (match ini).
        // Leaderboard mencatat total skor lintas-game (Flappy + Kuis + Pasal +
        // Puzzle), sehingga pemain yang aktif di banyak game terlihat unggul.
        api({
            name: playerName,
            school: playerSchool || null,
            score: score
        })
            .then(() => { refreshLeaderboard(); })
            .catch((err) => {
                // Edge case: error network atau RLS — log ke console aja
                try { console.warn('submit score gagal:', err && err.message); } catch (_) { }
            });
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function renderLeaderboardInto(container, items) {
        if (!container) return;
        if (!items || !items.length) {
            container.innerHTML = '<div class="game-lb-empty">Belum ada skor. Jadilah yang pertama!</div>';
            return;
        }
        const html = items.slice(0, 10).map((it, i) => {
            const rank = i + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
            const scoreFmt = (it.score || 0).toLocaleString('id-ID');
            const school = it.school ? escapeHtml(it.school) : '—';
            return (
                '<div class="game-lb-item">' +
                '<span class="game-lb-rank ' + rankClass + '">' + rank + '</span>' +
                '<div class="game-lb-avatar"><span class="material-symbols-rounded">person</span></div>' +
                '<div class="game-lb-info">' +
                '<strong>' + escapeHtml(it.name || 'Pemain') + '</strong>' +
                '<span>' + school + '</span>' +
                '</div>' +
                '<span class="game-lb-score">' + scoreFmt + '</span>' +
                '</div>'
            );
        }).join('');
        container.innerHTML = html;
    }

    // Set `force=true` saat user EKSPLISIT klik tombol refresh, agar
    // bypass cache localStorage. Default-nya pakai cache 30s untuk
    // mengurangi beban Supabase saat 300 siswa main bareng.
    function refreshLeaderboard(opts) {
        if (!gameLeaderboardList) return;
        if (!window.EtingDB || !window.EtingDB.getLeaderboard) {
            gameLeaderboardList.innerHTML =
                '<div class="game-lb-empty">Klien database belum siap.</div>';
            return;
        }
        var p = window.EtingDB.getLeaderboard(50, opts || {})
            .then((data) => { renderLeaderboardInto(gameLeaderboardList, data); })
            .catch(() => {
                gameLeaderboardList.innerHTML =
                    '<div class="game-lb-empty">Tidak dapat memuat leaderboard.</div>';
            });
        // Loader halaman tunggu data leaderboard sebelum fade-out.
        if (window.PageLoader && typeof window.PageLoader.waitFor === 'function') {
            window.PageLoader.waitFor(p);
        }
        return p;
    }

    // ===== Button handlers =====
    if (btnSaveName) {
        btnSaveName.addEventListener('click', () => {
            const v = inputPlayerName ? inputPlayerName.value : '';
            if (!v.trim()) {
                if (inputPlayerName) inputPlayerName.focus();
                return;
            }
            setPlayerName(v);
            setPlayerSchool(inputPlayerSchool ? inputPlayerSchool.value : '');
            showOverlay(overlayStart);
        });
    }
    if (inputPlayerName) {
        inputPlayerName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (inputPlayerSchool) {
                    inputPlayerSchool.focus();
                } else {
                    btnSaveName && btnSaveName.click();
                }
            }
        });
    }
    if (inputPlayerSchool) {
        inputPlayerSchool.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnSaveName && btnSaveName.click();
            }
        });
    }
    if (btnRefreshLeaderboard) {
        btnRefreshLeaderboard.addEventListener('click', () => {
            // Klik manual = user mau data fresh → bypass cache
            refreshLeaderboard({ force: true });
        });
    }
    if (btnToggleLeaderboard && gameLeaderboardPanel) {
        btnToggleLeaderboard.addEventListener('click', () => {
            const wasCollapsed = gameLeaderboardPanel.classList.contains('game-lb-collapsed');
            gameLeaderboardPanel.classList.toggle('game-lb-collapsed');
            // Saat dibuka, panggil refresh — TANPA force. Layer cache
            // di EtingDB.getLeaderboard akan return data ≤30s instant
            // (zero network call) atau fetch baru kalau sudah stale.
            // Ini mencegah burst request saat 300 siswa expand panel.
            if (wasCollapsed) {
                try { refreshLeaderboard(); } catch (e) { }
            }
        });
    }
    if (btnChangeName) {
        btnChangeName.addEventListener('click', () => {
            promptName();
        });
    }

    btnStart.addEventListener('click', () => {
        SFX.startUI();
        resetGame();
        hideAllOverlays();
        startCountdown(() => {
            state = 'play';
        }, { label: 'Bersiap, ' + (playerName || 'Pemain') + '!' });
    });

    btnRestart.addEventListener('click', () => {
        SFX.startUI();
        resetGame();
        hideAllOverlays();
        startCountdown(() => {
            state = 'play';
        }, { label: 'Ayo lagi, ' + (playerName || 'Pemain') + '!' });
    });

    btnRevive.addEventListener('click', () => {
        // Random: 50/50 antara quiz atau puzzle
        if (Math.random() < 0.5) {
            showQuiz('revive');
        } else {
            // Pastikan state pause selama puzzle revive
            state = 'paused';
            openPuzzle('revive');
        }
    });

    if (btnContinueLevel) {
        btnContinueLevel.addEventListener('click', () => {
            hideAllOverlays();
            startCountdown(() => {
                state = 'play';
            }, { label: 'Level ' + level + '!' });
        });
    }

    // ===== Puzzle Menenun: events =====
    btnPuzzleShuffle.addEventListener('click', () => {
        // Reset & rebuild (gunakan grid + gambar saat ini)
        puzzleSolved = false;
        puzzleFeedbackEl.className = 'puzzle-feedback';
        puzzleFeedbackEl.textContent = 'Tarik keping ke pola yang sesuai';
        btnPuzzleContinue.disabled = false;
        if (btnPuzzleContinueText) {
            btnPuzzleContinueText.textContent = puzzleContext === 'revive' ? 'Coba' : 'Lanjut';
        }
        buildPuzzle();
    });

    btnPuzzleContinue.addEventListener('click', () => {
        // Untuk revive: harus selesai puzzle dulu agar revive
        if (puzzleContext === 'revive') {
            if (puzzleSolved) {
                finishPuzzleRevive(true);
            } else {
                // Belum selesai = gagal revive
                finishPuzzleRevive(false);
            }
            return;
        }
        // Konteks lain (umum): tutup modal
        burstConfetti(btnPuzzleContinue, { count: 40 });
        setTimeout(() => {
            closePuzzle();
            if (state === 'paused') state = 'play';
        }, 250);
    });

    // Init
    resizeCanvas();
    player.x = Math.round(W * 0.18);
    player.y = H / 2;
    window.addEventListener('resize', resizeCanvas);
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(canvas);
    }
    applyDifficulty(level);
    updateHUD();

    // Nama pemain sekarang diinput di Game Hub (sebelum masuk game).
    // Pastikan ada nilai default supaya HUD & overlay tetap terisi.
    if (!playerName) {
        playerName = 'Pemain';
    }
    if (greetNameEl) greetNameEl.textContent = playerName;
    if (loseNameEl) loseNameEl.textContent = playerName;
    showOverlay(overlayStart);

    // Leaderboard sudah dipindah ke Game Hub; panel di samping game disembunyikan.
    // refreshLeaderboard() tidak dipanggil di sini agar tidak request sia-sia.

    loop();

})();
