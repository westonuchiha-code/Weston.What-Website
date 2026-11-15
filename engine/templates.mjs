// HTML templates for every page. Plain template strings, no framework.
// Content lives in /content; you rarely need to touch this file.

import { e, bytes, isoDay, dayName, clock, monthName, pad } from './util.mjs';

const ICON_FOR_EXT = { txt: 'file', md: 'file', log: 'notebook', lst: 'notebook', cfg: 'gear', ini: 'gear', sav: 'floppy', m3u: 'note', mp3: 'note', dir: 'folder', url: 'globe', lnk: 'globe', exe: 'monitor', gif: 'star', png: 'camera', jpg: 'camera' };
export const iconForFile = (name) => ICON_FOR_EXT[(name.split('.').pop() || '').toLowerCase()] || 'file';

// ---------------------------------------------------------------- pieces
export const icon = (ctx, name, cls = 'px-icon') =>
  `<img class="${cls}" src="${ctx.href(`/img/icons/${name}.png`)}" alt="" width="16" height="16">`;

// A GIF that swaps to a still PNG for visitors who asked for reduced motion.
// (Only when a .png with the same name exists next to the .gif.)
export function gif(ctx, src, alt, w, h, cls = '', extra = '') {
  const still = src.replace(/\.gif$/i, '.png');
  const img = `<img class="${cls}" src="${ctx.href(src)}" alt="${e(alt)}" width="${w}" height="${h}" ${extra}>`;
  if (still === src || (ctx.hasFile && !ctx.hasFile(still))) return img;
  return `<picture><source srcset="${ctx.href(still)}" media="(prefers-reduced-motion: reduce)">${img}</picture>`;
}

let winCount = 0;
export const resetIds = () => { winCount = 0; };

export function win({ ctx, title, iconName = 'file', body, cls = '', id = '', tag = 'section', headingLevel = 2, attrs = '' }) {
  const hid = id ? `${id}-title` : `w-${++winCount}`;
  return `<${tag} class="win ${cls}"${id ? ` id="${id}"` : ''} aria-labelledby="${hid}" ${attrs}>
  <div class="win__bar">${icon(ctx, iconName, 'win__icon')}<h${headingLevel} class="win__title" id="${hid}">${title}</h${headingLevel}></div>
  <div class="win__body">${body}</div>
</${tag}>`;
}

const sampleBadge = (on, what = 'SAMPLE') => (on ? `<span class="badge badge--sample" title="Placeholder content. Replace or delete it.">${what}</span>` : '');

export function fmtDate(ld, withDay = true) {
  if (!ld) return '';
  const t = clock(ld);
  return `${withDay ? dayName(ld) + ' ' : ''}${isoDay(ld)}${t ? ' ' + t : ''}`;
}
const dt = (ld) => `${isoDay(ld)}${ld.h !== null ? `T${pad(ld.h)}:${pad(ld.mi)}` : ''}`;

// ---------------------------------------------------------------- layout
export function layout(ctx, p) {
  const { site } = ctx;
  const canonical = site.url.replace(/\/$/, '') + p.path;
  const title = p.title ? `${p.title} :: ${site.title}` : `${site.title} :: ${site.tagline}`;
  const desc = p.description || site.description;
  const og = site.url.replace(/\/$/, '') + (p.ogImage || '/img/og-image.png');
  const asset = (f) => `${ctx.href(f)}?v=${ctx.hashes[f] || '0'}`;
  return `<!doctype html>
<html lang="${e(site.language || 'en')}" data-phosphor="green" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
${p.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${e(canonical)}">`}
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<meta name="generator" content="westonwhat engine (handmade, zero dependencies)">
<link rel="icon" href="${ctx.href('/favicon.ico')}" sizes="48x48">
<link rel="icon" href="${ctx.href('/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ctx.href('/apple-touch-icon.png')}">
<link rel="alternate" type="application/atom+xml" title="${e(site.title)} logbook" href="${ctx.href('/feed.xml')}">
<link rel="preload" href="${ctx.href('/fonts/vt323.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('/css/style.css')}">
<script src="${asset('/js/prefs.js')}"></script>
<script src="${asset('/js/site.js')}" defer></script>
${p.section === 'about' ? `<script src="${asset('/js/download.js')}" defer></script>\n` : ''}${p.section === 'basement' ? `<script src="${asset('/js/music.js')}" defer></script>\n` : ''}<meta property="og:type" content="${p.ogType || 'website'}">
<meta property="og:site_name" content="${e(site.title)}">
<meta property="og:title" content="${e(p.title || site.title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${e(og)}">
<meta property="og:image:alt" content="A chrome skull next to the words westonwhat.com in neon letters">
<meta name="twitter:card" content="summary_large_image">
</head>
<!--
   psst. view-source people are my people.
   poke the skull on the front page seven times.
