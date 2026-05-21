/* =========================================================
   MINI GAMES — Quiz Anti-Judol & Tebak Pasal
   Plus Hub Navigation untuk main-game.html
   ========================================================= */
(function () {
    'use strict';

    // ---------- Util ----------
    function $(id) { return document.getElementById(id); }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function pick(arr, n) { return shuffle(arr).slice(0, n); }

    // ---------- Leaderboard submit (akumulatif) ----------
    // Setiap mini-game yang selesai memanggil ini → score di Supabase
    // jadi: skor_lama + skor_game_baru. Aman dipanggil tanpa nama (no-op).
    function submitMiniGameScore(gameLabel, scoreDelta) {
        try {
            if (!window.EtingDB || !window.EtingDB.addScore) return;
            const delta = parseInt(scoreDelta, 10);
            if (!Number.isFinite(delta) || delta <= 0) return; // 0 skor = skip
            let name = '', school = '';
            try {
                const raw = localStorage.getItem('eting_profile_v1');
                if (raw) {
                    const p = JSON.parse(raw);
                    name = (p && p.name || '').trim();
                    school = (p && p.school || '').trim();
                }
            } catch (_) { /* ignore */ }
            if (!name) {
                // Fallback ke flappy player name (game.js menulisnya juga ke localStorage 'playerName')
                try { name = (localStorage.getItem('playerName') || '').trim(); } catch (_) { }
            }
            if (!name || /^pemain$/i.test(name)) return; // jangan submit nama default
            window.EtingDB.addScore({ name: name, school: school || null, score: delta })
                .then(function (res) {
                    try { console.log('[mini-games] addScore', gameLabel, res); } catch (_) { }
                    // Trigger refresh leaderboard di hub kalau ada
                    if (window.MiniGames && typeof window.MiniGames.refreshLeaderboard === 'function') {
                        window.MiniGames.refreshLeaderboard();
                    }
                })
                .catch(function (err) {
                    try { console.warn('[mini-games] addScore failed:', err && err.message); } catch (_) { }
                });
        } catch (e) { /* ignore */ }
    }

    // ---------- SFX ----------
    const SFX_URLS = {
        start: 'https://static.wixstatic.com/mp3/215118_250450d2f3984583b8beaacb9b9b4482.mp3',
        winning: 'https://static.wixstatic.com/mp3/215118_39d57627d0054916816bb157626e3848.mp3',
        pickup: 'https://static.wixstatic.com/mp3/215118_79c0c887196e424a8c8b10db9607d997.mp3',
        wrong: 'https://static.wixstatic.com/mp3/215118_c231e56634fd4f30a978e69606c2b39b.mp3',
        snap: 'https://static.wixstatic.com/mp3/215118_8e292149c99049ef89574f3bcaeb872f.mp3',
    };
    const _sfxCache = {};
    function preloadSfx() {
        Object.entries(SFX_URLS).forEach(([k, url]) => {
            if (_sfxCache[k]) return;
            try {
                const a = new Audio(url);
                a.preload = 'auto';
                a.volume = 0.55;
                _sfxCache[k] = a;
            } catch (e) { /* ignore */ }
        });
    }
    function playSfx(name, vol) {
        try {
            const src = SFX_URLS[name];
            if (!src) return;
            const a = new Audio(src);
            a.volume = typeof vol === 'number' ? vol : 0.55;
            const p = a.play();
            if (p && typeof p.catch === 'function') p.catch(() => { });
        } catch (e) { /* ignore */ }
    }
    // Preload on first user interaction (autoplay policy friendly)
    let _sfxPrimed = false;
    function primeSfx() {
        if (_sfxPrimed) return;
        _sfxPrimed = true;
        preloadSfx();
    }
    document.addEventListener('pointerdown', primeSfx, { once: true });
    document.addEventListener('keydown', primeSfx, { once: true });

    // ---------- Hub Navigation ----------
    const hubEl = $('gameHub');
    const sections = {
        flappy: $('sectionFlappy'),
        quiz: $('sectionQuiz'),
        pasal: $('sectionPasal'),
    };

    function showHub() {
        if (hubEl) hubEl.classList.remove('game-hub-hidden');
        Object.values(sections).forEach(s => s && s.classList.add('game-section-hidden'));
        // Reset quiz & pasal kalau sedang jalan
        QuizGame.reset();
        PasalGame.reset();
        document.body.classList.remove('flappy-fullscreen');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Refresh profile + leaderboard di hub setiap kali kembali ke hub
        if (typeof HubProfile !== 'undefined' && HubProfile && HubProfile.refresh) {
            HubProfile.refresh();
        }
    }
    function launchGame(key) {
        if (!sections[key]) return;
        if (hubEl) hubEl.classList.add('game-hub-hidden');
        Object.entries(sections).forEach(([k, s]) => {
            if (!s) return;
            if (k === key) s.classList.remove('game-section-hidden');
            else s.classList.add('game-section-hidden');
        });
        // Hanya Flappy yang butuh layout fullscreen mobile (dark bg + flex center)
        if (key === 'flappy') {
            document.body.classList.add('flappy-fullscreen');
        } else {
            document.body.classList.remove('flappy-fullscreen');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.addEventListener('click', function (e) {
        const launchBtn = e.target.closest('[data-launch]');
        if (launchBtn) {
            e.preventDefault();
            launchGame(launchBtn.getAttribute('data-launch'));
            return;
        }
        const backBtn = e.target.closest('[data-back]');
        if (backBtn) {
            e.preventDefault();
            showHub();
            return;
        }
    });

    // =========================================================
    // PUZZLE MENENUN (replaces old Quiz Anti-Judol; key 'quiz' kept)
    // =========================================================
    const PUZZLE_QUIZ_POOL = [
        {
            q: 'Kain tenun tradisional dari Kalimantan yang terkenal adalah...',
            options: ['Tenun Sambas', 'Songket Palembang', 'Tenun Bali', 'Ulos'],
            ans: 0,
        },
        {
            q: 'Motif tenun Dayak biasanya terinspirasi dari...',
            options: ['Bangunan kota', 'Alam, hewan & tumbuhan', 'Tokoh kartun', 'Logo brand'],
            ans: 1,
        },
        {
            q: 'Apa hubungan menenun dengan pencegahan judi online?',
            options: [
                'Menenun mengajarkan kesabaran & usaha hasil kerja sendiri',
                'Menenun memberi uang instan seperti judi',
                'Menenun adalah jenis taruhan',
                'Tidak ada hubungannya sama sekali',
            ],
            ans: 0,
        },
        {
            q: 'Judi online di Indonesia hukumnya...',
            options: ['Legal', 'Ilegal & dapat dipidana', 'Boleh dengan izin', 'Tergantung jumlah taruhan'],
            ans: 1,
        },
        {
            q: 'Salah satu cara mendukung budaya lokal Kalimantan adalah...',
            options: [
                'Membeli produk tenun asli dari pengrajin',
                'Bermain judi online',
                'Membuang kain tradisional',
                'Mengabaikan kerajinan lokal',
            ],
            ans: 0,
        },
        {
            q: 'Pelaku judi online di Indonesia diancam UU ITE Pasal...',
            options: ['Pasal 27 ayat (2)', 'Pasal 5', 'Pasal 100', 'Pasal 200'],
            ans: 0,
        },
        {
            q: 'Tenun ikat dibuat dengan cara...',
            options: [
                'Mengikat & mencelup benang sebelum ditenun',
                'Mencetak motif dengan printer',
                'Menempel stiker pada kain',
                'Menggambar dengan spidol',
            ],
            ans: 0,
        },
        {
            q: 'Manakah ciri penghasilan halal & berkah?',
            options: [
                'Hasil kerja keras seperti menenun',
                'Hasil judi online',
                'Hasil menipu orang lain',
                'Hasil mencuri',
            ],
            ans: 0,
        },
    ];

    const PUZZLE_IMAGES = [
        'https://static.wixstatic.com/media/215118_1b46a6b7f8d1477a9c89c4d2ca861647~mv2.png',
        'https://static.wixstatic.com/media/215118_e8276262c1074cb296b6ef16a19895d9~mv2.png',
        'https://static.wixstatic.com/media/215118_5cb5dc637a8e4779b0f5c6bb9dd43011~mv2.png',
        'https://static.wixstatic.com/media/215118_16c226deb8fd4106a6193cd04a9ae897~mv2.png',
    ];
    const PUZZLE_GRID = 3; // 3x3 = 9 ubin
    const PUZZLE_POINTS_PER_TILE = 10;
    const PUZZLE_QUIZ_BONUS = 30;

    // Generate edge matrix: each cell { top, right, bottom, left }
    // Values: 0 = flat (border), +1 = tab (knob out), -1 = blank (notch in)
    // Neighbors must be complementary.
    function buildPuzzleEdges(n) {
        const grid = [];
        for (let r = 0; r < n; r++) {
            grid[r] = [];
            for (let c = 0; c < n; c++) {
                const top = (r === 0) ? 0 : -grid[r - 1][c].bottom;
                const left = (c === 0) ? 0 : -grid[r][c - 1].right;
                const right = (c === n - 1) ? 0 : (Math.random() < 0.5 ? 1 : -1);
                const bottom = (r === n - 1) ? 0 : (Math.random() < 0.5 ? 1 : -1);
                grid[r][c] = { top, right, bottom, left };
            }
        }
        return grid;
    }

    // Build SVG path for a piece. size = piece logical size (without tabs).
    // tab = tab size in px. Path starts at (tab, tab) which is the top-left of the piece body.
    // The full SVG viewport is (size + 2*tab) x (size + 2*tab).
    function buildPiecePath(edge, size, tab) {
        const off = tab; // offset (tab area padding)
        const s = size;
        // helper to build one side as cubic curves for a smooth knob
        // direction: 'top' | 'right' | 'bottom' | 'left'
        // val: -1 | 0 | +1
        function side(dir, val) {
            // length along the side = s
            // We'll draw the side from current point to the next corner.
            // If val == 0, straight line.
            // If val != 0, draw a curve that bumps out (+1) or in (-1).
            const sign = val; // +1 out, -1 in
            const knob = tab; // knob protrusion size
            const half = s / 2;
            const neck = s * 0.18; // width of neck (where knob attaches)
            // We approximate the knob using cubic bezier curves.
            // For each direction we compute control points.
            // 'out' means away from the piece center on that side.
            // For 'top': out = -y direction. For 'right': out = +x. etc.
            let cmds = '';
            if (sign === 0) {
                // straight line to end of side
                if (dir === 'top') cmds = `l ${s} 0`;
                else if (dir === 'right') cmds = `l 0 ${s}`;
                else if (dir === 'bottom') cmds = `l ${-s} 0`;
                else if (dir === 'left') cmds = `l 0 ${-s}`;
                return cmds;
            }
            // Curved knob. Build using 3 cubic bezier segments along the side.
            // Step 1: from start to neck start (length = half - neck/2)
            // Step 2: knob curve outward (or inward)
            // Step 3: from neck end to side end
            const preLen = half - neck / 2;
            const postLen = half - neck / 2;
            // For directional math:
            //  along = unit vector along the side direction (start -> end)
            //  out = unit vector pointing away from piece (perpendicular, "outside")
            let along, out;
            if (dir === 'top') { along = { x: 1, y: 0 }; out = { x: 0, y: -1 }; }
            else if (dir === 'right') { along = { x: 0, y: 1 }; out = { x: 1, y: 0 }; }
            else if (dir === 'bottom') { along = { x: -1, y: 0 }; out = { x: 0, y: 1 }; }
            else { along = { x: 0, y: -1 }; out = { x: -1, y: 0 }; }
            // sign +1 = outward, -1 = inward
            const ox = out.x * sign;
            const oy = out.y * sign;
            const ax = along.x;
            const ay = along.y;
            // Pre line
            cmds += `l ${ax * preLen} ${ay * preLen} `;
            // Knob: from neckStart -> top of knob -> neckEnd
            // We use two cubic beziers.
            const k = knob; // knob extent
            const nW = neck;  // neck width
            // First cubic: from current (neckStart) to mid-top of knob
            // Move outward and forward along, with control points
            // p1 = neckStart + (-along * 0.05 * s) + (out * k * 0.6) [pull outward]
            // p2 = mid + (-along * nW * 0.3) + (out * k)
            // end = mid (along * nW/2, out * k)
            const c1x = ax * (nW * 0.0) + ox * (k * 0.4);
            const c1y = ay * (nW * 0.0) + oy * (k * 0.4);
            const c2x = ax * (-nW * 0.35) + ox * (k * 1.05);
            const c2y = ay * (-nW * 0.35) + oy * (k * 1.05);
            const endX1 = ax * (nW * 0.5) + ox * k;
            const endY1 = ay * (nW * 0.5) + oy * k;
            cmds += `c ${c1x} ${c1y} ${c2x} ${c2y} ${endX1} ${endY1} `;
            // Second cubic: from mid-top of knob back down to neckEnd
            const c3x = ax * (nW * 0.85) + ox * (k * 1.05);
            const c3y = ay * (nW * 0.85) + oy * (k * 1.05);
            const c4x = ax * (nW * 0.5) + ox * (k * 0.4);
            const c4y = ay * (nW * 0.5) + oy * (k * 0.4);
            const endX2 = ax * (nW * 0.5) - ox * 0;
            const endY2 = ay * (nW * 0.5) - oy * 0;
            cmds += `c ${c3x} ${c3y} ${c4x} ${c4y} ${endX2} ${endY2} `;
            // Post line
            cmds += `l ${ax * postLen} ${ay * postLen}`;
            return cmds;
        }
        // start at top-left of piece body
        let d = `M ${off} ${off} `;
        d += side('top', edge.top) + ' ';
        d += side('right', edge.right) + ' ';
        d += side('bottom', edge.bottom) + ' ';
        d += side('left', edge.left) + ' ';
        d += 'Z';
        return d;
    }

    // QuizGame name preserved for compatibility with init binding.
    const QuizGame = (function () {
        let imageUrl = '';
        let edges = [];          // [r][c] -> {top,right,bottom,left}
        let pieces = [];         // array of {r,c,id,el,placed,path,size,tab}
        let placedCount = 0;
        let totalPieces = 0;
        let score = 0;
        let startedAt = 0;
        let timerInterval = null;
        let elapsedSec = 0;
        let bonusScore = 0;
        let bonusActive = false;
        let bonusLocked = false;
        let currentBonusQ = null;
        let dragging = null;     // { piece, dx, dy }

        function reset() {
            stopTimer();
            placedCount = 0; totalPieces = 0; score = 0;
            elapsedSec = 0; bonusScore = 0;
            bonusActive = false; bonusLocked = false; currentBonusQ = null;
            pieces = []; edges = []; dragging = null;
            const board = $('puzzleBoard');
            const tray = $('puzzleTray');
            if (board) board.innerHTML = '';
            if (tray) tray.innerHTML = '';
            const card = $('puzzleQuizCard');
            if (card) card.classList.add('puzzle-quiz-hidden');
            showScreen('quizIntro');
        }

        function showScreen(id) {
            ['quizIntro', 'quizPlay', 'quizResult'].forEach(s => {
                const el = $(s);
                if (!el) return;
                if (s === id) el.classList.remove('mini-screen-hidden');
                else el.classList.add('mini-screen-hidden');
            });
        }

        function startTimer() {
            stopTimer();
            startedAt = Date.now();
            elapsedSec = 0;
            const tEl = $('quizTimer');
            if (tEl) tEl.textContent = '0';
            timerInterval = setInterval(() => {
                elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
                if (tEl) tEl.textContent = String(elapsedSec);
            }, 500);
        }
        function stopTimer() {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        }

        function start() {
            reset();
            primeSfx();
            playSfx('start', 0.6);
            // Pick random tenun image
            imageUrl = PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
            const n = PUZZLE_GRID;
            totalPieces = n * n;
            edges = buildPuzzleEdges(n);
            score = 0; placedCount = 0; bonusScore = 0;
            const placedEl = $('puzzlePlacedCount');
            const totalEl = $('puzzleTotalCount');
            const scoreEl = $('quizScore');
            if (placedEl) placedEl.textContent = '0';
            if (totalEl) totalEl.textContent = String(totalPieces);
            if (scoreEl) scoreEl.textContent = '0';
            showScreen('quizPlay');
            // Wait next frame so layout (board width via aspect-ratio) is computed
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    buildBoardAndPieces();
                    startTimer();
                });
            });
        }

        function buildBoardAndPieces() {
            const board = $('puzzleBoard');
            const tray = $('puzzleTray');
            if (!board || !tray) return;
            board.innerHTML = '';
            tray.innerHTML = '';

            const n = PUZZLE_GRID;
            // Determine logical board size based on container width.
            // Fallback chain: board.clientWidth -> parent width -> stage width -> default
            let containerW = board.clientWidth;
            if (!containerW || containerW < 50) {
                const stage = $('puzzleStage');
                containerW = (stage && stage.clientWidth) || (board.parentElement && board.parentElement.clientWidth) || PUZZLE_BOARD_SIZE;
            }
            const boardSize = Math.max(180, Math.min(containerW, PUZZLE_BOARD_SIZE));
            const pieceSize = boardSize / n;
            const tab = pieceSize * PUZZLE_TAB_RATIO;

            board.style.width = boardSize + 'px';
            board.style.height = boardSize + 'px';

            // Build slots (drop targets)
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    const slot = document.createElement('div');
                    slot.className = 'puzzle-slot';
                    slot.dataset.row = String(r);
                    slot.dataset.col = String(c);
                    slot.style.left = (c * pieceSize) + 'px';
                    slot.style.top = (r * pieceSize) + 'px';
                    slot.style.width = pieceSize + 'px';
                    slot.style.height = pieceSize + 'px';
                    board.appendChild(slot);
                }
            }

            // Build pieces
            pieces = [];
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    const p = createPieceEl(r, c, pieceSize, tab, boardSize);
                    pieces.push(p);
                }
            }
            // Shuffle pieces in tray
            const shuffled = shuffle(pieces.slice());
            shuffled.forEach(p => tray.appendChild(p.el));
        }

        function createPieceEl(r, c, pieceSize, tab, boardSize) {
            // SIMPLE approach: piece = <div> dengan background-image + background-position
            // untuk crop bagian gambar yang sesuai. Lebih reliable daripada SVG <image>.
            const id = `pp_${r}_${c}_${Math.random().toString(36).slice(2, 7)}`;
            const vp = pieceSize; // no tab — pakai square piece

            const wrap = document.createElement('div');
            wrap.className = 'puzzle-piece';
            wrap.dataset.row = String(r);
            wrap.dataset.col = String(c);
            wrap.style.cssText = [
                'display:inline-block',
                'position:relative',
                `width:${vp}px`,
                `height:${vp}px`,
                'flex:0 0 auto',
                'box-sizing:border-box',
                `background-image:url("${imageUrl}")`,
                `background-size:${boardSize}px ${boardSize}px`,
                `background-position:${-c * pieceSize}px ${-r * pieceSize}px`,
                'background-repeat:no-repeat',
                'border:2px solid #4a1a08',
                'border-radius:6px',
                'box-shadow:0 3px 0 #4a1a08, 0 5px 10px rgba(0,0,0,0.25)',
                'cursor:grab',
                'user-select:none',
                '-webkit-user-select:none',
                'touch-action:none',
            ].join(';');

            const piece = {
                r, c, id, el: wrap, placed: false,
                size: pieceSize, tab: 0, vp,
            };
            attachDragHandlers(piece);
            return piece;
        }

        function attachDragHandlers(piece) {
            const el = piece.el;
            let startX = 0, startY = 0, offX = 0, offY = 0;
            let moved = false;

            function onDown(e) {
                if (piece.placed) return;
                e.preventDefault();
                playSfx('pickup', 0.4);
                const evt = e.touches ? e.touches[0] : e;
                const rect = el.getBoundingClientRect();
                offX = evt.clientX - rect.left;
                offY = evt.clientY - rect.top;
                startX = evt.clientX; startY = evt.clientY;
                moved = false;
                // Move el to body for free positioning
                document.body.appendChild(el);
                el.classList.add('puzzle-piece-dragging');
                el.style.position = 'fixed';
                el.style.left = (evt.clientX - offX) + 'px';
                el.style.top = (evt.clientY - offY) + 'px';
                el.style.zIndex = '9999';
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onUp);
            }
            function onMove(e) {
                e.preventDefault();
                const evt = e.touches ? e.touches[0] : e;
                moved = true;
                el.style.left = (evt.clientX - offX) + 'px';
                el.style.top = (evt.clientY - offY) + 'px';
                // Highlight target slot
                highlightSlotUnder(evt.clientX, evt.clientY, piece);
            }
            function onUp(e) {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onUp);
                el.classList.remove('puzzle-piece-dragging');
                clearSlotHighlights();
                const evt = (e.changedTouches && e.changedTouches[0]) || e;
                if (!moved) {
                    // click without drag => return to tray
                    returnToTray(piece);
                    return;
                }
                const slot = getSlotAt(evt.clientX, evt.clientY);
                if (slot && Number(slot.dataset.row) === piece.r && Number(slot.dataset.col) === piece.c) {
                    placePiece(piece, slot);
                } else {
                    returnToTray(piece, { wrong: true });
                }
            }
            el.addEventListener('mousedown', onDown);
            el.addEventListener('touchstart', onDown, { passive: false });
        }

        function getSlotAt(x, y) {
            const board = $('puzzleBoard');
            if (!board) return null;
            const slots = board.querySelectorAll('.puzzle-slot');
            for (const s of slots) {
                const r = s.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
            }
            return null;
        }
        function highlightSlotUnder(x, y, piece) {
            clearSlotHighlights();
            const slot = getSlotAt(x, y);
            if (!slot) return;
            if (Number(slot.dataset.row) === piece.r && Number(slot.dataset.col) === piece.c) {
                slot.classList.add('is-hover');
            } else {
                slot.classList.add('is-hover-wrong');
            }
        }
        function clearSlotHighlights() {
            const board = $('puzzleBoard');
            if (!board) return;
            board.querySelectorAll('.puzzle-slot').forEach(s => {
                s.classList.remove('is-hover');
                s.classList.remove('is-hover-wrong');
            });
        }

        function placePiece(piece, slot) {
            piece.placed = true;
            piece.el.classList.add('puzzle-piece-locked');
            piece.el.style.position = 'absolute';
            piece.el.style.zIndex = '2';
            piece.el.style.pointerEvents = 'none';
            // Position relative to board: the piece body should align with slot.
            // slot.left/top in board coords; the piece el is sized (vp x vp) with tab padding.
            const slotLeft = parseFloat(slot.style.left) || 0;
            const slotTop = parseFloat(slot.style.top) || 0;
            piece.el.style.left = (slotLeft - piece.tab) + 'px';
            piece.el.style.top = (slotTop - piece.tab) + 'px';
            const board = $('puzzleBoard');
            board.appendChild(piece.el);
            playSfx('snap', 0.55);

            placedCount++;
            score += PUZZLE_POINTS_PER_PIECE;
            const placedEl = $('puzzlePlacedCount');
            const scoreEl = $('quizScore');
            if (placedEl) placedEl.textContent = String(placedCount);
            if (scoreEl) scoreEl.textContent = String(score);

            if (placedCount >= totalPieces) {
                stopTimer();
                setTimeout(onSolved, 400);
            }
        }

        function returnToTray(piece, opts) {
            const tray = $('puzzleTray');
            piece.el.style.position = '';
            piece.el.style.left = '';
            piece.el.style.top = '';
            piece.el.style.zIndex = '';
            tray.appendChild(piece.el);
            if (opts && opts.wrong) playSfx('wrong', 0.45);
        }

        function onSolved() {
            playSfx('winning', 0.7);
            // Show bonus quiz
            bonusActive = true;
            bonusLocked = false;
            currentBonusQ = PUZZLE_QUIZ_POOL[Math.floor(Math.random() * PUZZLE_QUIZ_POOL.length)];
            renderBonusQuiz();
        }

        function renderBonusQuiz() {
            const card = $('puzzleQuizCard');
            if (!card) { finish(); return; }
            card.classList.remove('puzzle-quiz-hidden');
            const qText = $('puzzleQuizText');
            const optsEl = $('puzzleQuizOptions');
            const fb = $('puzzleQuizFeedback');
            if (qText) qText.textContent = currentBonusQ.q;
            if (fb) { fb.textContent = ''; fb.className = 'puzzle-quiz-feedback'; }
            if (!optsEl) return;
            optsEl.innerHTML = '';
            const indexed = currentBonusQ.options.map((opt, i) => ({ opt, i }));
            const shuffled = shuffle(indexed);
            const letters = ['A', 'B', 'C', 'D'];
            shuffled.forEach(({ opt, i }, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'puzzle-quiz-option';
                btn.innerHTML = `<span class="puzzle-quiz-letter">${letters[idx]}</span><span class="puzzle-quiz-opt-text">${opt}</span>`;
                btn.addEventListener('click', () => onBonusAnswer(i, btn));
                optsEl.appendChild(btn);
            });
        }

        function onBonusAnswer(selectedI, btnEl) {
            if (bonusLocked) return;
            bonusLocked = true;
            const isCorrect = (selectedI === currentBonusQ.ans);
            const optsEl = $('puzzleQuizOptions');
            const all = Array.from(optsEl.querySelectorAll('.puzzle-quiz-option'));
            all.forEach(b => {
                b.disabled = true;
                const t = b.querySelector('.puzzle-quiz-opt-text').textContent;
                if (t === currentBonusQ.options[currentBonusQ.ans]) b.classList.add('puzzle-quiz-option-correct');
            });
            const fb = $('puzzleQuizFeedback');
            if (isCorrect) {
                bonusScore = PUZZLE_QUIZ_BONUS;
                score += PUZZLE_QUIZ_BONUS;
                playSfx('winning', 0.7);
                if (fb) { fb.textContent = '✅ Benar! +' + PUZZLE_QUIZ_BONUS + ' poin bonus'; fb.className = 'puzzle-quiz-feedback puzzle-quiz-fb-ok'; }
            } else {
                playSfx('wrong', 0.5);
                if (btnEl) btnEl.classList.add('puzzle-quiz-option-wrong');
                if (fb) { fb.textContent = '❌ Jawaban benar: ' + currentBonusQ.options[currentBonusQ.ans]; fb.className = 'puzzle-quiz-feedback puzzle-quiz-fb-bad'; }
            }
            const scoreEl = $('quizScore');
            if (scoreEl) scoreEl.textContent = String(score);
            setTimeout(finish, 1800);
        }

        function finish() {
            stopTimer();
            showScreen('quizResult');
            const ico = $('quizResultIcon');
            const title = $('quizResultTitle');
            const desc = $('quizResultDesc');
            let label, msg, icon;
            if (bonusScore > 0) {
                label = 'Penenun Hebat!';
                msg = 'Puzzle selesai + jawaban bonus benar. Tetap pilih kerja keras seperti menenun, bukan judi!';
                icon = 'workspace_premium';
            } else if (placedCount >= totalPieces) {
                label = 'Puzzle Selesai!';
                msg = 'Kamu berhasil menyusun kain tenun. Coba lagi untuk dapat bonus quiz.';
                icon = 'military_tech';
            } else {
                label = 'Tetap Semangat!';
                msg = 'Belum selesai. Coba lagi ya!';
                icon = 'auto_stories';
            }
            if (ico) ico.textContent = icon;
            if (title) title.textContent = label;
            if (desc) desc.textContent = msg;
            const finalEl = $('quizFinalScore');
            const correctEl = $('quizCorrectCount');
            const wrongEl = $('quizWrongCount');
            const toEl = $('quizTimeoutCount');
            if (finalEl) finalEl.textContent = String(score);
            if (correctEl) correctEl.textContent = String(placedCount);
            if (wrongEl) wrongEl.textContent = String(elapsedSec) + 's';
            if (toEl) toEl.textContent = String(bonusScore);
            // Submit ke leaderboard (akumulatif)
            submitMiniGameScore('puzzle-quiz', score);
        }

        function bind() {
            const btnStart = $('btnQuizStart');
            if (btnStart) btnStart.addEventListener('click', start);
            const btnRestart = $('btnQuizRestart');
            if (btnRestart) btnRestart.addEventListener('click', start);
        }

        return { bind, reset, start };
    })();

    // =========================================================
    // TEBAK PASAL
    // =========================================================
    const PASAL_POOL = [
        {
            kasus: 'Andi membuat website yang memuat permainan slot online dengan taruhan uang asli, lalu menyebarkan link-nya ke grup WhatsApp.',
            pilihan: [
                'UU ITE Pasal 27 ayat (2) — Muatan Perjudian',
                'UU ITE Pasal 28 ayat (1) — Berita Bohong',
                'KUHP Pasal 362 — Pencurian',
                'UU Perlindungan Konsumen',
            ],
            jawaban: 0,
            penjelasan: 'Mendistribusikan & membuat konten judi online lewat sistem elektronik diatur dalam UU ITE Pasal 27 ayat (2). Ancaman: 6 tahun penjara dan/atau denda Rp 1 miliar.',
        },
        {
            kasus: 'Pak Budi membuka warung kopi yang di belakangnya menyediakan meja judi domino dengan taruhan uang setiap malam.',
            pilihan: [
                'KUHP Pasal 303 — Perjudian',
                'UU ITE Pasal 27',
                'KUHP Pasal 372 — Penggelapan',
                'UU Narkotika',
            ],
            jawaban: 0,
            penjelasan: 'Perjudian konvensional (offline) diatur KUHP Pasal 303 dengan ancaman pidana hingga 10 tahun penjara atau denda Rp 25 juta.',
        },
        {
            kasus: 'Selebgram X mempromosikan aplikasi judi online di Instagram Story dan dibayar oleh bandar.',
            pilihan: [
                'UU ITE Pasal 27 ayat (2) jo. Pasal 45 ayat (2)',
                'UU Hak Cipta',
                'KUHP Pasal 310 — Pencemaran Nama Baik',
                'UU Pers',
            ],
            jawaban: 0,
            penjelasan: 'Mempromosikan judi online termasuk "mendistribusikan dan/atau mentransmisikan" konten perjudian — kena Pasal 27 ayat (2) UU ITE jo. Pasal 45 ayat (2).',
        },
        {
            kasus: 'Bandar judi online mentransfer uang hasil judi ke beberapa rekening atas nama orang lain untuk menyamarkan asal-usul dana.',
            pilihan: [
                'UU TPPU (UU No. 8/2010) Pasal 3',
                'UU ITE Pasal 30',
                'KUHP Pasal 263 — Pemalsuan',
                'UU Perbankan',
            ],
            jawaban: 0,
            penjelasan: 'Menyamarkan asal-usul uang hasil tindak pidana adalah pencucian uang (TPPU) sesuai UU No. 8/2010 Pasal 3. Ancaman maksimal 20 tahun penjara.',
        },
        {
            kasus: 'Seorang remaja mencuri HP ibunya untuk dijual demi modal main judi slot online.',
            pilihan: [
                'KUHP Pasal 362 — Pencurian',
                'UU ITE Pasal 28',
                'UU Perlindungan Anak',
                'KUHP Pasal 303 — Perjudian',
            ],
            jawaban: 0,
            penjelasan: 'Mengambil barang orang lain tanpa izin = pencurian (KUHP Pasal 362). Catatan: kalau pelaku juga ikut judi online, bisa dijerat berlapis dengan UU ITE.',
        },
        {
            kasus: 'Sebuah situs menyediakan permainan kartu dengan taruhan koin yang dapat dibeli & ditukar kembali menjadi uang rupiah.',
            pilihan: [
                'UU ITE Pasal 27 ayat (2)',
                'UU Konsumen',
                'UU Pajak',
                'KUHP Pasal 156 — SARA',
            ],
            jawaban: 0,
            penjelasan: 'Walau menggunakan "koin", jika dapat ditukar dengan uang nyata maka dianggap perjudian elektronik dan dijerat UU ITE Pasal 27 ayat (2).',
        },
        {
            kasus: 'Seorang admin grup Telegram membagikan link & cara deposit ke situs judi bola luar negeri.',
            pilihan: [
                'UU ITE Pasal 27 ayat (2) jo. Pasal 45',
                'UU Perlindungan Data Pribadi',
                'UU Lalu Lintas',
                'KUHP Pasal 156',
            ],
            jawaban: 0,
            penjelasan: 'Membagikan link & memfasilitasi akses situs judi online tetap masuk kategori mendistribusikan konten perjudian (UU ITE Pasal 27 ayat 2).',
        },
        {
            kasus: 'Pelajar SMA membuat akun bandar kecil-kecilan menerima taruhan bola dari teman sekelas via DANA.',
            pilihan: [
                'KUHP Pasal 303 bis & UU ITE Pasal 27 ayat (2)',
                'UU Sistem Pendidikan',
                'KUHP Pasal 351 — Penganiayaan',
                'UU Keuangan',
            ],
            jawaban: 0,
            penjelasan: 'Menerima taruhan = ikut serta dalam perjudian (KUHP Pasal 303 bis), dan karena lewat sistem elektronik (DANA + chat) juga dijerat UU ITE Pasal 27 ayat (2).',
        },
        {
            kasus: 'Operator iklan menampilkan banner judi online di website berita tanpa filter.',
            pilihan: [
                'UU ITE Pasal 27 ayat (2)',
                'UU Pers',
                'UU Penyiaran',
                'KUHP Pasal 156',
            ],
            jawaban: 0,
            penjelasan: 'Menyebarkan/menayangkan iklan judi online di platform digital melanggar UU ITE Pasal 27 ayat (2). Platform juga wajib menurunkan konten sesuai PM Kominfo.',
        },
        {
            kasus: 'Seseorang mengaku dapat "membobol" sistem situs judi agar selalu menang, dengan imbalan uang dari korban.',
            pilihan: [
                'KUHP Pasal 378 — Penipuan',
                'UU ITE Pasal 28 ayat (1) — Berita Bohong Transaksi',
                'KUHP Pasal 303',
                'Semua benar (berlapis)',
            ],
            jawaban: 3,
            penjelasan: 'Bisa dijerat berlapis: penipuan (KUHP 378), penyebaran berita bohong dalam transaksi elektronik (UU ITE Pasal 28 ayat 1), dan tetap masuk ranah judi online (Pasal 303 / UU ITE Pasal 27 ayat 2).',
        },
        {
            kasus: 'Seorang influencer membuat video review aplikasi slot dan mengatakan "halal & untung besar" kepada followers-nya.',
            pilihan: [
                'UU ITE Pasal 28 ayat (1) — Berita Bohong & UU ITE Pasal 27 ayat (2)',
                'UU Hak Cipta',
                'KUHP Pasal 310',
                'UU Perlindungan Konsumen saja',
            ],
            jawaban: 0,
            penjelasan: 'Menyebarkan informasi bohong yang menyesatkan + mempromosikan judol → dapat dijerat dengan UU ITE Pasal 28 ayat (1) dan Pasal 27 ayat (2).',
        },
        {
            kasus: 'UU yang menjadi revisi kedua UU ITE dan menegaskan kembali sanksi judi online di era 2024 adalah...',
            pilihan: [
                'UU No. 1 Tahun 2024',
                'UU No. 19 Tahun 2016',
                'UU No. 11 Tahun 2008',
                'UU No. 27 Tahun 2022',
            ],
            jawaban: 0,
            penjelasan: 'UU No. 1 Tahun 2024 adalah perubahan kedua atas UU ITE, mempertegas larangan & sanksi terkait konten ilegal termasuk judi online.',
        },
    ];

    const PASAL_PER_ROUND = 8;
    const PASAL_POINTS = 10;

    const PasalGame = (function () {
        let cases = [];
        let idx = 0;
        let score = 0;
        let correct = 0;
        let wrong = 0;
        let locked = false;

        function reset() {
            cases = [];
            idx = 0; score = 0; correct = 0; wrong = 0;
            locked = false;
            showScreen('pasalIntro');
        }

        function showScreen(id) {
            ['pasalIntro', 'pasalPlay', 'pasalResult'].forEach(s => {
                const el = $(s);
                if (!el) return;
                if (s === id) el.classList.remove('mini-screen-hidden');
                else el.classList.add('mini-screen-hidden');
            });
        }

        function start() {
            cases = pick(PASAL_POOL, Math.min(PASAL_PER_ROUND, PASAL_POOL.length));
            idx = 0; score = 0; correct = 0; wrong = 0;
            const qTotal = $('pasalQTotal');
            if (qTotal) qTotal.textContent = cases.length;
            showScreen('pasalPlay');
            renderCase();
        }

        function renderCase() {
            locked = false;
            const c = cases[idx];
            if (!c) { finish(); return; }
            $('pasalQNum').textContent = idx + 1;
            $('pasalScore').textContent = score;
            $('pasalCaseText').textContent = c.kasus;
            const list = $('pasalOptionsList');
            list.innerHTML = '';
            const fb = $('pasalFeedback');
            if (fb) { fb.textContent = ''; fb.className = 'mini-feedback'; }
            const nextWrap = $('pasalNextWrap');
            if (nextWrap) nextWrap.classList.add('mini-next-hidden');

            const indexed = c.pilihan.map((opt, i) => ({ opt, i }));
            const shuffled = shuffle(indexed);
            shuffled.forEach(({ opt, i }) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mini-option';
                btn.innerHTML = `<span class="mini-option-text">${opt}</span>`;
                btn.addEventListener('click', () => answer(i, btn));
                list.appendChild(btn);
            });

            const nextText = $('btnPasalNextText');
            if (nextText) nextText.textContent = (idx + 1 >= cases.length) ? 'Lihat Hasil' : 'Soal Berikutnya';
        }

        function answer(selectedI, btnEl) {
            if (locked) return;
            locked = true;
            const c = cases[idx];
            const isCorrect = (selectedI === c.jawaban);
            const list = $('pasalOptionsList');
            Array.from(list.querySelectorAll('.mini-option')).forEach(b => {
                b.disabled = true;
                const t = b.querySelector('.mini-option-text').textContent;
                if (t === c.pilihan[c.jawaban]) b.classList.add('mini-option-correct');
            });
            if (!isCorrect && btnEl) btnEl.classList.add('mini-option-wrong');

            const fb = $('pasalFeedback');
            if (isCorrect) {
                score += PASAL_POINTS;
                correct++;
                if (fb) {
                    fb.className = 'mini-feedback mini-feedback-ok';
                    fb.innerHTML = '<b>✅ Tepat!</b> ' + c.penjelasan;
                }
            } else {
                wrong++;
                if (fb) {
                    fb.className = 'mini-feedback mini-feedback-bad';
                    fb.innerHTML = '<b>❌ Kurang tepat.</b> ' + c.penjelasan;
                }
            }
            $('pasalScore').textContent = score;
            const nextWrap = $('pasalNextWrap');
            if (nextWrap) nextWrap.classList.remove('mini-next-hidden');
        }

        function next() {
            idx++;
            if (idx >= cases.length) finish();
            else renderCase();
        }

        function finish() {
            showScreen('pasalResult');
            const total = cases.length;
            const max = total * PASAL_POINTS;
            const pct = max > 0 ? Math.round((score / max) * 100) : 0;
            const ico = $('pasalResultIcon');
            const title = $('pasalResultTitle');
            const desc = $('pasalResultDesc');
            let label, msg, icon;
            if (pct >= 80) { label = 'Calon Ahli Hukum!'; msg = 'Kamu paham pasal-pasal penting yang menjerat judol. Hebat!'; icon = 'gavel'; }
            else if (pct >= 60) { label = 'Mantap!'; msg = 'Pemahaman pasalmu sudah baik. Tingkatkan lagi ya.'; icon = 'verified'; }
            else if (pct >= 40) { label = 'Cukup'; msg = 'Yuk baca lagi materi hukum di halaman Materi Hukum.'; icon = 'menu_book'; }
            else { label = 'Tetap Belajar!'; msg = 'Pelajari pasal-pasal di UU ITE & KUHP agar paham sanksinya.'; icon = 'school'; }
            if (ico) ico.textContent = icon;
            if (title) title.textContent = label;
            if (desc) desc.textContent = msg;
            $('pasalFinalScore').textContent = score;
            $('pasalCorrectCount').textContent = correct;
            $('pasalWrongCount').textContent = wrong;
            // Submit ke leaderboard (akumulatif)
            submitMiniGameScore('pasal', score);
        }

        function bind() {
            const btnStart = $('btnPasalStart');
            if (btnStart) btnStart.addEventListener('click', start);
            const btnNext = $('btnPasalNext');
            if (btnNext) btnNext.addEventListener('click', next);
            const btnRestart = $('btnPasalRestart');
            if (btnRestart) btnRestart.addEventListener('click', start);
        }

        return { bind, reset, start };
    })();

    // ---------- HubProfile (input nama+sekolah & leaderboard di Hub) ----------
    const HubProfile = (function () {
        const LS_NAME = 'eting_player_name';
        const LS_SCHOOL = 'eting_player_school';
        const MAX_NAME = 16;
        const MAX_SCHOOL = 48;

        function getEls() {
            return {
                inputName: $('hubInputName'),
                inputSchool: $('hubInputSchool'),
                btnSave: $('hubBtnSaveProfile'),
                hint: $('hubProfileHint'),
                btnRefresh: $('hubBtnRefreshLeaderboard'),
                list: $('hubLeaderboardList'),
                // Mirror tersembunyi untuk kompat dengan game.js
                gameInputName: $('inputPlayerName'),
                gameInputSchool: $('inputPlayerSchool')
            };
        }

        function escapeHtml(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getStoredName() {
            try { return (localStorage.getItem(LS_NAME) || '').trim(); } catch (e) { return ''; }
        }
        function getStoredSchool() {
            try { return (localStorage.getItem(LS_SCHOOL) || '').trim(); } catch (e) { return ''; }
        }

        function setHint(msg, type) {
            const els = getEls();
            if (!els.hint) return;
            els.hint.textContent = msg || '';
            els.hint.classList.remove('hub-profile-hint-ok', 'hub-profile-hint-err', 'hub-profile-hint-info');
            if (type === 'ok') els.hint.classList.add('hub-profile-hint-ok');
            else if (type === 'err') els.hint.classList.add('hub-profile-hint-err');
            else els.hint.classList.add('hub-profile-hint-info');
        }

        function loadProfile() {
            const els = getEls();
            const name = getStoredName();
            const school = getStoredSchool();
            if (els.inputName) els.inputName.value = name;
            if (els.inputSchool) els.inputSchool.value = school;
            // Mirror ke input game.js (hidden) supaya konsisten
            if (els.gameInputName) els.gameInputName.value = name;
            if (els.gameInputSchool) els.gameInputSchool.value = school;
            if (name && school) {
                setHint('Profil tersimpan ✓ Siap main!', 'ok');
            } else if (name || school) {
                setHint('Lengkapi nama & sekolah dulu ya.', 'info');
            } else {
                setHint('Isi nama & sekolah dulu sebelum main Flappy Eting.', 'info');
            }
        }

        function saveProfile() {
            const els = getEls();
            const rawName = (els.inputName && els.inputName.value || '').trim().slice(0, MAX_NAME);
            const rawSchool = (els.inputSchool && els.inputSchool.value || '').trim().slice(0, MAX_SCHOOL);
            if (!rawName) {
                setHint('Nama tidak boleh kosong.', 'err');
                if (els.inputName) els.inputName.focus();
                return false;
            }
            if (!rawSchool) {
                setHint('Sekolah tidak boleh kosong.', 'err');
                if (els.inputSchool) els.inputSchool.focus();
                return false;
            }

            // Helper: actually persist ke localStorage + close modal
            function persist() {
                try {
                    localStorage.setItem(LS_NAME, rawName);
                    localStorage.setItem(LS_SCHOOL, rawSchool);
                } catch (e) { /* ignore */ }
                if (els.inputName) els.inputName.value = rawName;
                if (els.inputSchool) els.inputSchool.value = rawSchool;
                if (els.gameInputName) els.gameInputName.value = rawName;
                if (els.gameInputSchool) els.gameInputSchool.value = rawSchool;
                setHint('Tersimpan ✓ Selamat bermain!', 'ok');
                try {
                    if (window.HubModal && typeof window.HubModal.close === 'function') {
                        setTimeout(function () { window.HubModal.close(); }, 700);
                    }
                } catch (e) { /* ignore */ }
            }

            // Kalau nama belum berubah dari sebelumnya → langsung persist
            // (gak perlu cek duplikat lagi, ini pemain yang sama).
            var prevName = getStoredName();
            if (prevName && prevName.toLowerCase() === rawName.toLowerCase()) {
                persist();
                return true;
            }

            // Cek nama unik via Supabase sebelum simpan + RESERVE row baru
            // dengan score=0. Ini supaya:
            //   1. Nama langsung "terdaftar" begitu user save profile, gak nunggu
            //      sampai user main flappy.
            //   2. Quiz/Puzzle/Pasal yang gak punya submitScore tetap kelihatan
            //      jejak pemainnya di leaderboard (score 0).
            //   3. Saat user main flappy & dapet skor > 0, upsertScore akan
            //      PATCH row yang sama (bukan insert duplikat).
            if (window.EtingDB && window.EtingDB.upsertScore) {
                setHint('Memeriksa nama…', 'info');
                // Cek dulu apakah nama sudah dipakai. Kalau iya & user ini
                // belum punya prevName (pemain baru di device ini), tanya
                // konfirmasi: "Apakah kamu [nama]?" — kalau Ya, lanjutkan
                // (skor akan akumulasi ke row yang sudah ada). Kalau Tidak,
                // minta nama lain.
                window.EtingDB.isNameTaken(rawName).then(function (taken) {
                    // Helper: lanjut reserve row (idempotent: addScore 0 = no-op
                    // untuk row lama, atau INSERT score=0 untuk row baru).
                    function doReserve() {
                        return window.EtingDB.upsertScore({
                            name: rawName,
                            school: rawSchool || null,
                            score: 0
                        }).then(function () { persist(); });
                    }
                    if (taken && !prevName) {
                        // Nama sudah dipakai & user ini belum pernah save di device.
                        // Tampilkan modal CSS yang lebih bagus dari window.confirm.
                        var promptOpts = {
                            title: 'Nama sudah dipakai',
                            message:
                                'Nama "' + rawName + '" sudah terdaftar di leaderboard.\n\n' +
                                'Apakah kamu pemilik nama ini?\n' +
                                'Pilih "Ya, ini saya" supaya skor ditambahkan ke akun yang sama.\n' +
                                'Pilih "Pakai nama lain" kalau bukan kamu.',
                            okText: 'Ya, ini saya',
                            cancelText: 'Pakai nama lain'
                        };
                        var askFn = (window.EtingConfirm && window.EtingConfirm.ask)
                            ? window.EtingConfirm.ask
                            : function (o) {
                                // fallback ke window.confirm kalau modul belum loaded
                                return Promise.resolve(window.confirm(
                                    o.title + '\n\n' + o.message
                                ));
                            };
                        setHint('Menunggu konfirmasi…', 'info');
                        return askFn(promptOpts).then(function (ok) {
                            if (!ok) {
                                setHint('Nama "' + rawName + '" sudah dipakai. Silakan pilih nama lain.', 'err');
                                if (els.inputName) {
                                    els.inputName.focus();
                                    els.inputName.select && els.inputName.select();
                                }
                                return;
                            }
                            return doReserve();
                        });
                    }
                    // Aman → reserve row langsung
                    return doReserve();
                }).catch(function (err) {
                    // Network error — tetap simpan lokal supaya offline tetap jalan
                    try { console.warn('saveProfile fallback (offline):', err && err.message); } catch (_) { }
                    persist();
                });
                return true;
            }
            // Fallback (klien DB belum siap)
            persist();
            return true;
        }

        function hasProfile() {
            return !!(getStoredName() && getStoredSchool());
        }

        function renderLeaderboard(items) {
            const els = getEls();
            if (!els.list) return;
            if (!Array.isArray(items) || items.length === 0) {
                els.list.innerHTML = '<div class="hub-lb-empty">Belum ada skor. Jadilah yang pertama!</div>';
                return;
            }
            const rows = items.slice(0, 10).map(function (it, i) {
                const rank = i + 1;
                const rankCls = rank === 1 ? 'hub-lb-rank hub-lb-rank-1'
                    : rank === 2 ? 'hub-lb-rank hub-lb-rank-2'
                    : rank === 3 ? 'hub-lb-rank hub-lb-rank-3'
                    : 'hub-lb-rank';
                return '<div class="hub-lb-row">'
                    + '<div class="' + rankCls + '">' + rank + '</div>'
                    + '<div class="hub-lb-info">'
                    + '<div class="hub-lb-name">' + escapeHtml(it.name || '-') + '</div>'
                    + '<div class="hub-lb-school">' + escapeHtml(it.school || '') + '</div>'
                    + '</div>'
                    + '<div class="hub-lb-score">' + (Number(it.score) || 0) + '</div>'
                    + '</div>';
            }).join('');
            els.list.innerHTML = rows;
        }

        function fetchLeaderboard() {
            const els = getEls();
            if (!els.list) return;
            els.list.innerHTML = '<div class="hub-lb-empty">Memuat leaderboard…</div>';
            if (!window.EtingDB || !window.EtingDB.getLeaderboard) {
                els.list.innerHTML = '<div class="hub-lb-empty">Klien database belum siap.</div>';
                return;
            }
            const p = window.EtingDB.getLeaderboard(10)
                .then(function (data) { renderLeaderboard(data || []); })
                .catch(function () {
                    if (els.list) els.list.innerHTML = '<div class="hub-lb-empty">Gagal memuat leaderboard.</div>';
                });
            // Loader halaman tunggu data leaderboard sebelum fade-out.
            if (window.PageLoader && typeof window.PageLoader.waitFor === 'function') {
                window.PageLoader.waitFor(p);
            }
            return p;
        }

        function refresh() {
            loadProfile();
            fetchLeaderboard();
        }

        function bind() {
            const els = getEls();
            if (els.btnSave) {
                els.btnSave.addEventListener('click', function (e) {
                    e.preventDefault();
                    saveProfile();
                });
            }
            if (els.btnRefresh) {
                els.btnRefresh.addEventListener('click', function (e) {
                    e.preventDefault();
                    fetchLeaderboard();
                });
            }
            // Enter key submit untuk kedua input
            function onEnter(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveProfile();
                }
            }
            if (els.inputName) els.inputName.addEventListener('keydown', onEnter);
            if (els.inputSchool) els.inputSchool.addEventListener('keydown', onEnter);
        }

        return { bind, refresh, loadProfile, saveProfile, hasProfile };
    })();

    // ---------- HubModal (popup Profil + Leaderboard) ----------
    const HubModal = (function () {
        function getEls() {
            return {
                modal: $('hubProfilePanel'),
                btnOpenProfile: $('hubBtnOpenProfile'),
                btnOpenLeaderboard: $('hubBtnOpenLeaderboard'),
                inputName: $('hubInputName')
            };
        }

        function open(focusTarget) {
            const els = getEls();
            if (!els.modal) return;
            els.modal.classList.add('is-open');
            els.modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('hub-modal-open');
            // Refresh data tiap kali dibuka (profil + leaderboard)
            try { HubProfile.refresh(); } catch (e) { /* ignore */ }
            // Focus
            setTimeout(function () {
                if (focusTarget === 'name' && els.inputName) {
                    els.inputName.focus();
                    try { els.inputName.select(); } catch (e) { /* ignore */ }
                }
            }, 200);
        }

        function close() {
            const els = getEls();
            if (!els.modal) return;
            els.modal.classList.remove('is-open');
            els.modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('hub-modal-open');
        }

        function bind() {
            const els = getEls();
            if (!els.modal) return;

            if (els.btnOpenProfile) {
                els.btnOpenProfile.addEventListener('click', function (e) {
                    e.preventDefault();
                    open('name');
                });
            }
            if (els.btnOpenLeaderboard) {
                els.btnOpenLeaderboard.addEventListener('click', function (e) {
                    e.preventDefault();
                    open();
                });
            }

            // Tombol close (X) + klik backdrop
            els.modal.querySelectorAll('[data-hub-close]').forEach(function (el) {
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                    close();
                });
            });

            // Esc untuk close
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && els.modal.classList.contains('is-open')) {
                    close();
                }
            });
        }

        return { bind, open, close };
    })();

    // Expose ke window agar game.js bisa cek/sync profile bila perlu
    window.HubProfile = HubProfile;
    window.HubModal = HubModal;

    // Expose MiniGames API supaya game.js (promptName, btnChangeName, dll) bisa
    // balik ke Game Hub tanpa harus reload halaman.
    window.MiniGames = {
        showHub: showHub,
        launchGame: launchGame,
        HubProfile: HubProfile,
        QuizGame: QuizGame,
        PasalGame: PasalGame,
        // Helper supaya submitMiniGameScore bisa refresh leaderboard panel
        // tanpa harus tau detail internal HubProfile.
        refreshLeaderboard: function () {
            try { HubProfile.refresh(); } catch (e) { /* ignore */ }
        }
    };

    // ---------- Init ----------
    document.addEventListener('DOMContentLoaded', function () {
        QuizGame.bind();
        PasalGame.bind();
        HubProfile.bind();
        HubProfile.refresh();
        HubModal.bind();
        // Pastikan default: hub visible, semua section hidden
        Object.values(sections).forEach(s => s && s.classList.add('game-section-hidden'));
        // Auto-buka modal kalau profil belum lengkap (biar user langsung diarahkan isi)
        try {
            if (!HubProfile.hasProfile()) {
                setTimeout(function () { HubModal.open('name'); }, 350);
            }
        } catch (e) { /* ignore */ }
    });

})();
