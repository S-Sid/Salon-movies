/* Two black cats who wander along the bottom of the Salon.
   - "Tom" (green eyes, red collar, fedora) and "Lady" (amber eyes, lashes, pearls, cigarette holder).
   - Picking a mood sends the matching cat to perform it; the other keeps wandering.
   - Pure SVG + CSS, no images. Respects reduced motion. Can be switched off. */

const REDUCE = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* mood -> who performs it, and what they do */
const MOOD_POSE = {
  "Dark":         { who: "tom",  pose: "smoke" },
  "Intense":      { who: "tom",  pose: "smoke" },
  "Tense":        { who: "tom",  pose: "smoke" },
  "Sharp":        { who: "tom",  pose: "strut" },
  "Epic":         { who: "tom",  pose: "strut" },
  "Mind-bending": { who: "tom",  pose: "strut" },
  "Romantic":     { who: "lady", pose: "glass" },
  "Heartfelt":    { who: "lady", pose: "glass" },
  "Opulent":      { who: "lady", pose: "smoke" },
  "Stylish":      { who: "lady", pose: "smoke" },
  "Reflective":   { who: "lady", pose: "loaf" },
  "Melancholic":  { who: "lady", pose: "loaf" },
  "Witty":        { who: "tom",  pose: "play" },
  "Light":        { who: "lady", pose: "play" },
  "Uplifting":    { who: "lady", pose: "play" },
};
const IDLE_POSES = ["stand", "loaf", "play", "stand", "glass", "phone", "phone"];   // "phone" is only for the lady

