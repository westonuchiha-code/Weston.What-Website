#!/usr/bin/env node
// westonwhat.com site builder. Zero dependencies: needs only Node 18+.
//
//   node engine/build.mjs              build the site into dist/
//   node engine/build.mjs --drafts     also include posts marked draft: true
//   node engine/build.mjs --portable   relative links, so dist/index.html opens by double-click
//
// It reads everything in content/, copies public/ as-is, and writes plain HTML.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';
import { renderMarkdown, excerpt, slugify } from './markdown.mjs';
import { imageInfo, stripGps, exifDate, exposureLine } from './images.mjs';
import * as T from './templates.mjs';
import crypto from 'node:crypto';
import { read, exists, writeFile, copyDir, hashFile, parseLocalDate, localToDate, nowLocal, sortKey, isoDay } from './util.mjs';

// File format: "WWE1" + salt(16) + iv(12) + AES-256-GCM ciphertext + tag(16). Key = PBKDF2-SHA256(password, salt, 200000).
function encryptFile(buf, password, name) {
  // Salt and IV are derived (not random) so rebuilding gives byte-identical files and nothing is re-uploaded for no reason.
  const salt = crypto.createHmac('sha256', password).update('salt|' + name).digest().subarray(0, 16);
  const key = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const iv = crypto.createHmac('sha256', key).update(buf).digest().subarray(0, 12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]);
  return Buffer.concat([Buffer.from('WWE1'), salt, iv, ct]);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const args = process.argv.slice(2);
const DRAFTS = args.includes('--drafts');
const PORTABLE = args.includes('--portable');
const outArg = args.find((a) => a.startsWith('--out='));
const DIST = outArg ? path.resolve(outArg.slice(6)) : path.join(ROOT, 'dist');

const warnings = [];
const warn = (m) => warnings.push(m);
const fail = (m) => { console.error(`\n✖ BUILD STOPPED: ${m}\n`); process.exit(1); };
const rel = (p) => path.relative(ROOT, p);
const listMd = (dir) => (exists(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.startsWith('.')).sort() : []);
const readMd = (file) => {
  try { return parseFrontmatter(read(file), rel(file)); } catch (err) { fail(err.message); }
};
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

