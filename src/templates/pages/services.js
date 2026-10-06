import { esc, t, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { button, sectionHead, serviceFeature, features, steps, faq, counters, reviewCard, ctaBand, pageHero, section, messengerLinks } from '../components.js';
import { service, faqPage } from '../schema.js';
import { carMap, carIcon } from '../partials/car-map.js';

const faqGroup = (c, id) => c.faq.groups.find((g) => g.id === id)?.items || [];

function priceBlock(s) {
  return `<div class="price-block" data-reveal>
    <div><span class="price-block__label">Стоимость</span><span class="price-block__value">${t(s.price)}</span></div>
    <p class="price-block__note">${t(s.priceNote)}</p>
    <div class="actions">
      ${button({ label: 'Рассчитать стоимость', href: '/uslugi/kalkulyator/', variant: 'ghost', size: 'sm', iconName: 'arrow-right' })}
    </div>
  </div>`;
}

export function servicesHub(ctx) {
  const { c } = ctx;
  const p = c.pages.services;
  const s = c.services;
  return {
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, actions: button({ label: 'Калькулятор стоимости', href: '/uslugi/kalkulyator/', variant: 'ghost', iconName: 'arrow-right' }) })}
    ${section(`<div class="svc-grid">
      ${serviceFeature(ctx, { title: s.cleaning.title, text: s.cleaning.short, url: s.cleaning.url, mediaKey: s.cleaning.media, index: 1, tag: 'Без абразива и химии', list: s.cleaning.removes.slice(0, 4) })}
      ${serviceFeature(ctx, { title: 'Антикоррозийная обработка', text: s.anticor.short, url: s.anticor.url, mediaKey: s.anticor.media, index: 2, tag: 'Dinitrol · Mercasol', list: s.anticor.zones.map((z) => z.title) })}
    </div>`)}
    ${section(`<a class="calc-banner" href="/uslugi/kalkulyator/" data-cursor="Посчитать">
      <span class="calc-banner__icon">${icon('calc')}</span>
      <span class="calc-banner__text"><strong>Калькулятор стоимости</strong><small>Выберите тип авто и зоны обработки прямо на силуэте — получите предварительную цену.</small></span>
      <span class="calc-banner__arrow">${icon('arrow-up-right')}</span>
    </a>`, { extra: 'section--tight' })}
    ${ctaBand(ctx)}`,
    schema: [service(ctx, s.cleaning), service(ctx, { ...s.anticor, title: 'Антикоррозийная обработка автомобиля' })],
  };
}

export function serviceCleaning(ctx) {
  const { c } = ctx;
  const s = c.services.cleaning;
  const items = faqGroup(c, 'cleaning');
  return {
    body: `
    ${pageHero(ctx, {
      eyebrow: 'Услуга №1 · Пружаны',
      title: s.title,
      lead: s.lead,
      actions: button({ label: 'Рассчитать стоимость', href: '/uslugi/kalkulyator/?service=cleaning', variant: 'ghost', iconName: 'arrow-right' }),
      mediaKey: s.media,
    })}

    <section class="scene-section" data-scene="cleaning" aria-label="Лазерная очистка: до и после">
      <div class="scene-stub container"><p class="eyebrow"><i></i>Здесь будет scroll-сцена «до → после» (этап 4)</p></div>
    </section>

    ${section(`${sectionHead({ eyebrow: 'Что удаляем', title: 'Лазер снимает всё лишнее', lead: s.short })}
      <ul class="chips" data-stagger>${each(s.removes, (r) => `<li class="chip">${icon('spark')}${t(r)}</li>`)}</ul>`)}

    ${section(`${sectionHead({ eyebrow: 'Почему лазер', title: 'Преимущества метода' })}${features(s.benefits)}`)}

    ${section(`${sectionHead({ eyebrow: 'Что чистим', title: 'Для авто и производства' })}
      <div class="objects-grid" data-stagger>${each(
        s.objects,
        (o) => `<article class="object">${ctx.media(o.media)}<h3 class="object__title">${t(o.title)}</h3><p class="object__text">${t(o.text)}</p></article>`,
      )}</div>`)}

    ${section(`<div class="split">
      <div>${sectionHead({ eyebrow: 'Как работаем', title: 'Этапы' })}${priceBlock(s)}</div>
      <div>${steps(s.steps)}</div>
    </div>`)}

    ${section(`${sectionHead({ eyebrow: 'FAQ', title: 'Частые вопросы', id: 'faq' })}${faq(items, { id: 'faq-cleaning' })}`)}
    ${ctaBand(ctx, { title: 'Привезите деталь — покажем результат' })}`,
    schema: [service(ctx, s, { serviceType: 'Лазерная очистка металла' }), faqPage(items)],
  };
}

export function serviceAnticor(ctx) {
  const { c } = ctx;
  const s = c.services.anticor;
  const items = faqGroup(c, 'anticor');
  return {
    body: `
    ${pageHero(ctx, {
      eyebrow: 'Dinitrol · Mercasol · Пружаны',
      title: s.title,
      lead: s.lead,
      actions: button({ label: 'Рассчитать стоимость', href: '/uslugi/kalkulyator/?service=anticor', variant: 'ghost', iconName: 'arrow-right' }),
      mediaKey: s.media,
    })}

    ${section(counters(s.facts), { extra: 'section--tight' })}

    <section class="scene-section" data-scene="anticor" aria-label="Слои антикоррозийной защиты">
      <div class="scene-stub container"><p class="eyebrow"><i></i>Здесь будет «разрез» слоёв покрытия по скроллу (этап 5)</p></div>
    </section>

    ${section(`${sectionHead({ eyebrow: 'Зоны обработки', title: 'Днище, арки, пороги, полости', lead: 'Наведите на зону на схеме — подсветим и расскажем, как обрабатываем (интерактивная схема — этап 5).' })}
      <div class="zones" data-zones>${each(
        s.zones,
        (z, i) => `<article class="zone" data-zone="${esc(z.id)}"><span class="zone__num">${pad2(i + 1)}</span><h3 class="zone__title">${t(z.title)}</h3><p class="zone__text">${t(z.text)}</p></article>`,
      )}</div>`)}

    ${section(`<ul class="highlights" data-stagger>${each(s.highlights, (h) => `<li>${icon('check')}<span>${t(h)}</span></li>`)}</ul>`, { extra: 'section--tight' })}

    ${section(`<div class="split">
      <div>${sectionHead({ eyebrow: 'Технология', title: 'Как мы обрабатываем авто' })}${priceBlock(s)}</div>
      <div>${steps(s.steps)}</div>
    </div>`)}

    ${section(`${sectionHead({ eyebrow: 'Материалы', title: 'Dinitrol и Mercasol' })}
      <div class="materials" data-stagger>${each(s.materials, (m) => `<article class="material"><h3 class="material__name">${esc(m.name)}</h3><p>${t(m.text)}</p></article>`)}</div>`)}

    ${section(`${sectionHead({ eyebrow: 'Наши работы', title: 'Фото из бокса', action: button({ label: 'Все работы', href: '/raboty/', variant: 'ghost', size: 'sm' }) })}
      <div class="works-teaser" data-stagger>
        ${ctx.media('anticor.prep', { cls: 'works-teaser__item' })}
        ${ctx.media('anticor.underbody', { cls: 'works-teaser__item works-teaser__item--tall', ratio: '4/5' })}
        ${ctx.media('anticor.arches', { cls: 'works-teaser__item' })}
        ${ctx.media('anticor.materials', { cls: 'works-teaser__item' })}
      </div>`)}

    ${section(`${sectionHead({ eyebrow: 'Отзывы', title: 'Отзывы об антикоре' })}<div class="reviews-grid" data-stagger>${each(c.reviews.services.filter((r) => r.service === 'anticor').slice(0, 3), reviewCard)}</div>`)}
    ${section(`${sectionHead({ eyebrow: 'FAQ', title: 'Частые вопросы', id: 'faq' })}${faq(items, { id: 'faq-anticor' })}`)}
    ${ctaBand(ctx, { title: 'Узнайте стоимость за 10 минут', text: 'Бесплатная оценка без разбора пластиковых элементов. Мастер перезвонит и проконсультирует.' })}`,
    schema: [service(ctx, s, { serviceType: 'Антикоррозийная обработка автомобиля' }), faqPage(items)],
  };
}

export function calculator(ctx) {
  const { c } = ctx;
  const p = c.pages.calculator;
  const pr = c.prices;
  const a = pr.anticor;
  const cl = pr.cleaning;
  const materialText = (id) => c.services.anticor.materials.find((m) => m.name.toLowerCase() === id)?.text || '';
  const step = (n, title, inner, extra = '') =>
    `<fieldset class="calc-step ${extra}"><legend class="calc-step__title"><span class="calc-step__num">${pad2(n)}</span>${esc(title)}</legend>${inner}</fieldset>`;
  const radio = (name, value, checked, body, cls = '') =>
    `<label class="choice ${cls}"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}><span class="choice__body">${body}</span></label>`;

  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, variant: 'compact' })}
    <section class="section calc" data-calc>
      <div class="container calc__grid">
        <form class="calc__form" data-calc-form novalidate>
          ${step(
            1,
            'Услуга',
            `<div class="choice-grid choice-grid--2">
              ${radio('service', 'anticor', true, `${icon('shield')}<strong>Антикоррозийная обработка</strong><small>Днище, арки, пороги, полости</small>`, 'choice--big')}
              ${radio('service', 'cleaning', false, `${icon('spark')}<strong>Лазерная очистка металла</strong><small>Детали, диски, рамы, днище</small>`, 'choice--big')}
            </div>`,
          )}

          <div class="calc-branch" data-branch="anticor">
            ${step(
              2,
              'Тип автомобиля',
              `<div class="choice-grid choice-grid--4">
                ${each(a.cars, (car, i) => radio('car', car.id, i === 0, `${carIcon(car.id)}<strong>${esc(car.label)}</strong><small>${esc(car.hint)}</small>`, 'choice--car'))}
              </div>`,
            )}
            ${step(
              3,
              'Зоны обработки',
              `<p class="calc-step__hint">Нажмите на зону прямо на схеме или выберите из списка.</p>
              <div class="car-map">${carMap(a.cars[0].id)}</div>
              <div class="chip-select">
                ${each(a.zones, (z) => `<label class="chip-check"><input type="checkbox" name="zone" value="${esc(z.id)}"${a.defaultZones.includes(z.id) ? ' checked' : ''}><span>${icon('check')}${esc(z.label)}</span></label>`)}
              </div>`,
            )}
            ${step(
              4,
              'Материал',
              `<div class="choice-grid choice-grid--2">
                ${each(a.materials, (m, i) => radio('material', m.id, i === 0, `<strong class="choice__brand">${esc(m.label)}</strong><small>${t(materialText(m.id))}</small>`, 'choice--material'))}
              </div>`,
            )}
            ${step(
              5,
              'Дополнительно',
              each(
                a.extras,
                (x) => `<label class="switch"><input type="checkbox" name="extra" value="${esc(x.id)}"><span class="switch__track"><span class="switch__thumb"></span></span><span class="switch__label">${esc(x.label)}</span></label>`,
              ),
            )}
          </div>

          <div class="calc-branch" data-branch="cleaning" hidden>
            ${step(
              2,
              'Как считаем',
              `<div class="seg" role="radiogroup">
                ${radio('mode', 'parts', true, 'По деталям', 'seg__item')}
                ${radio('mode', 'area', false, 'По площади', 'seg__item')}
              </div>
              <div class="calc-mode" data-mode="parts">
                <ul class="parts">${each(
                  cl.parts,
                  (pt) => `<li class="part">
                    <span class="part__label">${esc(pt.label)}</span>
                    <span class="stepper" data-stepper>
                      <button type="button" class="stepper__btn" data-step="-1" aria-label="Меньше">−</button>
                      <input class="stepper__input" type="number" name="part:${esc(pt.id)}" value="0" min="0" max="99" inputmode="numeric" aria-label="${esc(pt.label)}, количество">
                      <button type="button" class="stepper__btn" data-step="1" aria-label="Больше">+</button>
                    </span>
                  </li>`,
                )}</ul>
              </div>
              <div class="calc-mode" data-mode="area" hidden>
                <div class="area">
                  <output class="area__value" data-area-out>${String(cl.area.default).replace('.', ',')} <small>м²</small></output>
                  <input class="range" type="range" name="area" min="${cl.area.min}" max="${cl.area.max}" step="${cl.area.step}" value="${cl.area.default}" aria-label="Площадь очистки, м²">
                  <div class="area__scale"><span>${String(cl.area.min).replace('.', ',')} м²</span><span>${cl.area.max} м²</span></div>
                </div>
              </div>`,
            )}
            ${step(
              3,
              'Что удаляем',
              `<div class="choice-grid choice-grid--3">${each(cl.dirt, (d, i) => radio('dirt', d.id, i === 0, `<strong>${esc(d.label)}</strong>`, 'choice--small'))}</div>`,
            )}
          </div>
        </form>

        <aside class="calc__summary">
          <div class="summary" data-calc-summary>
            ${pr.demo ? '<span class="summary__demo">Демо-цены · заменить в content/prices.json</span>' : ''}
            <span class="summary__label">Предварительно</span>
            <div class="summary__total"><span data-calc-total>0</span><small>${esc(pr.currency)}</small></div>
            <p class="summary__range" data-calc-range></p>
            <ul class="summary__lines" data-calc-lines></ul>
            <p class="summary__note">${icon('info')}${esc(pr.note)}</p>
            <a class="btn btn--primary summary__cta" href="/zapis/?from=calc" data-calc-submit data-magnetic><span class="btn__label">Записаться с этим расчётом</span><span class="btn__icon">${icon('arrow-up-right')}</span></a>
            <a class="summary__phone" href="tel:${esc(ctx.contact.tel)}">${icon('phone')}${esc(ctx.contact.phone)}</a>
          </div>
        </aside>
      </div>
    </section>`;
}

