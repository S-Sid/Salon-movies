
/* ---------- Retro gig-poster art: a flat-colour poster per film, drawn on canvas ----------
   Each film gets a palette (by mood/genre), one of four compositions (by its old scene type),
   a big glyph with a hard shadow, halftone dots and a printed border. */
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

const W=960,H=540;

/* flat poster palettes: bg wall, a = hero colour, b = cream, c = accent, ink = silhouettes */
const CREAM = "#f2e4c4";
const PALS = {
  red:   {bg:"#b3261e", a:"#e3a63a", b:CREAM, c:"#8c1c15", ink:"#1a0a0a"},
  must:  {bg:"#e3a63a", a:"#b3261e", b:CREAM, c:"#c47f17", ink:"#1f2a1c"},
  teal:  {bg:"#1f6f6b", a:"#e3a63a", b:CREAM, c:"#e8602c", ink:"#0d1f1e"},
  olive: {bg:"#6b7a2f", a:CREAM,     b:"#b3261e", c:"#e3a63a", ink:"#1c200c"},
  navy:  {bg:"#1c2a4a", a:"#e8602c", b:CREAM, c:"#e3a63a", ink:"#0a1020"},
  coral: {bg:"#d9544a", a:CREAM,     b:"#5a0f2e", c:"#e3a63a", ink:"#2a0a14"},
};
function palFor(f, R){
  const m = f.moods||[], g = f.genres||[], pick = arr => arr[Math.floor(R()*arr.length)];
  if (m.some(x=>["Dark","Tense","Intense"].includes(x)) || g.includes("Horror")) return PALS[pick(["red","navy","red"])];
  if (g.includes("Sci-Fi") || m.includes("Mind-bending")) return PALS[pick(["navy","teal"])];
  if (m.some(x=>["Romantic","Heartfelt","Opulent"].includes(x)) || g.includes("Romance")) return PALS[pick(["coral","red","coral"])];
  if (m.some(x=>["Light","Witty","Uplifting"].includes(x)) || g.includes("Comedy")) return PALS[pick(["must","teal","coral"])];
  if (g.includes("Adventure") || m.includes("Epic") || g.includes("Family")) return PALS[pick(["olive","must","teal"])];
  return PALS[pick(Object.keys(PALS))];
}
/* flat placeholder colour shown until the poster is drawn (same palette choice as drawScene) */
export const posterBg = f => palFor(f, rng(f.id||f.title||"x")).bg;
const mix = (hex, other, t) => { const a=parseInt(hex.slice(1),16), b=parseInt(other.slice(1),16); const c=(s)=>Math.round(((a>>s&255)*(1-t))+((b>>s&255)*t)); return `rgb(${c(16)},${c(8)},${c(0)})`; };
function halftone(x,cx,cy,r,col,vertical,step=15,maxR=6.2){
  x.save(); x.beginPath(); x.arc(cx,cy,r,0,7); x.clip(); x.fillStyle=col;
  let row=0; for(let y=cy-r; y<cy+r; y+=step*.866, row++){ for(let px=cx-r+(row%2?step/2:0); px<cx+r; px+=step){
    const t = vertical ? (y-(cy-r))/(2*r) : 1-Math.hypot(px-cx,y-cy)/r; const rad = maxR*Math.max(0,Math.min(1,t));
    if (rad>.5){ x.beginPath(); x.arc(px,y,rad,0,7); x.fill(); } } }
  x.restore();
}
function rays(x,cx,cy,n,col){ x.fillStyle=col; for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, a1=a0+Math.PI/n; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(a0)*1400,cy+Math.sin(a0)*1400); x.lineTo(cx+Math.cos(a1)*1400,cy+Math.sin(a1)*1400); x.closePath(); x.fill(); } }
function hills(x,R,P){ [[.66,P.c],[.78,P.ink]].forEach(([yb,col],l)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(0,H); let px=-20; x.lineTo(0,H*yb); while(px<W+60){ const w=90+R()*120; x.lineTo(px+w/2,H*yb-(l?30:60)-R()*(l?50:90)); x.lineTo(px+w,H*yb); px+=w; } x.lineTo(W,H); x.closePath(); x.fill(); }); }
function city(x,R,P){ let px=0; while(px<W){ const w=36+R()*70, h=70+R()*190; x.fillStyle=P.ink; x.fillRect(px,H-h,w,h); x.fillStyle=P.b; for(let wy=H-h+12; wy<H-14; wy+=17) for(let wx=px+7; wx<px+w-8; wx+=14) if(R()<.28) x.fillRect(wx,wy,6,8); px+=w+3; } }
function glyph(x,f,P,cx,cy,size){
  const g = f.motif || (f.title||"?")[0];
  x.save(); x.textAlign="center"; x.textBaseline="middle"; x.font=`${size}px "Alfa Slab One","Fraunces",Georgia,serif`;
  x.fillStyle=P.ink; x.fillText(g,cx+7,cy+8); x.fillStyle=P.b; x.fillText(g,cx,cy); x.restore();
}
const LAYOUT = {skyline:"moon",fog:"moon",gatsby:"moon",smoke:"moon",cinema:"moon",clouds:"moon",bokeh:"moon",
  sunset:"sun",mountains:"sun",savanna:"sun",river:"sun",jungle:"sun",snow:"sun",
  stars:"record",spiral:"record",maze:"record",grid:"record",rails:"record",track:"record",
  slash:"bands",blinds:"bands",rain:"bands"};
