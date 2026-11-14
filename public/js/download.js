/* Unlocks password-protected downloads. The files on the server are AES-256-GCM encrypted;
   they are fetched, decrypted here in the browser with the password, and saved. The password never leaves the page. */
(() => {
  'use strict';
  const pw = document.querySelector('[data-dl-pw]');
  const status = document.querySelector('[data-dl-status]');
  const buttons = document.querySelectorAll('[data-dl]');
  if (!pw || !buttons.length) return;
  const say = (t) => { if (status) status.textContent = t; };
  if (!(window.crypto && crypto.subtle)) { say('This browser cannot unlock files here. Try a newer browser.'); }

  async function unlock(url, password) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('missing');
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 48 || String.fromCharCode(...buf.slice(0, 4)) !== 'WWE1') throw new Error('format');
    const salt = buf.slice(4, 20), iv = buf.slice(20, 32), ct = buf.slice(32);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200000 }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct); // throws if the password is wrong
  }

  buttons.forEach((b) => b.addEventListener('click', async () => {
    const password = pw.value;
    if (!password) { say('Type the password first.'); pw.focus(); return; }
    const label = b.textContent;
    b.disabled = true; b.textContent = 'UNLOCKING...'; say('Unlocking...');
    try {
      const data = await unlock(b.dataset.dl, password);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
      a.download = b.dataset.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      say('Unlocked. Your download should start.');
    } catch (err) {
      say(err && err.message === 'missing' ? 'That file is missing.' : (err && err.message === 'format' ? 'That file is not in the right format.' : 'Wrong password.'));
      pw.select();
    } finally { b.disabled = false; b.textContent = label; }
  }));
  pw.closest('form').addEventListener('submit', (ev) => ev.preventDefault());
})();
