/**
 * Карта сайта: какие страницы существуют и каким шаблоном рендерятся.
 * Статьи блога добавляются автоматически из /content/blog.
 */
export function buildRoutes(c, { dev = false } = {}) {
  const routes = [];
  const add = (r) => routes.push({ section: 'services', crumbs: [], ...r });

  const services = { name: 'Услуги', url: '/uslugi/' };
  const about = { name: 'О нас', url: '/o-nas/' };

  add({ url: '/', page: 'home', namespace: 'home', seo: c.pages.home });

  // УСЛУГИ
  add({ url: '/uslugi/', page: 'servicesHub', namespace: 'services', seo: c.pages.services, crumbs: [services] });
  add({
    url: c.services.cleaning.url, page: 'serviceCleaning', namespace: 'cleaning',
    seo: c.services.cleaning.seo, crumbs: [services, { name: c.services.cleaning.title, url: c.services.cleaning.url }],
  });
  add({
    url: c.services.anticor.url, page: 'serviceAnticor', namespace: 'anticor',
    seo: c.services.anticor.seo, crumbs: [services, { name: 'Антикоррозийная обработка', url: c.services.anticor.url }],
  });
  add({
    url: '/uslugi/kalkulyator/', page: 'calculator', namespace: 'calculator',
    seo: c.pages.calculator, crumbs: [{ name: 'Калькулятор стоимости', url: '/uslugi/kalkulyator/' }],
  });

  // ЗАПИСЬ, РАБОТЫ
  add({ url: '/zapis/', page: 'booking', namespace: 'booking', seo: c.pages.booking, crumbs: [{ name: 'Запись на обработку', url: '/zapis/' }] });
  add({ url: '/raboty/', page: 'works', namespace: 'works', seo: c.pages.works, crumbs: [{ name: 'Работы и отзывы', url: '/raboty/' }] });

  // БЛОГ
  const blog = { name: 'Блог', url: '/blog/' };
  add({ url: '/blog/', page: 'blogList', namespace: 'blog', seo: c.pages.blog, crumbs: [blog] });
  for (const post of c.posts) {
    add({
      url: post.url, page: 'blogPost', namespace: 'post',
      seo: { title: `${post.title} | Блог manlaser`, description: post.description },
      crumbs: [blog, { name: post.title, url: post.url }], data: { post },
      noindex: post.draft, // черновики не должны попадать в поиск
    });
  }

  // О НАС
  add({ url: '/o-nas/', page: 'about', namespace: 'about', seo: c.pages.about, crumbs: [about] });
  add({ url: '/kontakty/', page: 'contacts', namespace: 'contacts', seo: c.pages.contacts, crumbs: [about, { name: 'Контакты', url: '/kontakty/' }] });

  if (dev) {
    add({ url: '/_photos/', page: 'photos', namespace: 'photos', seo: { title: 'Места под фото (только для разработки)', description: '' }, noindex: true });
  }

  return routes;
}

export const notFoundRoute = (c) => ({
  url: '/404.html', page: 'notFound', namespace: 'not-found', section: 'services',
  seo: c.pages.notFound, crumbs: [], noindex: true,
});
