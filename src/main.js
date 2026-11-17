import "./styles.css";
import { $, esc, reduce, fmtTime, pal, safeCol } from "./util.js";
import { MOODS, GENRES, PAIRINGS, GENRE_ROW, TIMES, BEST_TIMES, FEELINGS, AUDIENCES } from "./vocab.js";
import { sceneCache, drawScene } from "./scenes.js";
import { store as realStore } from "./store.js";

(() => {
  "use strict";
  let store = realStore;   // dev-only mock swaps in below (never in the production build)
  /* ---------- Opening: wax seal + curtains ---------- */
  const intro = $("#intro");
  function endIntro(){ if(!intro.classList.contains("done")) intro.classList.add("done"); startHero(); }
  function playIntro(){
    intro.classList.remove("done","play"); void intro.offsetWidth;
    intro.classList.add("play");
    clearTimeout(playIntro.t); playIntro.t = setTimeout(endIntro, 3500);
  }
  intro.addEventListener("click", () => { clearTimeout(playIntro.t); endIntro(); });
  let seen = false; try { seen = sessionStorage.getItem("salonIntro") === "1"; sessionStorage.setItem("salonIntro","1"); } catch(e){}
  if (reduce || seen) intro.classList.add("done"); else playIntro();
  $("#replay").addEventListener("click", () => { window.scrollTo({top:0}); playIntro(); });

  const hdr = $("#hdr");
  addEventListener("scroll", () => hdr.classList.toggle("solid", scrollY > 40), {passive:true});

  /* ---------- State ---------- */
  let listFilms = [], addedFilms = [], films = [];
  let mine = {}; let rawLists = [];
  const F = {lang:null, svc:null, genres:[], mood:null, time:null, aud:null};
  const AUD_CHIPS = [{id:"fam", label:"Family-friendly", test:a=>a==="Kids"||a==="Family"},{id:"teen", label:"Teens 13+", test:a=>a==="Teens 13+"},{id:"adult", label:"Adults only", test:a=>a==="Adults only"}];
  let me = {name:null, admin:false}, names = {}, stats = {};
  let groups = [], gid = null;   // the groups I belong to, and the one on screen
  const curGroup = () => groups.find(g => g.id === gid) || null;
  let unseenOnly = false; try { unseenOnly = localStorage.getItem("salonUnseen")==="1"; } catch(e){}
  let tab = "home";
  let uid = null, canWrite = true, heroFilm = null, heroStarted = false;

  const statusOf = f => (mine[f.id] && mine[f.id].status) || "want";
  function paint(f){
    if (sceneCache[f.id]) return `url(${sceneCache[f.id]}) center/cover no-repeat, #140c12`;
    const p = pal(f).map(safeCol); const [a,b] = p, c = p[2] || "#c9a55e";
    return `radial-gradient(120% 90% at 18% 20%, ${a} 0%, transparent 60%), radial-gradient(90% 80% at 85% 85%, ${c}55 0%, transparent 55%), radial-gradient(70% 70% at 70% 30%, ${b} 0%, transparent 70%), linear-gradient(135deg, ${b}, #120a10)`;
  }
  const hasAll = (arr, need) => need.every(g => (arr||[]).includes(g));
  const countWith = gs => films.filter(f => !f.pending && hasAll(f.genres, gs)).length;
  const comboName = gs => gs.join(" + ");

  function mergeFilms(){
    const seenIds = new Set();
    films = [];
    listFilms.concat(addedFilms).forEach(f => { if (f && f.id && !seenIds.has(f.id)){ seenIds.add(f.id); films.push(f); } });
  }

  /* Lazy painting: only cards near the viewport get a scene, one at a time when the browser is idle,
     and finished scenes are patched into the existing cards instead of re-rendering the page. */
  const paintQueue = new Set(); let pumping = false;
  const idle = cb => setTimeout(cb, 16);
  const io = ("IntersectionObserver" in window) ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting){ io.unobserve(e.target); const id = e.target.dataset.id; if (id && !sceneCache[id]) paintQueue.add(id); } });
    pump();
  }, {rootMargin:"200px 400px"}) : null;
  function observeCards(){
    document.querySelectorAll(".card[data-id]").forEach(c => { if (!sceneCache[c.dataset.id]) { if (io) io.observe(c); else paintQueue.add(c.dataset.id); } });
    if (heroFilm && !sceneCache[heroFilm.id]) paintQueue.add(heroFilm.id);
    pump();
  }
  function applyScene(f){
    const bg = paint(f);
    document.querySelectorAll('.card[data-id="'+CSS.escape(f.id)+'"]').forEach(c => { const p = c.querySelector(".paint"); if (p) p.style.background = bg; const g = c.querySelector(".glyph"); if (g) g.remove(); });
    if (heroFilm && heroFilm.id === f.id) renderHero();
  }
  function pump(){
    if (pumping || !paintQueue.size) return; pumping = true;
    idle(async () => {
      const id = paintQueue.values().next().value; paintQueue.delete(id);
      const f = films.find(z => z.id === id);
      if (f && !sceneCache[id]) { sceneCache[id] = await drawScene(f); applyScene(f); }
      pumping = false; pump();
    });
  }
  function paintAll(){ observeCards(); }


  /* ---------- Streaming services ---------- */
  function servicesOf(f){
    const out = [];
    (f.where||[]).forEach(w => { if (w.kind==="stream" || w.kind==="free") String(w.service||"").split(/\s*[,/]\s*/).forEach(s => { s = s.replace(/\s*\(.*?\)\s*/g,"").trim(); if (s && !out.includes(s)) out.push(s); }); });
    return out;
  }
  function accessOf(f){
    const s = servicesOf(f); if (s.length) return s;
    if ((f.where||[]).some(w=>w.kind==="rent")) return ["Rent / buy only"];
    if ((f.where||[]).some(w=>w.kind==="none")) return ["Not streaming"];
    return f.pending ? [] : ["Not confirmed"];
  }

  /* ---------- Filter chips ---------- */
  function chip(attr, val, label, pressed, extra=""){
    return `<button class="chip ${extra}" type="button" ${attr}="${esc(val)}" aria-pressed="${pressed}">${label}</button>`;
  }
  function renderChips(){
    const ready = films.filter(f=>!f.pending);
    const langs = [...new Set(ready.map(f=>f.language||"English"))];
    $("#langChips").innerHTML = '<span class="lbl">Language</span>' + langs.map(l => chip("data-lang", l, `${esc(l)}<span class="n">${ready.filter(f=>(f.language||"English")===l).length}</span>`, F.lang===l)).join("");

    const svcs = {}; ready.forEach(f => accessOf(f).forEach(s => svcs[s]=(svcs[s]||0)+1));
    const order = Object.keys(svcs).sort((a,b)=>{ const rank=s=>/^(Rent|Not)/.test(s)?1:0; return rank(a)-rank(b) || svcs[b]-svcs[a]; });

    const presentG = new Set(ready.flatMap(f=>f.genres||[]));
    const gs = GENRES.filter(g=>presentG.has(g)).concat([...presentG].filter(g=>!GENRES.includes(g)));
    $("#genreChips").innerHTML = '<span class="lbl">Genre <small>pick two to pair</small></span>' + gs.map(g => {
      const pressed = F.genres.includes(g);
      const n = countWith(pressed ? F.genres : F.genres.concat(g));
      return chip("data-genre", g, `${esc(g)}<span class="n">${n}</span>`, pressed, n||pressed ? "" : "empty");
    }).join("");

    $("#comboChips").innerHTML = '<span class="lbl">Pairings</span>' + PAIRINGS.map(p => {
      const n = countWith(p), on = F.genres.length===2 && hasAll(F.genres,p);
      return chip("data-combo", p.join("|"), `${esc(p[0])}<span class="plus">+</span>${esc(p[1])}<span class="n">${n}</span>`, on, "combo" + (n ? "" : " empty"));
    }).join("");

    const presentM = new Set(ready.flatMap(f=>f.moods||[]));
    const ms = MOODS.filter(m=>presentM.has(m)).concat([...presentM].filter(m=>!MOODS.includes(m)));
    $("#moodChips").innerHTML = '<span class="lbl">Mood</span>' + ms.map(m => chip("data-mood", m, esc(m), F.mood===m)).join("");
    $("#timeChips").innerHTML = '<span class="lbl">Time you have</span>' + TIMES.map(t => chip("data-time", t.id, t.label, F.time===t.id)).join("");
    const haveAud = new Set(ready.map(f=>f.audience).filter(Boolean));
    $("#audChips").innerHTML = haveAud.size ? '<span class="lbl">Audience <small>who is watching</small></span>' + AUD_CHIPS.filter(a=>[...haveAud].some(a.test)).map(a => chip("data-aud", a.id, esc(a.label), F.aud===a.id)).join("") : "";
    $("#audChips").hidden = !haveAud.size;
    $("#clearAll").hidden = !(F.lang || F.svc || F.genres.length || F.mood || F.time || F.aud);
  }
  $("#clearAll").addEventListener("click", () => { F.lang=null; F.svc=null; F.genres=[]; F.mood=null; F.time=null; F.aud=null; renderAll(); });

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-lang],[data-svc],[data-genre],[data-combo],[data-mood],[data-time],[data-aud],[data-tab]");
    if (!t) return;
    if (t.dataset.lang){ F.lang = F.lang===t.dataset.lang ? null : t.dataset.lang; }
    else if (t.dataset.svc){ F.svc = F.svc===t.dataset.svc ? null : t.dataset.svc; }
    else if (t.dataset.genre){ const g=t.dataset.genre; F.genres = F.genres.includes(g) ? F.genres.filter(x=>x!==g) : F.genres.concat(g).slice(-3); }
    else if (t.dataset.combo){ const p=t.dataset.combo.split("|"); F.genres = (F.genres.length===2 && hasAll(F.genres,p)) ? [] : p; }
    else if (t.dataset.mood){ F.mood = F.mood===t.dataset.mood ? null : t.dataset.mood; }
    else if (t.dataset.time){ F.time = F.time===t.dataset.time ? null : t.dataset.time; }
    else if (t.dataset.aud){ F.aud = F.aud===t.dataset.aud ? null : t.dataset.aud; }
    else if (t.dataset.tab){ tab=t.dataset.tab; document.querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-pressed", b===t)); window.scrollTo({top: $("#rows").offsetTop - 90, behavior: reduce?"auto":"smooth"}); }
    renderAll();
    if (!t.dataset.tab && (F.lang||F.svc||F.genres.length||F.mood||F.time||F.aud)) { const r=$("[data-row='picked']") || $(".empty"); if (r && r.getBoundingClientRect().top > innerHeight) r.scrollIntoView({behavior: reduce?"auto":"smooth", block:"center"}); }
  });

  /* ---------- Hero ---------- */
  function pickHero(){
    const ready = films.filter(f => !f.pending);
    const watching = ready.filter(f => statusOf(f)==="watching");
    const want = ready.filter(f => statusOf(f)==="want");
    const pool = watching.length ? watching : (want.length ? want : ready);
    if (!pool.length) return null;
    const keep = heroFilm && pool.find(f => f.id===heroFilm.id);
    return keep || pool[Math.floor(Math.random()*pool.length)];
  }
  function renderHero(force){
    const prev = heroFilm;
    if (force) heroFilm = null;
    let f = pickHero();
    if (force && prev && f && f.id===prev.id){ const others = films.filter(x=>!x.pending && x.id!==prev.id && statusOf(x)!=="watched"); if (others.length) f = others[Math.floor(Math.random()*others.length)]; }
    heroFilm = f;
    const art = $("#heroArt"), copy = $("#heroCopy");
    if (!f){
      art.style.background = "radial-gradient(80% 80% at 70% 30%, #4a1c2c, #140c12)";
      art.innerHTML = '<div class="frame"></div>';
      copy.innerHTML = `<div class="eyebrow">An empty drawing room</div><h1>Your salon awaits its first title</h1>
        <p class="hook">Add a film with just its title, year and language. Details like mood, running time, ratings and where to stream it in India get filled in afterwards.</p>
        <div class="actions"><button class="btn primary" type="button" id="heroAdd">+ Add a film yourself</button></div>`;
      $("#heroAdd")?.addEventListener("click", openAdd);
    } else {
      art.style.background = paint(f);
      art.innerHTML = sceneCache[f.id] ? "" : `<div class="frame"></div><div class="glyph">${esc(f.motif || (f.title||"?")[0])}</div>`;
      const st = statusOf(f), r = f.ratings||{};
      copy.innerHTML = `<div class="eyebrow">${st==="watching" ? "Continue the season" : "Tonight's recommendation"}</div>
        <h1>${esc(f.title)}</h1>
        <div class="meta">${f.year?`<span>${esc(f.year)}</span><span class="sep">◆</span>`:""}${f.runtimeMin?`<span>${fmtTime(f.runtimeMin)}</span><span class="sep">◆</span>`:""}<span>${esc(f.language||"English")}</span>${r.imdb?`<span class="sep">◆</span><span>IMDb ${esc(r.imdb)}</span>`:""}${r.rt!=null?`<span class="sep">◆</span><span>RT ${esc(r.rt)}%</span>`:""}</div>
        <p class="hook">${esc(f.hook || f.synopsis || "")}</p>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">${(f.genres||[]).map(m=>`<span class="tag">${esc(m)}</span>`).join("")}${(f.moods||[]).map(m=>`<span class="tag mood">${esc(m)}</span>`).join("")}</div>
        <div class="actions">
          <button class="btn primary" type="button" data-open="${esc(f.id)}">Read the card</button>
          <button class="btn ghost" type="button" id="heroNext">Suggest another</button>
        </div>`;
      $("#heroNext").addEventListener("click", () => renderHero(true));
    }
    if (heroStarted) restartHero();
  }
  function restartHero(){ const c=$("#heroCopy"); c.classList.remove("in"); void c.offsetWidth; c.classList.add("in"); }
  function startHero(){ heroStarted = true; restartHero(); }
  if (intro.classList.contains("done")) startHero();

  /* ---------- Cards & rows ---------- */
  function cardHTML(f){
    const st = statusOf(f), m = mine[f.id] || {};
    const badge = f.pending ? '<span class="badge pending">Awaiting details</span>' : st==="watched" ? '<span class="badge seen">Seen</span>' : st==="watching" ? '<span class="badge">Watching</span>' : "";
    const r = f.ratings || {};
    const quote = st==="watched" && m.insight ? `<div class="quote">${esc(m.insight)}</div>` : "";
    return `<div class="card" data-id="${esc(f.id)}" tabindex="0" role="button" aria-label="${esc(f.title)}">
      <div class="art"><div class="paint" style="background:${paint(f)}"></div>
        ${sceneCache[f.id] ? "" : `<div class="glyph">${esc(f.motif || (f.title||"?")[0])}</div>`}
        ${f.year?`<span class="yr">${esc(f.year)}</span>`:""}${badge}
        <div class="ttl">${esc(f.title)}</div></div>
      <div class="peek">${f.runtimeMin?`<span>${fmtTime(f.runtimeMin)}</span>`:""}${r.imdb?`<span><b>IMDb ${esc(r.imdb)}</b></span>`:""}${r.rt!=null?`<span>RT ${esc(r.rt)}%</span>`:""}${stats[f.id]&&stats[f.id].avg?`<span>Friends ★${esc(stats[f.id].avg)}</span>`:""}</div>
      </div>`;
  }
  function rowHTML(title, sub, list, key){
    if (!list.length) return "";
    return `<section class="row" data-row="${esc(key)}"><div class="row-head"><h2>${title}</h2>${sub?`<span class="sub">${esc(sub)}</span>`:""}</div>
      <button class="arrow prev" type="button" aria-label="Scroll left">‹</button>
      <div class="track">${list.map(cardHTML).join("")}</div>
      <button class="arrow next" type="button" aria-label="Scroll right">›</button></section>`;
  }
  const passes = f => {
    if (F.lang && (f.language||"English")!==F.lang) return false;
    if (F.svc && !accessOf(f).includes(F.svc)) return false;
    if (F.genres.length && !hasAll(f.genres, F.genres)) return false;
    if (F.mood && !(f.moods||[]).includes(F.mood)) return false;
    if (F.time){ const t = TIMES.find(x=>x.id===F.time); if (!t.test(f.runtimeMin)) return false; }
    if (F.aud){ const a = AUD_CHIPS.find(x=>x.id===F.aud); if (!a.test(f.audience)) return false; }
    return true;
  };
  const byRating = (a,b) => ((b.ratings||{}).imdb||0) - ((a.ratings||{}).imdb||0);

  function renderRows(){
    const ready = films.filter(f => !f.pending);
    const unseen = unseenOnly ? ready.filter(f => statusOf(f)!=="watched") : ready;   // "unseen" = what this person may still watch
    let html = "";
    const filtering = F.lang || F.svc || F.genres.length || F.mood || F.time || F.aud;
    if (filtering){
      const hits = unseen.filter(passes);
      const label = [F.lang, F.svc, F.genres.length ? comboName(F.genres) : null, F.mood, F.time && TIMES.find(t=>t.id===F.time).label, F.aud && AUD_CHIPS.find(a=>a.id===F.aud).label].filter(Boolean).join(" · ");
      html += hits.length ? rowHTML("Chosen for your evening", label, hits, "picked")
        : `<div class="empty" data-row="picked">Nothing unseen on your list matches ${esc(label)} yet. Loosen a filter, or add films that fit.</div>`;
    }
    if (tab==="home"){
      html += rowHTML("Continue the season", "Started, not finished", ready.filter(f=>statusOf(f)==="watching"), "watching");
      const langs = [...new Set(unseen.map(f=>f.language||"English"))];
      langs.forEach(l => html += rowHTML(`In ${esc(l)}`, `${unseen.filter(f=>(f.language||"English")===l).length} ${unseenOnly ? "awaiting an evening" : "on the shelf"}`, unseen.filter(f=>(f.language||"English")===l), "lang-"+l));
      const sv = {}; unseen.forEach(f => servicesOf(f).forEach(s => (sv[s]=sv[s]||[]).push(f)));

      const fun = unseen.filter(f=>f.yourShelf);
      if (fun.length) html += rowHTML(`From your <span class="shelf">${esc(fun[0].yourShelf)}</span> shelf`, "", fun, "shelf");
      const combos = PAIRINGS.map(p => ({p, list: unseen.filter(f=>hasAll(f.genres,p))})).filter(c=>c.list.length>=2);
      combos.forEach(c => html += rowHTML(`${esc(c.p[0])} <span style="color:var(--gilt)">+</span> ${esc(c.p[1])}`, "A pairing", c.list, "combo-"+c.p.join("-")));
      html += rowHTML("Before the candles burn down", "Under two hours", unseen.filter(f=>f.runtimeMin && f.runtimeMin<120), "short");
      html += rowHTML("Critics' darlings", "Highest IMDb first", unseen.slice().sort(byRating).slice(0,10), "top");
      html += rowHTML("Awaiting details", "Added by friends. Details are filled in soon.", films.filter(f=>f.pending), "pending");
      if (!unseenOnly) html += rowHTML("Seen &amp; noted", "Yours alone, with your insights", ready.filter(f=>statusOf(f)==="watched"), "watched");
    }
    if (tab==="genres"){
      const present = new Set(unseen.flatMap(f=>f.genres||[]));
      GENRES.concat([...present].filter(g=>!GENRES.includes(g))).forEach(g => {
        const l = unseen.filter(f=>(f.genres||[]).includes(g));
        if (l.length) html += rowHTML(esc(GENRE_ROW[g]||g), `${l.length}`, l, "g-"+g);
      });
      PAIRINGS.forEach(p => { const l = unseen.filter(f=>hasAll(f.genres,p)); if (l.length) html += rowHTML(`${esc(p[0])} <span style="color:var(--gilt)">+</span> ${esc(p[1])}`, "Pairing", l, "pc-"+p.join("-")); });
    }
    if (tab==="moods"){
      const present = new Set(unseen.flatMap(f=>f.moods||[]));
      MOODS.concat([...present].filter(m=>!MOODS.includes(m))).forEach(m => {
        const l = unseen.filter(f=>(f.moods||[]).includes(m));
        if (l.length) html += rowHTML(`For a ${esc(m.toLowerCase())} evening`, "", l, "m-"+m);
      });
    }
    if (tab==="watched"){
      const w = ready.filter(f=>statusOf(f)==="watched");
      html += w.length ? rowHTML("Seen &amp; noted", "Open a card to write what you took from it", w, "watched")
        : `<div class="empty">Nothing marked as seen yet. Open any card, set it to Seen, and write down the insight it left you with.</div>`;
    }
    if (!html) html = `<div class="empty">${films.length ? "Nothing here yet." : ""}</div>`;
    $("#rows").innerHTML = html;
  }
  function renderAll(){ renderChips(); renderRows(); observeCards(); }

  document.addEventListener("click", e => {
    const a = e.target.closest(".arrow");
    if (a){ const tr = a.parentElement.querySelector(".track"); tr.scrollBy({left:(a.classList.contains("next")?1:-1)*tr.clientWidth*.85, behavior: reduce?"auto":"smooth"}); return; }
    const cyc = e.target.closest("[data-cycle]");
    if (cyc){ e.stopPropagation(); const id=cyc.dataset.cycle; setMine(id,{status: statusOf({id})==="watched" ? "want" : "watched"}); return; }
    const op = e.target.closest("[data-open]");
    if (op){ openFilm(op.dataset.open, op.closest(".card")); return; }
    const card = e.target.closest(".card");
    if (card) openFilm(card.dataset.id, card);
  });
  document.addEventListener("keydown", e => {
    if (e.key==="Escape") closeModal();
    if ((e.key==="Enter"||e.key===" ") && e.target.classList && e.target.classList.contains("card")){ e.preventDefault(); openFilm(e.target.dataset.id, e.target); }
  });

  /* ---------- Modal ---------- */
  const scrim = $("#scrim"), modal = $("#modal");
  let lastFocus = null, openId = null;
  function grow(fromEl){
    if (reduce || !fromEl || !modal.animate) return;
    const a = fromEl.getBoundingClientRect(), b = modal.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const sx = a.width/b.width, dx = (a.left + a.width/2) - (b.left + b.width/2), dy = a.top - b.top;
    modal.animate([{transformOrigin:"top center",transform:`translate(${dx}px,${dy}px) scale(${sx})`,opacity:.4},{transformOrigin:"top center",transform:"none",opacity:1}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)"});
  }
  function openFilm(id, fromEl){
    const f = films.find(x=>x.id===id); if (!f) return;
    lastFocus = document.activeElement; openId = id;
    renderModal(f);
    scrim.classList.add("open"); document.body.style.overflow="hidden";
    grow(fromEl && fromEl.querySelector ? (fromEl.querySelector(".art")||fromEl) : null);
    $(".m-close", modal).focus();
  }
  function closeModal(){
    if (!scrim.classList.contains("open")) return;
    if (scrim.dataset.gate === "1" && !gid) return;   // first-time screen: must create or join a group first
    scrim.dataset.gate = "";
    scrim.classList.remove("open"); document.body.style.overflow=""; openId=null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  scrim.addEventListener("click", e => { if (e.target===scrim) closeModal(); });

  function renderModal(f){
    const r = f.ratings || {}, m = mine[f.id] || {}, st = statusOf(f);
    const rate = (src,val,unit) => val==null||val==="" ? "" : `<div class="rate"><div class="src">${src}</div><div class="val">${esc(val)}<small>${unit}</small></div></div>`;
    const kindLbl = k => ({stream:"Subscription", free:"Free with ads", rent:"Rent / buy", none:"Not streaming", unknown:"Not confirmed"}[k] || k || "");
    const where = f.where || [];
    modal.innerHTML = `
      <div class="m-art"><div class="paint" style="position:absolute;inset:0;background:${paint(f)}"></div>
        ${sceneCache[f.id] ? "" : `<div class="glyph">${esc(f.motif || (f.title||"?")[0])}</div>`}
        <button class="round m-close" type="button" aria-label="Close">✕</button>
        <h2 id="mTitle">${esc(f.title)}</h2></div>
      <div class="m-body">
        <div>
          <div class="meta">${f.year?`<span>${esc(f.year)}</span><span class="sep">◆</span>`:""}${f.runtimeMin?`<span>${fmtTime(f.runtimeMin)}</span><span class="sep">◆</span>`:""}<span>${esc(f.language||"English")}</span>${f.director?`<span class="sep">◆</span><span>${esc(f.director)}</span>`:""}</div>
          ${f.addedBy && names[f.addedBy] ? `<p class="fine" style="margin:-4px 0 10px">Added by <b style="color:var(--wisteria)">@${esc(names[f.addedBy])}</b></p>`:""}
          ${f.pending ? `<p class="status-note" style="margin:0 0 10px">Details pending. Mood, runtime, ratings, cast and streaming get filled in soon.</p>`:""}
          ${f.synopsis?`<p>${esc(f.synopsis)}</p>`:""}
          ${f.occasion?`<h3>When to watch</h3><p><em>${esc(f.occasion)}</em></p>`:""}
          ${(f.genres||[]).length||(f.moods||[]).length?`<h3>Genre &amp; mood</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${(f.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}${(f.moods||[]).map(x=>`<span class="tag mood">${esc(x)}</span>`).join("")}</div>`:""}
          ${(f.cast||[]).length?`<h3>Cast</h3><p>${f.cast.map(esc).join(", ")}</p>`:""}
          ${f.audience||(f.warnings||[]).length?`<h3>Good to know</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${f.audience?`<span class="tag aud">${esc(f.audience)}</span>`:""}${(f.warnings||[]).map(x=>`<span class="tag warn">${esc(x)}</span>`).join("")}</div>`:""}
          ${(r.imdb||r.rt!=null||r.mc||r.letterboxd)?`<h3>What the critics say</h3><div class="ratings">${rate("IMDb",r.imdb,"/10")}${rate("Rotten Tomatoes",r.rt,"%")}${rate("Metacritic",r.mc,"/100")}${rate("Letterboxd",r.letterboxd,"/5")}</div>`:""}
          <h3>The insight I got</h3>
          ${uid ? `<textarea id="insight" data-field="insight" placeholder="${st==="watched"?"What stayed with you? What did it change in how you think?":"Fill this in after you've watched it."}">${esc(m.insight||"")}</textarea>
          <h3>Remarks <span class="fine" style="text-transform:none;letter-spacing:0">(friends can see this, with your username)</span></h3>
          <textarea id="remarks" data-field="remarks" style="min-height:80px" placeholder="Who recommended it, scenes to revisit, who to watch it with…">${esc(m.remarks||"")}</textarea>
          <div class="saved" id="savedMsg"></div>` : `<p class="fine">Sign in to keep private notes here.</p>`}
        </div>
        <div>
          <h3>Status</h3>
          <div class="statusset">${["want","watching","watched"].map(s=>`<button class="chip" type="button" data-status="${s}" aria-pressed="${st===s}" ${uid?"":"disabled"}>${{want:"To watch",watching:"Watching",watched:"Seen"}[s]}</button>`).join("")}</div>
          <h3>Your verdict</h3>
          <div class="quills" role="group" aria-label="Your rating out of 5">${[1,2,3,4,5].map(n=>`<button type="button" data-stars="${n}" class="${(m.stars||0)>=n?"on":""}" aria-label="${n} of 5" ${uid?"":"disabled"}>✦</button>`).join("")}</div>
          <h3>Best time to watch</h3>
          <div class="statusset wrap">${BEST_TIMES.map(x=>`<button class="chip sm" type="button" data-besttime="${esc(x)}" aria-pressed="${m.bestTime===x}" ${uid?"":"disabled"}>${esc(x)}</button>`).join("")}</div>
          <h3>How it left you</h3>
          <div class="statusset wrap">${FEELINGS.map(x=>`<button class="chip sm" type="button" data-feeling="${esc(x)}" aria-pressed="${m.feeling===x}" ${uid?"":"disabled"}>${esc(x)}</button>`).join("")}</div>
          <h3>What friends say</h3>
          <div id="takes" class="fine">Loading…</div>
          <h3>Where to watch in India</h3>
          ${where.length ? `<div class="where">${where.map(w=>`<div class="svc"><span>${esc(w.service)}</span><span class="kind ${esc(w.kind)}">${esc(kindLbl(w.kind))}</span></div>`).join("")}</div>` : `<p class="fine">Not yet researched.</p>`}
          ${f.whereNote?`<p class="fine" style="margin-top:8px">${esc(f.whereNote)}</p>`:""}
          ${f.checked?`<p class="fine">Checked ${esc(f.checked)}. Licences shift month to month.</p>`:""}
          ${f.pending && (f.addedBy===uid || me.admin) ? `<h3>Remove</h3><button class="btn ghost" type="button" id="rmPending">Remove from list</button>`:""}
        </div>
      </div>`;
    $(".m-close", modal).addEventListener("click", closeModal);
    modal.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => setMine(f.id,{status:b.dataset.status})));
    modal.querySelectorAll("[data-besttime]").forEach(b => b.addEventListener("click", () => setMine(f.id,{bestTime:(mine[f.id]||{}).bestTime===b.dataset.besttime?"":b.dataset.besttime})));
    modal.querySelectorAll("[data-feeling]").forEach(b => b.addEventListener("click", () => setMine(f.id,{feeling:(mine[f.id]||{}).feeling===b.dataset.feeling?"":b.dataset.feeling})));
    loadTakes(f.id);
    modal.querySelectorAll("[data-stars]").forEach(b => b.addEventListener("click", () => { const n=+b.dataset.stars; setMine(f.id,{stars:((mine[f.id]||{}).stars===n?0:n)}); }));
    modal.querySelectorAll("textarea[data-field]").forEach(ta => {
      let t; ta.addEventListener("input", () => {
        $("#savedMsg").textContent="Writing…"; clearTimeout(t);
        t=setTimeout(()=>setMine(f.id,{[ta.dataset.field]:ta.value}, true).then(ok=>{ const s=$("#savedMsg"); if(s) s.textContent= ok?"Saved to your private notes.":"Couldn't save. Check you're signed in."; }), 900);
      });
    });
    $("#rmPending", modal)?.addEventListener("click", async () => { try{ await store.removeAddedFilm(gid, f.id); await loadAdded(); closeModal(); }catch(e){ note("Couldn't remove that film."); } });
  }

  async function loadTakes(id){
    const box = $("#takes", modal); if (!box) return;
    try {
      const all = await store.loadTakes(gid, id); if (openId !== id) return;
      const st = stats[id], others = all.filter(t => t.username !== me.name);
      const head = st && st.seen ? `<p style="margin:0 0 8px">${st.seen} ${st.seen===1?"friend has":"friends have"} seen it${st.avg?`, average ★${esc(st.avg)}`:""}.</p>` : "";
      const feel = {}; others.forEach(t => { if (t.feeling) feel[t.feeling] = (feel[t.feeling]||0)+1; });
      const top = Object.entries(feel).sort((a,b)=>b[1]-a[1])[0];
      box.innerHTML = head + (others.length ? `<div class="takes">${top && others.length>1 ? `<div class="why">Most common feeling afterwards: ${esc(top[0])}</div>`:""}${others.map(t => `<div class="take"><b>@${esc(t.username)}</b>${t.stars?` <span class="st">${"✦".repeat(t.stars)}</span>`:""}${t.remarks?`<div>${esc(t.remarks)}</div>`:""}<div class="why">${[t.best_time && "Best for: "+t.best_time, t.feeling && "Left them: "+t.feeling].filter(Boolean).map(esc).join(" · ")}</div></div>`).join("")}</div>` : "No friend has said anything about this one yet.");
    } catch(e){ box.textContent = "Couldn't load friends' notes right now."; }
  }

  /* ---------- Add a film ---------- */
  $("#addBtn").addEventListener("click", openAdd);
  function openAdd(){
    lastFocus = document.activeElement; openId = null;
    modal.innerHTML = `<div class="m-art" style="aspect-ratio:16/5"><div class="paint" style="position:absolute;inset:0;background:radial-gradient(90% 90% at 20% 20%,#6b2a3c,transparent 60%),linear-gradient(135deg,#3b1d2b,#140c12)"></div>
      <button class="round m-close" type="button" aria-label="Close">✕</button><h2 id="mTitle">Add a film to the list</h2></div>
      <form class="m-body" id="addForm" style="grid-template-columns:1fr">
        <div>
          <label class="f" for="aTitle">Title<input type="text" id="aTitle" required autocomplete="off" placeholder="e.g. Barry Lyndon"></label>
          <label class="f" for="aYear">Year, if you know it<input type="number" id="aYear" min="1890" max="2035" placeholder="1975"></label>
          <label class="f" for="aLang">Language<input type="text" id="aLang" autocomplete="off" placeholder="English" value="${esc(F.lang||"")}"></label>
          <label class="f" for="aNote">Why it's on your list (friends can see this)<textarea id="aNote" placeholder="Who recommended it, what you've heard…"></textarea></label>
          <p class="fine">It lands in “Awaiting details” for everyone in this group, with your username on it. Just the title (spelled properly), year and language is plenty. The rest gets filled in later.</p>
          <div class="actions"><button class="btn primary" type="submit">Add to the salon</button><span class="saved" id="addMsg"></span></div>
        </div></form>`;
    scrim.classList.add("open"); document.body.style.overflow="hidden";
    $(".m-close", modal).addEventListener("click", closeModal);
    $("#aTitle").focus();
    $("#addForm").addEventListener("submit", async e => {
      e.preventDefault();
      const title = $("#aTitle").value.trim(); if (!title) return;
      const year = parseInt($("#aYear").value,10) || null, note = $("#aNote").value.trim(), language = $("#aLang").value.trim() || "English";
      if (!uid){ $("#addMsg").textContent = "The list isn't connected here, so this can't be saved."; return; }
      const id = (title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "film") + (year?"-"+year:"");
      if (films.find(f=>f.id===id)){ $("#addMsg").textContent = "That film is already on your list."; return; }
      $("#addMsg").textContent = "Adding…";
      try{
        await store.addFilm(gid, id, {title, year, language, pending:true, order:Date.now()});
        if (note && uid) await setMine(id,{remarks:note, status:"want"});
        await loadAdded();
        closeModal();
      }catch(err){ $("#addMsg").textContent = err && err.code==="invalid_argument" ? "Only the list's owner can add films." : "Couldn't add it. Try again in a moment."; }
    });
  }

  /* ---------- Private per-viewer notes ---------- */
  const writing = {};
  function setMine(id, patch, quiet){
    mine[id] = Object.assign({}, mine[id], patch, {updated:Date.now()});
    if (!quiet){ renderAll(); if (openId===id) renderModal(films.find(f=>f.id===id)); if (heroFilm && heroFilm.id===id && patch.status) renderHero(); }
    if (!uid) return Promise.resolve(false);
    const p = (writing[id] || Promise.resolve()).then(() => store.saveNote(id, mine[id])).then(()=>true, ()=>false);
    writing[id] = p; return p;
  }
  function note(msg){ $("#notice").innerHTML = msg ? `<div class="status-note">${esc(msg)}</div>` : ""; }
  /* ---------- Data (Supabase, through store.js) ---------- */
  renderAll(); renderHero();
  const loginEl = $("#login"), nameEl = $("#nameScrim");
  function refresh(){
    mergeFilms(); renderAll(); renderHero(); paintAll();
    if (openId){ const f = films.find(x=>x.id===openId); if (f && !(document.activeElement && document.activeElement.matches("textarea"))) renderModal(f); }
  }
  async function loadAdded(){ if (!gid) return; addedFilms = await store.loadAddedFilms(gid); try { names = await store.loadUsernames(); } catch(e){} refresh(); }
  function applyRemoteNote(ev){
    const id = (ev.new && ev.new.film_id) || (ev.old && ev.old.film_id); if (!id) return;
    if (ev.eventType === "DELETE") delete mine[id];
    else { const n = store.noteFromRow(ev.new); if ((n.updated||0) <= ((mine[id]||{}).updated||0)) return; mine[id] = n; }
    renderAll();
    if (openId===id && !(document.activeElement && document.activeElement.matches("textarea"))) renderModal(films.find(f=>f.id===id));
  }

  /* Username: unique, any fun name. Friends only ever see this, never an email. */
  function askUsername(){
    return new Promise(resolve => {
      nameEl.classList.add("open"); document.body.style.overflow = "hidden";
      const input = $("#uName"), msg = $("#nameMsg"); input.focus();
      let t; input.addEventListener("input", () => {
        clearTimeout(t); const v = input.value.trim();
        if (!v){ msg.textContent = ""; return; }
        if (!/^[A-Za-z0-9_]{3,20}$/.test(v)){ msg.textContent = "3 to 20 letters, numbers or underscores."; return; }
        t = setTimeout(async () => { try { msg.textContent = (await store.usernameTaken(v)) ? "That name is taken. Try another." : "Available."; } catch(e){ msg.textContent = ""; } }, 350);
      });
      $("#nameForm").addEventListener("submit", async e => {
        e.preventDefault(); const v = input.value.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(v)){ msg.textContent = "3 to 20 letters, numbers or underscores."; return; }
        msg.textContent = "Saving…";
        try { await store.createProfile(v); me.name = v; nameEl.classList.remove("open"); document.body.style.overflow = ""; resolve(); }
        catch(err){ msg.textContent = err.taken ? "That name is taken. Try another." : "Couldn't save that. Try again."; }
      });
    });
  }

  let started = false;
  async function start(user){
    if (started) return; started = true;
    uid = user.id; loginEl.classList.remove("open"); document.body.style.overflow = "";
    let needName = false;
    try { me.name = await store.getProfile(); needName = !me.name; } catch(e){}   // offline: carry on
    if (needName) await askUsername();
    $("#whoami").textContent = me.name ? "Signed in as @" + me.name : "";
    try { mine = await store.loadNotes(); } catch(e){}
    try { groups = await store.loadGroups(); } catch(e){ note("Your groups couldn't be reached. Reload the page in a little while."); }
    $("#groupBtn").hidden = false;
    store.subscribeNotes(applyRemoteNote);
    store.subscribeAddedFilms(() => { if (groupsBusy) return; reloadGroups().catch(()=>{}); });
    let want = null; try { want = localStorage.getItem("salonGroup"); } catch(e){}
    gid = (groups.find(g => g.id === want) || groups[0] || {}).id || null;
    if (!gid) { refresh(); openGroups(true); return; }
    await loadGroup();
  }

  /* ---------- Groups ---------- */
  let groupsBusy = false;
  async function loadGroup(){
    me.admin = !!(curGroup() && curGroup().role === "admin");
    $("#groupBtn").textContent = curGroup() ? curGroup().name : "Groups";
    try { localStorage.setItem("salonGroup", gid || ""); } catch(e){}
    listFilms = []; addedFilms = []; stats = {}; rawLists = []; heroFilm = null; mergeFilms();
    const timer = setTimeout(() => note("Still fetching your list… it may be out of date until the connection returns."), 10000);
    try {
      const [lists, added] = await Promise.all([store.loadLists(gid), store.loadAddedFilms(gid)]);
      rawLists = lists; addedFilms = added;
      lists.forEach(L => (L.films||[]).forEach(f => listFilms.push(Object.assign({language: L.language || "English", checked: L.checked}, f))));
      note(store.offline ? "You're offline. Showing the last list saved on this device." : "");
    } catch(e){ note("Your list couldn't be reached. Reload the page in a little while."); }
    clearTimeout(timer);
    refresh();
    store.loadUsernames().then(n => { names = n; refresh(); }).catch(()=>{});
    store.loadStats(gid).then(st => { stats = st; renderRows(); observeCards(); }).catch(()=>{});
  }
  /* Membership or films changed somewhere: refresh my groups, then the shelf. */
  async function reloadGroups(){
    groups = await store.loadGroups();
    if (!groups.find(g => g.id === gid)) gid = groups[0] ? groups[0].id : null;
    if (!gid) { listFilms = []; addedFilms = []; mergeFilms(); refresh(); $("#groupBtn").textContent = "Groups"; openGroups(true); return; }
    me.admin = curGroup().role === "admin"; $("#groupBtn").textContent = curGroup().name;
    await loadAdded();
    if (scrim.classList.contains("open") && !openId && modal.querySelector("#groupsPanel")) openGroups();
  }
  async function switchGroup(id){
    if (id === gid) return; gid = id; closeModal(); window.scrollTo({top:0});
    await loadGroup();
  }
  $("#groupBtn").addEventListener("click", () => openGroups());

  async function openGroups(gate, flash){
    lastFocus = document.activeElement; openId = null;
    const g = curGroup();
    let members = [];
    if (g) { try { members = await store.loadMembers(g.id); names = Object.assign({}, names, await store.loadUsernames()); } catch(e){} }
    const switcher = groups.length ? `<h3>Your groups</h3><div class="statusset wrap">${groups.map(x => `<button class="chip" type="button" data-gswitch="${esc(x.id)}" aria-pressed="${x.id===gid}">${esc(x.name)}</button>`).join("")}</div>` : "";
    const detail = g ? `<h3>${esc(g.name)}</h3>
        <p class="fine" style="margin:0 0 6px">Join code. Share it with friends so they can join this group.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><code id="gCode" style="font-size:20px;letter-spacing:.12em;color:var(--gilt)">${esc(g.code)}</code>
          <button class="btn ghost" type="button" id="gCopy">Copy invite</button>
          ${g.role==="admin" ? `<button class="btn ghost" type="button" id="gRegen">New code</button><button class="btn ghost" type="button" id="gRename">Rename</button>` : ""}</div>
        ${g.role==="admin" ? `<p class="fine" style="margin-top:6px">“New code” stops the old one working. People already in stay in.</p>` : ""}
        <h3>Members (${members.length})</h3>
        <div class="takes">${members.map(m => `<div class="take"><b>@${esc(names[m.userId] || "someone")}</b>${m.role==="admin" ? ' <span class="fine">admin</span>' : ""}${g.role==="admin" && m.userId!==uid ? ` <button class="btn ghost" type="button" data-gremove="${esc(m.userId)}" style="padding:2px 10px;font-size:13px;margin-left:8px">Remove</button>` : ""}</div>`).join("")}</div>
        <div class="actions" style="margin-top:12px"><button class="btn ghost" type="button" id="gLeave">Leave this group</button></div>` : "";
    modal.innerHTML = `<div class="m-art" style="aspect-ratio:16/5"><div class="paint" style="position:absolute;inset:0;background:radial-gradient(90% 90% at 20% 20%,#6b2a3c,transparent 60%),linear-gradient(135deg,#3b1d2b,#140c12)"></div>
      ${gate ? "" : '<button class="round m-close" type="button" aria-label="Close">✕</button>'}<h2 id="mTitle">${gate ? "Start or join a group" : "Groups"}</h2></div>
      <div class="m-body" id="groupsPanel" style="grid-template-columns:1fr"><div>
        ${gate ? `<p>A group is a shared shelf for you and your friends. Create one and share its code, or join one with a code a friend gave you.</p>` : ""}
        ${switcher}${detail}
        <h3>Create a new group</h3>
        <form id="gNew" style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="gNewName" maxlength="40" required placeholder="e.g. Weekend watchers" style="flex:1;min-width:180px"><button class="btn primary" type="submit">Create</button></form>
        <h3>Join with a code</h3>
        <form id="gJoin" style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="gJoinCode" required autocomplete="off" placeholder="e.g. K7Q2M-9XPLA" style="flex:1;min-width:180px"><button class="btn primary" type="submit">Join</button></form>
        <p class="saved" id="gMsg" role="status" style="margin-top:10px">${esc(flash||"")}</p>
      </div></div>`;
    scrim.classList.add("open"); document.body.style.overflow = "hidden";
    scrim.dataset.gate = gate ? "1" : "";
    const msg = t => { $("#gMsg").textContent = t; };
    $(".m-close", modal)?.addEventListener("click", closeModal);
    modal.querySelectorAll("[data-gswitch]").forEach(b => b.addEventListener("click", () => switchGroup(b.dataset.gswitch)));
    $("#gCopy")?.addEventListener("click", async () => {
      const text = `Join my group "${g.name}" on the Salon: ${location.origin}\nCreate an account, then choose Join with a code: ${g.code}`;
      try { await navigator.clipboard.writeText(text); msg("Invite copied. Paste it to your friends."); } catch(e){ msg("Copy this code: " + g.code); }
    });
    $("#gRegen")?.addEventListener("click", async () => {
      if (!confirm("Make a new code? The old one will stop working.")) return;
      try { g.code = await store.regenerateCode(g.id); openGroups(false, "New code made."); } catch(e){ msg("Couldn't change the code."); }
    });
    $("#gRename")?.addEventListener("click", async () => {
      const n = (prompt("New group name", g.name) || "").trim(); if (!n) return;
      try { await store.renameGroup(g.id, n); g.name = n; $("#groupBtn").textContent = n; openGroups(false, "Renamed."); } catch(e){ msg("Couldn't rename it."); }
    });
    modal.querySelectorAll("[data-gremove]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Remove @" + (names[b.dataset.gremove] || "this member") + " from the group?")) return;
      try { await store.removeMember(g.id, b.dataset.gremove); openGroups(false, "Removed."); } catch(e){ msg("Couldn't remove them."); }
    }));
    $("#gLeave")?.addEventListener("click", async () => {
      if (!confirm("Leave " + g.name + "? You can rejoin later with its code.")) return;
      groupsBusy = true;
      try { await store.leaveGroup(g.id); await reloadGroups(); if (gid) { closeModal(); await loadGroup(); } } catch(e){ msg("Couldn't leave."); }
      groupsBusy = false;
    });
    $("#gNew").addEventListener("submit", async e => {
      e.preventDefault(); const name = $("#gNewName").value.trim(); if (!name) return;
      msg("Creating…"); groupsBusy = true;
      try { const id = await store.createGroup(name); groups = await store.loadGroups(); gid = id; await loadGroup(); openGroups(false, "Created. Share the code below with your friends."); }
      catch(err){ msg("Couldn't create it. Try again in a moment."); }
      groupsBusy = false;
    });
    $("#gJoin").addEventListener("submit", async e => {
      e.preventDefault(); const code = $("#gJoinCode").value.trim(); if (!code) return;
      msg("Joining…"); groupsBusy = true;
      try { const id = await store.joinGroup(code); groups = await store.loadGroups(); gid = id; await loadGroup(); openGroups(false, "You're in."); }
      catch(err){ msg(err.unknown ? "That code didn't match any group. Check it with your friend." : "Couldn't join. Try again in a moment."); }
      groupsBusy = false;
    });
  }

  /* ---------- Sign in / create account ---------- */
  function showLogin(){
    loginEl.classList.add("open"); document.body.style.overflow = "hidden";
    const msg = $("#loginMsg"), codeForm = $("#codeForm");
    const email = () => $("#loginEmail").value.trim();
    document.querySelectorAll("[data-lmode]").forEach(b => b.addEventListener("click", () => {
      const up = b.dataset.lmode === "up";
      document.querySelectorAll("[data-lmode]").forEach(x => x.setAttribute("aria-pressed", x === b));
      $("#modeIn").hidden = up; $("#upForm").hidden = !up; msg.textContent = "";
    }));
    $("#passForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (!email() || !$("#loginPass").value){ msg.textContent = "Enter your email and password."; return; }
      msg.textContent = "Checking…";
      try { start(await store.signInPassword(email(), $("#loginPass").value)); }
      catch(err){ msg.textContent = "Email or password didn't match."; }
    });
    $("#loginForm").addEventListener("submit", async e => {
      e.preventDefault(); if (!email()){ msg.textContent = "Enter your email first."; return; }
      msg.textContent = "Sending…";
      try { await store.sendLink(email()); msg.textContent = "A link is on its way. Open it on this device, or enter the 6-digit code if the email has one."; codeForm.hidden = false; $("#loginCode").focus(); }
      catch(err){ msg.textContent = "Couldn't send that. If you're new, use Create account."; }
    });
    codeForm.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "Checking…";
      try { start(await store.verifyCode(email(), $("#loginCode").value.trim())); }
      catch(err){ msg.textContent = "That code didn't work. Ask for a new one."; }
    });
    $("#upForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (!email() || $("#upPass").value.length < 6){ msg.textContent = "Enter your email and a password of 6 or more characters."; return; }
      msg.textContent = "Creating your account…";
      try {
        const user = await store.signUp(email(), $("#upPass").value);
        if (user) start(user); else msg.textContent = "Almost there. Check your email and click the confirmation link, then sign in here.";
      } catch(err){
        const m = String(err && err.message || "");
        msg.textContent = /registered|already/i.test(m) ? "That email already has an account. Use Sign in."
          : /password/i.test(m) ? "Use a password of 6 or more characters."
          : "Couldn't create the account right now. Try again in a moment.";
      }
    });
  }

  /* ---------- Unseen-only mode ---------- */
  const unseenBtn = $("#unseenBtn");
  unseenBtn.setAttribute("aria-pressed", unseenOnly);
  unseenBtn.addEventListener("click", () => {
    unseenOnly = !unseenOnly; unseenBtn.setAttribute("aria-pressed", unseenOnly);
    try { localStorage.setItem("salonUnseen", unseenOnly ? "1" : "0"); } catch(e){}
    renderAll(); renderHero();
  });

  (async () => {
    if (import.meta.env.DEV && /[?&]mock/.test(location.search)) store = (await import("./store.mock.js")).store;
    if (!store.configured){ note("Supabase isn't configured. Copy .env.example to .env and fill in the two keys."); return; }
    let user = null;
    try { user = await store.init(); } catch(e){}
    store.onAuthChange((event, u) => { if (event === "SIGNED_IN" && u) start(u); if (event === "SIGNED_OUT") location.reload(); });
    if (user) start(user); else showLogin();
  })();

  /* ---------- Export ---------- */
  document.getElementById("signOut").addEventListener("click", () => store.signOut());
  document.getElementById("exportBtn").addEventListener("click", () => {
    const data = JSON.stringify({exportedAt: new Date().toISOString(), lists: rawLists, addedFilms, myNotes: mine}, null, 1);
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type:"application/json"})); a.download = "salon-data.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000); } catch(e){}
    const box = document.getElementById("exportBox"); box.hidden = false;
    const ta = box.querySelector("textarea"); ta.value = data; ta.select();
    document.getElementById("exportMsg").textContent = `${rawLists.reduce((n,L)=>n+(L.films||[]).length,0)} films, ${Object.keys(mine).length} of your notes. If no file downloaded, use Copy and paste it into a file named salon-data.json.`;
  });
  document.getElementById("exportCopy").addEventListener("click", async () => {
    const ta = document.querySelector("#exportBox textarea"); ta.select();
    try { await navigator.clipboard.writeText(ta.value); } catch(e){ try { document.execCommand("copy"); } catch(_){} }
    document.getElementById("exportCopy").textContent = "Copied";
  });
})();

/* Installable app: cache the shell (production builds only). */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
