// The simulation never draws or plays anything. It announces what happened, in order, and whoever is
// listening (the renderer, the UI, or nobody in a headless run) decides what to show.
import { S } from './state.js';

const sinks = [];
export function onEvent(fn) { sinks.push(fn); return () => sinks.splice(sinks.indexOf(fn), 1); }
export function emit(type, d) { for (let i = 0; i < sinks.length; i++) sinks[i](type, d); }

export function log(m, cls) {
  if (S.stress && cls !== 'ember') return;
  const L = S.logLines, last = L[L.length - 1];
  if (last && last[0] === m) { last[2]++; emit('log'); return; }
  L.push([m, cls || '', 1]); if (L.length > 7) L.shift();
  emit('log');
}
