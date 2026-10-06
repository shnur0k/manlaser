import { gsap } from '../lib/gsap.js';
import { lockScroll } from '../core/scroll.js';
import { env } from '../core/env.js';

/** Полноэкранное мобильное меню: раскрывается кругом от бургера, пункты выезжают по очереди. */
export function initMobileMenu(header) {
  const menu = document.querySelector('[data-mobile-menu]');
  const burger = document.querySelector('[data-burger]');
  if (!menu || !burger) return { close() {} };

  const links = menu.querySelectorAll('.mm-item');
  const footer = menu.querySelector('.mobile-menu__footer');
  let isOpen = false;
  let tl;

  const origin = () => {
    const r = burger.getBoundingClientRect();
    return `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
  };

  function open() {
    if (isOpen) return;
    isOpen = true;
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    header.classList.add('is-menu-open');
    lockScroll(true);
    tl?.kill();
    const at = origin();
    if (env.reducedMotion) {
      gsap.set(menu, { clipPath: `circle(150% at ${at})` });
      return;
    }
    tl = gsap
      .timeline()
      .fromTo(menu, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})`, duration: 0.9, ease: 'expo.inOut' })
      .fromTo(links, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.3)
      .fromTo(footer, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 0.5);
  }

  function close({ instant = false } = {}) {
    if (!isOpen) return;
    isOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    header.classList.remove('is-menu-open');
    lockScroll(false);
    tl?.kill();
    const done = () => {
      menu.classList.remove('is-open');
      menu.setAttribute('inert', '');
      menu.setAttribute('aria-hidden', 'true');
    };
    if (instant || env.reducedMotion) {
      gsap.set(menu, { clipPath: `circle(0% at ${origin()})` });
      done();
      return;
    }
    tl = gsap.timeline({ onComplete: done }).to(menu, { clipPath: `circle(0% at ${origin()})`, duration: 0.7, ease: 'expo.inOut' });
  }

  burger.addEventListener('click', () => (isOpen ? close() : open()));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  // подразделы-аккордеоны
  menu.querySelectorAll('[data-mm-toggle]').forEach((btn) => {
    const sub = btn.closest('.mm-item').querySelector('[data-mm-sub]');
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      gsap.to(sub, { height: expanded ? 0 : 'auto', duration: 0.6, ease: 'expo.out' });
    });
  });

  // на широком экране меню не нужно
  window.matchMedia('(min-width: 1100px)').addEventListener?.('change', (e) => e.matches && close({ instant: true }));

  return { close, get isOpen() { return isOpen; } };
}
