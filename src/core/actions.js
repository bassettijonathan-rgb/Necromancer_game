// What you can do on your turn: workings, orders, steps.
import { S } from './state.js';
import { rnd, ri, pick } from './rng.js';
import { emit, log } from './events.js';
import { map, vis, occ, I, inb, isOpq, canWalk, los, dist, cheb, findFree, GRAVE, OGRAVE, SEAL } from './level.js';
import { SP, VERB, conj } from './content.js';
import { WHISPERS, SEAL_TOUCH } from '../sealed/texts.js';
import { spawn, hurt, attack, perceives, noise, isMinion, hostile, seesE, ok, stage, massOf, charmFx, living, chestAt, openChest, moveTo, swapPos, The, the, poss } from './rules.js';

export function payWill(cost) {
  if (S.will >= cost) { S.will -= cost; return true; }
  const deficit = cost - S.will; if (S.player.blood <= deficit + 2) { log('Your will is spent, and there is not enough blood left in you to pay for it.', 'blood'); return false; }
  if (!S.flags.warned) { S.flags.warned = 1; log('Your will is spent. The working takes blood instead.', 'blood'); }
  S.will = 0; S.player.blood -= deficit; strain(); return true;
}
function strain() {
  if (rnd() > .4) return; const r = rnd();
  if (r < .3) { S.strainT.cold = 30; log('Cold runs up from your fingers. Your gestures go clumsy.', 'grey'); }
  else if (r < .5) { S.chron.push('A streak of hair went grey at the temple.'); log('Something pulls at your scalp. A lock of your hair has gone grey.', 'grey'); }
  else if (r < .72) { log(pick(WHISPERS), 'grey'); }
  else if (r < .86) { S.strainT.misfire = 1; log('The working slips sideways in your hands.', 'grey'); }
  else { const ms = S.ents.filter(isMinion); if (ms.length) { const m = pick(ms); slip(m); } else log(pick(WHISPERS), 'grey'); }
}
export function slip(m) { m.unbound = true; m.team = 2; m.idle = false; if (seesE(m)) log(`Your grip slips. ${The(m)} turns its head toward you, and it is no longer yours.`, 'blood'); emit('slip', m); }
function castFX() { S.castGlow = 1; S.stats.cast++; noise(S.player.x, S.player.y, 9); }
function canGesture() { if (!ok(S.player, 'armL') && !ok(S.player, 'armR')) { log('You cannot shape a working without hands.', 'blood'); return false; } return true; }
export const ok2gesture = () => ok(S.player, 'armL') || ok(S.player, 'armR');

