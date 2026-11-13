import { createClient } from "@supabase/supabase-js";

/* The only file that knows about Supabase. main.js talks to `store`.
   Tables: lists (films as jsonb), added_films, notes. Row-level security
   (see supabase/schema.sql) means only the signed-in owner can read or write. */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const sb = SB_URL && KEY
  ? createClient(SB_URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

let userId = null;
let channels = [];

/* Last good copy of each table, so the installed app still opens offline. */
const cacheKey = name => `salon:${userId}:${name}`;
const cacheSet = (name, v) => { try { localStorage.setItem(cacheKey(name), JSON.stringify(v)); } catch (e) {} };
const cacheGet = name => { try { return JSON.parse(localStorage.getItem(cacheKey(name))); } catch (e) { return null; } };

async function cached(name, fetcher) {
  try {
    const v = await fetcher();
    cacheSet(name, v);
    store.offline = false;
    return v;
  } catch (e) {
    const v = cacheGet(name);
    if (v == null) throw e;
    store.offline = true;
    return v;
  }
}

const noteFromRow = r => ({
  status: r.status || "want",
  insight: r.insight || "",
  remarks: r.remarks || "",
  stars: r.stars || 0,
  updated: Number(r.updated) || 0,
});

export const store = {
  configured: !!sb,
  offline: false,
  noteFromRow,

  /* ----- auth ----- */
  async init() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    userId = data.session ? data.session.user.id : null;
    return data.session ? data.session.user : null;
  },
  onAuthChange(cb) {
    sb.auth.onAuthStateChange((event, session) => {
      if (session) userId = session.user.id;
      // Defer: supabase-js warns against awaiting other supabase calls inside this callback.
      setTimeout(() => cb(event, session ? session.user : null), 0);
    });
  },
  /* shouldCreateUser:false => only the account you created in the dashboard can ever sign in. */
  async sendLink(email) {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/" },
    });
    if (error) throw error;
  },
  async signInPassword(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    userId = data.user.id;
    return data.user;
  },
  async verifyCode(email, token) {
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    userId = data.user.id;
    return data.user;
  },
  async signOut() {
    channels.forEach(c => sb.removeChannel(c)); channels = [];
    await sb.auth.signOut();
  },

  /* ----- reads ----- */
  loadLists() {
    return cached("lists", async () => {
      const { data, error } = await sb.from("lists").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map(r => ({ id: r.id, name: r.name, language: r.language, order: r.sort_order, checked: r.checked, films: r.films || [] }));
    });
  },
  loadAddedFilms() {
    return cached("added", async () => {
      const { data, error } = await sb.from("added_films").select("*");
      if (error) throw error;
      return data.map(r => Object.assign({}, r.data, { id: r.id }));
    });
  },
  loadNotes() {
    return cached("notes", async () => {
      const { data, error } = await sb.from("notes").select("*");
      if (error) throw error;
      const out = {};
      data.forEach(r => { out[r.film_id] = noteFromRow(r); });
      return out;
    });
  },

  /* ----- writes ----- */
  async saveNote(filmId, n) {
    const { error } = await sb.from("notes").upsert({
      user_id: userId, film_id: filmId,
      status: n.status || "want", insight: n.insight || "", remarks: n.remarks || "",
      stars: n.stars || 0, updated: n.updated || Date.now(),
    }, { onConflict: "user_id,film_id" });
    if (error) throw error;
  },
  async addFilm(id, film) {
    const { error } = await sb.from("added_films").upsert({ id, user_id: userId, data: film });
    if (error) throw error;
  },
  async removeAddedFilm(id) {
    const { error } = await sb.from("added_films").delete().eq("id", id);
    if (error) throw error;
  },

  /* ----- realtime: phone and laptop stay in step ----- */
  subscribeNotes(cb) {
    channels.push(sb.channel("notes-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, p => cb({ eventType: p.eventType, new: p.new, old: p.old }))
      .subscribe());
  },
  subscribeAddedFilms(cb) {
    channels.push(sb.channel("added-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "added_films" }, () => cb())
      .subscribe());
  },
};
