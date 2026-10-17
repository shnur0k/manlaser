import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';

/**
 * Бегущая строка. Едет всегда с постоянной скоростью в одну сторону и не зависит от прокрутки страницы
 * (работает и при «уменьшении движения» — только медленнее).
 */
export function initMarquee(root) {
  const items = [...root.querySelectorAll('.marquee')];
  if (!items.length) return () => {};

  const rows = items.map((el) => ({ el, track: el.querySelector('.marquee__track'), x: 0, half: 0 }));
  const measure = () => rows.forEach((r) => (r.half = r.track.scrollWidth / 2));
  measure();
  document.fonts?.ready.then(measure);
  window.addEventListener('resize', measure);

  const speed = env.reducedMotion ? 30 : 70; // пикселей в секунду

  const tick = (_, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    rows.forEach((r) => {
      if (!r.half) return;
      r.x -= speed * dt;
      if (r.x <= -r.half) r.x += r.half;
      r.track.style.transform = `translate3d(${r.x}px, 0, 0)`;
    });
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', measure);
  };
}
