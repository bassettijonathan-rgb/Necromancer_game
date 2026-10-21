// The Dread look of the ground: every tile painted once into a large image, then stained as the night goes on.
import { S } from '../core/state.js';
import { hash, clamp, lcg } from '../core/rng.js';
import { W, H, I, inb, map, zone, deco, OPQ, isOpq, canWalk,
  ROCK, BRICK, FLOOR, DIRT, GRASS, GRAVE, TREE, WATER, DOOR, CAVE, RUBBLE, SARC, PILLAR, OGRAVE, PATH, BRAZ, FWALL, FOUND, SEAL, CRADLE, ALTAR, ASH } from '../core/level.js';

export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const rgb = (r, g, b, a) => a === undefined ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const line = (c, a, b, d, e) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); };
export const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
export const ell = (c, x, y, rx, ry, rot) => { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot || 0, 0, Math.PI * 2); c.fill(); };

function tileNoise(size, period, oct, sd) {
  const a = new Float32Array(size * size); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const p = period << o, cell = size / p;
    for (let y = 0; y < size; y++) {
      const fy = y / cell, yi = Math.floor(fy), yf = fy - yi, v = yf * yf * (3 - 2 * yf);
      for (let x = 0; x < size; x++) {
        const fx = x / cell, xi = Math.floor(fx), xf = fx - xi, u = xf * xf * (3 - 2 * xf);
        const A = hash(xi % p, yi % p, sd + o * 17), B = hash((xi + 1) % p, yi % p, sd + o * 17), C = hash(xi % p, (yi + 1) % p, sd + o * 17), D = hash((xi + 1) % p, (yi + 1) % p, sd + o * 17);
        a[y * size + x] += (A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v) * amp;
      }
    }
    tot += amp; amp *= .5;
  }
  for (let i = 0; i < a.length; i++) a[i] /= tot; return a;
}
let N1, N2, N3;
export let noisePat = null, fogPat = null;
const smp = (A, x, y) => A[((y & 255) << 8) | (x & 255)];
export function buildNoise(ctx) {
  N1 = tileNoise(256, 4, 5, 11); N2 = tileNoise(256, 16, 3, 23); N3 = tileNoise(256, 64, 2, 37);
  const nc = mk(256, 256), ng = nc.getContext('2d'), ni = ng.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = 150 + (N2[i] - .5) * 260 + (N3[i] - .5) * 120; ni.data[i * 4] = ni.data[i * 4 + 1] = ni.data[i * 4 + 2] = clamp(v, 0, 255); ni.data[i * 4 + 3] = 255; } ng.putImageData(ni, 0, 0); noisePat = ctx.createPattern(nc, 'repeat');
  const F = tileNoise(256, 3, 4, 51), fc = mk(256, 256), fg = fc.getContext('2d'), fi = fg.createImageData(256, 256); for (let i = 0; i < 65536; i++) { fi.data[i * 4] = 196; fi.data[i * 4 + 1] = 202; fi.data[i * 4 + 2] = 206; fi.data[i * 4 + 3] = clamp((F[i] - .4) * 3.2, 0, 1) * 255; } fg.putImageData(fi, 0, 0); fogPat = ctx.createPattern(fc, 'repeat');
}
export const RB = 48;
export let mapReal = null; let mapG = null;
const STONE = new Uint8Array(32); for (const t of [FLOOR, DOOR, SARC, PILLAR, BRAZ, ALTAR]) STONE[t] = 1;
const GROUNDT = new Uint8Array(32); for (const t of [DIRT, GRASS, GRAVE, TREE, WATER, CAVE, RUBBLE, PATH, OGRAVE, ASH]) GROUNDT[t] = 1;
const ANCIENT = new Uint8Array(32); for (const t of [FWALL, SEAL]) ANCIENT[t] = 1;
function nearWalk(x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (canWalk(x + dx, y + dy) || (inb(x + dx, y + dy) && !OPQ[map[I(x + dx, y + dy)]])) return true; } return false; }
const PX = new Float32Array(3);
function basePixel(tx, ty, lx, ly, X, Y, t0, front, nw) {
  let r, gg, b; const B = RB;
  const n1 = smp(N1, X, Y), n2 = smp(N2, X, Y), n3 = smp(N3, X, Y), lo = smp(N1, X >> 2, Y >> 2);
  let t = t0; if (GROUNDT[t0]) { const qx = ((X + (smp(N1, X + 37, Y + 11) - .5) * 44) / B) | 0, qy = ((Y + (smp(N1, X + 5, Y + 91) - .5) * 44) / B) | 0; if (qx >= 0 && qy >= 0 && qx < W && qy < H && GROUNDT[map[qy * W + qx]]) t = map[qy * W + qx]; if (t === GRAVE || t === TREE) t = GRASS; if (t === OGRAVE) t = DIRT; }
  if (t === ROCK) {
    if (!nw) { r = 5; gg = 4; b = 6; }
    else if (front && ly >= B * .5) { const st = Math.sin((Y + n1 * 16) * .42) * .5 + .5; const v = (26 + st * 14) * (.7 + n2 * .6); r = v; gg = v * .93; b = v * 1.02; if (ly > B - 4) { r *= .55; gg *= .55; b *= .55; } }
    else { const v = (36 + (n1 - .5) * 70 + (n3 - .5) * 22) * (.8 + lo * .4); r = v; gg = v * .94; b = v * 1.03; }
  }
  else if (ANCIENT[t]) {
    if (front && ly >= B * .45) {
      const fy = ly - B * .45; const v = (30 + fy * .5) * (.94 + n3 * .12); r = v * .92; gg = v * .98; b = v * 1.06; if (fy % 12 < .9) { r *= .6; gg *= .62; b *= .66; } if (ly > B - 3) { r *= .5; gg *= .5; b *= .5; }
      if (t === SEAL) { const cx = Math.abs(lx - B / 2); if (cx < .8) { r = r * .4 + 70 * .6; gg = gg * .4 + 80 * .6; b = b * .4 + 86 * .6; } const dd = Math.hypot(lx - B / 2, fy - B * .22); if (Math.abs(dd - 5.5) < .6) { r = 74; gg = 82; b = 88; } }
    }
    else { const v = 22 + (n3 - .5) * 6; r = v * .95; gg = v; b = v * 1.08; }
  }
  else if (t === BRICK) {
    if (front && ly >= B * .5) {
      const fy = ly - B * .5, row = Math.floor(fy / 6), off = (row & 1) * 12, bx = (X + off) % 24;
      if (fy % 6 < 1.3 || bx < 1.3) { r = 18; gg = 16; b = 18; } else { const bh = hash(Math.floor((X + off) / 24), row + ty * 9, 3); const v = (48 + bh * 20) * (.72 + n2 * .55); r = v * 1.06; gg = v * .88; b = v * .84; }
      if (smp(N2, X, Y >> 3) < .43) { r *= .68; gg *= .7; b *= .68; }
      const k = .5 + .5 * Math.min(1, (B * .5 - fy) / (B * .5) * 1.7 + .15); r *= k; gg *= k; b *= k;
      if (fy > B * .5 - 7 && n1 > .53) { r = r * .55 + 24 * .45; gg = gg * .55 + 38 * .45; b = b * .55 + 22 * .45; }
    }
    else { const bx = X % 24, by = Y % 24; if (bx < 1.3 || by < 1.3) { r = gg = b = 20; } else { const v = (50 + hash(Math.floor(X / 24), Math.floor(Y / 24), 5) * 14) * (.72 + n2 * .55); r = v; gg = v * .96; b = v * 1.05; } }
  }
  else if (STONE[t]) {
    const XX = X + (smp(N2, X + 71, Y) - .5) * 8, YY = Y + (smp(N2, X, Y + 53) - .5) * 8; const row = Math.floor(YY / 24), off = hash(row, 1, 9) * 30, u0 = XX + off, col = Math.floor(u0 / 30), u = u0 - col * 30, v = YY - row * 24;
    const e = Math.min(u, 30 - u, v, 24 - v);
    if (e < 1.7) { const m = 16 + n3 * 12; r = m; gg = m * .95; b = m * .9; if (n1 > .57) { r = r * .4 + 26 * .6; gg = gg * .4 + 38 * .6; b = b * .4 + 22 * .6; } }
    else {
      const sh = hash(col, row, 13), sh2 = hash(col, row, 14); let base = (56 + sh * 26) * (.68 + n1 * .6); if (lo > .6) base *= .78;
      let k = 1; if (v < 4) k += .13 * (1 - v / 4); if (24 - v < 4) k -= .24 * (1 - (24 - v) / 4); if (u < 3) k += .06; if (30 - u < 3) k -= .12;
      r = base * k * (1 + sh2 * .05); gg = base * k * .96; b = base * k * (.9 + (1 - sh2) * .06);
      if (Math.abs(n2 - .5) < .011) { r *= .45; gg *= .45; b *= .45; }
    }
  }
  else if (t === FOUND || t === CRADLE) {
    const u = X % 96, v = Y % 96; const e = Math.min(u, 96 - u, v, 96 - v); let base = 58 + (n3 - .5) * 7 + (n1 - .5) * 4;
    if (e < 1.1) { base *= .55; } else if (e < 2.2) base *= 1.08;
    if (lo > .64 && n2 > .55) base *= .86;
    r = base * .94; gg = base * .98; b = base * 1.04; if (Math.abs(n2 - .5) < .004) { r *= .7; gg *= .7; b *= .7; }
  }
  else if (t === GRASS) {
    const bl = smp(N3, X, (Y * .6) | 0), dead = clamp((lo - .52) * 8, 0, 1), bare = clamp((.4 - lo) * 7, 0, 1);
    let v = .58 + (bl - .5) * .75 + (n2 - .5) * .5 + (n1 - .5) * .6; r = 40 * v; gg = 47 * v; b = 29 * v;
    r = r * (1 - dead) + 64 * v * dead; gg = gg * (1 - dead) + 56 * v * dead; b = b * (1 - dead) + 38 * v * dead;
    const dv = .6 + (n1 - .5) * 1.2; r = r * (1 - bare) + 48 * dv * bare; gg = gg * (1 - bare) + 40 * dv * bare; b = b * (1 - bare) + 31 * dv * bare;
  }
  else if (t === DIRT) {
    const v = .62 + (n1 - .5) * 1.2 + (n3 - .5) * .5; r = 52 * v; gg = 43 * v; b = 34 * v; if (lo > .58) { r *= .75; gg *= .75; b *= .78; }
    if (n2 > .7) { const sh = (smp(N2, X - 2, Y - 2) - n2) * 500; const pv = 62 + sh; r = pv; gg = pv * .95; b = pv * .9; }
  }
  else if (t === PATH) { const v = (52 + (n3 - .5) * 90) * (.78 + n1 * .45); r = v; gg = v * .95; b = v * .9; if (n2 > .68) { const sh = (smp(N2, X - 2, Y - 2) - n2) * 400; r += sh; gg += sh; b += sh; } }
  else if (t === WATER) { const v = 5 + (n1 > .55 ? 3 : 0) + (Math.abs(n2 - .5) < .02 ? 6 : 0); r = v; gg = v * 1.25; b = v * 1.7; }
  else if (t === ASH) { const v = .66 + (n1 - .5) * .7 + (n3 - .5) * .3; r = 60 * v; gg = 59 * v; b = 58 * v; if (hash(X, Y, 77) < .003) { r = 130; gg = 134; b = 138; } }
  else { const v = (46 + (n1 - .5) * 60 + (n3 - .5) * 16) * (.82 + lo * .35); r = v; gg = v * .93; b = v * .9; if (lo > .62 && n2 > .5) { r *= .8; gg *= .82; b *= .86; } }
  const l = r * .3 + gg * .55 + b * .15; PX[0] = (r + (l - r) * .4) * 1.4; PX[1] = (gg + (l - gg) * .4) * 1.4; PX[2] = (b + (l - b) * .4) * 1.4;
}

