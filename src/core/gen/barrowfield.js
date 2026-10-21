// The demo's region, now one place generator among the many to come: graveyard, chapel, crypt, caves, and what lies under them.
import { S } from '../state.js';
import { rnd, ri, pick, hash, vnoise, clamp, shuffled } from '../rng.js';
import { log } from '../events.js';
import { W, H, N, I, inb, canWalk, newLevel, bindLevel, bfs, findFree, nearDoor, findFloor, occ, DIRS, BLK,
  ROCK, BRICK, FLOOR, DIRT, GRASS, GRAVE, TREE, WATER, DOOR, CAVE, RUBBLE, SARC, PILLAR, PATH, BRAZ, FWALL, FOUND, SEAL, CRADLE, ALTAR, ASH } from '../level.js';
import { MISSBIT, HEROES, RIVALS } from '../content.js';
import { spawn, mkItem, applyGear, addChest, chestAt, rollLoot, dropLoot } from '../rules.js';

function regionName() {
  const a = ['Cold', 'Ash', 'Grey', 'Hollow', 'Lamb', 'Mourn', 'Wether', 'Dun', 'Saltern', 'Rook', 'Wyke', 'Barrow'], b = ['harrow', 'mere', 'lea', 'field', 'wick', 'stow', 'ing', 'by', 'hythe', 'combe'];
  let n = pick(a) + pick(b); if (n.startsWith('Barrow') && n.endsWith('field')) n = 'Barrowmere'; return n;
}

