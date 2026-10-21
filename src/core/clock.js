// The energy clock: you act, then the world runs until you can act again.
import { S } from './state.js';
import { rnd, ri, pick, clamp } from './rng.js';
import { emit, log } from './events.js';
import { W, H, N, I, inb, map, seen, vis, occ, solid, zone, BLK, DIRS, isOpq, cheb, dist, los, computeFOV, findFree, fieldCache, fieldTo, FOUND, bfsQueue as Q } from './level.js';
import { act, mercyTarget } from './ai.js';
import { autoRaiseTick, slip, doMoveDir } from './actions.js';
import { SEAL_OPENS, readTome, readTablet, readCradle, TABLET_NAMES } from '../sealed/texts.js';
import { effSpeed, isMinion, hostile, living, seesE, perceives, hurt, die, stage, corpseName, charmFx, spawn, pickUpHere, openChest, stepField, stragglers, The, the } from './rules.js';
import { isDeadType } from './content.js';

let busy = false;
export const isBusy = () => busy;

// In turns, the world waits for you: each act of yours runs the world until you can act again.
// In real time, the world runs tick by tick at a fixed rate (rtTick) and you act whenever you are ready.
export const RT = { on: false };
// returns true if the action took time
export function playerAct(fn) {
  if (S.gameOver || busy) return false; emit('act');
  const cost = fn(); if (!cost) return false;
  S.player.energy -= cost;
  if (RT.on) { computeFOV(); resolved(); } else afterPlayer();
  return true;
}
export const playerReady = () => !S.gameOver && S.player.energy >= 100;
// one tick of real time; whoever drives it gives the player their act first, when they are ready
export function rtTick() {
  if (S.gameOver || busy) return;
  busy = true; tick(); busy = false;
  const pl = S.player; if (pl.energy > 100) pl.energy = 100; // standing idle banks nothing
  if (S.tickN % 10 === 0) { computeFOV(); resolved(); }
}
function afterPlayer() {
  busy = true; let g = 0;
  while (!S.gameOver && S.player.energy < 100 && g++ < 4000) tick();
  busy = false; computeFOV(); resolved();
}
function tick() {
  S.tickN++;
  for (const e of S.ents) { if (!e.dead) e.energy += effSpeed(e) / 10; }
  const ready = []; for (const e of S.ents) if (!e.dead && e !== S.player && e.energy >= 100) ready.push(e);
  ready.sort((a, b) => b.energy - a.energy || a.id - b.id);
  for (const e of ready) { if (e.dead || S.gameOver) continue; const c = act(e) || 100; e.energy -= c; }
  if (S.tickN % 10 === 0) turnEnd();
}
function turnEnd() {
  S.turn++; fieldCache.clear(); const pl = S.player;
  if (S.castGlow > 0) S.castGlow = Math.max(0, S.castGlow - .5);
  if (S.strainT.cold > 0) S.strainT.cold--;
  // blood, bleeding, healing
  for (const e of S.ents) {
    if (e.dead) continue;
    if (e.mark > 0) { e.mark--; if (!e.mark && S.markT === e) S.markT = null; }
    if (living(e) && e.bleed > 0) { e.blood -= e.bleed; e.bleed = Math.max(0, e.bleed * .84 - .05); if (e.blood <= 0) { if (e === pl || seesE(e)) log(e === pl ? 'You have bled out.' : `${The(e)} bleeds out.`, 'blood'); die(e, 'bleeding', null); continue; } }
    if (e.burn > 0) { e.burn--; hurt(e, 2, 'fire', null, null, true); }
  }
  if (!S.gameOver) {
    const resting = S.intent.rest;
    if (S.turn % (resting ? 1 : 2) === 0) S.will = Math.min(S.WMAX, S.will + 1);
    { const rg = charmFx('regen'); if (rg && S.turn % Math.max(1, 4 - rg) === 0) S.will = Math.min(S.WMAX, S.will + 1); }
    if (pl.bleed < .2 && S.turn % (resting ? 3 : 12) === 0) pl.blood = Math.min(pl.bmax, pl.blood + 1);
    if (S.turn % (resting ? 8 : 25) === 0) for (const p of pl.parts) if (!p.gone && p.hp < p.max) p.hp++;
  }
  // morale and awareness of the living
  for (const e of S.ents) {
    if (e.dead || !living(e) || e === pl) continue;
    if (e.team === 1) {
      let seenDead = 0, allies = 0, conf = false;
      for (const o of S.ents) {
        if (o.dead || o === e) continue; const d = dist(e, o); if (d > 7) continue;
        if (isDeadType(o.type) && perceives(e, o)) seenDead++; else if (o.team === 1) { allies++; if (o.type === 'conf' && d <= 6) conf = true; }
      }
      e.nerve += -Math.min(5, seenDead * .7) + Math.min(2, allies * .5) + (conf ? 3 : 0) + (e.nerve < e.nerve0 ? .4 : 0);
      e.nerve = clamp(e.nerve, -10, e.nerve0 + 10);
      const was = e.aware; mercyTarget(e);
      if (e.tgt && !was) {
        if (seesE(e)) log(e.tgt === pl ? `${The(e)} sees you, and shouts.` : `${The(e)} sees ${the(e.tgt)}, and shouts.`, 'ember');
        for (const o of S.ents) if (!o.dead && o.team === 1 && o !== e && dist(o, e) <= 10 && !o.aware) { o.aware = true; o.awareT = 25; o.last = [e.tgt.x, e.tgt.y]; }
      }
      if (e.aware && !e.tgt) { e.awareT--; if (e.awareT <= 0) { e.aware = false; e.last = null; } }
      if (e.hunter && S.turn % 8 === 0 && !e.tgt) { e.aware = true; e.awareT = 30; e.last = [pl.x, pl.y]; }
    } else if (e.type === 'hound') { e.nerve = Math.min(e.nerve0, e.nerve + .5); }
  }
  // the grip
  const ms = S.ents.filter(isMinion); const over = ms.length - S.gripMax;
  if (over > 0) { const p = ms.length > S.gripMax * 1.5 ? .15 : .04; for (let k = 0; k < over; k++) if (rnd() < p) { slip(pick(ms.filter(m => !m.unbound))); break; } }
  autoRaiseTick();
  // remains, torches
  for (const c of S.corpses) { const before = stage(c); c.age++; if (stage(c) !== before && stage(c) === 'bloated' && vis[I(c.x, c.y)] && rnd() < .3) log(`The ${corpseName(c).replace('bloated ', '')} has begun to swell.`); }
  for (const it of S.items) if (it.kind === 'torch') it.t--; S.items = S.items.filter(it => it.kind !== 'torch' || it.t > 0);
  S.ents = S.ents.filter(e => !e.dead);
  // the seal knows the dead
  const G = S.G;
  if (G.found && !G.sealOpen) { const [sx, sy] = G.found.seal; for (const m of S.ents) if (isMinion(m) && cheb(m, { x: sx, y: sy }) <= 2 && los(m.x, m.y, sx, sy)) { openSeal(); break; } }
  // the Mercy answers
  const th = [12, 30, 55]; if (S.wave < th.length && S.notoriety >= th[S.wave]) { S.wave++; sendHunters(S.wave); }
}
function openSeal() {
  const [sx, sy] = S.G.found.seal; S.G.sealOpen = true; map[I(sx, sy)] = FOUND; computeFOV();
  emit('mapChanged', { x: sx, y: sy, what: 'seal' });
  log(SEAL_OPENS, 'grey');
}
function sendHunters(n) {
  const comp = n === 1 ? ['zealot', 'zealot', 'xbow'] : n === 2 ? ['conf', 'zealot', 'zealot', 'zealot'] : ['conf', 'zealot', 'zealot', 'xbow', 'xbow'];
  log(n === 1 ? 'Away west, the chapel bell begins to ring.' : n === 2 ? 'The bell again, and dogs, and men on the road.' : 'The bell will not stop. The whole Mercy is coming.', 'ember');
  for (const t of comp) { const p = findFree(1, S.G.roadY, 4); if (!p) continue; const e = spawn(t, p[0], p[1], { hunter: true }); e.aware = true; e.awareT = 40; e.last = [S.player.x, S.player.y]; }
  S.chron.push(`Turn ${S.turn}: the Mercy sent hunters (${['', 'first', 'second', 'third'][n]} call).`);
}

