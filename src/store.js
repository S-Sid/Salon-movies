import { createClient } from "@supabase/supabase-js";

/* The only file that knows about Supabase. main.js talks to `store`.
   Tables: groups, group_members, lists (films as jsonb), added_films, notes. Row-level security
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
  bestTime: r.best_time || "",
  feeling: r.feeling || "",
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
  /* Create an account. Sign-up is open; groups (with their own join codes) decide who sees what. */
  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) { userId = data.user.id; return data.user; }
    return null;   // email confirmation is on: the person must click the link we emailed
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

  /* ----- usernames ----- */
  async getProfile() {
    const { data, error } = await sb.from("profiles").select("username").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data ? data.username : null;
  },
  async usernameTaken(name) {
    const { data, error } = await sb.rpc("username_available", { name });
    if (error) throw error;
    return !data;
  },
  async createProfile(username) {
    const { error } = await sb.from("profiles").insert({ user_id: userId, username });
    if (error) { const e = new Error(error.message); e.taken = error.code === "23505"; throw e; }
  },
  async loadUsernames() {
    const { data, error } = await sb.from("profiles").select("user_id,username");
    if (error) throw error;
    const out = {}; data.forEach(r => { out[r.user_id] = r.username; });
    return out;
  },

  /* ----- groups ----- */
  async loadGroups() {
    const { data, error } = await sb.from("group_members").select("role, groups(id,name,code)").eq("user_id", userId);
    if (error) throw error;
    return data.filter(r => r.groups).map(r => ({ id: r.groups.id, name: r.groups.name, code: r.groups.code, role: r.role }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async createGroup(name) {
    const { data, error } = await sb.rpc("create_group", { group_name: name });
    if (error) throw error;
    return data.id;
  },
  async joinGroup(code) {
    const { data, error } = await sb.rpc("join_group", { join_code: code });
    if (error) { const e = new Error(error.message); e.unknown = /unknown code/.test(error.message); throw e; }
    return data.id;
  },
  async regenerateCode(gid) {
    const { data, error } = await sb.rpc("regenerate_group_code", { gid });
    if (error) throw error;
    return data;
  },
  async renameGroup(gid, name) {
    const { error } = await sb.rpc("rename_group", { gid, new_name: name });
    if (error) throw error;
  },
  async loadMembers(gid) {
    const { data, error } = await sb.from("group_members").select("user_id, role").eq("group_id", gid);
    if (error) throw error;
    return data.map(r => ({ userId: r.user_id, role: r.role }));
  },
  async removeMember(gid, uid) {
    const { error } = await sb.from("group_members").delete().eq("group_id", gid).eq("user_id", uid);
    if (error) throw error;
  },
  async leaveGroup(gid) { return this.removeMember(gid, userId); },

  /* ----- reads ----- */
  loadLists(gid) {
    return cached("lists:" + gid, async () => {
      const { data, error } = await sb.from("lists").select("*").eq("group_id", gid).order("sort_order", { ascending: true });
      if (error) throw error;
      return data.map(r => ({ id: r.id, name: r.name, language: r.language, order: r.sort_order, checked: r.checked, films: r.films || [] }));
    });
  },
  loadAddedFilms(gid) {
    return cached("added:" + gid, async () => {
      const { data, error } = await sb.from("added_films").select("*").eq("group_id", gid);
      if (error) throw error;
      return data.map(r => Object.assign({}, r.data, { id: r.id, addedBy: r.user_id }));
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

  /* What friends may see: username, stars, remarks, best time, feeling. Never email or private insight. */
  async loadStats(gid) {
    const { data, error } = await sb.from("film_stats").select("*").eq("group_id", gid);
    if (error) throw error;
    const out = {}; data.forEach(r => { out[r.film_id] = { seen: r.seen_count, rated: r.rated_count, avg: r.avg_stars == null ? null : Number(r.avg_stars) }; });
    return out;
  },
  async loadTakes(gid, filmId) {
    const { data, error } = await sb.from("public_takes").select("*").eq("group_id", gid).eq("film_id", filmId).order("updated", { ascending: false });
    if (error) throw error;
    return data;
  },

  /* ----- writes ----- */
  async saveNote(filmId, n) {
    const { error } = await sb.from("notes").upsert({
      user_id: userId, film_id: filmId,
      status: n.status || "want", insight: n.insight || "", remarks: n.remarks || "",
      stars: n.stars || 0, best_time: n.bestTime || "", feeling: n.feeling || "",
      updated: n.updated || Date.now(),
    }, { onConflict: "user_id,film_id" });
    if (error) throw error;
  },
  async addFilm(gid, id, film) {
    const { error } = await sb.from("added_films").insert({ id, group_id: gid, user_id: userId, data: film });
    if (error) throw error;
  },
  async removeAddedFilm(gid, id) {
    const { error } = await sb.from("added_films").delete().eq("group_id", gid).eq("id", id);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => cb())
      .subscribe());
  },
};