function svg(kind) {
  const lady = kind === "lady";
  const eye = lady ? "#e8a43a" : "#b7c46a";
  return `<svg viewBox="0 0 230 140" aria-hidden="true" focusable="false">
  <rect class="hit" x="30" y="18" width="185" height="118" fill="transparent"/>
  <g class="rig">
    <g class="tail"><path d="M52 82 C16 80 8 44 32 26" fill="none" stroke="#120e10" stroke-width="9" stroke-linecap="round"/></g>
    <g class="leg far b"><rect x="60" y="94" width="10" height="36" rx="5" fill="#2b2328"/></g>
    <g class="leg far f"><rect x="128" y="94" width="10" height="36" rx="5" fill="#2b2328"/></g>
    <g class="torso"><ellipse cx="100" cy="84" rx="54" ry="26" fill="#120e10"/><path d="M60 66 C90 58 120 58 146 66" fill="none" stroke="#2f262b" stroke-width="2" stroke-linecap="round"/></g>
    <g class="leg near b"><rect x="76" y="94" width="11" height="36" rx="5.5" fill="#120e10"/></g>
    <g class="leg near f"><rect x="141" y="94" width="11" height="36" rx="5.5" fill="#120e10"/></g>
    <g class="head">
      <path d="M145 52 L149 26 L164 44 Z M164 44 L176 26 L182 52 Z" fill="#120e10"/>
      <path d="M150 38 L152 31 L158 40 Z M170 38 L176 31 L178 40 Z" fill="${lady ? "#7a2a35" : "#3a2a30"}"/>
      <circle cx="162" cy="62" r="21" fill="#120e10"/>
      <g class="eyes">
        <path d="M153 60 Q159 53 167 60 Q159 66 153 60 Z" fill="${eye}"/><ellipse cx="160" cy="60" rx="1.6" ry="4.6" fill="#120e10"/>
        <path d="M170 61 Q176 54 183 61 Q176 67 170 61 Z" fill="${eye}"/><ellipse cx="177" cy="61" rx="1.6" ry="4.6" fill="#120e10"/>
        ${lady ? `<path d="M152 57 l-5 -3 M153 55 l-3 -5 M184 58 l5 -3 M182 56 l3 -5" stroke="#120e10" stroke-width="1.6" stroke-linecap="round"/>` : ""}
      </g>
      <path d="M177 68 l4 2 l-4 2 Z" fill="${lady ? "#c98a8a" : "#8a6a6a"}"/>
      <path d="M180 70 l22 -3 M180 72 l22 3 M179 71 l20 0" stroke="#d9cdb4" stroke-width=".9" opacity=".7"/>
      <g class="acc shades"><rect x="150" y="54" width="18" height="11" rx="4" fill="#0a0809" stroke="#c9a55e" stroke-width="1.2"/><rect x="170" y="55" width="18" height="11" rx="4" fill="#0a0809" stroke="#c9a55e" stroke-width="1.2"/><path d="M168 59 h2" stroke="#c9a55e" stroke-width="1.4"/></g>
      ${lady ? "" : `<g class="acc hat"><ellipse cx="164" cy="43" rx="28" ry="5.5" fill="#2a1d22" stroke="#c9a55e" stroke-width="1"/><path d="M148 43 C148 22 180 22 180 43 Z" fill="#2a1d22"/><path d="M149 40 h30" stroke="#9b2335" stroke-width="4"/></g>`}
    </g>
    ${lady
      ? `<g class="neck"><path d="M142 84 Q150 94 162 90" fill="none" stroke="#e9e2d2" stroke-width="0"/>${[0,1,2,3,4,5,6].map(i => `<circle cx="${143 + i * 4.2}" cy="${82 + Math.sin(i / 6 * Math.PI) * 9}" r="2.6" fill="#f1ead8" stroke="#bdb39a" stroke-width=".5"/>`).join("")}</g>`
      : `<g class="neck"><path d="M142 82 Q152 92 166 86" fill="none" stroke="#9b2335" stroke-width="4" stroke-linecap="round"/><circle cx="154" cy="90" r="2.6" fill="#c9a55e"/></g>`}
    <g class="acc spikes"><path d="M62 64 l6 -17 l6 15 l7 -19 l6 18 l8 -19 l6 18 l8 -18 l6 17 l8 -16 l5 15 Z" fill="#120e10"/></g>
    <g class="acc tailspikes" fill="#120e10"><path d="M26 56 l-11 -2 l10 -8 Z M18 42 l-12 -4 l11 -8 Z M28 30 l-8 -11 l12 4 Z M12 66 l-11 1 l9 -8 Z M40 24 l-4 -11 l10 5 Z"/></g>
    <g class="acc mouth"><ellipse cx="183" cy="76" rx="7" ry="6" fill="#6e130e"/><path d="M178 72 l2 4 l2 -4 M185 72 l2 4 l2 -4" stroke="#f2e4c4" stroke-width="1.4" fill="none" stroke-linejoin="round"/></g>
    <g class="acc shock"><path d="M146 30 l-8 -8 M156 22 l-2 -11 M170 20 l3 -11 M182 28 l10 -7" stroke="#f2e4c4" stroke-width="2.2" stroke-linecap="round"/></g>
${lady ? `<g class="acc phone"><g class="pbob"><g transform="translate(194 72) rotate(-12)">
      <rect x="-11.5" y="0" width="23" height="43" rx="5.5" fill="#f2702a" stroke="#b9500f" stroke-width="1.2"/>
      <path d="M-9 2 h18 a3 3 0 0 1 3 3 v1 h-24 v-1 a3 3 0 0 1 3 -3 z" fill="#ff9a55" opacity=".55"/>
      <rect x="-9.5" y="3" width="19" height="11" rx="3.4" fill="#d95f12" stroke="#ffb27a" stroke-width=".6"/>
      <circle cx="-4.8" cy="8.5" r="2.7" fill="#161618" stroke="#7a7a80" stroke-width=".7"/><circle cx="1.2" cy="8.5" r="2.7" fill="#161618" stroke="#7a7a80" stroke-width=".7"/><circle cx="7" cy="6" r="1.3" fill="#fff0c0"/><circle cx="7" cy="10.6" r="1.1" fill="#161618"/>
      <ellipse cx="-8" cy="39" rx="5" ry="4.2" fill="#120e10"/><ellipse cx="8" cy="39" rx="5" ry="4.2" fill="#120e10"/>
    </g></g></g>` : ""}
    <g class="acc cig">
      <path d="${lady ? "M181 71 L212 58" : "M181 71 L200 63"}" stroke="#efe6d0" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="${lady ? 212 : 200}" cy="${lady ? 58 : 63}" r="2" fill="#ff7a2a"/>
      <g class="smoke" transform="translate(${lady ? 212 : 200} ${lady ? 56 : 61})"><circle class="p1" r="3" fill="#d9d3c8"/><circle class="p2" r="3.5" fill="#d9d3c8"/><circle class="p3" r="4" fill="#d9d3c8"/></g>
    </g>
  </g>
  <g class="acc glass"><path d="M196 104 h20 q-1 10 -10 10 q-9 0 -10 -10 Z" fill="#e8c46a" fill-opacity=".85" stroke="#efe6d0" stroke-width="1.3"/><path d="M206 114 v14 M198 129 h16" stroke="#efe6d0" stroke-width="1.6" stroke-linecap="round"/></g>
  <g class="acc ball"><circle cx="206" cy="124" r="7" fill="#9b2335"/><path d="M200 121 q6 3 12 0" stroke="#efe6d0" stroke-width="1.2" fill="none"/></g>
  <g class="acc zzz"><text x="150" y="24" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#c9a55e">z</text><text x="162" y="14" font-family="Georgia,serif" font-style="italic" font-size="11" fill="#c9a55e">z</text></g>
</svg>`;
}

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function bubble(el, text) {
  el.querySelectorAll(".bubble").forEach(b => b.remove());
  const b = document.createElement("span"); b.className = "bubble"; b.textContent = text;
  el.appendChild(b); setTimeout(() => b.remove(), 1500);
}
/* A tiny synthesised meow (no audio files). Quiet, and only ever after a tap. */
let actx = null;
function sound(kind) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime, scare = kind === "scare", dur = scare ? 0.38 : 0.62;
    const osc = actx.createOscillator(), vib = actx.createOscillator(), vg = actx.createGain();
    const filt = actx.createBiquadFilter(), g = actx.createGain();
    osc.type = "sawtooth";
    const f0 = scare ? 780 : 480, f1 = scare ? 1500 : 880;
    osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); osc.frequency.exponentialRampToValueAtTime(scare ? 900 : 560, t + dur);
    vib.frequency.value = scare ? 38 : 7; vg.gain.value = scare ? 40 : 14; vib.connect(vg); vg.connect(osc.frequency);
    filt.type = "bandpass"; filt.Q.value = 3.5; filt.frequency.setValueAtTime(900, t); filt.frequency.exponentialRampToValueAtTime(scare ? 2600 : 1900, t + dur * 0.45); filt.frequency.exponentialRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(scare ? 0.16 : 0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt); filt.connect(g); g.connect(actx.destination);
    osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  } catch (e) {}
}