-->
<body class="page-${p.section}${p.bodyClass ? ' ' + p.bodyClass : ''}" data-section="${p.section}">
<a class="skip" href="#main">Skip to content</a>
<div class="frame">
${p.section === 'home' ? homeMasthead(ctx) : masthead(ctx, p)}
${nav(ctx, p)}
<main id="main" tabindex="-1">
${p.body}
</main>
${footer(ctx)}
</div>
${displayPanel()}
<script type="application/json" id="node-data">${JSON.stringify(ctx.clientData(p)).replace(/</g, '\\u003c')}</script>
</body>
</html>
`;
}

function homeMasthead(ctx) {
  const { site } = ctx;
  return `<header class="masthead masthead--home">
  <h1 class="logo"><a href="${ctx.href('/')}" class="logo__link"><span class="sr-only">${e(site.name)}</span><pre class="logo__ascii" aria-hidden="true">${e(ctx.logo)}</pre></a></h1>
  <p class="tagline"><span class="tagline__name">${e(site.tagline)}</span></p>
  <p class="poke-row"><button type="button" class="poke" data-poke aria-label="Skull">${gif(ctx, '/img/gfx/skull.gif', '', 32, 32, 'poke__img')}</button></p>
</header>`;
}

function marquee(items = []) {
  if (!items.length) return '';
  const run = items.map((m) => `<span>${e(m)}</span>`).join('<span class="marquee__sep" aria-hidden="true">✦</span>');
  return `<div class="marquee" role="region" aria-label="System bulletins">
    <div class="marquee__track"><div class="marquee__run">${run}<span class="marquee__sep" aria-hidden="true">✦</span></div><div class="marquee__run" aria-hidden="true">${run}<span class="marquee__sep">✦</span></div></div>
  </div>`;
}

function masthead(ctx, p) {
  const { site } = ctx;
  const crumbs = (p.crumbs || []).map((c) => c.toUpperCase()).join('\\');
  return `<header class="masthead">
  <a class="masthead__home" href="${ctx.href('/')}">${gif(ctx, '/img/gfx/skull.gif', '', 48, 48, 'masthead__skull')}<span class="masthead__name">${e(site.name)}</span></a>
  <p class="masthead__path" aria-label="You are here"><span>C:\\${e(site.name.replace(/\.COM$/i, ''))}${crumbs ? '\\' + e(crumbs) : ''}&gt;</span><span class="cursor" aria-hidden="true">_</span></p>
</header>`;
}

function nav(ctx, p) {
  const items = ctx.site.nav.map((n) => {
    const current = n.section === p.section;
    return `<li><a class="tab${current ? ' is-current' : ''}" href="${ctx.href(n.path)}"${current ? ' aria-current="page"' : ''}>${icon(ctx, n.icon, 'tab__icon')}<span>${e(n.label)}</span></a></li>`;
  }).join('\n    ');
  return `<nav class="tabs" aria-label="Sections">
  <ul class="tabs__list">
    ${items}
  </ul>
</nav>`;
}

function footer(ctx) {
  const { site } = ctx;
  const buttons = (site.buttons || []).map((b) => {
    const img = b.img.endsWith('.gif') ? gif(ctx, b.img, b.alt, 88, 31, 'btn88', 'loading="lazy"') : `<img class="btn88" src="${ctx.href(b.img)}" alt="${e(b.alt)}" width="88" height="31" loading="lazy">`;
    return b.href ? `<li><a href="${ctx.href(b.href)}">${img}</a></li>` : `<li>${img}</li>`;
  }).join('');
  return `<footer class="footer">
  <div class="fire" aria-hidden="true"></div>
  <ul class="buttons" aria-label="Web buttons">${buttons}</ul>
  <p class="footer__line">© ${ctx.year} ${e(site.author)}</p>
