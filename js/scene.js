// Pixel-art scenes for the top of the brief, drawn in code into a small canvas and scaled up with crisp pixels.
// Four places × five times of day × the brief's weather. It animates at 12 fps and stops when the scene is
// off-screen, the tab is hidden, or the reader prefers reduced motion.

export const SCENES = ['room', 'rooftop', 'cabin', 'town'];
export const TIMES = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

export function timeOf(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20.5) return 'evening';
  return 'night';
}

export const weatherOf = icon => ({ sun: 'clear', cloud: 'cloud', rain: 'rain', snow: 'snow', storm: 'rain' })[icon] ?? 'clear';

const H = 144; // logical height of every scene
const M = 4; // spare columns either side of a layer, so parallax never reveals an edge
const FPS = 12;

// ---------- colour ----------

const rgb = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const unpack = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
const mixRgb = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const mixC = (a, b, t) => pack(mixRgb(unpack(a), unpack(b), t));

function bayer(n) {
  let m = [[0]];
  while (m.length < n) {
    const s = m.length;
    m = Array.from({ length: s * 2 }, (_, y) => Array.from({ length: s * 2 }, (_, x) => m[y % s][x % s] * 4 + [[0, 2], [3, 1]][+(y >= s)][+(x >= s)]));
  }
  return m.flat().map(v => (v + 0.5) / (n * n));
}
const B4 = bayer(4), B8 = bayer(8);
const bay = (x, y) => B4[((y & 3) << 2) | (x & 3)];
const bay8 = (x, y) => B8[((y & 7) << 3) | (x & 7)];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (a, b = 0) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- a tiny pixel buffer ----------

class Px {
  constructor(w, h, o = 0) { this.w = w; this.h = h; this.o = o; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x = Math.round(x) + this.o; y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.round(x) + this.o; y = Math.round(y); return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
  rect(x, y, w, h, c) {
    const x0 = Math.max(0, Math.round(x) + this.o), x1 = Math.min(this.w, Math.round(x + w) + this.o);
    const y0 = Math.max(0, Math.round(y)), y1 = Math.min(this.h, Math.round(y + h));
    if (x1 <= x0) return;
    for (let yy = y0; yy < y1; yy++) this.d.fill(c, yy * this.w + x0, yy * this.w + x1);
  }
  full(y, h, c) { this.rect(-this.o, y, this.w, h, c); }
  drect(x, y, w, h, c, level) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) if (bay(xx, yy) < level) this.set(xx, yy, c);
  }
  ellipse(cx, cy, rx, ry, c, level = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2;
      if (d <= 1 && (level >= 1 || bay(x, y) < level)) this.set(x, y, c);
    }
  }
  disc(cx, cy, r, c, level = 1) { this.ellipse(cx, cy, r, r, c, level); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  poly(pts, c) {
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1, c);
    }
  }
  // Draws `src` (a Px with its own origin) with its left edge at x, optionally mirrored.
  blit(src, x, y, flip = false) {
    for (let sy = 0; sy < src.h; sy++) for (let sx = 0; sx < src.w; sx++) {
      const c = src.d[sy * src.w + (flip ? src.w - 1 - sx : sx)];
      if (c) this.set(x + sx, y + sy, c);
    }
  }
  // Mixes existing pixels toward a colour, banded with a dither like a real pixel artist would.
  tint(x, y, c, t) { x = Math.round(x) + this.o; y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) { const i = y * this.w + x; if (this.d[i]) this.d[i] = mixC(this.d[i], c, t); } }
  glow(cx, cy, r, c, k) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const f = 1 - Math.hypot(x - cx, (y - cy) * 1.1) / r;
      if (f <= 0) continue;
      const band = Math.floor(f * k * 4 + bay(x, y)) / 4;
      if (band > 0) this.tint(x, y, c, Math.min(0.7, band * 0.55));
    }
  }
  // Wraps every filled pixel in a 1px outline, the finishing pass that makes shapes read as pixel art.
  outline(c) {
    const n = new Uint32Array(this.d);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.d[y * this.w + x]) continue;
      const near = (x > 0 && this.d[y * this.w + x - 1]) || (x < this.w - 1 && this.d[y * this.w + x + 1]) || (y > 0 && this.d[(y - 1) * this.w + x]) || (y < this.h - 1 && this.d[(y + 1) * this.w + x]);
      if (near) n[y * this.w + x] = c;
    }
    this.d = n;
    return this;
  }
}

const sprite = (w, h, draw) => { const p = new Px(w, h); draw(p); return p; };

// ---------- times of day ----------

const LOOKS = {
  dawn: {
    sky: ['#26285a', '#4d4589', '#9a6499', '#e3878f', '#ffbd8a'], sun: { x: 0.2, y: 0.9, r: 10, core: '#fff0cc', ring: '#ffcf95' },
    stars: 22, cloud: ['#ffd8c4', '#e6a2a6', '#9a6c98'], amb: '#6a5aa2', ak: 0.3, br: 0.84, lights: 0.5,
    far: ['#8d6d9f', '#6c5589', '#4c3f6d'], ground: '#4a3f63',
  },
  morning: {
    sky: ['#4b97de', '#76b5e9', '#a6d2f2', '#d4ebf5', '#f4efda'], sun: { x: 0.84, y: 0.36, r: 9, core: '#fffbea', ring: '#fff1bf' },
    stars: 0, cloud: ['#ffffff', '#e4eef7', '#b8cde1'], amb: '#bcd6ef', ak: 0.1, br: 1, lights: 0,
    far: ['#a9c4dd', '#8fafcc', '#7897b6'], ground: '#6f8f6a',
  },
  afternoon: {
    sky: ['#2d7cce', '#579fde', '#8bc1ea', '#c6deeb', '#f5dfae'], sun: { x: 0.74, y: 0.3, r: 9, core: '#fffbe6', ring: '#fff0b5' },
    stars: 0, cloud: ['#fffaf0', '#f2e5d1', '#c8b7a5'], amb: '#f2c98a', ak: 0.12, br: 1, lights: 0,
    far: ['#b2bccb', '#98a3b7', '#808ba2'], ground: '#7a8c5e',
  },
  evening: {
    sky: ['#1d1b4b', '#472e70', '#994379', '#e2666b', '#ffa15e'], sun: { x: 0.76, y: 0.88, r: 12, core: '#ffe2a2', ring: '#ff9a5b' },
    stars: 8, cloud: ['#ffb48a', '#d76f89', '#6c3d71'], amb: '#7a4a8c', ak: 0.34, br: 0.78, lights: 1,
    far: ['#7e4677', '#5e3566', '#422854'], ground: '#3e2b4c',
  },
  night: {
    sky: ['#060a1e', '#0c1433', '#16224f', '#233069', '#363b72'], moon: { x: 0.76, y: 0.34, r: 7 },
    stars: 70, cloud: ['#4b5588', '#363f6d', '#242b53'], amb: '#1c295c', ak: 0.5, br: 0.52, lights: 1,
    far: ['#1d2550', '#171d43', '#111637'], ground: '#151a36',
  },
};

function look(time, weather) {
  const T = LOOKS[time] ?? LOOKS.morning;
  const dark = time === 'night' || time === 'evening';
  const over = { clear: 0, cloud: 0.3, rain: 0.5, snow: 0.32 }[weather] ?? 0;
  const grey = rgb(dark ? '#3a3e58' : '#a7b0bd');
  const amb = rgb(T.amb), ak = T.ak + over * 0.16, br = T.br * (1 - over * 0.14);
  const cache = new Map();
  const lit = s => {
    if (!cache.has(s)) cache.set(s, pack(mixRgb(rgb(s).map(v => v * br), amb, ak)));
    return cache.get(s);
  };
  return {
    time, weather, dark, over,
    sky: T.sky.map(s => mixRgb(rgb(s), grey, over)),
    sun: over > 0.4 ? null : T.sun, moon: over > 0.4 ? null : T.moon,
    sunDim: over,
    stars: Math.round(T.stars * (1 - over * 1.6)),
    cloud: T.cloud.map(s => pack(mixRgb(rgb(s), grey, over * 0.8))),
    clouds: { clear: 1, cloud: 3, rain: 4, snow: 3 }[weather] ?? 1,
    far: T.far.map(s => pack(mixRgb(rgb(s), grey, over * 0.5))),
    lit, em: s => pack(rgb(s)), lights: T.lights, ground: lit(T.ground),
  };
}

// ---------- shared painting ----------

function skyLayer(W, L, horizon) {
  const p = new Px(W, H);
  const stops = L.sky, segs = stops.length - 1, shades = [];
  for (let i = 0; i < segs; i++) for (let k = 0; k < 4; k++) shades.push(pack(mixRgb(stops[i], stops[i + 1], k / 4)));
  shades.push(pack(stops[segs]));
  // Clean bands with a short dithered seam between them, the way skies are painted by hand.
  for (let y = 0; y < H; y++) {
    const v = Math.min(1, y / horizon) * (shades.length - 1), k = Math.floor(v), f = Math.min(1, Math.max(0, (v - k - 0.55) / 0.45));
    for (let x = 0; x < W; x++) p.d[y * W + x] = shades[Math.min(shades.length - 1, k + (bay(x, y) < f ? 1 : 0))];
  }
  if (L.sun) {
    const cx = Math.round(W * L.sun.x), cy = Math.round(horizon * L.sun.y), r = L.sun.r;
    const ring = pack(rgb(L.sun.ring)), core = pack(rgb(L.sun.core));
    for (let y = cy - r - 12; y <= cy + r + 12; y++) for (let x = cx - r - 12; x <= cx + r + 12; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) p.set(x, y, d > r - 1.5 && y > cy ? mixC(core, ring, 0.45) : core);
      else if (d <= r + 3) p.tint(x, y, ring, 0.55);
      else if (d <= r + 7 && bay(x, y) < 0.5) p.tint(x, y, ring, 0.35);
      else if (d <= r + 12 && bay(x, y) < 0.25) p.tint(x, y, ring, 0.25);
    }
  }
  if (L.moon) {
    const cx = Math.round(W * L.moon.x), cy = Math.round(horizon * L.moon.y), r = L.moon.r;
    const halo = pack(rgb('#5a6aa8'));
    for (let y = cy - r - 8; y <= cy + r + 8; y++) for (let x = cx - r - 8; x <= cx + r + 8; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r && d <= r + 4 && bay(x, y) < 0.5) p.tint(x, y, halo, 0.4);
      else if (d > r + 4 && d <= r + 8 && bay(x, y) < 0.2) p.tint(x, y, halo, 0.3);
    }
    p.disc(cx, cy, r, pack(rgb('#f3efdc')));
    p.disc(cx - 3, cy - 1, r - 1, pack(rgb('#f3efdc')));
    p.disc(cx + 3, cy - 2, r - 1, pack(mixRgb(rgb('#f3efdc'), L.sky[1], 0.12)));
    for (const [dx, dy] of [[-2, 1], [1, 3], [2, -2]]) p.set(cx + dx, cy + dy, pack(rgb('#d4cfb8')));
  }
  return p;
}

