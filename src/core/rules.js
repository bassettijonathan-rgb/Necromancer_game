// Bodies, gear, light, perception, blows, death and movement: the rules every creature lives by.
import { S } from './state.js';
import { rnd, ri, pick, clamp, shuffled } from './rng.js';
import { emit, log } from './events.js';
import { W, H, N, I, inb, map, outdoor, vis, occ, solid, isOpq, canWalk, los, cheb, dist, findFree, DIRS, WATER, fieldTo } from './level.js';
import { PLAN, MISSBIT, WEAP, DEF, MAT, GEAR, AFFIX, RELIC, LOOT, DEFGEAR, CHESTNAME, PACKN, VERB, conj, LOSSWORD } from './content.js';

/* ---------- creatures ---------- */
export const living = e => !!DEF[e.type].living;
export const matOf = e => e === S.player ? 'you' : living(e) ? 'living' : DEF[e.type].mat;
export const partOf = (e, k) => e.parts.find(p => p.k === k);
export const ok = (e, k) => { const p = partOf(e, k); return p && !p.gone; };
export function missMask(e) { let m = 0; for (const p of e.parts) if (p.gone && MISSBIT[p.k]) m |= MISSBIT[p.k]; return m; }
export function isMinion(e) { return e.team === 0 && e !== S.player && !e.dead; }
export function hostile(a, b) { if (a === b || a.dead || b.dead) return false; if (a.team === b.team) return false; return true; }
export function displayName(e) { if (e === S.player) return 'you'; if (e.name) return e.name; let n = DEF[e.type].name; if (e.unbound) n = 'unbound ' + n; return n; }
export function The(e) { return e === S.player ? 'You' : (e.name ? e.name : 'The ' + displayName(e)); }
export function the(e) { return e === S.player ? 'you' : (e.name ? e.name : 'the ' + displayName(e)); }
export function poss(e) { return e === S.player ? 'your' : (e.name ? e.name + '’s' : 'the ' + displayName(e) + '’s'); }

export function mkParts(type, mul, miss) {
  const d = DEF[type];
  return PLAN[d.plan].map(([k, name, hp, w]) => { const m = Math.max(1, Math.round(hp * mul)); const gone = miss && MISSBIT[k] && (miss & MISSBIT[k]); return { k, name, hp: gone ? 0 : m, max: m, w, gone: !!gone, how: gone ? 'missing' : '' }; });
}
export function spawn(type, x, y, o) {
  const d = DEF[type]; o = o || {};
  const e = { id: S.nextId++, type, team: o.team ?? d.team, x, y, energy: rnd() * 90, parts: mkParts(type, o.hp || d.hp, o.miss || 0),
    blood: d.blood || 0, bmax: d.blood || 0, bleed: 0, weapon: o.weapon || d.weapon, light: !!d.light, nerve: d.nerve || 0, nerve0: d.nerve || 0,
    aware: false, awareT: 0, tgt: null, last: null, hold: null, face: 1, burn: 0, mark: 0, loaded: true, name: o.name || '', origin: o.origin || '',
    route: o.route || null, wp: 0, post: o.post || null, hunter: !!o.hunter, bloated: !!o.bloated, unbound: false, opp: -1, gear: o.gear || defaultGear(type) };
  S.ents.push(e); occ[I(x, y)] = e; emit('spawn', e); return e;
}
export function curWeapon(e) { if (DEF[e.type].plan === 'human' && !ok(e, 'armR')) return ok(e, 'armL') ? WEAP.fist : null; const g = e.gear && e.gear.hand; if (g) return weaponOf(g); return WEAP[e.weapon] || WEAP.fist; }
export function effSpeed(e) {
  let s = DEF[e.type].speed; if (e.name && e.type === 'skel') s += 5;
  if (DEF[e.type].plan === 'human') { const l = (ok(e, 'legL') ? 1 : 0) + (ok(e, 'legR') ? 1 : 0); s *= l === 2 ? 1 : l === 1 ? .55 : .25; }
  else { const l = (ok(e, 'fore') ? 1 : 0) + (ok(e, 'hind') ? 1 : 0); s *= l === 2 ? 1 : l === 1 ? .55 : .25; }
  if (living(e) && e.bmax && e.blood < e.bmax * .3) s *= .8;
  if (e.gear) s -= slowOf(e.gear.body);
  if (isMinion(e) && !e.idle && S.stance !== 'hold') { const d = cheb(e, S.player); if (d > 6) s *= 1.8; else if (d > 2) s *= 1.4; }
  return s;
}
export function hpFrac(e) { let a = 0, b = 0; for (const p of e.parts) { b += p.max; a += Math.max(0, p.hp); } const vital = Math.min(partOf(e, 'head').hp / partOf(e, 'head').max, partOf(e, 'torso').hp / partOf(e, 'torso').max); return Math.min(a / b, vital); }
export function partWord(p, e) { if (p.gone) return p.how || 'missing'; const f = p.hp / p.max; if (f >= 1) return 'whole'; if (!living(e) && e !== S.player) return f > .6 ? 'chipped' : f > .3 ? 'cracked' : 'barely holding'; return f > .75 ? 'bruised' : f > .5 ? 'wounded' : f > .25 ? 'badly hurt' : 'mangled'; }