function makeCat(kind, startX) {
  const el = document.createElement("div");
  el.className = "salon-cat";
  el.dataset.cat = kind;
  el.innerHTML = `<div class="flip">${svg(kind)}</div>`;
  document.body.appendChild(el);
  /* One tap: meow. Double tap: startled jump (fur up, tail puffed, wide eyes). Only the cat is tappable. */
  let lastTap = 0, tapTimer = null, scareTimer = null;
  el.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 380) {                       // second tap
      lastTap = 0; clearTimeout(tapTimer);
      bubble(el, pick(["EEK!", "HISS!", "YIKES!"])); sound("scare");
      if (!REDUCE) { el.classList.remove("scared"); void el.offsetWidth; el.classList.add("scared"); clearTimeout(scareTimer); scareTimer = setTimeout(() => el.classList.remove("scared"), 1500); }
      return;
    }
    lastTap = now; clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { lastTap = 0; bubble(el, pick(["Meow!", "Mrrow?", "Miaow~", "Prrp!"])); sound("meow"); }, 260);
  });
  const cat = { kind, el, x: startX, pose: "stand", timer: null, locked: null, allowSmoke: true, ledge: { floor: true } };
  place(cat, startX, 0);
  setTop(cat, "0s");
  setPose(cat, "stand");
  return cat;
}

const width = () => Math.min(150, Math.max(104, innerWidth * 0.14));
const place = (c, x, secs) => { c.el.style.setProperty("--secs", secs + "s"); c.el.style.transform = `translateX(${Math.round(x)}px)`; c.x = x; };

/* ---- Ledges: the floor (bottom of the screen) or the top edge of a film row on screen ---- */
const catH = () => width() * 140 / 230;
function visibleLedges() {
  const out = [{ floor: true }];
  document.querySelectorAll(".row .track").forEach(t => {
    const art = t.querySelector(".card .art"); if (!art) return;
    const r = art.getBoundingClientRect();
    if (r.top > 100 && r.top < innerHeight - 40) out.push({ track: t });
  });
  return out;
}
function ledgeY(c) {                       // page-coordinate top, so the cat's feet rest on the ledge
  const L = c.ledge;
  if (L && L.track && L.track.isConnected) { const art = L.track.querySelector(".card .art"); if (art) return art.getBoundingClientRect().top + scrollY - catH() + 5; }
  c.ledge = { floor: true };
  return scrollY + innerHeight - catH() - 2;
}
function setTop(c, dur) { c.el.style.setProperty("--tdur", dur); c.el.style.top = Math.round(ledgeY(c)) + "px"; }
function pickLedge(c) { const all = visibleLedges().filter(L => !(L.track && c.ledge && L.track === c.ledge.track) && !(L.floor && c.ledge && c.ledge.floor)); return all.length ? pick(all) : null; }
/* hop up or down to another ledge, then carry on */
function moveLedge(c, L, done) {
  clearTimeout(c.timer); c.ledge = L; c.el.dataset.pose = "stand";
  c.el.classList.add("leap"); setTop(c, ".65s");
  c.timer = setTimeout(() => { c.el.classList.remove("leap"); done(); }, 700);
}
function setPose(c, pose) {
  if (pose === "phone" && c.kind !== "lady") pose = "stand";
  if (pose === "smoke" && !c.allowSmoke) pose = "strut";   // smoke-free fallback: shades and a swagger
  c.pose = pose; c.el.dataset.pose = pose;
}
function face(c, toX) { c.el.classList.toggle("left", toX < c.x - 1); }