export function genBarrowfield() {
  const L = newLevel('barrowfield'); L.zoneNames = ['the graveyard', 'the chapel', 'the crypt', 'the caves', 'the Foundations', 'the sealed room'];
  bindLevel(L);
  const { map, outdoor, deco, zone } = L; const sd = S.seed; const G = S.G = {};
  const { braziers, candles, seams, trees, graves, rooms } = L;
  // ---- graveyard
  for (let y = 1; y <= H - 2; y++) for (let x = 1; x <= 31; x++) {
    const e = Math.min(x - 1, y - 1, H - 2 - y);
    if (e < 2 && hash(x, y, 3 + sd % 97) < .55 - e * .25) continue;
    const i = I(x, y); map[i] = vnoise(x * .22, y * .22, 4 + sd % 31) > .5 ? GRASS : DIRT; outdoor[i] = 1;
  }
  // ---- chapel of the Mercy
  const north = rnd() < .5; const cx0 = ri(4, 11), cw = 14, ch = 10; const cy0 = north ? ri(2, 4) : H - 3 - ch - ri(0, 2);
  for (let y = cy0; y < cy0 + ch; y++) for (let x = cx0; x < cx0 + cw; x++) { const i = I(x, y); map[i] = (x === cx0 || x === cx0 + cw - 1 || y === cy0 || y === cy0 + ch - 1) ? BRICK : FLOOR; outdoor[i] = 0; zone[i] = 1; }
  const doorX = cx0 + 7, doorY = north ? cy0 + ch - 1 : cy0; map[I(doorX, doorY)] = DOOR;
  const altY = north ? cy0 + 2 : cy0 + ch - 3; map[I(cx0 + 7, altY)] = ALTAR;
  for (const dx of [5, 9]) if (map[I(cx0 + dx, altY)] === FLOOR) { deco[I(cx0 + dx, altY)] = 4; candles.push([cx0 + dx, altY]); }
  for (const dx of [2, 11]) { const by = north ? cy0 + 2 : cy0 + ch - 3; map[I(cx0 + dx, by)] = BRAZ; braziers.push([cx0 + dx, by]); }
  for (const dx of [4, 10]) map[I(cx0 + dx, cy0 + 5)] = PILLAR;
  G.chapel = { x0: cx0, y0: cy0, x1: cx0 + cw - 1, y1: cy0 + ch - 1, door: [doorX, doorY], inside: [cx0 + 7, cy0 + 5], altar: [cx0 + 7, altY], north };
  // ---- crypt bounds
  const kx0 = 33, kx1 = 55, ky0 = ri(5, 8), ky1 = ri(H - 9, H - 6);
  // ---- road from the west edge to the crypt door
  let ry = ri(Math.max(ky0 + 4, 20), Math.min(ky1 - 4, 35)); G.roadY = ry; const road = [];
  for (let x = 1; x < kx0; x++) {
    if (x > 3 && x < kx0 - 3 && rnd() < .25) ry = clamp(ry + (rnd() < .5 ? -1 : 1), ky0 + 3, ky1 - 3); road.push([x, ry]);
    for (let dy = -1; dy <= 1; dy++) { const i = I(x, ry + dy); if (!inb(x, ry + dy) || zone[i]) continue; if (dy === 0 || hash(x, ry + dy, 8) < .55) map[i] = PATH; else if (map[i] === ROCK) map[i] = DIRT; outdoor[i] = 1; }
  }
  G.road = road; G.cryptDoor = [kx0, ry];
  // path from chapel door to the road
  {
    let x = doorX, y = north ? doorY + 1 : doorY - 1; const ty = road[clamp(x - 1, 0, road.length - 1)][1]; const st = north ? 1 : -1;
    for (let g = 0; g < 60 && y !== ty; g++, y += st) { const i = I(x, y); if (!inb(x, y) || zone[i]) continue; map[i] = PATH; outdoor[i] = 1; if (hash(x + 1, y, 9) < .5 && !zone[I(x + 1, y)]) { map[I(x + 1, y)] = PATH; outdoor[I(x + 1, y)] = 1; } }
  }
  // graves
  const nearRoad = (x, y) => { const r = road[clamp(x - 1, 0, road.length - 1)]; return Math.abs(r[1] - y) <= 2; };
  const inChapel = (x, y) => x >= cx0 - 2 && x <= cx0 + cw + 1 && y >= cy0 - 2 && y <= cy0 + ch + 1;
  for (const gx of [4, 7, 10, 13, 16, 19, 22, 25, 28]) for (let y = 3; y <= H - 4; y++) {
    const i = I(gx, y);
    if (!outdoor[i] || map[i] === PATH || nearRoad(gx, y) || inChapel(gx, y)) continue; if (rnd() < .6) { map[i] = GRAVE; graves.push([gx, y]); }
  }
  for (let k = 0; k < 120 && trees.length < 18; k++) {
    const x = ri(2, 30), y = ri(2, H - 3), i = I(x, y);
    if ((map[i] === GRASS || map[i] === DIRT) && !nearRoad(x, y) && !inChapel(x, y) && x % 3 !== 1) { map[i] = TREE; trees.push([x, y]); }
  }
  // ---- crypt: BSP rooms
  for (let y = ky0; y <= ky1; y++) for (let x = kx0; x <= kx1; x++) { const i = I(x, y); map[i] = (x === kx0 || x === kx1 || y === ky0 || y === ky1) ? BRICK : FLOOR; zone[i] = 2; }
  const doors = [];
  const isDoorAt = (x, y) => doors.some(d => d[0] === x && d[1] === y);
  const bsp = (x0, y0, x1, y1, d) => {
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const canV = w >= 11, canH = h >= 11;
    if (d >= 4 || (!canV && !canH) || (d >= 2 && w * h < 70 && rnd() < .5)) { rooms.push({ x0, y0, x1, y1 }); return; }
    const vert = canV && (!canH || w > h || (w === h && rnd() < .5));
    for (let tries = 0; tries < 12; tries++) {
      if (vert) {
        const sx = ri(x0 + 4, x1 - 4); if (isDoorAt(sx, y0 - 1) || isDoorAt(sx, y1 + 1)) continue;
        for (let y = y0; y <= y1; y++) map[I(sx, y)] = BRICK; const dy = ri(y0 + 1, y1 - 1); map[I(sx, dy)] = DOOR; doors.push([sx, dy]);
        bsp(x0, y0, sx - 1, y1, d + 1); bsp(sx + 1, y0, x1, y1, d + 1); return;
      } else {
        const sy = ri(y0 + 4, y1 - 4); if (isDoorAt(x0 - 1, sy) || isDoorAt(x1 + 1, sy)) continue;
        for (let x = x0; x <= x1; x++) map[I(x, sy)] = BRICK; const dx = ri(x0 + 1, x1 - 1); map[I(dx, sy)] = DOOR; doors.push([dx, sy]);
        bsp(x0, y0, x1, sy - 1, d + 1); bsp(x0, sy + 1, x1, y1, d + 1); return;
      }
    }
    rooms.push({ x0, y0, x1, y1 });
  };
  bsp(kx0 + 1, ky0 + 1, kx1 - 1, ky1 - 1, 0);
  map[I(kx0, G.cryptDoor[1])] = DOOR;
  const by = ri(ky0 + 4, ky1 - 4); G.breach = [kx1, by]; for (let dy = -1; dy <= 1; dy++) map[I(kx1, by + dy)] = RUBBLE;
  // ---- caves
  const cav = new Uint8Array(N); const cx0c = kx1 + 1;
  for (let y = 0; y < H; y++) for (let x = cx0c; x < W; x++) cav[I(x, y)] = (x <= cx0c || x >= W - 1 || y <= 0 || y >= H - 1) ? 1 : (rnd() < .45 ? 1 : 0);
  for (let it = 0; it < 5; it++) {
    const nx = cav.slice();
    for (let y = 1; y < H - 1; y++) for (let x = cx0c + 1; x < W - 1; x++) { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += cav[I(x + dx, y + dy)]; nx[I(x, y)] = c >= 5 ? 1 : 0; }
    cav.set(nx);
  }
  for (let y = 1; y < H - 1; y++) for (let x = cx0c + 1; x < W - 1; x++) if (!cav[I(x, y)]) { map[I(x, y)] = CAVE; zone[I(x, y)] = 3; }
  const carve = (x, y) => { if (x < cx0c || x > W - 2 || y < 1 || y > H - 2) return; const i = I(x, y); if (map[i] === ROCK) { map[i] = CAVE; zone[i] = 3; } };
  const tunnel = (x0, y0, x1, y1) => {
    let x = x0, y = y0, g = 0; while ((x !== x1 || y !== y1) && g++ < 600) {
      if (rnd() < .7) { if (x !== x1 && (rnd() < .5 || y === y1)) x += Math.sign(x1 - x); else y += Math.sign(y1 - y); }
      else { if (rnd() < .5) x += rnd() < .5 ? 1 : -1; else y += rnd() < .5 ? 1 : -1; }
      x = clamp(x, cx0c, W - 2); y = clamp(y, 1, H - 2); carve(x, y); if (rnd() < .5) carve(x + 1, y); if (rnd() < .5) carve(x, y + 1);
    }
  };
  for (let x = cx0c; x <= cx0c + 4; x++) { carve(x, by); if (rnd() < .6) carve(x, by - 1); if (rnd() < .6) carve(x, by + 1); }
  // ---- the Foundations
  const fw = 14, fh = 12, fx0 = W - 2 - fw - ri(0, 2), fy0 = ri(4, H - 5 - fh);
  for (let y = fy0; y < fy0 + fh; y++) for (let x = fx0; x < fx0 + fw; x++) { const i = I(x, y); map[i] = (x === fx0 || x === fx0 + fw - 1 || y === fy0 || y === fy0 + fh - 1) ? FWALL : FOUND; zone[i] = 4; }
  const ey = fy0 + 5; map[I(fx0, ey)] = FOUND; map[I(fx0, ey + 1)] = FOUND; map[I(fx0 - 1, ey)] = RUBBLE; map[I(fx0 - 1, ey + 1)] = RUBBLE;
  const wx = fx0 + 7; for (let y = fy0; y < fy0 + fh; y++) map[I(wx, y)] = FWALL;
  for (let x = wx; x < fx0 + fw; x++) { map[I(x, fy0 + 2)] = FWALL; map[I(x, fy0 + fh - 3)] = FWALL; }
  for (let y = fy0 + 3; y <= fy0 + fh - 4; y++) for (let x = wx + 1; x < fx0 + fw - 1; x++) zone[I(x, y)] = 5;
  const sealY = fy0 + 5; map[I(wx, sealY)] = SEAL; const crx = fx0 + 10, cry = sealY; map[I(crx, cry)] = CRADLE;
  map[I(fx0 + 3, fy0 + 3)] = FWALL; map[I(fx0 + 3, fy0 + fh - 4)] = FWALL;
  seams.push([fx0 + 1, fy0 + 1], [fx0 + 1, fy0 + fh - 2], [fx0 + 5, fy0 + 1], [fx0 + 5, fy0 + fh - 2], [crx - 1, cry - 1], [crx + 1, cry + 1]);
  G.found = { x0: fx0, y0: fy0, x1: fx0 + fw - 1, y1: fy0 + fh - 1, seal: [wx, sealY], cradle: [crx, cry], entry: [fx0 - 1, ey], room: { x0: wx + 1, y0: fy0 + 3, x1: fx0 + fw - 2, y1: fy0 + fh - 4 } };
  tunnel(cx0c + 3, by, fx0 - 2, ey);
  // more cave branches
  tunnel(cx0c + 3, by, cx0c + 8, ri(3, 10)); tunnel(cx0c + 3, by, cx0c + 9, ri(H - 11, H - 4));
  for (let y = 1; y < H - 1; y++) for (let x = cx0c + 1; x < W - 1; x++) {
    const i = I(x, y); if (map[i] !== CAVE) continue;
    const df = Math.hypot(x - (fx0 + fw / 2), y - (fy0 + fh / 2));
    if (df < 11 && vnoise(x * .3, y * .3, 61) > .38) map[i] = ASH;
    else if (vnoise(x * .2, y * .2, 9 + sd % 13) > .68 && df > 12 && x > cx0c + 5) map[i] = WATER;
    else if (hash(x, y, 12) < .05) map[i] = RUBBLE;
  }
  // ---- borders and connectivity
  for (let x = 0; x < W; x++) { map[I(x, 0)] = ROCK; map[I(x, H - 1)] = ROCK; } for (let y = 0; y < H; y++) { map[I(0, y)] = ROCK; map[I(W - 1, y)] = ROCK; }
  G.start = [2, road[1][1]];
  const d = new Int16Array(N); bfs(d, [I(G.start[0], G.start[1])], SEAL);
  for (let i = 0; i < N; i++) if (!BLK[map[i]] && d[i] >= 9999) map[i] = ROCK;
  // ---- rooms: purpose and furnishing
  const dc = new Int16Array(N); bfs(dc, [I(kx0 + 1, G.cryptDoor[1])]);
  rooms.forEach((r, ix) => { r.ix = ix; r.cx = (r.x0 + r.x1) >> 1; r.cy = (r.y0 + r.y1) >> 1; r.area = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1); r.d = dc[I(r.cx, r.cy)]; if (r.d >= 9999) { const q = findFloor(r); r.d = q ? dc[I(q[0], q[1])] : 0; } });
  const byFar = rooms.slice().sort((a, b) => b.d - a.d || a.ix - b.ix);
  const necroRoom = byFar[0], tabletRoom = byFar.find(r => r !== necroRoom && r.area >= 20) || byFar[1] || byFar[0];
  G.necroRoom = necroRoom.ix; G.tabletRoom = tabletRoom.ix;
  const big = rooms.slice().sort((a, b) => b.area - a.area || a.ix - b.ix)[0];
  const free = (x, y) => map[I(x, y)] === FLOOR && !nearDoor(x, y);
  for (const r of rooms) {
    if (r === big) { for (let y = r.y0 + 2; y <= r.y1 - 2; y += 3) for (let x = r.x0 + 2; x <= r.x1 - 2; x += 3) if (free(x, y)) map[I(x, y)] = PILLAR; }
    else if (r === tabletRoom || rnd() < .55) { for (let x = r.x0 + 1; x <= r.x1 - 1; x += 2) { if (free(x, r.y0)) map[I(x, r.y0)] = SARC; if (r.y1 - r.y0 > 3 && rnd() < .6 && free(x, r.y1)) map[I(x, r.y1)] = SARC; } }
    if (r.area >= 30 && braziers.length < 4 && r !== necroRoom && rnd() < .6) { const x = r.x0, y = r.y0; if (free(x, y)) { map[I(x, y)] = BRAZ; braziers.push([x, y]); } }
    if (rnd() < .5) { const x = ri(r.x0, r.x1), y = ri(r.y0, r.y1); if (free(x, y)) { deco[I(x, y)] = 4; candles.push([x, y]); } }
  }
  // final connectivity pass after furnishing
  bfs(d, [I(G.start[0], G.start[1])], SEAL);
  for (let i = 0; i < N; i++) if (!BLK[map[i]] && d[i] >= 9999) map[i] = ROCK;
  // deco
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y), t = map[i], h = hash(x, y, 21 + sd % 7);
    if (deco[i]) continue;
    if ((t === CAVE || t === ASH) && h < .07) deco[i] = 1;
    else if (t === FLOOR) { if (h < .12) deco[i] = 3; else if (h < .17) deco[i] = 1; }
    else if ((t === DIRT || t === GRASS) && h < .025) deco[i] = 1;
  }
  for (let i = 0; i < N; i++) if (zone[i] === 2 && map[i] !== BRICK && map[i] !== DOOR && map[i] !== RUBBLE) outdoor[i] = 0;
  return L;
}

