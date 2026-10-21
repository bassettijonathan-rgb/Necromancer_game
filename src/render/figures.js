// Figures, remains, shadows and glows. Drawn once per look and zoom level into a sprite cache, then stamped.
// The drawing code is carried over from the demo as it was.
import { missMask, ok, stage } from '../core/rules.js';
import { mk, rgb, line, circ, ell } from './mapart.js';

function jag(c,x0,x1,y,amp,sd){for(let x=x0,k=0;x<=x1;x+=1.4,k++)c.lineTo(x,y+((k%2)?amp:-amp*.3)+Math.sin(k*1.7+sd)*amp*.4);}
// a bone: a dark edge under it so it reads against any ground, a little knob at each joint
function bone(c,x0,y0,x1,y1,w,col,knob){c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=w+.9;line(c,x0,y0,x1,y1);c.strokeStyle=col;c.lineWidth=w;line(c,x0,y0,x1,y1);if(knob){c.fillStyle=col;circ(c,x0,y0,w*.62);circ(c,x1,y1,w*.62);}}
// a thin hand: palm and fingers, pointing along a
function hand(c,x,y,a,col){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=col;ell(c,0,0,1.05,.62);c.strokeStyle=col;c.lineWidth=.32;for(let k=-1;k<=1;k++)line(c,.7,k*.32,1.75,k*.42);c.restore();}
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
 let g=c.createLinearGradient(-9,-20,8,2);g.addColorStop(0,pal.coat[0]);g.addColorStop(1,pal.coat[1]);c.fillStyle=g;
 const wide=o.bloated?2.6:0,long=k==='conf'?1.5:0;
 c.beginPath();c.moveTo(-9-wide-long,1);jag(c,-9-wide-long,9+wide+long,1,o.risen?2.4:1.4,o.sd);c.quadraticCurveTo(7+wide,-11,4.4+wide*.5,-20);c.lineTo(-4.4-wide*.5,-20);c.quadraticCurveTo(-7-wide,-11,-9-wide-long,1);c.fill();
 const fold=(x0,y0,x1,bend)=>{c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(x0+bend,(y0+1)/2,x1,1);c.stroke();};
 c.strokeStyle='rgba(0,0,0,.26)';c.lineWidth=1.1;fold(-2.2,-18,-4,-.6);fold(2,-16,3.6,.8);fold(-.2,-12,.2,-.5);
 c.strokeStyle='rgba(255,240,220,.06)';c.lineWidth=.8;fold(1,-17,2,.4);fold(4,-14,6,.5);
 if(o.risen){c.fillStyle='rgba(20,24,18,.65)';ell(c,-3,-10,2,2.8,.4);ell(c,4,-5,1.5,2.2,-.3);c.fillStyle='rgba(60,14,10,.55)';ell(c,1.6,-12.4,1.4,1,.2);}
 c.strokeStyle=pal.belt;c.lineWidth=1.1;line(c,-5.6,-11.4,5.6,-10.8);
 // head: a hood or hat over a face kept mostly in shadow
 c.save();c.translate(0,-20);c.rotate(tilt);c.translate(0,20);
 g=c.createLinearGradient(-4,-30,4,-20);g.addColorStop(0,pal.hood[0]);g.addColorStop(1,pal.hood[1]);c.fillStyle=g;
 const face=()=>{const fg=c.createLinearGradient(.2,-24,3.8,-24);fg.addColorStop(0,'#0a0706');fg.addColorStop(.55,pal.skin);fg.addColorStop(1,pal.skin);c.fillStyle=fg;
  c.beginPath();c.moveTo(1,-26.4);c.quadraticCurveTo(3,-26.6,3.1,-24.6);c.lineTo(3.7,-23.7);c.lineTo(3.1,-23.3);c.quadraticCurveTo(3,-21.8,1.6,-21.5);c.quadraticCurveTo(.6,-22.6,1,-26.4);c.fill();
  c.fillStyle='rgba(6,4,3,.8)';c.beginPath();c.moveTo(.4,-26.8);c.quadraticCurveTo(2.6,-27.2,3.4,-25.4);c.quadraticCurveTo(2.2,-25.6,.6,-25.2);c.fill();c.fillStyle='rgba(6,4,3,.55)';ell(c,2.5,-22.5,.7,.22);};
 if(k==='xbow'){c.beginPath();c.moveTo(-4.2,-20);c.quadraticCurveTo(-5,-26,0,-27.2);c.quadraticCurveTo(5,-26,4.2,-20);c.closePath();c.fill();face();c.fillStyle=pal.hood[1];ell(c,.4,-27.2,7.2,1.3);ell(c,0,-28.6,3.6,1.9);c.fillStyle='rgba(0,0,0,.35)';ell(c,1.6,-26.2,2.6,.6);}
 else{c.beginPath();c.moveTo(-4.8,-20);c.quadraticCurveTo(-6,-26.4,-1.8,-29.4);c.lineTo(k==='conf'?0:-.6,k==='conf'?-32.4:-31);c.lineTo(.8,-29.4);c.quadraticCurveTo(5.8,-26.4,4.8,-20);c.closePath();c.fill();
  c.fillStyle='#090706';ell(c,1.8,-24.2,2,2.9);if(k!=='conf')face();}
 c.restore();
 c.strokeStyle=pal.hood[1];c.lineWidth=1.2;line(c,-4,-20.3,4,-20.3);}
