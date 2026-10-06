import barba from '@barba/core';
import config from '../../config.js';
import { ScrollTrigger } from './lib/gsap.js';
import { env } from './core/env.js';
import { initScroll, scrollTo } from './core/scroll.js';
import { createTransition } from './core/transitions.js';
import { mountPage, unmountPage } from './core/page.js';
import { updateHead } from './core/head.js';
import { initHeader } from './ui/header.js';
import { initMegaMenu } from './ui/megamenu.js';
import { initMobileMenu } from './ui/mobile-menu.js';
import { initFloating } from './ui/floating.js';
import { initCursor } from './ui/cursor.js';
import { initMagnetic, initAnchors, initImages } from './ui/interactions.js';
const html = document.documentElement;
if (env.reducedMotion) html.classList.add('reveal-off');
if (!config.grain) html.classList.add('no-grain');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

initScroll(config.smoothScroll);
const header = initHeader();
const mega = initMegaMenu(header.el);
const mobile = initMobileMenu(header.el);
const floating = initFloating();
const resetCursor = initCursor(config.cursor);
initMagnetic(document.querySelector('[data-header]'));
initMagnetic(document.querySelector('[data-floating]'));
initImages(document.querySelector('[data-header]'));
initAnchors();

const transition = createTransition(env.reducedMotion ? 'fade' : config.transition);
const scrollPositions = new Map();

/** Привести «постоянные» элементы (шапка, плавающие кнопки) в соответствие странице. */
function syncChrome(container) {
  const ns = container.dataset.barbaNamespace;
  header.update({ url: container.dataset.url || location.pathname, section: container.dataset.section });
  html.dataset.page = ns;
  floating.refresh(container);
  resetCursor?.();
}

function initRouter() {
  barba.init({
    timeout: 10000,
    preventRunning: true,
    // при разработке страницы не кэшируются — после правок в переходах сразу видна новая версия
    cacheIgnore: import.meta.env.DEV,
    prefetchIgnore: import.meta.env.DEV,
    prevent: ({ el, href }) =>
      Boolean(el?.closest('[data-barba-prevent]')) || /^(tel|mailto|viber|tg|whatsapp):/i.test(href || '') || /\.(pdf|zip|jpe?g|png|webp|mp4)(\?|$)/i.test(href || ''),
    transitions: [
      {
        name: 'manlaser',
        async leave(data) {
          scrollPositions.set(data.current.url.href, window.scrollY);
          mega.close();
          mobile.close({ instant: false });
          await transition.cover();
          unmountPage();
          data.current.container.style.display = 'none';
        },
        async enter(data) {
          const next = data.next.container;
          const isHistory = data.trigger === 'back' || data.trigger === 'forward' || data.trigger === 'popstate';
          updateHead(data.next.html);
          syncChrome(next);
          scrollTo(isHistory ? scrollPositions.get(data.next.url.href) || 0 : 0, { immediate: true });

          const page = await mountPage(next);
          ScrollTrigger.refresh();
          const revealed = transition.reveal();
          page.start();
          await revealed;

          // якорь (#faq и т.п.): Barba его не сохраняет — берём из нажатой ссылки
          const linkHash = data.trigger instanceof Element ? data.trigger.hash : '';
          const hash = (linkHash || (data.next.url.hash ? `#${data.next.url.hash}` : '')).replace(/^##/, '#');
          if (hash && !isHistory) {
            const target = document.getElementById(decodeURIComponent(hash.slice(1)));
            if (target) {
              history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
              ScrollTrigger.refresh();
              requestAnimationFrame(() => scrollTo(target));
            }
          }
        },
      },
    ],
  });
}

async function boot() {
  const container = document.querySelector('[data-barba="container"]');
  syncChrome(container);
  try {
    await document.fonts?.ready;
  } catch {}
  const page = await mountPage(container);
  page.start();
  window.__mlReady = true;
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) setTimeout(() => scrollTo(target, { immediate: true }), 60);
  }
  initRouter();
}

boot();
