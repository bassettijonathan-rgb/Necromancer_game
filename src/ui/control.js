// Your hand on the game: every command from keys, clicks and buttons goes through here.
import { S } from '../core/state.js';
import { log } from '../core/events.js';
import { dist } from '../core/level.js';
import { GEAR } from '../core/content.js';
import { hostile, seesE, pack, doUse } from '../core/rules.js';
import { SPELLFN } from '../core/actions.js';
import { playerAct, stopIntents } from '../core/clock.js';
import { RS, $ } from '../render/rstate.js';

export function setAuto(v) {
  RS.auto = v; if (v) stopIntents();
  const b = $('#bAuto'); b.classList.toggle('on', v); b.innerHTML = `${v ? 'Autoplay on' : 'Autoplay'} <kbd>P</kbd>`;
}
export function setAnim(f) {
  RS.animFast = f; try { localStorage.setItem('necro-anim', f ? '1' : '0'); } catch (e) { /* private mode */ }
  $('#bAnim').innerHTML = `Army: ${f ? 'fast' : 'animate'} <kbd>Y</kbd>`;
}
// a deliberate act of yours: it stops autoplay and anything you had set in motion
export function manual(fn) {
  if (RS.modalOpen || S.gameOver) return false;
  if (RS.auto) { setAuto(false); log('You take control. Press P to hand it back.'); }
  stopIntents(); return playerAct(fn);
}
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
