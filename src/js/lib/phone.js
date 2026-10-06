/**
 * Телефон: маска +375 (XX) XXX-XX-XX для Беларуси, для других стран — просто цифры с «+».
 * Проверка: для +375 — ровно 12 цифр и код оператора/города; для других — от 10 до 15 цифр.
 */
const BY_MOBILE = ['25', '29', '33', '44'];

export const digitsOf = (v) => String(v || '').replace(/\D/g, '');

export function formatPhone(value) {
  let d = digitsOf(value);
  if (!d) return '';
  // ввели «8029…» или «029…» — приводим к 375…
  if (d.startsWith('80') && d.length >= 3) d = `375${d.slice(2)}`;
  else if (d.startsWith('0') && d.length >= 2) d = `375${d.slice(1)}`;
  else if (!d.startsWith('375') && !d.startsWith('7') && d.length <= 9 && BY_MOBILE.some((c) => d.startsWith(c))) d = `375${d}`;

  if (!d.startsWith('375')) return `+${d.slice(0, 15)}`;
  d = d.slice(0, 12);
  const p = [d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
  let out = '+375';
  if (p[0]) out += ` (${p[0]}`;
  if (p[0].length === 2) out += ')';
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return out;
}

/** Возвращает текст ошибки или '' если номер в порядке. */
export function phoneError(value) {
  const d = digitsOf(value);
  if (!d) return 'Укажите телефон, чтобы мастер мог перезвонить';
  if (d.startsWith('375')) {
    if (d.length < 12) return 'Номер неполный: нужно 9 цифр после +375';
    return '';
  }
  if (d.length < 10 || d.length > 15) return 'Проверьте номер телефона';
  return '';
}
