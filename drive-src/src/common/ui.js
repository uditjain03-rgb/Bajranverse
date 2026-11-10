// Shared screens and services: saved progress, modal panels, settings, the daily gift, and AdMob (through the app).
import { $ } from './engine.js';
import { Audio } from './audio.js';
import { Music } from './music.js';
export function makePrefs(key, def) {
  let P; try { P = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { P = {}; }
  const out = { ...def, ...P }; for (const k in def) if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) out[k] = { ...def[k], ...(P[k] || {}) };
  out.save = () => { try { const { save, ...rest } = out; localStorage.setItem(key, JSON.stringify(rest)); } catch (e) { /* private mode */ } };
  return out;
}
export function openModal(h) { $('modalBody').innerHTML = h; $('modal').classList.remove('hidden'); $('modalBody').scrollTop = 0; }
export function closeModal() { $('modal').classList.add('hidden'); }
export const modalOpen = () => !$('modal').classList.contains('hidden');
// ---------------- ads (AdMob through the app: rewarded ads the player chooses, and a short ad every few levels) ----------------
export const NATIVE = window.GameNative;
const adCbs = {};
export function onAdDone(f) { window.onAdDone = (tag, ok) => { const c = adCbs[tag]; delete adCbs[tag]; f(); if (c) c(ok); }; }
export const adReady = () => { try { return !!(NATIVE && NATIVE.adReady && NATIVE.adReady()); } catch (e) { return false; } };
export function rewardAd(tag, cb) { if (!adReady()) { cb(false); return; } adCbs[tag] = cb; Music.stop(); NATIVE.showRewarded(tag); }
let sinceAd = 0;
export function betweenLevels(level, next) { sinceAd++; if (NATIVE && NATIVE.showInterstitial && sinceAd >= 3 && level > 3) { sinceAd = 0; adCbs.inter = () => next(); Music.stop(); NATIVE.showInterstitial(); } else next(); }
export const vibrate = (PF, ms) => { if (!PF.set.vib) return; try { if (NATIVE && NATIVE.vibrate) NATIVE.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* none */ } };
// ---------------- settings ----------------
export function settingsPanel(PF, title, credits, onChange, onClose) {
  const t = k => `<button class="toggle ${PF.set[k] ? 'on' : ''}" data-s="${k}"></button>`;
  openModal(`<h2>SETTINGS</h2><div class="list"><div class="item"><div class="ico">🔊</div><div class="txt"><b>Sound</b></div>${t('sound')}</div><div class="item"><div class="ico">🎵</div><div class="txt"><b>Music</b></div>${t('music')}</div><div class="item"><div class="ico">📳</div><div class="txt"><b>Vibration</b></div>${t('vib')}</div><div class="item"><div class="ico">✨</div><div class="txt"><b>Sharp graphics</b><span>Turn off on slower phones</span></div>${t('hi')}</div></div>
    <p class="tip"><b>${title}</b><br>made by <b>BajrangVerse Studios</b><br>${credits}<br>Free to play with optional ads (Google AdMob) · no accounts · your progress stays on your phone</p><div class="row"><button class="btn" id="closeB">BACK</button></div>`);
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s; PF.set[k] = !PF.set[k]; PF.save(); b.classList.toggle('on', PF.set[k]); Audio.sfx('pop'); if (k === 'sound') Audio.setMuted(!PF.set.sound); onChange(k); });
  $('closeB').onclick = () => { Audio.sfx('pop'); closeModal(); onClose && onClose(); };
}
// ---------------- the daily gift ----------------
const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const GIFTS = [30, 50, 80, 100, 150, 200, 400];
export function giftState(PF) { const g = PF.gift || { streak: 0, last: null }, y = new Date(); y.setDate(y.getDate() - 1); if (g.last && g.last !== dayKey() && g.last !== dayKey(y)) g.streak = 0; return { g, can: g.last !== dayKey() }; }
export function giftPanel(PF, coin, onDone) {
  const { g, can } = giftState(PF), day = g.streak % 7;
  openModal(`<h2>DAILY GIFT</h2><p>Come back every day for a bigger gift!</p><div class="days">${GIFTS.map((a, i) => `<div class="day ${i < day || (i === day && !can) ? 'done' : i === day ? 'today' : ''}">DAY ${i + 1}<b>${a}</b>${coin}</div>`).join('')}</div>
    <div class="row"><button class="btn big green" id="claimB" ${can ? '' : 'disabled'}>${can ? 'CLAIM!' : 'COME BACK TOMORROW'}</button></div><div class="row"><button class="btn small" id="closeB">BACK</button></div>`);
  $('claimB').onclick = () => { if (!can) return; PF.coins += GIFTS[day]; PF.gift = { streak: g.streak + 1, last: dayKey() }; PF.save(); Audio.sfx('fanfare'); giftPanel(PF, coin, onDone); onDone(); };
  $('closeB').onclick = () => { Audio.sfx('pop'); closeModal(); onDone(); };
}
