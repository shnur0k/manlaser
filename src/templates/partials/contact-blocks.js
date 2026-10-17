import { esc, t, each } from '../lib.js';
import { icon } from '../icons.js';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Режим работы: неделя + живой статус «Сейчас открыто / закрыто» (считается в браузере по минскому времени). */
export function hoursBlock(ctx, extra = '') {
  const h = ctx.site.hours;
  return `<div class="hours ${extra}" data-hours data-open="${esc(h.open)}" data-close="${esc(h.close)}" data-days="${esc(h.days.join(','))}" data-tz="${esc(h.timezone)}">
    <p class="hours__status" data-open-status><i></i><span>${esc(h.text)}</span></p>
    <ul class="hours__week">
      ${each(DAYS, (d, i) => {
        const works = h.days.includes(i + 1);
        return `<li data-day="${i + 1}"><span>${d}</span><b>${works ? `${esc(h.open)}–${esc(h.close)}` : 'выходной'}</b></li>`;
      })}
    </ul>
  </div>`;
}

/** «Как нас найти»: адрес, статус работы и кнопки маршрута (без встроенной карты — она тяжёлая). */
export function findUsBlock(ctx) {
  const { site } = ctx;
  const m = site.map;
  return `<div class="find-us" id="map">
    <span class="find-us__pin" aria-hidden="true">${icon('pin')}</span>
    <div class="find-us__text">
      <span class="find-us__label">Как нас найти</span>
      <p class="find-us__address">${esc(site.address.full)}</p>
      <p class="hours__status hours__status--small" data-open-status-mini><i></i><span>${esc(site.hours.short)}</span></p>
    </div>
    <div class="find-us__links">
      <a class="btn btn--primary btn--sm" href="${esc(m.route)}" target="_blank" rel="noopener" data-barba-prevent><span class="btn__label">Маршрут в Яндекс</span><span class="btn__icon">${icon('arrow-up-right')}</span></a>
      <a class="btn btn--ghost btn--sm" href="${esc(m.google)}" target="_blank" rel="noopener" data-barba-prevent><span class="btn__label">Google Maps</span><span class="btn__icon">${icon('arrow-up-right')}</span></a>
    </div>
  </div>`;
}

/** Реквизиты таблицей (значения — content/site.json → requisitesList). */
export function requisitesBlock(ctx) {
  const rows = ctx.site.requisitesList || [];
  return `<div class="table-wrap requisites"><table class="spec-table">
    <tbody>${each(rows, ([k, v]) => `<tr><th scope="row">${t(k)}</th><td>${t(v)}</td></tr>`)}</tbody>
  </table></div>`;
}
