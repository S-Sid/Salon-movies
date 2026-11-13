/* DEV ONLY (never in the production build): lets me test the interface locally with salon-data.json
   and a few pretend friends. Open http://localhost:5173/?mock  (add &new to test the username screen). */
const me = { id: "me-1", email: "test@example.invalid" };
let profile = /[?&]new/.test(location.search) ? null : "film_goblin";
const names = { "me-1": "film_goblin", "u2": "popcorn_baron", "u3": "mango_noir" };
const notes = {};
let added = [];
const listeners = {};

const takes = [
  { film_id: "se7en-1995", username: "popcorn_baron", stars: 5, remarks: "Watch it on a rainy night. Do not eat during the ending.", best_time: "Rainy night", feeling: "Shaken", status: "watched", updated: 3 },
  { film_id: "se7en-1995", username: "mango_noir", stars: 4, remarks: "Brilliant but bleak.", best_time: "Solo", feeling: "Disturbed", status: "watched", updated: 2 },
];

export const store = {
  configured: true, offline: false,
  noteFromRow: r => ({ status: r.status || "want", insight: r.insight || "", remarks: r.remarks || "", stars: r.stars || 0, bestTime: r.best_time || "", feeling: r.feeling || "", updated: Number(r.updated) || 0 }),
  async init() { return me; },
  onAuthChange() {},
  async sendLink() {}, async verifyCode() { return me; }, async signInPassword() { return me; },
  async signUp() { return me; }, async signOut() { location.reload(); },
  async getProfile() { return profile; },
  async usernameTaken(n) { return Object.values(names).some(x => x.toLowerCase() === n.toLowerCase()); },
  async createProfile(n) { if (await this.usernameTaken(n)) { const e = new Error("taken"); e.taken = true; throw e; } profile = n; names["me-1"] = n; },
  async loadUsernames() { return Object.assign({}, names); },
  async isAdmin() { return /[?&]admin/.test(location.search); },
  async loadLists() {
    const d = await (await fetch("/salon-data.json")).json();
    return d.lists;
  },
  async loadAddedFilms() {
    if (!added.length) added = [
      { id: "barry-lyndon-1975", title: "Barry Lyndon", year: 1975, language: "English", pending: true, order: 1, addedBy: "u2" },
      { id: "drishyam-2013", title: "Drishyam", year: 2013, language: "Malayalam", pending: true, order: 2, addedBy: "u3" },
    ];
    return added.slice();
  },
  async loadNotes() { return Object.assign({}, notes); },
  async loadStats() { return { "se7en-1995": { seen: 2, rated: 2, avg: 4.5 } }; },
  async loadTakes(id) { return takes.filter(t => t.film_id === id); },
  async saveNote(id, n) { notes[id] = n; },
  async addFilm(id, f) { added.push(Object.assign({ id, addedBy: "me-1" }, f)); },
  async removeAddedFilm(id) { added = added.filter(f => f.id !== id); },
  subscribeNotes() {}, subscribeAddedFilms() {},
};