/* ---------- after each of your turns ---------- */
function resolved() {
  if (S.gameOver) { emit('turn'); return; }
  const pl = S.player;
  pickUpHere();
  const it = S.items.find(k => k.x === pl.x && k.y === pl.y && (k.kind === 'tome' || k.kind === 'tablet'));
  if (it) {
    S.items.splice(S.items.indexOf(it), 1); stopIntents();
    S.readQueued = it.kind === 'tome' ? readTome(S.rivalName, S.region) : readTablet(pick(TABLET_NAMES));
    S.chron.push(`Turn ${S.turn}: read ${it.kind === 'tome' ? 'the notes of ' + S.rivalName : 'a curse-tablet'}.`);
  }
  if (!S.won && zone[I(pl.x, pl.y)] === 5) { S.won = true; stopIntents(); S.chron.push(`Turn ${S.turn}: stood before the cradle.`); S.readQueued = readCradle(S.region); }
  if (S.stress) { S.will = S.WMAX; for (const c of S.corpses) c.age += 4; if (S.turn % 3 === 0) stressSpawn(); }
  emit('turn');
}
// a reading's lesson takes hold once it has been read
export function learnFrom(r) { if (r && r.learn && !S.learned[r.learn]) { S.learned[r.learn] = 1; return true; } return false; }

