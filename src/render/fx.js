// Effects: particles, blows, explosions. The rules resolve a turn at once; this side plays it back in order, with weight.
import { S } from '../core/state.js';
import { onEvent } from '../core/events.js';
import { I, vis, dist } from '../core/level.js';
import { living } from '../core/rules.js';
import { stampBlood, stampScorch, artOpenGrave, artOpenSeal } from './mapart.js';
import { rebuildLights } from './light.js';
import { RS, q } from './rstate.js';

/* ---------- particles: one fixed pool, no garbage ---------- */
const PM = 2400;
export const pX = new Float32Array(PM), pY = new Float32Array(PM), pZ = new Float32Array(PM), pL = new Float32Array(PM), pMx = new Float32Array(PM), pS = new Float32Array(PM),
  pR = new Uint8Array(PM), pGg = new Uint8Array(PM), pB = new Uint8Array(PM), pK = new Uint8Array(PM);
const pVX = new Float32Array(PM), pVY = new Float32Array(PM), pVZ = new Float32Array(PM), pG = new Float32Array(PM);
export let pn = 0; let smokeN = 0;
// kinds: 0 matter (blood, bone, grit), 1 sparks and embers that glow, 2 smoke, 3 souls drawn toward you
export function addP(x, y, z, vx, vy, vz, max, size, col, kind, grav) {
  const cap = q().parts; if (pn >= cap) return; if (kind === 2 && smokeN >= (RS.qLevel > 1 ? 16 : 32)) return;
  const i = pn++; pX[i] = x; pY[i] = y; pZ[i] = z; pVX[i] = vx; pVY[i] = vy; pVZ[i] = vz; pL[i] = 0; pMx[i] = max; pS[i] = size; pR[i] = col[0]; pGg[i] = col[1]; pB[i] = col[2]; pK[i] = kind; pG[i] = grav; if (kind === 2) smokeN++;
}
export function burst(x, y, n, col, o) {
  o = o || {}; const qq = RS.qLevel > 1 ? .5 : 1; n = Math.max(1, Math.round(n * qq));
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, sp = (o.sp || 1.5) * (.3 + Math.random());
    addP(x + (Math.random() - .5) * .3, y + (Math.random() - .5) * .3, o.z ?? .4, Math.cos(a) * sp, Math.sin(a) * sp * .6, (o.vz ?? 1.5) * (.5 + Math.random()), (o.life || .7) * (.6 + Math.random() * .8), o.size || .06, col, o.kind ?? 0, o.grav ?? 6);
  }
}
export function updateParticles(dt) {
  smokeN = 0; const pl = S.player, tx = pl ? pl.rx + .5 : 0, ty = pl ? pl.ry + .5 : 0;
  for (let i = 0; i < pn; i++) {
    pL[i] += dt;
    if (pL[i] >= pMx[i]) { const j = --pn; pX[i] = pX[j]; pY[i] = pY[j]; pZ[i] = pZ[j]; pVX[i] = pVX[j]; pVY[i] = pVY[j]; pVZ[i] = pVZ[j]; pL[i] = pL[j]; pMx[i] = pMx[j]; pS[i] = pS[j]; pG[i] = pG[j]; pR[i] = pR[j]; pGg[i] = pGg[j]; pB[i] = pB[j]; pK[i] = pK[j]; i--; continue; }
    const k = pK[i]; if (k === 2) smokeN++;
    if (k === 3) { const dx = tx - pX[i], dy = ty - pY[i]; pVX[i] += dx * dt * 4; pVY[i] += dy * dt * 4; pVX[i] *= .97; pVY[i] *= .97; if (dx * dx + dy * dy < .2) pL[i] = pMx[i]; }
    pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt; pZ[i] += pVZ[i] * dt; pVZ[i] -= pG[i] * dt; if (pZ[i] < 0) { pZ[i] = 0; pVZ[i] *= -.3; pVX[i] *= .6; pVY[i] *= .6; }
  }
}