/* ---------- gear ---------- */
export function mkItem(b, q, o) {
  const it = { id: S.itemSeq++, b, q: q || 0, aff: [], blessed: !!(o && o.blessed) }; const g = GEAR[b];
  if (g.slot !== 'use' && it.q > 0) { const pool = AFFIX[g.slot] || []; const n = Math.min(pool.length, it.q); const sh = shuffled(pool); for (let k = 0; k < n; k++) it.aff.push(sh[k][0]); }
  if (it.q === 2) it.title = pick(RELIC); return it;
}
export const affOf = (it, k) => { for (const s of Object.values(AFFIX)) for (const a of s) if (a[0] === k) return a; return null; };
export function itemName(it) {
  const g = GEAR[it.b]; let n = g.n;
  if (it.q === 1 && it.aff.length) n = affOf(it, it.aff[0])[1] + ' ' + n; if (it.blessed) n = 'blessed ' + n;
  if (it.q === 2) n = `${n}, called ${it.title}`; return n;
}
export function weaponOf(it) {
  const g = GEAR[it.b].w; const w = { name: GEAR[it.b].n, type: g.type, dmg: g.dmg.slice(), cost: g.cost, hit: g.hit || 0 };
  for (const k of it.aff) { const fx = affOf(it, k)[2]; if (fx.dmg) { w.dmg[0] += fx.dmg[0]; w.dmg[1] += fx.dmg[1]; } if (fx.cost) w.cost += fx.cost; if (fx.hit) w.hit += fx.hit; }
  if (it.blessed) w.dmg[1] += 1; return w;
}
export function armourOfItem(it) {
  const a = GEAR[it.b].a || {}; const thick = it.aff.includes('thick') ? 1 : 0, bl = it.blessed ? 1 : 0; const out = {};
  for (const [p, v] of Object.entries(a)) { out[p] = {}; for (const [t, n] of Object.entries(v)) out[p][t] = n + thick + bl; } return out;
}
export function slowOf(it) { return it && GEAR[it.b].slow && !it.aff.includes('supple') ? GEAR[it.b].slow : 0; }
export function charmFx(k) { let v = 0; for (const s of ['charm1', 'charm2']) { const it = S.player && S.player.gear[s]; if (!it) continue; const fx = GEAR[it.b].fx || {}; if (fx[k]) v += fx[k] * (it.aff.includes('deep') ? 2 : 1); } return v; }
export const GRIP0 = 6;
export function applyGear() { S.gripMax = S.stress ? 999 : GRIP0 + charmFx('grip'); S.WMAX = 30 + charmFx('will'); S.will = Math.min(S.will, S.WMAX); }
export function canWear(e, it) {
  if (!it) return true; const g = GEAR[it.b]; if (g.slot === 'use') return false; if (g.slot === 'charm') return e === S.player;
  if (e === S.player) return true; if (DEF[e.type].plan !== 'human') return false; return !it.blessed;
}
export function rollLoot(tbl, qBoost) {
  const T = LOOT[tbl]; let tot = 0; for (const [, w] of T) tot += w; let r = rnd() * tot; let b = null; for (const [k, w] of T) { r -= w; if (r <= 0) { b = k; break; } }
  if (!b) return null; const g = GEAR[b]; let q = 0; if (g.slot !== 'use') { const x = rnd(); q = x < .05 + qBoost * .06 ? 2 : x < .28 + qBoost * .2 ? 1 : 0; } return mkItem(b, q);
}
export function dropLoot(x, y, it) { const q = canWalk(x, y) && !S.items.some(k => k.x === x && k.y === y) ? [x, y] : findFreeItem(x, y) || [x, y]; S.items.push({ kind: 'loot', x: q[0], y: q[1], item: it }); }
export function findFreeItem(x, y) { for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (canWalk(nx, ny) && !S.items.some(k => k.x === nx && k.y === ny)) return [nx, ny]; } return null; }
export function defaultGear(type) {
  const g = { hand: null, body: null, head: null }; for (const b of DEFGEAR[type] || []) { g[GEAR[b].slot] = mkItem(b, type === 'player' ? 0 : rnd() < .1 ? 1 : 0); }
  if (type === 'zealot' && rnd() < .3) g.head = mkItem('cap'); if (type === 'conf' && rnd() < .5) g.body = mkItem('jerkin', 0, { blessed: true });
  if (type === 'player') { g.charm1 = null; g.charm2 = null; } return g;
}