export function build() {
  const t0 = Date.now();
  // ------------------------------------------------------------ site config
  let site;
  try { site = JSON.parse(read(path.join(CONTENT, 'site.json'))); } catch (err) {
    fail(`content/site.json is not valid JSON (${err.message}). Check for a missing comma or quote.`);
  }
  site.timezone ||= 'UTC';
  site.photos ||= {};
  const now = nowLocal(site.timezone);
  const logo = exists(path.join(CONTENT, 'logo.txt')) ? read(path.join(CONTENT, 'logo.txt')).replace(/\s+$/, '') : site.name;

  // ------------------------------------------------------------ output dir
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(PUBLIC, DIST);

  // ------------------------------------------------------------ posts
  const postDir = path.join(CONTENT, 'posts');
  let posts = listMd(postDir).map((file) => {
    const { data, body } = readMd(path.join(postDir, file));
    const m = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
    const ld = parseLocalDate(data.date || (m && m[1]));
    if (!ld) fail(`content/posts/${file} has no date. Add  date: 2026-10-28  to its front matter, or start the file name with a date.`);
    if (!data.title) fail(`content/posts/${file} has no title. Add  title: Something  to its front matter.`);
    const slug = slugify(data.slug || (m ? m[2] : file.replace(/\.md$/, '')));
    const tags = (Array.isArray(data.tags) ? data.tags : data.tags ? String(data.tags).split(',') : []).map((t) => slugify(t)).filter(Boolean);
    const instant = localToDate(ld, site.timezone);
    return {
      file, slug, ld, instant, body, tags, title: String(data.title), draft: data.draft === true, sample: data.sample === true,
      mood: data.mood, music: data.music, url: `/log/${slug}/`, bytes: Buffer.byteLength(body, 'utf8'),
      excerpt: data.summary || excerpt(body, 180),
      isNew: (Date.now() - instant.getTime()) < 14 * 864e5 && instant.getTime() <= Date.now() + 864e5,
    };
  });
  posts = posts.filter((p) => DRAFTS || !p.draft);
  posts.sort((a, b) => sortKey(b.ld).localeCompare(sortKey(a.ld)) || a.title.localeCompare(b.title));
  posts.forEach((p, i) => { p.number = posts.length - i; });
  const slugsSeen = new Set();
  posts.forEach((p) => { if (slugsSeen.has(p.slug)) fail(`Two logbook entries share the address /log/${p.slug}/. Rename one of the files.`); slugsSeen.add(p.slug); });
  const tags = {};
  posts.forEach((p) => p.tags.forEach((t) => { (tags[t] ||= []).push(p); }));

  // ------------------------------------------------------------ games
  const gameDir = path.join(CONTENT, 'games');
  const frameOrigins = new Set();
  const games = listMd(gameDir).map((file) => {
    const { data, body } = readMd(path.join(gameDir, file));
    const slug = slugify(data.slug || file.replace(/\.md$/, ''));
    const src = data.src ? String(data.src).trim() : '';
    let type = data.type || (src.startsWith('/') ? 'local' : /^https:\/\//.test(src) ? 'embed' : 'placeholder');
    if (!src) type = 'placeholder';
    if (type === 'local') {
      const local = path.join(PUBLIC, src.split('?')[0].replace(/\/$/, '/index.html'));
      if (!exists(local)) fail(`content/games/${file}: src is ${src}, but there is no file at public${src.replace(/\/$/, '/index.html')}.`);
    }
    if (type === 'embed') {
      if (!/^https:\/\//.test(src)) fail(`content/games/${file}: embedded games must use an https:// address.`);
      frameOrigins.add(new URL(src).origin);
    }
    if (!data.title) fail(`content/games/${file} has no title.`);
    const thumb = data.thumb || (type === 'placeholder' ? '/img/arcade/empty-slot.gif' : '/img/arcade/empty-slot.gif');
    if (thumb.startsWith('/') && !exists(path.join(PUBLIC, thumb))) warn(`content/games/${file}: thumbnail ${thumb} not found in public/.`);
    return {
      file, slug, type, src, thumb, body, title: String(data.title), description: data.description || '', controls: data.controls || '',
      touch: data.touch === true ? 'yes' : data.touch === false ? 'no' : String(data.touch || 'no').toLowerCase(), credit: data.credit || '', aspect: data.aspect || '4:3', sandbox: data.sandbox,
      order: Number(data.order ?? 999), sample: data.sample === true, url: `/arcade/${slug}/`,
    };
  }).sort((a, b) => (a.type === 'placeholder') - (b.type === 'placeholder') || a.order - b.order || a.title.localeCompare(b.title));

  // ------------------------------------------------------------ photo albums
  const photoRoot = path.join(CONTENT, 'photos');
  const maxMB = Number(site.photos.maxMegabytes || 4);
  const albums = (exists(photoRoot) ? fs.readdirSync(photoRoot, { withFileTypes: true }) : [])
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => {
      const dir = path.join(photoRoot, d.name);
      const slug = slugify(d.name);
      let meta = {};
      if (exists(path.join(dir, 'album.json'))) {
        try { meta = JSON.parse(read(path.join(dir, 'album.json'))); } catch (err) {
          fail(`content/photos/${d.name}/album.json is not valid JSON (${err.message}).`);
        }
      }
      const captions = meta.captions || {};
      const outDir = path.join(DIST, 'photos', slug);
      fs.mkdirSync(outDir, { recursive: true });
      let photos = fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f) && !f.startsWith('.')).map((file) => {
        const full = path.join(dir, file);
        const buf = fs.readFileSync(full);
        const mb = buf.length / 1048576;
        if (mb > 25) fail(`content/photos/${d.name}/${file} is ${mb.toFixed(1)} MB. Cloudflare Pages refuses files over 25 MB. Resize it first.`);
        if (mb > maxMB) warn(`content/photos/${d.name}/${file} is ${mb.toFixed(1)} MB. It will load slowly; ~2000px wide JPEG at quality 80 is usually under 1 MB.`);
        const info = imageInfo(buf);
        if (info.hasGps) {
          if (site.photos.stripLocation !== false) {
            stripGps(buf);
            warn(`content/photos/${d.name}/${file} had GPS location data. It was removed from the published copy (your original is untouched).`);
          } else {
            warn(`content/photos/${d.name}/${file} contains GPS location data and stripLocation is off. Anyone can read where it was taken.`);
          }
        }
        fs.writeFileSync(path.join(outDir, file), buf);
        const thumbSrc = path.join(dir, '_thumbs', file);
        let thumbUrl = '';
        if (exists(thumbSrc)) { fs.mkdirSync(path.join(outDir, 't'), { recursive: true }); fs.copyFileSync(thumbSrc, path.join(outDir, 't', file)); thumbUrl = `/photos/${slug}/t/${encodeURIComponent(file)}`; }
        const cap = captions[file];
        const caption = typeof cap === 'string' ? cap : cap?.caption || '';
        const alt = (typeof cap === 'object' && cap?.alt) || caption || `Photo: ${file.replace(IMAGE_EXT, '').replace(/[-_]+/g, ' ')}`;
        const camera = [info.make, info.model].filter(Boolean).reduce((acc, s) => (acc.toLowerCase().includes(String(s).toLowerCase()) ? acc : `${acc} ${s}`.trim()), '');
        return {
          file, thumb: thumbUrl, id: `p-${slugify(file.replace(IMAGE_EXT, ''))}`, url: `/photos/${slug}/${encodeURIComponent(file)}`,
          width: info.width, height: info.height, caption, alt, camera, exposure: exposureLine(info), kb: Math.round(buf.length / 1024),
          date: exifDate(info.dateTimeOriginal || info.dateTime) || (typeof cap === 'object' && cap?.date ? { date: cap.date, time: '' } : null),
        };
      });
      const sort = meta.sort || 'name';
      if (sort === 'date' || sort === 'date-desc') {
        photos.sort((a, b) => `${a.date?.date || ''}${a.date?.time || ''}`.localeCompare(`${b.date?.date || ''}${b.date?.time || ''}`) || a.file.localeCompare(b.file));
        if (sort === 'date-desc') photos.reverse();
      } else {
        photos.sort((a, b) => a.file.localeCompare(b.file, 'en', { numeric: true }));
      }
      const dates = photos.map((p) => p.date?.date).filter(Boolean).sort();
      const dateRange = dates.length ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`) : meta.date || '';
      const notes = exists(path.join(dir, 'notes.md')) ? readMd(path.join(dir, 'notes.md')).body : '';
      return {
        slug, dir: d.name, title: meta.title || d.name.replace(/[-_]+/g, ' '), description: meta.description || '', flip: meta.flip || '', sample: meta.sample === true,
        order: Number(meta.order ?? 999), photos, dateRange, notes, url: `/photos/${slug}/`, latest: dates[dates.length - 1] || meta.date || '',
        cover: photos.find((p) => p.file === meta.cover) || photos[0],
      };
    })
    .filter((a) => a.photos.length)
    .sort((a, b) => a.sample - b.sample || a.order - b.order || b.latest.localeCompare(a.latest) || a.title.localeCompare(b.title));

  // ------------------------------------------------------------ about / links / home / basement
  const about = readMd(path.join(CONTENT, 'about.md'));
  const links = readMd(path.join(CONTENT, 'links.md'));
  const home = readMd(path.join(CONTENT, 'home.md'));
  const basement = exists(path.join(CONTENT, 'basement.md')) ? readMd(path.join(CONTENT, 'basement.md')) : { data: {}, body: 'You found the basement.' };

  // profile card (shown on the front page). Fields still containing [edit me] are left out.
  const isReal = (v) => v !== undefined && v !== null && String(v).trim() !== '' && !/\[edit/i.test(String(v));
  const profileReserved = new Set(['title', 'handle', 'status', 'avatar', 'avatar_alt']);
  const profile = {
    handle: about.data.handle || 'WESTON',
    status: isReal(about.data.status) ? String(about.data.status) : '',
    avatar: about.data.avatar || '/img/gfx/skull.png',
    avatarAlt: about.data.avatar_alt || 'Profile picture',
    fields: Object.entries(about.data).filter(([k, v]) => !profileReserved.has(k) && isReal(v)).map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), value: Array.isArray(v) ? v.join(', ') : String(v),
    })),
  };

  // ------------------------------------------------------------ downloads (FILES page)
  const dlDir = path.join(CONTENT, 'files');
  const pwFile = path.join(CONTENT, 'download-password.txt');
  const password = exists(pwFile) ? fs.readFileSync(pwFile, 'utf8').trim() : '';
  const downloadOutputs = [];
  const downloads = listMd(dlDir).map((f) => {
    const { data, body } = readMd(path.join(dlDir, f));
    if (!data.title) fail(`content/files/${f} has no title.`);
    const name = String(data.file || '').trim().replace(/^\/?downloads\//, '');
    if (!name || name.includes('/') || name.includes('..')) fail(`content/files/${f}: "file:" must be just a file name, like  my-save.sav  (the file goes in content/downloads/).`);
    const full = path.join(CONTENT, 'downloads', name);
    // Locked files are kept in the repo already encrypted (content/downloads-encrypted/), so the raw
    // save files and the password never have to be published. If the raw file is here, we re-encrypt from it.
    const encCache = path.join(CONTENT, 'downloads-encrypted', name + '.enc');
    const sizeCache = path.join(CONTENT, 'downloads-encrypted', name + '.json');
    let isLocked, out, size;
    if (exists(full)) {
      const raw = fs.readFileSync(full);
      // With a password set, the published copy is encrypted (AES-256-GCM); the page decrypts it in the browser.
      isLocked = !!password && !/^(no|false)$/i.test(String(data.locked ?? ''));
      out = isLocked ? encryptFile(raw, password, name) : raw;
      size = raw.length;
      if (isLocked) {
        fs.mkdirSync(path.dirname(encCache), { recursive: true });
        fs.writeFileSync(encCache, out); fs.writeFileSync(sizeCache, JSON.stringify({ size }));
      }
    } else if (exists(encCache)) {
      isLocked = true; out = fs.readFileSync(encCache);
      size = exists(sizeCache) ? JSON.parse(fs.readFileSync(sizeCache, 'utf8')).size : out.length;
    } else {
      fail(`content/files/${f}: there is no file at content/downloads/${name}. Put the file there first.`);
    }
    if (out.length > 25 * 1024 * 1024) fail(`content/files/${f}: ${name} is over 25 MB, which Cloudflare Pages does not allow.`);
    const file = isLocked ? `/downloads/${name}.enc` : `/downloads/${name}`;
    downloadOutputs.push([file, out]);
    return {
      file: f, slug: slugify(data.slug || f.replace(/\.md$/, '')), title: String(data.title), url: file, name, size, locked: isLocked,
      game: data.game ? String(data.game) : '', kind: data.kind ? String(data.kind) : '', date: data.date ? String(data.date).slice(0, 10) : '',
      group: data.group ? String(data.group) : '', folder: data.folder ? String(data.folder) : '', apart: data.apart ? String(data.apart) : '', label: data.label ? String(data.label) : '', emulator: data.emulator ? String(data.emulator) : '', platform: data.platform ? String(data.platform) : '', description: data.description ? String(data.description) : '', body, order: Number(data.order ?? 999),
    };
  }).sort((a, b) => a.order - b.order || b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    // Entries that share a "group:" become one window with several download buttons (the first one leads).
    .filter((d, i, all) => {
      if (!d.group) return true;
      const lead = all.find((x) => x.group === d.group);
      if (lead === d) { d.more = all.filter((x) => x.group === d.group && x !== d); return true; }
      return false;
    });
  const filesIntro = exists(path.join(CONTENT, 'files.md')) ? readMd(path.join(CONTENT, 'files.md')).body.trim() : '';

  // ------------------------------------------------------------ render helpers
  const hashes = {};
  for (const f of ['/css/style.css', '/js/site.js', '/js/prefs.js', '/js/music.js', '/js/download.js']) hashes[f] = exists(path.join(PUBLIC, f)) ? hashFile(path.join(PUBLIC, f)) : '0';

  const makeCtx = (pagePath) => {
    T.resetIds();
    const href = (target) => {
      if (!PORTABLE || !target.startsWith('/') || target.startsWith('//')) return target;
      const fromDir = pagePath.endsWith('/') ? pagePath : path.posix.dirname(pagePath) + '/';
      let to = target;
      let hash = '';
      const hi = to.indexOf('#');
      if (hi >= 0) { hash = to.slice(hi); to = to.slice(0, hi); }
      if (to.endsWith('/')) to += 'index.html';
      let r = path.posix.relative(fromDir, to) || 'index.html';
      return r + hash;
    };
    const ctx = {
      site, logo, hashes, year: now.y, updated: now, href,
      hasFile: (u) => u.startsWith('/') && exists(path.join(PUBLIC, decodeURIComponent(u.split('?')[0]))),
      md: (src, minLevel = 2) => renderMarkdown(src, { minLevel, resolveUrl: (u) => (u.startsWith('/') ? href(u) : u) }),
      clientData: (p) => ({
        section: p.section,
        name: site.name,
        epoch: site.spiritualEpoch,
        messages: site.messages || [],
        basement: href('/basement/'),
        home: href('/'),
        sections: site.nav.map((n) => ({ label: n.label, path: href(n.path), section: n.section })),
        games: games.filter((g) => g.type !== 'placeholder').map((g) => ({ slug: g.slug, title: g.title, url: href(g.url) })),
        skullIcon: href('/img/icons/skull.png'),
      }),
    };
    return ctx;
  };
  const pages = [];
  const emit = (urlPath, html, { sitemap = true } = {}) => {
    const file = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
    writeFile(path.join(DIST, file), html);
    if (sitemap) pages.push(urlPath);
  };

  // ------------------------------------------------------------ pages
  {
    const ctx = makeCtx('/');
    emit('/', T.homePage(ctx, { posts, games, albums, profile, homeHtml: ctx.md(home.body, 3) }));
  }
  emit('/arcade/', T.arcadePage(makeCtx('/arcade/'), { games }));
  for (const g of games.filter((x) => x.type !== 'placeholder')) {
    const ctx = makeCtx(g.url);
    emit(g.url, T.gamePage(ctx, { ...g, html: ctx.md(g.body, 3) }, { games }));
  }
  emit('/photos/', T.photosPage(makeCtx('/photos/'), { albums }));
  for (const a of albums) {
    const ctx = makeCtx(a.url);
    emit(a.url, T.albumPage(ctx, { ...a, html: a.notes ? ctx.md(a.notes) : '' }));
  }
  emit('/log/', T.logPage(makeCtx('/log/'), { posts, tags }));
  for (const t of Object.keys(tags)) emit(`/log/tag/${t}/`, T.logPage(makeCtx(`/log/tag/${t}/`), { posts, tags }, t));
  for (const p of posts) {
    const ctx = makeCtx(p.url);
    p.html = ctx.md(p.body);
    emit(p.url, T.postPage(ctx, p, { posts }));
  }
  {
    const ctx = makeCtx('/about/');
    emit('/about/', T.aboutPage(ctx, {
      intro: filesIntro ? ctx.md(filesIntro, 3) : '',
      downloads: downloads.map((d) => ({ ...d, html: d.body.trim() ? ctx.md(d.body, 3) : '' })),
    }));
  }
  {
    const ctx = makeCtx('/shop/');
    emit('/shop/', T.shopPage(ctx));
  }
  {
    const ctx = makeCtx('/links/');
    const parts = links.body.split(/^##\s+/m);
    const sections = parts.slice(1).map((chunk) => {
      const nl = chunk.indexOf('\n');
      const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
      const body = nl === -1 ? '' : chunk.slice(nl + 1).trim();
      const buttons = body.length > 0 && body.replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|\s|<!--[\s\S]*?-->/g, '') === '';
      return { title, id: `links-${slugify(title)}`, html: ctx.md(body, 3), buttons };
    });
    emit('/links/', T.linksPage(ctx, { intro: ctx.md(parts[0].trim()), sections }));
  }
  {
    const ctx = makeCtx('/basement/');
    emit('/basement/', T.basementPage(ctx, { html: ctx.md(basement.body, 3) }), { sitemap: false });
  }
  emit('/404.html', T.notFoundPage({ ...makeCtx('/404.html'), href: (u) => u }), { sitemap: false });

  // ------------------------------------------------------------ feed, sitemap, robots, headers, redirects
  const base = site.url.replace(/\/$/, '');
  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const feedPosts = posts.filter((p) => !p.draft).slice(0, 30);
  const absolutize = (html) => html.replace(/(href|src)="\//g, `$1="${base}/`);
  writeFile(path.join(DIST, 'feed.xml'), `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xml(site.title)} logbook</title>
  <subtitle>${xml(site.description)}</subtitle>
  <link href="${base}/feed.xml" rel="self"/>
  <link href="${base}/log/"/>
  <id>${base}/</id>
  <updated>${(feedPosts[0]?.instant || new Date()).toISOString()}</updated>
  <author><name>${xml(site.author)}</name></author>
${feedPosts.map((p) => `  <entry>
    <title>${xml(p.title)}</title>
    <link href="${base}${p.url}"/>
    <id>${base}${p.url}</id>
    <updated>${p.instant.toISOString()}</updated>
    <summary>${xml(p.excerpt)}</summary>
    <content type="html">${xml(absolutize(renderMarkdown(p.body, { minLevel: 2 })))}</content>
${p.tags.map((t) => `    <category term="${xml(t)}"/>`).join('\n')}
  </entry>`).join('\n')}
</feed>
`);
  writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}
</urlset>
`);
  writeFile(path.join(DIST, 'robots.txt'), `# hello, robot. be nice.\nUser-agent: *\nDisallow: /basement/\n\nSitemap: ${base}/sitemap.xml\n`);

  const frameSrc = ["'self'", ...frameOrigins].join(' ');
  const csp = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:",
    "font-src 'self'", "media-src 'self' https:", `frame-src ${frameSrc}`, "connect-src 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", 'upgrade-insecure-requests',
  ].join('; ');
  for (const [u, buf] of downloadOutputs) writeFile(path.join(DIST, decodeURIComponent(u)), buf);
  writeFile(path.join(DIST, '_headers'), `# Generated by engine/build.mjs. Edit the build script, not this file.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: ${csp}

# Self-hosted games often use inline scripts. They run sandboxed inside the arcade's iframe,
# so the site-wide policy is lifted for this folder only.
/games/*
  ! Content-Security-Policy

# The hidden Chiptune Pad Studio page is a self-contained app with inline scripts.
/chiptune/*
  ! Content-Security-Policy

# Same for the Garden Together app.
/apps/*
  ! Content-Security-Policy

# Same for the hidden Chip Crusher app.
/chipcrusher/*
  ! Content-Security-Policy

# Save files and other downloads: always save to the device, never open in the browser.
/downloads/*
  Content-Type: application/octet-stream
  Content-Disposition: attachment
`);
  writeFile(path.join(DIST, '_redirects'), `# Friendly aliases. Format: from  to  status
/files      /about/    301
/files/     /about/    301
/blog       /log/      301
/blog/      /log/      301
/logbook    /log/      301
/logbook/   /log/      301
/games      /arcade/   301
/games/     /arcade/   301
/mainframe  /          301
/rss.xml    /feed.xml  301
`);

  // ------------------------------------------------------------ report
  const ms = Date.now() - t0;
  console.log(`\n  ░▒▓ westonwhat build complete ▓▒░  (${ms} ms)`);
  console.log(`  ${posts.length} log entries | ${games.length} arcade slots | ${albums.length} albums, ${albums.reduce((s, a) => s + a.photos.length, 0)} photos | ${pages.length + 2} pages`);
  console.log(`  output: ${rel(DIST) || DIST}${PORTABLE ? '  (portable: open dist/index.html directly)' : ''}${DRAFTS ? '  (drafts included)' : ''}`);
  if (warnings.length) {
    console.log(`\n  ${warnings.length} note(s):`);
    warnings.forEach((w) => console.log(`  ! ${w}`));
  }
  console.log('');
  return { posts, games, albums };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