export function booking(ctx) {
  const { c, site } = ctx;
  const p = c.pages.booking;
  const a = c.services.anticor;
  const step = (n, title, inner) =>
    `<fieldset class="calc-step"><legend class="calc-step__title"><span class="calc-step__num">${pad2(n)}</span>${esc(title)}</legend>${inner}</fieldset>`;
  const chip = (name, value, label, checked = false) =>
    `<label class="chip-check chip-check--radio"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}><span>${icon('check')}${esc(label)}</span></label>`;
  const field = (id, label, input, hint = '') =>
    `<div class="field" data-field="${id}"><label class="field__label" for="bk-${id}">${label}</label>${input}<p class="field__error" id="bk-${id}-error" aria-live="polite"></p>${hint ? `<p class="field__hint">${hint}</p>` : ''}</div>`;

  return {
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, variant: 'compact' })}
    <section class="section booking" data-booking>
      <div class="container booking__grid">
        <div class="booking__main">
          <form class="booking-form" data-booking-form novalidate>
            ${step(
              1,
              'Услуга',
              `<div class="choice-grid choice-grid--3" data-field="service">
                <label class="choice choice--small"><input type="radio" name="service" value="anticor" checked><span class="choice__body">${icon('shield')}<strong>Антикоррозийная обработка</strong></span></label>
                <label class="choice choice--small"><input type="radio" name="service" value="cleaning"><span class="choice__body">${icon('spark')}<strong>Лазерная очистка металла</strong></span></label>
                <label class="choice choice--small"><input type="radio" name="service" value="consult"><span class="choice__body">${icon('chat')}<strong>Нужна консультация</strong></span></label>
              </div>`,
            )}
            ${step(
              2,
              'Контакты',
              `<div class="field-row">
                ${field('name', 'Как к вам обращаться', `<input class="input" id="bk-name" name="name" type="text" autocomplete="name" maxlength="60" placeholder="Имя" aria-describedby="bk-name-error">`)}
                ${field('phone', 'Телефон <span class="field__req">*</span>', `<input class="input" id="bk-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+375 (__) ___-__-__" required aria-required="true" aria-describedby="bk-phone-error">`)}
              </div>
              <p class="field__label">Как удобнее связаться</p>
              <div class="chip-select">
                ${chip('contact', 'call', 'Позвонить', true)}${chip('contact', 'telegram', 'Telegram')}${chip('contact', 'viber', 'Viber')}${chip('contact', 'whatsapp', 'WhatsApp')}
              </div>`,
            )}
            ${step(
              3,
              'Автомобиль или деталь',
              `${field('object', '<span data-object-label>Марка, модель и год автомобиля</span>', `<input class="input" id="bk-object" name="object" type="text" maxlength="120" placeholder="Например, Volkswagen Passat B6, 2008" data-object-input>`)}
              ${field('comment', 'Комментарий', `<textarea class="input input--area" id="bk-comment" name="comment" rows="3" maxlength="800" placeholder="Что беспокоит, какие зоны интересуют, есть ли очаги ржавчины"></textarea>`)}`,
            )}
            ${step(
              4,
              'Когда удобно приехать',
              `<div class="field-row">
                ${field('date', 'Дата', `<input class="input" id="bk-date" name="date" type="date" data-date-input>`, 'Можно не указывать — мастер предложит время')}
                <div class="field">
                  <p class="field__label">Время</p>
                  <div class="chip-select">${chip('time', 'morning', '9:00–12:00')}${chip('time', 'day', '12:00–16:00')}${chip('time', 'evening', '16:00–19:00')}</div>
                </div>
              </div>`,
            )}
            <div class="booking-form__footer">
              <label class="consent" data-field="consent">
                <input type="checkbox" name="consent" required aria-describedby="bk-consent-error">
                <span class="consent__box">${icon('check')}</span>
                <span class="consent__text">Согласен на обработку персональных данных для связи по заявке. ${t('[ССЫЛКА НА ПОЛИТИКУ КОНФИДЕНЦИАЛЬНОСТИ]')}</span>
              </label>
              <p class="field__error" id="bk-consent-error" aria-live="polite"></p>
              <button class="btn btn--primary booking-form__submit" type="submit" data-magnetic>
                <span class="btn__label">Отправить заявку</span><span class="btn__icon">${icon('arrow-up-right')}</span>
              </button>
              <p class="booking-form__note">${icon('clock')}Перезвоним в рабочее время: ${esc(site.hours.short)}</p>
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
          <div data-calc-slot></div>
          <div class="booking-next">
            <h2 class="booking-next__title">Что будет дальше</h2>
            <ol class="booking-next__list">
              <li><span>01</span><p>Мастер перезвонит, уточнит детали и проконсультирует.</p></li>
              <li><span>02</span><p>${t(a.highlights[0])}.</p></li>
              <li><span>03</span><p>Согласуем удобное время. Антикоррозийная обработка занимает от 2 дней.</p></li>
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
