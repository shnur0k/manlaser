import path from 'node:path';
import { normalizePath } from 'vite';
import { ROOT, CONTENT_DIR, LOGO_FILE } from './paths.js';
import { loadContent } from './content.js';
import { buildRoutes, notFoundRoute } from './routes.js';
import { renderPage, renderError } from '../src/templates/index.js';

/**
 * Vite-плагин, который превращает /content + /src/templates в HTML-страницы.
 * dev:   страницы рендерятся на лету при каждом запросе (правки контента видны сразу);
 * build: каждая страница становится отдельным index.html в /dist.
 * Шаблоны импортируются из vite.config, поэтому при их правке dev-сервер перезапускается сам.
 */
export default function sitePlugin() {
  const pageFile = (url) => (url === '/404.html' ? '404.html' : `${url.replace(/^\//, '')}index.html`);
  const pages = new Map(); // абсолютный id .html → route (только для сборки)
  let content;

  return {
    name: 'manlaser-site',
    enforce: 'pre',

    config(_, { command }) {
      if (command !== 'build') return;
      content = loadContent();
      const routes = [...buildRoutes(content), notFoundRoute(content)];
      const input = {};
      for (const route of routes) {
        const id = normalizePath(path.join(ROOT, pageFile(route.url)));
        pages.set(id, route);
        input[route.url === '/' ? 'home' : route.url.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')] = id;
      }
      return { build: { rollupOptions: { input } } };
    },

    resolveId(id) {
      const n = normalizePath(id);
      if (pages.has(n)) return n;
    },

    load(id) {
      const route = pages.get(normalizePath(id));
      if (route) return renderPage(route, content, { dev: false });
    },

    configureServer(server) {
      server.watcher.add([CONTENT_DIR, LOGO_FILE]);
      const reload = (file) => {
        const f = normalizePath(file);
        if (f.startsWith(normalizePath(CONTENT_DIR)) || f === normalizePath(LOGO_FILE)) {
          server.ws.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const url = new URL(req.url, 'http://localhost');
        let pathname = decodeURIComponent(url.pathname);

        if (/^\/(@|src\/|node_modules\/|content\/|assets\/|__)/.test(pathname)) return next();
        if (path.extname(pathname) && !pathname.endsWith('.html')) return next();
        if (pathname.endsWith('/index.html')) pathname = pathname.slice(0, -'index.html'.length);

        let c;
        try {
          c = loadContent();
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(renderError(err));
        }

        const routes = buildRoutes(c, { dev: true });
        let route = routes.find((r) => r.url === pathname);

        if (!route && !pathname.endsWith('/') && routes.some((r) => r.url === `${pathname}/`)) {
          res.statusCode = 301;
          res.setHeader('Location', `${pathname}/${url.search}`);
          return res.end();
        }

        let status = 200;
        if (!route) {
          if (!(req.headers.accept || '').includes('text/html')) return next();
          route = notFoundRoute(c);
          status = 404;
        }

        try {
          let html = renderPage(route, c, { dev: true });
          html = await server.transformIndexHtml(req.url, html, req.originalUrl);
          res.statusCode = status;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store'); // при разработке браузер не должен держать старые страницы
          res.end(html);
        } catch (err) {
          server.config.logger.error(err.stack || String(err));
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderError(err));
        }
      });
    },
  };
}
