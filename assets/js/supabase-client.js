/* ============================================================
 *  ETING — Supabase REST client (frontend-only)
 * ------------------------------------------------------------
 *  Pakai REST API langsung lewat fetch supaya gak perlu bundle
 *  @supabase/supabase-js (hemat KB & gak perlu build step).
 *
 *  Endpoint:
 *    GET  {URL}/rest/v1/leaderboard?select=*&order=score.desc&limit=N
 *    POST {URL}/rest/v1/leaderboard      (body: {name, school, score})
 *    GET  {URL}/rest/v1/leaderboard?name=eq.{name}&select=name   (cek unik)
 *
 *  Catatan kebijakan nama unik:
 *    Schema kamu tidak (atau belum) punya UNIQUE constraint di kolom
 *    name. Kita validasi di frontend: kalau ada row dgn name sama →
 *    tolak ("Nama sudah digunakan, pilih nama lain").
 *    Kalau nanti kamu pasang UNIQUE constraint di Supabase juga,
 *    POST otomatis error 409 → tetap kita handle sebagai "nama dipakai".
 *
 *  Key yang dipakai: `publishable` (anon-equivalent baru di Supabase).
 *  Aman ditaruh di frontend; tetap proteksi data lewat RLS policy kalau
 *  RLS aktif. RLS kamu sekarang masih "disabled" (lihat screenshot) —
 *  insert+select dari anon udah jalan.
 * ============================================================ */
