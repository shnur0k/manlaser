import config from '../../../config.js';

/**
 * Заявка «Запросить цену»: сборка текста и отправка.
 * Текст собирается уже сейчас — его же потом отправим в Telegram / Viber / WhatsApp / почту.
 * Пока config.booking.send = false, заявка никуда не уходит.
 */
export function composeMessage(data) {
  const lines = ['Заявка с сайта manlaser.by', ''];
  const add = (label, value) => value && lines.push(`${label}: ${value}`);
  add('Интересует', data.subject);
  add('Имя', data.name);
  add('Телефон', data.phone);
  add('Связаться', data.contactLabel);
  add('Комментарий', data.comment);
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
