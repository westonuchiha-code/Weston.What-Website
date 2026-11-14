// Tiny front-matter reader. Supports the subset of YAML you'll actually use:
//
//   ---
//   title: My post
//   date: 2026-10-28 23:08
//   tags: [music, late-night]     <- inline list
//   draft: false                  <- true / false become booleans
//   links:                        <- block list
//     - first
//     - second
//   ---
//   Markdown body…

const unquote = (v) => {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
};

function parseValue(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if (v === 'true' || v === 'yes') return true;
  if (v === 'false' || v === 'no') return false;
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => unquote(s)).filter((s) => s !== '');
  }
  return unquote(v);
}

export function parseFrontmatter(text, file = '(unknown file)') {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!src.startsWith('---\n') && src.trim() !== '---') {
    return { data: {}, body: src };
  }
  const end = src.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${file}: front matter starts with --- but never closes. Add a line with just --- after the settings.`);
  }
  const head = src.slice(4, end);
  const afterFence = src.indexOf('\n', end + 1);
  const body = afterFence === -1 ? '' : src.slice(afterFence + 1);
  const data = {};
  let listKey = null;
  head.split('\n').forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const item = line.match(/^\s+-\s+(.*)$/) || (listKey && line.match(/^-\s+(.*)$/));
    if (item && listKey) {
      if (!Array.isArray(data[listKey])) data[listKey] = [];
      data[listKey].push(unquote(item[1]));
      return;
    }
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s?(.*)$/);
    if (!m) {
      throw new Error(`${file}: can't read front-matter line ${i + 2}: "${line}". Use the form  key: value`);
    }
    const [, key, value] = m;
    data[key] = parseValue(value);
    listKey = value.trim() === '' ? key : null;
  });
  return { data, body };
}
