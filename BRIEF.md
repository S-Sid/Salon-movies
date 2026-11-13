# Salon of Sid — move to my own site

Paste this file into Claude Code together with `index.html` (the current working page) and `salon-data.json` (exported from the "Export my data" button in the site's footer).

## Goal
Turn the attached single-page film watchlist into my own website that:
- opens in any normal browser on phone and laptop, on my own link (no claude.ai sign-in);
- keeps my personal notes (status: want / watching / watched, "insight I got", "remarks", stars) **in sync between phone and laptop**;
- can be installed on my phone home screen (PWA: manifest + icon + offline cache of the shell).

## Current state (what `index.html` already does)
- Dark Regency / colonial "Netflix" look: Playfair Display, EB Garamond, Pinyon Script; colours `--night`, `--velvet`, `--claret`, `--gilt`, `--ivory`, `--wisteria`.
- Wax-seal + curtain intro (once per session), painted canvas scene per film (no studio posters), lazy-painted near the viewport.
- Rows by language, Fun shelf, genre pairings, short films, critics' darlings, seen & noted.
- Filters: Language, Genre (pick two to pair), Pairings, Mood, Time. On phones the filters fold behind "More filters".
- Hover shows only runtime + ratings; click opens the full card (synopsis, when to watch, genre & mood, IMDb / RT / Metacritic, where to watch in India, my insight + remarks).
- Data today comes from `window.claude.use("db")` — that is claude.ai's runtime and **will not exist** on my own host. It must be replaced.

## Data model (see `salon-data.json`)
- `lists[]`: `{id, name, language, order, checked, films:[film]}`
- `film`: `{id, title, year, runtimeMin, director, genres[], moods[], hook, synopsis, occasion, ratings{imdb, rt, mc}, where[{service, kind: stream|free|rent|none|unknown}], whereNote, palette[3], motif, scene, order, yourShelf?}`
- `addedFilms[]`: films I typed in myself (pending details)
- `myNotes{filmId: {status, insight, remarks, stars, updated}}`

## Suggested build (push back if there's a simpler way)
1. Plain Vite + vanilla JS (keep the existing code; no framework needed).
2. Supabase (free tier): magic-link email login for me only; tables `lists` (jsonb films), `added_films`, `notes` (row-level security: only my user id can read/write).
3. Replace every `window.claude` / `db.collection(...)` call with a small `store.js` wrapper over Supabase (realtime subscription for notes so phone and laptop update live).
4. One-off import script that loads `salon-data.json` into Supabase.
5. Deploy to Netlify or Vercel from a GitHub repo; give me the URL.
6. Add `manifest.webmanifest`, icons and a service worker so "Add to Home Screen" works.
7. Keep the performance fixes: lazy scene painting, no blur/backdrop filters on scroll, `content-visibility` on rows.

## Later (not now)
- A simple "add a list" admin page so I can paste a list of titles and fill details.