/* ---------- containers ---------- */
export function addChest(kind, x, y, o) { const c = Object.assign({ id: S.nextId++, kind, x, y, open: false, loot: null }, o || {}); S.chests.push(c); if (kind !== 'sarc') solid[I(x, y)] = 1; return c; }
export function chestAt(x, y) { return S.chests.find(c => c.x === x && c.y === y); }
function fillChest(c) {
  const tbl = c.kind === 'sarc' ? 'sarc' : c.kind === 'alms' ? 'alms' : 'chest'; const n = c.kind === 'sarc' ? (c.goods ? ri(1, 2) : 0) : c.kind === 'pack' ? ri(2, 3) : ri(2, 4); const L = [];
  for (let k = 0; k < n; k++) { const it = rollLoot(tbl, c.kind === 'sarc' ? 1 : c.kind === 'alms' ? 0 : .5); if (it) { if (c.kind === 'alms' && GEAR[it.b].slot !== 'use' && GEAR[it.b].slot !== 'charm') it.blessed = true; L.push(it); } }
  if (c.kind === 'box') L.push(mkItem('spade', rnd() < .3 ? 1 : 0)); if (c.kind === 'pack' && !L.length) L.push(mkItem('wine')); return L;
}
export function openChest(c) {
  if (c.open) { S.lootQueued = { kind: 'chest', c }; return 0; }
  c.open = true; c.loot = fillChest(c); let cost = 100;
  if (c.kind === 'sarc') {
    cost = 200; noise(c.x, c.y, 6); log('You set your shoulder to the lid. Stone grinds on stone, and the sarcophagus opens.');
    if (rnd() < .75) { const q = findFree(c.x, c.y, 1); if (q) S.corpses.push({ id: S.nextId++, x: q[0], y: q[1], kind: 'bones', age: 999, rot: rnd() * 6.28, miss: 0 }); }
  } else if (c.kind === 'alms') { cost = 300; noise(c.x, c.y, 10); if (S.ents.some(e => e.team === 1 && !e.dead && dist(e, c) < 12)) S.notoriety += 3; log('You break the lock on the alms chest. It is not quiet.', 'ember'); }
  else log(`You open the ${CHESTNAME[c.kind]}.`);
  emit('fx', { k: 'dust', x: c.x, y: c.y, n: 3 });
  if (!c.loot.length) log(c.kind === 'sarc' ? 'Nothing was buried with them but the dark.' : 'It is empty.'); else S.lootQueued = { kind: 'chest', c };
  return cost;
}

/* ---------- your pack ---------- */
export const pack = () => S.player.pack;
export function takeItem(it) { if (pack().length >= PACKN) { log('Your pack is full.'); return false; } delete it.dropped; pack().push(it); log(`You take the ${itemName(it)}.`); return true; }
export function equipOn(e, it, slot) {
  const g = GEAR[it.b]; slot = slot || (g.slot === 'charm' ? (!e.gear.charm1 ? 'charm1' : !e.gear.charm2 ? 'charm2' : 'charm1') : g.slot);
  const old = e.gear[slot]; e.gear[slot] = it; return old;
}
export function doEquip(it) {
  const i = pack().indexOf(it); if (i < 0) return 0; const g = GEAR[it.b];
  if (g.slot === 'use') return doUse(it);
  pack().splice(i, 1); const old = equipOn(S.player, it); if (old) pack().push(old); applyGear();
  log(`You ${g.slot === 'hand' ? 'take up' : 'put on'} the ${itemName(it)}.`); return 50;
}
export function doUnequip(slot) { const it = S.player.gear[slot]; if (!it) return 0; if (pack().length >= PACKN) { log('Your pack is full.'); return 0; } S.player.gear[slot] = null; pack().push(it); applyGear(); log(`You take off the ${itemName(it)}.`); return 50; }
export function doUse(it) {
  const pl = S.player; const i = pack().indexOf(it); if (i < 0) return 0; const u = GEAR[it.b].use;
  if (u === 'bandage') { if (pl.bleed < .2 && pl.blood >= pl.bmax) { log('You are not bleeding.'); return 0; } pl.bleed = 0; pl.blood = Math.min(pl.bmax, pl.blood + 3); log('You bind the wound tight. The bleeding stops.'); }
  else if (u === 'wine') { if (pl.blood >= pl.bmax) { log('You have no need of it.'); return 0; } pl.blood = Math.min(pl.bmax, pl.blood + 12); log('You drink the blood-wine. Warmth comes back into your hands.'); }
  else if (u === 'salt') { if (S.will >= S.WMAX) { log('Your will is already full.'); return 0; } S.will = Math.min(S.WMAX, S.will + 10); log('The salt burns on your tongue. Your will comes back, sharp and cold.', 'soul'); }
  pack().splice(i, 1); return 50;
}
export function doDrop(it) { const i = pack().indexOf(it); if (i < 0) return 0; pack().splice(i, 1); dropLoot(S.player.x, S.player.y, it); it.dropped = S.turn; log(`You set down the ${itemName(it)}.`); return 25; }
export function reachDead() { return S.ents.filter(m => isMinion(m) && cheb(m, S.player) <= 3 && vis[I(m.x, m.y)]); }
export function doGive(it, m) {
  const i = pack().indexOf(it); if (i < 0 || !m || m.dead) return 0;
  if (cheb(m, S.player) > 3) { log(`${The(m)} is too far away. Bring it within three paces.`); return 0; }
  if (!canWear(m, it)) { log(it.blessed ? 'The dead will not touch a blessed thing.' : `${The(m)} cannot use that.`); return 0; }
  pack().splice(i, 1); const old = equipOn(m, it); if (old) pack().push(old); emit('flash', { e: m, a: .3 });
  log(`${The(m)} takes the ${itemName(it)}${old ? ` and lets the ${itemName(old)} fall into your hands` : ''}.`, 'soul'); return 50;
}
export function doTakeBack(m, slot) {
  const it = m.gear[slot]; if (!it) return 0; if (cheb(m, S.player) > 3) { log(`${The(m)} is too far away.`); return 0; } if (pack().length >= PACKN) { log('Your pack is full.'); return 0; }
  m.gear[slot] = null; pack().push(it); log(`You take the ${itemName(it)} from ${the(m)}.`); return 50;
}
export function pickUpHere() {
  let n = 0; for (const it of S.items.slice()) {
    if (it.kind !== 'loot' || it.x !== S.player.x || it.y !== S.player.y) continue; if (it.item.dropped !== undefined) continue; if (pack().length >= PACKN) { log('Your pack is full.'); break; }
    S.items.splice(S.items.indexOf(it), 1); takeItem(it.item); n++;
  } return n;
}

