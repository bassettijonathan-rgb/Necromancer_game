// One local map: tiles, what has been seen, and the grid queries everything else is built on.
// The arrays are bound as live module bindings so hot loops read `map[i]` directly.
import { S } from './state.js';

export const W = 84, H = 56, N = W * H;
export const ROCK = 0, BRICK = 1, FLOOR = 2, DIRT = 3, GRASS = 4, GRAVE = 5, TREE = 6, WATER = 7, DOOR = 8, CAVE = 9, RUBBLE = 10, SARC = 11, PILLAR = 12,
  OGRAVE = 13, PATH = 14, BRAZ = 15, FWALL = 16, FOUND = 17, SEAL = 18, CRADLE = 19, ALTAR = 20, ASH = 21;
export const OPQ = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
export const BLK = [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0];
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const LEVEL_ARRAYS = ['map', 'outdoor', 'deco', 'seen', 'zone', 'solid'];

export let map, outdoor, deco, seen, zone, solid;
export const vis = new Uint8Array(N);
export const occ = new Array(N).fill(null);

export function newLevel(kind) {
  const L = { kind, zoneNames: [], braziers: [], candles: [], seams: [], trees: [], graves: [], rooms: [], art: { stains: [], scorch: [] } };
  for (const k of LEVEL_ARRAYS) L[k] = new Uint8Array(N);
  return L;
}
export function bindLevel(L) {
  S.L = L;
  map = L.map; outdoor = L.outdoor; deco = L.deco; seen = L.seen; zone = L.zone; solid = L.solid;
  vis.fill(0); occ.fill(null); fieldCache.clear();
  for (const e of S.ents) if (!e.dead) occ[e.y * W + e.x] = e;
}

export const I = (x, y) => y * W + x, inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const isOpq = (x, y) => !inb(x, y) || OPQ[map[y * W + x]] === 1;
export const canWalk = (x, y) => inb(x, y) && !BLK[map[y * W + x]] && !solid[y * W + x];
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- pathing ---------- */
const Q = new Int32Array(N);
export function bfs(dist, sources, passTile) {
  dist.fill(9999); let h = 0, t = 0;
  for (const i of sources) { if (i >= 0 && i < N && dist[i]) { dist[i] = 0; Q[t++] = i; } }
  while (h < t) {
    const i = Q[h++], x = i % W, y = (i / W) | 0, nd = dist[i] + 1;
    for (let k = 0; k < 8; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx;
      if (dist[j] <= nd) continue; const tj = map[j]; if (BLK[tj] && tj !== passTile || solid[j]) continue;
      if (k >= 4 && isOpq(nx, y) && isOpq(x, ny)) continue;
      dist[j] = nd; Q[t++] = j;
    }
  }
}
export { Q as bfsQueue };
export function los(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
  for (;;) {
    if (x === x1 && y === y1) return true;
    if ((x !== x0 || y !== y0) && OPQ[map[y * W + x]]) return false;
    const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; }
  }
}
// distance fields, built lazily and dropped every turn
export const fieldCache = new Map();
export function field(key, sourcesFn) { let f = fieldCache.get(key); if (f) return f; f = new Int16Array(N); bfs(f, sourcesFn()); fieldCache.set(key, f); return f; }
export function fieldTo(x, y) { return field('p' + x + ',' + y, () => [I(x, y)]); }
export function fieldTeam(name, pred) { return field(name, () => { const s = []; for (const o of S.ents) if (!o.dead && pred(o)) s.push(I(o.x, o.y)); return s; }); }

/* ---------- sight ---------- */
export function computeFOV() {
  vis.fill(0); const px = S.player.x, py = S.player.y, R = 16;
  vis[I(px, py)] = 1;
  for (let y = Math.max(0, py - R); y <= Math.min(H - 1, py + R); y++) for (let x = Math.max(0, px - R); x <= Math.min(W - 1, px + R); x++) { if ((x - px) * (x - px) + (y - py) * (y - py) > R * R) continue; if (los(px, py, x, y)) vis[I(x, y)] = 1; }
  for (let y = Math.max(0, py - R); y <= Math.min(H - 1, py + R); y++) for (let x = Math.max(0, px - R); x <= Math.min(W - 1, px + R); x++) {
    const i = I(x, y); if (!vis[i] || OPQ[map[i]]) continue;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && OPQ[map[ny * W + nx]]) vis[ny * W + nx] = 1; }
  }
  for (let i = 0; i < N; i++) if (vis[i]) seen[i] = 1;
}

export function findFree(x, y, maxR) {
  for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const nx = x + dx, ny = y + dy; if (canWalk(nx, ny) && !occ[I(nx, ny)]) return [nx, ny];
  }
  return null;
}
export function nearDoor(x, y) { for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && (map[I(nx, ny)] === DOOR)) return true; } return false; }
export function findFloor(r) { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (canWalk(x, y)) return [x, y]; return null; }
export const zoneName = (x, y) => S.L.zoneNames[zone[I(x, y)]] || '';
