// Figures, remains, shadows and glows. Drawn once per look and zoom level into a sprite cache, then stamped.
// The drawing code is carried over from the demo as it was.
import { missMask, ok, stage } from '../core/rules.js';
import { mk, rgb, line, circ, ell } from './mapart.js';

function jag(c,x0,x1,y,amp,sd){for(let x=x0,k=0;x<=x1;x+=1.4,k++)c.lineTo(x,y+((k%2)?amp:-amp*.3)+Math.sin(k*1.7+sd)*amp*.4);}
const PALS={
 zealot:{coat:['#4e443a','#221d18'],hood:['#86725a','#4c3e2e'],skin:'#8e7a68',belt:'#5e4e36'},
 xbow:{coat:['#3e3a2c','#1c1a14'],hood:['#5a4c38','#2e261a'],skin:'#8a7664',belt:'#4a3a26'},
 conf:{coat:['#58565a','#26252a'],hood:['#6a686c','#323034'],skin:'#9a8a7a',belt:'#7a6a4a'},
 necro:{coat:['#4a424c','#1c181e'],hood:['#2e2830','#141115'],skin:'#8e8e7c',belt:'#3a3436'},
};
function risenPal(p){const dk=h=>{const n=parseInt(h.slice(1),16);const r=(n>>16)&255,g=(n>>8)&255,b=n&255;const l=(r*.3+g*.55+b*.15);return rgb(l*.62+18,l*.66+22,l*.6+16);};
 return{coat:p.coat.map(dk),hood:p.hood.map(dk),skin:'#6e7866',belt:dk(p.belt)};}
function humanBody(c,k,pal,o){
 const tilt=o.risen?.35:0;
 // coat
 let g=c.createLinearGradient(-9,-18,8,2);g.addColorStop(0,pal.coat[0]);g.addColorStop(1,pal.coat[1]);c.fillStyle=g;
 const wide=o.bloated?2.6:0,long=k==='conf'?1.5:0;
 c.beginPath();c.moveTo(-9.6-wide-long,1);jag(c,-9.6-wide-long,9.6+wide+long,1,o.risen?2.4:1.4,o.sd);c.quadraticCurveTo(7.5+wide,-10,5+wide*.5,-17);c.lineTo(-5-wide*.5,-17);c.quadraticCurveTo(-7.5-wide,-10,-9.6-wide-long,1);c.fill();
 c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=1;line(c,-2.5,-15,-4,0);line(c,2.5,-14,3.5,0);
 if(o.risen){c.fillStyle='rgba(20,24,18,.6)';ell(c,-3,-8,2.2,3,.4);ell(c,4,-4,1.6,2.4,-.3);}
 c.strokeStyle=pal.belt;c.lineWidth=1.2;line(c,-6,-9.4,6,-8.8);
 // head
 c.save();c.translate(0,-17);c.rotate(tilt);c.translate(0,17);
 g=c.createLinearGradient(-5,-27,5,-16);g.addColorStop(0,pal.hood[0]);g.addColorStop(1,pal.hood[1]);c.fillStyle=g;
 if(k==='xbow'){c.beginPath();c.moveTo(-5,-17);c.quadraticCurveTo(-6,-24,0,-25.5);c.quadraticCurveTo(6,-24,5,-17);c.closePath();c.fill();c.fillStyle=pal.hood[1];ell(c,0,-25.6,9,1.8);ell(c,0,-27.4,4.6,2.4);
  c.fillStyle=pal.skin;ell(c,1.6,-21,2.6,3.1);c.fillStyle='#070504';ell(c,.6,-21.6,.8,1);ell(c,2.8,-21.6,.8,1);}
 else{c.beginPath();c.moveTo(-5.4,-17);c.quadraticCurveTo(-6.8,-24,-2,-27.5);c.lineTo(k==='conf'?0:-.6,k==='conf'?-31:-29.5);c.lineTo(.8,-27.6);c.quadraticCurveTo(6.6,-24,5.4,-17);c.closePath();c.fill();
  c.fillStyle=k==='conf'?'#0a0808':pal.skin;ell(c,1.4,-21.6,2.8,3.4);
  if(k!=='conf'){c.fillStyle='#070504';ell(c,.2,-21.8,.9,1.2,.2);ell(c,2.6,-21.6,.85,1.1,-.2);c.strokeStyle='#1e150e';c.lineWidth=.6;c.beginPath();c.moveTo(-.2,-18.9);for(let i=0;i<5;i++)c.lineTo(-.2+i*.8,-18.9+(i%2?.6:-.4));c.stroke();}}
 c.restore();
 c.strokeStyle=pal.hood[1];c.lineWidth=1.3;line(c,-4.6,-17.4,4.6,-17.4);}
