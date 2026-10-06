import { esc } from './lib.js';
import { header } from './partials/header.js';
import { mobileMenu } from './partials/mobile-menu.js';
import { footer } from './partials/footer.js';
import { floating, overlays } from './partials/chrome.js';
import { business, breadcrumbs, graph } from './schema.js';

/**
 * Общий каркас каждой страницы.
 * Шапка, мобильное меню, плавающие кнопки и слой перехода живут вне контейнера Barba
 * и не перерисовываются при переходах; содержимое страницы и футер — внутри контейнера.
 */
export function layout(ctx, page) {
  const { route, site } = ctx;
  const seo = route.seo || {};
  const title = seo.title || site.name;
  const description = seo.description || site.tagline;
  const canonical = `${site.url}${route.url === '/404.html' ? '/' : route.url}`;
  const schema = graph([business(ctx), breadcrumbs(ctx), ...(page.schema || [])]);

  return `<!doctype html>
<html lang="ru" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${route.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
  <meta property="og:type" content="${route.page === 'blogPost' ? 'article' : 'website'}">
  <meta property="og:site_name" content="manlaser">
  <meta property="og:locale" content="ru_BY">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta name="theme-color" content="#000000">
  <meta name="format-detection" content="telephone=no">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script>document.documentElement.classList.replace('no-js','js');setTimeout(function(){if(!window.__mlReady)document.documentElement.classList.add('reveal-off')},4000)</script>  <link rel="stylesheet" href="/src/css/main.css">
  <script type="module" src="/src/js/main.js"></script>
  <script type="application/ld+json" data-schema>${schema}</script>
  ${page.head || ''}
</head>
<body data-section="${esc(ctx.sectionKey)}">
  <a class="skip-link" href="#main">Перейти к содержимому</a>
  <div class="grain" aria-hidden="true"></div>
  ${header(ctx)}
  ${mobileMenu(ctx)}
  <div data-barba="wrapper">
    <main id="main" class="page page--${esc(route.namespace)}" data-barba="container" data-barba-namespace="${esc(route.namespace)}" data-section="${esc(ctx.sectionKey)}" data-url="${esc(route.url)}">
      ${page.body}
      ${page.noFooter ? '' : footer(ctx)}
    </main>
  </div>
  ${floating(ctx)}
  ${overlays()}
</body>
</html>`;
}
