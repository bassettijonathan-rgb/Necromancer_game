// How each kind of creature decides what to do with its turn.
import { S } from './state.js';
import { rnd, ri } from './rng.js';
import { emit, log } from './events.js';
import { occ, I, los, dist, fieldTo, fieldTeam } from './level.js';
import { WEAP, isDeadType } from './content.js';
import { attack, shoot, hurt, adjFoe, nearestHostile, nearestAlly, perceives, seesE, stepField, wander, keepFormation, ok, partOf, stage, corpseName, dropTorch, noise, The, the } from './rules.js';

// how far your dead will leave the ring: tune here
export const ENGAGE = { near: 5, attacker: 8, leash: 6 };

export function act(e) {
  if (e.unbound) return actUnbound(e);
  if (e.team === 0) return actMinion(e);
  if (e.team === 1) return actMercy(e);
  return actHound(e);
}
function actMinion(e) {
  const pl = S.player;
  if (S.stance !== 'hold') e.idle = false;
  const mt = S.markT && !S.markT.dead && S.markT.mark > 0 ? S.markT : null;
  const a = adjFoe(e, mt); if (a) return attack(e, a);
  if (S.stance === 'hold') { const h = e.hold || [e.x, e.y]; if (e.x !== h[0] || e.y !== h[1]) { return stepField(e, fieldTo(h[0], h[1]), true) || 100; } return 100; }
  // defensive: only those who have struck at you or your dead; aggressive: also anyone who comes close to you
  let tgt = null;
  if (mt && dist(e, mt) <= 10) tgt = mt;
  else { tgt = nearestHostile(e, 8, o => (o.atkT >= S.turn - 2 && dist(o, pl) <= ENGAGE.attacker) || (S.stance === 'aggressive' && dist(o, pl) <= ENGAGE.near && (perceives(e, o) || seesE(o)))); if (tgt && Math.max(Math.abs(e.x - pl.x), Math.abs(e.y - pl.y)) > ENGAGE.leash) tgt = null; }
  if (tgt) { const f = tgt === mt ? fieldTo(tgt.x, tgt.y) : fieldTeam('foes0', o => o.team !== 0 && !o.dead); const s = stepField(e, f, true); if (s) return s; if (tgt !== mt) { const s2 = stepField(e, fieldTo(tgt.x, tgt.y), true); if (s2) return s2; } }
  return keepFormation(e);
}
function actUnbound(e) {
  const a = adjFoe(e); if (a) return attack(e, a);
  const t = nearestHostile(e, 10, o => perceives(e, o)); if (t) return stepField(e, fieldTeam('foes2', o => !o.unbound && !o.dead), false) || 100; return wander(e);
}
export function mercyTarget(e) {
  if (e.tgt && (e.tgt.dead || !perceives(e, e.tgt))) e.tgt = null;
  let best = null, bd = 99; for (const o of S.ents) { if (o.dead || !hostile2(e, o)) continue; const d = dist(e, o); if (d > 12) continue; if (!perceives(e, o)) continue; const w = d - (o === S.player ? 3 : 0); if (w < bd) { bd = w; best = o; } }
  if (best) { e.tgt = best; e.last = [best.x, best.y]; e.aware = true; e.awareT = Math.max(e.awareT, 25); }
  return e.tgt;
}
const hostile2 = (a, b) => !(a === b || a.dead || b.dead || a.team === b.team);
function actMercy(e) {
  if (e.nerve < 15 && e.aware) {
    if (e.light && rnd() < .15 && e.type === 'zealot') { e.light = false; dropTorch(e.x, e.y); if (seesE(e)) log(`${The(e)} drops its torch and runs.`, 'ember'); }
    if (!e.fled && seesE(e)) { e.fled = 1; log(`${The(e)} breaks and runs.`, 'ember'); }
    if (e.x <= 1) { e.dead = true; e.gone = true; occ[I(e.x, e.y)] = null; S.notoriety += 4; return 100; }
    const fd = fieldTeam('dead', o => o.team === 0 || o.unbound); const s = stepField(e, fd, true, true); if (s) return s;
    return stepField(e, fieldTo(1, S.G.roadY), true) || 100;
  }
  const t = mercyTarget(e); const a = adjFoe(e, t);
  if (e.type === 'xbow') {
    if (a) return ok(e, 'armR') ? attack(e, a, WEAP.knife) : 100;
    if (t && dist(e, t) <= WEAP.crossbow.range && los(e.x, e.y, t.x, t.y) && ok(e, 'armR') && ok(e, 'armL')) {
      if (e.loaded) return shoot(e, t); if (dist(e, t) >= 3) { e.loaded = true; return 200; }
    }
    if (t && dist(e, t) < 3) { const f = fieldTo(t.x, t.y); const s = stepField(e, f, true, true); if (s) return s; }
  }
  if (e.type === 'conf') {
    const dead = nearestHostile(e, 6, o => (isDeadType(o.type)) && los(e.x, e.y, o.x, o.y) && perceives(e, o));
    if (dead && (e.pray || 0) <= S.turn) { e.pray = S.turn + 2; return absolution(e, dead); }
    if (a) return attack(e, a);
    const nd = nearestHostile(e, 3); if (nd) { const s = stepField(e, fieldTo(nd.x, nd.y), true, true); if (s) return s; }
    const ally = nearestAlly(e); if (ally && dist(e, ally) > 2.5 && e.aware) return stepField(e, fieldTo(ally.x, ally.y), true) || 100;
  }
  if (a) return attack(e, a);
  if (t) return stepField(e, t === S.player ? fieldTo(t.x, t.y) : fieldTeam('foes1', o => o.team !== 1 && !o.dead), true) || stepField(e, fieldTo(t.x, t.y), true) || 100;
  if (e.aware && e.last) { if (e.x === e.last[0] && e.y === e.last[1]) { e.last = null; return wander(e); } const s = stepField(e, fieldTo(e.last[0], e.last[1]), true); if (s) return s; e.last = null; return 100; }
  if (e.route) { const w = e.route[e.wp % e.route.length]; if (Math.hypot(w[0] - e.x, w[1] - e.y) < 1.5) e.wp++; if (rnd() < .25) return 100; return stepField(e, fieldTo(w[0], w[1]), true) || (e.wp++, 100); }
  if (e.post) { if (e.x !== e.post[0] || e.y !== e.post[1]) { const s = stepField(e, fieldTo(e.post[0], e.post[1]), true); if (s) return s; } return rnd() < .1 ? wander(e, e.post, 2) : 100; }
  return wander(e);
}
function absolution(c, t) {
  c.atkT = S.turn;
  if (t.x !== c.x) c.face = Math.sign(t.x - c.x); emit('fx', { k: 'holy', x: t.x, y: t.y });
  if (seesE(t) || seesE(c)) log(`${The(c)} prays over ${the(t)}. White light stands on it like a pillar.`, 'holy');
  hurt(t, ri(7, 12), 'holy', c, partOf(t, 'torso'), true); noise(c.x, c.y, 8);
  if (!t.dead && seesE(t)) log(`${The(t)} smokes, and stays standing.`, 'holy');
  return 200;
}
function actHound(e) {
  const hurtBad = partOf(e, 'torso').hp < partOf(e, 'torso').max * .4 || e.nerve < 12;
  let t = e.tgt && !e.tgt.dead && dist(e, e.tgt) <= 10 && perceives(e, e.tgt) ? e.tgt : null;
  if (!t) { t = nearestHostile(e, 9, o => perceives(e, o)); e.tgt = t; }
  if (hurtBad && t) { const s = stepField(e, fieldTo(t.x, t.y), false, true); if (s) return s; }
  const a = adjFoe(e, t); if (a) return attack(e, a);
  if (t) { e.aware = true; return stepField(e, t === S.player ? fieldTo(t.x, t.y) : fieldTeam('foes3', o => o.team !== 3 && !o.dead), false) || 100; }
  e.aware = false;
  let best = null, bd = 7; for (const c of S.corpses) { if (c.holy || stage(c) === 'bone') continue; const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; best = c; } }
  if (best) {
    if (bd <= 1.5) { best.age += 50; best.gnawed = (best.gnawed || 0) + 1; if (best.gnawed >= 4) { best.age = 999; } if (seesE(e) && rnd() < .15) log(`${The(e)} worries at the ${corpseName(best)}.`); return 150; }
    return stepField(e, fieldTo(best.x, best.y), false) || wander(e);
  }
  return wander(e, e.post, 5);
}
