// Pure helpers for the enrichment script (no network, easy to test).

// TMDB genre name -> the Salon's own genre words
const GENRE_MAP = {
  Thriller: "Thriller", Crime: "Crime", Mystery: "Mystery", Horror: "Horror", Comedy: "Comedy",
  Romance: "Romance", Drama: "Drama", "Science Fiction": "Sci-Fi", Action: "Action",
  Adventure: "Adventure", Music: "Musical", War: "War", Fantasy: "Fantasy", Family: "Family",
  History: "Biography",
};

export const mapGenres = (tmdbGenres = []) => [...new Set(tmdbGenres.map(g => GENRE_MAP[g.name]).filter(Boolean))];

// Age rating -> audience label. India first, then the US.
const IN = { U: "Family", UA: "Teens 13+", "UA 7+": "Family", "UA 13+": "Teens 13+", "UA 16+": "Teens 13+", A: "Adults only", S: "Adults only" };
const US = { G: "Kids", PG: "Family", "PG-13": "Teens 13+", R: "Adults only", "NC-17": "Adults only", "TV-Y": "Kids", "TV-G": "Family", "TV-14": "Teens 13+", "TV-MA": "Adults only" };

export function audienceFrom(releaseDates) {
  const results = (releaseDates && releaseDates.results) || [];
  const cert = cc => {
    const r = results.find(x => x.iso_3166_1 === cc);
    const hit = r && r.release_dates.find(d => d.certification);
    return hit ? hit.certification.trim() : "";
  };
  const ind = cert("IN"), us = cert("US");
  if (IN[ind]) return { audience: IN[ind], certification: ind };
  if (US[us]) return { audience: US[us], certification: us };
  return { audience: null, certification: ind || us || "" };
}

export function whereFrom(providers) {
  const p = providers && providers.results && providers.results.IN;
  if (!p) return [];
  const out = [], seen = new Set();
  const add = (list, kind) => (list || []).forEach(x => { const k = x.provider_name + kind; if (!seen.has(k)) { seen.add(k); out.push({ service: x.provider_name, kind }); } });
  add(p.flatrate, "stream"); add(p.free, "free"); add(p.ads, "free"); add(p.rent, "rent"); add(p.buy, "rent");
  return out;
}

// OMDb gives "Ratings": [{Source, Value}] plus imdbRating
export function ratingsFrom(omdb) {
  const r = {};
  if (!omdb || omdb.Response === "False") return r;
  const num = v => (v && v !== "N/A" ? Number(v) : null);
  if (num(omdb.imdbRating) != null) r.imdb = num(omdb.imdbRating);
  (omdb.Ratings || []).forEach(x => {
    if (x.Source === "Rotten Tomatoes") r.rt = parseInt(x.Value, 10);
    if (x.Source === "Metacritic") r.mc = parseInt(x.Value, 10);
  });
  return r;
}

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Pick the best TMDB search hit for what a friend typed.
export function pickMatch(results, title, year) {
  const t = norm(title);
  const scored = (results || []).map(r => {
    const ry = parseInt((r.release_date || "").slice(0, 4), 10) || null;
    let score = 0, titleScore = 0;
    if (norm(r.title) === t || norm(r.original_title) === t) titleScore = 3;
    else if (t && (norm(r.title).includes(t) || t.includes(norm(r.title)))) titleScore = 1;
    score = titleScore;
    if (year && ry === Number(year)) score += 3;
    else if (year && ry && Math.abs(ry - year) === 1) score += 1;
    return { r, score: titleScore ? score : 0 };   // the title must match; a year alone never counts
  }).sort((a, b) => b.score - a.score || (b.r.popularity || 0) - (a.r.popularity || 0));
  const top = scored[0];
  return top && top.score >= 3 ? top.r : null;   // exact title, or partial title plus matching year
}

export function buildFilm(existing, tmdb, omdb) {
  const crew = (tmdb.credits && tmdb.credits.crew) || [];
  const dir = crew.find(c => c.job === "Director");
  const genres = mapGenres(tmdb.genres);
  const { audience, certification } = audienceFrom(tmdb.release_dates);
  const where = whereFrom(tmdb["watch/providers"]);
  const ratings = ratingsFrom(omdb);
  const warnings = [];
  if (genres.includes("Horror")) warnings.push("Horror");

  const film = {
    ...existing,
    title: tmdb.title || existing.title,
    year: parseInt((tmdb.release_date || "").slice(0, 4), 10) || existing.year || null,
    runtimeMin: tmdb.runtime || null,
    director: dir ? dir.name : undefined,
    genres,
    cast: ((tmdb.credits && tmdb.credits.cast) || []).slice(0, 6).map(c => c.name),
    synopsis: tmdb.overview || "",
    hook: tmdb.tagline || (tmdb.overview || "").split(/(?<=\.)\s/)[0] || "",
    ratings,
    where,
    checked: new Date().toISOString().slice(0, 10),
    pending: false,
    enrichedAt: Date.now(),
  };
  if (audience) film.audience = audience;
  if (certification) film.certification = certification;
  if (warnings.length) film.warnings = warnings;
  if (!where.length) film.whereNote = "No Indian streaming listing found yet.";
  Object.keys(film).forEach(k => film[k] === undefined && delete film[k]);
  return film;
}
