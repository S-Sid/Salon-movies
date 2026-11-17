// Fills in films that friends added with only a title, year and language.
//   npm run enrich             -> DRY RUN: shows what it would do, changes nothing
//   npm run enrich -- --apply  -> writes the details into Supabase
//   npm run enrich -- --limit 5
// Needs in .env.local (never committed):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY, and optionally OMDB_API_KEY
// Rules: a film TMDB flags as adult (porn) is removed. Anything it cannot match with
// confidence stays "Awaiting details" so a wrong film never gets attached.
import { createClient } from "@supabase/supabase-js";
import { pickMatch, buildFilm } from "./enrich-lib.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY, OMDB_API_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TMDB_API_KEY) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TMDB_API_KEY in .env.local");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const li = process.argv.indexOf("--limit");
const limit = li > -1 ? Number(process.argv[li + 1]) || 10 : 50;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// TMDB accepts either the short API key or the long "read access token"
const tmdb = async (path, params = {}) => {
  const url = new URL("https://api.themoviedb.org/3" + path);
  const headers = {};
  if (TMDB_API_KEY.length > 40) headers.Authorization = "Bearer " + TMDB_API_KEY; else url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status} on ${path}`);
  return res.json();
};
const omdb = async imdbId => {
  if (!OMDB_API_KEY || !imdbId) return null;
  const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`);
  return res.ok ? res.json() : null;
};

const { data: rows, error } = await sb.from("added_films").select("id,group_id,user_id,data");
if (error) { console.error(error.message); process.exit(1); }
const todo = rows.filter(r => r.data && r.data.pending).slice(0, limit);
console.log(`${todo.length} film(s) awaiting details. ${apply ? "APPLYING changes." : "Dry run (add --apply to save)."}\n`);

for (const row of todo) {
  const f = row.data;
  try {
    const search = await tmdb("/search/movie", { query: f.title, year: f.year || undefined, include_adult: "true" });
    const hit = pickMatch(search.results, f.title, f.year);
    if (!hit) { console.log(`?  "${f.title}" (${f.year || "no year"}): no confident match, left as pending`); continue; }

    const full = await tmdb(`/movie/${hit.id}`, { append_to_response: "credits,release_dates,watch/providers,external_ids" });
    if (full.adult || hit.adult) {
      console.log(`X  "${f.title}": flagged adult by TMDB, ${apply ? "removed" : "would be removed"}`);
      if (apply) await sb.from("added_films").delete().eq("group_id", row.group_id).eq("id", row.id);
      continue;
    }
    const film = buildFilm(f, full, await omdb(full.external_ids && full.external_ids.imdb_id));
    console.log(`OK "${f.title}" -> "${film.title}" (${film.year}), ${film.runtimeMin || "?"} min, ${film.genres.join("/") || "no genres"}, audience: ${film.audience || "unknown"}, streams: ${film.where.length}`);
    if (apply) {
      const { error: e } = await sb.from("added_films").update({ data: film }).eq("group_id", row.group_id).eq("id", row.id);
      if (e) console.log("   save failed:", e.message);
    }
  } catch (e) { console.log(`!  "${f.title}": ${e.message}`); }
}
console.log("\nDone. Moods and warning tags for these films still need a human pass (ask Claude).");