/* ---------- light, as the rules see it (not the renderer) ---------- */
let gpL = null, gpTick = -1;
export function gpLights() {
  if (gpTick === S.tickN && gpL) return gpL; gpTick = S.tickN; gpL = [];
  for (const L of S.staticLights) if (!L.out) gpL.push([L.x, L.y, L.r, L.I * (L.kind === 'seam' ? .6 : 1)]);
  for (const e of S.ents) {
    if (e.dead) continue;
    if (e === S.player) { gpL.push([e.x, e.y, S.hooded ? 2.4 : 8.5, S.hooded ? .45 : 1.45]); if (S.castGlow > 0) gpL.push([e.x, e.y, 6, 1.2]); }
    else if (e.light) { const k = e.type === 'zealot' ? [5.6, 1.05] : e.type === 'xbow' ? [4.2, .8] : [3, .6]; gpL.push([e.x, e.y, k[0], k[1]]); }
    if (e.burn > 0) gpL.push([e.x, e.y, 3, .8]);
  }
  for (const it of S.items) if (it.kind === 'torch') gpL.push([it.x, it.y, 1.5 + 3 * Math.min(1, it.t / 20), .9]);
  return gpL;
}
const ltCache = new Map(); let ltTick = -1;
export function resetRuleCaches() { gpL = null; gpTick = -1; ltCache.clear(); ltTick = -1; }
export function lightAtTile(x, y) { if (ltTick !== S.tickN) { ltCache.clear(); ltTick = S.tickN; } const key = I(x, y); const v0 = ltCache.get(key); if (v0 !== undefined) return v0; const v = lightAtTile0(x, y); ltCache.set(key, v); return v; }
function lightAtTile0(x, y) { let v = outdoor[I(x, y)] ? .09 : .02; for (const [lx, ly, r, In] of gpLights()) { const dx = x - lx, dy = y - ly, d2 = dx * dx + dy * dy; if (d2 >= r * r) continue; if (!los(lx, ly, x, y)) continue; const f = 1 - Math.sqrt(d2) / r; v += (f * f * .7 + f * .3) * In; } return v; }
export const seesE = e => e === S.player || (vis[I(e.x, e.y)] && (lightAtTile(e.x, e.y) > .07 || dist(e, S.player) <= 2.5 || e.light || isMinion(e) || e.type === 'hound'));