export function buildStaticLights(L) {
  const out = [];
  for (const [x, y] of L.braziers) out.push({ x, y, r: 6.8, c: [1, .5, .2], I: 1.3, kind: 'braz' });
  for (const [x, y] of L.candles) out.push({ x, y, r: 3.6, c: [1, .66, .32], I: .65, kind: 'candle' });
  for (const [x, y] of L.seams) out.push({ x, y, r: 3.4, c: [.5, .62, .74], I: .42, kind: 'seam' });
  for (const s of out) s.seed = hash(s.x, s.y, 5) * 10;
  return out;
}

function openGround(x0, x1, y0, y1) { for (let k = 0; k < 200; k++) { const x = ri(x0, x1), y = ri(y0, y1); if (canWalk(x, y) && !occ[I(x, y)] && S.L.map[I(x, y)] !== PATH) return [x, y]; } return findFree(ri(x0, x1), ri(y0, y1), 6); }

// people the region: you and your first dead, the Mercy, the hounds, the remains and the goods
export function populateBarrowfield() {
  const L = S.L, G = S.G, rooms = L.rooms;
  S.region = regionName(); S.heroName = pick(HEROES); S.rivalName = pick(RIVALS);
  S.staticLights = buildStaticLights(L);
  S.learned = { raise: 1, bolt: 1, burst: 1, breath: 1 };
  const pl = S.player = spawn('player', G.start[0], G.start[1]); pl.energy = 100; pl.name = ''; pl.pack = [mkItem('bandage'), mkItem('bandage'), mkItem('salt')]; applyGear(); S.will = S.WMAX;
  for (const [dx, dy] of [[1, -1], [1, 1]]) { const q = findFree(G.start[0] + dx, G.start[1] + dy, 2); if (q) spawn('skel', q[0], q[1]); }
  // the Mercy: a patrol among the graves, the chapel watch, two searchers in the crypt
  const route = []; for (let k = 0; k < 4; k++) route.push(openGround(6 + k * 6, 9 + k * 6, 4, H - 5));
  for (const t of ['zealot', 'zealot', 'xbow']) { const q = findFree(route[2][0], route[2][1], 3); if (q) spawn(t, q[0], q[1], { route: route.slice(2).concat(route.slice(0, 2)) }); }
  const ch = G.chapel;
  { const q = findFree(ch.inside[0], ch.inside[1], 2); if (q) spawn('conf', q[0], q[1], { post: q }); }
  for (const dx of [-2, 2]) { const q = findFree(ch.door[0] + dx, ch.door[1] + (ch.north ? -1 : 1), 2); if (q) spawn('zealot', q[0], q[1], { post: q }); }
  const rs = shuffled(rooms);
  if (rs.length > 2) { const r1 = rs[0], r2 = rs[1]; const q = findFree(r1.cx, r1.cy, 3); if (q) spawn('zealot', q[0], q[1], { route: [[r1.cx, r1.cy], [r2.cx, r2.cy], [G.cryptDoor[0] + 2, G.cryptDoor[1]]] }); }
  // hounds in the caves, and what they have been eating
  const fdf = new Int16Array(N); bfs(fdf, [I(G.breach[0] + 1, G.breach[1])]); let den = null, dd = 0;
  for (let k = 0; k < 400; k++) { const x = ri(G.breach[0] + 4, W - 3), y = ri(2, H - 3), i = I(x, y); if (L.zone[i] !== 3 || !canWalk(x, y) || fdf[i] >= 9999) continue; const df = Math.hypot(x - G.found.entry[0], y - G.found.entry[1]); const v = Math.min(fdf[i], 30) + Math.min(df, 10); if (v > dd && df > 7) { dd = v; den = [x, y]; } }
  den = den || [G.breach[0] + 8, G.breach[1]];
  for (let k = 0; k < 4; k++) { const q = findFree(den[0], den[1], 3); if (q) spawn('hound', q[0], q[1], { post: den }); }
  const C = S.corpses;
  for (let k = 0; k < 3; k++) { const q = findFree(den[0] + ri(-3, 3), den[1] + ri(-3, 3), 3); if (q) C.push({ id: S.nextId++, x: q[0], y: q[1], kind: pick(['zealot', 'zealot', 'xbow']), age: ri(130, 260), cause: 'pierce', miss: rnd() < .4 ? MISSBIT.armL : 0, rot: rnd() * 6.28, weapon: 'hook' }); }
  for (let k = 0; k < 5; k++) { const q = findFree(den[0] + ri(-4, 4), den[1] + ri(-4, 4), 4); if (q) C.push({ id: S.nextId++, x: q[0], y: q[1], kind: rnd() < .5 ? 'bones' : 'bhound', age: 999, rot: rnd() * 6.28, miss: 0 }); }
  // remains in the crypt
  for (const r of rooms) { const n = ri(0, 2); for (let k = 0; k < n; k++) { const q = findFree(ri(r.x0, r.x1), ri(r.y0, r.y1), 1); if (q && !occ[I(q[0], q[1])]) C.push({ id: S.nextId++, x: q[0], y: q[1], kind: 'bones', age: 999, rot: rnd() * 6.28, miss: rnd() < .3 ? MISSBIT.legL : 0 }); } }
  { const r = rooms[G.necroRoom]; const q = findFree(r.cx, r.cy, 3); if (q) { C.push({ id: S.nextId++, x: q[0], y: q[1], kind: 'bones', age: 999, rot: rnd() * 6.28, miss: 0, name: S.rivalName }); const t = findFree(q[0] + 1, q[1], 2); if (t) S.items.push({ kind: 'tome', x: t[0], y: t[1] }); } }
  { const r = rooms[G.tabletRoom]; const t = findFree(r.cx, r.cy, 3); if (t) S.items.push({ kind: 'tablet', x: t[0], y: t[1] }); }
  // the ones who reached the door before you
  { const [sx, sy] = G.found.seal; for (let k = 0; k < 2; k++) { const q = findFree(sx - 2, sy + ri(-2, 2), 2); if (q) C.push({ id: S.nextId++, x: q[0], y: q[1], kind: 'bones', age: 999, rot: rnd() * 6.28, miss: 0 }); } }
  // containers: every sarcophagus, a box by the graves, the Mercy's alms, a chest in the crypt, a pack by the den
  for (let i = 0; i < N; i++) if (L.map[i] === SARC) addChest('sarc', i % W, (i / W) | 0);
  { const ss = shuffled(S.chests); for (let k = 0; k < Math.min(7, ss.length); k++) ss[k].goods = true; }
  const roomy = (x, y, r) => { for (let k = 0; k < 60; k++) { const q = findFree(x + ri(-r, r), y + ri(-r, r), 2); if (!q) continue; let n = 0; for (const [dx, dy] of DIRS) if (canWalk(q[0] + dx, q[1] + dy)) n++; if (n >= (k < 30 ? 8 : 6) && !chestAt(q[0], q[1])) return q; } return null; };
  { const q = roomy(12, H >> 1, 8); if (q) addChest('box', q[0], q[1]); }
  { const q = roomy(ch.inside[0], ch.inside[1], 3); if (q) addChest('alms', q[0], q[1]); }
  { const rs2 = shuffled(rooms.filter(r => r.ix !== G.necroRoom && r.ix !== G.tabletRoom)); for (const r of rs2) { const q = roomy(r.cx, r.cy, Math.max(1, Math.min(r.x1 - r.x0, r.y1 - r.y0) >> 1)); if (q && L.zone[I(q[0], q[1])] === L.zone[I(r.cx, r.cy)]) { addChest('chest', q[0], q[1]); break; } } }
  { const q = roomy(den[0], den[1], 4); if (q) addChest('pack', q[0], q[1]); }
  for (let k = 0; k < 3 && rooms.length; k++) { const r = pick(rooms); const q = findFree(ri(r.x0, r.x1), ri(r.y0, r.y1), 2); if (q) { const it = rollLoot('chest', 0); if (it) dropLoot(q[0], q[1], it); } }
  // graveyard: one fresh body, killed tonight
  { const q = openGround(8, 24, 4, H - 5); if (q) C.push({ id: S.nextId++, x: q[0], y: q[1], kind: 'zealot', age: ri(10, 40), cause: 'cut', rot: rnd() * 6.28, miss: 0, weapon: 'hook' }); }
  log(`Night, in the barrow-field of ${S.region}. The chapel bell is silent.`, 'grey');
  log('Your dead wait among the graves. Press ? for the controls.');
}