/* ---------- effects ---------- */
export let projs = [], blasts = [], columns = [], rings = [], pulses = [], ghosts = [];
export const FX = { shake: 0, screenFlash: null, hitStop: 0 };
// impact queue: each blow of the turn lands in order, a beat apart
const FXQ = []; let fxDelay = 0, hitAt = null, hitFrom = null, curFxT = 0;
function fxStep() { const st = S.stress ? 6 : RS.animFast ? 22 : 70, cap = S.stress ? 120 : RS.animFast ? 300 : 900; fxDelay = Math.min(fxDelay + st, cap); }
function fxAt(ms, fn) { FXQ.push({ at: performance.now() + ms, fn }); }
export function runFXQ() { if (!FXQ.length) return; const now = performance.now(); for (let i = 0; i < FXQ.length; i++) { const qq = FXQ[i]; if (qq.at <= now) { FXQ.splice(i, 1); i--; qq.fn(); } } }
const onScreen = t => vis[I(t.x, t.y)];
const cx = e => e.x + .5, cyy = e => e.y + .5;
// one blow landing: flash, recoil, spray along the line of the blow, hit-stop and shake by how hard it was
function impactFX(t, dx, dy, dmg, type, sev, lost, dead) {
  const X = t.x + .5, Y = t.y + .5; const seen = onScreen(t);
  t.flash = .18 + .06 * sev; const k = .1 + .07 * sev + (dead ? .12 : 0); t.ax += dx * k; t.ay += dy * k;
  const liv = living(t) || t === S.player; const n = Math.round(Math.min(26, 4 + dmg * 1.6 + sev * 3)); const sp = 1.6 + sev * .9;
  const col = liv ? [118, 12, 16] : [214, 204, 182], col2 = liv ? [70, 6, 8] : [150, 142, 126];
  for (let i = 0; i < n; i++) { const a = Math.atan2(dy, dx) + (Math.random() - .5) * (1.3 - sev * .18), v = sp * (.4 + Math.random()); addP(X + dx * .2, Y + dy * .2, .45 + Math.random() * .3, Math.cos(a) * v, Math.sin(a) * v * .65, 1 + Math.random() * 2.2, .5 + Math.random() * .6, .035 + Math.random() * .045, i % 3 ? col : col2, 0, 9); }
  if (!liv) burst(X, Y, 3 + sev * 2, [90, 86, 80], { kind: 2, vz: .5, grav: -.1, life: .9, size: .18, sp: .5 });
  // the bright instant of contact
  const hc = type === 'soul' ? [140, 255, 180] : type === 'holy' ? [255, 240, 200] : type === 'burst' ? [200, 255, 170] : liv ? [255, 170, 140] : [240, 232, 210];
  for (let i = 0; i < 3 + sev * 2; i++) { const a = Math.atan2(dy, dx) + (Math.random() - .5) * 1.6, v = 2 + Math.random() * 3; addP(X, Y, .5, Math.cos(a) * v, Math.sin(a) * v * .6, .6 + Math.random(), .12 + Math.random() * .12, .03, hc, 1, 0); }
  if (sev >= 1) rings.push({ x: X, y: Y, t: 0, dur: .16 + sev * .04, R: .35 + sev * .18, c: hc });
  if (sev >= 2) pulses.push({ x: X, y: Y, t: 0, dur: .18, r: 1.6 + sev * .4, c: [hc[0] / 255, hc[1] / 255, hc[2] / 255], I: .5 + sev * .2 });
  if (liv && Math.random() < .85) stampBlood(X + dx * .35 + (Math.random() - .5) * .4, Y + dy * .3 + (Math.random() - .5) * .3, Math.min(1.8, .4 + dmg / 5));
  if (lost) { // a limb comes away: one heavy chunk and a spurt
    for (let i = 0; i < 2; i++) addP(X, Y, .6, dx * (1.6 + Math.random()) + (Math.random() - .5), dy * (1.2 + Math.random()) * .6 + (Math.random() - .5) * .5, 3 + Math.random() * 1.5, 1.6, .11 + Math.random() * .04, liv ? [86, 24, 22] : [206, 196, 170], 0, 9);
    if (liv) for (let i = 0; i < 10; i++) addP(X, Y, .5, dx * 2 + (Math.random() - .5) * 2, dy * 1.4 + (Math.random() - .5) * 1.2, 2 + Math.random() * 2.5, .8, .04, [130, 10, 14], 0, 9);
  }
  if (seen) {
    FX.hitStop = Math.max(FX.hitStop, sev >= 3 || dead ? .085 : sev >= 2 ? .05 : sev >= 1 ? .025 : 0);
    FX.shake = Math.max(FX.shake, t === S.player ? .12 + .05 * sev : dead ? .09 : sev >= 2 ? .05 : 0);
    if (t === S.player && sev >= 2) FX.screenFlash = { c: [160, 20, 20], a: .16 };
  }
}
function deathFX(e) {
  const X = e.x + .5, Y = e.y + .5;
  if (living(e)) { burst(X, Y, 10, [110, 10, 14], { grav: 9, sp: 2.2, vz: 2, size: .05 }); for (let k = 0; k < 2; k++) stampBlood(X + (Math.random() - .5) * .8, Y + (Math.random() - .5) * .6, 1.2); }
  else { // the dead come apart: bones everywhere, dust
    const n = RS.qLevel > 1 ? 10 : 18; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 3; addP(X, Y, .6, Math.cos(a) * v, Math.sin(a) * v * .6, 2 + Math.random() * 2.5, 1.2 + Math.random() * .8, .04 + Math.random() * .06, Math.random() < .7 ? [214, 206, 184] : [160, 150, 130], 0, 9); }
    burst(X, Y, 6, [80, 76, 70], { kind: 2, vz: .6, grav: -.1, life: 1.2, size: .25, sp: .7 });
  }
  if (onScreen(e)) FX.shake = Math.max(FX.shake, .08);
}
export function resetFX() { projs = []; blasts = []; columns = []; rings = []; pulses = []; ghosts = []; FX.shake = 0; FX.screenFlash = null; FX.hitStop = 0; pn = 0; FXQ.length = 0; fxDelay = 0; hitAt = null; hitFrom = null; }
function fxGibs(e) { burst(cx(e), cyy(e), 16, [90, 10, 12], { grav: 9, sp: 3, vz: 2.5, size: .07 }); for (let k = 0; k < 3; k++) stampBlood(cx(e) + (Math.random() - .5) * 1.4, cyy(e) + (Math.random() - .5) * 1.2, 1.4); }
function fxSoul(e) { burst(cx(e), cyy(e), 5, [130, 255, 170], { kind: 3, vz: 1.6, grav: -.5, life: 1.6, size: .07 }); }
function fxDust(x, y, n) { burst(x + .5, y + .5, Math.min(8, 2 + n), [200, 192, 170], { grav: 9, sp: 1.4, size: .05 }); }
function fxShot(a, t) { projs.push({ kind: 'shot', x0: cx(a), y0: cyy(a), x1: cx(t), y1: cyy(t), t: 0, dur: .06 + dist(a, t) * .02 }); }
function fxBoltShot(a, t) { projs.push({ kind: 'soul', x0: cx(a), y0: cyy(a), x1: cx(t), y1: cyy(t), t: 0, dur: .08 + dist(a, t) * .025 }); }
function fxHoly(x, y) { columns.push({ x: x + .5, y: y + .5, t: 0, dur: .9 }); burst(x + .5, y + .5, 14, [255, 240, 200], { kind: 1, vz: 3, grav: -1.5, life: 1, size: .05, sp: .6 }); FX.screenFlash = { c: [255, 240, 210], a: .12 }; }
function fxRaise(x, y) { burst(x + .5, y + .5, 14, [120, 255, 160], { kind: 1, vz: 2.4, grav: -1.2, life: 1, size: .06 }); pulses.push({ x: x + .5, y: y + .5, t: 0, dur: .8, r: 3, c: [.35, 1, .55], I: 1.1 }); }
function fxExplode(x, y, kind, R) {
  const X = x + .5, Y = y + .5; blasts.push({ x: X, y: Y, t: 0, dur: .65, kind, R }); stampScorch(X, Y, R * .85, kind);
  FX.shake = Math.max(FX.shake, kind === 'rot' ? .42 : .32); FX.screenFlash = { c: kind === 'rot' ? [170, 220, 110] : [110, 255, 150], a: .26 }; FX.hitStop = Math.max(FX.hitStop, .11);
  rings.push({ x: X, y: Y, t: 0, dur: .42, R: R * 1.6, c: kind === 'rot' ? [200, 240, 140] : [160, 255, 190] }); rings.push({ x: X, y: Y, t: 0, dur: .25, R: R * .9, c: [255, 255, 240] });
  pulses.push({ x: X, y: Y, t: 0, dur: .35, r: R * 3, c: kind === 'rot' ? [.8, 1, .5] : [.5, 1, .7], I: 2.2 });
  for (const e of S.ents) { if (e.dead) continue; const d = Math.hypot(e.x + .5 - X, e.y + .5 - Y); if (d > R * 1.6 || d < .1) continue; const f = (1 - d / (R * 1.6)) * .55; e.ax += (e.x + .5 - X) / d * f; e.ay += (e.y + .5 - Y) / d * f; }
  { const nc = RS.qLevel > 1 ? 4 : 8; for (let k = 0; k < nc; k++) { const a = Math.random() * 6.283, v = 2.5 + Math.random() * 3; addP(X, Y, .5, Math.cos(a) * v, Math.sin(a) * v * .6, 3.5 + Math.random() * 2, 1.6 + Math.random() * .6, .09 + Math.random() * .06, kind === 'rot' ? [92, 30, 24] : [206, 196, 170], 0, 9); } }
  const hot = kind === 'rot' ? [[190, 230, 120], [120, 170, 60], [230, 250, 190]] : [[120, 255, 160], [60, 200, 110], [220, 255, 230]];
  const ne = Math.round((kind === 'rot' ? 40 : 34) * (RS.qLevel > 1 ? .5 : 1)); for (let k = 0; k < ne; k++) { const c = hot[k % 3]; const a = Math.random() * 6.283, sp = 3.2 * (.3 + Math.random()); addP(X, Y, .4, Math.cos(a) * sp, Math.sin(a) * sp * .6, 2.8 * (.5 + Math.random()), .9 * (.6 + Math.random() * .8), .06 + Math.random() * .05, c, 1, 1.2); }
  const ns = RS.qLevel > 1 ? 4 : 9; for (let k = 0; k < ns; k++) { const a = Math.random() * 6.28, sp = .4 + Math.random() * .9; addP(X + Math.cos(a) * .3, Y + Math.sin(a) * .3, .3, Math.cos(a) * sp, Math.sin(a) * sp * .6, .5 + Math.random() * .6, 1.4 + Math.random() * 1.2, .3 + Math.random() * .25, kind === 'rot' ? [26, 30, 18] : [18, 20, 18], 2, -.15); }
  burst(x, y, kind === 'rot' ? 10 : 16, kind === 'rot' ? [80, 20, 14] : [214, 206, 184], { sp: 3.5, vz: 3, grav: 9, size: .05, life: 1 });
}
function fxBreath(x, y) { burst(x + .5, y + .5, 12, [200, 40, 50], { kind: 3, vz: 1, grav: -.2, life: 1, size: .06, sp: 2 }); }
function fxMark(x, y) { rings.push({ x: x + .5, y: y + .5, t: 0, dur: .8, R: 1.6, c: [60, 200, 110], shrink: true }); }
function fxSnuff(x, y) { for (let k = 0; k < 3; k++) addP(x + .5 + (Math.random() - .5) * .2, y + .5, .8, (Math.random() - .5) * .2, (Math.random() - .5) * .1, .4 + Math.random() * .3, 1.6, .18, [40, 38, 36], 2, -.1); }
function fxDarkRing(x, y, R) { rings.push({ x: x + .5, y: y + .5, t: 0, dur: .9, R, c: [30, 60, 40], shrink: true, dark: true }); }
export function projPos(p) { const k = Math.min(1, p.t / p.dur); return [p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k]; }
// renderer-only fields every creature carries
export function dressEnt(e) { e.rx = e.x; e.ry = e.y; e.ax = 0; e.ay = 0; e.flash = 0; }