function makeClouds(W, L, rnd, yMin, yMax, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    // A cumulus: a row of puffs along a flat base, with one or two taller puffs on top.
    const w = 30 + Math.floor(rnd() * 34), h = 12 + Math.floor(rnd() * 8);
    const blobs = [];
    const n = 3 + Math.floor(rnd() * 3);
    for (let b = 0; b < n; b++) { const r = 3.5 + rnd() * 3; blobs.push([r + 1 + (w - 2 * r - 2) * (b / (n - 1)), h - r - 1, r]); }
    for (let b = 0; b < 1 + Math.floor(rnd() * 2); b++) { const r = h * 0.32 + rnd() * h * 0.12; blobs.push([w * (0.3 + rnd() * 0.4), h - r - 3 - rnd() * 2, r]); }
    const inside = (x, y) => y >= 0 && y < h - 1 && blobs.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
    const s = sprite(w, h, p => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        let c = L.cloud[1];
        if (!inside(x, y - 1) || !inside(x, y - 2) || (!inside(x - 2, y - 1) && bay(x, y) < 0.5)) c = L.cloud[0];
        const belly = h - 1 - y;
        if (belly <= 2 || (belly === 3 && bay(x, y) < 0.5)) c = L.cloud[2];
        p.set(x, y, c);
      }
    });
    list.push({ s, x0: rnd() * (W + w), y: yMin + Math.floor(rnd() * (yMax - yMin)), v: 0.05 + rnd() * 0.08 });
  }
  return list;
}

// Clouds drift through the open sky beyond the greeting's corner and dissolve at its edge.
function drawClouds(out, clouds, W, t, q = 0) {
  for (const c of clouds) {
    const span = W - q + c.s.w * 2;
    const x0 = Math.round(q - c.s.w + ((c.x0 + t * c.v) % span));
    for (let sy = 0; sy < c.s.h; sy++) for (let sx = 0; sx < c.s.w; sx++) {
      const col = c.s.d[sy * c.s.w + sx], x = x0 + sx, y = c.y + sy;
      if (!col || x < q || (x < q + 18 && bay(x, y) > (x - q) / 18)) continue;
      out.set(x, y, col);
    }
  }
}

function makeStars(W, L, rnd, yMax) {
  return Array.from({ length: L.stars }, () => ({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * yMax * (0.4 + rnd() * 0.6)), b: rnd(), p: 6 + Math.floor(rnd() * 14) }));
}

function drawStars(out, stars, t, faint) {
  const bright = pack(rgb('#fff6dc')), dim = pack(rgb('#9aa6d8'));
  stars.forEach((s, i) => {
    if (faint && s.y > faint) return;
    const on = hash(i, Math.floor((t + i * 3) / s.p)) > 0.18;
    if (!on && s.b < 0.7) return;
    out.set(s.x, s.y, s.b > 0.75 && on ? bright : dim);
    if (s.b > 0.93 && on) { out.set(s.x - 1, s.y, dim); out.set(s.x + 1, s.y, dim); out.set(s.x, s.y - 1, dim); out.set(s.x, s.y + 1, dim); }
  });
}

// A flock that crosses the sky every half minute or so.
function drawBirds(out, W, t, y0, c, seed = 1) {
  const cycle = 380, f = (t + seed * 97) % cycle;
  if (f > 200) return;
  for (let i = 0; i < 4; i++) {
    const x = Math.round(-12 + f * (W + 24) / 200 - i * 7 - (i % 2) * 3);
    const y = Math.round(y0 + Math.sin((f + i * 9) / 9) * 1.5 + i * 2 - (i % 2) * 4);
    const up = Math.floor((t + i * 2) / 3) % 2;
    out.set(x, y, c);
    out.set(x - 1, y - up, c); out.set(x + 1, y - up, c);
    if (!up) { out.set(x - 2, y - 1, c); out.set(x + 2, y - 1, c); }
  }
}

function ridge(rnd, W, base, lo, hi, rough) {
  const n = 1 << Math.ceil(Math.log2(W + 2 * M + 2));
  const a = new Float32Array(n + 1);
  a[0] = lo + rnd() * (hi - lo); a[n] = lo + rnd() * (hi - lo);
  for (let step = n; step > 1; step >>= 1) {
    for (let i = step >> 1; i < n; i += step) a[i] = (a[i - (step >> 1)] + a[i + (step >> 1)]) / 2 + (rnd() - 0.5) * rough * step;
  }
  return x => Math.max(Math.min(base, Math.round(a[Math.max(0, Math.min(n, x + M))])), 0);
}

function pine(p, x, base, h, c, shade, trunk) {
  p.rect(x, base - 3, 1, 3, trunk);
  const tiers = h > 18 ? 3 : 2;
  for (let y = 0; y < h - 2; y++) {
    const tier = Math.floor((y / (h - 2)) * tiers), within = (y / (h - 2)) * tiers - tier;
    const half = Math.max(0, Math.round((tier + 1) * (h / 12) * (0.35 + within * 0.75)));
    const yy = base - h + y;
    p.rect(x - half, yy, half * 2 + 1, 1, c);
    if (half > 1) p.rect(x + 1, yy, half, 1, shade);
  }
}

// The vertical stripes of a hanging fabric fold.
const FOLD = [0, 1, 1, 2, 1, 1, 2, 2, 1, 0, 1, 2];

// ---------- room: a desk by the window ----------

