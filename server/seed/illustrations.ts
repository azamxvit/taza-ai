import sharp from "sharp";

// Flat illustrations for demo reports: no real photos, places or people.
// Each scene is a tiny SVG rendered to JPEG; `v` shifts shapes a bit so
// reports of the same category don't look identical.

const W = 1280;
const H = 860;

const sky = (top = "#9cc4e4", bottom = "#d8e6ef") => `
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  <rect width="${W}" height="${H * 0.5}" fill="url(#sky)"/>`;
const steppe = (color = "#c9b38a") => `<rect y="${H * 0.5}" width="${W}" height="${H * 0.5}" fill="${color}"/>
  <path d="M0 ${H * 0.5} Q ${W * 0.3} ${H * 0.47} ${W * 0.6} ${H * 0.5} T ${W} ${H * 0.49} V ${H * 0.52} H 0 Z" fill="#b89f73"/>`;

const bags = (x: number, y: number) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const cx = x + (i % 3) * 70 + (i > 2 ? 35 : 0);
      const cy = y - (i > 2 ? 50 : 0);
      const fill = ["#2b2b2b", "#3b3b3b", "#1f3b63", "#2b2b2b", "#4a4a4a", "#e6e6e6"][i];
      return `<ellipse cx="${cx}" cy="${cy}" rx="52" ry="40" fill="${fill}"/>`;
    })
    .join("") +
  `<rect x="${x + 230}" y="${y - 30}" width="90" height="60" fill="#a06a3c"/><circle cx="${x - 70}" cy="${y + 10}" r="38" fill="none" stroke="#222" stroke-width="18"/>`;

const smoke = (x: number, y: number) => `
  <g opacity="0.75" fill="#7d7d7d">
    <ellipse cx="${x}" cy="${y - 80}" rx="70" ry="50"/><ellipse cx="${x + 40}" cy="${y - 170}" rx="90" ry="60"/>
    <ellipse cx="${x + 100}" cy="${y - 270}" rx="120" ry="70"/><ellipse cx="${x + 180}" cy="${y - 360}" rx="150" ry="75"/>
  </g>`;

const flames = (x: number, y: number) => `
  <path d="M${x - 60} ${y} Q ${x - 40} ${y - 90} ${x} ${y - 140} Q ${x + 20} ${y - 70} ${x + 60} ${y} Z" fill="#ff8a1f"/>
  <path d="M${x - 30} ${y} Q ${x - 15} ${y - 60} ${x + 5} ${y - 90} Q ${x + 15} ${y - 40} ${x + 30} ${y} Z" fill="#ffd23f"/>`;

const scenes: Record<string, (v: number) => string> = {
  illegal_dump: (v) => sky() + steppe() + bags(420 + v * 60, 640),
  waste_burning: (v) => sky("#a9b4bd", "#d6d0c4") + steppe() + bags(460 + v * 40, 650) + flames(560 + v * 40, 620) + smoke(560 + v * 40, 560),
  oil_spill: (v) =>
    sky() +
    steppe("#b59d74") +
    `<ellipse cx="${640 + v * 40}" cy="660" rx="330" ry="110" fill="#111"/>
     <ellipse cx="${600 + v * 40}" cy="640" rx="160" ry="40" fill="#3a2f5b" opacity="0.6"/>
     <ellipse cx="${700 + v * 40}" cy="680" rx="120" ry="28" fill="#1f5b4f" opacity="0.5"/>`,
  water_pollution: (v) =>
    sky() +
    `<rect y="${H * 0.5}" width="${W}" height="${H * 0.5}" fill="#4f7f8f"/>
     <rect y="${H * 0.5}" width="${W}" height="60" fill="#b89f73"/>
     <ellipse cx="${380 + v * 50}" cy="640" rx="200" ry="35" fill="#e8e3c8" opacity="0.9"/>
     <ellipse cx="${760 + v * 50}" cy="700" rx="160" ry="28" fill="#9aa35a" opacity="0.8"/>
     <rect x="${560 + v * 30}" y="610" width="50" height="28" fill="#e04b4b"/><ellipse cx="${900 + v * 20}" cy="650" rx="40" ry="16" fill="#ddd"/>`,
  air_emission: (v) =>
    sky("#b7bfc6", "#e0ddd6") +
    steppe("#c2ad86") +
    `<rect x="${760 + v * 30}" y="230" width="60" height="210" fill="#6b6b6b"/>
     <rect x="${640 + v * 30}" y="360" width="260" height="80" fill="#7a7a7a"/>` +
    `<g opacity="0.85" fill="#4d4d4d"><ellipse cx="${800 + v * 30}" cy="190" rx="70" ry="45"/><ellipse cx="${700 + v * 30}" cy="140" rx="110" ry="55"/><ellipse cx="${560 + v * 30}" cy="100" rx="150" ry="60"/></g>`,
  dead_wildlife: (v) =>
    sky() +
    `<rect y="${H * 0.5}" width="${W}" height="${H * 0.2}" fill="#5f8fa0"/><rect y="${H * 0.7}" width="${W}" height="${H * 0.3}" fill="#d8c79c"/>` +
    [0, 1, 2, 3, 4]
      .map((i) => {
        const x = 300 + i * 150 + v * 20;
        const y = 690 + (i % 2) * 40;
        return `<g transform="rotate(${(i % 3) * 12 - 10} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="60" ry="20" fill="#b9c2c9"/><path d="M${x + 55} ${y} l35 -20 v40 z" fill="#9aa4ab"/></g>`;
      })
      .join(""),
  tree_damage: (v) =>
    sky() +
    steppe("#a7b57a") +
    `<rect x="${380 + v * 30}" y="560" width="70" height="60" fill="#7a5230"/><ellipse cx="${415 + v * 30}" cy="560" rx="35" ry="12" fill="#c49a6c"/>
     <rect x="${620 + v * 30}" y="570" width="60" height="50" fill="#7a5230"/><ellipse cx="${650 + v * 30}" cy="570" rx="30" ry="10" fill="#c49a6c"/>
     <g transform="rotate(-8 900 680)"><rect x="740" y="660" width="380" height="45" rx="20" fill="#6d4a2b"/></g>
     <circle cx="1080" cy="640" r="70" fill="#5f7d3a"/>`,
  other: (v) =>
    sky() + steppe() + `<rect x="${520 + v * 40}" y="600" width="240" height="90" rx="20" fill="#d9d9d9"/><ellipse cx="${640 + v * 40}" cy="700" rx="200" ry="40" fill="#6e8bb4" opacity="0.7"/>`,
  after: (v) => sky() + steppe() + `<circle cx="${1000 - v * 40}" cy="140" r="60" fill="#fff4c2"/>`,
};

/** Render a demo scene to a JPEG buffer. */
export function illustration(kind: string, variant = 0): Promise<Buffer> {
  const draw = scenes[kind] ?? scenes.other;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${draw(variant)}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
}
