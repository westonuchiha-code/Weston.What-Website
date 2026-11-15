/*!
 * RQPad — a drop-in on-screen game controller for phones. One file, no dependencies.
 * Landscape-first. Two analog sticks, four face buttons, two shoulders, Start/Select.
 *
 * QUICK START (add before </body>, or after your game script):
 *   <script src="rqpad.js"></script>
 *   <script>RQPad.install();</script>
 *
 * It does two things at once, so you can use whichever your game prefers:
 *
 * 1) KEYBOARD MODE (default, needs no game changes).
 *    Every press sends real KeyboardEvents (keydown/keyup) to window, so a game that already
 *    reads the keyboard just works. Default mapping:
 *      Left stick   -> W A S D  (and ArrowUp/Left/Down/Right)
 *      Right stick  -> state only (RQPad.state.look). To make it press keys:
 *                      keys: { rightStick: { up:'KeyI', left:'KeyJ', down:'KeyK', right:'KeyL' } }
 *      A (bottom)   -> Space        B (right) -> KeyK / "k"
 *      X (left)     -> KeyJ / "j"   Y (top)   -> KeyL / "l"
 *      L1 -> KeyQ   R1 -> KeyE      L2 -> ShiftLeft   R2 -> KeyR
 *      Start -> Escape              Select -> Tab
 *    Change any of it: RQPad.install({ keys: { A: 'Enter', X: 'KeyZ', ... } })
 *    Use a key's `code` name (KeyZ, Space, Enter, ArrowUp, Digit1, ShiftLeft ...), or null to disable a button.
 *
 * 2) STATE MODE (for analog movement or games that poll).
 *    RQPad.state = {
 *      move: {x, y},   // left stick,  x right, y UP, each -1..1  (0,0 when released)
 *      look: {x, y},   // right stick, same convention
 *      down: { A:bool, B:bool, X:bool, Y:bool, L1, R1, L2, R2, START, SELECT }
 *    }
 *    RQPad.onButton = (name, isDown) => {...}      // called on every press/release
 *    RQPad.onStick  = (which, x, y) => {...}       // which is 'move' or 'look'
 *    Call each frame:  const {x,y} = RQPad.state.move;
 *
 * OPTIONS  RQPad.install({ ... })
 *    layout   'dock' (DEFAULT, the Switch-style attached controller):
 *               LANDSCAPE: a controller half snaps to the left and right edges, full height, game in the middle.
 *               PORTRAIT:  the two halves snap to the bottom, side by side, game fills the space above.
 *               The pad never covers the picture. It re-snaps live when the phone rotates.
 *             'overlay' (floats translucent over the game; only if you really want that)
 *    gameSelector  CSS selector for the game element (default: #game, else the first <canvas>).
 *             In dock layout RQPad moves that element into the free space (position:fixed between the halves).
 *             For games that size things from window.innerWidth/innerHeight, use RQPad.stage instead:
 *               RQPad.stage = { x, y, width, height }  the free rectangle for the game, always current.
 *               window 'rqpad:layout' event fires on every change (detail = the same rectangle).
 *    opacity  0..1 for overlay layout (default 0.55)
 *    scale    size multiplier (default 1)
 *    labels   (keep face-button labels to ~5 letters) { A:'JUMP', B:'DODGE', X:'ATTACK', Y:'STOW', L1:'GUARD', ... }
 *    glyphs   'letters' (A B X Y, default) | 'playstation' (cross circle square triangle, PS2-style) | 'none'
 *    keys     key mapping overrides (see above); keys.moveKeys: 'wasd' | 'arrows' | 'both' (default 'both')
 *    stickKeyThreshold  how far a stick must tilt to count as a key (default 0.35)
 *    hide     array of control names to leave out, e.g. ['L2','R2','SELECT','rightStick']
 *    onlyOnTouch  true (default): only appears on touch devices. false: always shows (handy on desktop for testing)
 *    target   element that receives the fake key events (default window)
 *
 * RQPad.install() returns the RQPad object. RQPad.remove() takes it away again. RQPad.setVisible(false) hides it.
 * Add #nopad to the page URL to switch it off for a session.
 */