function room(c) {
  const { W, L, rnd, fx, wide, clock } = c;
  const ww = wide ? Math.min(146, Math.round(W * 0.33)) : Math.min(W - 52, 118);
  const wh = 70, wx = Math.round(fx - ww / 2), wy = 16, deskY = 104;
  const lit = L.lit, ink = lit('#2b1f2a');

  // What's outside the window: the town at the bottom of the panes.
  const city = new Px(W + 2 * M, H, M);
  const base = wy + wh;
  for (let x = wx - 12; x < wx + ww + 12;) {
    const bw = 6 + Math.floor(rnd() * 12), bh = 6 + Math.floor(rnd() * 22);
    const col = L.far[1 + Math.floor(rnd() * 2)];
    city.rect(x, base - bh, bw, bh, col);
    if (rnd() < 0.3) city.rect(x + 2, base - bh - 3, 1, 3, col);
    for (let yy = base - bh + 2; yy < base - 2; yy += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) {
      if (L.lights && hash(xx, yy) < 0.32) city.set(xx, yy, L.em(hash(yy, xx) < 0.5 ? '#ffd88a' : '#ffe9b8'));
      else if (!L.lights && hash(xx, yy) < 0.18) city.set(xx, yy, mixC(col, pack(rgb('#ffffff')), 0.25));
    }
    x += bw + (rnd() < 0.3 ? 2 : 0);
  }
  const tree = L.lit('#5c7c4c');
  city.disc(wx + ww - 18, base - 12, 9, tree); city.disc(wx + ww - 8, base - 8, 7, tree); city.rect(wx + ww - 14, base - 6, 2, 6, lit('#5a3e2e'));

  // The room.
  const r = new Px(W + 2 * M, H, M);
  const wall = lit('#e6d2b9'), wallShade = lit('#d6bfa3'), wallDark = lit('#c4ab8e');
  r.full(0, H, wall);
  r.drect(-M, 0, W + 2 * M, 5, wallShade, 0.5);
  r.full(0, 2, wallShade);
  // Plaster texture, very quiet.
  for (let i = 0; i < W * 0.6; i++) r.set(Math.floor(rnd() * W), Math.floor(rnd() * deskY), wallShade);
  // Wallpaper: a small repeating sprig, barely darker than the wall.
  for (let y = 10; y < deskY - 4; y += 10) for (let x = ((y / 10) % 2) * 6 - 6; x < W + 6; x += 12) { r.set(x, y, wallShade); r.set(x - 1, y + 1, wallShade); r.set(x + 1, y + 1, wallShade); r.set(x, y + 2, wallShade); }

  const wood = lit('#8a5a3d'), woodHi = lit('#b07a52'), woodLo = lit('#5f3b28');
  r.rect(wx - 5, wy - 5, ww + 10, wh + 10, woodLo);
  r.rect(wx - 4, wy - 4, ww + 8, wh + 8, wood);
  r.rect(wx - 4, wy - 4, ww + 8, 1, woodHi); r.rect(wx - 4, wy - 4, 1, wh + 8, woodHi);
  const mid = Math.round(wx + ww / 2), cross = wy + Math.round(wh * 0.44);
  r.rect(wx, wy, ww, wh, 0);
  r.rect(mid - 1, wy, 3, wh, wood); r.set(mid - 1, wy, woodHi); r.rect(mid - 1, wy, 1, wh, woodHi);
  r.rect(wx, cross, ww, 3, wood); r.rect(wx, cross, ww, 1, woodHi);
  // Sill.
  r.rect(wx - 9, base + 4, ww + 18, 3, woodHi); r.rect(wx - 9, base + 6, ww + 18, 1, wood);
  r.drect(wx - 9, base + 7, ww + 18, 2, wallDark, 0.5);

  // Curtains, tied back.
  const curtain = [lit('#e9a79a'), lit('#d48479'), lit('#b0635d')];
  const rodY = wy - 11;
  r.rect(wx - 30, rodY, ww + 60, 2, lit('#6b4a2e')); r.rect(wx - 30, rodY, ww + 60, 1, lit('#a07646'));
  r.disc(wx - 31, rodY + 1, 2, lit('#c99b52')); r.disc(wx + ww + 30, rodY + 1, 2, lit('#c99b52'));
  const tieY = wy + 44;
  for (const side of [-1, 1]) {
    const outer = side < 0 ? wx - 24 : wx + ww + 24;
    for (let y = rodY + 2; y < deskY - 4; y++) {
      const gather = y < tieY ? 1 - ((y - rodY) / (tieY - rodY)) * 0.45 : 0.55 + Math.min(0.45, ((y - tieY) / 30) * 0.45);
      const width = Math.round(20 * gather);
      for (let i = 0; i < width; i++) r.set(outer - side * i, y, curtain[FOLD[(i + (y > tieY ? 1 : 0)) % FOLD.length]]);
      r.set(outer - side * width, y, curtain[2]);
    }
    r.rect(outer - side * 12 - 6, tieY, 13, 2, lit('#c99b52'));
  }

  // The desk runs the whole width.
  const top = lit('#a8714a'), topHi = lit('#c78e60'), front = lit('#7a4c33'), frontLo = lit('#5c3826');
  r.full(deskY, 1, topHi); r.full(deskY + 1, 3, top); r.full(deskY + 4, 1, frontLo); r.full(deskY + 5, H - deskY - 5, front);
  for (let x = wx - 40; x < W + 40; x += 64) { r.rect(x, deskY + 10, 44, 1, frontLo); r.rect(x + 20, deskY + 13, 4, 1, lit('#c99b52')); }
  r.drect(-M, deskY + 5, W + 2 * M, 3, frontLo, 0.5);

  // Plant on the sill.
  const potX = wx + 8;
  r.poly([[potX, base - 2], [potX + 9, base - 2], [potX + 8, base + 4], [potX + 1, base + 4]], lit('#c46a46'));
  r.rect(potX, base - 2, 9, 1, lit('#d9845c'));
  const leaf = [lit('#5f9a52'), lit('#447a3e'), lit('#7cb866')];
  [[-4, -8, 4, 2], [5, -11, 4, 2.5], [1, -15, 3, 2], [9, -6, 3.5, 2], [-1, -4, 3, 1.5]].forEach(([dx, dy, rx, ry], i) => r.ellipse(potX + 4 + dx, base + dy, rx, ry, leaf[i % 3]));
  r.line(potX + 4, base - 2, potX + 1, base - 12, leaf[1]);

  // Lamp, mug, notebook, books.
  const lampX = wx - 36;
  r.ellipse(lampX, deskY - 1, 6, 1.5, lit('#3a3036'));
  r.rect(lampX, deskY - 24, 1, 23, lit('#4a3e44'));
  r.line(lampX, deskY - 24, lampX + 7, deskY - 30, lit('#4a3e44'));
  const shade = lit('#d9a441'), shadeLo = lit('#a8772a');
  r.poly([[lampX + 4, deskY - 33], [lampX + 11, deskY - 33], [lampX + 16, deskY - 24], [lampX - 1, deskY - 24]], shade);
  r.rect(lampX - 1, deskY - 25, 17, 1, shadeLo); r.rect(lampX + 4, deskY - 33, 7, 1, lit('#f0c56a'));

  const mugX = fx - 13;
  const mug = sprite(10, 10, p => {
    p.rect(1, 1, 7, 9, lit('#f1ebde')); p.rect(1, 4, 7, 2, lit('#5d86b6')); p.rect(1, 1, 7, 1, lit('#4a2c1e')); p.rect(7, 2, 1, 8, lit('#d9d0bf'));
    p.set(8, 3, lit('#e2dacb')); p.set(9, 4, lit('#e2dacb')); p.set(9, 5, lit('#e2dacb')); p.set(8, 6, lit('#e2dacb'));
  }).outline(ink);
  r.blit(mug, mugX - M, deskY - 10);

  // The laptop the brief is written on.
  const lapX = fx - 50;
  r.poly([[lapX - 1, deskY], [lapX + 31, deskY], [lapX + 29, deskY - 3], [lapX + 1, deskY - 3]], lit('#b4b8c4'));
  r.rect(lapX + 1, deskY - 3, 28, 1, lit('#d9dce4'));
  for (let k = 0; k < 6; k++) r.rect(lapX + 5 + k * 4, deskY - 2, 3, 1, lit('#8f93a0'));
  r.rect(lapX + 2, deskY - 22, 26, 19, lit('#4a4d5a')); r.rect(lapX + 2, deskY - 22, 26, 1, lit('#6a6e7c'));
  r.rect(lapX + 4, deskY - 20, 22, 15, lit('#2c3244'));
  r.line(lapX + 6, deskY - 18, lapX + 11, deskY - 13, lit('#46506a'));

  // A snake plant at the far end of the desk.
  const spX = wx - 62;
  r.poly([[spX, deskY - 9], [spX + 11, deskY - 9], [spX + 10, deskY], [spX + 1, deskY]], lit('#d9d3c6'));
  r.rect(spX, deskY - 9, 11, 1, lit('#f0ece2')); r.rect(spX + 1, deskY - 5, 10, 1, lit('#bfb7a6'));
  [[2, 22, -1], [4, 30, 0], [6, 26, 1], [8, 19, 1], [5, 16, -1]].forEach(([dx, h, lean], i) => {
    for (let y = 0; y < h; y++) {
      const x = spX + dx + Math.round(lean * (y / h) * (y / h) * 3);
      const yy = deskY - 9 - y, wdt = y > h - 3 ? 1 : 2;
      r.rect(x, yy, wdt, 1, i % 2 ? lit('#3f7a46') : lit('#4f8f52'));
      if (wdt === 2 && y % 5 === 2) r.set(x + 1, yy, lit('#7fb46a'));
      if (y < h - 2) r.set(x - 1 + (i % 2) * 3, yy, lit('#c9c46a'));
    }
  });

  const bx = wx + ww + 14;
  [[22, '#b8544a'], [19, '#4f7a8c'], [21, '#d6a85a'], [16, '#7b6aa6']].forEach(([w, col], i) => {
    const y = deskY - 3 - i * 3, x = bx + (i % 2) * 2;
    r.rect(x, y, w, 3, lit(col)); r.rect(x, y, w, 1, mixC(lit(col), pack(rgb('#ffffff')), 0.25)); r.rect(x + w - 2, y + 1, 2, 1, lit('#f0e8d6'));
  });

  // Wall clock that shows when this page was written.
  const cx = wx + ww + 34, cy = 40;
  if (cx < W - 6) {
    r.disc(cx, cy, 9, lit('#3d2f2a')); r.disc(cx, cy, 8, lit('#a8714a')); r.disc(cx, cy, 7, lit('#f6efe0'));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (k % 3 === 0) r.set(cx + Math.round(Math.sin(a) * 6), cy - Math.round(Math.cos(a) * 6), lit('#6a5a50')); }
    const ha = ((clock.h % 12) + clock.m / 60) / 12 * Math.PI * 2, ma = (clock.m / 60) * Math.PI * 2;
    r.line(cx, cy, cx + Math.round(Math.sin(ha) * 3.5), cy - Math.round(Math.cos(ha) * 3.5), lit('#2b1f2a'));
    r.line(cx, cy, cx + Math.round(Math.sin(ma) * 5.5), cy - Math.round(Math.cos(ma) * 5.5), lit('#2b1f2a'));
    r.set(cx, cy, lit('#b8544a'));
  }

  // A framed picture and a shelf where the wall is wide enough.
  if (wide && cx + 50 < W) {
    const px = cx + 24, py = 26;
    r.rect(px, py, 28, 22, lit('#3d2f2a')); r.rect(px + 2, py + 2, 24, 18, lit('#bcd3d9'));
    r.poly([[px + 2, py + 20], [px + 10, py + 9], [px + 17, py + 20]], lit('#7f9a8a')); r.poly([[px + 12, py + 20], [px + 19, py + 12], [px + 26, py + 20]], lit('#5f7d6c'));
    r.disc(px + 20, py + 6, 2, lit('#f1d48c'));
  }
  if (wide && wx > 150) {
    const sx = 26, sy = deskY - 14, sw = Math.min(110, wx - 90);
    r.rect(sx, sy, sw, 2, woodHi); r.rect(sx, sy + 2, sw, 1, woodLo);
    r.rect(sx + 6, sy + 3, 2, 4, woodLo); r.rect(sx + sw - 8, sy + 3, 2, 4, woodLo);
    [['#c96b5d', 10], ['#e6c070', 8], ['#6b8fb0', 11], ['#9d7bb0', 9]].forEach(([col, hgt], i) => { r.rect(sx + 10 + i * 4, sy - hgt, 3, hgt, lit(col)); r.rect(sx + 10 + i * 4, sy - hgt, 3, 1, mixC(lit(col), pack(rgb('#ffffff')), 0.3)); });
    r.poly([[sx + 34, sy - 5], [sx + 41, sy - 5], [sx + 40, sy], [sx + 35, sy]], lit('#d7c2a4'));
    for (let i = 0; i < 4; i++) r.line(sx + 37, sy - 5, sx + 33 + i * 3, sy - 13 + (i % 2) * 2, leaf[i % 3]);
    if (sw > 70) { r.poly([[sx + sw - 30, sy - 7], [sx + sw - 20, sy - 7], [sx + sw - 21, sy], [sx + sw - 29, sy]], lit('#7f9a8a')); r.ellipse(sx + sw - 25, sy - 10, 5, 3, leaf[0]); r.ellipse(sx + sw - 25, sy - 12, 3, 2, leaf[2]); }
  }

  // Cat asleep on the desk; two frames for breathing, one for the tail.
  const catX = fx + 14;
  const cat = (breath, tail) => sprite(24, 12, p => {
    const o = lit('#e39a52'), od = lit('#c27434'), ol = lit('#f6c690'), pk = lit('#e78d8f');
    p.ellipse(10, 8, 8.5, 3.5 + breath * 0.5, o);
    for (let x = 4; x < 17; x += 3) { p.set(x, 5 + (breath ? 0 : 1), od); p.set(x, 6, od); }
    p.rect(4, 11, 13, 1, ol);
    p.disc(18, 7, 3.6, o); p.set(16, 3, o); p.set(16, 2, o); p.set(17, 3, o); p.set(20, 3, o); p.set(20, 2, o); p.set(19, 3, o); p.set(16, 3, pk); p.set(20, 3, pk);
    p.rect(17, 7, 2, 1, lit('#5a3424')); p.set(21, 8, pk); p.rect(19, 9, 3, 1, ol);
    if (tail) { p.line(2, 10, 1, 7, od); p.set(1, 6, od); } else p.line(2, 10, 9, 11, od);
    p.set(2, 10, od);
  }).outline(ink);
  const catFrames = [cat(0, 0), cat(1, 0), cat(1, 1)];

  // String lights draped across the curtain rod.
  const slots = [];
  const sx0 = wx - 28, sx1 = wx + ww + 28;
  const wire = lit('#3b3236');
  let prevY = null;
  for (let x = sx0; x <= sx1; x++) {
    const u = (x - sx0) / (sx1 - sx0), seg = (u * 4) % 1;
    const y = Math.round(rodY + 3 + Math.sin(seg * Math.PI) * 6);
    r.set(x, y, wire); if (prevY != null && Math.abs(prevY - y) > 1) r.set(x, (y + prevY) >> 1, wire);
    prevY = y;
  }
  slots.push({ x: lapX + 4, y: deskY - 20, w: 22, h: 15, c: '#f6ecd4', glow: 16, k: 0.7, doc: true });
  const BULBS = ['#ffd27a', '#ff9f8f', '#9fe3c4', '#ffe7a8', '#a9c8ff'];
  for (let i = 0, x = sx0 + 5; x < sx1 - 3; x += 9, i++) {
    const u = (x - sx0) / (sx1 - sx0), seg = (u * 4) % 1;
    const y = Math.round(rodY + 4 + Math.sin(seg * Math.PI) * 6);
    r.rect(x, y, 2, 2, lit('#6e6670'));
    slots.push({ x, y, w: 2, h: 2, c: BULBS[i % BULBS.length], glow: 6, k: 0.8 });
  }
  slots.push({ x: lampX + 1, y: deskY - 24, w: 14, h: 1, c: '#ffe6a6', glow: 18, k: 0.75, pool: [lampX + 7, deskY - 1, 14] });

  // Sun through the glass during the day.
  const beam = !L.dark && L.time !== 'dawn' && L.over < 0.4;
  const motes = Array.from({ length: 14 }, () => [rnd(), rnd(), rnd()]);

  return {
    slots,
    horizon: base + 6,
    clouds: [wy, wy + 28],
    starsMax: base,
    layers: [{ p: city, depth: 1 }, { p: r, depth: 3 }],
    sky(out, t) { drawBirds(out, W, t, wy + 14, L.far[2], 3); },
    top(out, t, sh) {
      // Glass glints.
      for (const [gx, gy] of [[wx + 6, wy + 6], [mid + 6, wy + 4]]) for (let i = 0; i < 7; i++) if (bay(i, i) < 0.6) out.tint(gx + i + sh, gy + i, pack(rgb('#ffffff')), 0.25);
      if (beam) {
        for (let y = base + 8; y < H; y++) {
          const k = (y - base) / (H - base), x0 = wx + 4 - k * 52, x1 = wx + ww - 10 - k * 52;
          for (let x = Math.round(x0); x < x1; x++) if (bay(x, y) < 0.5) out.tint(x + sh, y, pack(rgb('#fff1cf')), 0.18);
        }
        motes.forEach(([a, b, s], i) => {
          const y = base + 12 + ((b * 30 + t * (0.15 + s * 0.2)) % 30), k = (y - base) / (H - base);
          const x = wx + 6 + a * (ww - 20) - k * 52 + Math.sin(t / 10 + i) * 2;
          if (hash(i, Math.floor(t / 8)) > 0.3) out.set(Math.round(x + sh), Math.round(y), pack(rgb('#fff6dc')));
        });
      }
      // The cat breathes; the tail flicks now and then.
      const f = Math.floor(t / 18) % 2, flick = (t % 160) > 150;
      out.blit(catFrames[flick ? 2 : f], catX + sh, deskY - 11);
      // Steam from the mug.
      steam(out, mugX + 4 + sh, deskY - 9, t, pack(rgb('#ffffff')), L.dark ? 0.22 : 0.4);
    },
  };
}

