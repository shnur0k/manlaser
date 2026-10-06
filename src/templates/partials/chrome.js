import { esc } from '../lib.js';
import { icon } from '../icons.js';
import { messengerLinks } from '../components.js';

/** Плавающие кнопки: запись + мессенджеры. Ссылки и подпись меняются скриптом по разделу сайта. */
export function floating(ctx) {
  const cta = ctx.site.cta[ctx.sectionKey];
  return `<div class="floating" data-floating>
    <div class="floating__chat" data-chat>
      <div class="floating__list" id="floating-list" data-chat-list>${messengerLinks(ctx.contact, { variant: 'icon' })}</div>
      <button class="floating__toggle" type="button" aria-expanded="false" aria-controls="floating-list" aria-label="Написать в мессенджер" data-chat-toggle>
        <span class="floating__toggle-open">${icon('chat')}</span><span class="floating__toggle-close">${icon('close')}</span>
      </button>
    </div>
    <a class="btn btn--primary floating__cta" href="${esc(cta.url)}" data-floating-cta data-magnetic>
      <span class="btn__label" data-floating-label>${esc(cta.label)}</span><span class="btn__icon">${icon('arrow-up-right')}</span>
    </a>
  </div>`;
}

/** Слой перехода между страницами + курсор + тост-уведомления. */
export function overlays() {
  return `<div class="pt" data-pt aria-hidden="true">
    <div class="pt__half pt__half--top"></div>
    <div class="pt__half pt__half--bottom"></div>
    <div class="pt__beam"><span></span></div>
    <canvas class="pt__canvas" data-pt-canvas></canvas>
  </div>
  <div class="cursor" data-cursor-el aria-hidden="true">
    <div class="cursor__ring"><span class="cursor__label" data-cursor-label></span></div>
    <div class="cursor__dot"></div>
  </div>
  <div class="toast" data-toast role="status" aria-live="polite"></div>`;
}
