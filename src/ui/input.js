// Keys, clicks and the buttons along the top.
import { S } from '../core/state.js';
import { log } from '../core/events.js';
import { I, inb, occ, seen, vis, map, BLK, cheb } from '../core/level.js';
import { clamp } from '../core/rng.js';
import { hostile, seesE, chestAt, openChest } from '../core/rules.js';
import { doMoveDir, doBolt, doOrder, doHood, raiseAt, setAutoRaise } from '../core/actions.js';
import { startExplore, startRest, stopIntents } from '../core/clock.js';
import { manual, castKey, setAuto, setAnim, useBelt, BELT, cycleTarget, travelTo } from './control.js';
import { togglePack, closePack, packOpen, lootSrc, closeLoot, lootAll, lootHere, showLoot, setMouse } from './windows.js';
import { showModal, closeModal, helpHTML } from './modals.js';
import { RS, $ } from '../render/rstate.js';
import { cv, screenToTile } from '../render/view.js';

const KEYS = { ArrowUp: [0, -1], KeyW: [0, -1], Numpad8: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], Numpad2: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], Numpad4: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], Numpad6: [1, 0],
  KeyQ: [-1, -1], Numpad7: [-1, -1], KeyE: [1, -1], Numpad9: [1, -1], KeyZ: [-1, 1], Numpad1: [-1, 1], KeyC: [1, 1], Numpad3: [1, 1] };
const SPKEY = { KeyR: 'raise', KeyF: 'bolt', KeyX: 'burst', KeyB: 'breath', KeyM: 'mark', KeyL: 'lantern' };
let lastKey = 0;
const toggleExplore = () => { if (S.intent.explore) S.intent.explore = false; else { if (RS.auto) setAuto(false); startExplore(); } };
const zoomBy = f => { RS.zoom = clamp(RS.zoom * f, .55, 2.4); };

function onKey(ev) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return; const c = ev.code;
  if (RS.modalOpen) { if (c === 'Escape' || c === 'Enter' || c === 'Space') { ev.preventDefault(); const b = $('#folio').querySelector('.primary'); if (c !== 'Escape' && b) b.click(); else if ($('#folio').querySelector('[data-act="close"],[data-act="keep"]')) closeModal(); } return; }
  if (!S.player) return;
  if (c === 'Slash' || ev.key === '?') { showModal(helpHTML(false)); return; }
  if (c === 'KeyI') { togglePack(); return; }
  if (c === 'Comma') { if (!S.gameOver) lootHere(); return; }
  if (lootSrc && (c === 'Space' || c === 'Enter')) { ev.preventDefault(); lootAll(); return; }
  if (c === 'Digit5' || c === 'Digit6' || c === 'Digit7') { useBelt(BELT[+c.slice(5) - 5][0]); return; }
  if (c === 'KeyP') { setAuto(!RS.auto); return; } if (c === 'KeyY') { setAnim(!RS.animFast); return; } if (c === 'KeyV') { RS.showThreat = !RS.showThreat; return; } if (c === 'KeyO') { toggleExplore(); return; }
  if (c === 'Equal' || c === 'NumpadAdd') { zoomBy(1.11); return; } if (c === 'Minus' || c === 'NumpadSubtract') { zoomBy(.9); return; }
  if (c === 'Tab') { ev.preventDefault(); RS.showMarks = !RS.showMarks; return; }
  if (c === 'KeyN') { cycleTarget(); return; }
  if (c === 'KeyG') { if (S.learned.raise) setAutoRaise(!S.autoRaise); return; }
  if (c === 'Escape') { if (lootSrc) { closeLoot(); return; } if (packOpen) { closePack(); return; } stopIntents(); return; }
  const now = performance.now();
  const turnKey = KEYS[c] || SPKEY[c] || c === 'Space' || c === 'Period' || c === 'Numpad5' || /^Digit[1-3]$/.test(c) || c === 'KeyH' || c === 'KeyT';
  if (turnKey) { ev.preventDefault(); if (now - lastKey < 70) return; lastKey = now; }
  if (KEYS[c]) manual(() => doMoveDir(KEYS[c][0], KEYS[c][1]));
  else if (SPKEY[c]) castKey(SPKEY[c]);
  else if (c === 'Space' || c === 'Period' || c === 'Numpad5') manual(() => 100);
  else if (/^Digit[1-3]$/.test(c)) manual(() => doOrder(['defensive', 'aggressive', 'hold'][+c.slice(5) - 1]));
  else if (c === 'KeyH') manual(doHood);
  else if (c === 'KeyT') { if (RS.auto) setAuto(false); startRest(); }
}
function tileAt(ev) { const r = cv.getBoundingClientRect(); return screenToTile(ev.clientX - r.left, ev.clientY - r.top); }
function onClick(ev) {
  if (RS.modalOpen || S.gameOver || !S.player) return; const p = tileAt(ev); if (!inb(p[0], p[1])) return; const pl = S.player;
  const o = occ[I(p[0], p[1])];
  if (o && hostile(pl, o) && seesE(o)) { S.target = o; manual(() => cheb(o, pl) <= 1 ? doMoveDir(Math.sign(o.x - pl.x), Math.sign(o.y - pl.y)) : doBolt(o)); return; }
  const ch = chestAt(p[0], p[1]); if (ch && seen[I(p[0], p[1])]) { if (cheb(ch, pl) <= 1) { manual(() => openChest(ch)); return; } travelTo(ch.x, ch.y, ch); return; }
  const kc = S.corpses.find(k => k.x === p[0] && k.y === p[1] && vis[I(k.x, k.y)] && k.gear && (k.gear.hand || k.gear.body || k.gear.head)); if (kc && cheb(kc, pl) <= 1) { showLoot({ kind: 'corpse', k: kc }); return; }
  if (!seen[I(p[0], p[1])] || BLK[map[I(p[0], p[1])]]) return; travelTo(p[0], p[1]);
}
function onRightClick(ev) { ev.preventDefault(); if (RS.modalOpen || S.gameOver || !S.player) return; const p = tileAt(ev); if (!inb(p[0], p[1])) return; manual(() => raiseAt(p[0], p[1])); }

