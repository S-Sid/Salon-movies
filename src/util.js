export const $ = (s, el=document) => el.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  export const fmtTime = m => !m ? "" : (Math.floor(m/60) ? Math.floor(m/60)+" h " : "") + (m%60 ? (m%60)+" min" : "");
  export const pal = f => (Array.isArray(f.palette) && f.palette.length>=2) ? f.palette : ["#3a2030","#1c1018","#c9a55e"];
  export const safeCol = c => /^#[0-9a-f]{3,8}$/i.test(c) ? c : "#3a2030";