</footer>`;
}

function displayPanel() {
  return `<dialog class="dialog win" id="display-panel" aria-labelledby="display-title">
  <form method="dialog" class="dialog__form">
    <div class="win__bar"><h2 class="win__title" id="display-title">DISPLAY PROPERTIES</h2></div>
    <div class="win__body">
      <fieldset>
        <legend>Screen effects</legend>
        <label class="check"><input type="checkbox" name="crt"> CRT scanlines and glow</label>
      </fieldset>
      <fieldset>
        <legend>Phosphor color</legend>
        <label class="check"><input type="radio" name="phosphor" value="green"> Green</label>
        <label class="check"><input type="radio" name="phosphor" value="amber"> Amber</label>
        <label class="check"><input type="radio" name="phosphor" value="ice"> Ice blue</label>
      </fieldset>
      <fieldset>
        <legend>Motion</legend>
        <label class="check"><input type="radio" name="motion" value="system"> Follow my system setting</label>
        <label class="check"><input type="radio" name="motion" value="reduce"> Keep everything still</label>
        <label class="check"><input type="radio" name="motion" value="full"> Let it all move</label>
      </fieldset>
      <fieldset class="secret-row">
        <legend>Hidden</legend>
        <label class="check"><input type="checkbox" name="mode1999" disabled> <span data-1999-label>1999 MODE [LOCKED: try the Konami code]</span></label>
      </fieldset>
      <p class="dialog__note">Saved in this browser only.</p>
      <div class="dialog__actions"><button class="btn" value="close">CLOSE</button></div>
    </div>
  </form>
</dialog>`;
}

// ---------------------------------------------------------------- HOME
export function homePage(ctx, d) {
  const { site } = ctx;
  const latest = d.posts.slice(0, 3).map((post) => `
      <li class="mini-log">
        <time datetime="${dt(post.ld)}">${isoDay(post.ld)}</time>
        <a href="${ctx.href(post.url)}">${e(post.title)}</a>${post.isNew ? ` ${gif(ctx, '/img/gfx/new.gif', 'new', 27, 11, 'new-gif')}` : ''}${sampleBadge(post.sample)}
        <p>${e(post.excerpt)}</p>
      </li>`).join('') || '<li class="empty">No log entries yet. Add one in content/posts/.</li>';

  const photos = d.albums.flatMap((a) => a.photos.map((ph) => ({ ...ph, album: a }))).slice(0, 3);
  const photoThumbs = photos.map((ph) => `<li><a href="${ctx.href(ph.album.url)}#${e(ph.id)}"><img src="${ctx.href(ph.thumb || ph.url)}" alt="${e(ph.alt)}" loading="lazy" decoding="async"${ph.width ? ` width="${ph.width}" height="${ph.height}"` : ''}></a></li>`).join('');

  const cabinets = d.games.filter((g) => g.type !== 'placeholder').slice(0, 3).map((g) => `
      <li><a class="mini-cab" href="${ctx.href(g.url)}">${gif(ctx, g.thumb, '', 160, 120, 'mini-cab__img', 'loading="lazy"')}<span>${e(g.title)}</span></a></li>`).join('');

  const status = site.status.map((s) => `<li><span class="led led--${e(s.led || 'green')}${s.blink ? ' blink' : ''}" aria-hidden="true"></span><span class="status__k">${e(s.label)}</span><span class="status__v">${e(s.value)}</span></li>`).join('');

  const dirLinks = site.nav.filter((n) => n.section !== 'home').map((n) => `<li><a href="${ctx.href(n.path)}">${icon(ctx, n.icon)}<span>${e(n.label)}</span></a><span class="dir__blurb">${e(n.blurb || '')}</span></li>`).join('');

  const body = `
<div class="boot" hidden aria-hidden="true"><pre class="boot__text"></pre><p class="boot__skip">press any key to skip</p></div>
<div class="home-grid">
  <div class="col col--main">
    ${win({ ctx, title: 'WELCOME.TXT', iconName: 'file', cls: 'w-welcome', body: `<div class="prose">${d.homeHtml}</div>` })}
  </div>
  <div class="col col--left">
  </div>
  <div class="col col--right">
    <div class="construction">${gif(ctx, '/img/gfx/construction.gif', 'Under construction', 150, 44, 'construction__gif')}</div>
  </div>
</div>`;
  return layout(ctx, { path: '/', section: 'home', body, bodyClass: 'has-boot' });
}

// ---------------------------------------------------------------- ARCADE
function pageHead(title, sub, extra = '') {
  return `<header class="page-head"><h1 class="page-title">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}${extra}</header>`;
}

const TOUCH = { yes: 'TOUCH OK', partial: 'TOUCH: SORT OF', no: 'KEYBOARD ONLY' };

export function arcadePage(ctx, d) {
  const cabs = d.games.filter((g) => g.type !== 'placeholder').map((g) => {
    const screen = gif(ctx, g.thumb, '', 160, 120, 'cabinet__img', 'loading="lazy"');
    return `<li class="cabinet">
      <h2 class="cabinet__marquee"><a href="${ctx.href(g.url)}">${e(g.title)}</a></h2>
      <a class="cabinet__screen" href="${ctx.href(g.url)}" tabindex="-1" aria-hidden="true">${screen}</a>
    </li>`;
  }).join('\n');
  const body = `${pageHead('ARCADE')}
