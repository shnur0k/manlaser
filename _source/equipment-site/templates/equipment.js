import { esc, t, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { button, eyebrow, sectionHead, features, faq, counters, specTable, productCard, reviewCard, pageHero, section, messengerLinks, phoneLink, crumbs } from '../components.js';
import { product as productSchema, faqPage } from '../schema.js';

/** Блок «Запросить цену / демонстрацию». Сама форма подключается на этапе 6. */
export function requestBlock(ctx, { subject = '' } = {}) {
  return `<section class="section request" id="zapros">
    <div class="container">
      <div class="request__inner">
        <div class="request__text">
          ${eyebrow('Заявка')}
          <h2 class="h2" data-split>Запросить цену или демонстрацию</h2>
          <p class="lead">Покажем аппарат в работе — в демо-зале в Пружанах или онлайн, на ваших материалах.${subject ? ` <strong>${esc(subject)}</strong>` : ''}</p>
        </div>
        <div class="request__form" data-request-form data-subject="${esc(subject)}">
          ${phoneLink(ctx.site.contacts.equipment, { extra: 'phone-link--lg' })}
          ${messengerLinks(ctx.site.contacts.equipment, { variant: 'pill', text: subject ? `Здравствуйте! Интересует ${subject}.` : '' })}
          <p class="muted small">Форма заявки — этап 6.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function compareTable(products, cat) {
  return `<div class="table-wrap" data-reveal><table class="compare-table">
    <thead><tr><th scope="col">Модель</th><th scope="col">Мощность</th><th scope="col">Цена</th><th scope="col">Наличие</th><th scope="col">Гарантия</th><th scope="col"><span class="sr-only">Ссылка</span></th></tr></thead>
    <tbody>${each(
      products,
      (p) => `<tr>
        <th scope="row"><a href="${esc(cat.url + p.slug)}/">${t(p.name)}</a></th>
        <td>${t(p.power)}</td><td class="nowrap">${t(p.price)}</td>
        <td><span class="stock stock--${p.stock === 'в наличии' ? 'in' : 'order'}">${t(p.stock)}</span></td>
        <td>${t(p.warranty)}</td>
        <td><a class="table-link" href="${esc(cat.url + p.slug)}/" aria-label="${esc(p.name)}">${icon('arrow-right')}</a></td>
      </tr>`,
    )}</tbody>
  </table></div>`;
}

export function equipmentHub(ctx) {
  const { c } = ctx;
  const e = c.equipment;
  const p = c.pages.equipment;
  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, actions: button({ label: 'Запросить цену', href: '#zapros' }) + button({ label: 'Доставка и оплата', href: '/oborudovanie/dostavka-i-oplata/', variant: 'ghost', iconName: 'arrow-right' }), mediaKey: 'eq.showroom', variant: 'calm' })}

    ${section(`<div class="bridge bridge--calm">
      <div class="bridge__text">${eyebrow('Работаем тем, что продаём')}<p class="bridge__quote display-2" data-split>${esc(c.site.bridge)}</p><p class="lead">${t(e.intro.bridge)}</p></div>
      <div class="bridge__media">${ctx.media('home.bridge')}</div>
    </div>`)}

    ${section(`${sectionHead({ eyebrow: 'Каталог', title: 'Категории оборудования' })}
      <div class="cat-grid" data-stagger>${each(
        e.categories,
        (cat, i) => `<a class="card card--cat" href="${esc(cat.url)}" data-tilt="soft">
          <div class="card__media">${ctx.media(cat.media, { ratio: '16/10' })}</div>
          <div class="card__body">
            <div class="card__top"><span class="card__index">${pad2(i + 1)}</span><span class="tag">${t(cat.priceFrom)}</span></div>
            <h3 class="card__title">${t(cat.title)}</h3>
            <p class="card__text">${t(cat.short)}</p>
            <span class="card__arrow">${icon('arrow-up-right')}</span>
          </div>
        </a>`,
      )}</div>`)}

    ${section(counters(e.counters), { extra: 'section--tight' })}
    ${section(`${sectionHead({ eyebrow: 'Почему manlaser', title: 'Условия покупки' })}${features(e.advantages)}`)}

    ${section(`<div class="link-cards" data-stagger>
      <a class="link-card" href="/oborudovanie/remont/">${icon('wrench')}<span><strong>Ремонт и обслуживание</strong><small>Диагностика 1–2 рабочих дня, гарантия на работы 6 месяцев</small></span>${icon('arrow-up-right')}</a>
      <a class="link-card" href="/oborudovanie/dostavka-i-oplata/">${icon('truck')}<span><strong>Доставка и оплата</strong><small>Бесплатно по Беларуси, рассрочка, лизинг, кредит</small></span>${icon('arrow-up-right')}</a>
    </div>`, { extra: 'section--tight' })}

    ${section(`${sectionHead({ eyebrow: 'Для кого', title: 'Подходит для разных сфер' })}<ul class="chips">${each(e.industries, (i) => `<li class="chip">${t(i)}</li>`)}</ul>`)}

    ${section(`${sectionHead({ eyebrow: 'Отзывы', title: 'Покупатели об оборудовании' })}<div class="reviews-grid" data-stagger>${each(c.reviews.equipment.slice(0, 6), reviewCard)}</div>`)}
    ${requestBlock(ctx)}`;
}

export function equipmentCategory(ctx) {
  const { c, route } = ctx;
  const cat = route.data.category;
  const products = c.equipment.products.filter((p) => p.category === cat.id);
  return {
    body: `
    ${pageHero(ctx, { eyebrow: 'Оборудование', title: cat.title, lead: `${cat.short} ${cat.lead}`, actions: button({ label: 'Запросить цену', href: '#zapros' }), mediaKey: cat.media, variant: 'calm' })}
    ${section(`${sectionHead({ eyebrow: 'Сравнение', title: 'Модели и цены' })}${compareTable(products, cat)}
      ${cat.notes?.length ? `<ul class="notes">${each(cat.notes, (n) => `<li>${t(n)}</li>`)}</ul>` : ''}`)}
    ${section(`<div class="product-grid" data-stagger>${each(products, (p) => productCard(ctx, p, cat))}</div>`)}
    ${requestBlock(ctx, { subject: cat.title })}`,
    schema: products.map((p) => productSchema(ctx, p, `${cat.url}${p.slug}/`)),
  };
}

export function product(ctx) {
  const { c, route } = ctx;
  const { product: p, category: cat } = route.data;
  const related = c.equipment.products.filter((x) => x.category === cat.id && x.slug !== p.slug).slice(0, 3);
  return {
    body: `
    <section class="page-hero page-hero--product">
      <div class="container">
        ${crumbs(route)}
        <div class="product">
          <div class="product__media" data-reveal="scale">${ctx.media(p.media, { ratio: '1/1', eager: true })}</div>
          <div class="product__info">
            ${eyebrow(p.type)}
            <h1 class="h1">${t(p.name)}</h1>
            <div class="product__meta"><span class="tag">${t(p.power)}</span><span class="stock stock--${p.stock === 'в наличии' ? 'in' : 'order'}">${t(p.stock)}</span><span class="tag">Гарантия: ${t(p.warranty)}</span></div>
            <p class="product__price">${t(p.price)}</p>
            <div class="actions">${button({ label: 'Запросить цену / демо', href: '#zapros' })}${button({ label: 'Доставка и оплата', href: '/oborudovanie/dostavka-i-oplata/', variant: 'ghost', iconName: 'arrow-right' })}</div>
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
    ${section(`${sectionHead({ eyebrow: 'Характеристики', title: `Технические данные ${p.name}` })}${specTable(p.specs)}`)}
    ${related.length ? section(`${sectionHead({ eyebrow: cat.title, title: 'Другие модели' })}<div class="product-grid" data-stagger>${each(related, (r) => productCard(ctx, r, cat))}</div>`) : ''}
    ${requestBlock(ctx, { subject: `${p.type} ${p.name}` })}`,
    schema: [productSchema(ctx, p, route.url)],
  };
}

export function repair(ctx) {
  const { c } = ctx;
  const r = c.repair;
  const items = c.faq.groups.find((g) => g.id === 'repair')?.items || [];
  return {
    body: `
    ${pageHero(ctx, { eyebrow: 'Сервис', title: r.title, lead: r.lead, actions: button({ label: 'Оставить заявку', href: '#zapros' }), mediaKey: 'eq.repair', variant: 'calm' })}
    ${section(`<ul class="facts-inline">
      <li><span>Диагностика</span><strong>${t(r.diagnostics)}</strong></li>
      <li><span>Гарантия</span><strong>${t(r.warranty)}</strong></li>
      <li><span>Стоимость</span><strong>${t(r.price)}</strong></li>
    </ul><p class="muted">Ремонтируем: ${t(r.brands)}.</p>`, { extra: 'section--tight' })}
    ${section(`${sectionHead({ eyebrow: 'Услуги', title: 'Что ремонтируем' })}
      <div class="repair-list" data-stagger>${each(
        r.services,
        (s, i) => `<article class="repair-item">
          <span class="repair-item__num">${pad2(i + 1)}</span>
          <div><h3 class="repair-item__title">${t(s.title)}</h3><p>${t(s.text)}</p>
          ${s.includes ? `<ul class="ticks">${each(s.includes, (x) => `<li>${icon('check')}${t(x)}</li>`)}</ul>` : ''}
          ${s.note ? `<p class="muted small">${t(s.note)}</p>` : ''}</div>
        </article>`,
      )}</div>`)}
    ${section(`${sectionHead({ eyebrow: 'Преимущества', title: 'Почему нам доверяют ремонт' })}${features(r.advantages)}`)}
    ${section(`${sectionHead({ eyebrow: 'FAQ', title: 'Вопросы о ремонте', id: 'faq' })}${faq(items, { id: 'faq-repair' })}`)}
    ${requestBlock(ctx, { subject: 'ремонт оборудования' })}`,
    schema: [faqPage(items)],
  };
}

export function delivery(ctx) {
  const d = ctx.c.delivery;
  const block = (b, id, iconName) =>
    section(`${sectionHead({ eyebrow: '', title: b.title, id })}${features(b.items.map((x) => ({ ...x, icon: iconName })), { numbered: false, cols: b.items.length > 3 ? 4 : 3 })}`);
  return `
    ${pageHero(ctx, { eyebrow: 'Оборудование', title: d.title, lead: d.lead, actions: `<a class="pill-link" href="#usloviya">Доставка</a><a class="pill-link" href="#puskonaladka">Пусконаладка и гарантия</a><a class="pill-link" href="#oplata">Оплата</a>`, variant: 'calm' })}
    ${block(d.delivery, 'usloviya', 'truck')}
    ${block(d.launch, 'puskonaladka', 'wrench')}
    ${block(d.payment, 'oplata', 'card')}
    ${section(`<div class="note-card">${icon('shield')}<div><h3>${t(d.beforeBuy.title)}</h3><p>${t(d.beforeBuy.text)}</p></div></div>`, { extra: 'section--tight' })}
    ${requestBlock(ctx)}`;
}