function steam(out, x, y, t, c, k) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 10; j++) {
      const phase = (t * 0.6 + i * 11 + j * 2) % 22;
      const yy = y - phase, xx = x + Math.round(Math.sin(phase / 3 + i * 2) * 1.6) + (i - 1);
      const fade = 1 - phase / 22;
      if (bay(xx, Math.round(yy)) < fade * 0.8) out.tint(xx, Math.round(yy), c, k * fade + 0.1);
    }
  }
}

// ---------- rooftop: a Riyadh roof at golden hour, coffee on a Sadu rug ----------

function rooftop(c) {
  const { W, L, rnd, fx, wide } = c;
  const lit = L.lit, ink = lit('#2b1f22');
  const horizon = 96, wallTop = 86, floorY = 112;

  // Skyline.
  const far = new Px(W + 2 * M, H, M);
  const fc = L.far;
  for (let x = -M; x < W + M;) {
    const bw = 5 + Math.floor(rnd() * 14), bh = 3 + Math.floor(rnd() * 12);
    far.rect(x, horizon - bh, bw, bh + 8, fc[1]);
    if (L.lights) for (let yy = horizon - bh + 2; yy < horizon; yy += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (hash(xx, yy) < 0.28) far.set(xx, yy, L.em('#ffd391'));
    x += bw;
  }
  // Kingdom Centre: the tower with the arch near the top.
  // The top is an upturned parabola cut out of the tower, open to the sky, with the skybridge across it.
  const kx = wide ? Math.round(W * 0.88) : Math.round(W * 0.82), ktop = 30, open = 24;
  for (let y = ktop; y < horizon; y++) {
    const u = (y - ktop) / (horizon - ktop);
    const half = Math.round(6 + u * 4);
    far.rect(kx - half, y, half * 2 + 1, 1, fc[2]);
    if (y < ktop + open) {
      const gap = Math.round(Math.pow(1 - (y - ktop) / open, 0.55) * (half - 1.6));
      if (gap > 0) far.rect(kx - gap, y, gap * 2 + 1, 1, 0);
      if (L.lights && gap > 0) { far.set(kx - gap - 1, y, L.em('#8fb4ff')); far.set(kx + gap + 1, y, L.em('#8fb4ff')); }
    }
  }
  far.rect(kx - 6, ktop + 8, 13, 2, fc[2]);
  if (L.lights) far.rect(kx - 4, ktop + 8, 9, 1, L.em('#c9d8ff'));
  for (let y = ktop + open + 4; y < horizon - 2; y += 4) far.rect(kx - 4, y, 9, 1, mixC(fc[2], fc[0], 0.3));
  // Al Faisaliah: the slender pyramid with the golden ball.
  const ax = wide ? Math.round(fx - 92) : Math.round(W * 0.16), atop = 46;
  far.poly([[ax, atop], [ax + 8, horizon + 2], [ax - 8, horizon + 2]], fc[2]);
  far.disc(ax, atop + 16, 3, L.dark ? L.em('#f5c66a') : lit('#d9a94f'));
  far.rect(ax, atop - 6, 1, 6, fc[2]);
  if (L.lights) far.set(ax, atop - 6, L.em('#ff6b5c'));

  // Palms behind the parapet.
  const mid = new Px(W + 2 * M, H, M);
  const palmAt = wide ? [fx - 52, fx + 46, Math.min(W - 8, fx + 128)] : [Math.round(W * 0.22), Math.round(W * 0.8)];
  palmAt.forEach((px, i) => palm(mid, px, wallTop + 4, 40 + i * 6 - (i === 2 ? 14 : 0), lit, rnd, i % 2 ? 1 : -1));

  // Najdi mud-brick parapet with triangular crenellations.
  const near = new Px(W + 2 * M, H, M);
  const mud = lit('#c99a69'), mudHi = lit('#ddb584'), mudLo = lit('#a97b50'), hole = lit('#5a3826');
  near.full(wallTop, floorY - wallTop, mud);
  near.full(wallTop, 1, mudHi);
  for (let x = -M; x < W + M; x += 10) {
    near.poly([[x + 1, wallTop], [x + 5, wallTop - 6], [x + 9, wallTop]], mud);
    near.set(x + 5, wallTop - 6, mudHi); near.line(x + 2, wallTop - 1, x + 5, wallTop - 5, mudHi);
    near.poly([[x + 3, wallTop + 9], [x + 5, wallTop + 6], [x + 7, wallTop + 9]], hole);
  }
  for (let x = -M; x < W + M; x += 3) for (let y = wallTop + 1; y < floorY; y++) if (hash(x * 7 + y, y) < 0.06) near.set(x + Math.floor(hash(y, x) * 3), y, mudLo);
  near.full(wallTop + 13, 1, mudLo); near.drect(-M, wallTop + 14, W + 2 * M, 2, mudLo, 0.5);
  for (let x = 30; x < W; x += 120) { near.rect(x, wallTop + 4, 6, 2, lit('#6b4a2e')); near.rect(x + 6, wallTop + 5, 2, 1, lit('#4a3020')); }
  // Roof floor.
  const floor = lit('#dcb98a'), floorLo = lit('#c9a575');
  near.full(floorY, H - floorY, floor);
  near.drect(-M, floorY, W + 2 * M, 4, floorLo, 0.6);
  for (let i = 0; i < W; i++) near.set(Math.floor(rnd() * W), floorY + 4 + Math.floor(rnd() * (H - floorY - 4)), floorLo);

  const red = lit('#a3302d'), blk = lit('#2a1d1d'), wht = lit('#efe3cf'), ochre = lit('#d39b3c');
  // Majlis cushions along the wall.
  const cush = lit('#8a2a33'), cushHi = lit('#b0434a'), cushLo = lit('#5e1c25');
  for (let x = -M + 2; x < W + M; x += 22) {
    near.rect(x, floorY - 12, 20, 13, cush); near.rect(x, floorY - 12, 20, 2, cushHi); near.rect(x + 19, floorY - 10, 1, 11, cushLo);
    for (let k = 0; k < 20; k += 4) { near.set(x + k + 1, floorY - 6, ochre); near.set(x + k + 2, floorY - 7, wht); near.set(x + k + 3, floorY - 6, ochre); }
    near.rect(x, floorY - 3, 20, 1, blk);
  }
  near.full(floorY + 1, 1, lit('#b48d62'));
  // Bougainvillea spilling over the wall.
  const bloom = [lit('#d2367a'), lit('#e95f9b'), lit('#a8235f')], bleaf = lit('#4f7d3e');
  for (const bx0 of wide ? [Math.round(W * 0.03), fx + 70] : [Math.round(W * 0.7)]) {
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI, rr = rnd() * 12;
      const x = bx0 + Math.cos(a) * rr * 1.6, y = wallTop - 3 + Math.sin(a) * rr * 0.5 + rnd() * 10;
      near.set(x, y, i % 4 ? bloom[i % 3] : bleaf);
    }
  }

  // Sadu rug with coffee: dallah, cups, a tray, an incense burner.
  const rx = fx - (wide ? 58 : 40), rw = wide ? 124 : 84, ry = floorY + 7, rh = H - ry - 3;
  near.poly([[rx + 8, ry], [rx + rw - 8, ry], [rx + rw, ry + rh], [rx, ry + rh]], red);
  for (let y = ry; y < ry + rh; y++) {
    const inset = Math.round(8 - ((y - ry) / rh) * 8);
    for (let x = rx + inset; x < rx + rw - inset; x++) {
      const v = y - ry, e = Math.min(v, rh - 1 - v);
      if (e === 1) near.set(x, y, blk);
      else if (e === 3) near.set(x, y, (x + v) % 4 < 2 ? wht : blk);
      else if (e >= 5) { const k = Math.abs(((x - rx) % 10) - 5), m = Math.abs(v - rh / 2); if (k <= m * 0.9 + 0.5 && k > m * 0.9 - 1.5) near.set(x, y, k < 2 ? ochre : wht); }
    }
  }
  near.rect(rx + 6, ry - 1, rw - 12, 1, lit('#c9b59a'));
  for (let x = rx; x < rx + rw; x += 2) near.set(x, ry + rh, wht);
  const tray = lit('#b98b3e');
  near.ellipse(fx + 14, ry + 6, 14, 3, tray); near.ellipse(fx + 14, ry + 5, 13, 2, lit('#d8ad5a'));
  const dallah = sprite(14, 18, p => {
    const b = lit('#d4a24a'), bh = lit('#f0cf7e'), bl = lit('#a8772a');
    p.ellipse(6, 13, 4.5, 4, b); p.rect(4, 6, 5, 6, b); p.ellipse(6, 5, 3, 1.5, b); p.rect(5, 1, 3, 4, b); p.set(6, 0, bl);
    p.rect(4, 7, 1, 9, bh); p.rect(8, 8, 1, 7, bl);
    p.line(9, 9, 12, 5, b); p.set(12, 4, b); p.set(13, 4, b);
    p.line(1, 7, 1, 14, bl); p.set(2, 6, bl); p.set(2, 15, bl);
  }).outline(ink);
  near.blit(dallah, fx + 2 - M, ry - 13);
  for (const dx of [18, 24]) { near.rect(fx + dx, ry + 1, 4, 3, lit('#f6f1e6')); near.rect(fx + dx, ry + 1, 4, 1, lit('#a25a2a')); near.set(fx + dx - 1, ry + 1, ink); near.set(fx + dx + 4, ry + 1, ink); }
  near.rect(fx + 30, ry + 1, 6, 3, lit('#5d3a6a')); near.rect(fx + 31, ry, 4, 1, lit('#3f2050'));
  const incX = fx - 26;
  const mabkhara = sprite(9, 11, p => {
    const wd = lit('#6b3f2a'), br = lit('#d4a24a');
    p.rect(1, 2, 7, 3, wd); p.rect(1, 2, 7, 1, br); p.rect(3, 5, 3, 3, wd); p.rect(1, 8, 7, 3, wd); p.rect(1, 8, 7, 1, br);
    p.set(3, 1, lit('#ff9a4a')); p.set(5, 1, lit('#ffcf6a'));
  }).outline(ink);
  near.blit(mabkhara, incX - M, ry + 2);

  // Lanterns: one on the floor, a string along the parapet.
  const slots = [];
  const lx = rx - 30;
  const lantern = sprite(9, 15, p => {
    const fr = lit('#3e3034');
    p.rect(1, 3, 7, 10, fr); p.rect(2, 4, 5, 8, lit('#6a4a3a')); p.rect(0, 13, 9, 2, fr); p.poly([[1, 3], [4, 0], [8, 3]], fr); p.set(4, 0, lit('#c99b52'));
  }).outline(ink);
  near.blit(lantern, lx - M, floorY + 2);
  const garland = lit('#3b2f2a');
  for (let x = -M; x < W + M; x++) {
    const seg = ((x + 1000) % 40) / 40;
    const y = Math.round(wallTop - 8 + Math.sin(seg * Math.PI) * 4);
    near.set(x, y, garland);
  }
  for (let x = 6, i = 0; x < W; x += 10, i++) {
    const seg = ((x + 1000) % 40) / 40, y = Math.round(wallTop - 7 + Math.sin(seg * Math.PI) * 4);
    near.rect(x, y, 2, 2, lit('#6e6266'));
    slots.push({ x, y, w: 2, h: 2, c: i % 3 === 0 ? '#ffd27a' : i % 3 === 1 ? '#ffb07a' : '#fff0c2', glow: 6, k: 0.8 });
  }
  slots.push({ x: lx + 2, y: floorY + 6, w: 5, h: 8, c: '#ffd68a', glow: 26, k: 1 });

  return {
    slots, horizon, clouds: [24, 50], starsMax: horizon,
    layers: [{ p: far, depth: 1 }, { p: mid, depth: 2 }, { p: near, depth: 3 }],
    sky(out, t) {
      if (!L.dark) drawBirds(out, W, t, 40, L.far[2], 7);
      if (L.time === 'night') { const f = (t * 0.35) % (W + 40); const y = 22 + Math.round(f / 60); if (Math.floor(t / 6) % 2) out.set(Math.round(W - f), y, pack(rgb('#ff6b5c'))); else out.set(Math.round(W - f), y, pack(rgb('#ffffff'))); }
    },
    top(out, t, sh) {
      steam(out, fx + 13 + sh, ry - 12, t, pack(rgb('#ffffff')), L.dark ? 0.2 : 0.35);
      steam(out, incX + 4 + sh, ry + 1, t + 9, pack(rgb('#e8e2f0')), L.dark ? 0.3 : 0.45);
    },
  };
}