<ul class="cabinets">${cabs}</ul>`;
  return layout(ctx, { path: '/arcade/', section: 'arcade', title: 'Arcade', description: 'Browser games on westonwhat.com.', body, crumbs: ['arcade'] });
}

export function gamePage(ctx, g, d) {
  const [aw, ah] = String(g.aspect || '4:3').split(':').map(Number);
  const src = g.type === 'local' ? ctx.href(g.src) : g.src;
  const sandbox = g.sandbox || (g.type === 'local' ? 'allow-scripts allow-same-origin allow-pointer-lock' : 'allow-scripts allow-same-origin allow-pointer-lock');
  const others = d.games.filter((o) => o !== g && o.type !== 'placeholder').map((o) => `<li><a href="${ctx.href(o.url)}">${e(o.title)}</a></li>`).join('');
  const body = `${pageHead(e(g.title), e(g.description))}
<div class="player">
  <div class="player__bezel" style="--ar:${aw}/${ah};--arn:${(aw / ah).toFixed(4)}">
    <iframe class="player__frame" src="${e(src)}" title="${e(g.title)} game" sandbox="${e(sandbox)}" allow="fullscreen; gamepad; autoplay" referrerpolicy="no-referrer" loading="eager"></iframe>
  </div>
  <div class="player__controls">
    <button class="btn" type="button" data-fullscreen hidden>FULLSCREEN</button>
    <button class="btn" type="button" data-restart hidden>RESTART</button>
    <a class="btn btn--ghost" href="${e(src)}" target="_blank" rel="noopener">OPEN IN NEW TAB</a>
  </div>
  <p class="player__tip">Click the game first so it can hear your keyboard.${g.touch === 'no' ? ' This one needs a keyboard.' : ''}</p>
</div>
<div class="two-up">
  ${win({ ctx, title: 'HOW_TO_PLAY.TXT', iconName: 'file', body: `<dl class="kv"><dt>Controls</dt><dd>${e(g.controls || '')}</dd><dt>Device</dt><dd>${TOUCH[g.touch] || TOUCH.no}</dd>${g.credit ? `<dt>Credit</dt><dd>${e(g.credit)}</dd>` : ''}</dl><div class="prose">${g.html}</div>` })}
  ${others ? win({ ctx, title: 'MORE_GAMES.LNK', iconName: 'joystick', body: `<ul class="plain-list">${others}</ul><p class="more"><a href="${ctx.href('/arcade/')}">Back to the arcade</a></p>` }) : ''}
</div>`;
  return layout(ctx, { path: g.url, section: 'arcade', title: g.title, description: g.description, body, crumbs: ['arcade', g.slug], bodyClass: 'page-game' });
}

// ---------------------------------------------------------------- PHOTOS
export function photosPage(ctx, d) {
  const albums = d.albums.map((a) => {
    const cover = a.cover;
    return `<li class="album">
      <a class="album__link" href="${ctx.href(a.url)}">
        <span class="album__cover">${cover ? `<img src="${ctx.href(cover.thumb || cover.url)}" alt="" loading="lazy" decoding="async"${cover.width ? ` width="${cover.width}" height="${cover.height}"` : ''}>` : ''}</span>
        <span class="album__title">${icon(ctx, 'folder')} ${albumTitle(a)}</span>
      </a>
      <p class="album__meta">${a.photos.length} ${a.photos.length === 1 ? 'photo' : 'photos'}${a.dateRange ? ` :: ${e(a.dateRange)}` : ''}${sampleBadge(a.sample)}</p>
      ${a.description ? `<p class="album__desc">${e(a.description)}</p>` : ''}
    </li>`;
  }).join('\n');
  const body = `${pageHead('PHOTO ARCHIVE')}
