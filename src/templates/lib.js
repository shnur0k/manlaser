/** Мелкие помощники для HTML-шаблонов (выполняются в Node при сборке страниц). */

export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Текст из контента: экранирует и подсвечивает плейсхолдеры [ЦЕНА] и пометки ⚠. */
export const t = (v) =>
  esc(v)
    .replace(/\[([^\]]+)\]/g, '<span class="ph-text" title="Заполнить в /content">[$1]</span>')
    .replace(/⚠/g, '<span class="warn-mark" title="Данные на старых сайтах расходятся — уточнить">⚠</span>');

/** Заголовок с акцентами: *слово* → слово в фирменном градиенте. */
export const rich = (v) => t(v).replace(/\*([^*]+)\*/g, '<em class="accent">$1</em>');

export const each = (arr, fn) => (arr || []).map(fn).join('');

export const cls = (...parts) => parts.filter(Boolean).join(' ');

export const attrs = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(' ');

export const pad2 = (n) => String(n).padStart(2, '0');

export const isPlaceholder = (v) => typeof v === 'string' && /^\[.*\]$/.test(v.trim());

const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const formatDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/** Число из строки цены: «от 12 500 BYN без НДС» → 12500. */
export const priceNumber = (s) => {
  const m = String(s || '').replace(/ /g, ' ').match(/(\d[\d\s]*)\s*BYN/);
  return m ? Number(m[1].replace(/\s/g, '')) : null;
};
