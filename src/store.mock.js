/* DEV ONLY (never in the production build): lets me test the interface locally with salon-data.json
   and a few pretend friends. Open http://localhost:5173/?mock  (add &new to test the username screen). */
const me = { id: "me-1", email: "test@example.invalid" };
let profile = /[?&]new/.test(location.search) ? null : "film_goblin";
const names = { "me-1": "film_goblin", "u2": "popcorn_baron", "u3": "mango_noir" };
const notes = {};
let added = [];
const listeners = {};
const hasGroups = !/[?&]nogroups/.test(location.search);
const groups = [
  { id: "g1", name: "Sid's Salon", code: "K7Q2M-9XPLA", admin: "me-1", members: hasGroups ? ["me-1", "u2", "u3"] : ["u2", "u3"] },
  { id: "g2", name: "Cousins", code: "COUSN-12345", admin: "u2", members: hasGroups ? ["me-1", "u2"] : ["u2"] },
];

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
  async loadGroups() { return groups.filter(g => g.members.includes("me-1")).map(g => ({ id: g.id, name: g.name, code: g.code, role: g.admin === "me-1" ? "admin" : "member" })); },
  async createGroup(name) { const id = "g" + (groups.length + 1); groups.push({ id, name, code: "NEW" + id.toUpperCase() + "-ABCDE", admin: "me-1", members: ["me-1"] }); return id; },
  async joinGroup(code) { const g = groups.find(x => x.code === code.toUpperCase()); if (!g) { const e = new Error("unknown code"); e.unknown = true; throw e; } if (!g.members.includes("me-1")) g.members.push("me-1"); return g.id; },
  async regenerateCode(gid) { const g = groups.find(x => x.id === gid); g.code = "REGEN-" + Math.floor(Math.random() * 90000 + 10000); return g.code; },
  async renameGroup(gid, name) { groups.find(x => x.id === gid).name = name; },
  async loadMembers(gid) { const g = groups.find(x => x.id === gid); return g.members.map(u => ({ userId: u, role: u === g.admin ? "admin" : "member" })); },
  async removeMember(gid, uid) { const g = groups.find(x => x.id === gid); g.members = g.members.filter(m => m !== uid); },
  async leaveGroup(gid) { return this.removeMember(gid, "me-1"); },
  async loadLists(gid) {
    if (gid !== "g1") return [];
    const d = await (await fetch("/salon-data.json")).json();
    return d.lists;
  },
  async loadAddedFilms(gid) {
    if (gid !== "g1") return [];
    if (!added.length) added = [
      { id: "barry-lyndon-1975", title: "Barry Lyndon", year: 1975, language: "English", pending: true, order: 1, addedBy: "u2" },
      { id: "drishyam-2013", title: "Drishyam", year: 2013, language: "Malayalam", pending: true, order: 2, addedBy: "u3" },
    ];
    return added.slice();
  },
  async loadNotes() { return Object.assign({}, notes); },
  async loadStats(gid) { return { "se7en-1995": { seen: 2, rated: 2, avg: 4.5 } }; },
  async loadTakes(gid, id) { return takes.filter(t => t.film_id === id); },
  async saveNote(id, n) { notes[id] = n; },
  async addFilm(gid, id, f) { added.push(Object.assign({ id, addedBy: "me-1" }, f)); },
  async removeAddedFilm(gid, id) { added = added.filter(f => f.id !== id); },
  subscribeNotes() {}, subscribeAddedFilms() {},
};
