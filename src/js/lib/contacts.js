/**
 * Ссылки на телефон и мессенджеры. Общий код: используется и шаблонами (Node), и браузером.
 * contact — объект из content/site.json → contacts.services.
 */

export const telHref = (contact) => `tel:${contact.tel}`;

export function messengerHref(type, contact, text = '') {
  const q = text ? encodeURIComponent(text) : '';
  switch (type) {
    case 'telegram': {
      const id = String(contact.telegram || '').replace(/^@/, '');
      return `https://t.me/${id}${q ? `?text=${q}` : ''}`;
    }
    case 'whatsapp':
      return `https://wa.me/${String(contact.whatsapp).replace(/\D/g, '')}${q ? `?text=${q}` : ''}`;
    case 'viber':
      // Viber не умеет подставлять текст в конкретный чат — текст копируем в буфер (см. forms.js)
      return `viber://chat?number=${encodeURIComponent(`+${String(contact.viber).replace(/\D/g, '')}`)}`;
    case 'email':
      return `mailto:${contact.email}${q ? `?subject=${encodeURIComponent('Заявка с сайта manlaser')}&body=${q}` : ''}`;
    default:
      return '#';
  }
}

export const MESSENGERS = [
  { type: 'telegram', label: 'Telegram' },
  { type: 'viber', label: 'Viber' },
  { type: 'whatsapp', label: 'WhatsApp' },
];

export const sectionKey = (section) => (section === 'equipment' ? 'equipment' : 'services');
