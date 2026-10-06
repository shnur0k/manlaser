/**
 * Плавающие кнопки: «Записаться» + мессенджеры. Это главная кнопка записи на сайте:
 * видна всегда, но прячется, когда на экране есть другая кнопка записи (в блоке-призыве, футере),
 * чтобы «Записаться» на экране была одна.
 */
export function initFloating() {
  const root = document.querySelector('[data-floating]');
  if (!root) return { refresh() {} };
  const chat = root.querySelector('[data-chat]');
  const toggle = root.querySelector('[data-chat-toggle]');
  const cta = root.querySelector('[data-floating-cta]');

  const setOpen = (open) => {
    chat.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!chat.classList.contains('is-open')));
  document.addEventListener('click', (e) => !chat.contains(e.target) && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  root.classList.add('is-visible');

  let io = null;
  const visibleCtas = new Set();

  return {
    refresh(container) {
      setOpen(false);
      io?.disconnect();
      visibleCtas.clear();
      cta?.classList.remove('is-hidden');
      if (!container || !('IntersectionObserver' in window)) return;
      // на странице записи плавающая кнопка не нужна вовсе
      root.classList.toggle('is-booking', container.dataset.barbaNamespace === 'booking');
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? visibleCtas.add(e.target) : visibleCtas.delete(e.target)));
          cta?.classList.toggle('is-hidden', visibleCtas.size > 0);
        },
        { rootMargin: '0px 0px -60px 0px' },
      );
      container.querySelectorAll('a[href^="/zapis/"]').forEach((a) => io.observe(a));
    },
  };
}
