import { pal, safeCol } from "./util.js";

/* ---------- Painted scenes: an original illustration per film, drawn on canvas ---------- */
const SCENE_BY_ID = {
  "se7en-1995":"rain","the-game-1997":"maze","the-girl-with-the-dragon-tattoo-2011":"snow","source-code-2011":"rails",
  "the-godfather-1972":"blinds","the-godfather-part-ii-1974":"blinds","the-godfather-part-iii-1990":"blinds",
  "the-social-network-2010":"grid","gone-girl-2014":"rain","tropic-thunder-2008":"jungle","the-gentlemen-2019":"smoke",
  "the-unbearable-weight-of-massive-talent-2022":"sunset","the-great-gatsby-2013":"gatsby","mia-and-the-white-lion-2018":"savanna",
  "arrival-2016":"fog","a-good-person-2023":"bokeh","bottoms-2023":"bokeh","crazy-stupid-love-2011":"bokeh",
  "kill-bill-vol-1-2003":"slash","scarface-1983":"sunset","goodfellas-1990":"skyline","inglourious-basterds-2009":"cinema",
  "inception-2010":"spiral","just-like-heaven-2005":"clouds","the-town-2010":"skyline","la-la-land-2016":"stars",
  "into-the-wild-2007":"mountains","the-art-of-racing-in-the-rain-2019":"track","the-peanut-butter-falcon-2019":"river"
};
const SCENE_BY_GENRE = {Horror:"fog",Thriller:"rain",Crime:"skyline",Mystery:"maze","Sci-Fi":"stars",Romance:"bokeh",Comedy:"bokeh",Musical:"stars",War:"cinema",Adventure:"mountains",Family:"savanna",Fantasy:"clouds",Drama:"blinds","Feel-good":"river",Inspiring:"mountains",Action:"slash"};
export const sceneOf = f => f.scene || SCENE_BY_ID[f.id] || ((f.genres||[]).map(g=>SCENE_BY_GENRE[g]).find(Boolean)) || "bokeh";
export const sceneCache = {};
function rng(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;} return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return (h>>>0)/4294967296;}; }
function hexA(hex,a){ const n=parseInt(hex.slice(1).padEnd(6,"0").slice(0,6),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
const W=960,H=540;
function sky(x,top,bot){ const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,top); g.addColorStop(1,bot); x.fillStyle=g; x.fillRect(0,0,W,H); }
function glow(x,cx,cy,r,col,a){ const g=x.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,hexA(col,a)); g.addColorStop(1,hexA(col,0)); x.fillStyle=g; x.fillRect(cx-r,cy-r,r*2,r*2); }
function skylineShape(x,R,base,col,lit,litCol){ x.fillStyle=col; let px=0; while(px<W){ const w=30+R()*70, h=60+R()*(base*0.55); x.fillRect(px,H-h-(H-base),w,h+(H-base)); if(lit){ x.fillStyle=hexA(litCol,.75); for(let wy=H-h-(H-base)+10; wy<base-8; wy+=14) for(let wx=px+6; wx<px+w-6; wx+=11) if(R()<lit) x.fillRect(wx,wy,4,6); x.fillStyle=col; } px+=w+2; } }
function palm(x,px,py,s,col){ x.strokeStyle=col; x.lineWidth=6*s; x.beginPath(); x.moveTo(px,H); x.quadraticCurveTo(px+20*s,py+120*s,px,py); x.stroke(); x.fillStyle=col; for(let i=0;i<7;i++){ const a=-Math.PI+i*Math.PI/6; x.beginPath(); x.moveTo(px,py); x.quadraticCurveTo(px+Math.cos(a)*70*s, py+Math.sin(a)*40*s-30*s, px+Math.cos(a)*120*s, py+Math.sin(a)*60*s+20*s); x.lineTo(px+Math.cos(a)*110*s, py+Math.sin(a)*60*s+28*s); x.quadraticCurveTo(px+Math.cos(a)*60*s, py+Math.sin(a)*40*s-18*s, px, py+6*s); x.fill(); } }
const SCENES = {
  rain(x,[a,b,c],R){ sky(x,b,a); glow(x,W*.7,H*.35,320,c,.35); skylineShape(x,R,H*.95,"#07070a",.12,c);
    x.strokeStyle="rgba(200,210,220,.22)"; x.lineWidth=1.2; for(let i=0;i<420;i++){ const px=R()*W*1.2, py=R()*H, l=20+R()*40; x.beginPath(); x.moveTo(px,py); x.lineTo(px-l*.35,py+l); x.stroke(); } },
  snow(x,[a,b,c],R){ sky(x,hexA(c,1),b); x.fillStyle="#e8edf1"; x.beginPath(); x.ellipse(W*.5,H*1.05,W*.9,H*.32,0,0,Math.PI*2); x.fill();
    x.fillStyle="#141a1f"; x.fillRect(W*.62,H*.6,130,70); x.beginPath(); x.moveTo(W*.62-12,H*.6); x.lineTo(W*.62+65,H*.5); x.lineTo(W*.62+142,H*.6); x.fill(); x.fillStyle="#ffcf7a"; x.fillRect(W*.62+30,H*.64,16,16); glow(x,W*.62+38,H*.65,60,"#ffcf7a",.4);
    for(let i=0;i<8;i++){ const tx=R()*W*.5, th=80+R()*120; x.fillStyle="#1d262c"; x.beginPath(); x.moveTo(tx,H*.78-th); x.lineTo(tx-24,H*.8); x.lineTo(tx+24,H*.8); x.fill(); }
    x.fillStyle="rgba(255,255,255,.85)"; for(let i=0;i<260;i++){ x.beginPath(); x.arc(R()*W,R()*H,R()*2.2+.4,0,7); x.fill(); } },
  rails(x,[a,b,c],R){ sky(x,b,a); const vx=W*.5,vy=H*.42; glow(x,vx,vy,380,c,.45);
    x.strokeStyle=hexA(c,.9); x.lineWidth=3; [[-.9,.9]].forEach(()=>{}); x.beginPath(); x.moveTo(W*.18,H); x.lineTo(vx-6,vy); x.moveTo(W*.82,H); x.lineTo(vx+6,vy); x.stroke();
    x.strokeStyle=hexA(c,.35); for(let i=1;i<18;i++){ const t=Math.pow(i/18,2.2), y=vy+(H-vy)*t, hw=6+(W*.32)*t; x.lineWidth=1+t*5; x.beginPath(); x.moveTo(vx-hw,y); x.lineTo(vx+hw,y); x.stroke(); }
    for(let i=0;i<60;i++){ const y=R()*H*.9, l=80+R()*260, px=R()*W; x.strokeStyle=`rgba(255,255,255,${.05+R()*.15})`; x.lineWidth=1+R()*2; x.beginPath(); x.moveTo(px,y); x.lineTo(px+l,y); x.stroke(); } },
  blinds(x,[a,b,c],R){ sky(x,"#0b0604",b); x.save(); x.translate(W*.15,0); x.rotate(-.22); for(let i=0;i<9;i++){ const g=x.createLinearGradient(0,0,W,0); g.addColorStop(0,hexA(c,.55)); g.addColorStop(1,hexA(c,0)); x.fillStyle=g; x.fillRect(0,40+i*52,W*1.1,22); } x.restore();
    glow(x,W*.12,H*.2,300,c,.35); x.fillStyle="rgba(255,220,170,.5)"; for(let i=0;i<120;i++){ x.fillRect(R()*W*.7,R()*H,1.4,1.4); }
    x.fillStyle="#050302"; x.beginPath(); x.ellipse(W*.72,H*.62,85,105,0,0,7); x.fill(); x.fillRect(W*.72-150,H*.66,300,H); x.fillStyle=hexA("#8a1c1c",.95); x.beginPath(); x.arc(W*.72-30,H*.72,9,0,7); x.fill(); },
  grid(x,[a,b,c],R){ sky(x,b,"#04080d"); for(let gy=0;gy<H;gy+=18) for(let gx=0;gx<W;gx+=14){ if(R()<.55){ x.fillStyle=hexA(c,.08+R()*.5*(1-gy/H)); x.fillRect(gx,gy,8,10);} }
    glow(x,W*.5,H*.55,300,c,.35); x.fillStyle="#020406"; x.beginPath(); x.ellipse(W*.5,H*.6,55,68,0,0,7); x.fill(); x.fillRect(W*.5-120,H*.68,240,H); x.fillStyle=hexA(c,.9); x.fillRect(W*.5-90,H*.84,180,6); },
  maze(x,[a,b,c],R){ sky(x,b,a); x.strokeStyle=hexA(c,.55); x.lineWidth=5; for(let i=1;i<11;i++){ const r=i*30; const gap=R()*6; x.beginPath(); x.arc(W*.5,H*.5,r,gap,gap+Math.PI*1.6); x.stroke(); } glow(x,W*.5,H*.5,90,c,.7); x.fillStyle="#f6e6c2"; x.beginPath(); x.arc(W*.5,H*.5,8,0,7); x.fill(); },
  jungle(x,[a,b,c],R){ sky(x,hexA(c,1),a); glow(x,W*.7,H*.3,200,"#fff1c0",.6); for(let l=0;l<3;l++){ const col=["#1d2e12","#132009","#0a1205"][l]; for(let i=0;i<5;i++) palm(x,R()*W,H*(.25+l*.12)+R()*40,.7+l*.25,col); }
    x.fillStyle="rgba(230,240,210,.12)"; x.fillRect(0,H*.55,W,30); },
  smoke(x,[a,b,c],R){ sky(x,a,b); for(let s=0;s<14;s++){ x.strokeStyle=`rgba(230,225,210,${.04+R()*.08})`; x.lineWidth=10+R()*30; x.beginPath(); let px=W*.55+R()*40, py=H; x.moveTo(px,py); for(let k=0;k<5;k++){ x.bezierCurveTo(px+(R()-.5)*260,py-60,px+(R()-.5)*260,py-110,px+(R()-.5)*120,py-150); px+=(R()-.5)*120; py-=150; } x.stroke(); }
    glow(x,W*.56,H*.9,60,"#ff7a2a",.9); x.fillStyle="#ffb36b"; x.beginPath(); x.arc(W*.56,H*.9,5,0,7); x.fill(); x.fillStyle=hexA(c,.35); x.fillRect(0,H*.94,W,H); },
  sunset(x,[a,b,c],R){ const g=x.createLinearGradient(0,0,0,H*.62); g.addColorStop(0,b); g.addColorStop(.6,a); g.addColorStop(1,c); x.fillStyle=g; x.fillRect(0,0,W,H*.62); x.fillStyle=hexA(c,1); x.beginPath(); x.arc(W*.5,H*.6,110,Math.PI,0); x.fill(); glow(x,W*.5,H*.55,330,c,.45);
    x.fillStyle="#0a0507"; x.fillRect(0,H*.62,W,H); x.strokeStyle=hexA(c,.6); for(let i=0;i<22;i++){ const y=H*.64+i*9, w=200-i*7+R()*40; x.lineWidth=2; x.beginPath(); x.moveTo(W*.5-w/2,y); x.lineTo(W*.5+w/2,y); x.stroke(); }
    palm(x,W*.12,H*.28,1.1,"#050304"); palm(x,W*.86,H*.34,.9,"#050304"); },
  gatsby(x,[a,b,c],R){ sky(x,b,"#03100c"); for(let i=0;i<70;i++){ const r=4+R()*26; glow(x,R()*W,R()*H*.7,r*2,c,.12+R()*.25); }
    for(let f=0;f<3;f++){ const fx=W*(.2+R()*.6), fy=H*(.15+R()*.25); x.strokeStyle=hexA(c,.7); x.lineWidth=1.5; for(let k=0;k<26;k++){ const an=k/26*Math.PI*2, r=60+R()*40; x.beginPath(); x.moveTo(fx+Math.cos(an)*12,fy+Math.sin(an)*12); x.lineTo(fx+Math.cos(an)*r,fy+Math.sin(an)*r); x.stroke(); } }
    x.fillStyle="#020806"; x.fillRect(0,H*.82,W,H); glow(x,W*.88,H*.8,80,"#3dff8a",.8); x.fillStyle="#9dffc2"; x.beginPath(); x.arc(W*.88,H*.8,5,0,7); x.fill(); x.strokeStyle=hexA("#3dff8a",.25); x.lineWidth=2; x.beginPath(); x.moveTo(W*.88,H*.82); x.lineTo(W*.88,H); x.stroke(); },
  savanna(x,[a,b,c],R){ const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,"#f2c27a"); g.addColorStop(.6,"#c9783a"); g.addColorStop(1,b); x.fillStyle=g; x.fillRect(0,0,W,H); x.fillStyle="#fff2d0"; x.beginPath(); x.arc(W*.62,H*.55,90,0,7); x.fill(); glow(x,W*.62,H*.55,260,"#fff2d0",.5);
    x.fillStyle="#2a1608"; x.fillRect(0,H*.72,W,H); x.strokeStyle="#2a1608"; x.lineWidth=7; x.beginPath(); x.moveTo(W*.25,H*.74); x.lineTo(W*.26,H*.48); x.stroke(); x.beginPath(); x.ellipse(W*.26,H*.45,130,26,0,0,7); x.fill();
    x.fillStyle="#f7f0de"; x.beginPath(); x.ellipse(W*.75,H*.7,46,22,0,0,7); x.fill(); x.beginPath(); x.arc(W*.71,H*.62,17,0,7); x.fill();
    x.strokeStyle="rgba(40,20,8,.8)"; x.lineWidth=1.5; for(let i=0;i<300;i++){ const px=R()*W; x.beginPath(); x.moveTo(px,H); x.lineTo(px+(R()-.5)*14,H*.7+R()*30); x.stroke(); } },
  fog(x,[a,b,c],R){ sky(x,hexA(c,1),b); x.fillStyle="#1a1f22"; x.beginPath(); x.ellipse(W*.55,H*.42,95,190,.05,0,7); x.fill(); for(let i=0;i<7;i++){ x.fillStyle=`rgba(210,212,205,${.08+i*.03})`; x.fillRect(0,H*.45+i*30,W,60); }
    x.fillStyle="#2b3133"; x.fillRect(0,H*.88,W,H); x.fillStyle="#111"; for(let i=0;i<4;i++) x.fillRect(W*.2+i*16,H*.84,4,16); },
  bokeh(x,[a,b,c],R){ sky(x,a,b); for(let i=0;i<55;i++){ const r=10+R()*60; glow(x,R()*W,R()*H,r,i%3?c:"#fff1d6",.15+R()*.35); } for(let i=0;i<18;i++){ x.strokeStyle=hexA(c,.25); x.lineWidth=1.5; x.beginPath(); x.arc(R()*W,R()*H,10+R()*40,0,7); x.stroke(); } },
  slash(x,[a,b,c],R){ x.fillStyle=c; x.fillRect(0,0,W,H); x.fillStyle="#0b0b0b"; x.save(); x.translate(W*.5,H*.5); x.rotate(-.5); x.fillRect(-W,-38,W*2,76); x.fillStyle="#f4f1e6"; x.fillRect(-W*.35,-3,W*.7,6); x.restore();
    x.fillStyle="#b3001b"; for(let i=0;i<70;i++){ const r=R()*9+1; x.beginPath(); x.arc(W*.55+(R()-.3)*W*.6,H*.35+(R()-.5)*H*.5,r,0,7); x.fill(); } },
  skyline(x,[a,b,c],R){ sky(x,b,a); x.fillStyle="rgba(255,255,255,.7)"; for(let i=0;i<60;i++) x.fillRect(R()*W,R()*H*.4,1.4,1.4); glow(x,W*.2,H*.25,40,"#f6ecd2",.9); skylineShape(x,R,H*.92,"#0a0b0e",.35,c); x.fillStyle=hexA(c,.25); x.fillRect(0,H*.92,W,H); },
  cinema(x,[a,b,c],R){ sky(x,"#120403",b); const sc=x.createLinearGradient(0,H*.15,0,H*.65); sc.addColorStop(0,"#efe3c4"); sc.addColorStop(1,"#bfa77a"); x.fillStyle=sc; x.fillRect(W*.25,H*.15,W*.5,H*.42); glow(x,W*.5,H*.36,320,"#efe3c4",.35);
    for(const side of [0,1]){ for(let i=0;i<8;i++){ x.fillStyle=i%2?"#5e0c0c":"#7a1414"; x.fillRect(side?W*.75+i*30:i*30,0,30,H); } }
    for(let i=0;i<40;i++){ const fx=R()*W, fh=60+R()*160; const g=x.createLinearGradient(0,H,0,H-fh); g.addColorStop(0,"rgba(255,140,30,.9)"); g.addColorStop(1,"rgba(255,60,0,0)"); x.fillStyle=g; x.beginPath(); x.moveTo(fx-26,H); x.quadraticCurveTo(fx,H-fh*1.2,fx+26,H); x.fill(); } },
  spiral(x,[a,b,c],R){ sky(x,b,a); x.save(); x.translate(W*.5,H*.5); for(let i=0;i<22;i++){ x.rotate(.12); const s=1-i*.042; x.strokeStyle=hexA(c,.15+i*.03); x.lineWidth=2; x.strokeRect(-W*.55*s,-H*.55*s,W*1.1*s,H*1.1*s); for(let k=0;k<6;k++){ x.fillStyle=hexA(c,.08); x.fillRect(-W*.55*s+k*W*.18*s,-H*.55*s,W*.12*s,8); } } x.restore(); glow(x,W*.5,H*.5,120,"#e8f2ff",.5); },
  clouds(x,[a,b,c],R){ sky(x,"#9fb4d6","#f3d9bd"); for(let i=0;i<14;i++){ const cx=R()*W, cy=H*(.3+R()*.6); for(let k=0;k<6;k++){ x.fillStyle="rgba(255,255,255,.5)"; x.beginPath(); x.arc(cx+k*28-70,cy+(R()-.5)*20,30+R()*30,0,7); x.fill(); } }
    x.save(); x.globalAlpha=.18; x.fillStyle="#fff7e0"; for(let i=0;i<7;i++){ x.beginPath(); x.moveTo(W*.85,0); x.lineTo(W*.25+i*90,H); x.lineTo(W*.3+i*90,H); x.fill(); } x.restore(); },
  stars(x,[a,b,c],R){ sky(x,"#0e0a2e",a); for(let i=0;i<260;i++){ x.fillStyle=`rgba(255,250,235,${R()})`; x.fillRect(R()*W,R()*H*.75,R()*1.8+.4,R()*1.8+.4); }
    x.fillStyle="#0a0718"; x.beginPath(); x.moveTo(0,H*.8); for(let px=0;px<=W;px+=40) x.lineTo(px,H*.74+Math.sin(px/90)*22); x.lineTo(W,H); x.lineTo(0,H); x.fill();
    x.strokeStyle="#0a0718"; x.lineWidth=5; x.beginPath(); x.moveTo(W*.7,H*.78); x.lineTo(W*.7,H*.42); x.stroke(); glow(x,W*.7,H*.42,110,c,.8); x.fillStyle="#fff3c8"; x.beginPath(); x.arc(W*.7,H*.42,7,0,7); x.fill(); },
  mountains(x,[a,b,c],R){ sky(x,"#e8a96a",b); x.fillStyle="#fff1d8"; x.beginPath(); x.arc(W*.3,H*.4,46,0,7); x.fill(); const lay=[["#5a6b75",.45],["#3a4a45",.58],["#1d2a1f",.72]];
    lay.forEach(([col,yb])=>{ x.fillStyle=col; x.beginPath(); x.moveTo(0,H); let px=0; while(px<=W){ x.lineTo(px,H*yb-R()*120); px+=60+R()*80; x.lineTo(px,H*yb); px+=20; } x.lineTo(W,H); x.fill(); });
    x.fillStyle="#d9e8ef"; x.fillRect(W*.62,H*.86,70,26); x.fillStyle="#2b2b2b"; x.fillRect(W*.62,H*.86,70,4); },
  track(x,[a,b,c],R){ sky(x,b,"#0a0a0d"); x.fillStyle="#1c1c22"; x.beginPath(); x.moveTo(W*.1,H); x.bezierCurveTo(W*.3,H*.6,W*.75,H*.7,W*.85,H*.35); x.lineTo(W*.9,H*.35); x.bezierCurveTo(W*.85,H*.75,W*.45,H*.7,W*.5,H); x.fill();
    for(let i=0;i<12;i++){ x.strokeStyle=i%2?"#c42b2b":"#eee"; x.lineWidth=6; x.beginPath(); x.moveTo(W*.1+i*18,H-i*2); x.lineTo(W*.1+i*18+14,H-i*2-4); x.stroke(); }
    glow(x,W*.62,H*.66,120,c,.6); x.strokeStyle="rgba(210,220,230,.25)"; x.lineWidth=1; for(let i=0;i<300;i++){ const px=R()*W, py=R()*H; x.beginPath(); x.moveTo(px,py); x.lineTo(px-6,py+22); x.stroke(); } },
  river(x,[a,b,c],R){ const g=x.createLinearGradient(0,0,0,H*.5); g.addColorStop(0,"#f4c46a"); g.addColorStop(1,"#e48a4a"); x.fillStyle=g; x.fillRect(0,0,W,H*.5); glow(x,W*.5,H*.48,240,"#fff0b0",.7);
    x.fillStyle="#1f2e22"; for(let i=0;i<40;i++){ const tx=R()*W, th=40+R()*90; x.beginPath(); x.ellipse(tx,H*.5-th*.4,22+R()*30,th*.6,0,0,7); x.fill(); }
    const w=x.createLinearGradient(0,H*.5,0,H); w.addColorStop(0,"#c98a4a"); w.addColorStop(1,"#1f3a3a"); x.fillStyle=w; x.fillRect(0,H*.5,W,H);
    x.strokeStyle="rgba(255,236,190,.5)"; for(let i=0;i<70;i++){ const y=H*.52+R()*H*.45, l=20+R()*80, px=R()*W; x.lineWidth=1.5; x.beginPath(); x.moveTo(px,y); x.lineTo(px+l,y); x.stroke(); }
    x.fillStyle="#2a1a0e"; x.fillRect(W*.42,H*.68,150,18); x.fillRect(W*.47,H*.6,6,34); x.fillRect(W*.53,H*.62,6,32); x.beginPath(); x.arc(W*.475,H*.585,8,0,7); x.arc(W*.535,H*.605,8,0,7); x.fill(); }
};
export function drawScene(f){
  const cv = document.createElement("canvas"); cv.width=W/2; cv.height=H/2; const x = cv.getContext("2d"); x.scale(.5,.5);
  const p = pal(f).map(safeCol); if (!p[2]) p[2]="#c9a55e";
  try { (SCENES[sceneOf(f)] || SCENES.bokeh)(x, p, rng(f.id||f.title||"x")); } catch(e){ SCENES.bokeh(x,p,rng("x")); }
  const v = x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.75); v.addColorStop(0,"rgba(0,0,0,0)"); v.addColorStop(1,"rgba(0,0,0,.55)"); x.fillStyle=v; x.fillRect(0,0,W,H);
  return new Promise(res => cv.toBlob(bl => res(bl ? URL.createObjectURL(bl) : cv.toDataURL("image/jpeg",.8)), "image/jpeg", .82));
}
