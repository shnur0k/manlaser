/**
 * Карта сайта: какие страницы существуют и каким шаблоном рендерятся.
 * Страницы товаров строятся из content/equipment.json, статьи блога — из /content/blog.
 */
export function buildRoutes(c, { dev = false } = {}) {
  const routes = [];
  const add = (r) => routes.push({ section: 'main', crumbs: [], ...r });

  const catalog = { name: 'Оборудование', url: '/oborudovanie/' };
  const about = { name: 'О нас', url: '/o-nas/' };

  add({ url: '/', page: 'home', namespace: 'home', seo: c.pages.home });

  // ОБОРУДОВАНИЕ: общий каталог с фильтром по категориям и страница каждого товара
  add({ url: '/oborudovanie/', page: 'equipmentHub', namespace: 'equipment', seo: c.pages.equipment, crumbs: [catalog] });
  for (const p of c.equipment.products) {
    const cat = c.equipment.categories.find((x) => x.id === p.category);
    add({
      url: p.url, page: 'product', namespace: 'product',
      seo: {
        // если тип и название вместе слишком длинные (станок с труборезным модулем) — только название
        title: `${(p.type + p.name).length > 36 ? p.name : `${p.type} ${p.name}`} — купить в Беларуси | manlaser`,
        description: `${p.type} CNMLaser ${p.name}, мощность ${p.power}. ${p.stock === 'в наличии' ? 'В наличии. ' : ''}Бесплатная доставка по Беларуси, пусконаладка и обучение, гарантия.`,
      },
      crumbs: [catalog, { name: p.name, url: p.url }], data: { product: p, category: cat },
    });
  }

  // РЕМОНТ, ДОСТАВКА, ЗАЯВКА
  add({ url: '/remont/', page: 'repair', namespace: 'repair', seo: c.pages.repair, crumbs: [{ name: 'Ремонт и диагностика', url: '/remont/' }] });
  add({ url: '/oplata-i-dostavka/', page: 'delivery', namespace: 'delivery', seo: c.pages.delivery, crumbs: [{ name: 'Оплата и доставка', url: '/oplata-i-dostavka/' }] });
  add({ url: '/zapros/', page: 'request', namespace: 'request', seo: c.pages.request, crumbs: [{ name: 'Запросить цену', url: '/zapros/' }] });

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
  add({ url: '/voprosy/', page: 'faqHub', namespace: 'faq', seo: c.pages.faq, crumbs: [about, { name: 'Частые вопросы', url: '/voprosy/' }] });

  if (dev) {
    add({ url: '/_photos/', page: 'photos', namespace: 'photos', seo: { title: 'Места под фото (только для разработки)', description: '' }, noindex: true });
  }

  return routes;
}

export const notFoundRoute = (c) => ({
  url: '/404.html', page: 'notFound', namespace: 'not-found', section: 'main',
  seo: c.pages.notFound, crumbs: [], noindex: true,
});