${albums ? `<ul class="albums">${albums}</ul>` : '<p class="empty">No albums yet. Make a folder in content/photos/ and drop some images in it.</p>'}`;
  return layout(ctx, { path: '/photos/', section: 'photos', title: 'Photos', description: 'Photo albums on westonwhat.com.', body, crumbs: ['photos'] });
}

export function albumPage(ctx, a) {
  const figs = a.photos.map((ph, i) => `<li class="photo" id="${e(ph.id)}">
      <figure>
        <a class="photo__link" href="${ctx.href(ph.url)}" data-photo="${i}">
          <img src="${ctx.href(ph.thumb || ph.url)}" alt="${e(ph.alt)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"${ph.width ? ` width="${ph.width}" height="${ph.height}"` : ''}>
        </a>
        <figcaption>
          ${ph.caption ? `<span class="photo__caption">${e(ph.caption)}</span>` : ''}
          <span class="photo__meta">${ph.date ? `<time datetime="${e(ph.date.date)}">${e(ph.date.date)}${ph.date.time ? ' ' + e(ph.date.time) : ''}</time>` : ''}</span>
        </figcaption>
      </figure>
    </li>`).join('\n');
  const data = a.photos.map((ph) => ({ src: ctx.href(ph.url), alt: ph.alt, caption: ph.caption, date: ph.date ? `${ph.date.date}${ph.date.time ? ' ' + ph.date.time : ''}` : '', camera: ph.camera, exposure: ph.exposure, size: ph.width ? `${ph.width}×${ph.height}` : '', kb: ph.kb }));
  const body = `${pageHead(albumTitle(a), a.description ? e(a.description) : '', `<p class="page-meta">${a.photos.length} photos${a.dateRange ? ` :: ${e(a.dateRange)}` : ''} :: <a href="${ctx.href('/photos/')}">all albums</a></p>`)}
${a.sample ? `<p class="notice">${icon(ctx, 'warning')} <span><strong>Sample album.</strong> These are generated placeholder images, not photographs. Delete <code>content/photos/${e(a.slug)}/</code> once you've added your own.</span></p>` : ''}
${a.html ? `<div class="prose album-notes">${a.html}</div>` : ''}
<ul class="photo-grid" data-album>${figs}</ul>
<script type="application/json" id="album-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  return layout(ctx, { path: a.url, section: 'photos', title: a.title, description: a.description || `Photo album: ${a.title}`, body, crumbs: ['photos', a.slug], ogImage: a.cover ? a.cover.url : undefined });
}

// ---------------------------------------------------------------- LOGBOOK
function postRow(ctx, post, h = 2) {
  return `<li class="log-row">
      <div class="log-row__meta"><time datetime="${dt(post.ld)}">${fmtDate(post.ld)}</time><span class="log-row__size">${bytes(post.bytes)} bytes</span></div>
      <h${h} class="log-row__title"><a href="${ctx.href(post.url)}">${e(post.title)}</a>${post.isNew ? ` ${gif(ctx, '/img/gfx/new.gif', 'new', 27, 11, 'new-gif')}` : ''}${post.draft ? '<span class="badge">DRAFT</span>' : ''}${sampleBadge(post.sample)}</h${h}>
      <p class="log-row__excerpt">${e(post.excerpt)}</p>
      ${tagList(ctx, post.tags)}
    </li>`;
}

const tagList = (ctx, tags) => (tags.length ? `<ul class="tags" aria-label="Tags">${tags.map((t) => `<li><a href="${ctx.href(`/log/tag/${t}/`)}">#${e(t)}</a></li>`).join('')}</ul>` : '');

function logSidebar(ctx, d) {
  const byYear = {};
  d.posts.forEach((p) => {
    byYear[p.ld.y] ??= {};
    byYear[p.ld.y][p.ld.mo] = (byYear[p.ld.y][p.ld.mo] || 0) + 1;
  });
  const archive = Object.keys(byYear).sort((a, b) => b - a).map((y) => `<li><strong>${y}</strong><ul>${Object.keys(byYear[y]).sort((a, b) => b - a).map((m) => `<li><a href="${ctx.href(`/log/#${y}-${pad(m)}`)}">${monthName(+m)}</a> (${byYear[y][m]})</li>`).join('')}</ul></li>`).join('');
  const tags = Object.entries(d.tags).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([t, ps]) => `<li><a href="${ctx.href(`/log/tag/${t}/`)}">#${e(t)}</a> <span>${ps.length}</span></li>`).join('');
  return `<div class="col col--side">
    ${win({ ctx, title: 'ARCHIVE', iconName: 'folder', body: archive ? `<ul class="archive">${archive}</ul>` : '<p>Nothing archived yet.</p>' })}
    ${tags ? win({ ctx, title: 'TAGS', iconName: 'star', body: `<ul class="tag-cloud">${tags}</ul>` }) : ''}
    ${win({ ctx, title: 'SUBSCRIBE', iconName: 'globe', body: `<p>New entries show up in the <a href="${ctx.href('/feed.xml')}">Atom feed</a>. Paste that link into any feed reader.</p>` })}
  </div>`;
}

