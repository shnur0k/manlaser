import config from '../../../config.js';

/**
 * Заявка на обработку: сборка текста и отправка.
 * Текст собирается уже сейчас — его же потом отправим в Telegram / Viber / WhatsApp / почту.
 * Пока config.booking.send = false, заявка никуда не уходит.
 */
export function composeMessage(data) {
  const lines = ['Заявка с сайта manlaser', ''];
  const add = (label, value) => value && lines.push(`${label}: ${value}`);
  add('Услуга', data.serviceLabel);
  add('Имя', data.name);
  add('Телефон', data.phone);
  add('Связаться', data.contactLabel);
  add('Автомобиль / деталь', data.object);
  add('Когда удобно', [data.dateLabel, data.timeLabel].filter(Boolean).join(', '));
  add('Комментарий', data.comment);
  if (data.calc) {
    lines.push('', `Расчёт из калькулятора (${data.calc.serviceLabel}):`);
    data.calc.params.forEach(([k, v]) => lines.push(`— ${k}: ${v}`));
    lines.push(`— Предварительно: ≈ ${Number(data.calc.total).toLocaleString('ru-RU')} ${data.calc.currency}${data.calc.demo ? ' (демо-цены)' : ''}`);
  }
  return lines.join('\n');
}

/** Отправка заявки. Возвращает { sent: boolean }. */
export async function sendBooking(data) {
  const message = composeMessage(data);
  if (!config.booking?.send) {
    if (import.meta.env.DEV) console.info('[manlaser] Отправка заявок выключена (config.js → booking.send). Текст заявки:\n\n' + message);
    return { sent: false, message };
  }
  // здесь будет отправка в выбранный канал
  return { sent: false, message };
}
