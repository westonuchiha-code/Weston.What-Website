#!/usr/bin/env node
// Local preview server with auto-rebuild and live reload. Zero dependencies.
//
//   npm run dev        ->  http://localhost:8080  (rebuilds when you save a file)
//
// Only for your own computer. Cloudflare serves the real site.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8080);
const extraArgs = process.argv.slice(2).filter((a) => a.startsWith('--'));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm',
};
const clients = new Set();

function rebuild() {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'engine', 'build.mjs'), ...extraArgs], { stdio: 'inherit' });
  if (r.status === 0) for (const res of clients) res.write('data: reload\n\n');
}

const RELOAD = '<script src="/__reload.js"></script>';

// Apply dist/_headers the way Cloudflare Pages does, so the preview behaves like the live site
// (including the Content-Security-Policy).
function headerRules() {
  const file = path.join(DIST, '_headers');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  let cur = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const re = new RegExp('^' + raw.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      cur = { re, set: [], drop: [] };
      rules.push(cur);
    } else if (cur) {
      const line = raw.trim();
      if (line.startsWith('!')) cur.drop.push(line.slice(1).trim().toLowerCase());
      else { const i = line.indexOf(':'); cur.set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
    }
  }
  return rules;
}
function headersFor(urlPath) {
  const out = {};
  for (const r of headerRules()) {
    if (!r.re.test(urlPath)) continue;
    for (const name of r.drop) delete out[name];
    for (const [k, v] of r.set) out[k.toLowerCase()] = out[k.toLowerCase()] ? `${out[k.toLowerCase()]}, ${v}` : v;
  }
  return out;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__reload.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end("new EventSource('/__reload').onmessage = () => location.reload();");
    return;
  }
  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  let p = decodeURIComponent(url.pathname);
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); res.end(); return; }
    file = path.join(file, 'index.html');
  }
  let status = 200;
  if (!fs.existsSync(file)) { status = 404; file = path.join(DIST, '404.html'); }
  const ext = path.extname(file).toLowerCase();
  let body = fs.readFileSync(file);
  if (ext === '.html') body = body.toString().replace('</body>', `${RELOAD}</body>`);
  const csp = headersFor(p);
  if (csp['content-security-policy']) csp['content-security-policy'] = csp['content-security-policy'].replace('upgrade-insecure-requests', '');
  res.writeHead(status, { ...csp, 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
}).listen(PORT, () => {
  console.log(`\n  ▶ preview running at http://localhost:${PORT}  (Ctrl+C to stop)\n`);
});

rebuild();

// Poll for changes once a second. Simpler and more reliable than fs.watch across
// macOS, Windows and Linux, and plenty fast for a personal site.
function signature(dir) {
  let sig = '';
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { const st = fs.statSync(p); sig += `${p}:${st.mtimeMs}:${st.size};`; }
    }
  };
  try { walk(dir); } catch { /* folder vanished mid-scan; next poll catches up */ }
  return sig;
}
const dirs = ['content', 'public', 'engine'].map((d) => path.join(ROOT, d));
let last = dirs.map(signature).join('|');
setInterval(() => {
  const now = dirs.map(signature).join('|');
  if (now !== last) { last = now; rebuild(); }
}, 1000);