/* ---------- perception ---------- */
export function perceives(o, t) {
  if (t.dead || o.dead) return false; const d = dist(o, t);
  if (o.team === 1) { if (d > 12) return false; if (d <= 1.5) return true; if (!los(o.x, o.y, t.x, t.y)) return false; const L = lightAtTile(t.x, t.y); if (L >= .2) return true; return outdoor[I(t.x, t.y)] && d <= 4; }
  if (o.type === 'hound') { if (d <= 5) return true; if (d > 9 || !los(o.x, o.y, t.x, t.y)) return false; return lightAtTile(t.x, t.y) >= .2; }
  return d <= 8 && los(o.x, o.y, t.x, t.y);
}
export function noise(x, y, r) { for (const e of S.ents) { if (e.dead || (e.team !== 1 && e.type !== 'hound')) continue; if (Math.hypot(e.x - x, e.y - y) <= r) { if (!e.aware) e.awareT = Math.max(e.awareT, 12); e.aware = true; e.awareT = Math.max(e.awareT, 12); e.last = [x, y]; } } }

/* ---------- blows ---------- */
function pickPart(e) { let tot = 0; for (const p of e.parts) if (!p.gone) tot += p.w; let r = rnd() * tot; for (const p of e.parts) { if (p.gone) continue; r -= p.w; if (r <= 0) return p; } return e.parts[1]; }
function armourOf(e, p, type) { if (!e.gear) return 0; let v = 0; for (const sl of ['body', 'head']) { const it = e.gear[sl]; if (!it) continue; const a = armourOfItem(it)[p.k]; if (a) v += a[type] || 0; } return v; }
export function hurt(t, amount, type, src, part, quiet) {
  if (t.dead) return null; part = part || pickPart(t); const pl = S.player;
  let dmg = amount * (MAT[matOf(t)][type] ?? 1); if (src && isMinion(src) && t.mark > 0) dmg *= 1.25;
  dmg = Math.max(0, Math.round(dmg - armourOf(t, part, type)));
  const vv = seesE(t) || (src && seesE(src));
  if (dmg <= 0) { if (vv && (t === pl || src === pl) && !quiet) log(`${src ? The(src) : 'It'} ${src === pl ? 'hit' : 'hits'} ${poss(t)} ${part.name}, but it does not get through.`); return { dmg: 0, part }; }
  part.hp -= dmg;
  if (living(t)) { t.bleed += (type === 'cut' ? .5 : type === 'pierce' ? .4 : type === 'burst' ? .4 : .15) * dmg; if (t.team === 1 || t.type === 'hound') t.nerve -= 5 + dmg * 1.5; }
  const sev = dmg >= part.max * .7 ? 3 : dmg >= part.max * .4 ? 2 : dmg >= 3 ? 1 : 0;
  let lost = false;
  if (part.hp <= 0 && !part.gone && part.k !== 'torso' && part.k !== 'head') { part.gone = true; part.hp = 0; part.how = LOSSWORD[type] || 'lost'; lost = true; if (living(t)) t.bleed += 3; limbLost(t, part, type); }
  const dead = (partOf(t, 'head').hp <= 0) || (partOf(t, 'torso').hp <= 0);
  emit('hit', { t, src: src && src !== t ? src : null, dmg, type, sev, lost, dead, part: part.k });
  if (!quiet && vv) {
    const v = VERB[type] || VERB.blunt; const base = v[sev], verb = conj(base);
    if (dead) { /* the death line says it */ }
    else if (lost) log(`${src ? The(src) : 'The blast'}${src && src !== pl ? '’s ' + (curWeapon(src) || WEAP.fist).name : ''} ${src === pl ? base : verb} ${poss(t)} ${part.name}. It is ${part.how}.`, t === pl ? 'blood' : t.team === 0 ? '' : 'ember');
    else if (t === pl) log(`${src ? The(src) : 'The blast'} ${verb} your ${part.name} (${dmg}).`, 'blood');
    else if (src === pl) log(`You ${verb.replace(/s( |$)/, '$1').replace('es ', 'e ')} ${the(t)}’s ${part.name}.`);
  }
  if (dead) die(t, type, src, part);
  return { dmg, part, lost, dead };
}
function limbLost(t, p) {
  if (t.type === 'zealot' && p.k === 'armL' && t.light) { t.light = false; dropTorch(t.x, t.y); if (seesE(t)) log(`The torch falls from ${poss(t)} hand and lies burning.`, 'ember'); t.nerve -= 15; }
  if (t === S.player && !ok(S.player, 'armL') && !ok(S.player, 'armR')) log('Both your hands are useless. You cannot shape a working without them.', 'blood');
}
export function dropTorch(x, y) { const q = canWalk(x, y) ? [x, y] : findFree(x, y, 1) || [x, y]; S.items.push({ kind: 'torch', x: q[0], y: q[1], t: 28 + ri(0, 12) }); }
function hitChance(a, t) {
  let p = .74; if (living(a) && a.nerve < 40 && a !== S.player) p -= .12;
  if (living(a) && a.type !== 'hound' && lightAtTile(t.x, t.y) < .12) p -= .3;
  if (t.type === 'hound' || t.type === 'bhound') p -= .08; if (a.type === 'risen') p -= .1; if (a === S.player && S.strainT.cold > 0) p -= .15;
  return clamp(p, .1, .95);
}
export function attack(a, t, wOver) {
  const w = wOver || curWeapon(a); if (!w) return 100; if (t === S.player || isMinion(t)) a.atkT = S.turn;
  if (t.x !== a.x) a.face = Math.sign(t.x - a.x);
  emit('blow', { kind: 'melee', a, t });
  if (!t.aware && t.team === 1) { t.aware = true; t.awareT = 20; t.tgt = a; }
  if (rnd() < hitChance(a, t) + (w.hit || 0)) { const d = ri(w.dmg[0], w.dmg[1]); hurt(t, d, w.type, a); }
  else if (t === S.player && seesE(a)) log(`${The(a)} swings at you and misses.`);
  emit('blowEnd');
  return w.cost;
}
export function shoot(a, t) {
  if (t === S.player || isMinion(t)) a.atkT = S.turn; a.loaded = false; if (t.x !== a.x) a.face = Math.sign(t.x - a.x);
  emit('blow', { kind: 'shot', a, t }); const hit = rnd() < hitChance(a, t) - .08 * Math.max(0, dist(a, t) - 3);
  if (hit) { const w = WEAP.crossbow; hurt(t, ri(w.dmg[0], w.dmg[1]), 'pierce', a); }
  else if (t === S.player) log(`A crossbow bolt hisses past you.`, 'ember');
  emit('blowEnd');
  return 100;
}