/* ---------- raising ---------- */
export function raiseCandidates() {
  const out = [], pl = S.player;
  for (const c of S.corpses) { if (c.holy) continue; const d = Math.hypot(c.x - pl.x, c.y - pl.y); if (d > 4.6 || !vis[I(c.x, c.y)] || occ[I(c.x, c.y)]) continue; out.push({ c, d, pri: stage(c) === 'fresh' ? 0 : 1 }); }
  for (const [gx, gy] of S.L.graves) { if (map[I(gx, gy)] !== GRAVE) continue; const d = Math.hypot(gx - pl.x, gy - pl.y); if (d > 4.6 || !vis[I(gx, gy)]) continue; out.push({ g: [gx, gy], d, pri: 2 }); }
  out.sort((a, b) => a.pri - b.pri || a.d - b.d); return out;
}
function keptGear(c) { const g = c.gear || {}; const out = { hand: g.hand || null, body: g.body && !g.body.blessed ? g.body : null, head: g.head && !g.head.blessed ? g.head : null }; if (out.hand && out.hand.blessed) out.hand = null; return out; }
function raiseOne(o) {
  let m = null, nm = '';
  if (o.g) { const [gx, gy] = o.g; const q = findFree(gx, gy, 1); if (!q) return null; map[I(gx, gy)] = OGRAVE; emit('grave', { x: gx, y: gy }); m = spawn('skel', q[0], q[1], { team: 0 }); emit('fx', { k: 'raise', x: gx, y: gy }); nm = 'skeleton'; }
  else if (o.c && o.c.holy) return null;
  else {
    const c = o.c; const st = stage(c); S.corpses.splice(S.corpses.indexOf(c), 1);
    const human = !(c.kind === 'hound' || c.kind === 'bhound');
    if (human && st !== 'bone') { m = spawn('risen', c.x, c.y, { team: 0, hp: st === 'fresh' ? 1.7 : st === 'bloated' ? 1.45 : 1.15, miss: c.miss, weapon: 'fist', origin: c.kind, bloated: st === 'bloated', gear: keptGear(c) }); nm = 'risen ' + ({ zealot: 'zealot', xbow: 'bolt-warden', conf: 'confessor', necro: 'necromancer' }[c.kind] || 'dead'); S.know[c.kind] = 2; }
    else if (human) { m = spawn('skel', c.x, c.y, { team: 0, miss: c.miss, name: c.name || '', gear: c.gear ? keptGear(c) : undefined }); nm = c.name ? c.name : 'skeleton'; }
    else if (st === 'bone') { m = spawn('bhound', c.x, c.y, { team: 0, miss: c.miss, gear: {} }); nm = 'bone hound'; S.know.hound = 2; }
    else { m = spawn('rhound', c.x, c.y, { team: 0, miss: c.miss, gear: {} }); nm = 'risen hound'; S.know.hound = 2; }
    emit('fx', { k: 'raise', x: c.x, y: c.y });
  }
  if (m) { const f = charmFx('raise'); if (f) for (const p of m.parts) { if (p.gone) continue; p.max = Math.round(p.max * (1 + f)); p.hp = p.max; } emit('flash', { e: m, a: .4 }); m.energy = 0; if (S.stance === 'hold') m.hold = [m.x, m.y]; S.stats.raised++; }
  return m ? nm : null;
}
function raiseNotice(n, names) {
  castFX();
  const watchers = S.ents.some(e => e.team === 1 && !e.dead && perceives(e, S.player)); if (watchers) S.notoriety += 3 * n;
  log(n === 1 ? `The ${names[0]} gets up.` : `You call, and ${n} of the dead get up.`, 'soul');
}
export function doRaise(pickO) {
  if (!canGesture()) return 0; const cs = pickO ? [pickO] : raiseCandidates();
  if (!cs.length) { const hol = S.corpses.some(c => c.holy && vis[I(c.x, c.y)] && Math.hypot(c.x - S.player.x, c.y - S.player.y) <= 4.6); log(hol ? 'The body is quiet. You call, and nothing in it answers.' : 'There are no remains close enough to raise.'); return 0; }
  let n = 0; const names = [];
  for (const o of cs.slice(0, 3)) { if (n > 0 && S.will < SP.raise.cost) break; if (!payWill(SP.raise.cost)) break; const nm = raiseOne(o); if (nm) { names.push(nm); n++; } }
  if (!n) return 0; raiseNotice(n, names); return 100;
}
// the dead come to you on their own while your grip has room; never paid in blood, and a bolt's worth of will is kept back
const AUTO_KEEP = 4;
export function autoRaiseTick() {
  if (!S.autoRaise || S.gameOver || S.won || !ok2gesture()) return;
  if (S.ents.filter(isMinion).length >= S.gripMax || S.will < SP.raise.cost + AUTO_KEEP) return;
  const cs = raiseCandidates(); if (!cs.length) return; S.will -= SP.raise.cost; const nm = raiseOne(cs[0]); if (nm) raiseNotice(1, [nm]);
}
export function raiseAt(x, y) {
  if (!S.learned.raise) return 0;
  const c = S.corpses.find(k => k.x === x && k.y === y); const isG = map[I(x, y)] === GRAVE;
  if (!c && !isG) return 0;
  if (Math.hypot(x - S.player.x, y - S.player.y) > 4.6 || !vis[I(x, y)]) { log('Too far away to call. Come within four paces.'); return 0; }
  if (c && c.holy) { log('The body is quiet. You call, and nothing in it answers.'); return 0; }
  if (c && occ[I(x, y)]) { log('Something is standing on it.'); return 0; }
  return doRaise(c ? { c } : { g: [x, y] });
}
export function setAutoRaise(v) { S.autoRaise = v; log(v ? 'Your dead will rise on their own while your grip has room.' : 'The dead rise only when you call them now.', 'soul'); }

