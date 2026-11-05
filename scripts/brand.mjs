// N99 logotipi va ilova ikonkalarini yaratadi (SVG + PNG). Geometriya src/components/brand/geometry.ts bilan bir xil.
// Ishga tushirish: npm i --no-save @resvg/resvg-js && node scripts/brand.mjs
// Natija: assets/*.png (ikonka, Android adaptive, splash, favicon) va assets/brand/*.svg
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] || new URL('../assets/', import.meta.url).pathname;
mkdirSync(OUT + 'brand/', { recursive: true });

const G = { S: 19, R: 22, R9: 25.5, gap: 9, hub: 6.5, angle: 25, width: 221, height: 100 };
const h = G.S / 2;
const nR = h + 2 * G.R;
const nines = [0, 1].map((i) => {
  const cx = nR + h + G.gap + h + G.R9 + i * (2 * (G.R9 + h) + G.gap);
  return { cx, cy: G.R9 + h };
});
const a = (G.angle * Math.PI) / 180;

function wordmark({ ink, hub, id }) {
  const n = `<path d="M${h} 100 V54 A${G.R} ${G.R} 0 0 1 ${nR} 54 V100" fill="none" stroke="${ink}" stroke-width="${G.S}"/>`;
  const ns = nines.map(({ cx, cy }) => {
    const sx = cx + G.R9 * Math.cos(a), sy = cy + G.R9 * Math.sin(a);
    return `<circle cx="${cx}" cy="${cy}" r="${G.R9}" fill="none" stroke="${ink}" stroke-width="${G.S}"/>` +
      `<path d="M${sx.toFixed(2)} ${sy.toFixed(2)} L${cx - 4} 112" fill="none" stroke="${ink}" stroke-width="${G.S}" clip-path="url(#${id})"/>` +
      (hub ? `<circle cx="${cx}" cy="${cy}" r="${G.hub}" fill="${hub}"/>` : '');
  }).join('');
  return { defs: `<clipPath id="${id}"><rect x="-20" y="-20" width="300" height="120"/></clipPath>`, body: n + ns };
}

function place(scaleWidth, size, cy = size / 2) {
  const s = scaleWidth / G.width;
  const x = (size - scaleWidth) / 2;
  const y = cy - (G.height * s) / 2;
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})`;
}

const bg = (size, rounded) => `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3B8FD6"/><stop offset="0.55" stop-color="#2173B1"/><stop offset="1" stop-color="#164F84"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.22" cy="0.12" r="0.75">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8ED1FF" stop-opacity="0"/><stop offset="0.5" stop-color="#8ED1FF" stop-opacity="0.9"/><stop offset="1" stop-color="#8ED1FF" stop-opacity="0"/>
  </linearGradient>`;

function icon(size, { rounded = false, withBg = true, mono = false, markWidth = 0.64, road = true } = {}) {
  const wm = wordmark({ ink: mono ? '#000' : '#FFFFFF', hub: mono ? null : '#8ED1FF', id: 'clip' + size });
  const r = rounded ? size * 0.225 : 0;
  const w = size * markWidth;
  const s = w / G.width;
  const markH = G.height * s;
  const cy = size / 2 - (road ? size * 0.02 : 0);
  const roadY = cy + markH / 2 + size * 0.085;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>${bg(size)}${wm.defs}</defs>
${withBg ? `<rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/><rect width="${size}" height="${size}" rx="${r}" fill="url(#glow)"/>` : ''}
<g transform="${place(w, size, cy)}">${wm.body}</g>
${road && !mono ? `<rect x="${(size - w * 1.05) / 2}" y="${roadY}" width="${w * 1.05}" height="${size * 0.018}" rx="${size * 0.009}" fill="url(#road)"/>` : ''}
</svg>`;
}

function png(svg, file, width) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: 'rgba(0,0,0,0)' });
  writeFileSync(OUT + file, r.render().asPng());
}

const wordSvg = (ink, hub) => {
  const wm = wordmark({ ink, hub, id: 'w' });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.width} ${G.height}" width="${G.width * 4}" height="${G.height * 4}"><defs>${wm.defs}</defs>${wm.body}</svg>`;
};

const files = {
  'brand/icon.svg': icon(1024),
  'brand/icon-rounded.svg': icon(1024, { rounded: true }),
  'brand/wordmark.svg': wordSvg('#2173B1', '#6DBBFF'),
  'brand/wordmark-white.svg': wordSvg('#FFFFFF', '#8ED1FF'),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(OUT + name, svg);

png(icon(1024), 'icon.png', 1024);
png(icon(1024, { withBg: false, markWidth: 0.86, road: true }), 'splash-icon.png', 1024);
// Android adaptive: 108dp canvas, 66dp safe circle. Keep the mark inside ~58% width.
png(icon(1024, { withBg: false, markWidth: 0.56, road: true }), 'android-icon-foreground.png', 1024);
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>${bg(1024)}</defs><rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/></svg>`, 'android-icon-background.png', 1024);
png(icon(1024, { withBg: false, mono: true, markWidth: 0.56, road: false }), 'android-icon-monochrome.png', 1024);
png(icon(1024, { rounded: true }), 'favicon.png', 96);
console.log('done', OUT, JSON.stringify({ nines, nR }));
