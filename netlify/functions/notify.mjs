/* Sends a small, friendly push when someone adds a film to a group:
   "@sam added Jaws (1975) to Weekend Watchers".
   Called by the app right after a film is added. It checks that the caller really added that film,
   only ever notifies other members of the same group, and only notifies once per film. */
import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const env = process.env;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = env.VITE_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY, priv = env.VAPID_PRIVATE_KEY;
  if (!url || !key || !pub || !priv) return json({ error: "not configured" }, 503);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  let body; try { body = await req.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const { groupId, filmId } = body || {};
  if (!token || !groupId || !filmId) return json({ error: "bad request" }, 400);

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u || !u.user) return json({ error: "not signed in" }, 401);
  const me = u.user.id;

  // The caller must be the person who added this film to this group, and it must not be announced yet.
  const { data: film } = await sb.from("added_films").select("id,data,user_id").eq("group_id", groupId).eq("id", filmId).maybeSingle();
  if (!film || film.user_id !== me) return json({ error: "not your film" }, 403);
  if (film.data && film.data.notified) return json({ sent: 0, note: "already announced" });
  await sb.from("added_films").update({ data: { ...film.data, notified: true } }).eq("group_id", groupId).eq("id", filmId);

  const [{ data: group }, { data: prof }, { data: note }, { data: members }] = await Promise.all([
    sb.from("groups").select("name").eq("id", groupId).maybeSingle(),
    sb.from("profiles").select("username").eq("user_id", me).maybeSingle(),
    sb.from("notes").select("remarks").eq("user_id", me).eq("film_id", filmId).maybeSingle(),
    sb.from("group_members").select("user_id").eq("group_id", groupId),
  ]);
  const others = (members || []).map(m => m.user_id).filter(id => id !== me);
  if (!others.length) return json({ sent: 0 });
  const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", others);
  if (!subs || !subs.length) return json({ sent: 0 });

  const title = clip(group && group.name, 40) || "The Salon";
  const who = prof && prof.username ? "@" + prof.username : "A friend";
  const film_ = clip(film.data && film.data.title, 60) + (film.data && film.data.year ? ` (${film.data.year})` : "");
  const why = clip(note && note.remarks, 90);
  const payload = JSON.stringify({ title, body: `${who} added ${film_} to the list${why ? `: “${why}”` : ""}`, url: "/", tag: "film-" + filmId });

  webpush.setVapidDetails(env.URL || "https://example.com", pub, priv);
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("push_subscriptions").delete().eq("id", s.id); }
  }));
  return json({ sent });
};
