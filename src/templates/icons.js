/** Inline-иконки (24×24, цвет = currentColor). */
const s = (body, { fill = false } = {}) =>
  `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" ${
    fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
  }>${body}</svg>`;

const icons = {
  'arrow-up-right': s('<path d="M7 17 17 7M8 7h9v9"/>'),
  'arrow-right': s('<path d="M4 12h16M14 6l6 6-6 6"/>'),
  'arrow-left': s('<path d="M20 12H4M10 6l-6 6 6 6"/>'),
  'chevron-down': s('<path d="m6 9 6 6 6-6"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  phone: s('<path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 7.2 7.2l1.4-2.1 4.2 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5Z"/>'),
  mail: s('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  pin: s('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
  chat: s('<path d="M4 18.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H8.5L4 18.5Z"/><path d="M8.5 9h7M8.5 12h4.5"/>'),
  camera: s('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.5"/>'),
  spark: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
  shield: s('<path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'),
  truck: s('<path d="M3 6.5h11v9H3zM14 9.5h3.8l3.2 3.4v2.6h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  wrench: s('<path d="M14.5 5.5a4 4 0 0 0 5 5L12 18a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2Z"/>'),
  card: s('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>'),
  gallery: s('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="m4 17 5-5 3.5 3.5L15 13l5 5"/>'),
  article: s('<path d="M6.5 3.5h8l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M14 3.5V7h4M8.5 11h7M8.5 14h7M8.5 17h4"/>'),
  info: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>'),
  calc: s('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5v3M8.5 18h.01M12 18h.01"/>'),
  star: s('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5Z"/>', { fill: true }),
  telegram: s(
    '<path d="M20.7 4.1 3.4 10.8c-1.1.4-1.1 1.7 0 2l4.4 1.4 1.7 5.3c.2.7 1.1.9 1.6.4l2.5-2.3 4.6 3.4c.6.4 1.5.1 1.6-.6l2.9-14.6c.2-1-.8-1.8-1.6-1.4Zm-10.5 10.6-.4 3-1-3.9 8.6-6.6-7.2 7.5Z"/>',
    { fill: true },
  ),
  whatsapp: s(
    '<path d="M3.6 20.4 4.9 16A8.6 8.6 0 1 1 8 19.1l-4.4 1.3Z"/><path d="M9.1 8.3c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.2.6-.5.8-.6.4-1.4.5-2.1.3-2.7-.8-4.8-2.9-5.6-5.6-.2-.8-.1-1.6.2-2.2Z"/>',
  ),
  viber: s(
    '<path d="M12 3c-4.6 0-8 1.4-8 7.4 0 3.1.9 5.1 2.8 6.2v3.9l3-2.7c.7.1 1.4.1 2.2.1 4.6 0 8-1.4 8-7.5S16.6 3 12 3Z"/><path d="M9.6 8.2c.2-.3.4-.4.7-.4h.3c.2 0 .3.1.4.3l.6 1.3c.1.2 0 .4-.1.5l-.4.5c.5 1 1.3 1.8 2.3 2.3l.5-.4c.2-.1.4-.2.5-.1l1.3.6c.2.1.3.2.3.4v.3c0 .3-.2.5-.4.7-.5.3-1.1.4-1.7.2a6.2 6.2 0 0 1-4.5-4.5c-.1-.6 0-1.2.2-1.7ZM13 6.5a3.6 3.6 0 0 1 3.4 3.4M13.2 8.3a1.8 1.8 0 0 1 1.6 1.6"/>',
  ),
};

export const icon = (name, extraClass = '') => {
  const svg = icons[name] || icons.spark;
  return extraClass ? svg.replace('class="icon"', `class="icon ${extraClass}"`) : svg;
};
