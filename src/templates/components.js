import { esc, t, rich, each, cls, attrs, pad2, formatDate } from './lib.js';
import { icon } from './icons.js';
import { media } from './media.js';
import { telHref, messengerHref, MESSENGERS } from '../js/lib/contacts.js';

export const eyebrow = (text, extra = '') => `<span class="eyebrow ${extra}"><i aria-hidden="true"></i>${t(text)}</span>`;

export function button({ label, href = '#', variant = 'primary', size = '', iconName = 'arrow-up-right', magnetic = true, extra = '', attr = {} }) {
  const tag = href ? 'a' : 'button';
  const a = attrs({ href: href || false, type: href ? false : 'button', 'data-magnetic': magnetic || false, ...attr });
  return `<${tag} class="${cls('btn', `btn--${variant}`, size && `btn--${size}`, extra)}" ${a}>
    <span class="btn__label">${esc(label)}</span>${iconName ? `<span class="btn__icon">${icon(iconName)}</span>` : ''}
  </${tag}>`;
}

// Описания под заголовками (страниц и разделов) выключены по просьбе владельца; включить обратно — SHOW_LEADS = true
const SHOW_LEADS = false;

// Автонумерация заголовков секций на странице: (01), (02)… Сбрасывается перед рендером каждой страницы.
let headIndex = 0;
let glowIndex = 0;
export const resetSectionIndex = () => {
  headIndex = 0;
  glowIndex = 0;
};
const GLOWS = ['br', 'l', 'r', 'bl', 'b'];

/**
 * Заголовок секции в журнальной вёрстке: тонкая линия-разделитель сверху, крупный заголовок
 * со сдвинутой первой строкой, описание отдельной колонкой. *слово* в заголовке — акцент.
 */
export function sectionHead({ eyebrow: eb, title, lead: leadText, align = 'center', id, level = 2, action = '', label = true }) {
  headIndex += 1;
  const lead = SHOW_LEADS ? leadText : '';
  return `<div class="section-head section-head--${align}"${id ? ` id="${esc(id)}"` : ''}>
    ${label ? '<div class="section-head__rule" data-reveal aria-hidden="true"></div>' : ''}
    <h${level} class="h2 section-head__title" data-split>${rich(title)}</h${level}>
    ${lead || action ? `<div class="section-head__aside${lead ? '' : ' section-head__aside--action'}" data-reveal>${lead ? `<p class="lead">${t(lead)}</p>` : ''}${action}</div>` : ''}
  </div>`;
}

/**
 * Шапка внутренней страницы: огромный заголовок на всю ширину,
 * под ним три колонки (метка · описание · кнопки) и кинокадр 21:9.
 */
export function pageHero(ctx, { eyebrow: eb, title, lead: leadText, actions = '', mediaKey, variant = '' }) {
  const lead = SHOW_LEADS ? leadText : '';
  return `<section class="${cls('page-hero', variant && `page-hero--${variant}`, !mediaKey && 'page-hero--solo')}" data-glow="tr">
    <div class="page-hero__glow" aria-hidden="true"></div>
    <div class="container">
      ${eb ? `<div class="page-hero__top"><span class="page-hero__eyebrow">${t(eb)}</span></div>` : ''}
      <div class="page-hero__row">
        <h1 class="h1 page-hero__title" data-split>${rich(title).replace(/\n/g, '<br>')}</h1>
        ${actions && !lead ? `<div class="actions page-hero__actions" data-reveal>${actions}</div>` : ''}
      </div>
      ${lead ? `<div class="page-hero__bottom">
        <span aria-hidden="true"></span>
        ${lead ? `<p class="lead page-hero__lead" data-reveal>${t(lead)}</p>` : '<span></span>'}
        ${actions ? `<div class="actions page-hero__actions" data-reveal>${actions}</div>` : ''}
      </div>` : ''}
      ${mediaKey ? `<div class="page-hero__media" data-reveal="scale" data-parallax>${ctx.media(mediaKey, { eager: true, ratio: '21/9' })}</div>` : ''}
    </div>
  </section>`;
}