/* ---------- death and remains ---------- */
function corpseKind(e) { if (e.type === 'skel') return 'bones'; if (e.type === 'bhound') return 'bhound'; if (e.type === 'rhound') return 'hound'; if (e.type === 'risen') return e.origin || 'zealot'; if (e === S.player) return 'necro'; return e.type; }
export function die(e, cause, src, part) {
  if (e.dead) return; e.dead = true; occ[I(e.x, e.y)] = null; const pl = S.player;
  const vv = seesE(e);
  if (e === pl) {
    S.gameOver = true; S.deathCause = { cause, src: src ? displayName(src) : null, part: part ? part.name : null, where: S.L.zoneNames[S.L.zone[I(e.x, e.y)]] };
    const c = { id: S.nextId++, x: e.x, y: e.y, kind: 'necro', age: 0, cause, holy: cause === 'holy', miss: missMask(e), rot: rnd() * 6.28 };
    S.corpses.push(c); S.chron.push(`Turn ${S.turn}: died.`);
    emit('death', { e, cause, corpse: c, overkill: false }); emit('playerDied'); return;
  }
  if (isMinion(e)) { S.stats.lost++; if (vv) log(cause === 'holy' ? `${The(e)} comes apart in the prayer-light. Nothing is left to call back.` : `${The(e)} falls apart.`, cause === 'holy' ? 'holy' : ''); }
  else if (vv) { const how = cause === 'holy' ? ' in a white flare' : cause === 'burst' ? ', torn open' : cause === 'soul' ? '. Something leaves it' : ''; log(`${The(e)} dies${how}.`, e.team === 1 ? 'soul' : ''); }
  if (e.team !== 0 && src && (src.team === 0)) { S.stats.killed++; S.know[e.type] = Math.max(S.know[e.type] || 0, 1); if (e.team === 1) S.notoriety += 4; }
  const overkill = cause === 'burst' && partOf(e, 'torso').hp < -8;
  let c = null;
  if (!overkill) {
    const k = corpseKind(e);
    c = { id: S.nextId++, x: e.x, y: e.y, kind: k, age: e.type === 'risen' ? 320 : 0, cause, holy: cause === 'holy', miss: missMask(e), rot: rnd() * 6.28, weapon: e.type === 'risen' || living(e) ? e.weapon : null, name: e.name || '', gear: e.gear && DEF[e.type].plan === 'human' ? e.gear : null };
    if (k === 'bones' || k === 'bhound') c.age = 999; S.corpses.push(c); if (S.corpses.length > 180) S.corpses.shift();
  }
  emit('death', { e, cause, corpse: c, overkill });
  if (e.light && e.type === 'zealot') dropTorch(e.x, e.y);
  if (e.team === 1 && !S.stress) { const it = rollLoot('mercy', 0); if (it) dropLoot(e.x, e.y, it); }
  for (const o of S.ents) { if (o.dead || o === e) continue; if (o.team === e.team && living(o) && dist(o, e) <= 7 && los(o.x, o.y, e.x, e.y)) o.nerve -= 12; }
  if (S.target === e) S.target = null;
}
export function stage(c) { if (c.kind === 'bones' || c.kind === 'bhound') return 'bone'; if (c.age < 120) return 'fresh'; if (c.age < 300) return 'bloated'; if (c.age < 620) return 'rotten'; return 'bone'; }
export function corpseName(c) {
  const st = stage(c); const nm = { zealot: 'zealot', xbow: 'bolt-warden', conf: 'confessor', hound: 'hound', necro: 'necromancer', player: 'necromancer', bones: 'old bones', bhound: 'hound bones' }[c.kind] || c.kind;
  if (c.kind === 'bones' || c.kind === 'bhound') return c.name ? `the bones of ${c.name}` : nm;
  if (st === 'bone') return (c.kind === 'hound' ? 'hound bones' : 'bones'); return `${st} ${nm}`;
}
export function massOf(c) { const st = stage(c); const base = (c.kind === 'hound' ? 7 : 10); return base * (st === 'bloated' ? 1.6 : st === 'fresh' ? 1 : st === 'rotten' ? .8 : .5); }