export function drawFig(c,o){
 c.lineCap='round';c.lineJoin='round';
 const m=o.miss||0,armL=!(m&2),armR=!(m&4),legs=((m&8)?0:1)+((m&16)?0:1);
 const crawl=legs===0;if(crawl)c.translate(0,7);
 const ty=o.type;
 if(ty==='player'){
  if(armR){c.strokeStyle='#211a14';c.lineWidth=2.3;c.beginPath();c.moveTo(9.6,2);c.quadraticCurveTo(8,-12,10.2,-24);c.quadraticCurveTo(10.6,-27.5,9.2,-29.5);c.stroke();
   c.strokeStyle='#38342f';c.lineWidth=.8;c.strokeRect(7.7,-34,3.2,4.3);line(c,9.3,-29.6,9.3,-30);}
  const pal=PALS.necro;let g=c.createLinearGradient(-10,-20,8,2);g.addColorStop(0,pal.coat[0]);g.addColorStop(1,pal.coat[1]);c.fillStyle=g;
  c.beginPath();c.moveTo(-10.6,1);jag(c,-10.6,10.6,1,1.6,1);c.quadraticCurveTo(9,-9,6,-17);c.lineTo(-6,-17);c.quadraticCurveTo(-9,-9,-10.6,1);c.fill();
  c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=1;line(c,-3,-15,-5.5,0);line(c,2,-14,3,0);line(c,5,-12,7.5,-1);
  c.fillStyle='#231e25';ell(c,0,-17,8.2,3.6);
  if(armR){c.strokeStyle='#211c23';c.lineWidth=3.6;line(c,4,-15,9,-12.5);c.fillStyle='#8e8e7c';ell(c,9.4,-12,1.7,1.2);}
  else{c.strokeStyle='#38342f';c.lineWidth=.8;c.strokeRect(3,-11,2.8,3.6);}
  if(armL){c.strokeStyle='#211c23';c.lineWidth=3.2;line(c,-4,-15,-7.5,-9);c.fillStyle='#8e8e7c';ell(c,-7.8,-8.6,1.4,1.1);}
  g=c.createLinearGradient(-6,-30,6,-17);g.addColorStop(0,'#2e2830');g.addColorStop(1,'#141115');c.fillStyle=g;
  c.beginPath();c.moveTo(-6.6,-17);c.quadraticCurveTo(-7.8,-25,-2,-30);c.quadraticCurveTo(6.6,-27,6.6,-17);c.closePath();c.fill();
  c.fillStyle='#020102';ell(c,1,-21.5,3.5,4.4);c.fillStyle='rgba(140,140,124,.28)';ell(c,1.3,-18.9,1.5,.8);
  c.strokeStyle='rgba(170,210,180,.28)';c.lineWidth=.9;c.beginPath();c.moveTo(6.6,-17);c.quadraticCurveTo(6.6,-27,-2,-30);c.stroke();c.beginPath();c.moveTo(6,-17);c.quadraticCurveTo(9,-9,10.6,1);c.stroke();
 }else if(ty==='skel'){
  const bone=o.unbound?'#b8b0a4':'#b4a88a';
  c.strokeStyle=bone;c.lineWidth=1.7;
  if(!(m&8)){line(c,-2.6,0,-2.3,-4.6);line(c,-2.3,-4.6,-2,-9);}if(!(m&16)){line(c,2.6,0,2.3,-4.6);line(c,2.3,-4.6,2,-9);}
  c.fillStyle='rgba(34,28,24,.9)';c.beginPath();c.moveTo(-3.4,-10);c.lineTo(3.4,-10);c.lineTo(2.4,-6.5);jag(c,-2.4,2.4,-6,.8,o.sd);c.closePath();c.fill();
  c.fillStyle=bone;ell(c,0,-9.6,3.3,1.5);
  c.strokeStyle='#8a7f66';c.lineWidth=1.6;for(let k=0;k<6;k++)line(c,0,-10.5-k*1.4,0,-11.3-k*1.4);
  c.strokeStyle=bone;c.lineWidth=1.05;for(let k=0;k<4;k++){const y=-15.8+k*1.85,w=4.6-k*.45;c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(-w,y-1,-w*.85,y+1.6);c.moveTo(0,y);c.quadraticCurveTo(w,y-1,w*.85,y+1.6);c.stroke();}
  c.lineWidth=1.3;line(c,-4.6,-17.8,4.6,-17.8);
  c.lineWidth=1.5;if(armL){line(c,-4.6,-17.6,-6.6,-12.6);line(c,-6.6,-12.6,-7.1,-8.2);}
  if(armR){line(c,4.6,-17.6,6.9,-13.2);line(c,6.9,-13.2,8.1,-10.2);c.strokeStyle='#5a4434';c.lineWidth=1.7;line(c,8,-10,13,-22);c.strokeStyle='rgba(150,130,110,.5)';c.lineWidth=.5;line(c,8.6,-10.6,13.2,-21.4);}
  if(o.named){c.fillStyle='rgba(30,22,30,.92)';c.beginPath();c.moveTo(-5.6,-18.6);c.quadraticCurveTo(0,-20.5,5.6,-18.6);c.lineTo(4,-12);jag(c,-4,4,-12.4,1.2,3);c.closePath();c.fill();}
  const g=c.createLinearGradient(-4,-27,4,-18);g.addColorStop(0,o.unbound?'#d6d0c6':'#cbbf9f');g.addColorStop(1,'#7e7460');c.fillStyle=g;ell(c,0,-22.6,4.5,4.9);
  c.beginPath();c.moveTo(-3.2,-20);c.lineTo(-2.2,-17.6);c.lineTo(2.2,-17.6);c.lineTo(3.2,-20);c.fill();
  c.fillStyle='#0e0a08';ell(c,-1.8,-22.3,1.45,1.7);ell(c,1.8,-22.3,1.45,1.7);c.beginPath();c.moveTo(0,-21);c.lineTo(-.7,-19.6);c.lineTo(.7,-19.6);c.fill();
  c.strokeStyle='rgba(20,14,10,.7)';c.lineWidth=.5;line(c,-2,-18.3,2,-18.3);for(let k=-2;k<=2;k++)line(c,k*.8,-18.9,k*.8,-17.8);
 }else if(ty==='zealot'||ty==='xbow'||ty==='conf'||ty==='risen'){
  const k=ty==='risen'?(o.origin==='necro'?'zealot':o.origin||'zealot'):ty;const pal=ty==='risen'?risenPal(PALS[o.origin]||PALS.zealot):PALS[k];
  // off hand: torch, censer
  if(armL){
   if(k==='zealot'&&o.lightState!==0&&ty!=='risen'){c.strokeStyle='#33251a';c.lineWidth=2;line(c,-8,-8,-11,-23);c.fillStyle=o.lightState===2?'#100c0a':'#21170f';ell(c,-11.2,-23.8,1.8,2.3);}
   if(k==='conf'&&ty!=='risen'){c.strokeStyle='#4a4436';c.lineWidth=.6;line(c,-7.6,-11,-9.4,-4);c.fillStyle='#3a3226';ell(c,-9.5,-3,2.2,1.8);c.fillStyle='#1a1410';ell(c,-9.5,-3.8,1.6,.6);}
  }
  humanBody(c,k,pal,{risen:ty==='risen',bloated:o.bloated,sd:o.sd});
  if(armL){c.fillStyle=pal.skin;ell(c,-8,-10,1.6,1.3);}
  if(armR){c.fillStyle=pal.skin;ell(c,7.4,-10.4,1.5,1.3);
   if(o.weapon==='hook'){c.strokeStyle='#7e7c76';c.lineWidth=1.3;c.beginPath();c.moveTo(7.6,-10.6);c.lineTo(10.6,-3.6);c.quadraticCurveTo(12.4,-1.4,10.2,-.6);c.stroke();c.strokeStyle='#2a2018';c.lineWidth=1.8;line(c,7,-11.6,7.8,-9.8);}
   if(o.weapon==='crossbow'&&armL){c.strokeStyle='#3a2a1c';c.lineWidth=1.8;line(c,1,-12,15,-13);c.strokeStyle='#4a3a2a';c.lineWidth=1.3;c.beginPath();c.moveTo(13.6,-18.5);c.quadraticCurveTo(15.6,-13,13.6,-7.5);c.stroke();c.strokeStyle='rgba(200,190,170,.5)';c.lineWidth=.4;line(c,13.6,-18.5,10,-13);line(c,13.6,-7.5,10,-13);}}
  if(k==='xbow'&&ty!=='risen'&&o.lightState===1){c.fillStyle='#2a2216';c.fillRect(-7,-9,2.6,3.4);}
 }else if(ty==='hound'||ty==='rhound'){
  const ris=ty==='rhound';c.strokeStyle=ris?'#3a3c34':'#211a18';c.lineWidth=1.5;
  if(!(m&16)){line(c,-7,-8,-8,-3.5);line(c,-8,-3.5,-7.2,0);line(c,-3.5,-8,-3,0);}
  if(!(m&8)){line(c,4,-9,4.6,-4);line(c,4.6,-4,4.2,0);line(c,6.6,-9,7.8,0);}
  c.lineWidth=1.1;c.beginPath();c.moveTo(-9.5,-10);c.quadraticCurveTo(-13,-12,-15,-16);c.stroke();
  const g=c.createLinearGradient(0,-14,0,-6);g.addColorStop(0,ris?'#4a4e44':'#40352f');g.addColorStop(1,ris?'#22241e':'#1c1715');c.fillStyle=g;
  c.beginPath();c.moveTo(-10,-10.5);c.quadraticCurveTo(-4,-13.5,5,-13);c.quadraticCurveTo(8,-12.8,8,-10.5);c.quadraticCurveTo(5,-7,2,-8.5);c.quadraticCurveTo(-3,-7.4,-6,-7.6);c.quadraticCurveTo(-9.5,-8,-10,-10.5);c.fill();
  c.strokeStyle=ris?'rgba(190,184,160,.55)':'rgba(0,0,0,.45)';c.lineWidth=.8;for(let k=0;k<4;k++){c.beginPath();c.moveTo(-1+k*1.8,-12.6);c.quadraticCurveTo(-2+k*1.8,-10.5,-.6+k*1.8,-8.6);c.stroke();}
  c.fillStyle='rgba(110,78,70,.55)';ell(c,-5,-10,1.8,1.2);ell(c,3,-11.6,1.4,.9);
  c.fillStyle=ris?'#30332c':'#2c2420';c.beginPath();c.moveTo(6,-13.5);c.quadraticCurveTo(10,-16,13,-14);c.lineTo(17,-12);c.lineTo(16.4,-10.6);c.quadraticCurveTo(12,-10,8,-10.2);c.closePath();c.fill();
  c.beginPath();c.moveTo(8,-14.6);c.lineTo(7.4,-18);c.lineTo(10,-15);c.fill();
  c.strokeStyle='#cfc6b2';c.lineWidth=.5;for(let k=0;k<4;k++)line(c,13.4+k*.8,-11.2,13.6+k*.8,-10.4);
 }else if(ty==='bhound'){
  c.strokeStyle=o.unbound?'#b8b0a4':'#a99d80';c.lineWidth=1.7;line(c,-9,-9,7,-10.5);c.lineWidth=1.1;for(let k=0;k<5;k++){c.beginPath();c.moveTo(-5+k*2.4,-10);c.quadraticCurveTo(-6+k*2.4,-7,-4.5+k*2.4,-5);c.stroke();}
  c.lineWidth=1.4;if(!(m&16)){line(c,-7,-9,-8,-4);line(c,-8,-4,-7.5,0);line(c,-4,-9,-3,0);}if(!(m&8)){line(c,4,-10,4.5,-4);line(c,4.5,-4,4,0);line(c,6.5,-10,8,0);}line(c,-9,-9,-14,-12);
  c.fillStyle='#b8ac8e';c.beginPath();c.moveTo(7,-13);c.lineTo(16,-11.5);c.lineTo(15,-9.5);c.lineTo(8,-9);c.closePath();c.fill();c.fillStyle='#120d0b';circ(c,10,-12,1.1);
 }}