export function drawFig(c,o){
 c.lineCap='round';c.lineJoin='round';
 const m=o.miss||0,armL=!(m&2),armR=!(m&4),legs=((m&8)?0:1)+((m&16)?0:1);
 const crawl=legs===0;if(crawl)c.translate(0,7);
 const ty=o.type;
 if(ty==='player'){
  // a tall, gaunt figure in a long robe and cowl; a gnarled staff with the lantern hung from its crook
  if(armR){c.strokeStyle='rgba(8,6,5,.9)';c.lineWidth=2.4;c.beginPath();c.moveTo(8.6,1.5);c.quadraticCurveTo(7.6,-10,8.8,-20);c.quadraticCurveTo(9.6,-26,9.2,-29.4);c.stroke();
   c.strokeStyle='#3a2c20';c.lineWidth=1.5;c.stroke();c.strokeStyle='rgba(190,160,120,.25)';c.lineWidth=.45;c.beginPath();c.moveTo(8.9,0);c.quadraticCurveTo(8,-10,9.1,-20);c.stroke();
   c.fillStyle='#2a2018';ell(c,8.2,-16.4,.9,.6);ell(c,9.2,-23.4,.8,.55);
   c.strokeStyle='#1a1614';c.lineWidth=.5;line(c,9.3,-29.4,9.3,-30.2);c.fillStyle='rgba(200,240,210,.35)';c.fillRect(8.1,-33.6,2.4,3.4);
   c.strokeStyle='#2c2a26';c.lineWidth=.7;c.strokeRect(7.9,-33.8,2.8,3.8);line(c,9.3,-33.8,9.3,-30);c.fillStyle='#2c2a26';c.fillRect(7.6,-34.6,3.4,.9);}
  const pal=PALS.necro;
  // robe: dark, narrow at the shoulders, falling to a frayed hem; the lantern side catches light
  let g=c.createLinearGradient(-8,-14,9,-10);g.addColorStop(0,'#141117');g.addColorStop(.6,'#2a2430');g.addColorStop(1,'#3c3442');c.fillStyle=g;
  c.beginPath();c.moveTo(-8.6,1);jag(c,-8.6,8.8,1,1.5,1);c.quadraticCurveTo(7.2,-9,4.6,-21.6);c.lineTo(-4.2,-21.6);c.quadraticCurveTo(-7,-9,-8.6,1);c.fill();
  const fold=(x0,y0,x1,bend)=>{c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(x0+bend,(y0+1)/2,x1,1);c.stroke();};
  c.strokeStyle='rgba(0,0,0,.42)';c.lineWidth=1.1;fold(-2.4,-17,-4.6,-.8);fold(1.2,-16,1.8,.6);fold(4,-14,6.4,.6);
  c.strokeStyle='rgba(190,200,210,.08)';c.lineWidth=.9;fold(-.4,-16,-1.2,-.4);fold(2.8,-15,4.2,.5);
  // mantle over the shoulders, ragged at its edge
  g=c.createLinearGradient(-6,-22,6,-14);g.addColorStop(0,'#16131a');g.addColorStop(1,'#2e2834');c.fillStyle=g;
  c.beginPath();c.moveTo(-4.6,-21.8);c.quadraticCurveTo(-7.4,-18,-6.8,-14.4);jag(c,-6.8,6.8,-14.4,1.1,3);c.quadraticCurveTo(7.2,-18,4.8,-21.8);c.closePath();c.fill();
  // belt cord, a pouch, a finger-bone charm
  c.strokeStyle='#3c3226';c.lineWidth=.8;line(c,-5.4,-11.6,5.6,-11);c.fillStyle='#2a2119';ell(c,-3.6,-9.8,1.3,1.6);c.strokeStyle='#a89c82';c.lineWidth=.45;line(c,1.6,-11.2,1.4,-8.6);line(c,1.4,-8.6,1.8,-7.6);
  // arms in sleeves; thin pale hands
  const skin='#b4ae9c';
  if(armR){c.strokeStyle='#221d26';c.lineWidth=2.6;c.beginPath();c.moveTo(3.6,-20);c.quadraticCurveTo(6.6,-17.6,7.6,-14.2);c.stroke();hand(c,8.4,-13.6,1.3,skin);}
  else{c.strokeStyle='#2c2a26';c.lineWidth=.7;c.strokeRect(3.4,-11.6,2.4,3.2);c.fillStyle='rgba(200,240,210,.3)';c.fillRect(3.6,-11.4,2,2.8);}
  if(armL){c.strokeStyle='#18151b';c.lineWidth=2.4;c.beginPath();c.moveTo(-3.6,-20);c.quadraticCurveTo(-6.4,-15,-6,-10.4);c.stroke();hand(c,-5.8,-9.6,1.75,'#8e8a7c');}
  // cowl: deep, pointed at the back, open toward where you look
  g=c.createLinearGradient(-5,-31,5,-21);g.addColorStop(0,'#1a161d');g.addColorStop(1,'#2e2834');c.fillStyle=g;
  c.beginPath();c.moveTo(-4.6,-21.6);c.quadraticCurveTo(-6,-27.4,-2.4,-30.2);c.lineTo(-3.2,-31.6);c.quadraticCurveTo(2.4,-31,4,-27.4);c.quadraticCurveTo(5.2,-24.6,4.8,-21.6);c.closePath();c.fill();
  c.fillStyle='#050405';c.beginPath();c.moveTo(.2,-27.8);c.quadraticCurveTo(3.6,-28.4,4.2,-25.6);c.quadraticCurveTo(4.6,-23,3.4,-21.8);c.lineTo(.4,-22);c.quadraticCurveTo(-.6,-25,.2,-27.8);c.fill();
  // what the lantern shows of the face: a gaunt cheek, the nose, the jaw
  const fg=c.createLinearGradient(1.4,-26,4,-22);fg.addColorStop(0,'rgba(160,156,138,.0)');fg.addColorStop(1,'rgba(176,170,150,.55)');c.fillStyle=fg;
  c.beginPath();c.moveTo(2.6,-25.4);c.lineTo(3.8,-24.2);c.lineTo(3.3,-23.8);c.quadraticCurveTo(3.4,-22.4,2,-22.1);c.quadraticCurveTo(2.2,-23.6,2.6,-25.4);c.fill();
  c.strokeStyle='rgba(170,210,180,.3)';c.lineWidth=.6;c.beginPath();c.moveTo(4.8,-21.6);c.quadraticCurveTo(5.2,-24.6,4,-27.4);c.stroke();c.beginPath();c.moveTo(4.6,-21.4);c.quadraticCurveTo(7.2,-10,8.8,1);c.stroke();
 }else if(ty==='skel'){
  // a whole skeleton at a person's proportions, leaning forward, a thighbone for a club
  const B=o.unbound?'#cfcac0':'#c4b796',Bd=o.unbound?'#8e8a84':'#7e7258';
  const far=Bd;
  if(!(m&8)){bone(c,-1.4,-12.6,-2.6,-6.6,1.05,far,1);bone(c,-2.6,-6.6,-2.2,-.9,.9,far,0);bone(c,-2.2,-.9,-.6,-.1,.8,far,0);}
  if(armL){bone(c,-2.8,-24,-4.4,-18.8,.85,far,1);bone(c,-4.4,-18.8,-4,-14.2,.75,far,0);c.strokeStyle=far;c.lineWidth=.35;for(let k=0;k<3;k++)line(c,-4,-14,-4.4+k*.4,-12.6);}
  // a rag of a loincloth
  c.fillStyle='rgba(42,32,24,.92)';c.beginPath();c.moveTo(-3,-13.6);c.lineTo(3.2,-13.4);c.lineTo(2.2,-10.6);jag(c,-2.4,2.2,-10.4,.9,o.sd);c.closePath();c.fill();
  // pelvis
  c.fillStyle=B;c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=.5;c.beginPath();c.moveTo(-2.8,-14.6);c.quadraticCurveTo(0,-15.6,3,-14.6);c.lineTo(1.6,-12);c.lineTo(-1.2,-12);c.closePath();c.fill();c.stroke();c.fillStyle='rgba(20,14,10,.8)';ell(c,.2,-13.2,.8,.7);
  // spine and ribs
  c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-14.4);c.quadraticCurveTo(-.4,-19,.8,-24.6);c.stroke();
  c.strokeStyle=Bd;c.lineWidth=.9;c.stroke();c.strokeStyle=B;c.lineWidth=.55;for(let k=0;k<6;k++){const y=-15.2-k*1.5;line(c,-.3+k*.1,y,.5+k*.1,y);}
  c.fillStyle='rgba(16,12,10,.82)';c.beginPath();c.moveTo(-2,-23.8);c.quadraticCurveTo(-3.6,-20,-2,-17.2);c.quadraticCurveTo(1.6,-16.6,3.4,-18);c.quadraticCurveTo(4.4,-21.6,2.8,-24);c.closePath();c.fill();
  for(let k=0;k<5;k++){const y=-23.2+k*1.35,w=3.2-k*.22;c.strokeStyle='rgba(12,9,7,.8)';c.lineWidth=1.05;c.beginPath();c.moveTo(.6,y);c.quadraticCurveTo(w+1.2,y+.1,w,y+1.4);c.moveTo(.4,y);c.quadraticCurveTo(-w+.2,y+.1,-w+.6,y+1.3);c.stroke();
   c.strokeStyle=k<2?B:Bd;c.lineWidth=.6;c.stroke();}
  c.strokeStyle=B;c.lineWidth=.5;line(c,2.4,-23.4,2.6,-19.6);
  bone(c,-3,-24.4,4.2,-24.6,.7,B,0);
  if(o.named){c.fillStyle='rgba(30,22,30,.9)';c.beginPath();c.moveTo(-3.8,-25);c.quadraticCurveTo(0,-26.4,4.6,-25);c.lineTo(4.8,-19);jag(c,-4,4.8,-17.6,1.3,3);c.closePath();c.fill();
   c.strokeStyle='rgba(120,100,130,.2)';c.lineWidth=.5;line(c,-1,-24.6,-1.6,-18);line(c,2,-24.6,2.4,-18);}
  if(!(m&16)){bone(c,1.6,-12.6,2.4,-6.8,1.1,B,1);bone(c,2.4,-6.8,3,-.9,.95,B,0);bone(c,3,-.9,4.8,-.1,.85,B,0);}
  if(armR){bone(c,4,-24.2,6,-19.2,.9,B,1);bone(c,6,-19.2,8.4,-16.2,.8,B,0);
   bone(c,8,-15.4,12.2,-26.4,1.25,'#a8987a',0);c.fillStyle='#a8987a';c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=.45;c.beginPath();c.arc(12.4,-27,1.15,0,7);c.fill();c.stroke();c.beginPath();c.arc(11.5,-26.9,.95,0,7);c.fill();c.stroke();
   c.strokeStyle=B;c.lineWidth=.35;for(let k=0;k<3;k++)line(c,8.4,-16,8.4+k*.35,-14.7);}
  // skull: cranium, cheekbone, jaw, deep sockets
  c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=1.3;line(c,.8,-24.6,1.2,-26);c.strokeStyle=Bd;c.lineWidth=.7;line(c,.8,-24.6,1.2,-26);
  const g=c.createLinearGradient(0,-31.4,2,-26);g.addColorStop(0,o.unbound?'#e2ddd2':'#d8ccae');g.addColorStop(1,Bd);c.fillStyle=g;c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=.5;
  c.beginPath();c.moveTo(-.9,-28.4);c.quadraticCurveTo(-1.2,-31.4,1.6,-31.6);c.quadraticCurveTo(4.2,-31.4,4.2,-28.8);c.lineTo(4.4,-27.4);c.lineTo(3.8,-26.6);c.lineTo(1.4,-26.4);c.quadraticCurveTo(-.4,-26.8,-.9,-28.4);c.closePath();c.fill();c.stroke();
  c.fillStyle=Bd;c.beginPath();c.moveTo(1.2,-26.6);c.lineTo(3.8,-26.4);c.lineTo(3.4,-25.2);c.lineTo(1.6,-25.4);c.closePath();c.fill();c.stroke();
  c.strokeStyle='rgba(12,9,7,.7)';c.lineWidth=.3;for(let k=0;k<4;k++)line(c,1.9+k*.55,-26.8,1.9+k*.55,-26);
  c.fillStyle='#0a0706';c.beginPath();c.moveTo(1.9,-29.2);c.lineTo(3.4,-29.2);c.lineTo(3.2,-28);c.lineTo(2.1,-27.9);c.closePath();c.fill();
  c.beginPath();c.moveTo(.3,-29.1);c.lineTo(1.2,-29.1);c.lineTo(1.1,-28.1);c.lineTo(.4,-28.2);c.closePath();c.fill();
  c.beginPath();c.moveTo(3.9,-27.9);c.lineTo(4.3,-27.2);c.lineTo(3.7,-27.1);c.closePath();c.fill();
  c.fillStyle='rgba(255,250,235,.18)';ell(c,1.4,-30.4,1.4,.6,-.2);
 }else if(ty==='zealot'||ty==='xbow'||ty==='conf'||ty==='risen'){
  const k=ty==='risen'?(o.origin==='necro'?'zealot':o.origin||'zealot'):ty;const pal=ty==='risen'?risenPal(PALS[o.origin]||PALS.zealot):PALS[k];
  // off hand: torch, censer
  if(armL){
   if(k==='zealot'&&o.lightState!==0&&ty!=='risen'){c.strokeStyle='#33251a';c.lineWidth=2;line(c,-8,-8,-11,-23);c.fillStyle=o.lightState===2?'#100c0a':'#21170f';ell(c,-11.2,-23.8,1.8,2.3);}
   if(k==='conf'&&ty!=='risen'){c.strokeStyle='#4a4436';c.lineWidth=.6;line(c,-7.6,-11,-9.4,-4);c.fillStyle='#3a3226';ell(c,-9.5,-3,2.2,1.8);c.fillStyle='#1a1410';ell(c,-9.5,-3.8,1.6,.6);}
  }
  humanBody(c,k,pal,{risen:ty==='risen',bloated:o.bloated,sd:o.sd});
  const hs=ty==='risen'?'#525a4c':pal.skin;if(armL)hand(c,-7.8,-9.6,1.9,hs);
  if(armR){hand(c,7.2,-10.2,1.2,hs);
   if(o.weapon==='hook'){c.strokeStyle='#7e7c76';c.lineWidth=1.3;c.beginPath();c.moveTo(7.6,-10.6);c.lineTo(10.6,-3.6);c.quadraticCurveTo(12.4,-1.4,10.2,-.6);c.stroke();c.strokeStyle='#2a2018';c.lineWidth=1.8;line(c,7,-11.6,7.8,-9.8);}
   if(o.weapon==='crossbow'&&armL){c.strokeStyle='#3a2a1c';c.lineWidth=1.8;line(c,1,-12,15,-13);c.strokeStyle='#4a3a2a';c.lineWidth=1.3;c.beginPath();c.moveTo(13.6,-18.5);c.quadraticCurveTo(15.6,-13,13.6,-7.5);c.stroke();c.strokeStyle='rgba(200,190,170,.5)';c.lineWidth=.4;line(c,13.6,-18.5,10,-13);line(c,13.6,-7.5,10,-13);}}
  if(k==='xbow'&&ty!=='risen'&&o.lightState===1){c.fillStyle='#2a2216';c.fillRect(-7,-9,2.6,3.4);}
 }else if(ty==='hound'||ty==='rhound'){
  // a lean hunting dog: deep chest, tucked belly; risen, its hide has split over the ribs
  const ris=ty==='rhound',F=ris?'#4a4e44':'#3e332c',Fd=ris?'#262820':'#1e1815';
  if(!(m&16)){bone(c,-7.4,-9.6,-8.8,-5.4,1.3,Fd,0);bone(c,-8.8,-5.4,-7.6,-2,1,Fd,0);bone(c,-7.6,-2,-7,0,.9,Fd,0);}
  if(!(m&8)){bone(c,4,-9.6,4.6,-4.6,1.1,Fd,0);bone(c,4.6,-4.6,4.2,0,.9,Fd,0);}
  c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=1.3;c.beginPath();c.moveTo(-9.4,-10.6);c.quadraticCurveTo(-12.6,-11.6,-14,-15);c.stroke();c.strokeStyle=Fd;c.lineWidth=.8;c.stroke();
  const g=c.createLinearGradient(0,-13.4,0,-7.6);g.addColorStop(0,F);g.addColorStop(1,Fd);c.fillStyle=g;c.strokeStyle='rgba(10,8,6,.85)';c.lineWidth=.55;
  c.beginPath();c.moveTo(-9.8,-10.6);c.quadraticCurveTo(-8,-12.8,-3,-12.4);c.quadraticCurveTo(2,-12.2,4.6,-13);c.quadraticCurveTo(7.4,-13.4,7.6,-10.4);c.quadraticCurveTo(7.2,-6.6,4.6,-6.4);c.quadraticCurveTo(2,-7.4,.2,-8.8);c.quadraticCurveTo(-4,-8.4,-7.8,-6.8);c.quadraticCurveTo(-10.6,-7.6,-9.8,-10.6);c.closePath();c.fill();c.stroke();
  if(ris){c.fillStyle='rgba(70,22,18,.75)';ell(c,1.6,-10.2,2.8,1.5,-.1);c.strokeStyle='rgba(196,186,160,.6)';c.lineWidth=.35;for(let k=0;k<4;k++){c.beginPath();c.moveTo(-.2+k*1.1,-11.4);c.quadraticCurveTo(-.6+k*1.1,-10.2,.1+k*1.1,-9.2);c.stroke();}c.fillStyle='rgba(20,22,16,.6)';ell(c,-6,-10.2,1.6,.9);}
  else{c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=.45;for(let k=0;k<3;k++){c.beginPath();c.moveTo(0+k*1.4,-12);c.quadraticCurveTo(-.4+k*1.4,-10.4,.3+k*1.4,-9);c.stroke();}c.fillStyle='rgba(110,78,70,.4)';ell(c,-5,-10.4,1.4,.8);}
  c.fillStyle=F;if(!(m&16))ell(c,-7.2,-9,2.6,2.4,.3);if(!(m&8))ell(c,5.2,-9.2,1.9,2.6,-.2);
  if(!(m&16)){bone(c,-6.2,-9.4,-7,-5.2,1.4,F,0);bone(c,-7,-5.2,-5.8,-1.8,1.05,F,0);bone(c,-5.8,-1.8,-5,0,.95,F,0);}
  if(!(m&8)){bone(c,5.4,-9.2,6.2,-4.6,1.2,F,0);bone(c,6.2,-4.6,5.8,0,1,F,0);}
  // neck and head
  c.fillStyle=F;c.beginPath();c.moveTo(4.6,-12.8);c.quadraticCurveTo(7,-14.6,9,-15.2);c.lineTo(10,-12.6);c.quadraticCurveTo(8,-10.6,6.6,-9.4);c.closePath();c.fill();
  const hg=c.createLinearGradient(8,-16,14,-11);hg.addColorStop(0,F);hg.addColorStop(1,Fd);c.fillStyle=hg;
  c.beginPath();c.moveTo(8.2,-14.6);c.quadraticCurveTo(9.4,-16.4,11.4,-15.6);c.quadraticCurveTo(13.4,-14.8,16.4,-13.2);c.lineTo(16.2,-12.2);c.quadraticCurveTo(13.6,-11.4,11,-11.6);c.quadraticCurveTo(8.6,-12,8.2,-14.6);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(9,-15.4);c.lineTo(8.4,-18.4);c.lineTo(10.6,-15.8);c.closePath();c.fill();c.stroke();
  c.fillStyle='#0a0706';ell(c,16.2,-12.9,.45,.4);c.strokeStyle='rgba(8,5,4,.8)';c.lineWidth=.35;line(c,12.4,-12,15.8,-12.4);
  c.strokeStyle='rgba(210,200,180,.65)';c.lineWidth=.3;for(let k=0;k<3;k++)line(c,13.4+k*.8,-12.1,13.5+k*.8,-11.6);
 }else if(ty==='bhound'){
  // a dog's skeleton: arched spine, hanging ribs, a long skull
  const B=o.unbound?'#cfcac0':'#bcae8e',Bd=o.unbound?'#8e8a84':'#7a6e56';
  if(!(m&16))bone(c,-6.4,-9.8,-7.8,-5,.85,Bd,1),bone(c,-7.8,-5,-6.8,-1.8,.7,Bd,0),bone(c,-6.8,-1.8,-6,0,.6,Bd,0);
  if(!(m&8))bone(c,4.4,-10.6,4.9,-5.2,.8,Bd,1),bone(c,4.9,-5.2,4.5,0,.7,Bd,0);
  c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=1.5;c.beginPath();c.moveTo(-8.8,-10.2);c.quadraticCurveTo(-1,-13,6.4,-11.6);c.stroke();c.strokeStyle=B;c.lineWidth=.9;c.stroke();
  for(let k=0;k<4;k++){c.strokeStyle='rgba(12,9,7,.8)';c.lineWidth=.6;line(c,-9-k*1.1,-9.6+k*.9,-9.8-k*1.1,-8.8+k*.9);c.strokeStyle=B;c.lineWidth=.45;line(c,-9-k*1.1,-9.6+k*.9,-9.8-k*1.1,-8.8+k*.9);}
  for(let k=0;k<5;k++){const x=-2+k*1.4,y=-11.7-Math.sin((k+1)/6*Math.PI)*.4;c.strokeStyle='rgba(12,9,7,.8)';c.lineWidth=.95;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-1.2,y+3,x+.2,y+5.4-k*.25);c.stroke();c.strokeStyle=k<3?B:Bd;c.lineWidth=.5;c.stroke();}
  c.fillStyle=B;c.strokeStyle='rgba(12,9,7,.85)';c.lineWidth=.45;ell(c,-6.8,-10.2,1.6,1);c.stroke();
  if(!(m&16))bone(c,-5.6,-10,-6.6,-5.4,.95,B,1),bone(c,-6.6,-5.4,-5.4,-2,.8,B,0),bone(c,-5.4,-2,-4.6,0,.7,B,0);
  if(!(m&8))bone(c,5.6,-10.8,6.4,-5.6,.9,B,1),bone(c,6.4,-5.6,6,0,.75,B,0);
  bone(c,6.2,-11.6,8.6,-13.4,.8,B,0);
  const g=c.createLinearGradient(8,-15.6,12,-11);g.addColorStop(0,o.unbound?'#e2ddd2':'#d2c4a4');g.addColorStop(1,Bd);c.fillStyle=g;
  c.beginPath();c.moveTo(8,-14);c.quadraticCurveTo(8.6,-15.8,10.6,-15.4);c.quadraticCurveTo(12.6,-14.6,15.2,-13.2);c.lineTo(15,-12.4);c.lineTo(10.4,-12.4);c.quadraticCurveTo(8.4,-12.4,8,-14);c.closePath();c.fill();c.stroke();
  c.fillStyle=Bd;c.beginPath();c.moveTo(9.4,-12.4);c.lineTo(14.6,-12.2);c.lineTo(13.8,-11.4);c.lineTo(9.8,-11.6);c.closePath();c.fill();c.stroke();
  c.strokeStyle='rgba(12,9,7,.7)';c.lineWidth=.25;for(let k=0;k<5;k++)line(c,11+k*.8,-12.6,11+k*.8,-12);
  c.fillStyle='#0a0706';c.beginPath();c.moveTo(10,-14.6);c.lineTo(11.4,-14.4);c.lineTo(11,-13.5);c.lineTo(10.1,-13.6);c.closePath();c.fill();
 }}