/* ---------- movement ---------- */
export function setPos(e, x, y) { occ[I(e.x, e.y)] = null; const dx = x - e.x, dy = y - e.y; if (dx) e.face = Math.sign(dx); if (e === S.player && (dx || dy)) e.hd = [dx, dy]; e.x = x; e.y = y; occ[I(x, y)] = e; }
function oppAttacks(e, ox, oy, nx, ny) {
  for (const [dx, dy] of DIRS) {
    const h = occ[I(clamp(ox + dx, 0, W - 1), clamp(oy + dy, 0, H - 1))]; if (!h || h === e || h.dead || !hostile(h, e)) continue;
    if (Math.max(Math.abs(h.x - nx), Math.abs(h.y - ny)) <= 1) continue; if (h.opp === S.turn || (h.team === 1 && !h.aware) || !curWeapon(h) || h.weapon === 'crossbow' && !ok(h, 'armR')) continue;
    if (h === S.player) continue; h.opp = S.turn; if (e === S.player) log(`${The(h)} strikes at you as you pull away.`, 'blood'); attack(h, e); if (e.dead) return true;
  }
  return false;
}
export function moveTo(e, x, y) {
  const ox = e.x, oy = e.y; occ[I(ox, oy)] = null;
  if (oppAttacks(e, ox, oy, x, y)) return 100;
  if (occ[I(x, y)]) { occ[I(ox, oy)] = e; return 100; }
  e.x = ox; e.y = oy; setPos(e, x, y);
  if (map[I(x, y)] === WATER) { if (e.burn) e.burn = 0; return 150; }
  return 100;
}
export function swapPos(a, b) { const ax = a.x, ay = a.y; if (a === S.player) a.hd = [b.x - ax, b.y - ay]; occ[I(ax, ay)] = b; occ[I(b.x, b.y)] = a; if (b.x !== ax) a.face = Math.sign(b.x - ax); a.x = b.x; a.y = b.y; b.x = ax; b.y = ay; return 100; }
export function stepDir(e, dx, dy, allowSwap) {
  const nx = e.x + dx, ny = e.y + dy; if (!canWalk(nx, ny)) return 0; if (dx && dy && isOpq(e.x + dx, e.y) && isOpq(e.x, e.y + dy)) return 0;
  const o = occ[I(nx, ny)]; if (o) { if (allowSwap && o.team === e.team && o !== S.player && !o.dead) return swapPos(e, o); return 0; } return moveTo(e, nx, ny);
}
export function stepField(e, f, allowSwap, away) {
  const cur = f[I(e.x, e.y)]; let best = null, bd = cur, start = (rnd() * 8) | 0;
  for (let k = 0; k < 8; k++) {
    const [dx, dy] = DIRS[(k + start) % 8]; const nx = e.x + dx, ny = e.y + dy; if (!canWalk(nx, ny)) continue;
    if (dx && dy && isOpq(e.x + dx, e.y) && isOpq(e.x, e.y + dy)) continue; const j = ny * W + nx; const o = occ[j];
    if (o && !(allowSwap && o.team === e.team && o !== S.player && o !== e)) continue;
    const v = f[j]; if (v >= 9999) continue; if (away ? v > bd : v < bd) { bd = v; best = [dx, dy]; }
  }
  if (!best) return 0; return stepDir(e, best[0], best[1], allowSwap);
}
export function wander(e, home, r) {
  if (rnd() < .5) return 100; const d = DIRS[(rnd() * 8) | 0]; const nx = e.x + d[0], ny = e.y + d[1];
  if (home && Math.hypot(nx - home[0], ny - home[1]) > (r || 4)) return 100; if (canWalk(nx, ny) && !occ[I(nx, ny)] && !(map[I(nx, ny)] === WATER && e.team === 1)) moveTo(e, nx, ny); return 100;
}
export function adjFoe(e, pref) {
  let best = null; for (const [dx, dy] of DIRS) {
    const nx = e.x + dx, ny = e.y + dy; if (!inb(nx, ny)) continue; const o = occ[ny * W + nx];
    if (!o || !hostile(e, o)) continue; if (dx && dy && isOpq(e.x + dx, e.y) && isOpq(e.x, e.y + dy)) continue; if (o === pref) return o; if (!best || (o.mark > 0 && !best.mark) || (o.mark > 0) === (best.mark > 0) && o === S.player) best = o;
  } return best;
}
export function nearestHostile(e, r, pred) { let best = null, bd = r; for (const o of S.ents) { if (o.dead || !hostile(e, o)) continue; const d = dist(e, o); if (d > bd) continue; if (pred && !pred(o)) continue; bd = d; best = o; } return best; }
export function nearestAlly(e) { let b = null, bd = 99; for (const o of S.ents) { if (o === e || o.dead || o.team !== e.team) continue; const d = dist(e, o); if (d < bd) { bd = d; b = o; } } return b; }

