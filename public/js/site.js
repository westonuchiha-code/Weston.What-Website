/* ==========================================================================
   westonwhat.com :: site.js
   Everything interactive: display settings, skull, Konami code,
   photo viewer, arcade buttons, webring. No libraries, no tracking.
   Nothing here talks to a server. Settings live in this browser only.
   ========================================================================== */
(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => Array.from(el.querySelectorAll(s));
  const DATA = (() => { try { return JSON.parse($('#node-data').textContent); } catch { return {}; } })();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------------------------------------------------------------- settings
  const PREFS_KEY = 'ww-prefs';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch { return {}; } })();
  const save = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ } };
  const systemReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => prefs.motion === 'reduce' || (prefs.motion !== 'full' && systemReduce.matches);

  function applyPrefs() {
    root.classList.toggle('crt', prefs.crt !== false);
    root.dataset.phosphor = prefs.phosphor || 'green';
    root.classList.toggle('reduce-motion', prefs.motion === 'reduce');
    root.classList.toggle('force-motion', prefs.motion === 'full');
    root.classList.toggle('mode-1999', !!(prefs.mode1999 && prefs.unlocked1999));
    // animated GIFs: <picture> swaps to a still PNG when motion is off
    $$('picture source[media]').forEach((s) => {
      s.dataset.media ??= s.media;
      s.media = prefs.motion === 'reduce' ? 'all' : prefs.motion === 'full' ? 'not all' : s.dataset.media;
    });
    // <marquee> tags in posts: swap for a still copy when motion is off
    $$('marquee').forEach((m) => {
      let copy = m.nextElementSibling?.classList.contains('marquee-still') ? m.nextElementSibling : null;
      if (still()) {
        if (!copy) { copy = d.createElement('p'); copy.className = 'marquee-still'; copy.innerHTML = m.innerHTML; m.after(copy); }
        m.hidden = true;
        copy.hidden = false;
      } else {
        m.hidden = false;
        if (copy) copy.hidden = true;
      }
    });
  }
  systemReduce.addEventListener?.('change', applyPrefs);

  // controls that only work with JavaScript start hidden in the HTML
  $$('[data-open-display], [data-copy], [data-next-msg], [data-random-link]').forEach((el) => { el.hidden = false; });

  // ---------------------------------------------------------------- toast
  let toastTimer;
  function toast(title, text) {
    let t = $('#toast');
    if (!t) {
      t = d.createElement('div');
      t.id = 'toast';
      t.className = 'toast win';
      t.setAttribute('role', 'status');
      t.innerHTML = '<div class="win__bar"><span class="win__title"></span></div><div class="win__body"></div>';
      d.body.appendChild(t);
    }
    $('.win__title', t).textContent = title;
    $('.win__body', t).textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // ---------------------------------------------------------------- DISPLAY.CPL
  const panel = $('#display-panel');
  function syncPanel() {
    if (!panel) return;
    const f = $('form', panel);
    f.crt.checked = prefs.crt !== false;
    $$('input[name=phosphor]', f).forEach((r) => { r.checked = r.value === (prefs.phosphor || 'green'); });
    $$('input[name=motion]', f).forEach((r) => { r.checked = r.value === (prefs.motion || 'system'); });
    f.mode1999.disabled = !prefs.unlocked1999;
    f.mode1999.checked = !!(prefs.unlocked1999 && prefs.mode1999);
    $('[data-1999-label]', f).textContent = prefs.unlocked1999 ? '1999 MODE (Comic Sans, rainbows, skull cursor trail)' : '1999 MODE [LOCKED: try the Konami code]';
  }
  if (panel) {
    $('[data-open-display]')?.addEventListener('click', () => { syncPanel(); panel.showModal(); });
    $('form', panel).addEventListener('change', (e) => {
      const f = e.currentTarget;
      prefs.crt = f.crt.checked;
      prefs.phosphor = (f.querySelector('input[name=phosphor]:checked') || {}).value || 'green';
      prefs.motion = (f.querySelector('input[name=motion]:checked') || {}).value || 'system';
      if (prefs.unlocked1999) prefs.mode1999 = f.mode1999.checked;
      save();
      applyPrefs();
    });
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.close(); });
  }

  // ---------------------------------------------------------------- clock + uptime
  const clockEl = $('[data-clock]');
  const epoch = new Date(`${DATA.epoch || '1999-01-01'}T00:00:00`);
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  tick();
  setInterval(tick, 1000);

  // ---------------------------------------------------------------- copy buttons
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const box = $(btn.dataset.copy);
    if (!box) return;
    try { await navigator.clipboard.writeText(box.value); } catch { box.select(); d.execCommand?.('copy'); }
    const old = btn.textContent;
    btn.textContent = 'COPIED!';
    setTimeout(() => { btn.textContent = old; }, 1800);
  }));

  // ---------------------------------------------------------------- Konami code -> 1999 MODE
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  d.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) { kpos = 0; toggle1999(); }
  });
  function toggle1999(force) {
    prefs.unlocked1999 = true;
    prefs.mode1999 = force ?? !prefs.mode1999;
    save();
    applyPrefs();
    toast('DISPLAY', prefs.mode1999 ? '1999 mode is on. Turn it off in DISPLAY.CPL or enter the code again.' : '1999 mode is off.');
    return prefs.mode1999;
  }
  // skull cursor trail in 1999 mode (mouse only, never when motion is off)
  let lastTrail = 0;
  d.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !root.classList.contains('mode-1999') || still()) return;
    const now = performance.now();
    if (now - lastTrail < 45) return;
    lastTrail = now;
    const img = d.createElement('img');
    img.src = DATA.skullIcon || '/img/icons/skull.png';
    img.alt = '';
    img.className = 'trail';
    img.style.left = `${e.clientX + 8}px`;
    img.style.top = `${e.clientY + 10}px`;
    d.body.appendChild(img);
    setTimeout(() => img.remove(), 700);
  });

  // ---------------------------------------------------------------- HOME: boot sequence
  const boot = $('.boot');
  if (boot) {
    let seen = false;
    try { seen = sessionStorage.getItem('ww-booted') === '1'; sessionStorage.setItem('ww-booted', '1'); } catch { seen = true; }
    if (!seen && !still() && !location.hash) {
      const lines = [
        'WESTONWHAT.COM',
        'LOADING ...',
        '',
        'WELCOME.',
      ];
      const pre = $('.boot__text', boot);
      boot.hidden = false;
      let i = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        boot.classList.add('is-done');
        setTimeout(() => { boot.hidden = true; }, 380);
        d.removeEventListener('keydown', finish);
      };
      const timer = setInterval(() => {
        pre.textContent += (i ? '\n' : '') + lines[i];
        i++;
        if (i >= lines.length) { clearInterval(timer); setTimeout(finish, 650); }
      }, 140);
      boot.addEventListener('click', finish);
      d.addEventListener('keydown', finish);
    }
  }

  // ---------------------------------------------------------------- HOME: per-browser visit counter
  const counter = $('[data-counter]');
  if (counter) {
    let n = 1;
    try {
      n = Number(localStorage.getItem('ww-visits') || 0);
      if (sessionStorage.getItem('ww-counted') !== '1') { n += 1; localStorage.setItem('ww-visits', String(n)); sessionStorage.setItem('ww-counted', '1'); }
      n = Math.max(1, n);
    } catch { /* storage blocked: show 1 */ }
    $('.counter__digits', counter).innerHTML = String(n).padStart(6, '0').split('').map((c) => `<span>${c}</span>`).join('');
    $('.counter__unit', counter).textContent = n === 1 ? 'time' : 'times';
    counter.setAttribute('aria-label', `You have visited this node ${n} ${n === 1 ? 'time' : 'times'}`);
  }

  // ---------------------------------------------------------------- HOME: system messages
  const msgEl = $('[data-sysmsg]');
  if (msgEl && DATA.messages?.length) {
    let m = 0;
    const next = (announce) => {
      m = (m + 1) % DATA.messages.length;
      msgEl.setAttribute('aria-live', announce ? 'polite' : 'off');
      msgEl.textContent = DATA.messages[m];
    };
    let auto = setInterval(() => { if (!still()) next(false); }, 9000);
    $('[data-next-msg]')?.addEventListener('click', () => { clearInterval(auto); next(true); auto = setInterval(() => { if (!still()) next(false); }, 9000); });
  }

  // ---------------------------------------------------------------- HOME: the skull
  const skull = $('[data-skull]');
  const says = $('[data-skull-says]');
  if (skull && says) {
    const LINES = ['1/7', '2/7', '3/7', '4/7', '5/7', '6/7'];
    let pokes = 0;
    skull.addEventListener('click', () => {
      pokes++;
      if (!still()) { skull.classList.remove('zap'); void skull.offsetWidth; skull.classList.add('zap'); }
      if (pokes <= LINES.length) {
        says.textContent = LINES[pokes - 1];
      } else {
        says.innerHTML = `The basement is unlocked: <a href="${esc(DATA.basement)}">go in</a>.`;
        if (pokes === LINES.length + 1) toast('BASEMENT', 'Unlocked. Follow the link under the skull.');
      }
    });
  }

  // masthead skull: poke it 7 times to unlock the basement
  if (DATA.basement) {
    let mp = 0;
    $$('.masthead__skull, [data-poke]').forEach((el) => {
      (el.closest('a') || el).addEventListener('click', (ev) => {
        ev.preventDefault();
        mp++;
        if (mp >= 7) location.href = DATA.basement;
      });
    });
  }

  // ---------------------------------------------------------------- PHOTOS: viewer
  const album = $('[data-album]');
  const albumData = (() => { try { return JSON.parse($('#album-data').textContent); } catch { return null; } })();
  if (album && albumData && window.HTMLDialogElement) {
    const v = d.createElement('dialog');
    v.className = 'viewer win';
    v.setAttribute('aria-labelledby', 'viewer-title');
    v.innerHTML = `<div class="win__bar"><h2 class="win__title" id="viewer-title">PHOTO_VIEWER.EXE</h2><span class="viewer__count" aria-live="polite"></span></div>
      <div class="viewer__body">
        <div class="viewer__stage"><img class="viewer__img" alt=""></div>
        <div class="viewer__info">
          <div class="viewer__text"><p class="viewer__caption"></p><p class="viewer__meta"></p></div>
          <div class="viewer__nav">
            <button class="btn btn--small" type="button" data-v="prev">◀ PREV</button>
            <button class="btn btn--small" type="button" data-v="next">NEXT ▶</button>
            <a class="btn btn--small btn--ghost" data-v="orig" target="_blank" rel="noopener">ORIGINAL</a>
            <button class="btn btn--small" type="button" data-v="close">CLOSE</button>
          </div>
        </div>
      </div>`;
    d.body.appendChild(v);
    const img = $('.viewer__img', v);
    let cur = 0;
    const ids = $$('.photo', album).map((li) => li.id);
    const show = (i) => {
      cur = (i + albumData.length) % albumData.length;
      const ph = albumData[cur];
      img.src = ph.src;
      img.alt = ph.alt || '';
      $('.viewer__caption', v).textContent = ph.caption || '';
      $('.viewer__meta', v).textContent = [ph.date, ph.camera, ph.exposure, ph.size, ph.kb ? `${ph.kb} KB` : ''].filter(Boolean).join('  |  ');
      $('[data-v=orig]', v).href = ph.src;
      $('.viewer__count', v).textContent = `${String(cur + 1).padStart(2, '0')}/${String(albumData.length).padStart(2, '0')}`;
      history.replaceState(null, '', `#${ids[cur]}`);
      // warm up the neighbors
      [cur + 1, cur - 1].forEach((j) => { const n = albumData[(j + albumData.length) % albumData.length]; if (n) new Image().src = n.src; });
    };
    let opener = null;
    const open = (i) => { opener = d.activeElement; show(i); if (!v.open) v.showModal(); };
    v.addEventListener('close', () => { history.replaceState(null, '', location.pathname + location.search); opener?.focus?.(); });
    album.addEventListener('click', (e) => {
      const a = e.target.closest('[data-photo]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      open(Number(a.dataset.photo));
    });
    v.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (e.target === v) v.close();
      if (!b) return;
      if (b.dataset.v === 'prev') show(cur - 1);
      if (b.dataset.v === 'next') show(cur + 1);
      if (b.dataset.v === 'close') v.close();
    });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    });
    let sx = null;
    const stage = $('.viewer__stage', v);
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
    const openFromHash = () => {
      const i = ids.indexOf(decodeURIComponent(location.hash.slice(1)));
      if (i >= 0 && (!v.open || i !== cur)) open(i);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  // ---------------------------------------------------------------- ARCADE: player buttons
  const frame = $('.player__frame');
  if (frame) {
    const fs = $('[data-fullscreen]');
    const restart = $('[data-restart]');
    const canFs = !!(frame.requestFullscreen || frame.webkitRequestFullscreen);
    if (fs && canFs) {
      fs.hidden = false;
      fs.addEventListener('click', () => (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame));
    }
    if (restart) {
      restart.hidden = false;
      restart.addEventListener('click', () => { frame.src = frame.src; frame.focus(); });
    }
  }

  // ---------------------------------------------------------------- LINKS: one-node webring
  const ringBtn = $('[data-random-link]');
  if (ringBtn) {
    const links = $$('.links-grid a[href^="http"]');
    if (!links.length) ringBtn.hidden = true;
    ringBtn.addEventListener('click', () => {
      const a = pick(links);
      ringBtn.textContent = `OPENING ${a.textContent.toUpperCase()} ...`;
      setTimeout(() => { location.href = a.href; }, still() ? 0 : 450);
    });
  }

  // ---------------------------------------------------------------- 404: press any key
  if ($('[data-bsod]')) {
    d.addEventListener('keydown', (e) => {
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key) || e.target.closest('a')) return;
      location.href = '/';
    });
  }

  applyPrefs();
})();