function palm(p, x, base, h, lit, rnd, lean) {
  const bark = [lit('#7a5a3c'), lit('#5e4430')];
  let tx = x, ty = base;
  const pts = [];
  for (let i = 0; i < h; i++) {
    const u = i / h;
    tx = x + Math.round(lean * Math.sin(u * 1.4) * 6);
    ty = base - i;
    p.rect(tx - 1, ty, 3, 1, bark[(i >> 1) % 2]);
    pts.push([tx, ty]);
  }
  const [hx, hy] = pts[pts.length - 1];
  const fronds = [lit('#5a8a42'), lit('#3f6a33'), lit('#7aac56'), lit('#2f5228')];
  // Fronds arch up and out from the crown, then fall; leaflets hang off each spine.
  const angles = [-2.9, -2.45, -2.0, -1.6, -1.2, -0.75, -0.3, 2.75, 0.4];
  angles.forEach((a0, f) => {
    const a = a0 + (rnd() - 0.5) * 0.12, len = 15 + rnd() * 6, droop = 0.5 + rnd() * 0.25 + (Math.abs(Math.cos(a)) > 0.8 ? 0.25 : 0);
    const spine = fronds[f % 2 ? 0 : 2];
    for (let s = 0; s <= len; s += 0.5) {
      const u = s / len;
      const xx = hx + Math.cos(a) * s * 1.2, yy = hy + Math.sin(a) * s * 0.8 + u * u * len * droop;
      p.set(xx, yy, spine);
      if (s > 2 && (s * 2) % 3 === 0) {
        const leaf = Math.round((1 - u) * 4 + 1);
        for (let k = 1; k <= leaf; k++) p.set(xx + (Math.cos(a) > 0 ? -0.4 : 0.4) * k, yy + k, k > leaf - 1 ? fronds[3] : fronds[1]);
      }
    }
  });
  p.disc(hx, hy + 1, 2, lit('#6b4a2e'));
  for (const dx of [-2, 0, 2]) { p.set(hx + dx, hy + 3, lit('#c4782f')); p.set(hx + dx + 1, hy + 4, lit('#a85f22')); }
}

// ---------- cabin: a lake, pines and a lit window ----------