/* ---------- formation ---------- */
// your dead keep places around you, turned toward where you are heading
const FORM = [[1, -1], [1, 1], [-1, -1], [-1, 1], [2, 0], [0, -2], [0, 2], [-2, 0], [2, -2], [2, 2], [-2, -2], [-2, 2], [3, -1], [3, 1], [-3, -1], [-3, 1], [1, -3], [1, 3], [-1, -3], [-1, 3]];
let formTurn = -1, formKey = '';
export const formSlot = new Map();
function rotH(o, h) { const [x, y] = o; return h === 0 ? [x, y] : h === 1 ? [-y, x] : h === 2 ? [-x, -y] : [y, -x]; }
function heading() { const d = S.player.hd || [1, 0]; return Math.abs(d[0]) >= Math.abs(d[1]) ? (d[0] >= 0 ? 0 : 2) : (d[1] >= 0 ? 1 : 3); }
export function assignFormation() {
  const pl = S.player; const ms = S.ents.filter(m => isMinion(m) && !m.idle).sort((a, b) => a.id - b.id); const h = heading();
  const key = `${pl.x},${pl.y},${h},${S.stance},${ms.map(m => m.id).join('.')}`; if (key === formKey && formTurn === S.turn) return; formKey = key; formTurn = S.turn; formSlot.clear();
  const taken = new Set();
  for (let k = 0; k < ms.length && k < FORM.length; k++) {
    const o = rotH(FORM[k], h); const tx = pl.x + o[0], ty = pl.y + o[1]; let best = null, bd = 99;
    for (let r = 0; r <= 2 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy; if (!canWalk(x, y)) continue; const i = I(x, y); if (taken.has(i) || (x === pl.x && y === pl.y)) continue;
      const o2 = occ[i]; if (o2 && !isMinion(o2)) continue; if (!los(pl.x, pl.y, x, y)) continue; const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = [x, y]; }
    }
    if (best) { taken.add(I(best[0], best[1])); formSlot.set(ms[k].id, best); }
  }
}
export function resetFormation() { formTurn = -1; formKey = ''; formSlot.clear(); }
export function keepFormation(e) {
  assignFormation(); const s = formSlot.get(e.id); const d = cheb(e, S.player);
  if (s && e.x === s[0] && e.y === s[1]) { if (S.player.hd && S.player.hd[0]) e.face = Math.sign(S.player.hd[0]); return 100; }
  if (!s && d <= 3) return 100;
  // far away: flow toward you along one shared field; close in: take your place in the ring
  const f = !s || d > 3 ? fieldTo(S.player.x, S.player.y) : fieldTo(s[0], s[1]);
  return flowStep(e, f) || 100;
}
// step downhill; only shoulder past one of your dead if it is already standing in its place
function flowStep(e, f) {
  const cur = f[I(e.x, e.y)]; let best = null, bv = cur, swap = null, sv = cur;
  for (const [dx, dy] of DIRS) {
    const nx = e.x + dx, ny = e.y + dy; if (!canWalk(nx, ny)) continue; if (dx && dy && isOpq(e.x + dx, e.y) && isOpq(e.x, e.y + dy)) continue;
    const j = I(nx, ny), v = f[j]; if (v >= 9999) continue; const o = occ[j];
    if (!o) { if (v < bv) { bv = v; best = [dx, dy]; } }
    else if (isMinion(o) && v < sv) { const os = formSlot.get(o.id); if (!os || (o.x === os[0] && o.y === os[1])) { sv = v; swap = [dx, dy]; } }
  }
  if (best) return stepDir(e, best[0], best[1], false);
  if (swap) return stepDir(e, swap[0], swap[1], true);
  return 0;
}
export function stragglers() { if (S.stance === 'hold') return false; return S.ents.some(m => isMinion(m) && !m.idle && cheb(m, S.player) > 4 && !adjFoe(m)); }
export { N };
