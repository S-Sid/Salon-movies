// One-off import: salon-data.json -> Supabase.
// Run locally only:   npm run import
// Needs these in .env.local (never committed):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_USER_ID
// The service-role key bypasses row-level security, which is why it is only used here
// and is NOT prefixed VITE_ (so it can never end up in the website bundle).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OWNER_USER_ID) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or OWNER_USER_ID in .env.local");
  process.exit(1);
}
const file = process.argv[2] || "salon-data.json";
const data = JSON.parse(readFileSync(file, "utf8"));
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const lists = (data.lists || []).map((L, i) => ({
  id: L.id, user_id: OWNER_USER_ID, name: L.name ?? null, language: L.language ?? null,
  sort_order: Number.isFinite(L.order) ? Math.round(L.order) : i,
  checked: L.checked ?? null, films: L.films || [],
}));

const added = (data.addedFilms || []).map(({ id, ...rest }) => ({ id, user_id: OWNER_USER_ID, data: rest }));

const STATUSES = ["want", "watching", "watched"];
const notes = Object.entries(data.myNotes || {}).map(([film_id, n]) => ({
  user_id: OWNER_USER_ID, film_id,
  status: STATUSES.includes(n.status) ? n.status : "want",
  insight: n.insight || "", remarks: n.remarks || "",
  stars: Math.min(5, Math.max(0, Math.round(n.stars || 0))),
  updated: Math.round(Number(n.updated) || Date.now()),
}));

async function put(table, rows, onConflict) {
  if (!rows.length) { console.log(`${table}: nothing to import`); return; }
  const { error } = await sb.from(table).upsert(rows, { onConflict });   // safe to re-run
  if (error) { console.error(`${table}: FAILED`, error.message); process.exit(1); }
  console.log(`${table}: ${rows.length} rows`);
}

await put("lists", lists, "id");
await put("added_films", added, "id");
await put("notes", notes, "user_id,film_id");
console.log(`Done. ${lists.reduce((n, L) => n + L.films.length, 0)} films across ${lists.length} lists.`);
