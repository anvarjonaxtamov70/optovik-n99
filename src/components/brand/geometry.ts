// N99 logotipi geometriyasi (viewBox 0 0 221 100). scripts/brand.mjs bilan bir xil.
// "n" — yo'l arkasi, ikki "9" — ichida gupchagi bor g'ildiraklar.
export const LOGO = { width: 221, height: 100, stroke: 19, archR: 22, ringR: 25.5, hubR: 6.5, angle: 25 } as const;

const h = LOGO.stroke / 2;
export const N_PATH = `M${h} 100 V54 A${LOGO.archR} ${LOGO.archR} 0 0 1 ${h + 2 * LOGO.archR} 54 V100`;
export const N_LENGTH = 46 * 2 + Math.PI * LOGO.archR;
export const RING_LENGTH = 2 * Math.PI * LOGO.ringR;
export const NINES = [{ cx: 107, cy: 35 }, { cx: 186, cy: 35 }];

/** "9" ning dumi: pastki kesimi gorizontal bo'lgan to'rtburchak (clip ishlatmaslik uchun). */
export function tailPolygon(cx: number, cy: number): string {
  const a = (LOGO.angle * Math.PI) / 180;
  const sx = cx + LOGO.ringR * Math.cos(a);
  const sy = cy + LOGO.ringR * Math.sin(a);
  const ex = cx - 4, ey = 112;
  const len = Math.hypot(ex - sx, ey - sy);
  const dx = (ex - sx) / len, dy = (ey - sy) / len;
  const nx = -dy * h, ny = dx * h;
  const p1 = [sx + nx, sy + ny], p2 = [sx - nx, sy - ny];
  const atBase = (p: number[]) => [p[0] + ((100 - p[1]) / dy) * dx, 100];
  const p3 = atBase(p2), p4 = atBase(p1);
  return [p1, p2, p3, p4].map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}
