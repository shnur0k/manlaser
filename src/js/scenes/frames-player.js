/**
 * Режим 'frames': последовательность кадров /public/frames/<scene>/frame_0001.webp …
 * рисуется на canvas в зависимости от прогресса скролла.
 * Кадры подгружаются постепенно: сначала каждый 8-й, потом остальные.
 */
export async function createFramesPlayer(canvas, { path, count, pad = 4, ext = 'webp' } = {}, { onReady } = {}) {
  if (!path || !count) throw new Error('Не заданы frames.path / frames.count в config.js');
  const ctx = canvas.getContext('2d');
  const frames = new Array(count);
  const url = (i) => `${path}frame_${String(i + 1).padStart(pad, '0')}.${ext}`;
  let destroyed = false;
  let lastDrawn = -1;
  let progress = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const load = (i) =>
    new Promise((resolve) => {
      if (frames[i]) return resolve(frames[i]);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames[i] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url(i);
    });

  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    lastDrawn = -1;
    draw(progress);
  }

  // ближайший загруженный кадр к нужному
  function nearest(i) {
    for (let d = 0; d < count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  function draw(p) {
    const i = Math.min(count - 1, Math.max(0, Math.round(p * (count - 1))));
    const img = frames[i] || nearest(i);
    if (!img || (i === lastDrawn && frames[i])) return;
    lastDrawn = frames[i] ? i : -1;
    // object-fit: cover
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  const first = await load(0);
  if (!first) throw new Error(`Нет первого кадра: ${url(0)}`);
  resize();
  onReady?.();

  // фоновая догрузка
  (async () => {
    const order = [];
    for (let i = 0; i < count; i += 8) order.push(i);
    for (let i = 0; i < count; i++) if (i % 8) order.push(i);
    for (const i of order) {
      if (destroyed) return;
      await load(i);
    }
  })();

  return {
    update(p) {
      progress = p;
      draw(p);
    },
    resize,
    destroy() {
      destroyed = true;
    },
  };
}