export function emitFor(e){const t=e.type,m=missMask(e),out=[];const cy=(m&24)===24?7:0;
 if(t==='player'){out.push([0,-22.3+cy,'eyeDim'],[2.3,-22.3+cy,'eyeDim']);out.push(ok(e,'armR')?[9.3,-31.8+cy,'lantern']:[4.4,-9.2+cy,'lantern']);}
 else if(t==='skel'){const k=e.unbound?'eyeV':'eyeDim';out.push([-1.8,-22.3+cy,k],[1.8,-22.3+cy,k]);}
 else if(t==='bhound')out.push([10,-12,e.unbound?'eyeV':'eyeDim']);
 else if(t==='rhound')out.push([10.4,-13.2,e.unbound?'eyeV':'eyeDim']);
 else if(t==='risen')out.push([1.6,-21.7+cy,e.unbound?'eyeV':'eyeDim']);
 else if(t==='zealot'&&e.light&&ok(e,'armL'))out.push([-11.2,-25.5+cy,'torch']);
 else if(t==='xbow'&&e.light)out.push([-5.7,-7.3+cy,'lamp']);
 else if(t==='conf'&&e.light&&ok(e,'armL'))out.push([-9.5,-3.8+cy,'censer']);
 if(t==='hound')out.push([10.4,-13.2,'eyeR']);
 return out;}
