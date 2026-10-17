/**
 * Телефон: маска +375 (XX) XXX-XX-XX — только белорусские номера (звонить на другие нам неудобно и это чаще опечатка).
 * Проверка: ровно 12 цифр, начиная с 375.
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

  // набирают по цифрам: «375…» или «8 0…» / «0 29…» — пока видно только начало, ничего не додумываем
  if (d === '8' || d === '0' || d === '80' || (d.length <= 3 && '375'.startsWith(d))) return `+${d}`;
  // всё остальное, что не начинается с 375, считаем номером без кода страны («12345» не даёт «+12345»)
  if (!d.startsWith('375')) d = `375${d}`;
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
  if (!d) return 'Укажите телефон, чтобы менеджер мог перезвонить';
  if (!d.startsWith('375')) return 'Укажите белорусский номер: +375 (XX) XXX-XX-XX';
  if (d.length < 12) return 'Номер неполный: нужно 9 цифр после +375';
  return '';
}
