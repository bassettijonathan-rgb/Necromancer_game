// Opens the built page in headless Chromium, plays a little, and checks saving and the stress test.
// NODE_PATH must reach a Playwright install: NODE_PATH=$(npm root -g) node tools/browser-check.mjs
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const file = 'file://' + resolve('dist/necromancer.html');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = n => page.screenshot({ path: `${process.env.SHOTS || '.'}/${n}.png` });
const st = () => page.evaluate(() => window.__necro.state);
const wait = ms => page.waitForTimeout(ms);

await page.goto(file); await wait(5000);
console.log('title:', (await page.evaluate(() => window.__necro.folio())).replace(/\s+/g, ' ').slice(0, 160));
await shot('01-title');
await page.evaluate(() => window.__necro.click('new')); await wait(2500);
console.log('after begin, modal:', await page.evaluate(() => window.__necro.modal));
await page.evaluate(() => window.__necro.closeModal()); await wait(1500);
await shot('02-start');
let s = await st(); console.log('start', { turn: s.turn, minions: s.minions, zone: s.zone });
// walk a bit by keyboard
for (const k of ['KeyD', 'KeyD', 'KeyD', 'KeyS', 'KeyD']) { await page.keyboard.press(k); await wait(250); }
s = await st(); console.log('after keys turn', s.turn);
// let the bot play with animation
await page.evaluate(() => window.__necro.setAuto(true)); await wait(12000);
s = await st(); console.log('bot', { turn: s.turn, minions: s.minions, blood: Math.round(s.blood), fps: s.fps, q: s.q, prof: s.prof, gameOver: s.gameOver, modal: s.modal });
await shot('03-bot');
await page.evaluate(() => { window.__necro.setAuto(false); if (window.__necro.modal) window.__necro.closeModal(); });
// save, reload, continue
await page.evaluate(() => window.__necro.saveNow());
const before = await page.evaluate(() => JSON.stringify(window.__necro.save()).length);
const t0 = (await st()).turn;
await page.reload(); await wait(5000);
console.log('title after reload:', (await page.evaluate(() => window.__necro.folio())).replace(/\s+/g, ' ').slice(0, 200));
await page.evaluate(() => window.__necro.click('continue')); await wait(2500);
s = await st(); console.log('continued at turn', s.turn, 'was', t0, 'save KB', (before / 1024).toFixed(1));
await shot('04-continued');
// stress test, then back
await page.evaluate(() => window.__necro.startStress()); await wait(15000);
s = await st(); console.log('stress', { fps: s.fps, q: s.q, ents: s.ents, pn: s.pn, prof: s.prof });
await shot('05-stress');
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