(function (global) {
    'use strict';

    var SUPABASE_URL = 'https://pwtymasbuzioptwupisc.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_BARuwFZckcP4M2WV8vxtlA_emghaiFT';
    var TABLE = 'leaderboard';

    function baseHeaders() {
        return {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    function restUrl(path) {
        return SUPABASE_URL + '/rest/v1/' + path;
    }

    /**
     * Ambil top-N skor (descending).
     * @param {number} limit
     * @returns {Promise<Array<{name, school, score, created_at}>>}
     */
    function getLeaderboard(limit) {
        var n = Math.max(1, Math.min(parseInt(limit, 10) || 10, 100));
        var url = restUrl(TABLE) +
            '?select=name,school,score,created_at' +
            '&order=score.desc,created_at.asc' +
            '&limit=' + n;
        return fetch(url, { method: 'GET', headers: baseHeaders() })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    /**
     * Cek apakah `name` sudah ada (case-insensitive via ilike).
     * @param {string} name
     * @returns {Promise<boolean>} true kalau nama sudah dipakai.
     */
    function isNameTaken(name) {
        var n = String(name || '').trim();
        if (!n) return Promise.resolve(false);
        // PostgREST: ilike = case-insensitive exact match (pakai %x% untuk
        // partial — di sini kita mau exact, jadi langsung kasih literal).
        var url = restUrl(TABLE) +
            '?select=name' +
            '&name=ilike.' + encodeURIComponent(n) +
            '&limit=1';
        return fetch(url, { method: 'GET', headers: baseHeaders() })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) { return Array.isArray(rows) && rows.length > 0; })
            .catch(function () { return false; }); // network error → biarin POST yang nentuin
    }

    /**
     * Submit skor baru.
     * Akan REJECT promise dengan Error('NAME_TAKEN') kalau nama sudah
     * dipakai pemain lain.
     *
     * @param {{name:string, school?:string, score:number}} entry
     * @returns {Promise<object>}
     */
    function submitScore(entry) {
        var name = String(entry && entry.name || '').trim();
        var school = String(entry && entry.school || '').trim() || null;
        var score = parseInt(entry && entry.score, 10);
        if (!name) return Promise.reject(new Error('NAME_REQUIRED'));
        if (!Number.isFinite(score) || score < 0) {
            return Promise.reject(new Error('SCORE_INVALID'));
        }

        return isNameTaken(name).then(function (taken) {
            if (taken) {
                var err = new Error('NAME_TAKEN');
                err.code = 'NAME_TAKEN';
                throw err;
            }
            var body = JSON.stringify({ name: name, school: school, score: score });
            var headers = baseHeaders();
            headers['Prefer'] = 'return=representation';
            return fetch(restUrl(TABLE), {
                method: 'POST',
                headers: headers,
                body: body
            }).then(function (r) {
                if (r.status === 409) {
                    var err2 = new Error('NAME_TAKEN');
                    err2.code = 'NAME_TAKEN';
                    throw err2;
                }
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json().then(function (rows) {
                    return Array.isArray(rows) ? rows[0] : rows;
                });
            });
        });
    }

    /**
     * Tambah skor ke row pemain (AKUMULATIF lintas-game).
     *
     * Strategi:
     *   - SELECT id, score, school by name (ilike, case-insensitive)
     *   - Kalau ada row → PATCH score = oldScore + delta
     *   - Kalau gak ada  → INSERT row baru dgn score = delta
     *
     * Leaderboard mencatat TOTAL skor lintas-game (Flappy + Kuis + Pasal +
     * Puzzle). Setiap game yang selesai memanggil addScore({ name, school,
     * score: skorGameItu }) — score di DB jadi: skor_lama + skor_game_baru.
     *
     * Untuk "reserve row" (daftar nama tanpa nambah skor) → panggil
     * dengan score = 0. Idempotent: row baru dibuat dgn skor 0, row lama
     * tidak berubah (oldScore + 0 = oldScore).
     *
     * @param {{name, school?, score}} entry  score = delta yg mau ditambah
     * @returns {Promise<{action:'inserted'|'updated', row?:object, delta:number, oldScore:number, newScore:number}>}
     */
    function addScore(entry) {
        var name = String(entry && entry.name || '').trim();
        var school = String(entry && entry.school || '').trim() || null;
        var delta = parseInt(entry && entry.score, 10);
        if (!name) return Promise.reject(new Error('NAME_REQUIRED'));
        if (!Number.isFinite(delta) || delta < 0) {
            return Promise.reject(new Error('SCORE_INVALID'));
        }

        // Ambil row existing by name (case-insensitive)
        var lookup = restUrl(TABLE) +
            '?select=id,score,school' +
            '&name=ilike.' + encodeURIComponent(name) +
            '&limit=1';
        return fetch(lookup, { method: 'GET', headers: baseHeaders() })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    var existing = rows[0];
                    var oldScore = parseInt(existing.score, 10) || 0;
                    var newScore = oldScore + delta;
                    // PATCH body — selalu update skor (akumulatif). school
                    // hanya diisi kalau row belum punya tapi sekarang ada.
                    var patchBody = { score: newScore };
                    if (school && !existing.school) patchBody.school = school;

                    var patchUrl = restUrl(TABLE) + '?id=eq.' + encodeURIComponent(existing.id);
                    var headers = baseHeaders();
                    headers['Prefer'] = 'return=representation';
                    return fetch(patchUrl, {
                        method: 'PATCH',
                        headers: headers,
                        body: JSON.stringify(patchBody)
                    }).then(function (r2) {
                        if (!r2.ok) throw new Error('HTTP ' + r2.status);
                        return r2.json().then(function (out) {
                            return {
                                action: 'updated',
                                row: Array.isArray(out) ? out[0] : out,
                                delta: delta,
                                oldScore: oldScore,
                                newScore: newScore
                            };
                        });
                    });
                }
                // Belum ada — insert baru dgn score = delta
                var body = JSON.stringify({ name: name, school: school, score: delta });
                var hdr = baseHeaders();
                hdr['Prefer'] = 'return=representation';
                return fetch(restUrl(TABLE), {
                    method: 'POST',
                    headers: hdr,
                    body: body
                }).then(function (r3) {
                    if (!r3.ok) throw new Error('HTTP ' + r3.status);
                    return r3.json().then(function (out) {
                        return {
                            action: 'inserted',
                            row: Array.isArray(out) ? out[0] : out,
                            delta: delta,
                            oldScore: 0,
                            newScore: delta
                        };
                    });
                });
            });
    }

    // Alias lama "upsertScore" tetap dipertahankan untuk kompatibilitas
    // kode yang belum dimigrasi — sekarang juga akumulatif.
    var upsertScore = addScore;

    global.EtingDB = {
        URL: SUPABASE_URL,
        getLeaderboard: getLeaderboard,
        isNameTaken: isNameTaken,
        submitScore: submitScore,
        upsertScore: upsertScore,
        addScore: addScore
    };
})(typeof window !== 'undefined' ? window : globalThis);
