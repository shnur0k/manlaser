import { isPlaceholder, priceNumber } from './lib.js';

/** Разметка Schema.org (JSON-LD). */

export function business(ctx) {
  const { site } = ctx;
  const a = site.address;
  const address = {
    '@type': 'PostalAddress',
    streetAddress: a.street,
    addressLocality: a.city,
    addressRegion: a.region,
    addressCountry: a.country,
  };
  if (!isPlaceholder(a.postalCode)) address.postalCode = a.postalCode;

  const node = {
    '@type': ['LocalBusiness', 'AutoRepair'],
    '@id': `${site.url}/#business`,
    name: site.name,
    description: site.tagline,
    url: `${site.url}/`,
    email: site.email,
    telephone: site.contacts.services.tel,
    address,
    openingHours: site.hours.schema,
    areaServed: ['Пружаны', 'Брестская область', 'Беларусь'],
    priceRange: 'BYN',
    contactPoint: [
      { '@type': 'ContactPoint', telephone: site.contacts.services.tel, contactType: 'customer service', name: site.contacts.services.label, availableLanguage: 'ru' },
    ],
  };
  if (a.geo?.lat && a.geo?.lng) node.geo = { '@type': 'GeoCoordinates', latitude: a.geo.lat, longitude: a.geo.lng };
  return node;
}

export function breadcrumbs(ctx) {
  const { route, site } = ctx;
  if (!route.crumbs?.length) return null;
  const all = [{ name: 'Главная', url: '/' }, ...route.crumbs];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${site.url}${c.url}` })),
  };
}

export function service(ctx, s, { serviceType } = {}) {
  return {
    '@type': 'Service',
    name: s.title,
    serviceType: serviceType || s.title,
    description: s.lead || s.short,
    url: `${ctx.site.url}${s.url}`,
    provider: { '@id': `${ctx.site.url}/#business` },
    areaServed: { '@type': 'City', name: 'Пружаны' },
  };
}

export function product(ctx, p, url) {
  const node = {
    '@type': 'Product',
    name: `${p.type} ${p.name}`,
    sku: p.slug,
    brand: { '@type': 'Brand', name: 'CNMLaser' },
    description: `${p.type} ${p.name}, мощность ${p.power}`,
    url: `${ctx.site.url}${url}`,
  };
  const price = priceNumber(p.price);
  if (price) {
    node.offers = {
      '@type': 'Offer',
      priceCurrency: 'BYN',
      price,
      availability: p.stock === 'в наличии' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      seller: { '@id': `${ctx.site.url}/#business` },
      areaServed: 'BY',
    };
  }
  return node;
}

export function faqPage(items) {
  const real = items.filter((i) => !/\[/.test(i.a));
  if (!real.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: real.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

export function article(ctx, post) {
  return {
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date ? post.date.toISOString().slice(0, 10) : undefined,
    author: { '@type': 'Organization', name: 'manlaser' },
    publisher: { '@id': `${ctx.site.url}/#business` },
    mainEntityOfPage: `${ctx.site.url}${post.url}`,
    keywords: post.tags.join(', '),
  };
}

export const graph = (nodes) =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }).replace(/</g, '\\u003c');