function walkTo(c, x, done) {
  const dist = Math.abs(x - c.x), secs = Math.max(0.4, dist / (c.pose === "strut" ? 80 : 60));
  face(c, x); c.el.dataset.pose = "walk"; place(c, x, secs);
  clearTimeout(c.timer);
  c.timer = setTimeout(done, secs * 1000 + 40);
}
const rand = (a, b) => a + Math.random() * (b - a);
const pickX = () => rand(8, Math.max(40, innerWidth - width() - 8));

function wander(c) {
  clearTimeout(c.timer);
  if (REDUCE || document.hidden) return;
  if (c.locked) return perform(c);
  const next = Math.random() < 0.55 ? pickLedge(c) : null;
  const go = () => walkTo(c, pickX(), () => {
    setPose(c, IDLE_POSES[Math.floor(Math.random() * IDLE_POSES.length)]);
    c.timer = setTimeout(() => wander(c), rand(4000, 9000));
  });
  next ? moveLedge(c, next, go) : go();
}
/* hold the mood pose until the mood changes (strut keeps pacing) */
function perform(c) {
  clearTimeout(c.timer);
  if (REDUCE) { setPose(c, c.locked); return; }
  const pose = c.locked;
  const next = pickLedge(c);
  const go = () => walkTo(c, pickX(), () => {
    setPose(c, pose);
    if (pose === "strut" || c.pose === "strut") c.timer = setTimeout(() => perform(c), rand(3500, 6000));
  });
  next && !c.performing ? moveLedge(c, next, go) : go();
  c.performing = pose === "strut";      // a strutting cat keeps pacing on its ledge instead of hopping rows
}

export function initCat() {
  let enabled = true; try { enabled = localStorage.getItem("salonCat") !== "0"; } catch (e) {}
  let cats = [];
  const make = () => { cats = [makeCat("tom", rand(10, 200)), makeCat("lady", rand(260, 500))]; cats.forEach(wander); };
  const clear = () => { cats.forEach(c => { clearTimeout(c.timer); c.el.remove(); }); cats = []; };
  if (enabled) make();
  /* keep the cats attached: follow the screen floor while scrolling; re-anchor to rows; rescue strays */
  addEventListener("scroll", () => { cats.forEach(c => { if (c.ledge.floor) setTop(c, "0s"); }); }, { passive: true });
  setInterval(() => {
    if (document.hidden) return;
    cats.forEach(c => {
      const r = c.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) { const all = visibleLedges(); c.ledge = pick(all); setTop(c, "0s"); return; }
      if (!c.el.classList.contains("leap")) setTop(c, ".4s");
    });
  }, 700);
  addEventListener("resize", () => cats.forEach(c => setTop(c, "0s")));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) cats.forEach(wander); else cats.forEach(c => clearTimeout(c.timer)); });
  return {
    get enabled() { return enabled; },
    setEnabled(on) { enabled = on; try { localStorage.setItem("salonCat", on ? "1" : "0"); } catch (e) {} clear(); if (on) make(); },
    /* mood: a mood name or null. allowSmoke false when "Family-friendly" is picked. */
    setMood(mood, allowSmoke = true) {
      cats.forEach(c => { c.allowSmoke = allowSmoke; c.locked = null; c.performing = false; });
      const m = MOOD_POSE[mood];
      if (m) { const c = cats.find(x => x.kind === m.who); if (c) { c.locked = m.pose; perform(c); } }
      cats.forEach(c => { if (!c.locked && c.pose !== "walk") wander(c); });
    },
  };
}
