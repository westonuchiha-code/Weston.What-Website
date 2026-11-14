import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export { escapeHtml as e } from './markdown.mjs';

export const read = (p) => fs.readFileSync(p, 'utf8');
export const exists = (p) => fs.existsSync(p);

export function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

export function copyDir(src, dest, filter = () => true) {
  if (!exists(src)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) n += copyDir(s, d, filter);
    else if (filter(s)) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

export const hashFile = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8);

export const bytes = (n) => n.toLocaleString('en-US');

// ---- dates ---------------------------------------------------------------
// Dates in content are written in your local time zone (site.json "timezone").
export function parseLocalDate(s) {
  if (s instanceof Date) s = s.toISOString().slice(0, 16).replace('T', ' ');
  const m = String(s || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null };
}

function tzOffsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(new Date(utcMs));
  const name = (parts.find((p) => p.type === 'timeZoneName') || {}).value || 'GMT';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + (m[3] ? +m[3] : 0));
}

// Local wall-clock time in `timeZone` -> real instant (Date)
export function localToDate(ld, timeZone) {
  const guess = Date.UTC(ld.y, ld.mo - 1, ld.d, ld.h ?? 12, ld.mi ?? 0);
  let off = tzOffsetMinutes(guess, timeZone);
  let t = guess - off * 60000;
  off = tzOffsetMinutes(t, timeZone);
  t = guess - off * 60000;
  return new Date(t);
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (ld) => `${ld.y}-${pad(ld.mo)}-${pad(ld.d)}`;
export const dayName = (ld) => DAYS[new Date(Date.UTC(ld.y, ld.mo - 1, ld.d)).getUTCDay()];
export const monthName = (mo) => MONTHS[mo - 1];
export const clock = (ld) => (ld.h === null ? '' : `${pad(ld.h)}:${pad(ld.mi)}`);

// "now" as local wall-clock in the site's time zone
export function nowLocal(timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

export const sortKey = (ld) => `${isoDay(ld)} ${ld.h === null ? '00:00' : clock(ld)}`;
