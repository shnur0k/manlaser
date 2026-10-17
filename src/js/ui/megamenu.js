/**
 * Мегаменю «Услуги» и «Оборудование»: открывается при наведении (с небольшой задержкой),
 * при наведении на пункт меняется превью. Клавиатура: ↓ открывает, Esc закрывает.
 */
export function initMegaMenu(header) {
  if (!header) return { close() {} };
  const items = [...header.querySelectorAll('.has-mega')];
  const backdrop = header.querySelector('[data-mega-backdrop]');
  let openKey = null;
  let openTimer;
  let closeTimer;

  const panelFor = (key) => header.querySelector(`[data-mega-panel="${key}"]`);

  function open(key) {
    clearTimeout(closeTimer);
    if (openKey === key) return;
    if (openKey) closeNow();
    const panel = panelFor(key);
    const item = items.find((i) => i.dataset.mega === key);
    if (!panel || !item) return;
    openKey = key;
    panel.classList.add('is-open');
    panel.removeAttribute('inert');
    panel.setAttribute('aria-hidden', 'false');
    item.classList.add('is-open');
    item.querySelector('.nav__link').setAttribute('aria-expanded', 'true');
    header.classList.add('is-mega-open');
  }

  function closeNow() {
    if (!openKey) return;
    const panel = panelFor(openKey);
    const item = items.find((i) => i.dataset.mega === openKey);
    panel?.classList.remove('is-open');
    panel?.setAttribute('inert', '');
    panel?.setAttribute('aria-hidden', 'true');
    item?.classList.remove('is-open');
    item?.querySelector('.nav__link').setAttribute('aria-expanded', 'false');
    header.classList.remove('is-mega-open');
    openKey = null;
  }

  const scheduleClose = () => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeNow, 220);
  };

  items.forEach((item) => {
    const key = item.dataset.mega;
    const link = item.querySelector('.nav__link');
    const panel = panelFor(key);
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      openTimer = setTimeout(() => open(key), openKey ? 0 : 90);
    });
    item.addEventListener('pointerleave', scheduleClose);
    panel?.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    panel?.addEventListener('pointerleave', scheduleClose);

    link.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open(key);
        panel?.querySelector('.mega__link')?.focus();
      }
    });

    // превью: какой пункт под курсором/в фокусе — та картинка и видна
    panel?.querySelectorAll('[data-mega-item]').forEach((a) => {
      const show = () => {
        const i = a.dataset.megaItem;
        panel.querySelectorAll('[data-mega-item]').forEach((x) => x.classList.toggle('is-active', x === a));
        panel.querySelectorAll('[data-mega-shot]').forEach((s) => s.classList.toggle('is-active', s.dataset.megaShot === i));
      };
      a.addEventListener('pointerenter', show);
      a.addEventListener('focus', show);
    });
  });

  backdrop?.addEventListener('click', closeNow);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openKey) {
      const key = openKey;
      closeNow();
      items.find((i) => i.dataset.mega === key)?.querySelector('.nav__link').focus();
    }
  });
  header.addEventListener('focusout', (e) => {
    if (openKey && !header.contains(e.relatedTarget)) closeNow();
  });
  window.addEventListener('scroll', () => openKey && window.scrollY > 40 && scheduleClose(), { passive: true });

  return { close: closeNow };
}
