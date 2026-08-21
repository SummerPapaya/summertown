/**
 * Compose Summer Town README showcase from real map + landmark cutouts + scenes.
 * Outputs: assets/readme/showcase.webp (and optional PNG).
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PNG = path.join(ROOT, 'assets/readme/showcase.png');
const OUT_WEBP = path.join(ROOT, 'assets/readme/showcase.webp');
const PUB = path.join(ROOT, 'public');

const WORLD = { w: 2400, h: 1680 };
const CONTENT_TOP = 80;

/** Landmark placement mirrors TownMap.tsx */
const LANDMARKS = [
  { id: 'town-hall', img: 'b-townhall.png', x: 1650, y: 418, w: 330 },
  { id: 'theater', img: 'b-theater.png', x: 1080, y: 640, w: 300 },
  { id: 'livehouse', img: 'b-livehouse.png', x: 2230, y: 780, w: 280 },
  { id: 'store', img: 'b-store.png', x: 1100, y: 450, w: 310 },
  { id: 'gallery', img: 'b-gallery.png', x: 1885, y: 660, w: 290 },
  { id: 'coffee', img: 'b-coffee.png', x: 1070, y: 1120, w: 300 },
  { id: 'radio', img: 'b-radio.png', x: 1400, y: 310, w: 300 },
  { id: 'library', img: 'b-library.png', x: 1385, y: 180, w: 290 },
  { id: 'design-lab', img: 'b-designlab.png', x: 2120, y: 560, w: 290 },
  { id: 'apple-cottage', img: 'b-apple.png', x: 2050, y: 430, w: 260 },
  { id: 'magic-house', img: 'b-magic.png', x: 2230, y: 930, w: 280 },
  { id: 'hotel', img: 'b-hotel.png', x: 1806, y: 890, w: 340 },
  { id: 'villas', img: 'b-villas.png', x: 2310, y: 660, w: 300 },
];

const ISLE = {
  pavilion: { img: 'i-pavilion.png', x: 430, y: 900, w: 560 },
  lighthouse: { img: 'i-lighthouse.png', x: 430, y: 900, w: 560 },
};

