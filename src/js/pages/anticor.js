import { ScrollTrigger } from '../lib/gsap.js';
import { env } from '../core/env.js';
import { Sparks } from '../fx/sparks.js';
import { paintQueue } from '../fx/metal-texture.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Интерактивная схема: зона на силуэте ↔ карточка зоны. Наведение подсвечивает, нажатие выбирает.
 * Тип кузова переключает силуэт (те же четыре, что в калькуляторе).
 */
function initZoneMap(root) {
  const svg = root.querySelector('[data-car-map]');
  const cards = [...root.querySelectorAll('.zone[data-zone]')];
  const typeBtns = [...root.querySelectorAll('[data-car]')];
  if (!svg || !cards.length) return null;

  const svgParts = [...svg.querySelectorAll('[data-zone], [data-zone-label]')];
  const idOf = (el) => el.dataset.zone || el.dataset.zoneLabel;

  function select(id) {
    svgParts.forEach((el) => el.classList.toggle('is-selected', idOf(el) === id));
    cards.forEach((c) => {
      const on = c.dataset.zone === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
  }
  function hover(id) {
    svgParts.forEach((el) => el.classList.toggle('is-hover', Boolean(id) && idOf(el) === id));
  }

  const onSvgClick = (e) => {
    const el = e.target.closest('[data-zone], [data-zone-label]');
    if (el) select(idOf(el));
  };
  const onSvgOver = (e) => {
    const el = e.target.closest('[data-zone], [data-zone-label]');
    hover(el ? idOf(el) : null);
  };
  const onSvgLeave = () => hover(null);
  svg.addEventListener('click', onSvgClick);
  svg.addEventListener('pointerover', onSvgOver);
  svg.addEventListener('pointerleave', onSvgLeave);

  const cardHandlers = cards.map((card) => {
    const id = card.dataset.zone;
    const click = () => select(id);
    const key = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(id);
      }
    };
    const enter = () => hover(id);
    const leave = () => hover(null);
    card.addEventListener('click', click);
    card.addEventListener('keydown', key);
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointerleave', leave);
    card.addEventListener('focus', enter);
    card.addEventListener('blur', leave);
    return () => {
      card.removeEventListener('click', click);
      card.removeEventListener('keydown', key);
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointerleave', leave);
      card.removeEventListener('focus', enter);
      card.removeEventListener('blur', leave);
    };
  });

  const typeHandlers = typeBtns.map((btn) => {
    const click = () => {
      svg.dataset.type = btn.dataset.car;
      typeBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    };
    btn.addEventListener('click', click);
    return () => btn.removeEventListener('click', click);
  });

  select(cards[0].dataset.zone);

  return () => {
    svg.removeEventListener('click', onSvgClick);
    svg.removeEventListener('pointerover', onSvgOver);
    svg.removeEventListener('pointerleave', onSvgLeave);
    cardHandlers.forEach((fn) => fn());
    typeHandlers.forEach((fn) => fn());
  };
}

/**
 * «Разрез» слоёв: закреплённая сцена. Прогресс делится на равные отрезки по числу слоёв:
 * металл → лазер счищает ржавчину → грунт → антикор → защитный слой.
 */
function initLayersScene(root) {
  const slab = root.querySelector('[data-slab]');
  const stack = root.querySelector('.slab__stack');
  const caps = [...root.querySelectorAll('[data-layer-cap]')];
  const layers = [...root.querySelectorAll('.slab__layer')];
  const cleanLayer = root.querySelector('.slab__layer--clean');
  const sparksCanvas = root.querySelector('[data-slab-sparks]');
  const bar = root.querySelector('[data-layers-bar]');
  const readout = root.querySelector('[data-layers-readout]');
  if (!slab || !caps.length) return null;
  const n = caps.length;

  if (env.reducedMotion) {
    root.classList.add('is-static');
    return null;
  }

  const sparks = sparksCanvas ? new Sparks(sparksCanvas, { gravity: 900, max: 240 }) : null;
  let lastClean = 0;

  function apply(p) {
    const seg = p * n; // 0…n
    const idx = Math.min(n - 1, Math.floor(seg));

    // металл и поверхность с ржавчиной появляются в первом отрезке, остальные слои — каждый в своём
    const lp = (k) => (k <= 1 ? clamp01((seg - (k === 1 ? 0.12 : 0)) / 0.88) : clamp01(seg - k));
    for (let k = 0; k < n; k++) stack.style.setProperty(`--l${k}`, lp(k).toFixed(3));
    const clean = clamp01(seg - 1); // 0 — ржавчина, 1 — металл очищен
    stack.style.setProperty('--clean', clean.toFixed(3));
    stack.style.setProperty('--beam', clean > 0.01 && clean < 0.99 ? '1' : '0');

    caps.forEach((c, i) => {
      c.classList.toggle('is-active', i === idx);
      c.classList.toggle('is-done', i < idx);
    });
    layers.forEach((l) => l.classList.toggle('is-active', Number(l.dataset.layer) === idx));
    bar?.style.setProperty('--p', p.toFixed(3));
    if (readout) readout.textContent = String(idx + 1).padStart(2, '0');

    // искры там, где луч касается ржавчины
    const delta = Math.abs(clean - lastClean);
    lastClean = clean;
    if (sparks && cleanLayer && delta > 0.0006 && clean > 0.01 && clean < 0.99) {
      const y = cleanLayer.offsetTop + cleanLayer.offsetHeight * 0.3;
      sparks.emit(clean * stack.clientWidth, y, Math.min(6, 1 + Math.round(delta * 300)), { angle: -Math.PI / 2.4, spread: 1.1, speed: [140, 520], life: [0.3, 0.7] });
    }
  }

  const len = () => window.innerHeight * (env.mobile ? 2.8 : 3.4);
  const st = ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: () => `+=${len()}`,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => apply(self.progress),
  });
  apply(st.progress || 0);

  return () => {
    st.kill(true);
    sparks?.destroy();
  };
}

/** Страница «Антикор»: схема зон, «разрез» слоёв, текстура ржавчины. */
export default function anticor(container) {
  const cleanups = [];
  cleanups.push(paintQueue(container.querySelectorAll('canvas[data-tex]')));

  const zoneRoot = container.querySelector('[data-zone-map]');
  if (zoneRoot) cleanups.push(initZoneMap(zoneRoot));
  const layersRoot = container.querySelector('[data-layers-scene]');
  if (layersRoot) cleanups.push(initLayersScene(layersRoot));

  return () => cleanups.forEach((fn) => fn?.());
}
