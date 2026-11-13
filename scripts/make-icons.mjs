// Draws the wax seal from the opening animation as app icons. Run: npm run icons
import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Symmetric scalloped wax edge: 14 soft bumps around a circle.
function scallop(n = 14, r = 108, amp = 6) {
  let d = "";
  for (let i = 0; i <= 360; i += 2) {
    const a = (i * Math.PI) / 180, rad = r + amp * Math.sin(n * a);
    d += (i ? "L" : "M") + (120 + rad * Math.cos(a)).toFixed(2) + " " + (120 + rad * Math.sin(a)).toFixed(2);
  }
  return d + "Z";
}

const seal = `
  <defs><radialGradient id="wax" cx="40%" cy="35%" r="70%">
    <stop offset="0" stop-color="#c23a4c"/><stop offset=".55" stop-color="#8c1c2e"/><stop offset="1" stop-color="#4f0c17"/>
  </radialGradient></defs>
  <path d="${scallop()}" fill="url(#wax)"/>
  <circle cx="120" cy="120" r="80" fill="none" stroke="#e8c47a" stroke-width="3"/>
  <circle cx="120" cy="120" r="70" fill="none" stroke="#e8c47a" stroke-width="1.2" stroke-dasharray="2 6"/>
  <text x="120" y="146" text-anchor="middle" font-family="Playfair Display, Didot, Bodoni 72, Georgia, serif" font-style="italic" font-weight="700" font-size="84" fill="#f4d48f">S</text>`;

// scale = how much of the square the seal fills (maskable icons need a safe zone)
const svg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#140c12"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <defs><radialGradient id="glow" cx="80%" cy="0%" r="90%"><stop offset="0" stop-color="#9b2335" stop-opacity=".35"/><stop offset="1" stop-color="#9b2335" stop-opacity="0"/></radialGradient></defs>
  <g transform="translate(${256 - 120 * scale * 2.133 / 1},${256 - 120 * scale * 2.133 / 1}) scale(${scale * 2.133})">${seal}</g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = async (name, size, scale) =>
  sharp(Buffer.from(svg(scale))).resize(size, size).png().toFile(`public/icons/${name}`);

await out("icon-192.png", 192, 0.88);
await out("icon-512.png", 512, 0.88);
await out("icon-maskable-512.png", 512, 0.62);   // inside the 80% safe circle
await out("apple-touch-icon.png", 180, 0.88);
console.log("icons written to public/icons");
