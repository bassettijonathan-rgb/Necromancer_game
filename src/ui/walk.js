// Real time: you walk freely instead of hopping tile to tile, and everything else glides between its steps.
// Your body has a place of its own between tiles (px, py: tile units, tile centres at .5); the rules still
// see the tile under its centre, and you change tiles as you cross into them.
import { S } from '../core/state.js';
import { I, inb, occ, canWalk, map, GRAVE, SEAL, WATER } from '../core/level.js';
import { clamp } from '../core/rng.js';
import { hostile, isMinion, effSpeed, chestAt, swapPos, moveTo } from '../core/rules.js';
import { doMoveDir } from '../core/actions.js';
import { playerAct, playerShift, playerReady } from '../core/clock.js';
import { heldDir } from './input.js';

const R = .28; // the radius of your body, in tiles
export function placeWalker() { const pl = S.player; if (!pl) return; pl.px = pl.x + .5; pl.py = pl.y + .5; pl.rx = pl.x; pl.ry = pl.y; pl.settle = false; }

// what stops your body moving to (cx, cy): walls at its edge (only when it would press further in), creatures and chests at its centre
const gap2 = (cx, cy, tx, ty) => (cx - clamp(cx, tx, tx + 1)) ** 2 + (cy - clamp(cy, ty, ty + 1)) ** 2;
function blocked(cx, cy) {
  const pl = S.player;
  for (let ty = Math.floor(cy - R); ty <= Math.floor(cy + R); ty++) for (let tx = Math.floor(cx - R); tx <= Math.floor(cx + R); tx++) {
    if (canWalk(tx, ty)) continue;
    const g = gap2(cx, cy, tx, ty); if (g < R * R && g < gap2(pl.px, pl.py, tx, ty) - 1e-9) return { x: tx, y: ty, wall: true };
  }
  const tx = Math.floor(cx), ty = Math.floor(cy); if (tx === pl.x && ty === pl.y) return null;
  if (!inb(tx, ty)) return { x: tx, y: ty, wall: true };
  const o = occ[I(tx, ty)]; if (o && o !== pl && !isMinion(o)) return { x: tx, y: ty, o };
  return null;
}
// walking into something: strike a foe while you are ready, open a chest, or learn what a grave is (once per bump)
let lastBump = '';
function bumpInto(b) {
  const pl = S.player, dx = b.x - pl.x, dy = b.y - pl.y; if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) return;
  const key = b.x + ',' + b.y;
  if (b.o) { if (hostile(pl, b.o) && playerReady()) playerAct(() => doMoveDir(dx, dy)); return; }
  if (key === lastBump) return;
  const t = map[I(b.x, b.y)];
  if (chestAt(b.x, b.y)) { if (!playerReady()) return; playerAct(() => doMoveDir(dx, dy)); }
  else if ((t === GRAVE && !S.flags.graveHint) || (t === SEAL && !S.flags.sealTouched)) doMoveDir(dx, dy);
  lastBump = key;
}
// one frame of walking; turnSec is how long a turn of the world lasts right now
export function walk(dt, turnSec, still) {
  const pl = S.player; if (pl.px === undefined) placeWalker();
  const d = still ? null : heldDir();
  // a tile per turn at your speed, slower in water, and slower still while you recover from an act
  let v = effSpeed(pl) / 100 / turnSec; if (map[I(pl.x, pl.y)] === WATER) v /= 1.5;
  // the rules moved you (a walk you set in motion, autoplay, a swap): glide there, to the centre of the tile,
  // or just inside it when you take over with the keys
  if (Math.floor(pl.px) !== pl.x || Math.floor(pl.py) !== pl.y) pl.settle = true;
  if (pl.settle) {
    const gx = d ? clamp(pl.px, pl.x + R, pl.x + 1 - R) : pl.x + .5, gy = d ? clamp(pl.py, pl.y + R, pl.y + 1 - R) : pl.y + .5;
    const ex = gx - pl.px, ey = gy - pl.py, e = Math.hypot(ex, ey);
    if (e > 3) { pl.px = gx; pl.py = gy; } else if (e > 1e-4) { const s = Math.min(1, v * 1.15 * Math.max(1, e) * dt / e); pl.px += ex * s; pl.py += ey * s; }
    if (Math.hypot(gx - pl.px, gy - pl.py) < 1e-3) pl.settle = false;
    if (pl.settle || !d) { lastBump = ''; sync(pl); return; }
  }
  if (!d) { lastBump = ''; sync(pl); return; }
  if (!playerReady()) v *= .45;
  const n = Math.hypot(d[0], d[1]), vx = d[0] / n, vy = d[1] / n, step = v * dt;
  if (d[0]) pl.face = d[0];
  let bump = null;
  // each axis on its own, so you slide along walls; when a corner catches you, you are eased toward the middle of your row or column
  if (vx) { const b = blocked(pl.px + vx * step, pl.py); if (!b) pl.px += vx * step; else { bump = b; if (!vy) pl.py += clamp(pl.y + .5 - pl.py, -step, step); } }
  if (vy) { const b = blocked(pl.px, pl.py + vy * step); if (!b) pl.py += vy * step; else { bump = bump || b; if (!vx) pl.px += clamp(pl.x + .5 - pl.px, -step, step); } }
  // crossing into another tile: the rules take the step (and those you pull away from may strike at you); a minion there trades places
  const tx = Math.floor(pl.px), ty = Math.floor(pl.py);
  if (tx !== pl.x || ty !== pl.y) {
    const o = occ[I(tx, ty)];
    playerShift(() => o ? swapPos(pl, o) : moveTo(pl, tx, ty));
    if (pl.x !== tx || pl.y !== ty) { pl.px = clamp(pl.px, pl.x + .01, pl.x + .99); pl.py = clamp(pl.py, pl.y + .01, pl.y + .99); }
    else pl.hd = [d[0], d[1]];
  }
  if (bump) bumpInto(bump); else lastBump = '';
  sync(pl);
}
const sync = pl => { pl.rx = pl.px - .5; pl.ry = pl.py - .5; };

// everyone else glides from tile to tile at about their own pace, so a step lasts about as long as the wait for the next
export function glide(e, dt, turnSec) {
  const dx = e.x - e.rx, dy = e.y - e.ry, d = Math.hypot(dx, dy);
  if (d < 1e-3 || d > 3) { e.rx = e.x; e.ry = e.y; return; }
  const v = Math.max(.5, effSpeed(e) / 100) / turnSec * 1.15 * Math.max(1, d);
  const s = Math.min(1, v * dt / d); e.rx += dx * s; e.ry += dy * s;
}
