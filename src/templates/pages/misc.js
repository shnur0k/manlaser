import { esc, t, each, formatDate } from '../lib.js';
import { icon } from '../icons.js';
import { button, eyebrow, sectionHead, faq, counters, features, reviewCard, ctaBand, pageHero, section, messengerLinks, phoneLink, equipmentNote } from '../components.js';
import { article, faqPage } from '../schema.js';
import { hoursBlock, findUsBlock, requisitesBlock } from '../partials/contact-blocks.js';

export function works(ctx) {
  const { c } = ctx;
  const p = c.pages.works;
  const photos = ['anticor.prep', 'service.cleaning', 'anticor.underbody', 'anticor.arches'];
  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, actions: `<a class="pill-link" href="#galereya">Галерея</a><a class="pill-link" href="#otzyvy">Отзывы</a>` })}
    ${section(`<div class="works-grid" data-stagger>${each(photos, (k) => ctx.media(k, { cls: 'works-grid__item' }))}</div>
      <p class="muted small">Галерея «до/после» с эффектом лазерного выжигания и фильтром по услугам — этап 7.</p>`, { id: 'galereya' })}
    ${section(`${sectionHead({ eyebrow: 'Отзывы', title: 'Отзывы *клиентов*', lead: `${c.reviews.stats.prefix}${c.reviews.stats.value}${c.reviews.stats.suffix} ${c.reviews.stats.label}.` })}
      <div class="reviews-grid" data-stagger>${each(c.reviews.services, reviewCard)}</div>`, { id: 'otzyvy' })}
    ${ctaBand(ctx)}`;
}

export function blogList(ctx) {
  const { c } = ctx;
  const p = c.pages.blog;
  const tags = [...new Set(c.posts.flatMap((x) => x.tags))];
  return `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead })}
    ${section(`
      ${tags.length ? `<div class="tag-filter" role="group" aria-label="Фильтр по темам" data-tag-filter>
        <button class="tag-filter__btn is-active" type="button" data-tag="*">Все</button>
        ${each(tags, (tg) => `<button class="tag-filter__btn" type="button" data-tag="${esc(tg)}">${esc(tg)}</button>`)}
      </div>` : ''}
      <div class="post-grid" data-post-grid>
        ${c.posts.length ? each(
          c.posts,
          (post) => `<a class="card card--post" href="${esc(post.url)}" data-tags="${esc(post.tags.join('|'))}" data-tilt="soft">
            <div class="card__media">${post.cover ? `<figure class="media" style="--ratio:16 / 9"><img src="${esc(post.cover)}" alt="" loading="lazy"></figure>` : ctx.media('blog.default', { ratio: '16/9' })}</div>
            <div class="card__body">
              <div class="card__top">${post.draft ? '<span class="tag tag--warn">Черновик</span>' : ''}${each(post.tags.slice(0, 2), (tg) => `<span class="tag">${esc(tg)}</span>`)}</div>
              <h2 class="card__title">${esc(post.title)}</h2>
              <p class="card__text">${esc(post.description)}</p>
              <p class="card__meta">${esc(formatDate(post.date))} · ${post.readingMinutes} мин</p>
              <span class="card__arrow">${icon('arrow-up-right')}</span>
            </div>
          </a>`,
        ) : '<p class="muted">Статей пока нет. Добавьте .md-файл в content/blog.</p>'}
      </div>`)}`;
}

export function blogPost(ctx) {
  const { post } = ctx.route.data;
  return {
    body: `
    ${pageHero(ctx, { eyebrow: post.tags[0] || 'Блог', title: post.title, lead: post.description, variant: 'post' })}
    <article class="section article">
      <div class="container container--narrow">
        <p class="article__meta">${esc(formatDate(post.date))} · ${post.readingMinutes} мин чтения${post.draft ? ' · <span class="tag tag--warn">ЧЕРНОВИК — проверить</span>' : ''}</p>
        <div class="prose">${post.html}</div>
        <div class="article__back">${button({ label: 'Все статьи', href: '/blog/', variant: 'ghost', iconName: 'arrow-left' })}</div>
      </div>
    </article>
    ${ctaBand(ctx)}`,
    schema: [article(ctx, post)],
  };
}

export function about(ctx) {
  const { c } = ctx;
  const p = c.pages.about;
  const a = c.services.anticor;
  const allFaq = c.faq.groups;
  return {
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, mediaKey: 'about.company' })}

    ${section(`${sectionHead({ eyebrow: 'О компании', title: 'manlaser — *лазерный сервис*', lead: c.site.about })}
      ${counters(a.facts)}`)}

    ${section(`${sectionHead({ eyebrow: 'Как работаем', title: 'Принципы, *которых держимся*' })}
      ${features([
        { title: 'Честная оценка', text: `${a.highlights[0]}.` },
        { title: 'Сначала лазер', text: `${a.highlights[1]}.` },
        { title: 'Бережно к деталям', text: `${a.highlights[2]}.` },
        { title: 'Не экономим', text: `${a.highlights[3]}.` },
      ], { cols: 4 })}`)}

    ${section(`<div class="about-photos" data-stagger>
      ${ctx.media('about.service', { cls: 'about-photos__item' })}
      ${ctx.media('home.team', { cls: 'about-photos__item about-photos__item--wide' })}
    </div>
    ${equipmentNote(ctx, 'about-note')}`)}

    ${section(`${sectionHead({ eyebrow: 'FAQ', title: 'Частые *вопросы*', id: 'faq', lead: 'Про запись, лазерную очистку и антикоррозийную обработку.' })}
      <div class="faq-groups">${each(allFaq, (g) => `<div class="faq-group"><h3 class="h3 faq-group__title">${esc(g.title)}</h3>${faq(g.items, { id: `faq-${g.id}` })}</div>`)}</div>`)}
    ${ctaBand(ctx)}`,
    schema: [faqPage(allFaq.flatMap((g) => g.items))],
  };
}