export function logPage(ctx, d, tag = null) {
  const posts = tag ? d.tags[tag] : d.posts;
  let rows;
  if (tag) {
    rows = posts.length ? `<ol class="log-list">${posts.map((p) => postRow(ctx, p, 2)).join('\n')}</ol>` : '';
  } else {
    const months = [];
    posts.forEach((p) => {
      const key = `${p.ld.y}-${pad(p.ld.mo)}`;
      if (!months.length || months[months.length - 1].key !== key) months.push({ key, ld: p.ld, posts: [] });
      months[months.length - 1].posts.push(p);
    });
    rows = months.map((m) => `<section class="log-month-group" aria-labelledby="m-${m.key}">
      <h2 class="log-month" id="m-${m.key}"><span id="${m.key}">${monthName(m.ld.mo).toUpperCase()} ${m.ld.y}</span></h2>
      <ol class="log-list">${m.posts.map((p) => postRow(ctx, p, 3)).join('\n')}</ol>
    </section>`).join('\n');
  }
  const total = posts.reduce((s, p) => s + p.bytes, 0);
  const title = tag ? `LOGBOOK: #${e(tag)}` : 'LOGBOOK';
  const body = `<div class="with-side">
  <div class="col col--main">
    <div class="dir-listing" aria-hidden="true">C:\\LOGBOOK&gt; dir${tag ? ` /tag:${e(tag)}` : ''}</div>
    ${rows || '<p class="empty">Nothing here yet.</p>'}
  </div>
</div>`;
  const path = tag ? `/log/tag/${tag}/` : '/log/';
  return layout(ctx, { path, section: 'log', title: tag ? `#${tag}` : 'Logbook', description: tag ? `Logbook entries tagged #${tag}.` : 'The logbook: thoughts, notes and posts.', body, crumbs: tag ? ['logbook', tag] : ['logbook'] });
}