function cabin(c) {
  const { W, L, rnd, fx, wide } = c;
  const lit = L.lit, ink = lit('#231c22');
  const water = 102, shore = 126;

  const mtn = new Px(W + 2 * M, H, M);
  const r1 = ridge(rnd, W, water, 34, 70, 0.55), r2 = ridge(rnd, W, water, 58, 86, 0.45);
  const snow = L.dark ? lit('#c9d2ea') : lit('#f4f6f8');
  const rim = mixC(L.far[0], pack(L.sky[L.sky.length - 1]), 0.35);
  for (let x = -M; x < W + M; x++) {
    const y1 = r1(x);
    mtn.rect(x, y1, 1, water - y1, L.far[0]);
    mtn.set(x, y1, rim);
    for (let y = y1; y < y1 + 4 && y < water; y++) if (y1 < 52 && (y === y1 || bay(x, y) < 0.6 - (y - y1) * 0.15)) mtn.set(x, y, snow);
    // Slopes facing away from the light sit in shade.
    if (r1(x + 2) > r1(x - 2)) mtn.rect(x, y1 + 3, 1, Math.max(0, Math.min(10, water - y1 - 3)), mixC(L.far[0], L.far[1], 0.5));
    const y2 = r2(x);
    mtn.rect(x, y2, 1, water - y2, L.far[1]);
    mtn.set(x, y2, mixC(L.far[1], rim, 0.5));
    if (r2(x + 2) > r2(x - 2)) mtn.rect(x, y2 + 2, 1, Math.max(0, Math.min(8, water - y2 - 2)), mixC(L.far[1], L.far[2], 0.5));
  }

  const trees = new Px(W + 2 * M, H, M);
  const g1 = lit('#2f5a3e'), g1s = lit('#244a33'), trunk = lit('#3a2a22');
  for (let x = -M; x < W + M; x += 3 + Math.floor(rnd() * 4)) pine(trees, x, water + 1, 9 + Math.floor(rnd() * 14), g1, g1s, trunk);

  const near = new Px(W + 2 * M, H, M);
  const grass = lit('#5e8a48'), grassLo = lit('#4a7239'), dirt = lit('#7a5a3e');
  for (let x = -M; x < W + M; x++) {
    const bank = shore + Math.round(Math.sin(x / 23) * 2 + Math.sin(x / 7) * 0.8);
    near.rect(x, bank, 1, H - bank, grass);
    near.set(x, bank, lit('#78a85a'));
    if (hash(x, 3) < 0.25) near.set(x, bank - 1, lit('#78a85a'));
    if (hash(x, 9) < 0.1) near.rect(x, bank - 3, 1, 3, grassLo);
  }
  near.drect(-M, shore + 6, W + 2 * M, H - shore - 6, grassLo, 0.35);

  // The cabin.
  const cw = 46, cxL = Math.round(fx - cw / 2) + (wide ? 24 : 0), cyTop = shore - 22;
  const log = [lit('#8a5b3a'), lit('#6e4630')];
  for (let y = cyTop; y < shore + 2; y++) near.rect(cxL, y, cw, 1, log[((y - cyTop) >> 1) % 2]);
  for (let y = cyTop; y < shore + 2; y += 2) { near.set(cxL - 1, y, log[0]); near.set(cxL + cw, y, log[0]); }
  const roof = lit('#3f3246'), roofHi = lit('#5b4a63');
  near.poly([[cxL - 5, cyTop + 1], [cxL + cw / 2, cyTop - 17], [cxL + cw + 5, cyTop + 1]], roof);
  near.line(cxL - 5, cyTop, cxL + cw / 2, cyTop - 17, roofHi); near.line(cxL + cw / 2, cyTop - 17, cxL + cw + 5, cyTop, roofHi);
  for (let y = cyTop - 12; y < cyTop; y += 3) near.rect(cxL + cw / 2 - (y - cyTop + 17) * 1.2, y, (y - cyTop + 17) * 2.4, 1, mixC(roof, ink, 0.3));
  if (L.weather === 'snow') near.line(cxL - 5, cyTop - 1, cxL + cw / 2, cyTop - 18, pack(rgb('#f4f6f8')));
  const chX = cxL + cw - 12;
  near.rect(chX, cyTop - 16, 5, 10, lit('#7d6a66')); near.rect(chX - 1, cyTop - 17, 7, 2, lit('#5c4c4a'));
  near.rect(cxL + 19, cyTop + 9, 8, 15, lit('#4a2f22')); near.set(cxL + 25, cyTop + 17, lit('#d9a441'));
  const winOff = lit('#2b3550');
  const wins = [[cxL + 6, cyTop + 7], [cxL + 33, cyTop + 7]];
  for (const [x, y] of wins) { near.rect(x - 1, y - 1, 9, 9, lit('#e9dcc4')); near.rect(x, y, 7, 7, winOff); }
  // Dock and a rowboat.
  const dx0 = wide ? cxL - 70 : Math.max(4, cxL - 44), dy = shore - 2;
  near.rect(dx0, dy, cxL - 6 - dx0, 2, lit('#9a7350')); near.rect(dx0, dy, cxL - 6 - dx0, 1, lit('#b88d64'));
  for (let x = dx0 + 2; x < cxL - 8; x += 12) near.rect(x, dy + 2, 1, 6, lit('#5f4430'));
  const boatX = dx0 + 6;
  near.poly([[boatX, shore - 9], [boatX + 18, shore - 9], [boatX + 15, shore - 6], [boatX + 3, shore - 6]], lit('#b8544a'));
  near.rect(boatX + 1, shore - 9, 16, 1, lit('#d9765f'));
  // Big pines flanking the cabin.
  const g2 = lit('#2b5238'), g2s = lit('#1f3f2b');
  pine(near, cxL - 10, shore + 2, 40, g2, g2s, trunk);
  pine(near, cxL + cw + 12, shore + 3, 46, g2, g2s, trunk);
  if (wide) { pine(near, Math.round(W * 0.06), shore + 6, 50, g2, g2s, trunk); pine(near, W - 14, shore + 4, 44, g2, g2s, trunk); }

  const slots = [
    ...wins.map(([x, y]) => ({ x, y, w: 7, h: 7, c: '#ffcf7a', glow: 16, k: 0.9, mullion: true })),
    { x: cxL + 15, y: cyTop + 9, w: 2, h: 3, c: '#ffe2a0', glow: 10, k: 0.8 },
  ];
  for (let x = dx0 + 2, i = 0; x < cxL - 8; x += 12, i++) slots.push({ x: x - 1, y: dy - 3, w: 3, h: 2, c: '#ffd27a', glow: 8, k: 0.8 });

  const flies = Array.from({ length: 16 }, () => [rnd(), rnd(), rnd()]);
  return {
    slots, horizon: water, clouds: [24, 48], starsMax: water, water: [water, shore + 2],
    layers: [{ p: mtn, depth: 1 }, { p: trees, depth: 2 }, { p: near, depth: 3 }],
    sky(out, t) { if (!L.dark) drawBirds(out, W, t, 30, L.far[2], 11); },
    afterLayer: { 1: (out, t) => reflect(out, W, water, shore + 2, t, L) },
    top(out, t, sh) {
      // Chimney smoke.
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.4 + i * 7) % 40, y = cyTop - 18 - ph, x = chX + 2 + Math.round(Math.sin(ph / 6) * 3 + ph * 0.25);
        const fade = 1 - ph / 40;
        out.disc(x + sh, y, 1 + ph / 14, mixC(L.cloud[1], pack(rgb('#ffffff')), 0.3), fade * 0.9);
      }
      if (L.time === 'dawn') for (let y = water; y < water + 10; y++) for (let x = 0; x < W; x++) if (bay(x + Math.floor(t / 3), y) < 0.35 - (y - water) * 0.03) out.tint(x, y, pack(rgb('#fde6e8')), 0.35);
      if (L.dark && L.weather !== 'rain') flies.forEach(([a, b, s], i) => {
        if (hash(i, Math.floor(t / 5)) < 0.35) return;
        const x = Math.round(a * W + Math.sin(t / (9 + s * 6) + i) * 8), y = Math.round(shore - 14 + b * 22 + Math.cos(t / (11 + s * 5) + i) * 4);
        out.set(x, y, pack(rgb('#e9ff8a'))); out.tint(x + 1, y, pack(rgb('#e9ff8a')), 0.4);
      });
    },
  };
}

// The lake mirrors whatever is above it, with a gentle wobble.
function reflect(out, W, top, bottom, t, L) {
  const tint = L.dark ? pack(rgb('#0b1430')) : pack(rgb('#2d5b7a'));
  for (let y = top; y < bottom; y++) {
    const src = top - (y - top) - 1;
    if (src < 0) continue;
    const wob = Math.round(Math.sin((y * 0.9) + t / 5) * ((y - top) / 10));
    for (let x = 0; x < W; x++) {
      const c = out.get(Math.max(0, Math.min(W - 1, x + wob)), src);
      if (!c) continue;
      let v = mixC(c, tint, 0.28 + (y - top) * 0.012);
      if ((y - top) % 5 === 2 && hash(x >> 3, y + Math.floor(t / 5)) < (L.dark ? 0.05 : 0.09)) v = mixC(v, pack(rgb('#ffffff')), L.dark ? 0.16 : 0.32);
      out.set(x, y, v);
    }
  }
}

// ---------- town: a small street of shops ----------

