/**
 * «Сейчас открыто · до 19:00» / «Сейчас закрыто · откроемся в 9:00».
 * Время считается по часовому поясу сервиса (Europe/Minsk), а не по часам посетителя.
 * Данные — из атрибутов [data-hours] (content/site.json → hours).
 */
const DAY_NAMES = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];

function nowIn(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1; // 1 = пн
  return { day, minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
}
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
const short = (hhmm) => hhmm.replace(/^0/, '');

export function openState({ open, close, days, tz }) {
  const { day, minutes } = nowIn(tz);
  const o = toMin(open);
  const c = toMin(close);
  const worksToday = days.includes(day);
  if (worksToday && minutes >= o && minutes < c) {
    const left = c - minutes;
    return { isOpen: true, day, text: left <= 60 ? `Сейчас открыто · закроемся через ${left} мин` : `Сейчас открыто · до ${short(close)}` };
  }
  // ищем ближайший рабочий день
  if (worksToday && minutes < o) return { isOpen: false, day, text: `Сейчас закрыто · откроемся в ${short(open)}` };
  for (let i = 1; i <= 7; i++) {
    const d = ((day - 1 + i) % 7) + 1;
    if (days.includes(d)) {
      return { isOpen: false, day, text: `Сейчас закрыто · откроемся ${i === 1 ? 'завтра' : `в ${DAY_NAMES[d - 1]}`} в ${short(open)}` };
    }
  }
  return { isOpen: false, day, text: 'Сейчас закрыто' };
}

export function initHours(root) {
  const blocks = [...root.querySelectorAll('[data-hours]')];
  const minis = [...root.querySelectorAll('[data-open-status-mini]')];
  if (!blocks.length && !minis.length) return () => {};
  const src = blocks[0] || document.querySelector('[data-hours]');
  // для мини-статуса без блока часов берём данные с первого блока на странице или из разметки карты
  const cfg = src
    ? { open: src.dataset.open, close: src.dataset.close, days: src.dataset.days.split(',').map(Number), tz: src.dataset.tz }
    : { open: '09:00', close: '19:00', days: [1, 2, 3, 4, 5, 6, 7], tz: 'Europe/Minsk' };

  const update = () => {
    let state;
    try {
      state = openState(cfg);
    } catch {
      return; // старый браузер без Intl timeZone — оставляем статичный текст
    }
    blocks.forEach((b) => {
      const s = b.querySelector('[data-open-status]');
      s.classList.toggle('is-open', state.isOpen);
      s.classList.toggle('is-closed', !state.isOpen);
      s.querySelector('span').textContent = state.text;
      b.querySelectorAll('[data-day]').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.day) === state.day));
    });
    minis.forEach((m) => {
      m.classList.toggle('is-open', state.isOpen);
      m.classList.toggle('is-closed', !state.isOpen);
      m.querySelector('span').textContent = state.text;
    });
  };
  update();
  const timer = setInterval(update, 60_000);
  return () => clearInterval(timer);
}
