import { esc, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { button, messengerLinks, phoneLink } from '../components.js';

export function mobileMenu(ctx) {
  const { site } = ctx;
  return `<div class="mobile-menu" id="mobile-menu" data-mobile-menu aria-hidden="true" inert>
    <div class="mobile-menu__bg" aria-hidden="true"></div>
    <div class="mobile-menu__inner">
      <nav class="mobile-menu__nav" aria-label="Мобильное меню">
        <ul class="mm-list">
          ${each(site.nav, (item, i) => {
            if (!item.items) {
              return `<li class="mm-item"><a class="mm-link" href="${esc(item.url)}"><span class="mm-num">${pad2(i + 1)}</span>${esc(item.label)}</a></li>`;
            }
            return `<li class="mm-item mm-item--group">
              <div class="mm-row">
                <a class="mm-link" href="${esc(item.url)}"><span class="mm-num">${pad2(i + 1)}</span>${esc(item.label)}</a>
                <button class="mm-toggle" type="button" aria-expanded="false" aria-label="Показать подразделы: ${esc(item.label)}" data-mm-toggle>${icon('plus')}</button>
              </div>
              <div class="mm-sub" data-mm-sub><ul>
                ${each(item.items, (it) => `<li><a href="${esc(it.url)}">${esc(it.label)}</a></li>`)}
              </ul></div>
            </li>`;
          })}
        </ul>
      </nav>
      <div class="mobile-menu__footer">
        ${button({ label: 'Записаться на обработку', href: '/zapis/', extra: 'mobile-menu__cta' })}
        <div class="mobile-menu__phones">
          ${phoneLink(site.contacts.services)}
        </div>
        ${messengerLinks(ctx.contact, { variant: 'icon' })}
        <p class="mobile-menu__meta">${esc(site.address.full)} · ${esc(site.hours.short)}</p>
      </div>
    </div>
  </div>`;
}