(function (root) {
  'use strict';

  var BUTTONS = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2', 'START', 'SELECT'];

  var DEFAULT_KEYS = {
    A: 'Space', B: 'KeyK', X: 'KeyJ', Y: 'KeyL',
    L1: 'KeyQ', R1: 'KeyE', L2: 'ShiftLeft', R2: 'KeyR',
    START: 'Escape', SELECT: 'Tab',
    moveKeys: 'both',
    rightStick: null
  };

  // code -> [key, keyCode], so games checking e.key or the old e.keyCode also work.
  var KEYINFO = {
    Space: [' ', 32], Enter: ['Enter', 13], Escape: ['Escape', 27], Tab: ['Tab', 9],
    ShiftLeft: ['Shift', 16], ShiftRight: ['Shift', 16], ControlLeft: ['Control', 17], AltLeft: ['Alt', 18],
    ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
    Backspace: ['Backspace', 8]
  };
  function keyInfo(code) {
    if (KEYINFO[code]) return KEYINFO[code];
    var m = /^Key([A-Z])$/.exec(code);
    if (m) return [m[1].toLowerCase(), m[1].charCodeAt(0)];
    m = /^Digit([0-9])$/.exec(code);
    if (m) return [m[1], m[1].charCodeAt(0)];
    return [code, 0];
  }

  var CSS =
    '.rqp-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:700 12px/1.1 system-ui,monospace;' +
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}' +
    '.rqp-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;touch-action:none}' +
    '.rqp-ctl{position:absolute;pointer-events:auto;color:#e8eaee}' +
    '.rqp-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;' +
    'background:linear-gradient(#4a4d55,#34363c);border:2px solid #0e0e10;box-shadow:0 2px 0 #0008}' +
    '.rqp-btn.on{background:linear-gradient(#8b8f9b,#62666f);transform:translateY(1px)}' +
    '.rqp-btn small{font-size:.62em;font-weight:400;opacity:.8;margin-top:2px}' +
    '.rqp-face{border-radius:50%;font-size:calc(var(--u)*.34);white-space:nowrap}.rqp-face small{font-size:.46em;margin-top:0}' +
    '.rqp-sh{border-radius:10px 10px 18px 18px;font-size:calc(var(--u)*.26)}' +
    '.rqp-pill{border-radius:20px;font-size:calc(var(--u)*.18)}' +
    '.rqp-stick{border-radius:50%;background:radial-gradient(#0d0e10 55%,#25272c 100%);border:2px solid #08080a}' +
    '.rqp-cap{position:absolute;left:50%;top:50%;width:62%;height:62%;margin:-31% 0 0 -31%;border-radius:50%;' +
    'background:radial-gradient(circle at 40% 35%,#6b6f79,#3a3c43 70%);border:2px solid #0e0e10}' +
    '.rqp-overlay .rqp-ctl{opacity:var(--op)}' +
    '.rqp-root.rqp-dock .rqp-ctl{opacity:1}' +
    '.rqp-side{position:fixed;top:0;bottom:0;width:var(--sw);z-index:2147482990;background:linear-gradient(#2b2d33,#1b1c20)}' +
    '.rqp-side.l{left:0}.rqp-side.r{right:0}' +
    '.rqp-panel{position:absolute;pointer-events:auto;background:linear-gradient(#2b2d33,#1b1c20)}' +
    'body.rqp-docked{background:#16171a}' +
    '.rqp-sides-game{position:fixed!important;left:var(--rqp-l)!important;right:var(--rqp-r)!important;top:var(--rqp-t)!important;bottom:var(--rqp-b)!important;' +
    'width:auto!important;height:auto!important;max-width:none!important;margin:0!important;object-fit:contain}';

  var RQPad = {
    version: '1.0',
    state: { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, down: {} },
    onButton: null,
    onStick: null,
    _root: null, _style: null, _opts: null, _held: {}, _sidesEl: null, _sideNodes: [], _onResize: null
  };
  BUTTONS.forEach(function (b) { RQPad.state.down[b] = false; });

  function mix(base, over) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    if (over) for (k in over) o[k] = over[k];
    return o;
  }

  function sendKey(type, code) {
    if (!code) return;
    var info = keyInfo(code);
    var target = (RQPad._opts && RQPad._opts.target) || window;
    var ev;
    try {
      ev = new KeyboardEvent(type, { key: info[0], code: code, keyCode: info[1], which: info[1], bubbles: true, cancelable: true });
    } catch (e) { return; }
    // keyCode/which are read-only in the constructor on some engines; force them.
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return info[1]; } }); } catch (e) {}
    try { Object.defineProperty(ev, 'which', { get: function () { return info[1]; } }); } catch (e) {}
    target.dispatchEvent(ev);
  }

  // Keep a counter per key code so two controls mapped to the same key do not release each other.
  var keyCount = {};
  function keyDown(code) {
    if (!code) return;
    keyCount[code] = (keyCount[code] || 0) + 1;
    if (keyCount[code] === 1) sendKey('keydown', code);
  }
  function keyUp(code) {
    if (!code || !keyCount[code]) return;
    keyCount[code]--;
    if (keyCount[code] === 0) sendKey('keyup', code);
  }

  function setButton(name, isDown, keys) {
    if (RQPad.state.down[name] === isDown) return;
    RQPad.state.down[name] = isDown;
    if (isDown) keyDown(keys[name]); else keyUp(keys[name]);
    if (RQPad.onButton) { try { RQPad.onButton(name, isDown); } catch (e) { console.error(e); } }
  }

  var GLYPHS = {
    playstation: { A: '✕', B: '○', X: '□', Y: '△' },
    letters: { A: 'A', B: 'B', X: 'X', Y: 'Y' },
    none: { A: '', B: '', X: '', Y: '' }
  };
  var GLYPH_COLOUR = { A: '#6a9be8', B: '#e0605a', X: '#e08ac0', Y: '#6fd3a0' };

  function el(parent, cls, css, html) {
    var d = document.createElement('div');
    d.className = cls;
    if (css) d.style.cssText = css;
    if (html) d.innerHTML = html;
    parent.appendChild(d);
    return d;
  }

  function makeButton(parent, name, cls, css, html, opts) {
    var n = el(parent, 'rqp-ctl rqp-btn ' + cls, css, html);
    var id = null;
    n.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      id = e.pointerId;
      try { n.setPointerCapture(id); } catch (x) {}
      n.classList.add('on');
      setButton(name, true, opts.keys);
      if (navigator.vibrate && opts.haptics) { try { navigator.vibrate(8); } catch (x) {} }
    });
    var end = function (e) {
      if (e.pointerId !== id) return;
      id = null;
      n.classList.remove('on');
      setButton(name, false, opts.keys);
    };
    n.addEventListener('pointerup', end);
    n.addEventListener('pointercancel', end);
    n.addEventListener('lostpointercapture', end);
    n.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return n;
  }

  function makeStick(parent, which, css, opts) {
    var base = el(parent, 'rqp-ctl rqp-stick', css);
    var cap = el(base, 'rqp-cap');
    var id = null;
    var pressed = { up: false, down: false, left: false, right: false };
    var th = opts.stickKeyThreshold;

    function keysFor(dir) {
      if (which === 'move') {
        var mk = opts.keys.moveKeys;
        var w = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[dir];
        var a = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir];
        return mk === 'wasd' ? [w] : mk === 'arrows' ? [a] : [w, a];
      }
      var rs = opts.keys.rightStick;
      return rs && rs[dir] ? [rs[dir]] : [];
    }
    function setDir(dir, on) {
      if (pressed[dir] === on) return;
      pressed[dir] = on;
      keysFor(dir).forEach(function (k) { if (on) keyDown(k); else keyUp(k); });
    }
    function report(x, y) {
      RQPad.state[which].x = x;
      RQPad.state[which].y = y;
      setDir('right', x > th); setDir('left', x < -th);
      setDir('up', y > th); setDir('down', y < -th);
      if (RQPad.onStick) { try { RQPad.onStick(which, x, y); } catch (e) { console.error(e); } }
    }
    function update(e) {
      var r = base.getBoundingClientRect();
      var radius = r.width / 2;
      var dx = e.clientX - (r.left + radius), dy = e.clientY - (r.top + radius);
      var len = Math.hypot(dx, dy), max = radius * 0.6;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      cap.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      report(dx / max, -dy / max);
    }
    base.addEventListener('pointerdown', function (e) {
      e.preventDefault(); id = e.pointerId;
      try { base.setPointerCapture(id); } catch (x) {}
      update(e);
    });
    base.addEventListener('pointermove', function (e) { if (e.pointerId === id) update(e); });
    var end = function (e) {
      if (e.pointerId !== id) return;
      id = null; cap.style.transform = ''; report(0, 0);
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    base.addEventListener('lostpointercapture', end);
    return base;
  }

  function isTouch() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0 || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
  }

  RQPad.install = function (options) {
    if (RQPad._root) RQPad.remove();
    var o = mix({
      layout: 'dock', opacity: 0.55, scale: 1, labels: {}, glyphs: 'letters', hide: [],
      onlyOnTouch: true, stickKeyThreshold: 0.35, gameSelector: null, target: null, haptics: true
    }, options);
    o.keys = mix(DEFAULT_KEYS, options && options.keys);
    if (/nopad/.test(location.hash)) return RQPad;
    if (o.onlyOnTouch && !isTouch()) { RQPad._opts = o; return RQPad; }
    RQPad._opts = o;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    RQPad._style = style;

    var root = document.createElement('div');
    root.className = 'rqp-root rqp-' + (o.layout === 'overlay' ? 'overlay' : 'dock');
    root.style.setProperty('--op', String(o.opacity));
    document.body.appendChild(root);
    RQPad._root = root;

    var hide = {};
    o.hide.forEach(function (h) { hide[h] = true; });
    var glyph = GLYPHS[o.glyphs] || GLYPHS.letters;

    var layoutName = o.layout === 'overlay' ? 'overlay' : 'dock'; // 'sides' and 'dock' are the same thing

    function clearStage() {
      if (RQPad._sidesEl) {
        RQPad._sidesEl.classList.remove('rqp-sides-game');
        ['--rqp-l', '--rqp-r', '--rqp-t', '--rqp-b'].forEach(function (v) { RQPad._sidesEl.style.removeProperty(v); });
        RQPad._sidesEl = null;
      }
    }

    function build() {
      root.innerHTML = '';
      RQPad._sideNodes.forEach(function (n) { n.remove(); });
      RQPad._sideNodes = [];
      var W = window.innerWidth, H = window.innerHeight;
      var landscape = W > H;
      var panels, stage;

      if (layoutName === 'overlay') {
        var cwO = W * 0.3;
        panels = [{ x: 0, y: 0, w: cwO, h: H, left: true }, { x: W - cwO, y: 0, w: cwO, h: H, left: false }];
        stage = { x: 0, y: 0, width: W, height: H };
      } else if (landscape) {
        // Landscape: a controller half on each side of the picture, full height.
        var pw = Math.max(Math.min(W * 0.25, H * 0.9), 150 * o.scale) * o.scale;
        pw = Math.min(pw, W * 0.34);
        panels = [{ x: 0, y: 0, w: pw, h: H, left: true, bg: true }, { x: W - pw, y: 0, w: pw, h: H, left: false, bg: true }];
        stage = { x: pw, y: 0, width: W - 2 * pw, height: H };
      } else {
        // Portrait: the two halves sit side by side under the picture.
        var ph = Math.min(W * 0.5 * (5 / 3), H * 0.55) * Math.min(o.scale, 1.15);
        panels = [{ x: 0, y: H - ph, w: W / 2, h: ph, left: true, bg: true, round: 'l' }, { x: W / 2, y: H - ph, w: W / 2, h: ph, left: false, bg: true, round: 'r' }];
        stage = { x: 0, y: 0, width: W, height: H - ph };
      }

      var u = Math.min(panels[0].w / 3.5, panels[0].h / 5.2);
      root.style.setProperty('--u', u + 'px');
      var key = o.keys, lab = o.labels;
      function labelHtml(name, base) { return base + (lab[name] ? '<small>' + lab[name] + '</small>' : ''); }
      var pad = u * 0.3;

      panels.forEach(function (P) {
        if (P.bg) {
          var bgd = document.createElement('div');
          bgd.className = 'rqp-panel';
          var r = u * 0.9;
          bgd.style.cssText = 'left:' + P.x + 'px;top:' + P.y + 'px;width:' + P.w + 'px;height:' + P.h + 'px;' +
            (P.round === 'l' ? 'border-top-left-radius:' + r + 'px;' : P.round === 'r' ? 'border-top-right-radius:' + r + 'px;' : '') +
            (P.left && landscape ? 'border-right:1px solid #0c0c0e;' : '');
          root.appendChild(bgd);
        }
        var stickSize = Math.min(u * 1.5, P.w * 0.62);
        var shW = Math.min(u * 1.15, (P.w - pad * 3) / 2), shH = u * 0.62;
        var pillTop = P.y + pad + shH + pad * 0.3, pillH = u * 0.34;
        var sx1 = P.left ? P.x + pad : P.x + P.w - pad - shW;            // outer shoulder (L2 / R2)
        var sx2 = P.left ? P.x + pad + shW + pad * 0.5 : P.x + P.w - pad - shW * 2 - pad * 0.5; // inner (L1 / R1)
        var names = P.left ? ['L2', 'L1', 'SELECT', 'move'] : ['R2', 'R1', 'START', 'look'];
        if (!hide[names[0]]) makeButton(root, names[0], 'rqp-sh', 'left:' + sx1 + 'px;top:' + (P.y + pad) + 'px;width:' + shW + 'px;height:' + shH + 'px', labelHtml(names[0], names[0]), o);
        if (!hide[names[1]]) makeButton(root, names[1], 'rqp-sh', 'left:' + sx2 + 'px;top:' + (P.y + pad) + 'px;width:' + shW + 'px;height:' + shH + 'px', labelHtml(names[1], names[1]), o);
        if (!hide[names[2]]) makeButton(root, names[2], 'rqp-pill', 'left:' + sx1 + 'px;top:' + pillTop + 'px;width:' + shW + 'px;height:' + pillH + 'px', labelHtml(names[2], names[2]), o);
        var stickKey = P.left ? 'moveStick' : 'rightStick';
        if (!hide[stickKey]) makeStick(root, names[3], 'left:' + (P.x + (P.w - stickSize) / 2) + 'px;top:' + (P.y + P.h - pad * 1.2 - stickSize) + 'px;width:' + stickSize + 'px;height:' + stickSize + 'px', o);

        if (!P.left) {
          // The face diamond fills the gap between the Start pill and the right stick.
          var top0 = pillTop + pillH + pad * 0.5;
          var bot0 = P.y + P.h - pad * 1.2 - (hide.rightStick ? 0 : stickSize) - pad * 0.5;
          var avail = Math.max(bot0 - top0, u * 1.5);
          var fs = Math.max(Math.min(u * 1.1, avail / 2.75, P.w / 3.1), u * 0.6), fd = fs * 0.9;
          var cx = P.x + P.w / 2, cy = top0 + avail / 2;
          var faces = { Y: [0, -1], B: [1, 0], A: [0, 1], X: [-1, 0] };
          Object.keys(faces).forEach(function (name) {
            if (hide[name]) return;
            var q = faces[name], g = glyph[name];
            var inner = o.glyphs === 'playstation' ? '<span style="color:' + GLYPH_COLOUR[name] + '">' + g + '</span>' : g;
            makeButton(root, name, 'rqp-face',
              'left:' + (cx - fs / 2 + q[0] * fd) + 'px;top:' + (cy - fs / 2 + q[1] * fd) + 'px;width:' + fs + 'px;height:' + fs + 'px',
              labelHtml(name, inner), o);
          });
        }
      });

      // Put the game in the space the controller leaves: it never goes under the pad.
      RQPad.stage = stage;
      var g = (o.gameSelector && document.querySelector(o.gameSelector)) || document.getElementById('game') || document.querySelector('canvas');
      if (layoutName === 'dock' && g) {
        if (RQPad._sidesEl && RQPad._sidesEl !== g) clearStage();
        g.classList.add('rqp-sides-game');
        g.style.setProperty('--rqp-l', stage.x + 'px');
        g.style.setProperty('--rqp-r', (W - stage.x - stage.width) + 'px');
        g.style.setProperty('--rqp-t', stage.y + 'px');
        g.style.setProperty('--rqp-b', (H - stage.y - stage.height) + 'px');
        RQPad._sidesEl = g;
      } else if (layoutName !== 'dock') clearStage();
      document.body.classList.toggle('rqp-docked', layoutName === 'dock');
      window.dispatchEvent(new Event('resize'));
      try { window.dispatchEvent(new CustomEvent('rqpad:layout', { detail: stage })); } catch (e) {}
    }

    build();
    RQPad._onResize = function () { build(); };
    window.addEventListener('resize', RQPad._onResize);
    window.addEventListener('orientationchange', RQPad._onResize);

    // Stop the page from scrolling, zooming or selecting while playing.
    var vp = document.querySelector('meta[name=viewport]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    vp.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    return RQPad;
  };

  RQPad.setVisible = function (v) {
    if (RQPad._root) RQPad._root.style.display = v ? '' : 'none';
    RQPad._sideNodes.forEach(function (n) { n.style.display = v ? '' : 'none'; });
  };

  RQPad.remove = function () {
    // Release everything that is held so nothing sticks down.
    BUTTONS.forEach(function (b) { if (RQPad.state.down[b] && RQPad._opts) setButton(b, false, RQPad._opts.keys); });
    Object.keys(keyCount).forEach(function (k) { while (keyCount[k] > 0) keyUp(k); });
    RQPad.state.move.x = RQPad.state.move.y = RQPad.state.look.x = RQPad.state.look.y = 0;
    if (RQPad._root) RQPad._root.remove();
    if (RQPad._style) RQPad._style.remove();
    RQPad._sideNodes.forEach(function (n) { n.remove(); });
    if (RQPad._sidesEl) { RQPad._sidesEl.classList.remove('rqp-sides-game'); ['--rqp-l', '--rqp-r', '--rqp-t', '--rqp-b'].forEach(function (v) { RQPad._sidesEl.style.removeProperty(v); }); }
    document.body.classList.remove('rqp-docked');
    if (RQPad._onResize) {
      window.removeEventListener('resize', RQPad._onResize);
      window.removeEventListener('orientationchange', RQPad._onResize);
    }
    RQPad._root = RQPad._style = RQPad._sidesEl = null;
    RQPad._sideNodes = [];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RQPad;
  root.RQPad = RQPad;
})(typeof window !== 'undefined' ? window : this);
