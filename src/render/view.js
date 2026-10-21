// The frame: map image, things on the ground, figures, effects, then the light buffer multiplied over all of it.
import { S } from '../core/state.js';
import { W, H, I, inb, map, seen, vis, BLK, GRAVE, los } from '../core/level.js';
import { GEAR, QCOL, CHESTNAME } from '../core/content.js';
import { hostile, seesE, partOf, corpseName, itemName } from '../core/rules.js';
import { mapReal, RB, mk, rgb, line, ell, fogPat } from './mapart.js';
import { hlCv, dynLights } from './light.js';
import { pn, pX, pY, pZ, pS, pL, pMx, pR, pGg, pB, pK, projs, blasts, columns, rings, ghosts, FX, projPos } from './fx.js';
import { figSprite, corpseSprite, getShadow, shadowDir, glow, flame, emitFor, spriteScale } from './figures.js';
import { icoPath } from '../ui/icons.js';
import { RS, q, V, $ } from './rstate.js';

export const cv = $('#cv'), ctx = cv.getContext('2d', { alpha: false });
let vign = null, redVign = null, grainPat = null;
function makeVign() {
  vign = mk(cv.width, cv.height); const g = vign.getContext('2d'); const R = Math.hypot(cv.width, cv.height) / 2;
  const gr = g.createRadialGradient(cv.width / 2, cv.height / 2, R * .45, cv.width / 2, cv.height / 2, R); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  redVign = mk(cv.width, cv.height); const r = redVign.getContext('2d'); const g2 = r.createRadialGradient(cv.width / 2, cv.height / 2, R * .3, cv.width / 2, cv.height / 2, R); g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, 'rgba(150,0,0,.9)'); r.fillStyle = g2; r.fillRect(0, 0, cv.width, cv.height);
}
function drawGrain(a) {
  if (!grainPat) { const g = mk(256, 256), x = g.getContext('2d'), im = x.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); grainPat = ctx.createPattern(g, 'repeat'); }
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a; ctx.translate(-(Math.random() * 256 | 0), -(Math.random() * 256 | 0)); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, cv.width + 256, cv.height + 256); ctx.restore();
}
export function resize() {
  RS.DPR = Math.min(2, window.devicePixelRatio || 1); RS.CW = cv.clientWidth || innerWidth; RS.CH = cv.clientHeight || innerHeight;
  const k = q().scale; cv.width = Math.round(RS.CW * RS.DPR * k); cv.height = Math.round(RS.CH * RS.DPR * k); vign = null;
  if (RS.CW < 600 && RS.zoom > .9) RS.zoom = .8;
}
const scaleS = () => 32 * RS.zoom * V.zoomMul * RS.DPR * q().scale;
export function screenToTile(px, py) { const v = RS.view, k = RS.DPR * q().scale; return [Math.floor((px * k + v.ox) / v.s), Math.floor((py * k + v.oy) / v.s)]; }

