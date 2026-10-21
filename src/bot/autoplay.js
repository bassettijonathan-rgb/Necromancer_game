// A bot that plays the necromancer. It runs the same rules as you do, in the page (P) and headless for testing.
import { S } from '../core/state.js';
import { rnd } from '../core/rng.js';
import { N, W, I, inb, seen, vis, map, BLK, DIRS, los, cheb, fieldTo, fieldTeam } from '../core/level.js';
import { isMinion, hostile, seesE, stage, stepField } from '../core/rules.js';
import { raiseCandidates, doRaise, doBreath, doBurst, doMark, doLantern, doBolt, doMoveDir, burstChoice } from '../core/actions.js';
import { threatNear } from '../core/clock.js';

const LM = () => { const G = S.G, R = S.L.rooms; return [[12, G.roadY], [G.cryptDoor[0] + 3, G.cryptDoor[1]], [R[G.necroRoom].cx, R[G.necroRoom].cy], [R[G.tabletRoom].cx, R[G.tabletRoom].cy], [G.breach[0] + 3, G.breach[1]], [G.found.entry[0], G.found.entry[1]], [G.found.seal[0] - 1, G.found.seal[1]]]; };
function goToward(tx, ty) { return stepField(S.player, fieldTo(tx, ty), true); }

export function autoAct() {
  const pl = S.player, G = S.G;
  const foes = S.ents.filter(e => !e.dead && hostile(pl, e) && seesE(e)); let near = null, nd = 99; for (const e of foes) { const d = cheb(e, pl); if (d < nd) { nd = d; near = e; } }
  const ms = S.ents.filter(isMinion).length;
  if (pl.blood < pl.bmax * .35 && near && nd <= 3) { const f = fieldTo(near.x, near.y); const s = stepField(pl, f, true, true); if (s) return s; }
  const cs = raiseCandidates();
  if (cs.length && S.will >= 4 && ms < S.gripMax && (foes.length || ms < 6 || stage(cs[0].c || { kind: 'bones' }) === 'fresh')) return doRaise();
  if (S.will < 6 && pl.blood > pl.bmax * .7 && foes.length) return doBreath() || 100;
  if (near && nd <= 1) { if (ms > 0) { const s = stepField(pl, fieldTeam('foesOfYou', o => hostile(pl, o)), true, true); if (s) return s; } return doMoveDir(Math.sign(near.x - pl.x), Math.sign(near.y - pl.y)) || 100; }
  const canSee = near && nd <= 8 && los(pl.x, pl.y, near.x, near.y);
  if (canSee) {
    if (S.will >= 6 && burstChoice(near) && rnd() < .6) return doBurst(near) || 100;
    if (S.learned.mark && S.will >= 6 && ms >= 3 && !(S.markT && !S.markT.dead) && rnd() < .5) return doMark(near) || 100;
    if (S.learned.lantern && S.will >= 6 && foes.filter(e => e.light).length >= 2 && rnd() < .4) return doLantern(near.light ? near : foes.find(e => e.light)) || 100;
    if (S.will >= 4 && (ms < 3 || rnd() < .6)) return doBolt(near) || 100;
    return 100;
  }
  if (foes.length) return 100;
  if (pl.blood < pl.bmax * .6 || S.will < 12) { if (!threatNear()) return 100; }
  for (const it of S.items) { if (it.kind === 'torch') continue; if (seen[I(it.x, it.y)]) { const s = goToward(it.x, it.y); if (s) return s; } }
  let cb = null, cd = 12; for (const c of S.corpses) { if (c.holy || !vis[I(c.x, c.y)]) continue; const d = Math.hypot(c.x - pl.x, c.y - pl.y); if (d < cd) { cd = d; cb = c; } }
  if (cb && S.will >= 8 && ms < S.gripMax) { const s = goToward(cb.x, cb.y); if (s) return s; }
  if (G.sealOpen) { const r = G.found.room; if (!S.won) { const s = goToward(r.x0, (r.y0 + r.y1) >> 1); if (s) return s; } }
  else if (seen[I(G.found.seal[0] - 1, G.found.seal[1])] && ms > 0) { if (cheb(pl, { x: G.found.seal[0] - 1, y: G.found.seal[1] }) <= 1) return 100; const s = goToward(G.found.seal[0] - 1, G.found.seal[1]); if (s) return s; }
  const fd = fieldTo(pl.x, pl.y); let fb = -1, fdd = 9999;
  for (let i = 0; i < N; i++) {
    if (!seen[i] || BLK[map[i]] || fd[i] >= fdd) continue; const x = i % W, y = (i / W) | 0; let fr = false;
    for (const [dx, dy] of DIRS) { if (inb(x + dx, y + dy) && !seen[I(x + dx, y + dy)]) { fr = true; break; } } if (fr) { fdd = fd[i]; fb = i; }
  }
  if (fb >= 0 && fdd < 70) { const s = goToward(fb % W, (fb / W) | 0); if (s) return s; }
  const L = LM()[S.lmIx % 7]; if (Math.hypot(L[0] - pl.x, L[1] - pl.y) < 2.5) S.lmIx++;
  const s = goToward(L[0], L[1]); if (!s) S.lmIx++; return s || 100;
}
