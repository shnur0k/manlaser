import { esc, t, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { telHref } from '../../js/lib/contacts.js';
import { activeNavUrl } from '../../js/lib/nav.js';

function megaPanel(ctx, item) {
  return `<div class="mega" id="mega-${item.section}" data-mega-panel="${item.section}" aria-hidden="true" inert>
    <div class="container">
      <div class="mega__inner">
        <ul class="mega__list">
          ${each(
            item.items,
            (it, i) => `<li>
              <a class="mega__link" href="${esc(it.url)}" data-mega-item="${i}">
                <span class="mega__num">${pad2(i + 1)}</span>
                <span class="mega__text"><span class="mega__title">${t(it.label)}</span><span class="mega__desc">${t(it.text)}</span></span>
                <span class="mega__arrow">${icon('arrow-up-right')}</span>
              </a>
            </li>`,
          )}
        </ul>
        <div class="mega__preview" aria-hidden="true">
          ${each(item.items, (it, i) => `<div class="mega__shot${i === 0 ? ' is-active' : ''}" data-mega-shot="${i}">${ctx.media(it.media, { ratio: '4/3' })}</div>`)}
          <div class="mega__preview-glow"></div>
        </div>
      </div>
      ${item.footer ? `<a class="mega__footer" href="${esc(item.footer.url)}"><span>${esc(item.footer.label)}</span>${icon('arrow-right')}</a>` : ''}
    </div>
  </div>`;
}

export function header(ctx) {
  const { site, route, contact } = ctx;
  const activeUrl = activeNavUrl(site.nav, route.url);
  return `<header class="site-header" data-header>
    <div class="site-header__bar">
      <div class="container site-header__row">
        <a class="logo" href="/" aria-label="manlaser — на главную" data-cursor-stick>${ctx.logo}</a>

        <nav class="nav" aria-label="Основное меню">
          <ul class="nav__list" data-nav>
            ${each(site.nav, (item) => {
              const active = item.url === activeUrl ? ' is-active' : '';
              const current = active ? ' aria-current="page"' : '';
              const ic = item.icon ? icon(item.icon, 'nav__icon') : '';
              if (item.mega) {
                return `<li class="nav__item has-mega" data-mega="${item.section}">
                  <a class="nav__link${active}" href="${esc(item.url)}" data-nav-url="${esc(item.url)}"${current} aria-expanded="false" aria-controls="mega-${item.section}">${ic}${esc(item.label)}${icon('chevron-down', 'nav__chevron')}</a>
                </li>`;
              }
              if (item.items?.length) {
                // небольшое выпадающее меню (например, «О нас» → О компании / Контакты / Частые вопросы)
                return `<li class="nav__item has-drop">
                  <a class="nav__link${active}" href="${esc(item.url)}" data-nav-url="${esc(item.url)}"${current} aria-haspopup="true">${ic}${esc(item.label)}${icon('chevron-down', 'nav__chevron')}</a>
                  <div class="drop"><ul class="drop__list">
                    ${each(
                      item.items,
                      (it) => `<li><a class="drop__link" href="${esc(it.url)}">
                        ${it.icon ? `<span class="drop__icon">${icon(it.icon)}</span>` : ''}
                        <span class="drop__text"><strong>${esc(it.label)}</strong>${it.text ? `<small>${esc(it.text)}</small>` : ''}</span>
                      </a></li>`,
                    )}
                  </ul></div>
                </li>`;
              }
              return `<li class="nav__item"><a class="nav__link${active}" href="${esc(item.url)}" data-nav-url="${esc(item.url)}"${current}>${ic}${esc(item.label)}</a></li>`;
            })}
          </ul>
        </nav>

        <div class="site-header__actions">
          <a class="header-phone" href="${esc(telHref(contact))}" data-phone>
            <small data-phone-label>${esc(contact.label)}</small>
            <span data-phone-number>${esc(contact.phone)}</span>
          </a>
          <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-menu" data-burger>
            <span></span><span></span>
          </button>
        </div>
      </div>
    </div>
    ${each(site.nav.filter((i) => i.mega), (item) => megaPanel(ctx, item))}
    <div class="mega-backdrop" data-mega-backdrop aria-hidden="true"></div>
  </header>`;
}
