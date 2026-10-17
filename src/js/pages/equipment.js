import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';

/**
 * Каталог оборудования: фильтр по категориям без перезагрузки.
 * Предвыбор — адрес /oborudovanie/?cat=chistka (ссылки из меню и с главной); выбор записывается обратно в адрес.
 */
export default function equipment(container) {
  const bar = container.querySelector('[data-cat-filter]');
  const grid = container.querySelector('[data-cat-grid]');
  if (!bar || !grid) return null;
  const infos = [...container.querySelectorAll('[data-cat-info-for]')];
  const buttons = [...bar.querySelectorAll('[data-cat]')];
  const cards = [...grid.children];

  function apply(cat, { animate = true } = {}) {
    const known = buttons.some((b) => b.dataset.cat === cat);
    const active = known ? cat : '*';
    buttons.forEach((b) => {
      const on = b.dataset.cat === active;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    infos.forEach((el) => (el.hidden = el.dataset.catInfoFor !== active));
    cards.forEach((card) => {
      const show = active === '*' || card.dataset.tags === active;
      const was = !card.hidden;
      card.hidden = !show;
      if (show && !was && animate && !env.reducedMotion) gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, clearProps: 'opacity,transform' });
    });
    return active;
  }

  const initial = new URLSearchParams(location.search).get('cat') || '*';
  apply(initial, { animate: false });

  const onClick = (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    const active = apply(btn.dataset.cat);
    const url = new URL(location.href);
    active === '*' ? url.searchParams.delete('cat') : url.searchParams.set('cat', active);
    history.replaceState(history.state, '', url);
  };
  bar.addEventListener('click', onClick);
  return () => bar.removeEventListener('click', onClick);
}