export function postPage(ctx, post, d) {
  const i = d.posts.indexOf(post);
  const newer = d.posts[i - 1];
  const older = d.posts[i + 1];
  const facts = [
    `<div><dt>Posted</dt><dd><time datetime="${dt(post.ld)}">${fmtDate(post.ld)}</time></dd></div>`,
    post.mood ? `<div><dt>Mood</dt><dd>${e(post.mood)}</dd></div>` : '',
    post.music ? `<div><dt>Listening</dt><dd>${e(post.music)}</dd></div>` : '',
    `<div><dt>Size</dt><dd>${bytes(post.bytes)} bytes</dd></div>`,
  ].join('');
  const body = `<article class="entry win" aria-labelledby="entry-title">
  <div class="win__bar">${icon(ctx, 'notebook', 'win__icon')}<span class="win__title" aria-hidden="true">ENTRY_${String(post.number).padStart(3, '0')}.LOG</span></div>
  <div class="win__body">
    <header class="entry__head">
      <h1 class="entry__title" id="entry-title">${e(post.title)}</h1>
      ${post.sample ? `<p class="notice">${icon(ctx, 'warning')} <span><strong>Sample entry.</strong> Placeholder text so you can see the layout. Delete <code>content/posts/${e(post.file)}</code> when you're ready.</span></p>` : ''}
      <dl class="entry__facts">${facts}</dl>
      ${tagList(ctx, post.tags)}
    </header>
    <div class="prose entry__body">${post.html}</div>
  </div>
</article>
<nav class="pager" aria-label="More entries">
  ${older ? `<a class="pager__link" href="${ctx.href(older.url)}" rel="prev"><span>OLDER</span>${e(older.title)}</a>` : '<span></span>'}
  <a class="pager__link pager__index" href="${ctx.href('/log/')}"><span>INDEX</span>All entries</a>
  ${newer ? `<a class="pager__link" href="${ctx.href(newer.url)}" rel="next"><span>NEWER</span>${e(newer.title)}</a>` : '<span></span>'}
</nav>`;
  return layout(ctx, { path: post.url, section: 'log', title: post.title, description: post.excerpt, body, crumbs: ['logbook', post.slug], ogType: 'article', bodyClass: 'page-entry' });
}

// ---------------------------------------------------------------- FILES (downloads)
export function musicPlayer(ctx) {
  const speaker = `<svg class="speaker" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></g></svg>`;
  return `<section class="win musicbar" data-music hidden aria-labelledby="music-title">
  <div class="win__bar">${icon(ctx, 'note', 'win__icon')}<h2 class="win__title" id="music-title">MUSIC.EXE</h2>
    <button class="musicbar__mute" type="button" data-music-toggle data-state="off" aria-label="Play music">${speaker}<span data-music-toggle-label>PLAY</span></button>
  </div>
  <div class="win__body musicbar__body">
    <div class="musicbar__np">
      <p class="musicbar__title" data-music-title>Track 1</p>
      <p class="musicbar__sub" data-music-sub></p>
    </div>
    <div class="musicbar__meters" data-music-meters aria-hidden="true"></div>
    <div class="musicbar__ctl">
      <button class="btn btn--small" type="button" data-music-prev aria-label="Previous track">&#9664;&#9664;</button>
      <button class="btn btn--small" type="button" data-music-next aria-label="Next track">&#9654;&#9654;</button>
      <label class="musicbar__vol"><span>VOL</span><input type="range" min="0" max="100" step="1" value="55" data-music-vol aria-label="Music volume"></label>
    </div>
    <p class="musicbar__status" data-music-status role="status"></p>
  </div>
</section>`;
}

export function profileWindow(ctx, p) {
  const fields = (p.fields || []).map((f) => `<div><dt>${e(f.label)}</dt><dd>${e(f.value)}</dd></div>`).join('');
  return win({ ctx, title: 'PROFILE.EXE', iconName: 'skull', cls: 'profile w-profile', body: `
      <img class="profile__avatar" src="${ctx.href(p.avatar)}" alt="${e(p.avatarAlt)}" width="128" height="128">
      <p class="profile__handle">${e(p.handle || '')}</p>
      ${p.status ? `<p class="profile__status">${e(p.status)}</p>` : ''}
      ${fields ? `<dl class="profile__fields">${fields}</dl>` : ''}` });
}

export function aboutPage(ctx, a) {
  const item = (f) => {
    const facts = [
      f.game ? `<div><dt>Game</dt><dd>${e(f.game)}</dd></div>` : '',
      f.kind ? `<div><dt>Type</dt><dd>${e(f.kind)}</dd></div>` : '',
      f.platform ? `<div><dt>Platform</dt><dd>${e(f.platform)}</dd></div>` : '',
      f.emulator ? `<div><dt>Made with</dt><dd>${e(f.emulator)}</dd></div>` : '',
      f.date ? `<div><dt>Added</dt><dd><time datetime="${e(f.date)}">${e(f.date)}</time></dd></div>` : '',
      `<div><dt>Size</dt><dd>${bytes(f.size)} bytes</dd></div>`,
    ].join('');
    return win({ ctx, id: `file-${f.slug}`, title: e(f.name.toUpperCase()), iconName: 'floppy', cls: 'file-win download', body: `
      <h2 class="download__title">${e(f.title)}</h2>
      <dl class="entry__facts">${facts}</dl>
      ${f.description ? `<p>${e(f.description)}</p>` : ''}
      ${f.html ? `<div class="prose">${f.html}</div>` : ''}
      <p class="download__actions">${f.locked
        ? `<button class="btn" type="button" data-dl="${e(ctx.href(f.url))}" data-name="${e(f.name)}">DOWNLOAD ${e(f.name)}</button>`
        : `<a class="btn" href="${f.external ? e(f.url) : ctx.href(f.url)}" download>DOWNLOAD ${e(f.name)}</a>`}</p>` });
  };
  const lockedFiles = a.downloads.filter((f) => f.locked), openFiles = a.downloads.filter((f) => !f.locked);
  const folder = (name, iconName, inner, open) => `<details class="folder"${open ? ' open' : ''}>
  <summary class="folder__bar">${icon(ctx, iconName, 'win__icon')}<span class="folder__name">${name}</span></summary>
  <div class="folder__body">${inner}</div>
</details>`;
  const form = `<form class="win dl-lock" data-dl-form autocomplete="off">
  <div class="win__bar">${icon(ctx, 'lock', 'win__icon')}<h2 class="win__title">PASSWORD</h2></div>
  <div class="win__body">
    <p><label for="dl-pw">Password </label><input id="dl-pw" class="dl-lock__input" type="password" name="pw" data-dl-pw autocomplete="off"></p>
    <p class="dl-lock__status" data-dl-status role="status"></p>
    <noscript><p>This needs JavaScript to unlock the files.</p></noscript>
  </div>
</form>`;
  // Open downloads are listed first, as plain files. The password-protected save files sit below in a folder.
  const folders = [
    openFiles.length ? `<div class="files-list files-list--open">${openFiles.map(item).join('\n')}</div>` : '',
    lockedFiles.length ? folder('SAVE FILES', 'lock', `${form}<div class="files-list">${lockedFiles.map(item).join('\n')}</div>`, false) : '',
  ].join('\n');
  const body = `${pageHead('FILES')}
${a.intro ? `<div class="prose files-intro">${a.intro}</div>` : ''}
${folders || '<p class="empty">Nothing here yet.</p>'}`;
  return layout(ctx, { path: '/about/', section: 'about', title: 'Files', description: `Downloads from ${ctx.site.author}: save files and more.`, body, crumbs: ['files'] });
}

// ---------------------------------------------------------------- LINKS
export function shopPage(ctx) {
  const body = `${pageHead('SHOP')}
<p class="empty">Nothing here yet.</p>`;
  return layout(ctx, { path: '/shop/', section: 'shop', title: 'Shop', description: 'The shop.', body, crumbs: ['shop'] });
}

export function linksPage(ctx, l) {
  const sections = l.sections.map((s) => win({ ctx, id: s.id, title: e(s.title.toUpperCase()), iconName: s.buttons ? 'star' : 'globe', cls: s.buttons ? 'links-buttons' : 'links-dir', body: `<div class="prose">${s.html}</div>` })).join('\n');
  const body = `${pageHead('LINKS')}
${l.intro ? `<div class="prose links-intro">${l.intro}</div>` : ''}
<div class="links-grid">${sections}</div>`;
  return layout(ctx, { path: '/links/', section: 'links', title: 'Links', description: 'A directory of websites worth visiting.', body, crumbs: ['links'] });
}

// ---------------------------------------------------------------- BASEMENT (secret)
export function basementPage(ctx, b) {
  const body = `${pageHead('THE BASEMENT', 'You found it.')}
${musicPlayer(ctx)}
<div class="two-up">
  ${win({ ctx, title: 'README_FIRST.TXT', iconName: 'lock', cls: 'win--alert', body: `<div class="prose">${b.html}</div>` })}
  ${win({ ctx, title: 'TROPHY.GIF', iconName: 'star', body: `
    <p>Proof you were here. Put it on your own page:</p>
    <p class="linkme__btn">${gif(ctx, '/img/buttons/found-the-basement.gif', 'I found the basement', 88, 31, 'btn88')}</p>
    <label class="sr-only" for="trophy-code">HTML for the trophy button</label>
    <textarea id="trophy-code" class="code-box" readonly rows="3">&lt;a href="${e(ctx.site.url)}"&gt;&lt;img src="${e(ctx.site.url)}/img/buttons/found-the-basement.gif" width="88" height="31" alt="I found the basement at westonwhat.com"&gt;&lt;/a&gt;</textarea>
    <button class="btn btn--small" type="button" data-copy="#trophy-code" hidden>COPY HTML</button>` })}
</div>`;
  return layout(ctx, { path: '/basement/', section: 'basement', title: 'The basement', description: 'The basement.', body, crumbs: ['basement'], noindex: true });
}

// ---------------------------------------------------------------- 404
export function notFoundPage(ctx) {
  const body = `<div class="bsod" data-bsod>
  <h1 class="bsod__title">WESTONWHAT</h1>
  <p>Error 404. The page you asked for was not found. It may have been moved or deleted.</p>
  <ul>
    <li>Press any key, or <a href="${ctx.href('/')}">click here</a>, to return to the MAINFRAME.</li>
    <li>Check the address for typos.</li>
    <li>Or try one of these: <a href="${ctx.href('/arcade/')}">arcade</a>, <a href="${ctx.href('/photos/')}">photos</a>, <a href="${ctx.href('/log/')}">logbook</a>.</li>
  </ul>
  <p class="bsod__press">Press any key to continue <span class="cursor" aria-hidden="true">_</span></p>
</div>`;
  return layout(ctx, { path: '/404.html', section: 'error', title: 'Page not found (404)', description: 'This page does not exist.', body, noindex: true, bodyClass: 'page-404' });
}

// Album titles can flip one letter upside down: set  "flip": "t"  in album.json.
function albumTitle(a) {
  const i = a.flip ? a.title.toLowerCase().indexOf(String(a.flip).toLowerCase()) : -1;
  if (i < 0) return e(a.title);
  return `${e(a.title.slice(0, i))}<span class="flip-letter" aria-hidden="true">${e(a.title[i])}</span><span class="sr-only">${e(a.title[i])}</span>${e(a.title.slice(i + 1))}`;
}
