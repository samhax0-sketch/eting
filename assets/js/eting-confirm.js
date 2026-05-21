/* ============================================================
 *  ETING — Confirm Modal
 *  Pengganti window.confirm() yang lebih bagus (CSS modal).
 *  Auto-inject markup + style; dipanggil dari script lain via
 *    EtingConfirm.ask({ title, message, okText, cancelText })
 *      .then(function (ok) { ... });
 *  Kompatibel dengan flow Promise. Backdrop-blur supaya konsisten
 *  dengan page-loader frosted glass.
 * ============================================================ */
(function (global) {
    'use strict';

    if (global.EtingConfirm) return;

    var STYLE_ID = 'eting-confirm-style';
    var ROOT_ID = 'eting-confirm-root';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var css =
            '#' + ROOT_ID + '{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:24px;font-family:"Poppins","Fredoka",system-ui,sans-serif;}' +
            '#' + ROOT_ID + '.is-open{display:flex;animation:etingConfirmFadeIn 180ms ease;}' +
            '#' + ROOT_ID + ' .etc-backdrop{position:absolute;inset:0;background:rgba(40,18,4,0.32);-webkit-backdrop-filter:blur(10px) saturate(140%);backdrop-filter:blur(10px) saturate(140%);}' +
            '#' + ROOT_ID + ' .etc-dialog{position:relative;max-width:420px;width:100%;background:#fff8eb;border-radius:22px;box-shadow:0 24px 60px rgba(110,58,5,0.32),0 0 0 4px rgba(255,255,255,0.55) inset;overflow:hidden;animation:etingConfirmPop 240ms cubic-bezier(.34,1.56,.64,1);}' +
            '#' + ROOT_ID + ' .etc-head{background:linear-gradient(135deg,#c0392b 0%,#a82a1e 100%);color:#fff;padding:18px 22px 16px;display:flex;align-items:center;gap:12px;}' +
            '#' + ROOT_ID + ' .etc-head-icon{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
            '#' + ROOT_ID + ' .etc-head-icon .material-symbols-rounded{font-size:24px;color:#fff;}' +
            '#' + ROOT_ID + ' .etc-title{margin:0;font-size:18px;font-weight:700;letter-spacing:0.2px;}' +
            '#' + ROOT_ID + ' .etc-body{padding:20px 24px;color:#5a3a1a;font-size:15px;line-height:1.55;white-space:pre-line;}' +
            '#' + ROOT_ID + ' .etc-actions{display:flex;gap:10px;padding:0 20px 22px;flex-wrap:wrap;justify-content:flex-end;}' +
            '#' + ROOT_ID + ' .etc-btn{flex:1 1 auto;min-width:120px;padding:11px 18px;border-radius:14px;border:none;font-family:inherit;font-size:14px;font-weight:600;letter-spacing:0.3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:transform .12s ease, box-shadow .12s ease, filter .12s ease;}' +
            '#' + ROOT_ID + ' .etc-btn:hover{transform:translateY(-1px);filter:brightness(1.04);}' +
            '#' + ROOT_ID + ' .etc-btn:active{transform:translateY(1px);}' +
            '#' + ROOT_ID + ' .etc-btn-ok{background:linear-gradient(135deg,#2f9e44 0%,#229141 100%);color:#fff;box-shadow:0 6px 16px rgba(34,145,65,0.32);}' +
            '#' + ROOT_ID + ' .etc-btn-cancel{background:#fff;color:#8b3a13;box-shadow:inset 0 0 0 2px #e9c98a;}' +
            '#' + ROOT_ID + ' .etc-btn-cancel:hover{background:#fff3d6;}' +
            '@keyframes etingConfirmFadeIn{from{opacity:0;}to{opacity:1;}}' +
            '@keyframes etingConfirmPop{0%{transform:scale(.82);opacity:0;}100%{transform:scale(1);opacity:1;}}' +
            '@media (max-width:480px){#' + ROOT_ID + ' .etc-dialog{border-radius:18px;}#' + ROOT_ID + ' .etc-head{padding:14px 16px 12px;}#' + ROOT_ID + ' .etc-body{padding:16px 18px;font-size:14px;}#' + ROOT_ID + ' .etc-actions{padding:0 16px 18px;}#' + ROOT_ID + ' .etc-btn{min-width:0;}}';
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    }

    function ensureRoot() {
        var root = document.getElementById(ROOT_ID);
        if (root) return root;
        injectStyle();
        root = document.createElement('div');
        root.id = ROOT_ID;
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.innerHTML =
            '<div class="etc-backdrop" data-etc-cancel></div>' +
            '<div class="etc-dialog">' +
                '<div class="etc-head">' +
                    '<div class="etc-head-icon"><span class="material-symbols-rounded">help</span></div>' +
                    '<h3 class="etc-title">Konfirmasi</h3>' +
                '</div>' +
                '<div class="etc-body"></div>' +
                '<div class="etc-actions">' +
                    '<button type="button" class="etc-btn etc-btn-cancel" data-etc-cancel>Batal</button>' +
                    '<button type="button" class="etc-btn etc-btn-ok" data-etc-ok>OK</button>' +
                '</div>' +
            '</div>';
        if (document.body) {
            document.body.appendChild(root);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.body.appendChild(root);
            }, { once: true });
        }
        return root;
    }

    function ask(opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var root = ensureRoot();
            var dlg = root.querySelector('.etc-dialog');
            var titleEl = root.querySelector('.etc-title');
            var bodyEl = root.querySelector('.etc-body');
            var okBtn = root.querySelector('[data-etc-ok]');
            var cancelBtn = root.querySelector('.etc-btn-cancel');

            titleEl.textContent = opts.title || 'Konfirmasi';
            bodyEl.textContent = opts.message || '';
            okBtn.textContent = opts.okText || 'OK';
            cancelBtn.textContent = opts.cancelText || 'Batal';

            var closed = false;
            function close(result) {
                if (closed) return;
                closed = true;
                root.classList.remove('is-open');
                // cleanup handlers
                root.removeEventListener('click', onClick);
                document.removeEventListener('keydown', onKey);
                resolve(!!result);
            }
            function onClick(e) {
                var t = e.target;
                if (!t) return;
                if (t.hasAttribute && t.hasAttribute('data-etc-ok')) { close(true); return; }
                if (t.hasAttribute && t.hasAttribute('data-etc-cancel')) { close(false); return; }
            }
            function onKey(e) {
                if (e.key === 'Escape') { close(false); }
                else if (e.key === 'Enter') { close(true); }
            }
            root.addEventListener('click', onClick);
            document.addEventListener('keydown', onKey);
            root.classList.add('is-open');
            // auto-focus OK biar Enter langsung confirm
            setTimeout(function () { try { okBtn.focus(); } catch (_) { } }, 30);
        });
    }

    global.EtingConfirm = { ask: ask };
})(window);
