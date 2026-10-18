import { esc, t, rich, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { button, eyebrow, sectionHead, counters, features, reviewCard, section, marquee, productCard, equipmentNote } from '../components.js';

export function home(ctx) {
  const { c } = ctx;
  const p = c.pages.home;
  const e = c.equipment;

  // Диапазоны прогресса скролла, на которых видны подписи 3D-сцены:
  // 01 — грузовик в профиль и обход, 02 — дверцы открываются, 03 — камера внутри кузова с логотипом
  const captions = [
    { from: 0.14, to: 0.46 },
    { from: 0.56, to: 0.8 },
  ];
  const final = { from: 0.9, to: 1.1 }; // финальный блок не гаснет в конце сцены: остаётся виден и кликабелен всю «выдержку»
  const bars = [
    [0.06, 0.52],
    [0.52, 0.86],
    [0.86, 0.96],
  ];
  const steps = p.scene;
  const total = `0${steps.length}`;
  const primary = button({ label: 'Запросить цену', href: '/zapros/' });
  const catalog = button({ label: 'Каталог оборудования', href: '/oborudovanie/', variant: 'ghost', iconName: 'arrow-right' });
  const inStock = e.products.filter((x) => x.stock === 'в наличии');

  const body = `
  <section class="scene scene--home" data-scene-root="home" aria-label="Грузовик manlaser: доставка лазерного оборудования по Беларуси">
    <div class="scene__stage" aria-hidden="true">
      <div class="scene__poster">
        <!-- постер для телефонов и слабых устройств: знак на фирменном свечении (или кадр сцены, если он задан в media.json) -->
        ${c.media['home.hero-fallback']?.src
          ? ctx.media('home.hero-fallback', { cls: 'scene__poster-media', eager: true })
          : `<div class="scene__poster-mark"><i></i>${ctx.logoMark}</div>`}
      </div>
      <canvas class="scene__canvas" data-scene-canvas></canvas>
    </div>

    <div class="scene__ui">
      <div class="scene__step scene__step--intro" data-scene-step data-from="-1" data-to="0.1">
        <div class="container intro">
          <h1 class="sr-only">${t(p.hero.title)}</h1>
          <div class="intro__bottom" data-reveal>
            ${eyebrow(p.hero.eyebrow)}
            <p class="lead intro__lead">${t(p.hero.lead)}</p>
            <div class="actions">${catalog}${primary}</div>
          </div>
        </div>
      </div>

      ${each(captions, (r, i) => `<div class="scene__step scene__step--caption" data-scene-step data-from="${r.from}" data-to="${r.to}">
        <span class="caption__ghost" aria-hidden="true">${pad2(i + 1)}</span>
        <div class="container caption">
          <div class="caption__title">
            <span class="scene__num">${pad2(i + 1)} / ${total}<i></i>${esc(steps[i].label)}</span>
            <h2 class="h2">${t(steps[i].title)}</h2>
          </div>
          <div class="caption__text">
            <p class="lead">${t(steps[i].text)}</p>
            <a class="link-arrow" href="${esc(steps[i].link.url)}">${esc(steps[i].link.label)} ${icon('arrow-right')}</a>
          </div>
        </div>
      </div>`)}

      <div class="scene__step scene__step--final" data-scene-step data-from="${final.from}" data-to="${final.to}">
        <div class="container final">
          <span class="scene__num">03 / ${total}<i></i>${esc(steps[2].label)}</span>
          <h2 class="h2 final__title">${t(steps[2].title)}</h2>
          <p class="lead final__text">${t(steps[2].text)}</p>
          <div class="actions">${catalog}${primary}</div>
        </div>
      </div>

      <ol class="scene__progress" aria-hidden="true">
        ${each(steps, (st, i) => `<li data-scene-bar data-from="${bars[i][0]}" data-to="${bars[i][1]}"><span>${esc(st.label)}</span><i><b></b></i></li>`)}
      </ol>
      <div class="hero__scroll scene__hint" aria-hidden="true"><span>Листайте</span><i></i></div>
    </div>
  </section>

  ${marquee(p.marquee)}

  ${section(
    `${sectionHead({ align: 'center', eyebrow: 'Каталог', title: 'Что *мы продаём*' })}
    <div class="cat-grid" data-stagger>${each(
      e.categories,
      (cat, i) => `<a class="card card--cat" href="${esc(cat.url)}" data-tilt="soft" data-cursor="Смотреть">
        <div class="card__media">${ctx.media(cat.media, { ratio: '16/10' })}</div>
        <div class="card__body">
          <div class="card__top"><span class="card__index">${pad2(i + 1)}</span><span class="tag">${t(cat.priceFrom)}</span></div>
          <h3 class="card__title">${t(cat.title)}</h3>
          <p class="card__text">${t(cat.short)}</p>
          <span class="card__arrow">${icon('arrow-up-right')}</span>
        </div>
        <span class="card__glow" aria-hidden="true"></span>
      </a>`,
    )}</div>`,
    { extra: 'section--services' },
  )}

  ${inStock.length
    ? section(
        `${sectionHead({ align: 'center', eyebrow: 'Склад', title: 'В наличии *сейчас*', action: button({ label: 'Весь каталог', href: '/oborudovanie/', variant: 'ghost', size: 'sm' }) })}
    <div class="product-grid product-grid--3" data-stagger>${each(inStock, (pr) => productCard(ctx, pr))}</div>`,
      )
    : ''}

  ${section(
    `<div class="facts-band">
      <div class="facts-band__head">
        <h2 class="h2" data-split>${rich('Технологии, которым *можно доверять*')}</h2>
      </div>
      ${counters(e.counters)}
    </div>`,
  )}

  ${section(`${sectionHead({ align: 'center', eyebrow: 'Условия', title: 'Почему *manlaser*' })}${features(e.advantages)}`)}

  ${section(`<div class="bridge">
    <div class="bridge__text">${eyebrow('Работаем тем, что продаём')}<p class="bridge__quote display-2" data-split>${esc(c.site.bridge)}</p><p class="lead">${t(e.intro.bridge)}</p>
      ${equipmentNote(ctx, 'bridge__note')}</div>
    <div class="bridge__media">${ctx.media('home.bridge')}</div>
  </div>`)}

  ${section(
    `${sectionHead({ align: 'center', eyebrow: 'Отзывы', title: 'Покупатели об *оборудовании*' })}
    <div class="reviews-grid" data-stagger>${each(c.reviews.equipment.slice(0, 6), reviewCard)}</div>`,
  )}`;

  return { body };
}