export function buildRealMap() {
  const L = S.L, B = RB, Wp = W * B, Hp = H * B; const c = mapReal && mapReal.width === Wp ? mapReal : mk(Wp, Hp), g = c.getContext('2d'), img = g.createImageData(Wp, Hp), d = img.data;
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const t0 = map[I(tx, ty)]; const front = OPQ[t0] && !isOpq(tx, ty + 1); const nw = OPQ[t0] ? nearWalk(tx, ty) : true;
    for (let ly = 0; ly < B; ly++) {
      const Y = ty * B + ly; let j = (Y * Wp + tx * B) * 4;
      for (let lx = 0; lx < B; lx++, j += 4) { basePixel(tx, ty, lx, ly, tx * B + lx, Y, t0, front, nw); d[j] = PX[0]; d[j + 1] = PX[1]; d[j + 2] = PX[2]; d[j + 3] = 255; }
    }
  }
  g.putImageData(img, 0, 0); mapG = g;
  let rs = 1; const lr = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const tex = (a) => { g.save(); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = noisePat; g.fillRect(0, 0, Wp, Hp); g.restore(); };
  // ambient occlusion and cobwebs
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (OPQ[map[I(x, y)]]) continue; const X = x * B, Y = y * B;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      if (!isOpq(x + dx, y + dy)) continue; const gx0 = dx === 1 ? X + B : X, gy0 = dy === 1 ? Y + B : Y;
      const gr = g.createLinearGradient(gx0, gy0, gx0 - dx * B * .6, gy0 - dy * B * .6); gr.addColorStop(0, 'rgba(0,0,0,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(dx === 1 ? X + B * .4 : X, dy === 1 ? Y + B * .4 : Y, dx ? B * .6 : B, dy ? B * .6 : B);
    }
    if ((zone[I(x, y)] === 2 || zone[I(x, y)] === 1) && isOpq(x, y - 1) && isOpq(x - 1, y) && hash(x, y, 44) < .7) {
      g.strokeStyle = 'rgba(200,200,190,.22)'; g.lineWidth = .6; const Ln = B * (.6 + hash(x, y, 45) * .5);
      for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; line(g, X, Y, X + Math.cos(a) * Ln, Y + Math.sin(a) * Ln); }
      for (let r2 = Ln * .2; r2 < Ln; r2 += Ln * .18) { g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; const px = X + Math.cos(a) * r2 * (1 + (k % 2) * .06), py = Y + Math.sin(a) * r2 * (1 + (k % 2) * .06); k ? g.quadraticCurveTo(X + Math.cos(a - .13) * r2 * .92, Y + Math.sin(a - .13) * r2 * .92, px, py) : g.moveTo(px, py); } g.stroke(); }
    }
  }
  // old blood in the crypt
  const stain = (x, y, R) => { g.fillStyle = 'rgba(38,8,6,.55)'; for (let k = 0; k < 7; k++) { ell(g, x + (lr() - .5) * R, y + (lr() - .5) * R * .7, R * (.15 + lr() * .35), R * (.1 + lr() * .25), lr() * 3); } g.fillStyle = 'rgba(30,6,5,.6)'; for (let k = 0; k < 14; k++) circ(g, x + (lr() - .5) * R * 2.4, y + (lr() - .5) * R * 2.4, .6 + lr() * 1.6); };
  rs = S.seed | 1; for (let k = 0; k < 30; k++) { const x = (lr() * W) | 0, y = (lr() * H) | 0; if (canWalk(x, y) && zone[I(x, y)] === 2) stain((x + .5) * B, (y + .5) * B, B * (.4 + lr() * .6)); }
  // seams in the Foundations
  g.strokeStyle = 'rgba(150,170,184,.16)'; g.lineWidth = 1;
  { const f = S.G.found; if (f) for (let x = f.x0 + 1; x < f.x1; x += 2) { line(g, x * B + B * .5, (f.y0 + 1) * B, x * B + B * .5, (f.y0 + 1) * B + B * .25); line(g, x * B + B * .5, f.y1 * B - B * .25, x * B + B * .5, f.y1 * B); } }
  // props
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), t = map[i], X = x * B, Y = y * B; rs = (x * 31337 + y * 7331 + S.seed) >>> 0;
    if (t === GRAVE) {
      g.fillStyle = 'rgba(30,24,18,.55)'; g.beginPath(); g.ellipse(X + B * .5, Y + B * .66, B * .26, B * .2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.5)'; ell(g, X + B * .55, Y + B * .42, B * .26, B * .08);
      const cross = hash(x, y, 90) < .3, tilt = (lr() - .5) * .22, broken = lr() < .2; g.save(); g.translate(X + B * .5, Y + B * .42); g.scale(.85, .85); g.rotate(tilt);
      const gr = g.createLinearGradient(-B * .2, -B * .5, B * .2, 0); gr.addColorStop(0, '#7a7872'); gr.addColorStop(1, '#3e3c3a'); g.fillStyle = gr;
      g.beginPath(); if (cross) { g.rect(-B * .05, -B * .52, B * .1, B * .52); g.rect(-B * .18, -B * .4, B * .36, B * .09); }
      else { g.moveTo(-B * .17, 0); g.lineTo(-B * .17, -B * .3); if (broken) { g.lineTo(-B * .05, -B * .42); g.lineTo(B * .06, -B * .34); g.lineTo(B * .17, -B * .4); } else g.arc(0, -B * .3, B * .17, Math.PI, 0); g.lineTo(B * .17, 0); g.closePath(); }
      g.fill(); tex(.55);
      g.fillStyle = 'rgba(0,0,0,.35)'; if (!cross) g.fillRect(B * .12, -B * .3, B * .05, B * .3);
      g.fillStyle = 'rgba(255,255,255,.07)'; if (!cross) g.fillRect(-B * .17, -B * .3, B * .03, B * .3);
      if (!cross) { g.strokeStyle = 'rgba(20,18,16,.6)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) line(g, -B * .1, -B * .25 + k * 5, B * .08 - lr() * 4, -B * .25 + k * 5); }
      for (let k = 0; k < 6; k++) { g.fillStyle = lr() < .5 ? 'rgba(96,100,60,.55)' : 'rgba(34,44,26,.6)'; circ(g, (lr() - .5) * B * .3, -lr() * B * .35, .8 + lr() * 2); }
      g.restore();
    }
    if (t === OGRAVE) artOpenGrave(x, y);
    if (t === SARC) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(X + B * .1, Y + B * .14, B * .86, B * .86);
      g.save(); g.beginPath(); g.rect(X + B * .06, Y + B * .04, B * .84, B * .84); const gr = g.createLinearGradient(X, Y, X, Y + B); gr.addColorStop(0, '#6c6866'); gr.addColorStop(1, '#3a3836'); g.fillStyle = gr; g.fill(); tex(.6); g.restore();
      g.strokeStyle = 'rgba(15,13,12,.7)'; g.lineWidth = 1.2; g.strokeRect(X + B * .12, Y + B * .1, B * .72, B * .72);
      const cx = X + B * .48, cy = Y + B * .46; g.strokeStyle = 'rgba(20,18,16,.55)'; g.beginPath(); g.arc(cx, cy - B * .2, B * .08, 0, Math.PI * 2); g.moveTo(cx - B * .12, cy - B * .1); g.lineTo(cx - B * .09, cy + B * .28); g.lineTo(cx + B * .09, cy + B * .28); g.lineTo(cx + B * .12, cy - B * .1); g.moveTo(cx - B * .07, cy); g.lineTo(cx + B * .07, cy + B * .06); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(X + B * .06, Y + B * .04, B * .84, 2); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X + B * .06, Y + B * .84, B * .84, 4);
    }
    if (t === ALTAR) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(X + B * .02, Y + B * .2, B * 1, B * .8); g.save(); g.beginPath(); g.rect(X - B * .1, Y + B * .12, B * 1.2, B * .66); const gr = g.createLinearGradient(X, Y, X, Y + B); gr.addColorStop(0, '#77716a'); gr.addColorStop(1, '#3c3834'); g.fillStyle = gr; g.fill(); tex(.5); g.restore();
      g.fillStyle = '#2a2422'; g.fillRect(X + B * .25, Y + B * .12, B * .5, B * .66); g.fillStyle = '#4a3a2c'; g.fillRect(X + B * .25, Y + B * .12, B * .5, B * .06); g.strokeStyle = 'rgba(180,160,120,.35)'; g.lineWidth = 1; line(g, X + B * .5, Y + B * .25, X + B * .5, Y + B * .6); line(g, X + B * .38, Y + B * .36, X + B * .62, Y + B * .36);
    }
    if (t === CRADLE) {
      g.fillStyle = 'rgba(0,0,0,.6)'; ell(g, X + B * .55, Y + B * .62, B * 1.25, B * .5); g.fillStyle = '#4b4d50'; ell(g, X + B * .5, Y + B * .5, B * 1.2, B * .46); g.fillStyle = '#1c1d20'; ell(g, X + B * .5, Y + B * .52, B * 1.02, B * .32);
      g.strokeStyle = 'rgba(200,214,224,.18)'; g.lineWidth = 1; g.beginPath(); g.ellipse(X + B * .5, Y + B * .5, B * 1.12, B * .4, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    }
    if (t === PILLAR) {
      g.fillStyle = 'rgba(0,0,0,.6)'; ell(g, X + B * .56, Y + B * .58, B * .42, B * .36); g.save(); g.beginPath(); g.arc(X + B * .5, Y + B * .5, B * .36, 0, Math.PI * 2);
      const gr = g.createRadialGradient(X + B * .38, Y + B * .36, 2, X + B * .5, Y + B * .5, B * .38); gr.addColorStop(0, '#86827c'); gr.addColorStop(1, '#33302e'); g.fillStyle = gr; g.fill(); tex(.55); g.restore();
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; line(g, X + B * .5 + Math.cos(a) * B * .2, Y + B * .5 + Math.sin(a) * B * .2, X + B * .5 + Math.cos(a) * B * .35, Y + B * .5 + Math.sin(a) * B * .35); }
    }
    if (t === BRAZ) {
      g.fillStyle = 'rgba(0,0,0,.55)'; ell(g, X + B * .52, Y + B * .8, B * .34, B * .11); g.strokeStyle = '#1e1a18'; g.lineWidth = 2.6; line(g, X + B * .28, Y + B * .82, X + B * .4, Y + B * .5); line(g, X + B * .72, Y + B * .82, X + B * .6, Y + B * .5); line(g, X + B * .5, Y + B * .86, X + B * .5, Y + B * .5);
      g.fillStyle = '#2a2422'; ell(g, X + B * .5, Y + B * .47, B * .3, B * .15); g.fillStyle = '#4a1a0c'; ell(g, X + B * .5, Y + B * .44, B * .23, B * .09);
    }
    if (t === DOOR) { g.fillStyle = '#2e2016'; g.fillRect(X, Y, B * .12, B); g.fillRect(X + B * .88, Y, B * .12, B); g.save(); g.translate(X + B * .12, Y + B * .05); g.rotate(.55); g.fillStyle = '#3e2c1e'; g.fillRect(0, 0, B * .66, B * .13); g.strokeStyle = 'rgba(0,0,0,.4)'; for (let k = 1; k < 4; k++) line(g, k * B * .16, 0, k * B * .16, B * .13); g.restore(); }
    if (t === RUBBLE) { for (let k = 0; k < 6; k++) { const px = X + B * .15 + lr() * B * .7, py = Y + B * .15 + lr() * B * .7, rr = 2 + lr() * 5; g.fillStyle = 'rgba(0,0,0,.5)'; ell(g, px + 1.5, py + 1.5, rr, rr * .7); const v = 58 + lr() * 30; g.fillStyle = rgb(v, v * .95, v * .9); ell(g, px, py, rr, rr * .75, lr() * 3); } }
    if (deco[i] === 1) {
      g.strokeStyle = '#8e8470'; g.lineWidth = 2; g.lineCap = 'round'; const bx = X + B * .2 + lr() * B * .5, by = Y + B * .25 + lr() * B * .45; line(g, bx, by, bx + B * .22, by + B * .07); line(g, bx + B * .05, by + B * .16, bx + B * .2, by - B * .03);
      if (lr() < .5) { g.fillStyle = '#a69a80'; ell(g, bx + B * .3, by + B * .17, B * .08, B * .07); g.fillStyle = '#120e0c'; circ(g, bx + B * .28, by + B * .16, 1.3); circ(g, bx + B * .33, by + B * .16, 1.3); }
    }
    if (deco[i] === 3) { g.strokeStyle = 'rgba(8,6,6,.75)'; g.lineWidth = 1; g.beginPath(); let px = X + lr() * B, py = Y + lr() * B; g.moveTo(px, py); for (let k = 0; k < 6; k++) { px += lr() * 12 - 6; py += lr() * 12 - 6; g.lineTo(px, py); } g.stroke(); }
    if (deco[i] === 4) { g.fillStyle = 'rgba(0,0,0,.4)'; ell(g, X + B * .52, Y + B * .6, 4, 2); g.fillStyle = '#bdb294'; g.fillRect(X + B * .46, Y + B * .36, B * .08, B * .22); g.fillStyle = '#d6ccb0'; ell(g, X + B * .5, Y + B * .58, 4.5, 2); circ(g, X + B * .44, Y + B * .5, 1.2); }
  }
  for (const [x, y] of L.trees) {
    rs = (x * 999 + y * 777) >>> 0; const bx = x * B + B * .5, by = y * B + B * .75; g.fillStyle = 'rgba(0,0,0,.45)'; ell(g, bx + 4, by, B * .28, B * .1); g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const a = lr() * Math.PI + Math.PI * .05; g.strokeStyle = '#1c1714'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(a) * 8, by + 3, bx + Math.cos(a) * 16, by + Math.sin(a) * 6 + 2); g.stroke(); }
    const br = (px, py, a, len, w, dd) => {
      const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len; g.strokeStyle = dd < 1 ? '#231d19' : '#1a1512'; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo((px + ex) / 2 + (lr() - .5) * len * .3, (py + ey) / 2, ex, ey); g.stroke();
      if (dd < 5) { const n = dd < 2 ? 3 : 2; for (let k = 0; k < n; k++) br(ex, ey, a + (lr() - .5) * 1.3, len * (.55 + lr() * .2), w * .6, dd + 1); }
    };
    br(bx, by, -Math.PI / 2 + (lr() - .5) * .3, B * .4, 5, 0);
  }
  if (S.G.sealOpen) artOpenSeal(S.G.found.seal[0], S.G.found.seal[1]);
  // the night so far: blood and scorch from before a reload
  for (const s of L.art.scorch) paintScorch(s);
  for (const s of L.art.stains) paintBlood(s);
  mapReal = c; return c;
}
export function artOpenGrave(x, y) {
  if (!mapG) return; const g = mapG, B = RB, X = x * B, Y = y * B; const r = lcg(x * 7919 + y * 104729); g.save();
  g.fillStyle = 'rgba(44,34,26,.92)'; ell(g, X + B * .5, Y + B * .74, B * .38, B * .2); g.fillStyle = '#0c0907'; ell(g, X + B * .5, Y + B * .76, B * .28, B * .13);
  for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#3a2e24' : '#2a2019'; ell(g, X + B * (.16 + r() * .68), Y + B * (.86 + r() * .1), B * (.04 + r() * .05), B * .03); }
  g.restore();
}
export function artOpenSeal(x, y) {
  if (!mapG) return; const g = mapG, B = RB, X = x * B, Y = y * B; g.save();
  const gr = g.createLinearGradient(X, Y, X + B, Y); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(.5, '#3e4146'); gr.addColorStop(1, '#2a2c30'); g.fillStyle = gr; g.fillRect(X, Y, B, B);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(X, Y, B * .08, B); g.fillRect(X + B * .92, Y, B * .08, B); g.strokeStyle = 'rgba(160,180,196,.22)'; g.lineWidth = 1; g.strokeRect(X + B * .1, Y + .5, B * .8, B - 1); g.restore();
}
// blood and scorch are remembered with the level, so they survive a reload
const ART_CAP = 1600;
export function stampBlood(x, y, amt) { const s = { x: +x.toFixed(2), y: +y.toFixed(2), a: +amt.toFixed(2), s: (Math.random() * 4294967296) >>> 0 }; const st = S.L.art.stains; st.push(s); if (st.length > ART_CAP) st.splice(0, st.length - ART_CAP); paintBlood(s); }
export function stampScorch(x, y, R, kind) { const s = { x, y, R, k: kind, s: (Math.random() * 4294967296) >>> 0 }; const st = S.L.art.scorch; st.push(s); if (st.length > 300) st.shift(); paintScorch(s); }
function paintBlood(s) {
  if (!mapG) return; const g = mapG, B = RB, r = lcg(s.s); const X = s.x * B, Y = s.y * B, R = B * (.12 + s.a * .1);
  g.fillStyle = `rgba(${64 + r() * 30 | 0},6,6,.8)`; for (let k = 0; k < 4; k++) ell(g, X + (r() - .5) * R, Y + (r() - .5) * R * .6, R * (.3 + r() * .45), R * (.2 + r() * .3), r() * 3);
  for (let k = 0; k < 7; k++) { const a = r() * 6.28, dd = R * (.7 + r() * 1.3); circ(g, X + Math.cos(a) * dd, Y + Math.sin(a) * dd * .7, Math.max(.7, R * (.04 + r() * .08))); }
}
function paintScorch(s) {
  if (!mapG) return; const g = mapG, B = RB, r = lcg(s.s); const X = s.x * B, Y = s.y * B; const rr = s.R * B;
  const gr = g.createRadialGradient(X, Y, 0, X, Y, rr); const c = s.k === 'rot' ? '34,40,20' : '12,10,9'; gr.addColorStop(0, `rgba(${c},.75)`); gr.addColorStop(.6, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(X, Y, rr, 0, Math.PI * 2); g.fill();
  g.fillStyle = s.k === 'rot' ? 'rgba(70,24,14,.6)' : 'rgba(150,140,118,.75)'; for (let k = 0; k < 14; k++) { const a = r() * 6.28, dd = rr * (.2 + r() * .8); ell(g, X + Math.cos(a) * dd, Y + Math.sin(a) * dd, 1 + r() * 2.4, .8 + r() * 1.4, r() * 3); }
}