/* ---------- workings ---------- */
export function autoTarget(maxR) {
  const pl = S.player, t = S.target;
  if (t && !t.dead && seesE(t) && hostile(pl, t) && dist(pl, t) <= maxR && los(pl.x, pl.y, t.x, t.y)) return t;
  let best = null, bd = maxR; for (const e of S.ents) { if (e.dead || !hostile(pl, e) || !seesE(e)) continue; const d = dist(pl, e); if (d < bd && los(pl.x, pl.y, e.x, e.y)) { bd = d; best = e; } } return best;
}
function misfire(t) { if (!S.strainT.misfire) return t; S.strainT.misfire = 0; const cand = S.ents.filter(e => !e.dead && e !== S.player && vis[I(e.x, e.y)] && dist(e, S.player) < 9); return cand.length ? pick(cand) : t; }
export function doBolt(t) {
  const pl = S.player;
  if (!canGesture()) return 0; t = t || autoTarget(8.5); if (!t) { log('No foe in sight for a soul bolt.'); return 0; }
  if (!payWill(SP.bolt.cost)) return 0; t = misfire(t); castFX(); if (t.x !== pl.x) pl.face = Math.sign(t.x - pl.x);
  emit('blow', { kind: 'bolt', a: pl, t });
  if (S.strainT.cold > 0 && rnd() < .25) { emit('blowEnd'); log('Your fingers fumble the shape. The bolt goes wide.', 'grey'); return 100; }
  const r = hurt(t, ri(5, 8), 'soul', pl); emit('blowEnd');
  if (r && r.dmg > 0 && !r.dead && seesE(t) && !r.lost) log(`The bolt ${conj(VERB.soul[Math.min(3, Math.floor(r.dmg / 3))])} ${poss(t)} ${r.part.name}.`, 'soul');
  if (t.team === 1 && !t.aware) { t.aware = true; t.awareT = 20; t.last = [pl.x, pl.y]; }
  return 100;
}
export function burstChoice(t) {
  const pl = S.player; let best = null, bv = 0; const ctr = t || pl;
  for (const c of S.corpses) {
    if (!vis[I(c.x, c.y)]) continue; const d = Math.hypot(c.x - pl.x, c.y - pl.y); if (d > 7.5 || !los(pl.x, pl.y, c.x, c.y)) continue;
    const R = stage(c) === 'bloated' ? 2.3 : 1.6; if (Math.hypot(c.x - pl.x, c.y - pl.y) <= R + .3) continue;
    let v = 0; for (const e of S.ents) { if (e.dead || e === pl) continue; const dd = Math.hypot(e.x - c.x, e.y - c.y); if (dd > R) continue; v += hostile(pl, e) ? (e === t ? 3 : 2) : -2; }
    v += t ? -Math.hypot(c.x - ctr.x, c.y - ctr.y) * .1 : 0; if (v > bv) { bv = v; best = c; }
  }
  return best;
}
export function doBurst(t) {
  if (!canGesture()) return 0; t = t || autoTarget(10); const c = burstChoice(t); if (!c) { log('No remains near your foes to burst.'); return 0; }
  if (!payWill(SP.burst.cost)) return 0; castFX(); S.corpses.splice(S.corpses.indexOf(c), 1);
  const st = stage(c), R = st === 'bloated' ? 2.3 : 1.6, m = massOf(c);
  emit('blow', { kind: 'burst', x: c.x, y: c.y, rot: st === 'bloated', R, corpse: c });
  if (seesE({ x: c.x, y: c.y })) log(st === 'bloated' ? 'The swollen body splits with a wet roar.' : 'The remains burst into a spray of bone.', 'soul');
  for (const e of S.ents.slice()) {
    if (e.dead) continue; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d > R) continue; const k = 1 - d / R * .5; const hits = d < 1 ? 2 : 1;
    for (let h = 0; h < hits && !e.dead; h++) hurt(e, Math.round(m * k * (.6 + rnd() * .5)), 'burst', null, null, e !== S.player && !(seesE(e) && rnd() < .5));
    if (!e.dead && living(e)) e.nerve -= 15;
  }
  emit('blowEnd');
  for (const e of S.ents) { if (e.team === 1 && !e.dead && dist(e, c) < 8) e.nerve -= 8; }
  return 100;
}
export function doBreath() {
  const pl = S.player;
  if (pl.blood <= SP.breath.blood + 3) { log('You have too little blood left to pay for breath.', 'blood'); return 0; }
  if (S.will >= S.WMAX) { log('Your will is already full.'); return 0; }
  pl.blood -= SP.breath.blood; S.will = Math.min(S.WMAX, S.will + 12); emit('fx', { k: 'breath', x: pl.x, y: pl.y }); log('You open a vein and breathe the price in. Will returns, cold and clear.', 'blood'); castFX(); return 50;
}
export function doMark(t) {
  if (!canGesture()) return 0; t = t || autoTarget(9); if (!t) { log('No one in sight to mark.'); return 0; } if (!payWill(SP.mark.cost)) return 0; t = misfire(t); castFX();
  if (S.markT && S.markT !== t) S.markT.mark = 0; t.mark = 25; S.markT = t; emit('fx', { k: 'mark', x: t.x, y: t.y }); log(`You mark ${the(t)} for the pit. Your dead turn their heads toward it.`, 'soul'); return 50;
}
export function doLantern(t) {
  if (!canGesture()) return 0; t = t || autoTarget(10); const c = t ? { x: t.x, y: t.y } : { x: S.player.x, y: S.player.y }; if (!payWill(SP.lantern.cost)) return 0; castFX();
  let n = 0; const R = 5;
  for (const e of S.ents) { if (e.dead || !e.light || Math.hypot(e.x - c.x, e.y - c.y) > R) continue; e.light = false; n++; e.nerve -= 20; emit('fx', { k: 'snuff', x: e.x, y: e.y }); if (e.type === 'zealot') e.doused = 1; }
  for (const it of S.items.slice()) if (it.kind === 'torch' && Math.hypot(it.x - c.x, it.y - c.y) <= R) { S.items.splice(S.items.indexOf(it), 1); emit('fx', { k: 'snuff', x: it.x, y: it.y }); n++; }
  for (const L of S.staticLights) { if (L.out || L.kind === 'seam' || Math.hypot(L.x - c.x, L.y - c.y) > R) continue; L.out = true; n++; emit('fx', { k: 'snuff', x: L.x, y: L.y }); }
  emit('fx', { k: 'darkRing', x: c.x, y: c.y, R });
  log(n ? `${n === 1 ? 'A light' : n + ' lights'} gutter and go out. The dark comes in close.` : 'You close your hand on the dark. There is no light here to put out.', 'soul'); return 50;
}
export const SPELLFN = { raise: () => doRaise(), bolt: () => doBolt(), burst: () => doBurst(), breath: doBreath, mark: () => doMark(), lantern: () => doLantern() };