export function contacts(ctx) {
  const { site, c } = ctx;
  const p = c.pages.contacts;
  const general = c.faq.groups.find((g) => g.id === 'general')?.items || [];
  return {
    body: `
    ${pageHero(ctx, { eyebrow: p.eyebrow, title: p.heading, lead: p.lead, variant: 'compact' })}

    ${section(`<div class="contact-grid" data-stagger>
      <article class="contact-card contact-card--accent">
        <h2 class="contact-card__title">${icon('phone')}Запись на обработку</h2>
        ${phoneLink(site.contacts.services, { showLabel: false, extra: 'phone-link--xl' })}
        <p class="muted small">Позвоните или напишите в мессенджер — мастер ответит и подберёт время.</p>
        ${messengerLinks({ ...site.contacts.services, email: site.email }, { variant: 'pill' })}
        <a class="link-arrow" href="mailto:${esc(site.email)}">${icon('mail')}${esc(site.email)}</a>
      </article>
      <article class="contact-card">
        <h2 class="contact-card__title">${icon('clock')}Режим работы</h2>
        ${hoursBlock(ctx)}
      </article>
    </div>`, { extra: 'section--tight' })}

    ${section(findUsBlock(ctx), { extra: 'section--tight' })}

    ${section(`<div class="split">
      <div>${sectionHead({ eyebrow: 'Реквизиты', title: 'Реквизиты' })}</div>
      <div>${requisitesBlock(ctx)}</div>
    </div>`)}

    ${general.length ? section(`${sectionHead({ eyebrow: 'Вопросы', title: 'Запись и *контакты*' })}${faq(general, { id: 'faq-general' })}`) : ''}`,
    schema: [faqPage(general)],
  };
}

export function notFound(ctx) {
  const p = ctx.c.pages.notFound;
  return {
    body: `<section class="nf">
      <div class="nf__beam" aria-hidden="true"></div>
      <div class="container nf__inner">
        <p class="nf__code display" aria-hidden="true">404</p>
        <h1 class="h1" data-split>${esc(p.heading)}</h1>
        <p class="lead">${esc(p.lead)}</p>
        <div class="actions">${button({ label: 'На главную', href: '/' })}${button({ label: 'Услуги', href: '/uslugi/', variant: 'ghost', iconName: 'arrow-right' })}${button({ label: 'Калькулятор', href: '/uslugi/kalkulyator/', variant: 'ghost', iconName: 'arrow-right' })}</div>
      </div>
    </section>`,
    noFooter: false,
  };
}

/** Только в dev: список всех мест под фото и их статус. */
export function photos(ctx) {
  const entries = Object.entries(ctx.c.media).filter(([k]) => !k.startsWith('_'));
  const done = entries.filter(([, m]) => m.src).length;
  return `<section class="section" style="padding-top:140px"><div class="container">
    ${eyebrow('Только для разработки')}
    <h1 class="h2">Места под фото: ${done} из ${entries.length} заполнено</h1>
    <p class="lead">Положите фото в /public/images/ и впишите путь в content/media.json → src.</p>
    <div class="table-wrap"><table class="compare-table"><thead><tr><th>Ключ</th><th>Что снять</th><th>Пропорции</th><th>Статус</th></tr></thead><tbody>
      ${each(entries, ([k, m]) => `<tr><th scope="row"><code>${esc(k)}</code></th><td>${esc(m.want)}</td><td>${esc(m.ratio)}</td><td>${m.src ? `<span class="stock stock--in">есть</span>` : '<span class="stock stock--order">нужно фото</span>'}</td></tr>`)}
    </tbody></table></div>
  </div></section>`;
}