/* ---------- fullscreen ---------- */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFull() {
  const d = document, el = d.documentElement;
  if (fsEl()) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen; let p = null;
  try { p = req && req.call(el); } catch (e) { p = Promise.reject(e); }
  if (!req || !d.fullscreenEnabled && !d.webkitFullscreenEnabled) p = Promise.reject();
  Promise.resolve(p).catch(() => log('This page is not allowed to go fullscreen here. Open it in its own browser tab, or press F11 to fill the screen with the browser.'));
}

export function initInput(onResize, onStress, onExport) {
  addEventListener('keydown', onKey);
  cv.addEventListener('click', onClick);
  cv.addEventListener('contextmenu', onRightClick);
  cv.addEventListener('mousemove', ev => { const r = cv.getBoundingClientRect(); setMouse([ev.clientX - r.left, ev.clientY - r.top]); });
  cv.addEventListener('mouseleave', () => setMouse(null));
  cv.addEventListener('wheel', ev => { ev.preventDefault(); zoomBy(ev.deltaY > 0 ? .9 : 1.11); }, { passive: false });
  $('#bAuto').onclick = () => setAuto(!RS.auto); $('#bAnim').onclick = () => setAnim(!RS.animFast); $('#bHelp').onclick = () => showModal(helpHTML(false));
  $('#bFull').onclick = toggleFull; $('#bPack').onclick = togglePack; $('#bExplore').onclick = toggleExplore; $('#bStress').onclick = onStress; $('#bSave').onclick = onExport;
  const syncFull = () => { $('#bFull').textContent = fsEl() ? 'Exit fullscreen' : 'Fullscreen'; $('#bFull').classList.toggle('hot', !!fsEl()); setTimeout(onResize, 50); };
  document.addEventListener('fullscreenchange', syncFull); document.addEventListener('webkitfullscreenchange', syncFull);
  addEventListener('resize', onResize);
}
