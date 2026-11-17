# Salon: what's done, what's next

Live site: https://salonsid.netlify.app  (GitHub: https://github.com/S-Sid/Salon-movies)

## Done
- Vite project, code split into modules, design untouched (original kept in `legacy/`)
- Supabase: tables, row-level security, realtime, email/password + magic-link sign-in
- 17 lists / 201 films / 1 note imported
- PWA: manifest, icons (wax seal), service worker, offline copy of last list
- GitHub repo + Netlify auto-deploy, env vars set on Netlify

## Small leftovers (5 minutes)
- [ ] Supabase > Authentication > URL Configuration: Site URL = live address; add `https://<live address>/**` to Redirect URLs
- [ ] Delete the GitHub token (https://github.com/settings/tokens)
- [ ] Remove `SUPABASE_SERVICE_ROLE_KEY` line from `.env.local` (import is finished)
- [ ] Test phone: sign in, change a film, check it appears on the laptop; add to home screen (iPhone: Safari > Share > Add to Home Screen)

## Name changes
- [ ] Decide the web address: Netlify > Site configuration > Change site name (do this BEFORE sharing the link; then update the Supabase URLs above)
- [ ] Decide the on-screen name (header "SALON of Sid", tab title, phone icon label)

## Groups version: BUILT LOCALLY, NOT LIVE YET (supersedes the single shared shelf + invite code)
Anyone creates groups; each group has its own join code, shelf, and member list. Your 201 films become the group "Sid's Salon". Sign-up becomes open (no site-wide invite code). Mock test: http://localhost:5173/?mock (add &nogroups for first-time screen).
To go live, IN THIS ORDER:
1. [ ] Supabase > SQL Editor: run `supabase/migration-3-groups.sql` (after migration-2, which is already done)
2. [ ] Authentication > Sign In / Providers: "Allow new users to sign up" ON, "Confirm email" OFF
3. [ ] Ask Claude to commit + push. Then open the site: Groups button (top right) shows the join code to share.
Note: `npm run enrich` needs SUPABASE_SERVICE_ROLE_KEY again in .env.local (removed after the import); remove it again afterwards.

## Friends version (older step, superseded above): BUILT LOCALLY, NOT LIVE YET
Code is written and tested with a dev-only mock (open http://localhost:5173/?mock). To go live, IN THIS ORDER:
1. [ ] Supabase > SQL Editor: run `supabase/migration-2-friends.sql` (makes you the admin, closes sign-ups with a random invite code)
2. [ ] Set the invite code: `update public.app_settings set value = 'yourword' where key = 'invite_code';`
3. [ ] Supabase > Authentication > Sign In / Providers: turn "Allow new users to sign up" ON
4. [ ] Decide email: Confirm email OFF (password sign-up works instantly, no email needed) or custom SMTP with a new Gmail
5. [ ] Then ask Claude to commit + push (Netlify redeploys). On first login pick your own username.
SQL migration: DONE (ran OK, you are admin). Remaining go-live steps: 2 (invite code), 3 (allow sign-ups), 4 (Confirm email choice), 5 (push).
Enrichment script is written and logic-tested offline (scripts/enrich.mjs). Needs free TMDB key (+ optional OMDb key) in .env.local as TMDB_API_KEY / OMDB_API_KEY.
  - `npm run enrich` = dry run; `npm run enrich -- --apply` = save. Adult-flagged films get removed; unsure matches stay pending.
  - Not covered by the script: moods and warning tags (human pass), audience/cast for the original 201 films (can run the same lookup for them later).

### Original decisions
Decisions made:
- Everyone signs up with their own email and picks a unique username (case-insensitive, no repeats)
- Everyone sees one shared shelf; anyone can add a film with just title + year + language (spelling matters); it shows "added by @username" and sits in "Awaiting details"
- Each person has their own status, stars, remark, best time to watch, mood, and "how it left me" (happy, satisfied, over-hyped...)
- Friends see each other's stars and remarks, by username only. Emails never shown.
- Add cast to each film
- Content info on every film: audience (Kids / Family / Teens 13+ / Adults only) + warning tags (violence, gore, extreme horror, sexual content, nudity, disturbing, drugs, language); "Family-friendly" filter
- Explicit porn: block at add-time (TMDB adult flag). Mainstream adult-rated films allowed with warnings. Owner can delete anything.
- Invite code for sign-up that the owner can change anytime (shared freely by word of mouth), or leave sign-up open

Still to decide:
- [ ] Invite code word (or fully open sign-up)
- [ ] Email for sign-in messages: NEW Gmail just for the Salon + app password in Supabase custom SMTP, OR password-only sign-up (no email setup, no reset)
- [ ] Website name changes (above)

Build steps:
1. New tables: profiles (unique username), shared films (added_by), per-user takes; new RLS rules; migrate the 201 films into the shared table
2. Username screen after first sign-in, sign-up screen with invite code
3. "Added by", friends' takes on each card, content warnings, cast, filters
4. Enrichment script (`npm run enrich`): fills pending films from TMDB + OMDb (runtime, genres, cast, ratings, age rating, India streaming)
5. Test phone + desktop, deploy

## Accounts / keys needed for enrichment (free)
- TMDB: sign up at themoviedb.org, then https://www.themoviedb.org/settings/api > Create > Developer; copy API key
- OMDb: https://www.omdbapi.com/apikey.aspx > FREE; activate via email; copy key
- Put in `.env.local` as `TMDB_API_KEY=` and `OMDB_API_KEY=`. Never paste keys in chat, never commit.