const COMPOSE = {
  sun(x,f,P,R){ const cx=W*(.3+R()*.4), cy=H*.56; x.fillStyle=P.bg; x.fillRect(0,0,W,H); rays(x,cx,cy,24,mix(P.bg,P.a,.16));
    x.fillStyle=P.a; x.beginPath(); x.arc(cx,cy,150,0,7); x.fill(); halftone(x,cx,cy,150,P.c,true,13,5.5); hills(x,R,P); glyph(x,f,P,cx,cy-8,170); },
  record(x,f,P,R){ const cx=W*(.34+R()*.32), cy=H*.5; x.fillStyle=P.bg; x.fillRect(0,0,W,H);
    for(let i=0;i<8;i++){ x.fillStyle=i%2?mix(P.bg,"#000000",.18):mix(P.bg,"#000000",.34); x.beginPath(); x.arc(cx,cy,400-i*40,0,7); x.fill(); }
    x.fillStyle=P.ink; x.beginPath(); x.arc(cx,cy,172,0,7); x.fill(); for(let r=100;r<172;r+=12){ x.strokeStyle="rgba(255,255,255,.08)"; x.lineWidth=2; x.beginPath(); x.arc(cx,cy,r,0,7); x.stroke(); }
    x.fillStyle=P.a; x.beginPath(); x.arc(cx,cy,92,0,7); x.fill(); halftone(x,cx,cy,92,P.c,false,11,4); glyph(x,f,{...P,b:P.ink,ink:P.b},cx,cy-4,92);
    x.fillStyle=P.ink; x.beginPath(); x.arc(cx,cy,7,0,7); x.fill();
    x.fillStyle=P.a; for(let i=0;i<5;i++) x.fillRect(W-150+i*24,40,12,70-i*10); },
  bands(x,f,P,R){ x.fillStyle=P.bg; x.fillRect(0,0,W,H); x.save(); x.translate(W*.5,H*.5); x.rotate(-.42);
    const cols=[P.a,P.b,P.ink,P.c]; for(let i=-4;i<5;i++){ x.fillStyle=cols[(i+8)%4]; x.fillRect(-W,i*70-35,W*2,64); } x.restore();
    const cx=W*(.3+R()*.4), cy=H*.5; x.fillStyle=P.bg; x.beginPath(); x.arc(cx,cy,150,0,7); x.fill(); x.lineWidth=10; x.strokeStyle=P.b; x.stroke();
    halftone(x,cx,cy,140,P.c,true,12,5); glyph(x,f,P,cx,cy-6,170); },
  moon(x,f,P,R){ const cx=W*(.28+R()*.44), cy=H*.4; x.fillStyle=P.bg; x.fillRect(0,0,W,H); for(let i=0;i<50;i++){ x.fillStyle=mix(P.bg,P.b,.45); x.fillRect(R()*W,R()*H*.6,3,3); }
    x.fillStyle=P.a; x.beginPath(); x.arc(cx,cy,155,0,7); x.fill(); halftone(x,cx,cy,155,P.c,true,14,6); city(x,R,P); glyph(x,f,P,cx,cy-6,170); },
};
export function drawScene(f){
  const cv = document.createElement("canvas"); cv.width=W/2; cv.height=H/2; const x = cv.getContext("2d"); x.scale(.5,.5);
  const R = rng(f.id||f.title||"x");
  const go = () => {
    const P = palFor(f,R), kind = LAYOUT[sceneOf(f)] || ["sun","record","bands","moon"][Math.floor(R()*4)];
    try { COMPOSE[kind](x,f,P,R); } catch(e){ x.fillStyle=P.bg; x.fillRect(0,0,W,H); }
    x.strokeStyle="rgba(242,228,196,.8)"; x.lineWidth=4; x.strokeRect(16,16,W-32,H-32);
    return new Promise(res => cv.toBlob(bl => res(bl ? URL.createObjectURL(bl) : cv.toDataURL("image/jpeg",.85)), "image/jpeg", .86));
  };
  const fonts = document.fonts && document.fonts.load ? document.fonts.load('100px "Alfa Slab One"').catch(()=>{}) : Promise.resolve();
  return Promise.race([fonts, new Promise(r=>setTimeout(r,1500))]).then(go);
}
