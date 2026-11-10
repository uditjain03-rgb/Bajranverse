// Cartoon portraits for the HUD: a face drawn on a canvas, with live expressions (blinking, talking, laughing,
// angry, scared, sad, sleepy). look: { skin, hair, style: short|long|buns|bald|turban|cap|helmet, beard, tache,
// glasses, bindi, hat (colour), helmet (colour) }
const hx = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
function shade(hex, k) { const n = typeof hex === 'number' ? hex : parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [16, 8, 0].map(s => f((n >> s) & 255).toString(16).padStart(2, '0')).join(''); }
export function drawFace(cv, look, expr = 'happy', t = 0, talk = false) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, s = W / 100; c.clearRect(0, 0, W, H); c.save(); c.scale(s, s);
  const skin = hx(look.skin ?? 0xc68642), hair = hx(look.hair ?? 0x1a1210), ink = '#2a1608';
  const blink = expr !== 'sleep' && (t % 3.2) < 0.12, mouthOpen = talk ? Math.abs(Math.sin(t * 14)) : 0;
  // hair behind
  c.fillStyle = hair; if (look.style === 'long') { c.beginPath(); c.ellipse(50, 56, 34, 38, 0, 0, Math.PI * 2); c.fill(); }
  if (look.style === 'buns') { for (const x of [24, 76]) { c.beginPath(); c.arc(x, 26, 11, 0, 7); c.fill(); } }
  // ears, head
  c.fillStyle = shade(skin, 0.92); for (const x of [17, 83]) { c.beginPath(); c.ellipse(x, 56, 7, 9, 0, 0, 7); c.fill(); }
  c.fillStyle = skin; c.beginPath(); c.ellipse(50, 55, 33, 37, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = shade(skin, 0.7); c.lineWidth = 2; c.stroke();
  // cheeks
  c.fillStyle = 'rgba(255,90,90,.22)'; for (const x of [30, 70]) { c.beginPath(); c.ellipse(x, 67, 7, 4.5, 0, 0, 7); c.fill(); }
  // hair on top
  c.fillStyle = hair;
  if (look.style !== 'bald' && look.style !== 'turban' && look.style !== 'helmet') { c.beginPath(); c.ellipse(50, 30, 34, 18, 0, Math.PI, 0); c.fill(); c.beginPath(); c.moveTo(18, 34); c.quadraticCurveTo(40, 40, 60, 26); c.quadraticCurveTo(76, 32, 83, 38); c.lineTo(84, 26); c.lineTo(17, 26); c.fill(); }
  if (look.style === 'long') { for (const x of [17, 83]) { c.beginPath(); c.ellipse(x, 60, 6, 24, 0, 0, 7); c.fill(); } }
  // headwear
  if (look.style === 'turban') { const tc = hx(look.hat ?? 0xd83a2a); for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? shade(tc, 0.85) : tc; c.beginPath(); c.ellipse(50, 26 - i * 6, 36 - i * 5, 9, (i % 2 ? 1 : -1) * 0.08, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f2c14e'; c.fillRect(16, 27, 68, 3); c.fillStyle = '#ff3a5a'; c.beginPath(); c.arc(50, 18, 4, 0, 7); c.fill(); }
  if (look.style === 'cap') { const cc = hx(look.hat ?? 0x2a5ad8); c.fillStyle = cc; c.beginPath(); c.ellipse(50, 28, 34, 17, 0, Math.PI, 0); c.fill(); c.fillStyle = shade(cc, 0.8); c.beginPath(); c.ellipse(50, 30, 40, 6, 0, 0, Math.PI); c.fill(); }
  if (look.style === 'helmet') { const hc = hx(look.helmet ?? 0xe8402a); c.fillStyle = hc; c.beginPath(); c.ellipse(50, 40, 40, 34, 0, Math.PI * 1.02, -0.02); c.lineTo(90, 52); c.lineTo(10, 52); c.fill(); c.fillStyle = '#fff'; c.fillRect(46, 7, 8, 30); c.fillStyle = '#2a2a30'; c.fillRect(12, 31, 76, 6); for (const x of [36, 64]) { c.fillStyle = '#3a3a40'; c.beginPath(); c.arc(x, 33, 8, 0, 7); c.fill(); c.fillStyle = '#7ad8ff'; c.beginPath(); c.arc(x, 33, 5.5, 0, 7); c.fill(); } }
  if (look.hatTop) { c.fillStyle = '#1c1c1c'; c.fillRect(30, 2, 40, 22); c.fillRect(20, 22, 60, 6); }
  // eyebrows
  const by = expr === 'laugh' || expr === 'scared' ? 37 : expr === 'calm' || expr === 'sleep' ? 42 : 40;
  c.strokeStyle = shade(look.hair ?? 0x1a1210, 0.9); c.lineWidth = 3.4; c.lineCap = 'round';
  for (const sd of [-1, 1]) { const x = 50 + sd * 14; let a = 0; if (expr === 'angry') a = sd * 0.45; if (expr === 'scared' || expr === 'sad') a = -sd * 0.35; c.beginPath(); c.moveTo(x - 7 * Math.cos(a), by + sd * 7 * Math.sin(a) * -1); c.lineTo(x + 7 * Math.cos(a), by - sd * 7 * Math.sin(a) * -1 * -1); c.stroke(); }
  // eyes
  for (const sd of [-1, 1]) { const x = 50 + sd * 14, y = 50;
    if (blink || expr === 'sleep' || expr === 'laugh') { c.strokeStyle = ink; c.lineWidth = 2.6; c.beginPath(); if (expr === 'laugh') { c.arc(x, y + 2, 5, Math.PI * 1.15, Math.PI * 1.85); } else { c.moveTo(x - 5, y); c.quadraticCurveTo(x, y + 3, x + 5, y); } c.stroke(); continue; }
    const big = expr === 'scared' ? 1.25 : 1; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, 6.5 * big, 7.5 * big, 0, 0, 7); c.fill(); c.strokeStyle = shade(skin, 0.6); c.lineWidth = 1; c.stroke();
    c.fillStyle = '#3a2410'; c.beginPath(); c.arc(x + (expr === 'angry' ? 0 : 1), y + 1, 3.6, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 2, y - 1, 1.3, 0, 7); c.fill(); }
  if (look.glasses) { c.strokeStyle = '#1a1a1a'; c.lineWidth = 2.2; for (const sd of [-1, 1]) { c.beginPath(); c.arc(50 + sd * 14, 50, 10, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(46, 49); c.lineTo(54, 49); c.stroke(); }
  // nose
  c.strokeStyle = shade(skin, 0.6); c.lineWidth = 2; c.beginPath(); c.moveTo(50, 56); c.quadraticCurveTo(46, 64, 51, 65); c.stroke();
  if (look.bindi) { c.fillStyle = '#d8102a'; c.beginPath(); c.arc(50, 33, 2.2, 0, 7); c.fill(); }
  if (look.beard) { c.fillStyle = hair; c.beginPath(); c.moveTo(22, 64); c.quadraticCurveTo(50, 102, 78, 64); c.quadraticCurveTo(50, 86, 22, 64); c.fill(); }
  // mouth
  c.fillStyle = '#5a1418'; c.strokeStyle = '#5a1418'; c.lineWidth = 3;
  const my = 76;
  if (expr === 'laugh' || expr === 'scared' || mouthOpen > 0.3) { const ow = expr === 'scared' ? 7 : 11, oh = expr === 'scared' ? 9 : 7 + mouthOpen * 4; c.beginPath(); if (expr === 'laugh') { c.moveTo(50 - ow, my - 2); c.quadraticCurveTo(50, my + oh * 2, 50 + ow, my - 2); c.closePath(); } else c.ellipse(50, my, ow, oh, 0, 0, 7); c.fill(); c.fillStyle = '#e86a7a'; c.beginPath(); c.ellipse(50, my + oh * 0.45, ow * 0.55, oh * 0.35, 0, 0, 7); c.fill(); }
  else if (expr === 'angry' || expr === 'sad') { c.beginPath(); c.moveTo(39, my + 4); c.quadraticCurveTo(50, my - 5, 61, my + 4); c.stroke(); }
  else if (expr === 'sleep' || expr === 'calm') { c.beginPath(); c.moveTo(43, my); c.lineTo(57, my); c.stroke(); }
  else { c.beginPath(); c.moveTo(37, my - 3); c.quadraticCurveTo(50, my + 9, 63, my - 3); c.stroke(); }
  if (look.tache) { c.fillStyle = hair; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(50 + sd * 8, 70, 9, 3.6, sd * 0.25, 0, 7); c.fill(); } }
  // extras: anger mark, sweat, tears, Zzz
  if (expr === 'angry') { c.strokeStyle = '#e8202a'; c.lineWidth = 2.5; const x = 78, y = 20; for (const [a, b] of [[[-4, -1], [-1, -1]], [[1, -1], [4, -1]], [[-4, 1], [-1, 1]], [[1, 1], [4, 1]]]) { c.beginPath(); c.moveTo(x + a[0] * 1.5, y + a[1] * 4); c.lineTo(x + b[0] * 1.5, y + b[1] * 1.5); c.stroke(); } }
  if (expr === 'scared') { c.fillStyle = '#7ad0ff'; c.beginPath(); c.moveTo(80, 30); c.quadraticCurveTo(86, 42, 80, 44); c.quadraticCurveTo(74, 42, 80, 30); c.fill(); }
  if (expr === 'sad') { c.fillStyle = '#7ad0ff'; const ty = 58 + (t * 30) % 20; for (const x of [34, 66]) { c.beginPath(); c.ellipse(x, ty, 2.5, 4, 0, 0, 7); c.fill(); } }
  if (expr === 'sleep') { c.fillStyle = '#3a6ad8'; c.font = 'bold 14px Fredoka, sans-serif'; c.fillText('z', 80, 22 - (t * 6) % 6); c.font = 'bold 10px Fredoka, sans-serif'; c.fillText('z', 89, 13 - (t * 6) % 6); }
  c.restore();
}
