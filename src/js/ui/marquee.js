import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';

/**
 * Бегущая строка. Едет всегда (лёгкая анимация, работает и при «уменьшении движения» — только медленнее),
 * при прокрутке страницы ускоряется и меняет направление вслед за скроллом.
 */
export function initMarquee(root) {
  const items = [...root.querySelectorAll('.marquee')];
  if (!items.length) return () => {};

  const rows = items.map((el) => ({ el, track: el.querySelector('.marquee__track'), x: 0, half: 0, dir: -1 }));
  const measure = () => rows.forEach((r) => (r.half = r.track.scrollWidth / 2));
  measure();
  document.fonts?.ready.then(measure);
  window.addEventListener('resize', measure);

  const base = env.reducedMotion ? 30 : 70; // пикселей в секунду
  let lastY = window.scrollY;
  let boost = 0;

  const tick = (_, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (!env.reducedMotion && dy !== 0) {
      boost = Math.min(18, boost + Math.abs(dy) * 0.05);
      rows.forEach((r) => (r.dir = dy > 0 ? -1 : 1));
    }
    boost *= Math.pow(0.04, dt); // плавно гаснет до базовой скорости
    rows.forEach((r) => {
      if (!r.half) return;
      r.x += r.dir * base * (1 + boost) * dt;
      if (r.x <= -r.half) r.x += r.half;
      if (r.x > 0) r.x -= r.half;
      r.track.style.transform = `translate3d(${r.x}px, 0, 0)`;
    });
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', measure);
  };
}
