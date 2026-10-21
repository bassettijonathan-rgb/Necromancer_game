// Dread lighting: a half-tile light buffer, multiplied over the scene. Fixed lights are traced once; moving lights reuse cached masks.
import { S } from '../core/state.js';
import { clamp, hash } from '../core/rng.js';
import { W, H, map, vis, seen, outdoor, zone, OPQ } from '../core/level.js';
import { mk } from './mapart.js';
import { RS, q, V } from './rstate.js';
import { projs, pulses, blasts, columns, projPos } from './fx.js';

const HW = W * 2, HH = H * 2, HN = HW * HH, HR = new Float32Array(HN), HG = new Float32Array(HN), HB = new Float32Array(HN);
export const hlCv = mk(HW, HH); const hlctx = hlCv.getContext('2d'), hlimg = hlctx.createImageData(HW, HH);
const HT = new Int32Array(HN); for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) HT[y * HW + x] = (y >> 1) * W + (x >> 1);
function losF(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / .25); const ex = x1 | 0, ey = y1 | 0, sx = x0 | 0, sy = y0 | 0;
  for (let k = 1; k < n; k++) { const f = k / n, tx = (x0 + dx * f) | 0, ty = (y0 + dy * f) | 0; if ((tx === ex && ty === ey) || (tx === sx && ty === sy)) continue; if (OPQ[map[ty * W + tx]]) return false; }
  return true;
}
// the lit cells of each fixed light, kept beside S.staticLights so they never end up in a save
let hiCells = [];
function buildHiStatic() {
  hiCells = S.staticLights.map(L => {
    const cells = []; const lx = L.x + .5, ly = L.y + .5, R = Math.ceil(L.r * 2), cx = Math.floor(lx * 2), cy = Math.floor(ly * 2);
    for (let y = Math.max(0, cy - R); y <= Math.min(HH - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(HW - 1, cx + R); x++) {
      const wx = (x + .5) / 2, wy = (y + .5) / 2, dd = Math.hypot(wx - lx, wy - ly); if (dd >= L.r || !losF(lx, ly, wx, wy)) continue;
      let f = 1 - dd / L.r; f = f * f * .7 + f * .3; cells.push(y * HW + x, f);
    }
    return new Float32Array(cells);
  });
}
// occlusion masks for moving lights, cached by tile and radius: the expensive part of a light is computed once
const maskCache = new Map();
function getMask(tx, ty, R) {
  tx = clamp(tx, 0, W - 1); ty = clamp(ty, 0, H - 1); const key = (ty * W + tx) * 16 + R; let m = maskCache.get(key); if (m) return m;
  const cells = []; const lx = tx + .5, ly = ty + .5, hx = tx * 2 + 1, hy = ty * 2 + 1, R2 = R * 2;
  for (let y = Math.max(0, hy - R2); y <= Math.min(HH - 1, hy + R2); y++) for (let x = Math.max(0, hx - R2); x <= Math.min(HW - 1, hx + R2); x++) {
    const wx = (x + .5) / 2, wy = (y + .5) / 2; if (Math.hypot(wx - lx, wy - ly) >= R) continue; if (!losF(lx, ly, wx, wy)) continue; cells.push(y * HW + x);
  }
  m = new Int32Array(cells); if (maskCache.size > 5000) maskCache.clear(); maskCache.set(key, m); return m;
}
// call when the walls change or a new level is bound
export function rebuildLights() { for (const L of S.staticLights) if (L.seed === undefined) L.seed = hash(L.x, L.y, 5) * 10; maskCache.clear(); buildHiStatic(); }
export function flick(t, s) { return .82 + .1 * Math.sin(t * 13.1 + s) + .08 * Math.sin(t * 27.3 + s * 2.1); }
export let dynLights = [];
export function buildDynLights(t) {
  dynLights = [];
  const pl = S.player; if (!pl) return;
  dynLights.push({ x: pl.rx + .5, y: pl.ry + .5, r: S.hooded ? 2.4 : 8.5, c: V.lantern, I: (S.hooded ? .5 : 1.45) * (1 + .06 * Math.sin(t * 2.3)), k: 'lantern', pri: 99 });
  for (const e of S.ents) {
    if (e.dead || e === pl) continue; const x = e.rx + .5, y = e.ry + .5;
    if (e.light) {
      if (e.type === 'zealot') dynLights.push({ x, y, r: 5.6, c: [1, .56, .24], I: 1.05 * flick(t, e.id), k: 'torch' });
      else if (e.type === 'xbow') dynLights.push({ x, y, r: 4.2, c: [1, .74, .42], I: .8, k: 'torch' });
      else if (e.type === 'conf') dynLights.push({ x, y, r: 3, c: [1, .44, .24], I: .6 * flick(t, e.id * 3), k: 'torch' });
    }
    if (e.burn > 0) dynLights.push({ x, y, r: 3, c: [1, .5, .2], I: .8 * flick(t, e.id + 3), k: 'burn' });
  }
  for (const it of S.items) if (it.kind === 'torch') { const k = Math.min(1, it.t / 20); dynLights.push({ x: it.x + .5, y: it.y + .5, r: 1.5 + 3 * k, c: [1, .52, .22], I: (.5 + .5 * k) * flick(t, it.x * 7 + it.y), k: 'torch' }); }
  for (const p of projs) { const qq = projPos(p); dynLights.push({ x: qq[0], y: qq[1], r: p.kind === 'soul' ? 3.4 : 1.6, c: p.kind === 'soul' ? [.4, 1, .6] : [1, .8, .5], I: p.kind === 'soul' ? 1.2 : .3, k: 'fx' }); }
  for (const p of pulses) { const k = p.t / p.dur; dynLights.push({ x: p.x, y: p.y, r: 2 + p.r * k, c: p.c, I: p.I * (1 - k), k: 'fx' }); }
  for (const b of blasts) { const k = b.t / b.dur; dynLights.push({ x: b.x, y: b.y, r: 3 + 5.5 * Math.sqrt(k), c: b.kind === 'rot' ? [.75, .95, .45] : [.45, 1, .6], I: 3 * (1 - k) * (1 - k), k: 'fx', pri: 50 }); }
  for (const c of columns) { const k = c.t / c.dur; dynLights.push({ x: c.x, y: c.y, r: 4.5, c: [1, .95, .8], I: 2.2 * (1 - k), k: 'fx', pri: 40 }); }
  if (S.castGlow > 0) dynLights.push({ x: pl.rx + .5, y: pl.ry + .5, r: 5, c: [.5, 1, .65], I: .35 * S.castGlow, k: 'fx' });
  const B = q().lights;
  if (dynLights.length > B) { for (const L of dynLights) if (L.pri === undefined) L.pri = L.I * L.r / (1 + Math.hypot(L.x - RS.camX, L.y - RS.camY) * .12); dynLights.sort((a, b) => b.pri - a.pri); dynLights.length = B; }
}
export function computeHi(t) {
  const px = S.player.x, py = S.player.y;
  for (let i = 0; i < HN; i++) {
    const ti = HT[i]; if (!vis[ti]) { HR[i] = HG[i] = HB[i] = 0; continue; }
    if (outdoor[ti]) { HR[i] = V.moon[0]; HG[i] = V.moon[1]; HB[i] = V.moon[2]; } else if (zone[ti] >= 4) { HR[i] = .026; HG[i] = .03; HB[i] = .038; } else { HR[i] = .02; HG[i] = .018; HB[i] = .026; }
  }
  const SL = S.staticLights;
  for (let n = 0; n < SL.length; n++) {
    const L = SL[n], cs = hiCells[n]; if (!cs || L.out || Math.abs(L.x - px) > 24 || Math.abs(L.y - py) > 24) continue;
    const k = L.kind === 'seam' ? L.I * (.85 + .15 * Math.sin(t * .9 + L.seed)) : L.I * flick(t, L.seed);
    for (let j = 0; j < cs.length; j += 2) { const i = cs[j]; if (!vis[HT[i]]) continue; const f = cs[j + 1] * k; HR[i] += L.c[0] * f; HG[i] += L.c[1] * f; HB[i] += L.c[2] * f; }
  }
  for (const L of dynLights) {
    const R = Math.ceil(L.r); const m = getMask(Math.floor(L.x), Math.floor(L.y), Math.min(15, R)); const r2 = L.r * L.r, inv = 1 / L.r, In = L.I, cr = L.c[0], cg = L.c[1], cb = L.c[2];
    for (let j = 0; j < m.length; j++) {
      const i = m[j]; if (!vis[HT[i]]) continue; const y = (i / HW) | 0, x = i - y * HW; const dx = (x + .5) * .5 - L.x, dy = (y + .5) * .5 - L.y, d2 = dx * dx + dy * dy; if (d2 >= r2) continue;
      let f = 1 - Math.sqrt(d2) * inv; f = (f * f * .7 + f * .3) * In; HR[i] += cr * f; HG[i] += cg * f; HB[i] += cb * f;
    }
  }
  const d = hlimg.data, sat = V.sat, tr = V.tint[0] / 255, tg = V.tint[1] / 255, tb = V.tint[2] / 255, M = V.mem;
  for (let i = 0, j = 0; i < HN; i++, j += 4) {
    const ti = HT[i]; let r, g, b;
    if (vis[ti]) { r = HR[i]; g = HG[i]; b = HB[i]; const l = r * .3 + g * .55 + b * .15; r = (r + (l - r) * sat) * tr; g = (g + (l - g) * sat) * tg; b = (b + (l - b) * sat) * tb; r *= .7 + .3 * (r < 1 ? r : 1); g *= .7 + .3 * (g < 1 ? g : 1); b *= .7 + .3 * (b < 1 ? b : 1); }
    else if (seen[ti]) { r = M[0]; g = M[1]; b = M[2]; } else r = g = b = 0;
    d[j] = r > 1 ? 255 : r * 255; d[j + 1] = g > 1 ? 255 : g * 255; d[j + 2] = b > 1 ? 255 : b * 255; d[j + 3] = 255;
  }
  hlctx.putImageData(hlimg, 0, 0);
}
