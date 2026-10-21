// Your hand on the game: every command from keys, clicks and buttons goes through here.
import { S } from '../core/state.js';
import { log } from '../core/events.js';
import { dist } from '../core/level.js';
import { GEAR } from '../core/content.js';
import { hostile, seesE, pack, doUse } from '../core/rules.js';
import { SPELLFN } from '../core/actions.js';
import { playerAct, stopIntents, RT, playerReady } from '../core/clock.js';
import { RS, $ } from '../render/rstate.js';

export function setAuto(v) {
  RS.auto = v; if (v) { stopIntents(); if (RS.paused) setPaused(false); }
  const b = $('#bAuto'); b.classList.toggle('on', v); b.innerHTML = `${v ? 'Autoplay on' : 'Autoplay'} <kbd>P</kbd>`;
}
export function setAnim(f) {
  RS.animFast = f; try { localStorage.setItem('necro-anim', f ? '1' : '0'); } catch (e) { /* private mode */ }
  $('#bAnim').innerHTML = `Army: ${f ? 'fast' : 'animate'} <kbd>Y</kbd>`;
}
// a deliberate act of yours: it stops autoplay and anything you had set in motion.
// In real time, an act you ask for before you are ready waits for you (one at a time; the newest wins).
export const RTQ = { fn: null };
export function manual(fn) {
  if (RS.modalOpen || S.gameOver) return false;
  if (RS.auto) { setAuto(false); log('You take control. Press P to hand it back.'); }
  stopIntents();
  if (RT.on && !playerReady()) { RTQ.fn = fn; return true; }
  RTQ.fn = null; return playerAct(fn);
}
// you take over without acting yet (real time: you start walking)
export function takeHand() { if (RS.modalOpen || S.gameOver) return; if (RS.auto) { setAuto(false); log('You take control. Press P to hand it back.'); } stopIntents(); }
export function castKey(k) { if (!S.learned[k]) return; manual(SPELLFN[k]); }
export const BELT = [['bandage', '5'], ['wine', '6'], ['salt', '7']];
export function useBelt(b) { const it = pack().find(k => k.b === b); if (!it) { log(`You have no ${GEAR[b].n}.`); return; } manual(() => doUse(it)); }
export function cycleTarget() {
  const fs = S.ents.filter(e => !e.dead && hostile(S.player, e) && seesE(e)).sort((a, b) => dist(a, S.player) - dist(b, S.player));
  if (!fs.length) { S.target = null; return; } const i = fs.indexOf(S.target); S.target = fs[(i + 1) % fs.length];
}
// walk somewhere over several turns
export function travelTo(x, y, chest) {
  if (RS.auto) { setAuto(false); log('You take control. Press P to hand it back.'); }
  stopIntents(); S.intent.travel = [x, y]; S.intent.travelChest = chest || null;
}

/* ---------- real time ---------- */
// seconds per turn of the world at each speed: a creature of ordinary speed acts once a turn
export const SPEEDS = [.6, .45, .32, .24, .17], SPEEDNAME = ['very slow', 'slow', 'normal', 'fast', 'very fast'];
export function setMode(on) {
  RT.on = on; RTQ.fn = null; if (!on) setPaused(false);
  try { localStorage.setItem('necro-mode', on ? 'rt' : 'turns'); } catch (e) { /* private mode */ }
  $('#bMode').innerHTML = `${on ? 'Real time' : 'Turns'} <kbd>K</kbd>`; $('#bSpeed').hidden = !on; $('#bAnim').hidden = on;
}
export function setSpeed(i) {
  RS.speed = Math.max(0, Math.min(SPEEDS.length - 1, i)); try { localStorage.setItem('necro-speed', String(RS.speed)); } catch (e) { /* private mode */ }
  $('#bSpeed').innerHTML = `Speed: ${SPEEDNAME[RS.speed]} <kbd>[ ]</kbd>`;
}
export function setPaused(p, why) { RS.paused = p; RS.pauseWhy = p ? why || '' : ''; const el = $('#pause'); el.hidden = !p; if (p) el.innerHTML = `<b>Paused</b>${why ? ` · ${why}` : ''} <kbd>Space</kbd>`; }
