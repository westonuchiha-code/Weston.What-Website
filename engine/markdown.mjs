// A small, dependency-free Markdown renderer.
//
// Supports: # headings, paragraphs, **bold**, *italic*, ~~strike~~, `code`,
// ``` fenced code ```, > quotes, - / 1. lists (nested), --- rules,
// [links](url), ![images](src "title"), <autolinks>, | tables |,
// line breaks (end a line with two spaces or a backslash),
// and raw HTML (anything starting with <tag> is passed straight through,
// so you can drop in a <marquee>, an <iframe>, or a GIF with custom attributes).

export const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const BLOCK_TAGS =
  /^<\/?(address|article|aside|blockquote|center|details|dialog|div|dl|figure|figcaption|footer|form|h[1-6]|header|hr|iframe|marquee|menu|nav|ol|p|picture|pre|section|summary|table|ul|video|audio|canvas|svg|!--)(\s|>|\/|$)/i;

// ---------------------------------------------------------------- inline
export function renderInline(text, opts = {}) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = text;

  // backslash escapes
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!~|<>])/g, (_, c) => keep(escapeHtml(c)));
  // code spans
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _t, code) => keep(`<code>${escapeHtml(code.trim())}</code>`));
  // autolinks
  s = s.replace(/<((?:https?:\/\/|mailto:)[^\s>]+)>/g, (_, url) =>
    keep(`<a href="${escapeHtml(url)}">${escapeHtml(url.replace(/^mailto:/, ''))}</a>`));
  // raw inline html tags and comments
  s = s.replace(/<!--[\s\S]*?-->|<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*?)?\/?>/g, (m) => keep(m));
  // images
  s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (_, alt, src, title) => {
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    const url = opts.resolveUrl ? opts.resolveUrl(src) : src;
    return keep(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${t} loading="lazy" decoding="async">`);
  });
  // links: [text](url "title")  — text may contain an image already stashed
  s = s.replace(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (_, label, href, title) => {
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    const url = opts.resolveUrl ? opts.resolveUrl(href) : href;
    return keep(`<a href="${escapeHtml(url)}"${t}>${renderEmphasis(escapeLoose(label))}</a>`);
  });
  s = renderEmphasis(escapeLoose(s));
  // restore stashed fragments (may be nested)
  for (let i = 0; i < 3; i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[Number(n)]);
  return s;
}

// escape &, <, > but leave stash markers alone
const escapeLoose = (s) => s.replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-f]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderEmphasis(s) {
  return s
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>')
    .replace(/(^|[^\w*])\*(?=\S)([\s\S]*?\S)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
}

// ---------------------------------------------------------------- blocks
const reFence = /^(\s{0,3})(```+|~~~+)\s*([\w+-]*)\s*$/;
const reHeading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const reHr = /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/;
const reList = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const reQuote = /^\s{0,3}>\s?(.*)$/;
const reTableSep = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|') && !l.endsWith('\\|')) l = l.slice(0, -1);
  return l.split(/(?<!\\)\|/).map((c) => c.trim());
}

export function renderMarkdown(src, opts = {}) {
  const offset = opts.headingOffset || 0;
  const minLevel = opts.minLevel || 1;
  const lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return renderBlocks(lines, { ...opts, offset, minLevel }).join('\n');
}

function startsBlock(line, next) {
  return (
    reFence.test(line) || reHeading.test(line) || reHr.test(line) || reQuote.test(line) ||
    reList.test(line) || BLOCK_TAGS.test(line.trim()) || (line.includes('|') && next !== undefined && reTableSep.test(next))
  );
}

