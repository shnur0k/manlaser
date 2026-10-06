import Lenis from 'lenis';
import { ScrollTrigger } from '../lib/gsap.js';
import { env } from './env.js';

let lenis = null;
const headerOffset = () => -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80) - 16;

/**
 * Плавный скролл Lenis, синхронизированный с GSAP ScrollTrigger.
 * У Lenis свой цикл кадров (autoRaf) — колесо мыши работает независимо от анимаций GSAP.
 * Если браузер рисует медленно (< 30 кадров/с), плавный скролл выключается и остаётся обычный:
 * иначе колесо «залипает» — Lenis перехватывает прокрутку, но двигает страницу только на каждом кадре.
 */
export function initScroll(enabled = true) {
  if (!enabled || env.reducedMotion) return null;
  lenis = new Lenis({
    autoRaf: true,
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });
  lenis.on('scroll', ScrollTrigger.update);
  if (import.meta.env.DEV) window.__lenis = lenis; // для отладки в консоли
  watchFrameRate();
  return lenis;
}

function watchFrameRate() {
  let frames = 0;
  let start = 0;
  let checks = 0;
  const loop = (now) => {
    if (!lenis) return;
    if (document.hidden) {
      start = 0;
      frames = 0;
      requestAnimationFrame(loop);
      return;
    }
    if (!start) start = now;
    frames++;
    const elapsed = now - start;
    if (elapsed >= 2000) {
      const fps = (frames * 1000) / elapsed;
      if (fps < 30) {
        disableSmooth();
        return;
      }
      frames = 0;
      start = now;
      if (++checks >= 5) return; // первые ~10 секунд достаточно
    }
    requestAnimationFrame(loop);
  };
  // начинаем мерить чуть позже, чтобы не учитывать тяжёлую загрузку страницы
  setTimeout(() => requestAnimationFrame(loop), 1500);
}

function disableSmooth() {
  if (!lenis) return;
  const y = window.scrollY;
  lenis.destroy();
  lenis = null;
  if (import.meta.env.DEV) window.__lenis = null;
  window.scrollTo(0, y);
  console.info('[manlaser] Браузер рисует медленно — плавный скролл выключен, работает обычный.');
}

export const getLenis = () => lenis;

/** Прокрутка к элементу/позиции с учётом высоты шапки. */
export function scrollTo(target, { immediate = false, offset } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (typeof target !== 'number' && !el) return;
  const off = offset ?? (typeof target === 'number' ? 0 : headerOffset());
  if (lenis) {
    lenis.scrollTo(el || target, { offset: off, immediate, force: true, duration: immediate ? 0 : 1.3 });
    return;
  }
  const y = typeof target === 'number' ? target : el.getBoundingClientRect().top + window.scrollY + off;
  window.scrollTo({ top: y, behavior: immediate || env.reducedMotion ? 'auto' : 'smooth' });
}

export function lockScroll(lock) {
  if (lenis) {
    lock ? lenis.stop() : lenis.start();
  }
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}
