import { esc, t, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import {
  ruleLine, button, eyebrow, sectionHead, features, faq, counters, specTable, productCard, stockBadge, crumbs, pageHero, section, messengerLinks, phoneLink,
} from '../components.js';
import { product as productSchema, faqPage } from '../schema.js';

const productLabel = (p) => `${p.type} ${p.name}`;

/** Кнопка «Запросить цену» с предвыбором товара в форме заявки. */
const requestButton = (p, label = 'Запросить цену / демо') => button({ label, href: p ? `/zapros/?product=${p.slug}` : '/zapros/' });

/** Каталог: одна страница, фильтр по 4 категориям (скрипт — src/js/pages/equipment.js, предвыбор — ?cat=id). */
export function equipmentHub(ctx) {
  const { c } = ctx;
  const e = c.equipment;
  const p = c.pages.equipment;
  const countOf = (id) => e.products.filter((x) => x.category === id).length;

  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, actions: requestButton(null, 'Запросить цену') })}

    ${section(`<h2 class="sr-only">Каталог оборудования</h2>
      <div class="tag-filter" role="group" aria-label="Категории оборудования" data-cat-filter>
        <button class="tag-filter__btn is-active" type="button" data-cat="*">Все <small>${e.products.length}</small></button>
        ${each(e.categories, (cat) => `<button class="tag-filter__btn" type="button" data-cat="${esc(cat.id)}">${esc(cat.chip || cat.title)} <small>${countOf(cat.id)}</small></button>`)}
      </div>

      <div class="cat-info" data-cat-info>
        <div class="cat-info__item" data-cat-info-for="*">
          <p class="lead">${t(e.intro.lead)}</p>
        </div>
        ${each(e.categories, (cat) => `<div class="cat-info__item" data-cat-info-for="${esc(cat.id)}" hidden>
          <p class="lead">${t(cat.short)} ${t(cat.lead)}</p>
          <p class="cat-info__price">${t(cat.priceFrom)}</p>
          ${cat.notes?.length ? `<ul class="notes">${each(cat.notes, (n) => `<li>${t(n)}</li>`)}</ul>` : ''}
        </div>`)}
      </div>

      <div class="product-grid" data-cat-grid>
        ${each(e.products, (pr) => productCard(ctx, pr, { tags: pr.category }))}
      </div>`, { id: 'katalog', extra: 'section--tight' })}

    ${section(counters(e.counters), { extra: 'section--tight' })}
    ${section(`${sectionHead({ eyebrow: 'Почему manlaser', title: 'Условия *покупки*' })}${features(e.advantages)}`)}
    ${section(`<div class="link-cards" data-stagger>
      <a class="link-card" href="/remont/">${icon('wrench')}<span><strong>Ремонт и диагностика</strong><small>Диагностика 1–2 рабочих дня, гарантия на работы 6 месяцев</small></span>${icon('arrow-up-right')}</a>
      <a class="link-card" href="/oplata-i-dostavka/">${icon('truck')}<span><strong>Оплата и доставка</strong><small>Бесплатно по Беларуси, рассрочка, лизинг, кредит</small></span>${icon('arrow-up-right')}</a>
    </div>`, { extra: 'section--tight' })}`;
}

export function product(ctx) {
  const { c, route } = ctx;
  const { product: p, category: cat } = route.data;
  const related = c.equipment.products.filter((x) => x.category === cat.id && x.slug !== p.slug).slice(0, 3);
  return {
    cta: { title: `Запросить цену на *${p.name}*`, text: 'Назовём цену, покажем аппарат в работе и привезём по всей Беларуси.', primary: requestButton(p, 'Запросить цену') },
    body: `
    <section class="page-hero page-hero--product" data-glow="tr">
      <div class="page-hero__glow" aria-hidden="true"></div>
      <div class="container">
        ${crumbs(route)}
        <div class="product">
          <div class="product__media" data-reveal="scale">${ctx.media(p.media, { ratio: '1/1', eager: true })}</div>
          <div class="product__info">
            ${eyebrow(p.type)}
            <h1 class="h1">${t(p.name)}</h1>
            <div class="product__meta"><span class="tag">${t(p.power)}</span>${stockBadge(p.stock)}<span class="tag">Гарантия: ${t(p.warranty)}</span></div>
            <p class="product__price">${t(p.price)}</p>
            <div class="actions">${requestButton(p)}${button({ label: 'Оплата и доставка', href: '/oplata-i-dostavka/', variant: 'ghost', iconName: 'arrow-right' })}</div>
            <ul class="product__perks">
              <li>${icon('truck')}Бесплатная доставка по Беларуси</li>
              <li>${icon('wrench')}Пусконаладка в подарок</li>
              <li>${icon('card')}Рассрочка 6 месяцев, лизинг, кредит</li>
              <li>${icon('shield')}Тест на ваших материалах перед покупкой</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
    ${section(`${sectionHead({ eyebrow: 'Характеристики', title: `Технические данные *${p.name}*` })}${specTable(p.specs)}`)}
    ${related.length ? section(`${sectionHead({ eyebrow: cat.title, title: 'Другие *модели*' })}<div class="product-grid" data-stagger>${each(related, (r) => productCard(ctx, r))}</div>`) : ''}`,
    schema: [productSchema(ctx, p, route.url)],
  };
}

export function repair(ctx) {
  const { c } = ctx;
  const r = c.repair;
  const p = c.pages.repair;
  const items = c.faq.groups.find((g) => g.id === 'repair')?.items || [];
  return {
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, actions: button({ label: 'Оставить заявку', href: '/zapros/?product=repair' }), mediaKey: 'eq.repair' })}
    ${section(`<ul class="facts-inline">
      <li><span>Диагностика</span><strong>${t(r.diagnostics)}</strong></li>
      <li><span>Гарантия</span><strong>${t(r.warranty)}</strong></li>
      <li><span>Стоимость</span><strong>${t(r.price)}</strong></li>
    </ul><p class="muted">${t(r.lead)} Ремонтируем: ${t(r.brands)}.</p>`, { extra: 'section--tight' })}
    ${section(`${sectionHead({ eyebrow: 'Услуги', title: 'Что *ремонтируем*' })}
      <div class="repair-list" data-stagger>${each(
        r.services,
        (s, i) => `<article class="repair-item">
          <span class="repair-item__num">${pad2(i + 1)}</span>
          <div><h3 class="repair-item__title">${t(s.title)}</h3><p>${t(s.text)}</p>
          ${s.includes ? `<ul class="ticks">${each(s.includes, (x) => `<li>${icon('check')}${t(x)}</li>`)}</ul>` : ''}
          ${s.note ? `<p class="muted small">${t(s.note)}</p>` : ''}</div>
        </article>`,
      )}</div>`)}
    ${section(`${sectionHead({ eyebrow: 'Преимущества', title: 'Почему нам *доверяют* ремонт' })}${features(r.advantages)}`)}
    ${section(`${sectionHead({ eyebrow: 'FAQ', title: 'Вопросы о *ремонте*', id: 'faq' })}${faq(items, { id: 'faq-repair' })}`)}`,
    schema: [faqPage(items)],
  };
}

