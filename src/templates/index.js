import { layout } from './layout.js';
import { media } from './media.js';
import { esc } from './lib.js';
import { sectionKey } from '../js/lib/contacts.js';
import { resetSectionIndex } from './components.js';
import * as pages from './pages/index.js';

function createContext(route, c, { dev }) {
  // сайт услуг: один набор контактов (раздел оборудования вынесен на отдельный сайт)
  const key = c.site.contacts[sectionKey(route.section)] ? sectionKey(route.section) : 'services';
  return {
    c,
    route,
    dev,
    site: c.site,
    sectionKey: key,
    contact: { ...c.site.contacts[key], email: c.site.email },
    logo: c.logo,
    // только надпись — для гигантского логотипа в футере
    logoWord: c.logo
      .replace(/<defs>[\s\S]*?<\/defs>/, '')
      .replace(/<path class="logo__mark"[^>]*\/>/, '').replace(/viewBox="[^"]*"/, 'viewBox="1224 15 510 88"'),
    media: (key2, opts) => media(c.media, key2, opts),
  };
}

export function renderPage(route, c, opts = {}) {
  const ctx = createContext(route, c, opts);
  const tpl = pages[route.page];
  if (!tpl) throw new Error(`Нет шаблона страницы «${route.page}» (src/templates/pages)`);
  resetSectionIndex();
  const out = tpl(ctx);
  return layout(ctx, typeof out === 'string' ? { body: out } : out);
}

export function renderError(err) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ошибка сборки страницы</title>
  <style>body{background:#000;color:#f9f9f9;font:16px/1.6 system-ui;padding:48px;max-width:860px;margin:auto}
  h1{color:#E85002;font-size:28px}pre{background:#111;border:1px solid #333;padding:16px;border-radius:12px;white-space:pre-wrap;color:#A7A7A7}</style></head>
  <body><h1>Страница не собралась</h1><p>${esc(err.message)}</p><pre>${esc(err.stack || '')}</pre>
  <p>Исправьте файл и обновите страницу.</p></body></html>`;
}
