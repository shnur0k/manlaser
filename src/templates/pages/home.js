import { esc, t, rich, each, pad2 } from '../lib.js';
import { icon } from '../icons.js';
import { button, eyebrow, sectionHead, serviceFeature, counters, reviewCard, ctaBand, section, marquee } from '../components.js';
import { service } from '../schema.js';

export function home(ctx) {
  const { c } = ctx;
  const p = c.pages.home;
  const s = c.services;

  // Диапазоны прогресса скролла, на которых видна каждая подпись 3D-сцены
  const ranges = [
    [0.07, 0.36],
    [0.46, 0.74],
    [0.86, 1.01],
  ];
  const secondary = button({ label: 'Рассчитать стоимость', href: '/uslugi/kalkulyator/', variant: 'ghost', iconName: 'arrow-right' });
  const works = button({ label: 'Наши работы', href: '/raboty/', variant: 'ghost', iconName: 'arrow-right' });

  const body = `
  <section class="scene scene--home" data-scene-root="home" aria-label="Лазерная очистка и антикор: от ржавчины до защиты">
    <div class="scene__stage" aria-hidden="true">
      <div class="scene__poster">
        <div class="hero__beam"></div>
        <div class="hero__glow"></div>
        ${c.media['home.hero-fallback']?.src ? ctx.media('home.hero-fallback', { cls: 'scene__poster-media', eager: true }) : ''}
      </div>
      <canvas class="scene__canvas" data-scene-canvas></canvas>
      <div class="scene__vignette"></div>
    </div>

    <!-- «видоискатель лазера»: уголки рамки, адрес и счётчик сканирования -->
    <div class="scene__hud" aria-hidden="true">
      <span class="hud-corner hud-corner--tl"></span><span class="hud-corner hud-corner--tr"></span>
      <span class="hud-corner hud-corner--bl"></span><span class="hud-corner hud-corner--br"></span>
      <span class="hud-meta hud-meta--left"><i></i>${esc(c.site.address.city)} · ${esc(c.site.address.street)}</span>
      <span class="hud-meta hud-meta--right">Скан <b data-scene-readout>000</b>%</span>
      <span class="hud-cross"></span>
    </div>

    <div class="scene__ui">
      <div class="scene__step scene__step--intro" data-scene-step data-from="-1" data-to="0.06">
        <div class="container intro">
          <h1 class="intro__title display">
            <span class="intro__line intro__line--a" data-split="chars">${t(p.hero.titleTop)}</span>
            <span class="intro__line intro__line--b" data-split="chars">${t(p.hero.titleBottom)}</span>
          </h1>
          <div class="intro__bottom" data-reveal>
            ${eyebrow(p.hero.eyebrow)}
            <p class="lead intro__lead">${t(p.hero.lead)}</p>
            <div class="actions">${secondary}${works}</div>
          </div>
        </div>
      </div>

      ${each(p.scene.slice(0, 2), (st, i) => `<div class="scene__step scene__step--caption" data-scene-step data-from="${ranges[i][0]}" data-to="${ranges[i][1]}">
          <span class="caption__ghost" aria-hidden="true">${pad2(i + 1)}</span>
          <div class="container caption">
            <div class="caption__title">
              <span class="scene__num">${pad2(i + 1)} / 0${p.scene.length}<i></i>${esc(st.label)}</span>
              <h2 class="h2">${t(st.title)}</h2>
            </div>
            <div class="caption__text">
              <p class="lead">${t(st.text)}</p>
              <a class="link-arrow" href="${esc(st.link.url)}">${esc(st.link.label)} ${icon('arrow-right')}</a>
            </div>
          </div>
        </div>`)}

      <div class="scene__step scene__step--final" data-scene-step data-from="${ranges[2][0]}" data-to="${ranges[2][1]}">
        <div class="container final">
          <span class="scene__num">03 / 03<i></i>${esc(p.scene[2].label)}</span>
          <h2 class="h2 final__title">${t(p.scene[2].title)}</h2>
          <p class="lead final__text">${t(p.scene[2].text)}</p>
          <div class="actions">${secondary}${works}</div>
        </div>
      </div>

      <ol class="scene__progress" aria-hidden="true">
        ${each(p.scene, (st, i) => `<li data-scene-bar data-from="${i === 0 ? 0.06 : ranges[i][0] - 0.06}" data-to="${ranges[i][1] - (i === 2 ? 0.07 : 0)}"><span>${esc(st.label)}</span><i><b></b></i></li>`)}
      </ol>
      <div class="hero__scroll scene__hint" aria-hidden="true"><span>Листайте</span><i></i></div>
    </div>
  </section>

  ${marquee(p.marquee)}

  ${section(
    `${sectionHead({ align: 'center', label: false, eyebrow: 'Услуги', title: 'Очищаем и *защищаем* металл', lead: 'Лазерная очистка металла и антикоррозийная обработка автомобилей. Перед антикором удаляем очаги ржавчины лазером.' })}
    <div class="svc-grid">
      ${serviceFeature(ctx, { title: s.cleaning.title, text: s.cleaning.short, url: s.cleaning.url, mediaKey: s.cleaning.media, index: 1, tag: 'Без абразива и химии', list: s.cleaning.removes.slice(0, 4) })}
      ${serviceFeature(ctx, { title: 'Антикоррозийная обработка', text: s.anticor.short, url: s.anticor.url, mediaKey: s.anticor.media, index: 2, tag: 'Dinitrol · Mercasol', list: s.anticor.zones.map((z) => z.title) })}
    </div>`,
    { extra: 'section--services' },
  )}

  ${section(
    `<div class="duo">
      <div class="duo__item">
        <span class="duo__num">01</span>
        <h3 class="duo__title">Лазер снимает ржавчину</h3>
        <p class="duo__text">${t(s.cleaning.benefits[4].text)}</p>
      </div>
      <div class="duo__arrow" aria-hidden="true"><span></span>${icon('arrow-right')}</div>
      <div class="duo__item">
        <span class="duo__num">02</span>
        <h3 class="duo__title">Антикор защищает металл</h3>
        <p class="duo__text">${t(s.anticor.highlights[3])}. Материалы Dinitrol и Mercasol.</p>
      </div>
    </div>`,
    { extra: 'section--duo' },
  )}

  ${section(
    `<div class="facts-band">
      <div class="facts-band__head">
        <span class="facts-band__label">Антикор в цифрах</span>
        <h2 class="h2" data-split>${rich('Защита, которой *можно доверять*')}</h2>
      </div>
      ${counters(s.anticor.facts)}
    </div>`,
  )}

  ${section(
    `${sectionHead({ align: 'center', label: false, eyebrow: 'Работы', title: 'Как это выглядит *вживую*', lead: 'Фото из нашего бокса в Пружанах.', action: button({ label: 'Все работы', href: '/raboty/', variant: 'ghost', size: 'sm' }) })}
    <div class="works-teaser" data-stagger>
      ${ctx.media('anticor.prep', { cls: 'works-teaser__item' })}
      ${ctx.media('service.cleaning', { cls: 'works-teaser__item works-teaser__item--tall', ratio: '4/5' })}
      ${ctx.media('anticor.underbody', { cls: 'works-teaser__item' })}
      ${ctx.media('anticor.arches', { cls: 'works-teaser__item' })}
    </div>`,
  )}

  ${section(
    `${sectionHead({ align: 'center', label: false, eyebrow: 'Отзывы', title: 'Что говорят *клиенты*', lead: `${c.reviews.stats.prefix}${c.reviews.stats.value}${c.reviews.stats.suffix} ${c.reviews.stats.label}.`, action: button({ label: 'Все отзывы', href: '/raboty/#otzyvy', variant: 'ghost', size: 'sm' }) })}
    <div class="reviews-grid" data-stagger>${each(c.reviews.services.slice(0, 3), reviewCard)}</div>`,
  )}

  ${ctaBand(ctx)}`;

  return {
    body,
    schema: [service(ctx, s.cleaning), service(ctx, { ...s.anticor, title: 'Антикоррозийная обработка автомобиля' })],
  };
}