export function render(t) {
  const c = ctx, vw = cv.width, vh = cv.height, s = scaleS(), u = s / 32, pl = S.player;
  spriteScale(u);
  const sx = (Math.random() - .5) * FX.shake, sy = (Math.random() - .5) * FX.shake;
  const ox = (RS.camX + sx) * s - vw / 2, oy = (RS.camY + sy) * s - vh / 2; const proj = (x, y, z) => [x * s - ox, (y - z) * s - oy];
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, vw, vh); c.imageSmoothingEnabled = true;
  const tx0 = Math.max(0, Math.floor(ox / s)), ty0 = Math.max(0, Math.floor(oy / s)), tx1 = Math.min(W, Math.ceil((ox + vw) / s)), ty1 = Math.min(H, Math.ceil((oy + vh) / s));
  if (tx1 > tx0 && ty1 > ty0 && mapReal) c.drawImage(mapReal, tx0 * RB, ty0 * RB, (tx1 - tx0) * RB, (ty1 - ty0) * RB, tx0 * s - ox, ty0 * s - oy, (tx1 - tx0) * s, (ty1 - ty0) * s);
  const inView = (x, y) => x >= tx0 - 1 && x <= tx1 && y >= ty0 - 1 && y <= ty1;
  // things on the ground
  for (const it of S.items) {
    if (!seen[I(it.x, it.y)] || !inView(it.x, it.y)) continue; const X = (it.x + .5) * s - ox, Y = (it.y + .5) * s - oy;
    if (it.kind === 'tome') { c.setTransform(u, 0, 0, u, X, Y); c.rotate(.3); c.fillStyle = '#2a1c16'; c.fillRect(-6, -4.5, 12, 9); c.fillStyle = '#3e2a1e'; c.fillRect(-6, -4.5, 12, 1.6); c.fillStyle = '#8a7a5a'; c.fillRect(4, -1, 2.4, 2); c.strokeStyle = '#c8bc9c'; c.lineWidth = .5; line(c, -5, 4, 5, 4); }
    else if (it.kind === 'tablet') { c.setTransform(u, 0, 0, u, X, Y); c.rotate(-.4); c.fillStyle = '#55585c'; ell(c, 0, 0, 7, 2.6); c.fillStyle = '#3a3c40'; ell(c, -6.6, 0, 1.2, 2.6); c.strokeStyle = '#8a8478'; c.lineWidth = .9; line(c, -2, -3, -2, 3); }
    else if (it.kind === 'torch') { c.setTransform(u, 0, 0, u, X, Y); c.rotate(1.1); c.strokeStyle = '#33251a'; c.lineWidth = 2; line(c, -6, 0, 6, 0); c.fillStyle = '#21170f'; ell(c, 6.6, 0, 2, 1.6); }
    else if (it.kind === 'loot') { const pth = icoPath(GEAR[it.item.b].icon); c.setTransform(u * .6, 0, 0, u * .6, X - 7.2 * u, Y - 6 * u); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = 'rgba(0,0,0,.75)'; c.stroke(pth); c.lineWidth = 1.7; c.strokeStyle = QCOL[it.item.q]; c.stroke(pth); }
  }
  for (const ch of S.chests) {
    if (!seen[I(ch.x, ch.y)] || !inView(ch.x, ch.y)) continue; const X = (ch.x + .5) * s - ox, Y = (ch.y + .5) * s - oy; c.setTransform(u, 0, 0, u, X, Y);
    if (ch.kind === 'sarc') { if (ch.open) { c.fillStyle = 'rgba(4,3,5,.85)'; c.fillRect(-8, -5, 16, 10); c.fillStyle = '#57534e'; c.fillRect(-3, -12, 17, 6); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-3, -6, 17, 1.5); } }
    else if (ch.kind === 'pack') { c.fillStyle = '#3a2e22'; ell(c, 0, 2, 8, 6); c.fillStyle = '#2a2018'; ell(c, -1, -3, 4, 3); c.strokeStyle = '#6b5a42'; c.lineWidth = 1; line(c, -5, -1, 4, -2); if (ch.open) { c.fillStyle = '#0d0907'; ell(c, -1, -3, 2.6, 1.8); } }
    else {
      const w = ch.kind === 'box' ? 16 : 20, hw = w / 2; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-hw + 1, 6, w, 2.5); c.fillStyle = ch.kind === 'alms' ? '#2e2a26' : '#2c2017'; c.fillRect(-hw, -5, w, 11); c.fillStyle = '#5f574d'; c.fillRect(-hw, -5, 2, 11); c.fillRect(hw - 2, -5, 2, 11);
      if (ch.open) { c.fillStyle = '#0c0907'; c.fillRect(-hw + 2, -5, w - 4, 3); c.fillStyle = ch.kind === 'alms' ? '#3a3530' : '#3a2a1d'; c.fillRect(-hw, -12, w, 4); c.fillStyle = '#5f574d'; c.fillRect(-hw, -12, 2, 4); c.fillRect(hw - 2, -12, 2, 4); }
      else { c.fillStyle = ch.kind === 'alms' ? '#3a3530' : '#3a2a1d'; c.fillRect(-hw, -9, w, 4.5); c.fillStyle = '#5f574d'; c.fillRect(-hw, -9, 2, 4.5); c.fillRect(hw - 2, -9, 2, 4.5); c.fillStyle = ch.kind === 'alms' ? '#c9b98a' : '#8a7a5a'; c.fillRect(-1.3, -5.6, 2.6, 3.2); }
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  const nowMs = performance.now();
  for (const k of S.corpses) { if (!vis[I(k.x, k.y)] || !inView(k.x, k.y) || k.showAt > nowMs) continue; const sp = corpseSprite(k, u); const X = (k.x + .5) * s - ox, Y = (k.y + .5) * s - oy; c.drawImage(sp.c, X - sp.ox, Y - sp.oy); }
  const vs = []; for (const e of S.ents) if (!e.dead && vis[I(e.x, e.y)] && inView(e.x, e.y)) vs.push(e); vs.sort((a, b) => a.ry - b.ry);
  const sh = getShadow();
  for (const e of vs) {
    const X = (e.rx + e.ax + .5) * s - ox, Y = (e.ry + e.ay + .5) * s - oy + s * .36;
    c.globalAlpha = .6; c.drawImage(sh, X - s * .24, Y - s * .08, s * .48, s * .16);
    let best = null, bf = 0; const ex = e.rx + .5, ey = e.ry + .5;
    for (const L of dynLights) { if (L.k !== 'lantern' && L.k !== 'torch') continue; const dx = ex - L.x, dy = ey - L.y, d = Math.hypot(dx, dy); if (d < .35 || d > L.r) continue; const f = L.I * (1 - d / L.r); if (f > bf) { bf = f; best = [dx / d, dy / d, d]; } }
    if (best) { const len = Math.min(1.7, .3 + best[2] * .18) * s; const z = 128 * len / 60; c.globalAlpha = Math.min(.7, bf * 1.1); c.drawImage(shadowDir(Math.atan2(best[1], best[0])), X - z / 2, Y - z / 2, z, z); }
  }
  c.globalAlpha = 1;
  for (const e of vs) { const X = (e.rx + e.ax + .5) * s - ox, Y = (e.ry + e.ay + .5) * s - oy + s * .36 + Math.sin(t * 2.2 + e.id) * .012 * s; const sp = figSprite(e, u); c.drawImage(sp.c, X - sp.ox, Y - sp.oy); }
  for (const e of ghosts) { if (!inView(e.x, e.y)) continue; const k2 = Math.max(0, (nowMs - e.ghostAt) / 220); c.globalAlpha = 1 - k2; const X = (e.rx + e.ax + .5) * s - ox, Y = (e.ry + e.ay + .5) * s - oy + s * .36 + k2 * s * .15; const sp = figSprite(e, u); c.drawImage(sp.c, X - sp.ox, Y - sp.oy); c.globalAlpha = 1; }
  for (let i = 0; i < pn; i++) { if (pK[i] !== 0) continue; const X = pX[i] * s - ox, Y = (pY[i] - pZ[i]) * s - oy; if (X < -20 || Y < -20 || X > vw + 20 || Y > vh + 20) continue; c.fillStyle = rgb(pR[i], pGg[i], pB[i]); const z = Math.max(1, pS[i] * s); c.fillRect(X - z / 2, Y - z / 2, z, z); }
  // ground fog that only shows in light
  if (q().fog && fogPat) { c.save(); c.globalAlpha = V.fogA; const k = s / 18, sp = .3; c.setTransform(k, 0, 0, k, -ox + t * sp * s, -oy + t * sp * s * .3); c.fillStyle = fogPat; c.fillRect((ox - t * sp * s) / k, (oy - t * sp * s * .3) / k, vw / k, vh / k); c.restore(); }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.drawImage(hlCv, -ox, -oy, W * s, H * s);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; { const mx = -ox, my = -oy, mw = W * s, mh = H * s; if (mx > 0) c.fillRect(0, 0, mx, vh); if (my > 0) c.fillRect(0, 0, vw, my); if (mx + mw < vw) c.fillRect(mx + mw, 0, vw - mx - mw, vh); if (my + mh < vh) c.fillRect(0, my + mh, vw, vh - my - mh); }
  for (let i = 0; i < pn; i++) { if (pK[i] !== 2) continue; const k = pL[i] / pMx[i]; const a = .5 * (1 - k) * Math.min(1, k * 6); const X = pX[i] * s - ox, Y = (pY[i] - pZ[i]) * s - oy; glow(c, X, Y, pS[i] * s * (1 + k * 1.6), [pR[i], pGg[i], pB[i]], a); }
  c.globalAlpha = 1;
  // light-emitting things
  c.globalCompositeOperation = 'lighter';
  for (const L of S.staticLights) {
    if (L.out || !vis[I(L.x, L.y)] || !inView(L.x, L.y)) continue; const X = (L.x + .5) * s - ox, Y = (L.y + .5) * s - oy;
    if (L.kind === 'braz') { glow(c, X, Y - s * .12, s * .45, [255, 70, 15], .5); flame(c, X, Y - s * .18, s * .15, t, L.seed); } else if (L.kind === 'candle') flame(c, X, Y - s * .04, s * .05, t, L.seed);
    else glow(c, X, Y, s * .35, [150, 180, 210], .18 + .06 * Math.sin(t * .9 + L.seed));
  }
  for (const it of S.items) {
    if (!vis[I(it.x, it.y)]) continue; const X = (it.x + .5) * s - ox, Y = (it.y + .5) * s - oy;
    if (it.kind === 'torch') flame(c, X + s * .18, Y - s * .06, s * .08 * Math.min(1, .4 + it.t / 30), t, it.x * 7 + it.y);
    else if (it.kind === 'loot') { const qq = it.item.q; glow(c, X, Y, s * (.22 + qq * .06), qq === 2 ? [240, 190, 90] : qq === 1 ? [140, 180, 240] : [200, 190, 170], (qq ? .14 : .06) + .05 * Math.sin(t * 2.4 + it.x)); }
    else glow(c, X, Y, s * .3, [200, 220, 200], .12 + .08 * Math.sin(t * 2 + it.x));
  }
  for (const e of vs) {
    const X = (e.rx + e.ax + .5) * s - ox, Y = (e.ry + e.ay + .5) * s - oy + s * .36 + Math.sin(t * 2.2 + e.id) * .012 * s;
    for (const p of emitFor(e)) {
      const x = X + p[0] * u * (e.face < 0 ? -1 : 1), y = Y + p[1] * u; const k = p[2];
      if (k === 'eyeDim') glow(c, x, y, u * 2, [150, 255, 170], .35); else if (k === 'eyeV') glow(c, x, y, u * 2.2, [200, 170, 255], .55); else if (k === 'eyeR') glow(c, x, y, u * 2.4, [255, 50, 30], .5);
      else if (k === 'lantern') { if (S.hooded) glow(c, x, y, u * 3, [150, 230, 180], .25); else { glow(c, x, y, u * 12, [150, 230, 180], .32); glow(c, x, y, u * 2.6, [225, 255, 235], .95); } }
      else if (k === 'torch') flame(c, x, y, u * 3.4, t, e.id); else if (k === 'lamp') { glow(c, x, y, u * 6, [255, 190, 110], .35); glow(c, x, y, u * 1.4, [255, 235, 190], .9); }
      else if (k === 'censer') glow(c, x, y, u * 4, [255, 90, 40], .4 + .15 * Math.sin(t * 5 + e.id));
    }
    if (e.mark > 0) { c.globalAlpha = .22 + .08 * Math.sin(t * 3); c.strokeStyle = 'rgb(70,200,110)'; c.lineWidth = Math.max(1, u * .8); c.beginPath(); c.ellipse(X, Y, s * .34, s * .12, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  }
  for (const p of projs) {
    const qq = projPos(p); const X = qq[0] * s - ox, Y = qq[1] * s - oy - s * .3;
    if (p.kind === 'soul') { glow(c, X, Y, s * 1.1, [80, 255, 140], .7); glow(c, X, Y, s * .3, [230, 255, 235], 1); }
    else { c.globalAlpha = .8; c.strokeStyle = 'rgb(255,230,190)'; c.lineWidth = Math.max(1, u * .6); const dx = p.x1 - p.x0, dy = p.y1 - p.y0, l = Math.hypot(dx, dy) || 1; line(c, X, Y, X - dx / l * s * .35, Y - dy / l * s * .35); }
  }
  for (let i = 0; i < pn; i++) { const k = pK[i]; if (k !== 1 && k !== 3) continue; const X = pX[i] * s - ox, Y = (pY[i] - pZ[i]) * s - oy; if (X < -30 || Y < -30 || X > vw + 30 || Y > vh + 30) continue; glow(c, X, Y, pS[i] * s * 3, [pR[i], pGg[i], pB[i]], 1 - pL[i] / pMx[i]); }
  for (const b of blasts) {
    const k = b.t / b.dur, ek = 1 - Math.pow(1 - k, 3); const rot = b.kind === 'rot'; const hot = rot ? [160, 220, 90] : [70, 255, 130], mid = rot ? [220, 240, 170] : [170, 255, 200];
    const qq = proj(b.x, b.y, .35 + k * .8), g0 = proj(b.x, b.y, 0);
    glow(c, qq[0], qq[1], u * 32 * b.R * (1.1 + k * 1.1), hot, .85 * Math.pow(1 - k, 1.6)); glow(c, qq[0], qq[1], u * 32 * b.R * .6 * (1 - k * .5), mid, Math.pow(1 - k, 2.2));
    if (k < .25) glow(c, qq[0], qq[1], u * 32 * b.R * .45, [255, 255, 240], 1 - k * 4);
    c.globalAlpha = Math.max(0, .85 * (1 - k)); c.strokeStyle = rgb(mid[0], mid[1], mid[2]); c.lineWidth = Math.max(1, u * 4 * (1 - k)); c.beginPath(); c.arc(g0[0], g0[1], u * 32 * b.R * 1.2 * ek, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
  }
  for (const col of columns) {
    const k = col.t / col.dur; const X = col.x * s - ox, Y = col.y * s - oy; const a = Math.sin(Math.min(1, k * 3) * Math.PI * .5) * (1 - k);
    const gr = c.createLinearGradient(0, Y - s * 3, 0, Y); gr.addColorStop(0, 'rgba(255,248,225,0)'); gr.addColorStop(.7, `rgba(255,246,220,${.55 * a})`); gr.addColorStop(1, `rgba(255,250,235,${.9 * a})`); c.fillStyle = gr; c.fillRect(X - s * .22, Y - s * 3, s * .44, s * 3.05); glow(c, X, Y, s * .9, [255, 240, 200], .7 * a);
  }
  for (const r of rings) { const k = r.t / r.dur; const X = r.x * s - ox, Y = r.y * s - oy; const R = (r.shrink ? (1 - k) : k) * r.R * s; c.globalAlpha = (1 - k) * .6; c.strokeStyle = rgb(r.c[0], r.c[1], r.c[2]); c.lineWidth = Math.max(1, u * 2); c.beginPath(); c.ellipse(X, Y, R, R * .75, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  for (const r of rings) { if (!r.dark) continue; const k = r.t / r.dur; const X = r.x * s - ox, Y = r.y * s - oy; c.globalAlpha = .35 * (1 - k); c.fillStyle = '#000'; c.beginPath(); c.ellipse(X, Y, r.R * s * (1 - k * .6), r.R * s * .75 * (1 - k * .6), 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  // overlays: threat, marks, selection, target, hover
  if (RS.showThreat) {
    c.fillStyle = 'rgba(190,40,40,.13)';
    for (const e of S.ents) {
      if (e.dead || !hostile(pl, e) || !seesE(e) || !(e.aware || e.unbound)) continue; const R = e.type === 'xbow' && e.loaded ? 7 : 1;
      for (let y = e.y - R; y <= e.y + R; y++) for (let x = e.x - R; x <= e.x + R; x++) { if (!inb(x, y) || !vis[I(x, y)] || BLK[map[I(x, y)]]) continue; if (R > 1 && (Math.hypot(x - e.x, y - e.y) > R || !los(e.x, e.y, x, y))) continue; c.fillRect(x * s - ox, y * s - oy, s, s); }
    }
  }
  if (RS.showMarks) drawMarks(c, s, ox, oy, u, inView);
  const sm = RS.selMinion;
  if (sm && sm.dead) RS.selMinion = null;
  else if (sm && vis[I(sm.x, sm.y)]) { const X = (sm.rx + .5) * s - ox, Y = (sm.ry + .5) * s - oy; c.strokeStyle = 'rgba(143,232,172,.7)'; c.lineWidth = Math.max(1, u * 1.4); c.beginPath(); c.ellipse(X, Y + s * .36, s * .38, s * .16, 0, 0, Math.PI * 2); c.stroke(); }
  const tg = S.target && !S.target.dead && seesE(S.target) ? S.target : null;
  if (tg) {
    const X = (tg.rx + .5) * s - ox, Y = (tg.ry + .5) * s - oy, R = s * .52; c.strokeStyle = 'rgba(214,203,180,.7)'; c.lineWidth = Math.max(1, RS.DPR); const L = R * .35;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(X + a * R, Y + b * R - b * L); c.lineTo(X + a * R, Y + b * R); c.lineTo(X + a * R - a * L, Y + b * R); c.stroke(); }
  }
  const hv = RS.hover;
  if (hv && inb(hv[0], hv[1]) && seen[I(hv[0], hv[1])]) { c.strokeStyle = 'rgba(214,203,180,.16)'; c.lineWidth = 1; c.strokeRect(hv[0] * s - ox + .5, hv[1] * s - oy + .5, s - 1, s - 1); }
  // grading
  if (!vign || vign.width !== vw || vign.height !== vh) makeVign();
  c.globalAlpha = V.vign; c.drawImage(vign, 0, 0); c.globalAlpha = 1;
  const bl = pl.blood / pl.bmax, torso = partOf(pl, 'torso'); const danger = Math.max(1 - bl / .45, 1 - torso.hp / torso.max / .5, 0);
  if (danger > 0 && !S.gameOver) { const p = Math.pow(Math.abs(Math.sin(t * 2.7)), 6) * Math.min(1, danger); c.globalAlpha = Math.min(.8, p * 1.3); c.drawImage(redVign, 0, 0, vw, vh); c.globalAlpha = 1; }
  if (q().grain) drawGrain(V.grain);
  if (FX.screenFlash) { c.globalCompositeOperation = 'lighter'; const f = FX.screenFlash; c.fillStyle = rgb(f.c[0], f.c[1], f.c[2], Math.max(0, f.a) * .45); c.fillRect(0, 0, vw, vh); c.globalCompositeOperation = 'source-over'; }
  RS.view = { s, ox, oy };
}

/* ---------- Tab: names over remains, graves, chests and loot ---------- */
let markRects = [];
function markLabel(c, X, Y, txt, col, fs) {
  c.font = `500 ${fs}px "IBM Plex Mono",monospace`; const w = c.measureText(txt).width + fs * .9, h = fs * 1.55;
  for (let k = 0; k < 6; k++) { const hit = markRects.some(r => X - w / 2 < r[2] && X + w / 2 > r[0] && Y - h < r[3] && Y > r[1]); if (!hit) break; Y -= h + 2; }
  markRects.push([X - w / 2, Y - h, X + w / 2, Y]);
  c.fillStyle = 'rgba(8,6,9,.78)'; c.fillRect(X - w / 2, Y - h, w, h); c.strokeStyle = col; c.globalAlpha = .55; c.lineWidth = 1; c.strokeRect(X - w / 2 + .5, Y - h + .5, w - 1, h - 1); c.globalAlpha = 1;
  c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, X, Y - h / 2 + .5);
}
function drawMarks(c, s, ox, oy, u, inView) {
  markRects = []; const pl = S.player; const fs = Math.max(9, Math.round(11 * RS.DPR * q().scale));
  const ring = (X, Y, col) => { c.strokeStyle = col; c.lineWidth = Math.max(1, u * 1.6); c.beginPath(); c.ellipse(X, Y + s * .18, s * .42, s * .24, 0, 0, Math.PI * 2); c.stroke(); };
  const inR = (x, y) => Math.hypot(x - pl.x, y - pl.y) <= 4.6;
  for (const [gx, gy] of S.L.graves) { if (map[I(gx, gy)] !== GRAVE || !seen[I(gx, gy)] || !inView(gx, gy)) continue; const X = (gx + .5) * s - ox, Y = (gy + .5) * s - oy; ring(X, Y, inR(gx, gy) && vis[I(gx, gy)] ? 'rgba(150,215,200,.9)' : vis[I(gx, gy)] ? 'rgba(150,200,190,.4)' : 'rgba(150,200,190,.14)'); }
  for (const cp of S.corpses) {
    if (!vis[I(cp.x, cp.y)] || !inView(cp.x, cp.y)) continue; const X = (cp.x + .5) * s - ox, Y = (cp.y + .5) * s - oy;
    const col = cp.holy ? 'rgba(150,140,130,.6)' : inR(cp.x, cp.y) ? 'rgba(150,215,200,.95)' : 'rgba(150,215,200,.55)'; ring(X, Y, col);
    markLabel(c, X, Y - s * .2, cp.holy ? 'burned clean' : corpseName(cp) + (cp.gear && (cp.gear.hand || cp.gear.body || cp.gear.head) ? ' · gear' : ''), col, fs);
  }
  for (const ch of S.chests) { if (!seen[I(ch.x, ch.y)] || !inView(ch.x, ch.y)) continue; const X = (ch.x + .5) * s - ox, Y = (ch.y + .5) * s - oy; const col = ch.open ? 'rgba(160,140,110,.5)' : 'rgba(214,180,120,.95)'; ring(X, Y, col); markLabel(c, X, Y - s * .3, CHESTNAME[ch.kind] + (ch.open ? (ch.loot && ch.loot.length ? ' · open' : ' · empty') : ''), col, fs); }
  for (const it of S.items) {
    if (!seen[I(it.x, it.y)] || !inView(it.x, it.y)) continue; const X = (it.x + .5) * s - ox, Y = (it.y + .5) * s - oy; const col = it.kind === 'torch' ? 'rgba(240,170,90,.9)' : 'rgba(236,214,160,.98)';
    if (it.kind === 'loot') { const qq = it.item.q; ring(X, Y, QCOL[qq]); markLabel(c, X, Y - s * .25, itemName(it.item), QCOL[qq], fs); continue; }
    ring(X, Y, col); markLabel(c, X, Y - s * .25, it.kind === 'tome' ? 'a book' : it.kind === 'tablet' ? 'a lead tablet' : 'a torch', col, fs);
  }
}