/* sprite cache: figures are drawn once per look and zoom level, then stamped */
const sprCache=new Map();let sprU=0;
export function spriteScale(u){if(Math.abs(u-sprU)>sprU*.015){sprCache.clear();sprU=u;}}
export function clearSprites(){sprCache.clear();}
function sprite(key,w,h,ox,oy,u,fn){let s=sprCache.get(key);if(s)return s;const c=mk(Math.ceil(w*u)+4,Math.ceil(h*u)+4),g=c.getContext('2d');g.translate(ox*u+2,oy*u+2);g.scale(u,u);fn(g);s={c,ox:ox*u+2,oy:oy*u+2};sprCache.set(key,s);return s;}
function flashed(base,key){let s=sprCache.get(key);if(s)return s;const c=mk(base.c.width,base.c.height),g=c.getContext('2d');g.drawImage(base.c,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,196,150,.72)';g.fillRect(0,0,c.width,c.height);s={c,ox:base.ox,oy:base.oy};sprCache.set(key,s);return s;}
function flipped(base,key){let s=sprCache.get(key);if(s)return s;const c=mk(base.c.width,base.c.height),g=c.getContext('2d');g.translate(c.width,0);g.scale(-1,1);g.drawImage(base.c,0,0);s={c,ox:c.width-base.ox,oy:base.oy};sprCache.set(key,s);return s;}
function rotated(base,key,a){let s=sprCache.get(key);if(s)return s;const R=Math.ceil(Math.hypot(Math.max(base.ox,base.c.width-base.ox),Math.max(base.oy,base.c.height-base.oy)));const c=mk(R*2,R*2),g=c.getContext('2d');g.translate(R,R);g.rotate(a);g.drawImage(base.c,-base.ox,-base.oy);s={c,ox:R,oy:R};sprCache.set(key,s);return s;}
export function figSprite(e,u){const m=missMask(e);const ls=e.light?1:e.doused?2:0;
 const key=`f|${e.type}|${m}|${e.origin}|${e.weapon}|${ls}|${e.bloated?1:0}|${e.unbound?1:0}|${e.name?1:0}`;
 const b=sprite(key,40,46,18,38,u,g=>drawFig(g,{type:e.type,miss:m,origin:e.origin,weapon:e.weapon,lightState:ls,bloated:e.bloated,unbound:e.unbound,named:!!e.name,sd:e.id%7}));
 const f=e.flash>0?flashed(b,key+'|F'):b;return e.face<0?flipped(f,key+(e.flash>0?'|F':'')+'|L'):f;}
function corpseDraw(c,cp){const k=cp.kind,st=stage(cp);c.lineCap='round';
 const human=!(k==='hound'||k==='bhound'||k==='bones');
 if(st==='bone'||k==='bones'||k==='bhound'){c.strokeStyle=cp.holy?'#c8c2b4':'#9a8e72';c.lineWidth=1.6;line(c,-8,-2,2,1);line(c,-3,4,6,-3);line(c,1,-5,7,2);line(c,-6,6,-1,7);c.fillStyle='rgba(34,28,24,.8)';ell(c,3,3,4,2,.4);
  if(cp.name){c.fillStyle='rgba(30,22,30,.85)';ell(c,0,1,7,3.4,.3);}
  c.fillStyle=cp.holy?'#d8d2c4':'#ada184';ell(c,-6,3,3.2,3);c.fillStyle='#0e0a08';circ(c,-7,2.6,.9);circ(c,-5,2.6,.9);return;}
 const pal=PALS[k]||PALS.zealot;const bl=st==='bloated',ro=st==='rotten';
 if(st==='fresh'&&!cp.holy){c.fillStyle='rgba(44,6,6,.85)';ell(c,1,1,11,6.5,.2);ell(c,-6,3,5,3);}
 if(human){const sw=bl?1.35:1;c.fillStyle=cp.holy?'#4a4844':ro?'#26241e':pal.coat[1];c.beginPath();c.moveTo(-8*sw,-3*sw);c.quadraticCurveTo(0,-7*sw,9*sw,-2);c.quadraticCurveTo(6*sw,5*sw,-6*sw,4*sw);c.closePath();c.fill();
  c.fillStyle=cp.holy?'rgba(220,214,200,.25)':pal.coat[0];ell(c,1,-1,5*sw,2.4*sw,.1);
  c.fillStyle=cp.holy?'#8a867e':bl?'#7a8466':ro?'#5a5444':pal.skin;ell(c,-8.5,-1,3.2*(bl?1.2:1),2.8*(bl?1.2:1));
  c.fillStyle='#050302';circ(c,-9,-1.5,.7);if(ro){c.fillStyle='#a69a80';ell(c,-8.6,-.6,1.6,1.3);}
  if(!(cp.miss&4)){c.strokeStyle=bl?'#7a8466':pal.skin;c.lineWidth=1.4;line(c,4,2,9,5);}if(cp.weapon==='hook'&&!(cp.miss&4)){c.strokeStyle='#5e5c58';c.lineWidth=1.2;line(c,10,6,15,3);}
  if(!(cp.miss&2)){c.strokeStyle=bl?'#7a8466':pal.skin;c.lineWidth=1.4;line(c,-2,-4,-5,-8);}}
 else{const sw=bl?1.3:1;c.fillStyle=ro?'#1c1a16':'#231c19';ell(c,0,0,9*sw,3.8*sw);c.strokeStyle=ro?'rgba(180,170,150,.5)':'rgba(0,0,0,.5)';c.lineWidth=.8;for(let i=0;i<4;i++)line(c,-3+i*2,-3.4,-3.4+i*2,3.4);c.fillStyle='#2c2420';ell(c,10,-1,4,2.2);c.strokeStyle='#211a18';c.lineWidth=1.3;line(c,-4,3,-7,7);line(c,3,3,5,7);}
 if(cp.holy){c.fillStyle='rgba(255,250,230,.12)';ell(c,0,0,10,6);}
 if(bl){c.fillStyle='rgba(120,140,70,.18)';ell(c,0,0,12,7);}}
export function corpseSprite(cp,u){const key=`c|${cp.kind}|${stage(cp)}|${cp.holy?1:0}|${cp.miss}|${cp.weapon}|${cp.name?1:0}`;const b=sprite(key,34,26,17,13,u,g=>corpseDraw(g,cp));
 const bk=((Math.round(cp.rot/(Math.PI/6))%12)+12)%12;return rotated(b,key+'|r'+bk,bk*Math.PI/6);}
const shBuckets=[];
export function shadowDir(a){const bk=((Math.round(a/(Math.PI/12))%24)+24)%24;let c=shBuckets[bk];if(c)return c;c=mk(128,128);const g=c.getContext('2d');g.translate(64,64);g.rotate(bk*Math.PI/12);
 const gr=g.createLinearGradient(0,0,60,0);gr.addColorStop(0,'rgba(0,0,0,.95)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.ellipse(27,0,33,8,0,0,Math.PI*2);g.fill();shBuckets[bk]=c;return c;}
let shadowSpr=null;
export function getShadow(){if(shadowSpr)return shadowSpr;const c=mk(64,32),g=c.getContext('2d');const gr=g.createRadialGradient(32,16,0,32,16,32);gr.addColorStop(0,'rgba(0,0,0,.95)');gr.addColorStop(.6,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');g.setTransform(1,0,0,.5,0,8);g.fillStyle=gr;g.fillRect(0,0,64,64);shadowSpr=c;return c;}
const glowCache=new Map();
function glowSpr(r,g,b){const k=(r<<16)|(g<<8)|b;let c=glowCache.get(k);if(c)return c;c=mk(64,64);const x=c.getContext('2d');
 const gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,rgb(r,g,b,1));gr.addColorStop(.22,rgb(r,g,b,.5));gr.addColorStop(.55,rgb(r,g,b,.14));gr.addColorStop(1,rgb(r,g,b,0));
 x.fillStyle=gr;x.fillRect(0,0,64,64);if(glowCache.size>200)glowCache.clear();glowCache.set(k,c);return c;}
export function glow(c,x,y,R,col,a){if(R<=0||a<=0.004)return;c.globalAlpha=a>1?1:a;c.drawImage(glowSpr(col[0]|0,col[1]|0,col[2]|0),x-R,y-R,R*2,R*2);}
export function flame(c,x,y,sz,t,sd){
 const f=.85+.15*Math.sin(t*17+sd*3)+.08*Math.sin(t*31+sd);const wob=Math.sin(t*11+sd)*sz*.15;
 glow(c,x,y-sz*.3,sz*4*f,[255,110,40],.32);glow(c,x,y-sz*.4,sz*1.6*f,[255,160,60],.7);
 c.globalAlpha=1;c.fillStyle='rgba(255,190,100,.85)';c.beginPath();c.moveTo(x+wob,y-sz*1.6*f);c.quadraticCurveTo(x+sz*.6,y-sz*.3,x,y+sz*.25);c.quadraticCurveTo(x-sz*.6,y-sz*.3,x+wob,y-sz*1.6*f);c.fill();
 glow(c,x,y-sz*.2,sz*.7,[255,245,200],.9);}