export function delivery(ctx) {
  const d = ctx.c.delivery;
  const p = ctx.c.pages.delivery;
  const block = (b, id, iconName) =>
    section(`${sectionHead({ title: b.title, id })}${features(b.items.map((x) => ({ ...x, icon: iconName })), { numbered: false, cols: b.items.length > 3 ? 4 : 3 })}`);
  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, actions: `<a class="pill-link" href="#usloviya">Доставка</a><a class="pill-link" href="#puskonaladka">Пусконаладка и гарантия</a><a class="pill-link" href="#oplata">Оплата</a>` })}
    ${block(d.delivery, 'usloviya', 'truck')}
    ${block(d.launch, 'puskonaladka', 'wrench')}
    ${block(d.payment, 'oplata', 'card')}
    ${section(`<div class="note-card">${icon('shield')}<div><h3>${t(d.beforeBuy.title)}</h3><p>${t(d.beforeBuy.text)}</p></div></div>`, { extra: 'section--tight' })}`;
}

/** Заявка «Запросить цену»: форма с проверкой телефона (скрипт — src/js/pages/request.js). */
export function request(ctx) {
  const { c, site } = ctx;
  const p = c.pages.request;
  const e = c.equipment;
  const step = (n, title, inner) =>
    `<fieldset class="calc-step"><legend class="calc-step__title"><span class="calc-step__num">${pad2(n)}</span>${esc(title)}</legend>${inner}</fieldset>`;
  const chip = (name, value, label, checked = false) =>
    `<label class="chip-check chip-check--radio"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}><span>${icon('check')}${esc(label)}</span></label>`;
  const field = (id, label, input, hint = '') =>
    `<div class="field" data-field="${id}"><label class="field__label" for="rq-${id}">${label}</label>${input}<p class="field__error" id="rq-${id}-error" aria-live="polite"></p>${hint ? `<p class="field__hint">${hint}</p>` : ''}</div>`;

  const options = `<option value="consult">Помогите подобрать оборудование</option>
    <option value="repair">Ремонт или диагностика</option>
    ${each(e.categories, (cat) => `<optgroup label="${esc(cat.title)}">${each(e.products.filter((x) => x.category === cat.id), (pr) => `<option value="${esc(pr.slug)}">${esc(productLabel(pr))}</option>`)}</optgroup>`)}`;

  return {
    cta: false, // форма сама и есть призыв
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, variant: 'compact' })}
    <section class="section booking" data-booking>
      <div class="container">${ruleLine}</div>
      <div class="container booking__grid">
        <div class="booking__main">
          <form class="booking-form" data-booking-form novalidate>
            ${step(1, 'Что интересует', field('product', 'Оборудование или услуга', `<select class="input" id="rq-product" name="product">${options}</select>`))}
            ${step(
              2,
              'Контакты',
              `<div class="field-row">
                ${field('name', 'Как к вам обращаться', `<input class="input" id="rq-name" name="name" type="text" autocomplete="name" maxlength="60" placeholder="Имя" aria-describedby="rq-name-error">`)}
                ${field('phone', 'Телефон <span class="field__req">*</span>', `<input class="input" id="rq-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+375 (__) ___-__-__" required aria-required="true" aria-describedby="rq-phone-error">`)}
              </div>
              <p class="field__label">Как удобнее связаться</p>
              <div class="chip-select">
                ${chip('contact', 'call', 'Позвонить', true)}${chip('contact', 'telegram', 'Telegram')}${chip('contact', 'viber', 'Viber')}${chip('contact', 'whatsapp', 'WhatsApp')}
              </div>`,
            )}
            ${step(3, 'Задача', field('comment', 'Комментарий', `<textarea class="input input--area" id="rq-comment" name="comment" rows="3" maxlength="800" placeholder="Какой металл и какие детали обрабатываете, какая нужна мощность, нужна ли демонстрация"></textarea>`))}
            <div class="booking-form__footer">
              <label class="consent" data-field="consent">
                <input type="checkbox" name="consent" required aria-describedby="rq-consent-error">
                <span class="consent__box">${icon('check')}</span>
                <span class="consent__text">Согласен на обработку персональных данных для связи по заявке. ${t('[ССЫЛКА НА ПОЛИТИКУ КОНФИДЕНЦИАЛЬНОСТИ]')}</span>
              </label>
              <p class="field__error" id="rq-consent-error" aria-live="polite"></p>
              <button class="btn btn--primary booking-form__submit" type="submit" data-magnetic>
                <span class="btn__label">Отправить заявку</span><span class="btn__icon">${icon('arrow-up-right')}</span>
              </button>
              <p class="booking-form__note">${icon('clock')}${esc(site.responsePromise)} в рабочее время: ${esc(site.hours.short)}</p>
            </div>
          </form>

          <div class="booking-success" data-booking-success hidden tabindex="-1">
            <svg class="booking-success__mark" viewBox="0 0 120 120" aria-hidden="true">
              <circle class="booking-success__ring" cx="60" cy="60" r="52"/>
              <path class="booking-success__check" d="M36 62 L53 78 L86 44"/>
            </svg>
            <canvas class="booking-success__sparks" data-success-sparks></canvas>
            <h2 class="h2 booking-success__title">Заявка сформирована</h2>
            <p class="lead booking-success__text" data-success-text></p>
            <p class="booking-success__dev" data-success-dev hidden>Отправка заявок пока не подключена (config.js → booking.send) — заявка никуда не ушла. Текст заявки — в консоли браузера.</p>
            <div class="actions">
              <a class="btn btn--ghost" href="/"><span class="btn__label">На главную</span><span class="btn__icon">${icon('arrow-right')}</span></a>
              <button class="btn btn--ghost" type="button" data-booking-again><span class="btn__label">Новая заявка</span></button>
            </div>
          </div>
        </div>

        <aside class="booking__aside">
          <div class="booking-next">
            <h2 class="booking-next__title">Что будет дальше</h2>
            <ol class="booking-next__list">
              <li><span>01</span><p>Менеджер свяжется с вами, уточнит задачу и назовёт цену.</p></li>
              <li><span>02</span><p>Покажем аппарат в работе — в демо-зале в Пружанах или онлайн, на ваших материалах.</p></li>
              <li><span>03</span><p>Бесплатно доставим по Беларуси, запустим и обучим персонал.</p></li>
            </ol>
          </div>
          <div class="booking-contacts">
            <a class="phone-link phone-link--lg" href="tel:${esc(ctx.contact.tel)}"><small>Или позвоните</small><span>${esc(ctx.contact.phone)}</span></a>
            ${messengerLinks(ctx.contact, { variant: 'icon' })}
            <p class="booking-contacts__line">${icon('pin')}${esc(site.address.full)}</p>
            <p class="booking-contacts__line">${icon('clock')}${esc(site.hours.text)}</p>
          </div>
        </aside>
      </div>
    </section>`,
  };
}