function town(c) {
  const { W, L, rnd, fx, wide } = c;
  const lit = L.lit, ink = lit('#2a2028');
  const walk = 118, road = 127;

  const far = new Px(W + 2 * M, H, M);
  for (let x = -M; x < W + M;) {
    const bw = 10 + Math.floor(rnd() * 18), bh = 20 + Math.floor(rnd() * 26) + (x > W * 0.45 ? 14 : 0);
    far.rect(x, walk - bh, bw, bh, L.far[1]);
    if (rnd() < 0.5) far.poly([[x - 1, walk - bh], [x + bw / 2, walk - bh - 7], [x + bw + 1, walk - bh]], L.far[1]);
    if (rnd() < 0.3) far.rect(x + 3, walk - bh - 6, 2, 6, L.far[1]);
    if (L.lights) for (let yy = walk - bh + 3; yy < walk - 30; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (hash(xx, yy) < 0.3) far.set(xx, yy, L.em('#ffd391'));
    x += bw;
  }
  if (wide) { const tx = Math.round(W * 0.78); far.rect(tx, walk - 92, 10, 92, L.far[2]); far.poly([[tx - 1, walk - 92], [tx + 5, walk - 104], [tx + 11, walk - 92]], L.far[2]); far.disc(tx + 5, walk - 84, 3, L.lights ? L.em('#fff0c2') : lit('#e7dfcf')); }

  const st = new Px(W + 2 * M, H, M);
  const FACADES = ['#d98b6f', '#9db59a', '#efd9b5', '#8fb1cf', '#e2b85c', '#c7a3c8', '#e8a49a'];
  const KINDS = ['bakery', 'cafe', 'books', 'flowers', 'home'];
  const slots = [];
  let i = 0;
  for (let x = -M - 6; x < W + M;) {
    const bw = 38 + Math.floor(rnd() * 22);
    const leftSide = x < W * 0.5 && wide;
    const floors = leftSide ? 1 : 1 + Math.floor(rnd() * 3);
    const topY = leftSide ? walk - 36 : walk - 30 - floors * 18 - Math.floor(rnd() * 6);
    const col = FACADES[Math.floor(rnd() * FACADES.length)], kind = KINDS[(i + Math.floor(rnd() * 2)) % KINDS.length];
    const base = lit(col), hi = mixC(base, pack(rgb('#ffffff')), 0.22), lo = mixC(base, ink, 0.22);
    st.rect(x, topY, bw, walk - topY, base);
    st.rect(x, topY, bw, 3, lo); st.rect(x - 1, topY - 1, bw + 2, 1, hi); st.rect(x + bw - 1, topY + 3, 1, walk - topY - 3, lo);
    // Upper windows.
    for (let f = 0; f < (leftSide ? 0 : floors); f++) {
      const wy = topY + 7 + f * 18;
      for (let wxp = x + 6; wxp + 8 < x + bw - 4; wxp += 13) {
        st.rect(wxp - 1, wy - 1, 9, 12, lit('#f4ecdc'));
        const lightOn = L.lights && hash(wxp, wy) < 0.55;
        st.rect(wxp, wy, 7, 10, lightOn ? L.em(hash(wy, wxp) < 0.5 ? '#ffd88a' : '#ffc670') : lit('#3c4c66'));
        if (!lightOn) { st.set(wxp + 1, wy + 1, lit('#8fa6c4')); st.set(wxp + 2, wy + 1, lit('#6c84a6')); }
        st.rect(wxp + 3, wy, 1, 10, lit('#f4ecdc'));
        st.rect(wxp - 2, wy + 10, 11, 1, lo);
        if (hash(wxp, f) < 0.45) { st.rect(wxp - 1, wy + 11, 9, 2, lit('#7a4f36')); for (let k = 0; k < 4; k++) st.set(wxp + k * 2, wy + 10, hash(k, wxp) < 0.5 ? lit('#e66a7a') : lit('#f2c14e')); st.rect(wxp - 1, wy + 9, 9, 1, lit('#5f9a52')); }
      }
    }
    // Shop front.
    const awn = [lit(['#b8544a', '#4f7a8c', '#5f8f5a', '#7b6aa6', '#d08a2e'][i % 5]), lit('#f6efe0')];
    const sy = walk - 26;
    st.rect(x + 3, sy - 6, bw - 6, 4, lo); st.rect(x + 4, sy - 5, bw - 8, 2, lit('#f4ecdc'));
    st.rect(x + bw / 2 - 2, sy - 5, 4, 2, awn[0]);
    for (let ax = x + 2; ax < x + bw - 2; ax++) {
      const stripe = awn[Math.floor((ax - x) / 3) % 2];
      st.rect(ax, sy - 1, 1, 5, stripe);
      if (((ax - x) % 6) < 4) st.set(ax, sy + 4, stripe);
    }
    st.rect(x + 2, sy - 1, bw - 4, 1, mixC(awn[0], ink, 0.3));
    const winX = x + 5, winW = Math.max(10, bw - 22), winY = sy + 6;
    st.rect(winX - 1, winY - 1, winW + 2, walk - winY, lit('#4a3a3a'));
    st.rect(winX, winY, winW, walk - winY - 3, lit('#2e3c58'));
    st.set(winX + 2, winY + 2, lit('#7d93b8')); st.set(winX + 3, winY + 2, lit('#5a7099'));
    // A hint of what each shop sells, on the sill.
    const sill = walk - 4;
    if (kind === 'bakery') for (let k = 0; k < winW - 4; k += 5) st.ellipse(winX + 3 + k, sill - 2, 2, 1.2, lit('#d99a4e'));
    if (kind === 'books') for (let k = 0; k < winW - 2; k += 2) st.rect(winX + 1 + k, sill - 4 - (k % 3), 1, 4 + (k % 3), lit(['#b8544a', '#4f7a8c', '#d6a85a', '#7b6aa6'][k % 4]));
    if (kind === 'flowers') for (let k = 0; k < winW - 2; k += 3) { st.set(winX + 1 + k, sill - 3, lit(['#e66a7a', '#f2c14e', '#ffffff'][k % 3])); st.rect(winX + 1 + k, sill - 2, 1, 2, lit('#5f9a52')); }
    if (kind === 'cafe') { st.rect(winX + 2, sill - 3, 3, 3, lit('#f1ebde')); st.rect(winX + winW - 6, sill - 3, 3, 3, lit('#f1ebde')); }
    st.rect(winX - 1, sill, winW + 2, 1, lit('#a07646'));
    const doorX = winX + winW + 3;
    st.rect(doorX, sy + 4, 9, walk - sy - 4, lit('#4a2f22')); st.rect(doorX + 1, sy + 5, 7, 6, lit('#2e3c58')); st.set(doorX + 7, walk - 10, lit('#d9a441'));
    slots.push({ x: winX, y: winY, w: winW, h: walk - winY - 3 - (kind === 'home' ? 0 : 5), c: '#ffcf86', glow: 14, k: 0.7, pane: true });
    if (kind === 'cafe' && x + bw + 14 < W) {
      st.rect(x + bw - 2, walk - 6, 8, 1, lit('#3b3236')); st.rect(x + bw + 1, walk - 5, 1, 5, lit('#3b3236'));
      st.rect(x + bw - 2, walk - 8, 2, 2, lit('#f1ebde'));
    }
    x += bw; i++;
  }

  // Sidewalk, kerb and road.
  st.full(walk, road - walk, lit('#cfc6b6'));
  for (let x = -M; x < W + M; x += 9) st.rect(x, walk, 1, road - walk, lit('#b7ad9c'));
  st.full(walk + 4, 1, lit('#bdb3a2'));
  st.full(road - 1, 1, lit('#8e8678'));
  st.full(road, H - road, lit('#4a4a55'));
  st.drect(-M, road, W + 2 * M, 2, lit('#3a3a45'), 0.5);
  for (let x = -M; x < W + M; x += 24) st.rect(x, road + 9, 12, 1, lit('#c9c0a8'));

  // Street lamps and a bicycle.
  const lamps = new Px(W + 2 * M, H, M);
  for (let x = wide ? Math.round(W * 0.5) + 30 : 30; x < W; x += wide ? 132 : 110) {
    lamps.rect(x, walk - 32, 2, 34, lit('#2f2a33')); lamps.rect(x - 1, walk, 4, 2, lit('#2f2a33'));
    lamps.rect(x - 3, walk - 37, 8, 5, lit('#2f2a33')); lamps.rect(x - 2, walk - 36, 6, 3, lit('#5c5660'));
    slots.push({ x: x - 2, y: walk - 36, w: 6, h: 3, c: '#ffe6a6', glow: 22, k: 1 });
  }
  const bike = sprite(18, 10, p => {
    const fr = lit('#3e6f8f'), wh = lit('#2b2530');
    for (const cx of [3, 14]) { p.disc(cx, 6, 3, wh); p.disc(cx, 6, 2, 0); p.set(cx, 6, wh); }
    p.line(3, 6, 8, 6, fr); p.line(8, 6, 11, 2, fr); p.line(3, 6, 6, 2, fr); p.line(6, 2, 11, 2, fr); p.line(11, 2, 14, 6, fr);
    p.rect(5, 1, 3, 1, wh); p.line(11, 2, 12, 0, fr); p.rect(12, 0, 2, 1, wh);
  });
  lamps.blit(bike, Math.round(fx - 12) - M, walk - 6);

  // Overhead wire with birds that sit there by day.
  const wireY = x => Math.round(54 + Math.sin(((x + 20) / (W + 40)) * Math.PI) * 10);
  const birds = [0.58, 0.62, 0.65, 0.71].map(u => Math.round(W * u));

  return {
    slots, horizon: walk - 20, clouds: [24, 34], starsMax: 70,
    layers: [{ p: far, depth: 1 }, { p: st, depth: 3 }, { p: lamps, depth: 4 }],
    sky(out, t) {
      const wire = lit('#2f2a33'), from = wide ? Math.round(W * 0.5) : 0;
      for (let x = from; x < W; x++) out.set(x, wireY(x), wire);
      if (from) { out.rect(from - 1, wireY(from) - 1, 2, 3, wire); }
      if (!L.dark) birds.forEach((bx, k) => {
        const y = wireY(bx) - 2, bob = Math.floor((t + k * 5) / 14) % 2;
        out.rect(bx, y + bob, 3, 2, lit('#4a4048')); out.set(bx + 3, y + bob, lit('#4a4048')); out.set(bx + 3, y + bob + 1, lit('#e0a040'));
      });
      if (!L.dark) drawBirds(out, W, t, 30, L.far[2], 5);
    },
  };
}

const BUILDERS = { room, rooftop, cabin, town };

// ---------- the engine ----------

function build({ scene, time, weather, W, seed, clock, rtl }) {
  const L = look(time, weather);
  const rnd = rng(seed);
  const wide = W >= 300;
  const fx = wide ? Math.round(W * (W >= 420 ? 0.7 : 0.68)) : Math.round(W / 2);
  const s = (BUILDERS[scene] ?? room)({ W, L, rnd, fx, wide, clock, rtl });
  s.L = L;
  s.quiet = wide && scene !== 'room' ? Math.round(W * 0.47) : 0;
  s.skyP = skyLayer(W, L, s.horizon);
  s.cloudList = makeClouds(W, L, rnd, s.clouds[0], s.clouds[1], Math.round(L.clouds * (W / 240) * (scene === 'room' ? 0.7 : 1)) + 1);
  s.starList = makeStars(W, L, rnd, s.starsMax);
  s.drops = weather === 'rain' || weather === 'snow' ? Array.from({ length: Math.round(W * (weather === 'rain' ? 0.5 : 0.35)) }, () => [rnd() * W, rnd() * H, 0.7 + rnd() * 0.6]) : [];
  return s;
}

function composeFrame(s, out, W, t, par, lights) {
  const L = s.L;
  out.d.set(s.skyP.d);
  if (L.stars) drawStars(out, s.starList, t, s.starsMax);
  drawClouds(out, s.cloudList, W, t, s.quiet);
  s.sky?.(out, t);
  s.layers.forEach((layer, i) => {
    const shift = Math.round(par * layer.depth * 0.7);
    out.blit(layer.p, -M + shift, 0);
    s.afterLayer?.[i]?.(out, t);
  });
  const sh = Math.round(par * 3 * 0.7);
  s.top?.(out, t, sh);
  // Weather.
  if (L.weather === 'rain') {
    const c = pack(rgb(L.dark ? '#7f8bb8' : '#dfe8f2'));
    for (const d of s.drops) { const y = (d[1] + t * 7 * d[2]) % (H + 10) - 5, x = (d[0] - t * 1.4 * d[2]) % W; const xx = Math.round(x < 0 ? x + W : x); out.tint(xx, Math.round(y), c, 0.7); out.tint(xx, Math.round(y) + 1, c, 0.55); out.tint(xx + 1, Math.round(y) - 1, c, 0.4); out.tint(xx + 1, Math.round(y) - 2, c, 0.25); }
  } else if (L.weather === 'snow') {
    const c = pack(rgb('#ffffff'));
    for (const d of s.drops) { const y = (d[1] + t * 1.1 * d[2]) % (H + 4) - 2, x = (d[0] + Math.sin(t / 12 + d[1]) * 3) % W; out.set(Math.round(x), Math.round(y), c); }
  }
  // Lights: on when the hour calls for them, or one by one while the brief is being written.
  s.slots.forEach((sl, i) => {
    const on = lights.mode === 'progress' ? i < lights.count : L.lights >= 1 || (L.lights > 0 && i % 2 === 0);
    if (!on) return;
    const age = lights.since?.[i] != null ? t - lights.since[i] : 99;
    const k = Math.min(1, age / 4);
    const em = pack(rgb(sl.c)), x = sl.x + sh, y = sl.y;
    for (let yy = y; yy < y + sl.h; yy++) for (let xx = x; xx < x + sl.w; xx++) if (k >= 1 || bay(xx, yy) < k) out.set(xx, yy, em);
    if (sl.mullion) { out.rect(x + 3, y, 1, sl.h, mixC(em, pack(rgb('#6a4a2e')), 0.6)); out.rect(x, y + 3, sl.w, 1, mixC(em, pack(rgb('#6a4a2e')), 0.6)); }
    if (sl.pane) for (let yy = y + 1; yy < y + sl.h; yy += 3) out.rect(x + 1, yy, Math.max(1, Math.floor(sl.w / 3)), 1, mixC(em, pack(rgb('#b06a3a')), 0.35));
    // A page being written: a little sun and lines of text.
    if (sl.doc && k >= 1) {
      const ink2 = mixC(em, pack(rgb('#5a5470')), 0.55);
      out.rect(x + sl.w - 5, y + 2, 3, 3, pack(rgb('#f2b34a')));
      out.rect(x + 2, y + 2, 9, 2, mixC(em, pack(rgb('#2b1f2a')), 0.7));
      for (let yy = y + 6, n = 0; yy < y + sl.h - 1; yy += 2, n++) out.rect(x + 2, yy, Math.max(4, sl.w - 4 - ((n * 7) % 9)), 1, ink2);
    }
    const flare = age < 6 ? 1.35 - age * 0.06 : 1;
    if (L.dark || L.time === 'dawn' || lights.mode === 'progress') out.glow(x + sl.w / 2, y + sl.h / 2, sl.glow * flare, em, (L.dark ? sl.k : sl.k * 0.6) * k);
    if (sl.pool && (L.dark || L.time === 'dawn')) out.glow(sl.pool[0] + sh, sl.pool[1], sl.pool[2], em, 0.55 * k);
  });
}

// Melts the bottom of the scene into the page, pixel by pixel.
function meltInto(out, W, ground) {
  if (!ground) return;
  const rows = 9;
  for (let r = 0; r < rows; r++) {
    const y = H - rows + r, level = (r + 1) / (rows + 1);
    for (let x = 0; x < W; x++) if (bay(x, y) < level) out.set(x, y, ground);
  }
}

export function createScene(canvas, opts) {
  const ctx2d = canvas.getContext('2d');
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = { scene: 'room', time: 'morning', weather: 'clear', seed: 7, clock: { h: 8, m: 0 }, ground: null, ...opts };
  let W = 0, scale = 1, s = null, out = null, img = null;
  let t = 0, raf = 0, last = 0, visible = true, par = 0, parTarget = 0;
  let lights = { mode: 'time', count: 0, since: {} };
  let dissolve = null;

  function measure() {
    const box = canvas.parentElement.getBoundingClientRect();
    const target = Math.min(innerHeight * 0.56, 470);
    const k = Math.max(2, Math.min(state.maxScale ?? 4, Math.round(Math.min(box.width / 300, target / H))));
    const w = Math.ceil(box.width / k);
    if (w === W && k === scale) return false;
    W = w; scale = k;
    canvas.width = W; canvas.height = H;
    canvas.style.width = `${W * scale}px`; canvas.style.height = `${H * scale}px`;
    out = new Px(W, H); img = ctx2d.createImageData(W, H);
    return true;
  }

  function rebuild() { s = build({ ...state, W }); }

  function paint() {
    if (!s) return;
    composeFrame(s, out, W, t, par, lights);
    meltInto(out, W, state.ground ? pack(rgb(state.ground)) : null);
    if (dissolve) {
      const p = (t - dissolve.start) / 14;
      if (p >= 1 || dissolve.w !== W) dissolve = null;
      else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bay8(x, y) > p) out.d[y * W + x] = dissolve.from[y * W + x];
    }
    new Uint32Array(img.data.buffer).set(out.d);
    ctx2d.putImageData(img, 0, 0);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / FPS) return;
    last = now;
    t++;
    par += (parTarget - par) * 0.25;
    paint();
  }

  function run() {
    cancelAnimationFrame(raf);
    if (calm() || !visible || document.hidden) { paint(); return; }
    raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(() => { if (measure()) { rebuild(); paint(); } });
  ro.observe(canvas.parentElement);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); });
  io.observe(canvas);
  const onVis = () => run();
  document.addEventListener('visibilitychange', onVis);
  const onMove = e => { if (calm()) return; const u = (e.clientX / innerWidth - 0.5) * 2; parTarget = (getComputedStyle(canvas).transform.includes('-1') ? -u : u) * 1.6; };
  addEventListener('pointermove', onMove, { passive: true });

  measure(); rebuild(); paint(); run();

  return {
    set(patch, { animate = true } = {}) {
      const changed = Object.keys(patch).some(k => JSON.stringify(patch[k]) !== JSON.stringify(state[k]));
      if (!changed) return;
      const visual = ['scene', 'time', 'weather'].some(k => k in patch && patch[k] !== state[k]);
      if (visual && animate && !calm() && out) dissolve = { from: new Uint32Array(out.d), start: t, w: W };
      state = { ...state, ...patch };
      rebuild(); paint();
    },
    // Lights the scene one slot at a time while the brief is being written. share: 0..1
    progress(share) {
      const n = s ? Math.round(share * s.slots.length) : 0;
      if (lights.mode !== 'progress') lights = { mode: 'progress', count: 0, since: {} };
      for (let i = lights.count; i < n; i++) lights.since[i] = t + (i - lights.count) * 2;
      lights.count = n;
      paint();
    },
    resting() { lights = { mode: 'time', count: 0, since: {} }; paint(); },
    // How bright the quiet corner of the scene is, so the greeting can pick light or dark ink.
    // Reads the new scene itself, never a frame mid-dissolve, and picks whichever ink contrasts more.
    tone(yMax = 76) {
      if (!s) return 'dark';
      const frame = new Px(W, H);
      composeFrame(s, frame, W, t, 0, lights);
      let sum = 0, n = 0;
      const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      for (let y = 10; y < Math.min(H - 10, yMax); y += 2) for (let x = 4; x < Math.min(W, Math.round(W * 0.48)); x += 3) {
        const [r, g, b] = unpack(frame.d[y * W + x]).map(v => lin(v / 255));
        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b; n++;
      }
      const L = sum / n, withDark = (L + 0.05) / 0.064, withLight = 1.0 / (L + 0.05);
      return withDark >= withLight ? 'light' : 'dark';
    },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); removeEventListener('pointermove', onMove); },
  };
}

// A still frame at a fixed size, for the scene picker.
export function sceneStill(canvas, { scene, time, weather = 'clear', width = 160, clock = { h: 8, m: 0 } }) {
  const W = width;
  canvas.width = W; canvas.height = H;
  const s = build({ scene, time, weather, W, seed: 7, clock });
  const out = new Px(W, H);
  composeFrame(s, out, W, 20, 0, { mode: 'time', count: 0, since: {} });
  const ctx2d = canvas.getContext('2d');
  const img = ctx2d.createImageData(W, H);
  new Uint32Array(img.data.buffer).set(out.d);
  ctx2d.putImageData(img, 0, 0);
}
