import site from '../../../content/site.json';
import { telHref, messengerHref, sectionKey } from '../lib/contacts.js';
import { activeNavUrl } from '../lib/nav.js';

/**
 * Шапка: состояние при скролле (фон, скрытие вниз/появление вверх),
 * активный пункт меню и «правильный» телефон/мессенджеры для раздела.
 */
export function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return { update() {} };

  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 12);
      if (Math.abs(y - lastY) > 6) {
        header.classList.toggle('is-hidden', y > lastY && y > 160);
        lastY = y;
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const phone = header.querySelector('[data-phone]');

  /** Вызывается при каждой смене страницы. */
  function update({ url, section }) {
    const key = site.contacts[sectionKey(section)] ? sectionKey(section) : 'services';
    const contact = { ...site.contacts[key], email: site.email };
    document.body.dataset.section = key;

    const activeUrl = activeNavUrl(site.nav, url);
    header.querySelectorAll('[data-nav-url]').forEach((a) => {
      const on = a.dataset.navUrl === activeUrl;
      a.classList.toggle('is-active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });

    if (phone) {
      phone.href = telHref(contact);
      phone.querySelector('[data-phone-label]').textContent = contact.label;
      phone.querySelector('[data-phone-number]').textContent = contact.phone;
    }

    // мессенджеры в постоянных элементах (плавающие кнопки, мобильное меню)
    document.querySelectorAll('[data-floating] [data-messenger], [data-mobile-menu] [data-messenger]').forEach((a) => {
      a.href = messengerHref(a.dataset.messenger, contact);
    });

    const cta = site.cta[key];
    const floatingCta = document.querySelector('[data-floating-cta]');
    if (floatingCta && cta) {
      floatingCta.href = import.meta.env.BASE_URL.replace(/\/$/, '') + cta.url; // base сайта (GitHub Pages)
      floatingCta.querySelector('[data-floating-label]').textContent = cta.label;
    }
    header.classList.remove('is-hidden');
  }

  return { update, el: header };
}