/* ---------- orders and steps ---------- */
export function doOrder(s) {
  S.stance = s; for (const m of S.ents) if (isMinion(m)) m.hold = s === 'hold' ? [m.x, m.y] : null;
  const w = { defensive: 'Your dead close around you. They will strike only at what strikes first.', aggressive: 'Your dead close around you, and turn toward anything that comes near.', hold: 'Your dead stop where they stand.' }[s]; log(w, 'soul'); return 25;
}
export function doMoveDir(dx, dy) {
  const pl = S.player; const nx = pl.x + dx, ny = pl.y + dy; if (!inb(nx, ny)) return 0; const o = occ[I(nx, ny)];
  { const ch = chestAt(nx, ny); if (ch && !o) { if (dx && dy && isOpq(pl.x + dx, pl.y) && isOpq(pl.x, pl.y + dy)) return 0; return openChest(ch); } }
  if (o && hostile(pl, o)) { if (dx && dy && isOpq(pl.x + dx, pl.y) && isOpq(pl.x, pl.y + dy)) return 0; return attack(pl, o); }
  if (!canWalk(nx, ny)) { const t = map[I(nx, ny)]; if (t === SEAL) sealTouch(); else if (t === GRAVE && !S.flags.graveHint) { S.flags.graveHint = 1; log('A grave. Whoever is under it has been there a long time. Press R to call them up.'); } return 0; }
  if (dx && dy && isOpq(pl.x + dx, pl.y) && isOpq(pl.x, pl.y + dy)) return 0;
  if (o) return swapPos(pl, o); return moveTo(pl, nx, ny);
}
export function doHood() { S.hooded = !S.hooded; log(S.hooded ? 'You shutter the lantern. The dark comes close; the living will have to come closer to see you.' : 'You open the lantern.', S.hooded ? 'grey' : ''); return 25; }
function sealTouch() { if (S.flags.sealTouched) return; S.flags.sealTouched = 1; log(SEAL_TOUCH, 'grey'); }
