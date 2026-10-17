/**
 * Какой пункт меню подсветить для адреса url: выбирается самое точное совпадение
 * (чтобы на /uslugi/kalkulyator/ горел «Калькулятор», а не «Услуги»). Общий код для шаблонов и браузера.
 */
export function activeNavUrl(nav, url) {
  let best = null;
  let bestLen = -1;
  for (const item of nav) {
    const candidates = [item.url, ...(item.items || []).map((i) => i.url.split('#')[0])];
    for (const u of candidates) {
      const match = u === '/' ? url === '/' : url.startsWith(u);
      if (match && u.length > bestLen) {
        best = item.url;
        bestLen = u.length;
      }
    }
  }
  return best;
}