export function emitFor(e){const t=e.type,m=missMask(e),out=[];const cy=(m&24)===24?7:0;
 if(t==='player'){out.push([1.8,-25.6+cy,'eyeDim'],[3.4,-25.5+cy,'eyeDim']);out.push(ok(e,'armR')?[9.3,-31.9+cy,'lantern']:[4.6,-9.9+cy,'lantern']);}
 else if(t==='skel'){const k=e.unbound?'eyeV':'eyeDim';out.push([.75,-28.6+cy,k],[2.65,-28.6+cy,k]);}
 else if(t==='bhound')out.push([10.6,-14,e.unbound?'eyeV':'eyeDim']);
 else if(t==='rhound')out.push([11.6,-14.4,e.unbound?'eyeV':'eyeDim']);
 else if(t==='risen')out.push([2.1,-25.4+cy,e.unbound?'eyeV':'eyeDim']);
 else if(t==='zealot'&&e.light&&ok(e,'armL'))out.push([-11.2,-25.5+cy,'torch']);
 else if(t==='xbow'&&e.light)out.push([-5.7,-7.3+cy,'lamp']);
 else if(t==='conf'&&e.light&&ok(e,'armL'))out.push([-9.5,-3.8+cy,'censer']);
 if(t==='hound')out.push([11.6,-14.4,'eyeR']);
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