function renderBlocks(lines, opts) {
  const out = [];
  let i = 0;
  const inline = (t) => renderInline(t, opts);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // fenced code
    const fence = line.match(reFence);
    if (fence) {
      const marker = fence[2];
      const lang = fence[3];
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) { body.push(lines[i]); i++; }
      i++;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(reHeading);
    if (h) {
      const level = Math.min(6, Math.max(opts.minLevel, h[1].length + opts.offset));
      const html = inline(h[2]);
      out.push(`<h${level} id="${slugify(h[2])}">${html}</h${level}>`);
      i++;
      continue;
    }

    if (reHr.test(line)) { out.push('<hr>'); i++; continue; }

    // raw html block: pass through until a blank line
    if (BLOCK_TAGS.test(line.trim())) {
      const body = [];
      while (i < lines.length && lines[i].trim()) { body.push(lines[i]); i++; }
      out.push(body.join('\n'));
      continue;
    }

    // blockquote
    if (reQuote.test(line)) {
      const body = [];
      while (i < lines.length && lines[i].trim() && (reQuote.test(lines[i]) || !startsBlock(lines[i]))) {
        const m = lines[i].match(reQuote);
        body.push(m ? m[1] : lines[i]);
        i++;
      }
      out.push(`<blockquote>\n${renderBlocks(body, opts).join('\n')}\n</blockquote>`);
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && reTableSep.test(lines[i + 1])) {
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : '');
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) { rows.push(splitRow(lines[i])); i++; }
      const al = (n) => (aligns[n] ? ` style="text-align:${aligns[n]}"` : '');
      out.push(
        `<div class="table-wrap"><table>\n<thead><tr>${head.map((c, n) => `<th${al(n)}>${inline(c)}</th>`).join('')}</tr></thead>\n<tbody>\n` +
        rows.map((r) => `<tr>${head.map((_, n) => `<td${al(n)}>${inline(r[n] || '')}</td>`).join('')}</tr>`).join('\n') +
        '\n</tbody></table></div>');
      continue;
    }

    // list
    const lm = line.match(reList);
    if (lm) {
      const baseIndent = lm[1].length;
      const ordered = /\d/.test(lm[2]);
      const start = ordered ? parseInt(lm[2], 10) : 1;
      const items = [];
      let cur = null;
      let sawBlank = false;
      let loose = false;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) { sawBlank = true; if (cur) cur.push(''); i++; continue; }
        const m = l.match(reList);
        const indent = l.match(/^\s*/)[0].length;
        if (m && m[1].length === baseIndent && /\d/.test(m[2]) === ordered) {
          if (sawBlank && cur) loose = true;
          cur = [m[3]];
          items.push(cur);
          sawBlank = false;
          i++;
          continue;
        }
        if (indent > baseIndent && cur) {
          cur.push(l.slice(Math.min(indent, baseIndent + 2 + (ordered ? 1 : 0))));
          sawBlank = false;
          i++;
          continue;
        }
        if (!sawBlank && cur && !startsBlock(l)) { cur.push(l.trim()); i++; continue; }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
      const lis = items.map((it) => {
        while (it.length && !it[it.length - 1].trim()) it.pop();
        let html = renderBlocks(it, opts).join('\n');
        if (!loose) html = html.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
        return `<li>${html}</li>`;
      });
      out.push(`<${tag}${startAttr}>\n${lis.join('\n')}\n</${tag}>`);
      continue;
    }

    // paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(lines[i], lines[i + 1]))) {
      para.push(lines[i]);
      i++;
    }
    const html = para
      .map((l, n) => {
        const last = n === para.length - 1;
        const br = !last && (/ {2,}$/.test(l) || /\\$/.test(l));
        const text = l.replace(/\\$/, '').trim();
        return inline(text) + (br ? '<br>' : '');
      })
      .join('\n');
    out.push(`<p>${html}</p>`);
  }
  return out;
}

// Plain-text excerpt (first paragraph-ish) for previews and meta descriptions.
export function excerpt(md, max = 200) {
  const html = renderMarkdown(md)
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<h\d[^>]*>[\s\S]*?<\/h\d>/g, ' ')
    .replace(/<table[\s\S]*?<\/table>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = html
    .replace(/<\/(p|li|blockquote)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}
