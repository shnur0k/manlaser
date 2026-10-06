/**
 * Процедурные текстуры металла для иллюстраций «до/после»: ржавая поверхность и чистая «шлифованная» сталь.
 * Рисуются на canvas из шума — картинки не нужны. Если в content/media.json появится настоящее фото,
 * шаблон выведет его вместо канваса.
 */

const hash = (x, y, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

function vnoise(x, y, s) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, s, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f, s + i * 17);
    f *= 2;
    amp *= 0.5;
  }
  return sum; // ≈ 0…0.94
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// рампа ржавчины: тёмно-коричневый → кирпичный → оранжевый → светлая охра
const RUST = [
  [0, [38, 16, 8]],
  [0.35, [92, 36, 12]],
  [0.65, [168, 70, 20]],
  [0.88, [208, 108, 40]],
  [1, [224, 150, 80]],
];
function ramp(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return [mix(c0[0], c1[0], k), mix(c0[1], c1[1], k), mix(c0[2], c1[2], k)];
    }
  }
  return stops[stops.length - 1][1];
}

function pixelRust(u, v, seed) {
  const base = fbm(u * 2.4, v * 2.4, seed, 5);
  const blotch = fbm(u * 7 + 11, v * 7, seed + 3, 4);
  const grain = fbm(u * 38, v * 38, seed + 9, 2);
  const t = clamp(base * 0.85 + blotch * 0.55 - 0.1 + (grain - 0.4) * 0.35);
  let [r, g, b] = ramp(RUST, t);
  // язвы и тёмные очаги
  const pit = smooth(0.66, 0.82, fbm(u * 22, v * 22, seed + 21, 3));
  const k = 1 - pit * 0.6;
  // шелушащаяся окалина: редкие светлые чешуйки
  const flake = smooth(0.74, 0.9, fbm(u * 14 + 5, v * 14, seed + 31, 3));
  r = r * k + flake * 30;
  g = g * k + flake * 16;
  b = b * k + flake * 6;
  return [r, g, b];
}

function pixelSteel(u, v, seed) {
  const streak = fbm(u * 1.6, v * 110, seed, 3); // растянуто вдоль x — следы шлифовки
  const fine = fbm(u * 6, v * 220, seed + 5, 2);
  const cloud = fbm(u * 1.3 + 4, v * 1.3, seed + 8, 3);
  let g = 128 + cloud * 70 + (streak - 0.45) * 56 + (fine - 0.4) * 22;
  // мягкая световая полоса по диагонали
  g += Math.cos((u * 1.4 - v * 0.9) * Math.PI * 1.1) * 14;
  return [g * 0.95, g * 0.975, g * 1.02];
}

// тёмное резиново-битумное покрытие днища: слабый коричневый оттенок и мягкий блик
function pixelCoat(u, v, seed) {
  const base = fbm(u * 3, v * 3, seed, 4);
  const bump = fbm(u * 26, v * 26, seed + 4, 3);
  let g = 20 + base * 34 + (bump - 0.4) * 22;
  g += Math.max(0, Math.cos((u * 1.2 + v * 1.1) * Math.PI * 1.3)) * 12; // блик
  return [g * 1.12, g * 1.02, g * 0.92];
}

const PAINTERS = { rust: pixelRust, steel: pixelSteel, coat: pixelCoat };

/**
 * Рисует текстуру в canvas по его data-атрибутам: data-tex="rust|steel|coat", data-seed="число".
 * Размер берётся из width/height канваса.
 */
export function paintTexture(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const seed = parseInt(canvas.dataset.seed || '1', 10) || 1;
  const px = PAINTERS[canvas.dataset.tex] || pixelRust;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const aspect = w / h;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = (x / w) * aspect;
      const [r, g, b] = px(u, v, seed);
      // лёгкое затемнение к краям, чтобы кадр читался как объём, а не плоская заливка
      const dx = x / w - 0.5;
      const dy = v - 0.5;
      const vig = 1 - (dx * dx + dy * dy) * 0.9;
      const i = (y * w + x) * 4;
      d[i] = clamp(r * vig, 0, 255);
      d[i + 1] = clamp(g * vig, 0, 255);
      d[i + 2] = clamp(b * vig, 0, 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas.classList.add('is-painted');
}

/** Рисует канвасы по очереди (по одному за раз), чтобы не подвешивать страницу. Возвращает функцию отмены. */
export function paintQueue(canvases) {
  let cancelled = false;
  let timer;
  const list = [...canvases];
  const next = () => {
    if (cancelled || !list.length) return;
    paintTexture(list.shift());
    timer = setTimeout(next, 16);
  };
  timer = setTimeout(next, 0);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
