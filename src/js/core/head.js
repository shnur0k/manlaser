/** После перехода Barba обновляем <head>: title, description, canonical, OG и Schema.org. */
const SELECTORS = [
  'meta[name="description"]',
  'meta[name="robots"]',
  'link[rel="canonical"]',
  'meta[property="og:type"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'script[data-schema]',
];

export function updateHead(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.title = doc.title;
  for (const sel of SELECTORS) {
    const next = doc.head.querySelector(sel);
    const cur = document.head.querySelector(sel);
    if (next && cur) cur.replaceWith(next.cloneNode(true));
    else if (next) document.head.appendChild(next.cloneNode(true));
    else if (cur) cur.remove();
  }
}
