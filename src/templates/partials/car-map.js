/**
 * Силуэты автомобилей для калькулятора с кликабельными зонами обработки.
 * Каждый тип — набор параметров; кузов, арки, пороги, днище и полости строятся из них.
 * Зоны: data-zone="underbody | arches | sills | cavities" (совпадают с content/prices.json).
 */

const GROUND = 248;

const TYPES = {
  // upper — верхний контур кузова от заднего низа к переднему низу
  sedan: {
    x0: 58, x1: 594, yb: 202, wheelR: 37, wr: 152, wf: 492,
    upper: 'L58,168 Q60,150 90,145 L168,139 Q206,93 256,86 L382,84 Q434,88 476,132 L562,142 Q592,148 594,172',
    door: [214, 118, 432, 118],
  },
  crossover: {
    x0: 64, x1: 598, yb: 192, wheelR: 41, wr: 156, wf: 496,
    upper: 'L64,148 Q66,124 96,119 L150,112 Q188,72 244,66 L418,64 Q470,70 502,112 L568,124 Q597,130 598,160',
    door: [218, 100, 440, 100],
  },
  suv: {
    x0: 64, x1: 602, yb: 188, wheelR: 45, wr: 160, wf: 500,
    upper: 'L62,122 Q64,100 88,98 L142,95 L182,58 L470,56 Q494,58 508,94 L574,106 Q601,112 602,144',
    door: [226, 86, 446, 86],
  },
  van: {
    x0: 46, x1: 602, yb: 198, wheelR: 38, wr: 138, wf: 500,
    upper: 'L44,72 Q46,48 72,46 L470,44 Q502,46 522,82 L574,120 Q601,126 602,154',
    door: [196, 72, 448, 72],
  },
};

function geometry(t) {
  const cy = GROUND - t.wheelR;
  const ra = t.wheelR + 9; // радиус арки
  const dy = t.yb - cy;
  const dx = Math.sqrt(Math.max(0, ra * ra - dy * dy));
  const large = t.yb < cy ? 1 : 0;
  // кузов: верх + низ с вырезами арок (от переднего низа к заднему)
  const body = `M${t.x0},${t.yb} ${t.upper} L${t.x1},${t.yb} L${t.wf + dx},${t.yb} A${ra},${ra} 0 ${large} 0 ${t.wf - dx},${t.yb} L${t.wr + dx},${t.yb} A${ra},${ra} 0 ${large} 0 ${t.wr - dx},${t.yb} Z`;
  return { cy, ra, dx, large, body };
}

const arch = (cx, cy, r) => `M${cx + r},${cy} A${r},${r} 0 0 0 ${cx - r},${cy}`;

/** Полная интерактивная схема для одного типа. */
function carGroup(id, t) {
  const g = geometry(t);
  const sillX0 = t.wr + g.ra + 8;
  const sillX1 = t.wf - g.ra - 8;
  const [dx0, dy0, dx1] = t.door;
  const cavTop = dy0 + 12;
  const cavBottom = t.yb - 30;
  return `<g class="car-map__car" data-car-type="${id}">
    <path class="car-map__body" d="${g.body}"/>
    <!-- скрытые полости: внутренности дверей и стоек -->
    <g class="car-map__zone" data-zone="cavities" tabindex="-1">
      <rect x="${dx0}" y="${cavTop}" width="${(dx1 - dx0) / 2 - 6}" height="${cavBottom - cavTop}" rx="10"/>
      <rect x="${dx0 + (dx1 - dx0) / 2 + 6}" y="${cavTop}" width="${(dx1 - dx0) / 2 - 6}" height="${cavBottom - cavTop}" rx="10"/>
    </g>
    <!-- пороги -->
    <g class="car-map__zone" data-zone="sills" tabindex="-1">
      <rect x="${sillX0}" y="${t.yb - 20}" width="${sillX1 - sillX0}" height="17" rx="8"/>
    </g>
    <!-- днище: полоса под кузовом -->
    <g class="car-map__zone" data-zone="underbody" tabindex="-1">
      <rect x="${t.x0 + 26}" y="${t.yb + 2}" width="${t.x1 - t.x0 - 52}" height="13" rx="6"/>
    </g>
    <!-- колёса -->
    ${[t.wr, t.wf]
      .map(
        (x) => `<g class="car-map__wheel"><circle cx="${x}" cy="${g.cy}" r="${t.wheelR}"/><circle cx="${x}" cy="${g.cy}" r="${t.wheelR * 0.55}"/></g>`,
      )
      .join('')}
    <!-- арки -->
    <g class="car-map__zone car-map__zone--stroke" data-zone="arches" tabindex="-1">
      <path d="${arch(t.wr, g.cy, g.ra - 3)}"/>
      <path d="${arch(t.wf, g.cy, g.ra - 3)}"/>
    </g>
    <!-- подписи -->
    <g class="car-map__labels" aria-hidden="true">
      <text x="${(dx0 + dx1) / 2}" y="${(cavTop + cavBottom) / 2 + 5}" data-zone-label="cavities">Скрытые полости</text>
      <text x="${(sillX0 + sillX1) / 2}" y="${t.yb - 28}" data-zone-label="sills">Пороги</text>
      <text x="${t.wf}" y="${g.cy - g.ra - 12}" data-zone-label="arches">Арки</text>
      <text x="${(t.x0 + t.x1) / 2}" y="${GROUND + 26}" data-zone-label="underbody">Днище</text>
    </g>
  </g>`;
}

export function carMap(activeType = 'sedan') {
  return `<svg class="car-map__svg" viewBox="20 20 610 270" role="img" aria-label="Схема автомобиля: нажмите на зону, чтобы добавить её в расчёт" data-car-map data-type="${activeType}">
    <defs>
      <pattern id="car-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="currentColor" fill-opacity="0.06"/>
        <path d="M0 0V8" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
      </pattern>
    </defs>
    <line class="car-map__ground" x1="30" y1="${GROUND}" x2="620" y2="${GROUND}"/>
    ${Object.entries(TYPES).map(([id, t]) => carGroup(id, t)).join('')}
  </svg>`;
}

/** Маленький силуэт для карточки выбора типа авто. */
export function carIcon(id) {
  const t = TYPES[id];
  if (!t) return '';
  const g = geometry(t);
  return `<svg class="car-icon" viewBox="30 30 590 236" aria-hidden="true">
    <path d="${g.body}"/>
    <circle cx="${t.wr}" cy="${g.cy}" r="${t.wheelR}"/><circle cx="${t.wf}" cy="${g.cy}" r="${t.wheelR}"/>
  </svg>`;
}
