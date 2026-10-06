import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';
import { scrollTo } from '../core/scroll.js';

const canHover = () => !env.touch && !env.reducedMotion;

/** Магнитные кнопки: [data-magnetic] слегка тянется за курсором. */
export function initMagnetic(root) {
  if (!canHover()) return () => {};
  const offs = [];
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el._magnetic) return;
    el._magnetic = true;
    const label = el.querySelector('.btn__label');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.28);
      yTo(dy * 0.38);
      if (label) gsap.to(label, { x: dx * 0.1, y: dy * 0.12, duration: 0.6, ease: 'power3.out' });
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
      if (label) gsap.to(label, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el._magnetic = false;
    });
  });
  return () => offs.forEach((f) => f());
}

/** Лёгкий 3D-наклон карточек + координаты курсора для свечения (--mx/--my). */
export function initTilt(root) {
  if (!canHover()) return () => {};
  const offs = [];
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = el.dataset.tilt === 'soft' ? 3 : 6;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      ry((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    });
  });
  return () => offs.forEach((f) => f());
}

/** Аккордеоны FAQ на <details> с плавной высотой. */
export function initAccordions(root) {
  const offs = [];
  root.querySelectorAll('details[data-accordion]').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.faq__a');
    const onClick = (e) => {
      e.preventDefault();
      if (env.reducedMotion) {
        d.open = !d.open;
        return;
      }
      if (d.open) {
        gsap.to(body, { height: 0, duration: 0.5, ease: 'power3.inOut', onComplete: () => (d.open = false) });
        d.classList.remove('is-opening');
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'expo.out' });
      }
    };
    summary.addEventListener('click', onClick);
    offs.push(() => summary.removeEventListener('click', onClick));
  });
  return () => offs.forEach((f) => f());
}

/** Плавное проявление картинок после загрузки. */
export function initImages(root) {
  root.querySelectorAll('.media img').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
  return () => {};
}

/** Якорные ссылки на той же странице — плавная прокрутка Lenis. */
export function initAnchors() {
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest?.('a[href*="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      scrollTo(target);
      history.replaceState(history.state, '', url.hash);
    },
    true,
  );
}

/** Фильтр статей блога по тегам. */
export function initTagFilter(root) {
  const bar = root.querySelector('[data-tag-filter]');
  const grid = root.querySelector('[data-post-grid]');
  if (!bar || !grid) return () => {};
  const onClick = (e) => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    bar.querySelectorAll('[data-tag]').forEach((b) => b.classList.toggle('is-active', b === btn));
    const cards = [...grid.children];
    cards.forEach((card) => {
      const show = tag === '*' || (card.dataset.tags || '').split('|').includes(tag);
      if (show) {
        card.hidden = false;
        gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
      } else card.hidden = true;
    });
  };
  bar.addEventListener('click', onClick);
  return () => bar.removeEventListener('click', onClick);
}

let toastTimer;
export function toast(message, ms = 3200) {
  const el = document.querySelector('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), ms);
}