// what the rules did, turned into what you see
export function installFX() {
  onEvent((type, d) => {
    switch (type) {
      case 'act': fxDelay = 0; break;
      case 'spawn': dressEnt(d); break;
      case 'blow': {
        if (d.kind === 'melee') { const a = d.a, t = d.t, d0 = fxDelay, lx = (t.x - a.x) * .42, ly = (t.y - a.y) * .42; fxAt(d0, () => { a.ax = lx; a.ay = ly; }); hitAt = d0 + 65; fxStep(); }
        else if (d.kind === 'shot') fxShot(d.a, d.t);
        else if (d.kind === 'bolt') { fxBoltShot(d.a, d.t); hitAt = fxDelay + (.08 + dist(d.a, d.t) * .025) * 1000; }
        else if (d.kind === 'burst') { const d0 = fxDelay, kd = d.rot ? 'rot' : 'bone'; fxAt(d0, () => fxExplode(d.x, d.y, kd, d.R)); hitAt = d0 + 40; hitFrom = [d.x, d.y]; fxStep(); }
        break;
      }
      case 'blowEnd': hitAt = null; hitFrom = null; break;
      case 'hit': {
        const at = hitAt ?? fxDelay; if (hitAt === null) fxStep(); curFxT = performance.now() + at;
        const t = d.t; let dx = 0, dy = 0; const fr = d.src ? d.src : hitFrom ? { x: hitFrom[0], y: hitFrom[1] } : null;
        if (fr) { const l = Math.hypot(t.x - fr.x, t.y - fr.y) || 1; dx = (t.x - fr.x) / l; dy = (t.y - fr.y) / l; } else { const a = Math.random() * 6.283; dx = Math.cos(a) * .4; dy = Math.sin(a) * .4; }
        fxAt(at, () => impactFX(t, dx, dy, d.dmg, d.type, d.sev, d.lost, d.dead));
        break;
      }
      case 'death': {
        const e = d.e, fT = Math.max(curFxT, performance.now());
        if (e !== S.player && vis[I(e.x, e.y)]) { e.ghostAt = fT; ghosts.push(e); }
        if (d.corpse) d.corpse.showAt = fT + 90;
        fxAt(fT - performance.now(), () => { if (d.overkill) fxGibs(e); deathFX(e); if (living(e)) fxSoul(e); });
        break;
      }
      case 'fx': {
        const { k, x, y } = d;
        if (k === 'dust') fxDust(x, y, d.n || 3); else if (k === 'raise') fxRaise(x, y); else if (k === 'holy') fxHoly(x, y); else if (k === 'breath') fxBreath(x, y);
        else if (k === 'mark') fxMark(x, y); else if (k === 'snuff') fxSnuff(x, y); else if (k === 'darkRing') fxDarkRing(x, y, d.R);
        break;
      }
      case 'flash': d.e.flash = d.a; break;
      case 'grave': artOpenGrave(d.x, d.y); break;
      case 'mapChanged': if (d.what === 'seal') artOpenSeal(d.x, d.y); rebuildLights(); break;
    }
  });
}
export function updateFX(dt) {
  for (const p of projs) p.t += dt;
  for (const p of projs) if (p.t >= p.dur && !p.done) { p.done = 1; if (p.kind === 'soul') burst(p.x1, p.y1, 8, [120, 255, 160], { kind: 1, vz: 1.5, grav: 2, life: .5, size: .05 }); }
  projs = projs.filter(p => p.t < p.dur + .05);
  for (const b of blasts) b.t += dt; blasts = blasts.filter(b => b.t < b.dur);
  for (const c of columns) c.t += dt; columns = columns.filter(c => c.t < c.dur);
  for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < r.dur);
  for (const p of pulses) p.t += dt; pulses = pulses.filter(p => p.t < p.dur);
  { const nw = performance.now(); ghosts = ghosts.filter(e => nw < e.ghostAt + 220); }
  FX.shake *= Math.exp(-dt * 7); if (FX.screenFlash) { FX.screenFlash.a -= dt * 1.1; if (FX.screenFlash.a <= 0) FX.screenFlash = null; }
  for (const L of S.staticLights) if (L.kind === 'braz' && !L.out && vis[I(L.x, L.y)] && Math.random() < dt * 4) addP(L.x + .5 + (Math.random() - .5) * .3, L.y + .5, .6, (Math.random() - .5) * .3, 0, .8 + Math.random() * .6, 1 + Math.random(), .035, [255, 150, 60], 1, -.2);
  for (const it of S.items) if (it.kind === 'torch' && vis[I(it.x, it.y)] && Math.random() < dt * 3) addP(it.x + .5, it.y + .5, .2, (Math.random() - .5) * .3, 0, .7, .7, .03, [255, 160, 60], 1, -.2);
  for (const e of S.ents) if (e.burn > 0 && !e.dead && Math.random() < dt * 14) addP(e.rx + .5 + (Math.random() - .5) * .4, e.ry + .5, .15 + Math.random() * .5, 0, 0, .8 + Math.random(), .5, .06, Math.random() < .5 ? [255, 140, 40] : [255, 205, 95], 1, -.5);
}
