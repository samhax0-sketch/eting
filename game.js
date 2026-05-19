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

    // ===== State =====
    let state = 'start'; // 'start' | 'play' | 'gameover' | 'paused' | 'countdown'
    let score = 0;
    let coins = 0;
    let level = 1;
    let pointsToCheckpoint = 0; // count gates passed in current level
    const GATES_PER_CHECKPOINT = 5;

    // ===== Player name (persistent) =====
    let playerName = '';
    try {
        playerName = localStorage.getItem('eting_player_name') || '';
    } catch (e) {
        playerName = '';
    }

    // ===== Difficulty config per level (1-3 bertahap mudah → susah) =====
    // gapBonus = extra gap (px) yang ditambahkan ke gap rintangan
    // spawnBonus = extra interval antar pipa (frame)
    // speedMul = pengali kecepatan
    function getDifficulty(lv) {
        if (lv <= 1) return { gapBonus: 90, spawnBonus: 120, speedMul: 0.55, gravity: 0.085, flapPower: -3.5 };
        if (lv === 2) return { gapBonus: 60, spawnBonus: 80, speedMul: 0.7, gravity: 0.092, flapPower: -3.65 };
        if (lv === 3) return { gapBonus: 30, spawnBonus: 40, speedMul: 0.85, gravity: 0.098, flapPower: -3.75 };
        // Level 4+ pakai skala normal
        return { gapBonus: 0, spawnBonus: 0, speedMul: 1.0, gravity: 0.10, flapPower: -3.8 };
    }

    // ===== Player (burung Enggang) =====
    const player = {
        x: 150,
        y: 250,
        vy: 0,
        size: 28,
        gravity: 0.085,
        flapPower: -3.5,
        rotation: 0
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
        'img/1.png', 'img/2.png', 'img/3.png', 'img/4.png',
        'img/6.png', 'img/7.png', 'img/8.png', 'img/9.png',
        'img/10.png', 'img/11.png', 'img/12.png'
    ];
    const assets = {
        bgs: [],          // array of {img, ready}
        bgReadyCount: 0,
        pipe: null,
        pipeSlant: null,
        coin: null,
        pipeReady: false,
        pipeSlantReady: false,
        coinReady: false
    };
    // Background scroll offset (parallax) & index looping
    let bgOffset = 0;
    let bgIndex = 0; // index aktif di BG_FILES

    // Mudahnya cek bg ready: ada minimal 1 gambar yang ter-load di slot index aktif
    function isBgReady() {
        const slot = assets.bgs[bgIndex];
        return !!(slot && slot.ready);
    }
    function getCurrentBg() {
        const slot = assets.bgs[bgIndex];
        return slot && slot.ready ? slot.img : null;
    }

    (function loadAssets() {
        // Preload semua background untuk looping mulus
        BG_FILES.forEach((src, i) => {
            const slot = { img: new Image(), ready: false };
            slot.img.onload = () => { slot.ready = true; assets.bgReadyCount++; };
            slot.img.onerror = () => { console.warn(src + ' gagal dimuat'); };
            slot.img.src = src;
            assets.bgs[i] = slot;
        });

        const pipeImg = new Image();
        pipeImg.onload = () => { assets.pipe = pipeImg; assets.pipeReady = true; };
        pipeImg.onerror = () => { console.warn('pipategak.png gagal dimuat'); };
        pipeImg.src = 'img/pipategak.png';

        const pipeSlantImg = new Image();
        pipeSlantImg.onload = () => { assets.pipeSlant = pipeSlantImg; assets.pipeSlantReady = true; };
        pipeSlantImg.onerror = () => { console.warn('pipamereng.png gagal dimuat'); };
        pipeSlantImg.src = 'img/pipamereng.png';

        const coinImg = new Image();
        coinImg.onload = () => { assets.coin = coinImg; assets.coinReady = true; };
        coinImg.onerror = () => { console.warn('coin.PNG gagal dimuat'); };
        coinImg.src = 'img/coin.PNG';
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
    const btnSaveName = document.getElementById('btnSaveName');
    const btnChangeName = document.getElementById('btnChangeName');
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
        baseSpeed = 0.9;
        speed = baseSpeed;
        player.x = Math.round(W * 0.18);
        player.y = H / 2;
        player.vy = 0;
        player.rotation = 0;
        pipes = [];
        coinItems = [];
        checkpoints = [];
        pipesSinceLastCoin = 0;
        nextCoinAfter = 3 + Math.floor(Math.random() * 3); // 3..5
        spawnTimer = 0;
        applyDifficulty(level);
        updateHUD();
    }

    function showOverlay(el) {
        [overlayName, overlayStart, overlayGameOver, overlayCheckpoint].forEach(o => {
            if (o) o.classList.add('game-overlay-hidden');
        });
        if (el) el.classList.remove('game-overlay-hidden');
    }

    function hideAllOverlays() {
        [overlayName, overlayStart, overlayGameOver, overlayCheckpoint].forEach(o => {
            if (o) o.classList.add('game-overlay-hidden');
        });
    }

    function flap() {
        if (state !== 'play') return;
        player.vy = player.flapPower;
    }

    // ===== Spawn =====
    // Lebar pipa (default tegak) dibuat lebih besar agar tidak ramping
    const PIPE_W_DEFAULT = 84;
    const PIPE_W_SLANT = 110; // pipa miring biasanya tampak lebih lebar
    function spawnPipe() {
        const d = getDifficulty(level);
        const baseGap = 200 - level * 5;
        const gapH = Math.max(160, baseGap) + d.gapBonus; // gap LEBIH BESAR di level rendah
        const groundOffset = isBgReady() ? 30 : 80;
        const maxGapY = Math.max(80, H - 70 - gapH - groundOffset);
        const gapY = 70 + Math.random() * (maxGapY - 70);

        // Variasi: 35% kemungkinan pakai pipa MIRING (pipamereng) — dekoratif,
        // ditampilkan di belakang gap tanpa menambah collision (biar tetap fair),
        // dan sisanya pipa tegak normal yang juga jadi penghalang.
        const useSlant = assets.pipeSlantReady && Math.random() < 0.35;
        const variant = useSlant ? 'slant' : 'tegak';
        // pipa miring: arahkan random (kiri/kanan)
        const slantDir = Math.random() < 0.5 ? -1 : 1;

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

    // ===== Update =====
    function update() {
        if (state !== 'play') return;

        // Player physics
        player.vy += player.gravity;
        player.y += player.vy;
        player.rotation = Math.max(-0.4, Math.min(1.2, player.vy * 0.08));

        // Boundary collision
        if (player.y - player.size / 2 < 0) {
            player.y = player.size / 2;
            player.vy = 0;
        }
        if (player.y + player.size / 2 > H - 30) { // ground
            gameOver();
            return;
        }

        // Spawn pipes
        spawnTimer++;
        const d = getDifficulty(level);
        const spawnInterval = Math.max(220, 300 - level * 8) + d.spawnBonus;
        if (spawnTimer >= spawnInterval) {
            spawnTimer = 0;
            spawnPipe();
        }

        // Move pipes
        for (const p of pipes) {
            p.x -= speed;
            // Score on pass
            if (!p.passed && p.x + (p.w || PIPE_W_DEFAULT) < player.x) {
                p.passed = true;
                score += 10;
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
    }

    function rectCollidePipe(p) {
        const pw = p.w || PIPE_W_DEFAULT;
        const px = p.x;
        const inX = player.x + player.size / 2 > px && player.x - player.size / 2 < px + pw;
        if (!inX) return false;
        const inGapY = player.y - player.size / 2 > p.gapY && player.y + player.size / 2 < p.gapY + p.gapH;
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
        finalScoreEl.textContent = score;
        showOverlay(overlayGameOver);
    }

    function onLevelUp(newLevel) {
        state = 'paused';
        level = newLevel;
        baseSpeed += 0.12;
        applyDifficulty(level);
        newLevelEl.textContent = level;
        updateHUD();
        showOverlay(overlayCheckpoint);
    }

    // ===== Quiz =====
    let quizContext = null; // 'coin' | 'revive'
    function showQuiz(context) {
        quizContext = context;
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

        if (context === 'coin') {
            quizBadge.textContent = '🪙 Koin +50';
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
            quizFeedbackEl.className = 'quiz-feedback quiz-feedback-success';
            if (quizContext === 'coin') {
                score += 50;
                quizFeedbackEl.textContent = '✅ Benar! +50 poin. ' + q.explain;
            } else {
                quizFeedbackEl.textContent = '✅ Benar! Kamu hidup lagi. ' + q.explain;
            }
            updateHUD();
        } else {
            quizFeedbackEl.className = 'quiz-feedback quiz-feedback-error';
            quizFeedbackEl.textContent = '❌ Salah. ' + q.explain;
        }

        setTimeout(() => {
            quizModal.classList.remove('quiz-modal-active');
            if (quizContext === 'revive') {
                if (correct) {
                    // Revive — reset posisi lalu countdown sebelum lanjut
                    player.y = H / 2;
                    player.vy = 0;
                    pipes = pipes.filter(p => p.x > player.x + 100);
                    hideAllOverlays();
                    startCountdown(() => { state = 'play'; }, {
                        label: 'Hidup Lagi, ' + (playerName || 'Pemain') + '!'
                    });
                } else {
                    // Stay on game over screen
                    showOverlay(overlayGameOver);
                }
            } else {
                // coin context — countdown sebelum resume play
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

        // Ground (hanya tampil kalau bg tidak ada)
        if (!isBgReady()) {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(0, H - 30, W, 30);
            ctx.fillStyle = '#6b3410';
            for (let i = 0; i < W; i += 20) {
                ctx.fillRect(i, H - 30, 10, 4);
            }
        }

        // Player (burung Enggang stylized)
        drawPlayer();
    }

    // Helper: gambar pipa secara NATURAL tanpa gepeng.
    // Strategi: aspect ratio gambar dijaga (lebar pw → tinggi natural pipeH),
    // lalu di-CROP via clipping rectangle agar panjang yang terlihat = targetH.
    // - Untuk top pipe: kita tampilkan bagian BAWAH gambar (yang punya "mulut" pipa)
    //   sehingga ujung pipa kelihatan menggantung secara natural.
    // - Untuk bottom pipe: kita tampilkan bagian ATAS gambar (yang punya "mulut" pipa).
    function drawPipeNatural(img, x, y, pw, targetH, options) {
        if (targetH <= 0) return;
        const opts = options || {};
        const flipY = !!opts.flipY;        // true = pipa atas (terbalik)
        const angle = opts.angle || 0;
        const naturalH = img.width > 0 ? (pw * img.height / img.width) : targetH;

        ctx.save();
        // Anchor di tengah area pipa
        ctx.translate(x + pw / 2, y + targetH / 2);
        if (angle) ctx.rotate(angle);

        // Clip area persegi sesuai target supaya bagian "kelebihan" gambar terpotong
        ctx.beginPath();
        ctx.rect(-pw / 2, -targetH / 2, pw, targetH);
        ctx.clip();

        if (flipY) {
            // Pipa atas: balik vertikal, tarik gambar ke bawah agar ujung mulut
            // (bagian "kepala" gambar pipa) muncul di tepi gap.
            ctx.scale(1, -1);
            // setelah flip, kita gambar dari sudut kiri-atas baru; offset y geser
            // supaya "kepala" pipa (bagian atas gambar asli) berada di tepi gap.
            const drawY = -targetH / 2;
            ctx.drawImage(img, -pw / 2, drawY, pw, naturalH);
        } else {
            // Pipa bawah: bagian "kepala" pipa di atas gap, sisa pipa membentang ke bawah.
            ctx.drawImage(img, -pw / 2, -targetH / 2, pw, naturalH);
        }

        ctx.restore();
    }

    function drawPipe(p) {
        const pw = p.w || PIPE_W_DEFAULT;
        const groundY = isBgReady() ? H : H - 30;
        const topH = p.gapY;
        const bottomH = groundY - (p.gapY + p.gapH);

        // Varian "slant" = pakai gambar pipamereng yang memang sudah miring.
        // Gambar ini sudah miring, jadi tidak perlu ctx.rotate berlebihan —
        // tampilkan saja dengan aspect ratio asli (tidak gepeng).
        const useSlant = p.variant === 'slant' && assets.pipeSlantReady;
        if (useSlant) {
            const slantImg = assets.pipeSlant;
            // Sedikit rotasi tambahan biar variatif, tapi kecil saja (~5°)
            const extraAngle = (p.slantDir || 1) * 0.08;
            drawPipeNatural(slantImg, p.x, 0, pw, topH, { flipY: true, angle: extraAngle });
            drawPipeNatural(slantImg, p.x, p.gapY + p.gapH, pw, bottomH, { flipY: false, angle: -extraAngle });
            return;
        }

        if (assets.pipeReady) {
            const img = assets.pipe;
            drawPipeNatural(img, p.x, 0, pw, topH, { flipY: true });
            drawPipeNatural(img, p.x, p.gapY + p.gapH, pw, bottomH, { flipY: false });
        } else {
            // Fallback: pipa hijau original
            const grad = ctx.createLinearGradient(p.x, 0, p.x + pw, 0);
            grad.addColorStop(0, '#2e7d4f');
            grad.addColorStop(0.5, '#4caf6f');
            grad.addColorStop(1, '#1a4a2d');
            ctx.fillStyle = grad;
            ctx.fillRect(p.x, 0, pw, p.gapY);
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

        // Body (orange ball)
        ctx.fillStyle = '#e07a1f';
        ctx.beginPath();
        ctx.ellipse(0, 0, player.size / 2, player.size / 2.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing (flap animation)
        const flapPhase = Math.sin(Date.now() * 0.025);
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(-4, 2 + flapPhase * 3, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#f4d35e';
        ctx.beginPath();
        ctx.moveTo(player.size / 2 - 2, -2);
        ctx.lineTo(player.size / 2 + 8, 0);
        ctx.lineTo(player.size / 2 - 2, 4);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(5, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -4, 2, 0, Math.PI * 2);
        ctx.fill();

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
        }
        // Prevent space scroll
        if (e && e.code === 'Space') {
            e.preventDefault();
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleInput(e);
        }
    });

    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput(e);
    }, { passive: false });

    // ===== Countdown 5-4-3-2-1-GO =====
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
                current--;
                setTimeout(tick, 800);
            } else {
                // GO!
                countdownNumberEl.textContent = 'GO!';
                countdownNumberEl.classList.add('go');
                countdownLabelEl.textContent = 'Terbang!';
                setTimeout(() => {
                    countdownEl.classList.remove('active');
                    countdownActive = false;
                    if (typeof callback === 'function') callback();
                }, 600);
            }
        };
        tick();
    }

    // ===== Player name handling =====
    function setPlayerName(name) {
        name = (name || '').trim().slice(0, 16);
        if (!name) name = 'Pemain';
        playerName = name;
        try { localStorage.setItem('eting_player_name', playerName); } catch (e) { }
        updateHUD();
        if (greetNameEl) greetNameEl.textContent = playerName;
        if (loseNameEl) loseNameEl.textContent = playerName;
    }

    function promptName() {
        showOverlay(overlayName);
        if (inputPlayerName) {
            inputPlayerName.value = playerName && playerName !== 'Pemain' ? playerName : '';
            setTimeout(() => inputPlayerName.focus(), 150);
        }
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
            showOverlay(overlayStart);
        });
    }
    if (inputPlayerName) {
        inputPlayerName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnSaveName && btnSaveName.click();
            }
        });
    }
    if (btnChangeName) {
        btnChangeName.addEventListener('click', () => {
            promptName();
        });
    }

    btnStart.addEventListener('click', () => {
        resetGame();
        hideAllOverlays();
        startCountdown(() => {
            state = 'play';
        }, { label: 'Bersiap, ' + (playerName || 'Pemain') + '!' });
    });

    btnRestart.addEventListener('click', () => {
        resetGame();
        hideAllOverlays();
        startCountdown(() => {
            state = 'play';
        }, { label: 'Ayo lagi, ' + (playerName || 'Pemain') + '!' });
    });

    btnRevive.addEventListener('click', () => {
        // Tampilkan quiz, jika benar maka hidup lagi
        showQuiz('revive');
    });

    btnContinueLevel.addEventListener('click', () => {
        hideAllOverlays();
        startCountdown(() => {
            state = 'play';
        }, { label: 'Level ' + level + '!' });
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

    // Tampilkan modal nama hanya kalau belum pernah input
    if (!playerName) {
        promptName();
    } else {
        if (greetNameEl) greetNameEl.textContent = playerName;
        if (loseNameEl) loseNameEl.textContent = playerName;
        showOverlay(overlayStart);
    }
    loop();

})();
