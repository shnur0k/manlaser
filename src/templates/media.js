import { esc } from './lib.js';
import { icon } from './icons.js';

/**
 * Фото по ключу из content/media.json.
 * Если src пустой — выводится заглушка «Место для фото» с описанием, какое фото нужно.
 */
export function media(map, key, { cls = '', eager = false, ratio, sizes, alt } = {}) {
  const m = map[key] || { src: null, alt: '', want: `Нет записи «${key}» в content/media.json`, ratio: '4/3' };
  const r = ratio || m.ratio || '4/3';
  const style = `--ratio:${r.replace('/', ' / ')}`;

  if (m.src) {
    return `<figure class="media ${cls}" style="${style}">
      <img src="${esc(m.src)}" alt="${esc(alt ?? m.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${
        eager ? ' fetchpriority="high"' : ''
      }${sizes ? ` sizes="${esc(sizes)}"` : ''}>
    </figure>`;
  }

  return `<figure class="media media--ph ${cls}" style="${style}" data-media-key="${esc(key)}" role="img" aria-label="${esc(alt ?? m.alt)}">
    <div class="media__ph">
      <span class="media__ph-icon">${icon('camera')}</span>
      <span class="media__ph-label">Место для фото</span>
      <span class="media__ph-want">${esc(m.want)}</span>
      <span class="media__ph-meta">${esc(key)} · ${esc(r)}</span>
    </div>
  </figure>`;
}