/** Хлебные крошки страницы (для карточки товара). */
export function crumbs(route) {
  const all = [{ name: 'Главная', url: '/' }, ...(route.crumbs || [])];
  return `<nav class="crumbs" aria-label="Вы здесь"><ol>${all
    .map((c, i) => (i === all.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${esc(c.url)}">${esc(c.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

/** Таблица характеристик товара: пары [название, значение]. */
export function specTable(specs) {
  return `<div class="table-wrap" data-reveal><table class="spec-table"><tbody>${each(specs, ([k, v]) => `<tr><th scope="row">${t(k)}</th><td>${t(v)}</td></tr>`)}</tbody></table></div>`;
}

/** Бейдж наличия: «в наличии» — зелёный, остальное — под заказ/уточнить. */
export const stockBadge = (stock) => `<span class="stock stock--${stock === 'в наличии' ? 'in' : 'order'}">${t(stock)}</span>`;

/** Карточка товара в каталоге. */
export function productCard(ctx, p, { tags = '' } = {}) {
  return `<a class="card card--product" href="${esc(p.url)}" data-tags="${esc(tags || p.category)}" data-tilt="soft" data-cursor="Подробнее">
    <div class="card__media">${ctx.media(p.media, { ratio: '1/1' })}</div>
    <div class="card__body">
      <div class="card__top"><span class="tag">${t(p.power)}</span>${stockBadge(p.stock)}</div>
      <h3 class="card__title">${t(p.name)}</h3>
      <p class="card__text">${t(p.type)}</p>
      <p class="card__price">${t(p.price)}</p>
      <span class="card__arrow">${icon('arrow-up-right')}</span>
    </div>
    <span class="card__glow" aria-hidden="true"></span>
  </a>`;
}

export function serviceCard(ctx, { title, text, url, mediaKey, mediaHoverKey, index, tag }) {
  return `<a class="card card--service" href="${esc(url)}" data-tilt data-cursor="Подробнее">
    <div class="card__media">
      ${ctx.media(mediaKey, { ratio: '4/3' })}
      ${mediaHoverKey ? `<div class="card__media-hover">${ctx.media(mediaHoverKey, { ratio: '4/3' })}</div>` : ''}
    </div>
    <div class="card__body">
      <div class="card__top">${index != null ? `<span class="card__index">${pad2(index)}</span>` : ''}${tag ? `<span class="tag">${esc(tag)}</span>` : ''}</div>
      <h3 class="card__title">${t(title)}</h3>
      ${text ? `<p class="card__text">${t(text)}</p>` : ''}
      <span class="card__arrow">${icon('arrow-up-right')}</span>
    </div>
    <span class="card__glow" aria-hidden="true"></span>
  </a>`;
}

/** Бегущая строка: слова чередуются заливкой и контуром. */
export function marquee(items) {
  const row = each(items, (it, i) => `<span class="marquee__item${i % 2 ? ' marquee__item--outline' : ''}">${esc(it)}</span><span class="marquee__star">✦</span>`);
  return `<div class="marquee" aria-hidden="true"><div class="marquee__track">${row}${row}</div></div>`;
}

/** Единственное упоминание об услугах — со ссылкой на сайт услуг (manlaser-center.by). */
export function equipmentNote(ctx, extra = '') {
  const n = ctx.site.equipmentNote;
  if (!n) return '';
  return `<p class="${cls('equipment-note', extra)}">${esc(n.text)} — <a href="${esc(n.url)}" target="_blank" rel="noopener" data-barba-prevent>${esc(n.label)} ${icon('arrow-up-right')}</a></p>`;
}

export function features(items, { numbered = true, cols = 3, extra = '' } = {}) {
  return `<ul class="${cls('features', `features--${cols}`, extra)}" data-stagger>
    ${each(
      items,
      (it, i) => `<li class="feature">
        ${numbered ? `<span class="feature__num">${pad2(i + 1)}</span>` : it.icon ? `<span class="feature__icon">${icon(it.icon)}</span>` : ''}
        <h3 class="feature__title">${t(it.title)}</h3>
        ${it.text ? `<p class="feature__text">${t(it.text)}</p>` : ''}
      </li>`,
    )}
  </ul>`;
}

export function steps(items) {
  return `<ol class="steps" data-steps>
    ${each(
      items,
      (s, i) => `<li class="step">
        <span class="step__num">${pad2(i + 1)}</span>
        <div class="step__body">
          <h3 class="step__title">${t(s.title)}</h3>
          <p class="step__text">${t(s.text)}</p>
        </div>
      </li>`,
    )}
  </ol>`;
}

export function faq(items, { id = 'faq' } = {}) {
  return `<div class="faq" id="${esc(id)}-list">
    ${each(
      items,
      (it) => `<details class="faq__item" data-accordion>
        <summary class="faq__q"><span>${t(it.q)}</span><span class="faq__icon">${icon('plus')}</span></summary>
        <div class="faq__a"><div class="faq__a-inner"><p>${t(it.a)}</p></div></div>
      </details>`,
    )}
  </div>`;
}

export function counters(items) {
  return `<ul class="counters" data-stagger>
    ${each(
      items,
      (c) => `<li class="counter">
        <span class="counter__value"><span class="counter__prefix">${esc(c.prefix || '')}</span><span data-count="${esc(c.value)}">${esc(
          Number(c.value).toLocaleString('ru-RU'),
        )}</span><span class="counter__suffix">${esc(c.suffix || '')}</span></span>
        <span class="counter__label">${t(c.label)}</span>
      </li>`,
    )}
  </ul>`;
}

export function reviewCard(r) {
  return `<figure class="review">
    <div class="review__stars" aria-label="Оценка ${r.rating || 5} из 5">${icon('star').repeat(r.rating || 5)}</div>
    <blockquote class="review__text"><p>${t(r.text)}</p></blockquote>
    <figcaption class="review__author">
      <span class="review__avatar" aria-hidden="true">${esc((r.name || '?').trim()[0])}</span>
      <span><strong>${esc(r.name)}</strong><small>${esc(formatDate(r.date))}${r.source ? ` · ${esc(r.source)}` : ''}</small></span>
    </figcaption>
  </figure>`;
}

export function messengerLinks(contact, { variant = 'pill', text = '' } = {}) {
  return `<ul class="messengers messengers--${variant}" data-messenger-links>
    ${each(
      MESSENGERS,
      (m) => `<li><a class="messenger messenger--${m.type}" href="${esc(messengerHref(m.type, contact, text))}" data-messenger="${m.type}" target="_blank" rel="noopener" aria-label="${m.label}">
        ${icon(m.type)}${variant === 'pill' ? `<span>${m.label}</span>` : ''}
      </a></li>`,
    )}
  </ul>`;
}

export function phoneLink(contact, { showLabel = true, extra = '' } = {}) {
  return `<a class="${cls('phone-link', extra)}" href="${esc(telHref(contact))}">
    ${showLabel ? `<small>${esc(contact.label)}</small>` : ''}<span>${esc(contact.phone)}</span>
  </a>`;
}

export function ctaBand(ctx, { title, text, primary, secondary } = {}) {
  const contact = ctx.contact;
  return `<section class="cta-band" data-reveal data-glow="b">
    <div class="container">
      <div class="cta-band__inner">
        <div class="cta-band__beam" aria-hidden="true"></div>
        <div class="cta-band__text">
          <h2 class="h2" data-split>${rich(title || 'Подберём *оборудование* под вашу задачу')}</h2>
          <p class="lead">${t(text || 'Назовём цену, покажем аппарат в работе и привезём по всей Беларуси.')}</p>
        </div>
        <div class="cta-band__actions">
          <div class="actions">
            ${primary || button({ label: 'Запросить цену', href: '/zapros/' })}
            ${secondary ?? button({ label: 'Каталог', href: '/oborudovanie/', variant: 'ghost', iconName: 'arrow-right' })}
          </div>
          <div class="cta-band__contacts">
            ${phoneLink(contact, { extra: 'phone-link--lg' })}
            ${messengerLinks(contact, { variant: 'icon' })}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/** Секция. glow — светящееся пятно у края (br, bl, b, l, r, tr, tl), false — без пятна; по умолчанию пятна идут через одну секцию. */
/** Тонкая линия-разделитель между информационными блоками (как над заголовками разделов). */
export const ruleLine = '<div class="section-rule" aria-hidden="true"></div>';

export function section(inner, { id, extra = '', container = true, glow, rule = true } = {}) {
  const tight = /\btight\b/.test(extra); // «узкие» секции в счёт не идут и пятен не получают
  const n = tight ? -1 : glowIndex++;
  const auto = !tight && n % 2 === 0 ? GLOWS[(n / 2) % GLOWS.length] : undefined;
  const g = glow === undefined ? auto : glow || undefined;
  return `<section class="${cls('section', extra)}"${id ? ` id="${esc(id)}"` : ''}${g ? ` data-glow="${g}"` : ''}>${container ? `<div class="container">${rule && !inner.includes('section-head__rule') ? ruleLine : ''}${inner}</div>` : inner}</section>`;
}

export { media, icon };