async function loadCover(file, w, h) {
  return sharp(path.join(PUB, file))
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

async function stickerFrame(inner, pad = 14, radius = 36, bg = '#FFF9EF') {
  const meta = await sharp(inner).metadata();
  const ow = meta.width + pad * 2;
  const oh = meta.height + pad * 2;
  const svg = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#4A4470" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="${ow - 4}" height="${oh - 4}" rx="${radius}"
            fill="${bg}" stroke="#FFFFFF" stroke-width="8" filter="url(#s)"/>
    </svg>`);
  return sharp(svg)
    .composite([{ input: inner, left: pad, top: pad }])
    .png()
    .toBuffer();
}

async function composeTownMap() {
  const base = await sharp(path.join(PUB, 'map-base-ext.png'))
    .resize(WORLD.w, WORLD.h, { fit: 'cover' })
    .png()
    .toBuffer();

  const layers = [];

  // boats
  const boatsA = await sharp(path.join(PUB, 'prop-boats.png')).resize(420).png().toBuffer();
  const boatsB = await sharp(path.join(PUB, 'prop-boats.png')).resize(300).flop().png().toBuffer();
  layers.push({ input: boatsA, left: 1580, top: CONTENT_TOP + 1180 });
  layers.push({ input: boatsB, left: 560, top: CONTENT_TOP + 240 });

  for (const lm of LANDMARKS) {
    const cut = await sharp(path.join(PUB, lm.img)).resize(lm.w).png().toBuffer();
    const left = Math.round(lm.x - lm.w / 2);
    const top = Math.round(CONTENT_TOP + lm.y - lm.w * 0.72);
    layers.push({ input: cut, left: Math.max(0, left), top: Math.max(0, top) });
  }

  // Windbell Isle: lighthouse + pavilion
  const isleW = ISLE.pavilion.w;
  const isleLeft = Math.round(ISLE.pavilion.x - isleW / 2);
  const isleTop = Math.round(CONTENT_TOP + ISLE.pavilion.y - isleW * 0.72);
  const light = await sharp(path.join(PUB, 'i-lighthouse.png'))
    .resize(Math.round(isleW * 0.38))
    .png()
    .toBuffer();
  const pavilion = await sharp(path.join(PUB, 'i-pavilion.png'))
    .resize(Math.round(isleW * 0.72))
    .png()
    .toBuffer();
  layers.push({ input: light, left: isleLeft + Math.round(isleW * 0.02), top: isleTop + 40 });
  layers.push({
    input: pavilion,
    left: isleLeft + Math.round(isleW * 0.28),
    top: isleTop + 20,
  });

  return sharp(base).composite(layers).png().toBuffer();
}

async function main() {
  await mkdir(path.dirname(OUT_WEBP), { recursive: true });

  const W = 1800;
  const H = 1080;
  const background = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#CFEBF7"/>
      <stop offset="42%" stop-color="#A5E3D8"/>
      <stop offset="70%" stop-color="#7EC8E3"/>
      <stop offset="100%" stop-color="#FFF3DF"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="40" fill="url(#sky)"/>
  <circle cx="1520" cy="140" r="90" fill="#FFDD94" opacity="0.85"/>
  <ellipse cx="320" cy="160" rx="140" ry="48" fill="#FFFFFF" opacity="0.7"/>
  <ellipse cx="400" cy="150" rx="90" ry="40" fill="#FFFFFF" opacity="0.65"/>
  <ellipse cx="1180" cy="220" rx="120" ry="40" fill="#FFFFFF" opacity="0.55"/>
  <path d="M0 860 Q 220 820 440 860 T 880 860 T 1320 860 T 1800 860 L 1800 1080 L 0 1080 Z"
        fill="#FFF9EF" opacity="0.55"/>
</svg>`);

  const fullMap = await composeTownMap();
  // Crop to the lively town + pier/isle area
  const mapCrop = await sharp(fullMap)
    .extract({ left: 280, top: 120, width: 1960, height: 1320 })
    .resize(1180, 780, { fit: 'cover' })
    .png()
    .toBuffer();
  const map = await stickerFrame(mapCrop, 18, 40);

  const scenes = await Promise.all(
    [
      ['scene-townhall.png', 280, 190],
      ['scene-coffee.png', 250, 170],
      ['scene-magic.png', 250, 170],
      ['scene-isle.png', 300, 200],
      ['scene-radio.png', 240, 160],
    ].map(async ([file, w, h]) => stickerFrame(await loadCover(file, w, h), 12, 28)),
  );

  const caption = Buffer.from(`
<svg width="760" height="70" xmlns="http://www.w3.org/2000/svg">
  <rect width="760" height="70" rx="35" fill="#FFF9EF" fill-opacity="0.92" stroke="#FFFFFF" stroke-width="6"/>
  <text x="380" y="44" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="28" font-weight="750" fill="#4A4470">
    14 landmarks · Day / Golden Hour / Starlight · Windbell Isle ferry
  </text>
</svg>`);

  const board = sharp(background).composite([
    { input: map, left: 300, top: 120 },
    { input: scenes[0], left: 48, top: 90 },
    { input: scenes[1], left: 70, top: 360 },
    { input: scenes[2], left: 1460, top: 100 },
    { input: scenes[3], left: 1420, top: 360 },
    { input: scenes[4], left: 70, top: 680 },
    { input: caption, left: 520, top: 960 },
  ]);

  const resized = board.clone().resize(1400);
  await resized.webp({ quality: 82 }).toFile(OUT_WEBP);
  if (process.env.WRITE_PNG === '1') {
    await resized.png({ compressionLevel: 9 }).toFile(OUT_PNG);
    console.log('Wrote', OUT_PNG);
  }
  console.log('Wrote', OUT_WEBP);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