/* ---------- things you set in motion: explore, rest, walk ---------- */
export function stopIntents() { const t = S.intent; t.rest = false; t.travel = null; t.travelChest = null; t.explore = false; }
const xD = new Int16Array(N), xP = new Int32Array(N);
function exploreFoes() { return S.ents.some(e => !e.dead && hostile(S.player, e) && seesE(e) && (dist(e, S.player) <= 10 || e.aware || e.unbound)); }
function exploreStep() {
  const pl = S.player;
  xD.fill(-1); const s0 = I(pl.x, pl.y); xD[s0] = 0; xP[s0] = -1; let h = 0, t = 0; Q[t++] = s0; let goal = -1;
  while (h < t) {
    const i = Q[h++], x = i % W, y = (i / W) | 0;
    if (i !== s0) {
      if (S.items.some(it => it.kind !== 'torch' && !(it.kind === 'loot' && it.item.dropped !== undefined) && it.x === x && it.y === y)) { goal = i; break; }
      let edge = false; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && !seen[ny * W + nx]) { edge = true; break; } } if (edge) { goal = i; break; }
    }
    for (let k = 0; k < 8; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1]; if (!inb(nx, ny)) continue; const j = ny * W + nx;
      if (xD[j] >= 0 || !seen[j] || BLK[map[j]] || solid[j]) continue; if (k >= 4 && isOpq(nx, y) && isOpq(x, ny)) continue;
      const o = occ[j]; if (o && o !== pl && !(o.team === 0 && isMinion(o))) continue;
      xD[j] = xD[i] + 1; xP[j] = i; Q[t++] = j;
    }
  }
  if (goal < 0) return null;
  let j = goal; while (xP[j] !== s0 && xP[j] >= 0) j = xP[j];
  return [j % W - pl.x, ((j / W) | 0) - pl.y];
}
export function startExplore() {
  if (S.gameOver) return false; S.intent.rest = false; S.intent.travel = null;
  if (exploreFoes()) { log('Not with enemies in sight.'); return false; }
  if (!exploreStep()) { log('There is nothing left here that you can reach.'); return false; }
  S.intent.explore = true; return true;
}
function exploreTick() {
  const pl = S.player, I2 = S.intent;
  if (exploreFoes()) { I2.explore = false; log('You stop. Something is in sight.', 'ember'); return; }
  if (pl.bleed >= .4) { I2.explore = false; log('You stop to see to your bleeding.', 'blood'); return; }
  const d = exploreStep(); if (!d) { I2.explore = false; log('There is nothing left here that you can reach.'); return; }
  if (stragglers() && I2.waitN < 4) { I2.waitN++; playerAct(() => 100); return; } I2.waitN = 0;
  const hp = () => pl.parts.reduce((t, p) => t + (p.gone ? 0 : p.hp), 0), b = hp(); if (!playerAct(() => doMoveDir(d[0], d[1]))) { I2.explore = false; return; }
  if (hp() < b) { I2.explore = false; log('You stop. You are hurt.', 'blood'); }
}
export function threatNear() { const pl = S.player; return S.ents.some(e => !e.dead && hostile(pl, e) && ((e.team === 1 && e.aware) || e.type === 'hound' && e.aware || e.unbound) && dist(e, pl) < 14) || S.ents.some(e => !e.dead && hostile(pl, e) && seesE(e) && dist(e, pl) < 10); }
export function startRest() { if (threatNear()) { log('Not with enemies this close.'); return false; } S.intent.rest = true; log('You sit among your dead and let the night pass.', 'grey'); return true; }
function restStep() {
  const pl = S.player;
  if (threatNear()) { S.intent.rest = false; log('You stop resting. Something is coming.', 'ember'); return; }
  const healed = pl.blood >= pl.bmax && S.will >= S.WMAX && pl.parts.every(p => p.gone || p.hp >= p.max);
  if (healed) { S.intent.rest = false; log('You are as rested as you will get.'); return; }
  playerAct(() => 100);
}
function travelStep() {
  const pl = S.player, I2 = S.intent;
  const fs = S.ents.some(e => !e.dead && hostile(pl, e) && seesE(e) && cheb(e, pl) <= 6 && (e.aware || e.unbound || e.type === 'hound'));
  if (I2.travelChest && cheb(pl, I2.travelChest) <= 1) { const ch = I2.travelChest; I2.travelChest = null; I2.travel = null; playerAct(() => openChest(ch)); }
  else if (fs || (pl.x === I2.travel[0] && pl.y === I2.travel[1])) { I2.travel = null; I2.travelChest = null; }
  else if (stragglers() && I2.waitN < 4) { I2.waitN++; playerAct(() => 100); }
  else { I2.waitN = 0; const f = fieldTo(I2.travel[0], I2.travel[1]); if (f[I(pl.x, pl.y)] >= 9999 || !playerAct(() => stepField(pl, f, true))) { I2.travel = null; I2.travelChest = null; } }
}
// one step of whatever is in motion; true if something was in motion
export function intentStep() {
  const I2 = S.intent;
  if (I2.travel) { travelStep(); return true; }
  if (I2.explore) { exploreTick(); return true; }
  if (I2.rest) { restStep(); return true; }
  return false;
}
export const intentActive = () => !!(S.intent.travel || S.intent.explore || S.intent.rest);

/* ---------- the stress test ---------- */
function stressSpawn() {
  const liv = S.ents.filter(e => e.team === 1 || e.team === 3).length; if (liv >= 90) return;
  for (let k = 0; k < 5; k++) {
    const west = rnd() < .6; const p = west ? findFree(ri(1, 4), ri(4, H - 5), 3) : findFree(ri(8, 26), ri(2, 5), 3);
    if (p) { const e = spawn(rnd() < .7 ? 'zealot' : rnd() < .5 ? 'xbow' : 'hound', p[0], p[1]); e.aware = true; e.awareT = 99; e.hunter = true; e.last = [S.player.x, S.player.y]; e.nerve = e.nerve0 = 200; }
  }
}
