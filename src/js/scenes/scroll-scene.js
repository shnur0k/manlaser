import config from '../../../config.js';
import { gsap, ScrollTrigger } from '../lib/gsap.js';
import { env } from '../core/env.js';
import { createFramesPlayer } from './frames-player.js';
import { createVideoPlayer } from './video-player.js';

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

/**
 * Закреплённая scroll-сцена. Общая для главной (и позже — страниц очистки и антикора).
 *
 * root  — секция с [data-scene-canvas], подписями [data-scene-step data-from data-to]
 *         и полосками прогресса [data-scene-bar data-from data-to].
 * name  — ключ сцены в config.js → scenes (режим '3d' | 'frames' | 'video').
 * load3d — () => import('./<scene>/index.js'): модуль 3D грузится только при необходимости.
 *
 * Модуль 3D экспортирует createScene(canvas, { quality, onReady }) → { update(p, dt), resize(), setPointer(x, y), destroy() }.
 */
export function createScrollScene(root, { name, load3d, length = 4, mobileLength = 3.2 }) {
  const cfg = config.scenes?.[name] || { mode: '3d' };
  const canvas = root.querySelector('[data-scene-canvas]');
  const steps = [...root.querySelectorAll('[data-scene-step]')].map((el) => ({
    el,
    from: parseFloat(el.dataset.from),
    to: parseFloat(el.dataset.to),
    visible: null,
  }));
  const readout = root.querySelector('[data-scene-readout]');
  const bars = [...root.querySelectorAll('[data-scene-bar]')].map((el) => ({ el, from: parseFloat(el.dataset.from), to: parseFloat(el.dataset.to) }));

  let mode = cfg.mode || '3d';
  if (env.mobile && cfg.mobileMode) mode = cfg.mobileMode;
  if (env.reducedMotion) mode = 'static';
  if (mode === '3d' && !hasWebGL()) mode = 'static';

  const quality = env.lowEnd || env.mobile ? 'low' : 'high';
  let renderer = null;
  let st = null;
  let target = 0;
  let current = 0;
  let running = false;
  let near = true;
  let destroyed = false;
  const fade = 0.035;

  root.dataset.mode = mode;

  // ---------- подписи и индикатор ----------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  function updateUi(p) {
    for (const s of steps) {
      const a = s.from < 0 ? 1 : clamp01((p - s.from) / fade);
      const b = clamp01((s.to - p) / fade);
      const o = Math.min(a, b);
      const visible = o > 0.01;
      if (visible !== s.visible) {
        s.el.style.visibility = visible ? 'visible' : 'hidden';
        s.visible = visible;
      }
      // прозрачность ставим всегда: у вложенных элементов может быть свой visibility:visible
      s.el.style.opacity = visible ? o.toFixed(3) : '0';
      if (visible) {
        const shift = (1 - o) * (p < (s.from + s.to) / 2 ? 30 : -30);
        s.el.style.transform = `translateY(${shift}px)`;
      }
      s.el.classList.toggle('is-visible', o > 0.5);
    }
    for (const b of bars) {
      const v = clamp01((p - b.from) / (b.to - b.from));
      b.el.style.setProperty('--p', v.toFixed(3));
      b.el.classList.toggle('is-active', p >= b.from && p <= b.to + 0.02);
    }
    root.classList.toggle('is-scrolled', p > 0.01);
    if (readout) readout.textContent = String(Math.round(p * 100)).padStart(3, '0');
  }

  // ---------- цикл отрисовки ----------
  function tick(_, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    // сглаживание прогресса: камера «догоняет» скролл без рывков (в обе стороны)
    current += (target - current) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - current) < 0.00005) current = target;
    renderer?.update(current, dt);
    updateUi(current);
  }
  function start() {
    if (running || destroyed) return;
    running = true;
    gsap.ticker.add(tick);
  }
  function stop() {
    running = false;
    gsap.ticker.remove(tick);
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      near = entry.isIntersecting;
      near && !document.hidden ? start() : stop();
    },
    { rootMargin: '25% 0px' },
  );
  const onVisibility = () => (document.hidden ? stop() : near && start());
  document.addEventListener('visibilitychange', onVisibility);

  const onResize = () => renderer?.resize?.();
  window.addEventListener('resize', onResize);
  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    renderer?.setPointer?.((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // ---------- рендерер по режиму ----------
  async function createRenderer() {
    try {
      if (mode === '3d') {
        const mod = await load3d();
        if (destroyed) return;
        renderer = await mod.createScene(canvas, { quality, onReady: () => root.classList.add('is-ready') });
      } else if (mode === 'frames') {
        renderer = await createFramesPlayer(canvas, cfg.frames, { onReady: () => root.classList.add('is-ready') });
      } else if (mode === 'video') {
        renderer = await createVideoPlayer(root, cfg.video, { onReady: () => root.classList.add('is-ready') });
      }
    } catch (err) {
      console.warn(`[manlaser] Сцена «${name}» (${mode}) не запустилась, показываю запасной вариант:`, err);
      renderer?.destroy?.();
      renderer = null;
      makeStatic();
      return;
    }
    if (destroyed) renderer?.destroy?.();
  }

  function makeStatic() {
    mode = 'static';
    root.dataset.mode = 'static';
    root.classList.add('is-static');
    st?.kill();
    st = null;
    stop();
    steps.forEach((s) => {
      s.el.style.cssText = '';
      s.el.classList.add('is-visible');
    });
    ScrollTrigger.refresh();
  }

  // отладка: root.__snap() — сразу перейти к текущему прогрессу без сглаживания
  if (import.meta.env.DEV) root.__snap = () => (current = target);

  if (mode === 'static') {
    makeStatic();
  } else {
    const len = () => window.innerHeight * (env.mobile ? mobileLength : length);
    st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${len()}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        target = self.progress;
      },
    });
    updateUi(0);
    createRenderer();
  }

  return {
    /** Запуск после того, как страница открылась (переход завершён). */
    start() {
      if (mode === 'static') return;
      io.observe(root);
      start();
    },
    destroy() {
      destroyed = true;
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      st?.kill(true);
      renderer?.destroy?.();
      renderer = null;
    },
  };
}
