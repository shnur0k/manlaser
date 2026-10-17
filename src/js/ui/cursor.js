import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';

const HOVER = 'a, button, summary, label, [data-cursor], [role="button"], input[type="submit"], select';

/** Кастомный курсор: точка + кольцо, на ссылках увеличивается, на [data-cursor="Текст"] показывает подпись. */
export function initCursor(enabled = true) {
  if (!enabled || env.touch || env.reducedMotion) return;
  const el = document.querySelector('[data-cursor-el]');
  if (!el) return;
  const dot = el.querySelector('.cursor__dot');
  const ring = el.querySelector('.cursor__ring');
  const label = el.querySelector('[data-cursor-label]');
  document.documentElement.classList.add('has-cursor');

  gsap.set([dot, ring], { x: -100, y: -100 });
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      el.classList.remove('is-hidden');
    },
    { passive: true },
  );

  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest?.(HOVER);
    const text = e.target.closest?.('[data-cursor]')?.dataset.cursor;
    el.classList.toggle('is-hover', Boolean(target) && !text);
    el.classList.toggle('has-label', Boolean(text));
    if (text) label.textContent = text;
  });

  document.addEventListener('pointerdown', () => el.classList.add('is-down'));
  document.addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => el.classList.add('is-hidden'));

  // после смены страницы сбросить состояние наведения
  return () => el.classList.remove('is-hover', 'has-label');
}
