// Reads image dimensions and a few EXIF fields without any dependencies,
// and can scrub GPS location data out of a JPEG copy (in place, same length,
// orientation and everything else untouched).

export function imageInfo(buf) {
  if (buf.length < 16) return {};
  // PNG
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // WebP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
    }
    return {};
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) return jpegInfo(buf);
  return {};
}

function jpegInfo(buf) {
  const info = {};
  let off = 2;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const marker = buf[off + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) break; // end / start of scan
    const len = buf.readUInt16BE(off + 2);
    const seg = off + 4;
    if (marker === 0xe1 && buf.toString('ascii', seg, seg + 4) === 'Exif') {
      try { Object.assign(info, readExif(buf, seg + 6)); } catch { /* broken EXIF is fine, we just skip it */ }
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      info.height = buf.readUInt16BE(seg + 1);
      info.width = buf.readUInt16BE(seg + 3);
    }
    off = seg + len - 2;
  }
  // phones store rotated photos sideways + an orientation flag; report the displayed size
  if (info.orientation >= 5 && info.orientation <= 8 && info.width) {
    [info.width, info.height] = [info.height, info.width];
  }
  return info;
}

function tiffReader(buf, tiff) {
  const le = buf.toString('ascii', tiff, tiff + 2) === 'II';
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 11: 4, 12: 8 };
  const entries = (ifdOff) => {
    const at = tiff + ifdOff;
    if (at + 2 > buf.length) return [];
    const n = u16(at);
    const list = [];
    for (let k = 0; k < n; k++) {
      const e = at + 2 + k * 12;
      if (e + 12 > buf.length) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      const size = (SIZES[type] || 1) * count;
      const valueAt = size <= 4 ? e + 8 : tiff + u32(e + 8);
      list.push({ tag, type, count, size, valueAt, entryAt: e });
    }
    return list;
  };
  const value = (en) => {
    if (en.valueAt + en.size > buf.length) return undefined;
    if (en.type === 2) return buf.toString('latin1', en.valueAt, en.valueAt + en.count).replace(/\0+$/, '').trim();
    if (en.type === 3) return u16(en.valueAt);
    if (en.type === 4) return u32(en.valueAt);
    if (en.type === 5) { const d = u32(en.valueAt + 4); return d ? u32(en.valueAt) / d : 0; }
    if (en.type === 12) return le ? buf.readDoubleLE(en.valueAt) : buf.readDoubleBE(en.valueAt);
    return undefined;
  };
  return { le, u16, u32, entries, value, first: u32(tiff + 4) };
}

function readExif(buf, tiff) {
  const r = tiffReader(buf, tiff);
  const out = {};
  const ifd0 = r.entries(r.first);
  let exifPtr, gpsPtr;
  for (const en of ifd0) {
    if (en.tag === 0x010f) out.make = r.value(en);
    if (en.tag === 0x0110) out.model = r.value(en);
    if (en.tag === 0x0112) out.orientation = r.value(en);
    if (en.tag === 0x0132) out.dateTime = r.value(en);
    if (en.tag === 0x8769) exifPtr = r.value(en);
    if (en.tag === 0x8825) gpsPtr = r.value(en);
  }
  if (exifPtr) {
    for (const en of r.entries(exifPtr)) {
      if (en.tag === 0x9003) out.dateTimeOriginal = r.value(en);
      if (en.tag === 0x829a) out.exposure = r.value(en);
      if (en.tag === 0x829d) out.fNumber = r.value(en);
      if (en.tag === 0x8827) out.iso = r.value(en);
      if (en.tag === 0x920a) out.focalLength = r.value(en);
      if (en.tag === 0xa434) out.lens = r.value(en);
    }
  }
  if (gpsPtr) out.hasGps = r.entries(gpsPtr).some((en) => en.tag >= 1 && en.tag <= 4 && en.count > 0);
  return out;
}

// Wipes every GPS entry (and the data it points at) inside a JPEG buffer.
// Returns true if anything was removed. The buffer keeps its exact length.
export function stripGps(buf) {
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return false;
  let off = 2;
  let changed = false;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const marker = buf[off + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
    const len = buf.readUInt16BE(off + 2);
    const seg = off + 4;
    if (marker === 0xe1 && buf.toString('ascii', seg, seg + 4) === 'Exif') {
      const tiff = seg + 6;
      const r = tiffReader(buf, tiff);
      const gpsEntry = r.entries(r.first).find((en) => en.tag === 0x8825);
      if (gpsEntry) {
        const gpsOff = r.value(gpsEntry);
        const gps = r.entries(gpsOff);
        for (const en of gps) {
          if (en.size > 4 && en.valueAt + en.size <= buf.length) buf.fill(0, en.valueAt, en.valueAt + en.size);
          buf.fill(0, en.entryAt, en.entryAt + 12);
          changed = true;
        }
        // mark the GPS directory as empty
        const at = tiff + gpsOff;
        if (r.le) buf.writeUInt16LE(0, at); else buf.writeUInt16BE(0, at);
      }
    }
    off = seg + len - 2;
  }
  return changed;
}

// "2026:10:28 23:08:00" -> { date: "2026-10-28", time: "23:08" }
export function exifDate(s) {
  const m = String(s || '').match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})/);
  if (!m || m[1] === '0000') return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

export function exposureLine(info) {
  const parts = [];
  if (info.fNumber) parts.push(`f/${Math.round(info.fNumber * 10) / 10}`);
  if (info.exposure) parts.push(info.exposure >= 1 ? `${Math.round(info.exposure * 10) / 10}s` : `1/${Math.round(1 / info.exposure)}s`);
  if (info.iso) parts.push(`ISO ${info.iso}`);
  if (info.focalLength) parts.push(`${Math.round(info.focalLength)}mm`);
  return parts.join(' / ');
}
