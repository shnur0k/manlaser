import prices from '../../../content/prices.json';
import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';

/**
 * Калькулятор стоимости. Все цены и коэффициенты — content/prices.json.
 *  антикор:  (сумма зон) × коэф. типа авто × коэф. материала + доп. услуги
 *  очистка:  (детали × цена | площадь × цена за м²) × коэф. загрязнения, не меньше минимального заказа
 * «Записаться с этим расчётом» сохраняет выбор в sessionStorage → страница /zapis/ подставляет его в заявку.
 */
export const CALC_KEY = 'ml-calc';

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const round = (n) => Math.round(n / (prices.roundTo || 1)) * (prices.roundTo || 1);
const byId = (list, id) => list.find((x) => x.id === id);

export default function calculator(container) {
  const root = container.querySelector('[data-calc]');
  if (!root) return null;
  const form = root.querySelector('[data-calc-form]');
  const map = root.querySelector('[data-car-map]');
  const totalEl = root.querySelector('[data-calc-total]');
  const rangeEl = root.querySelector('[data-calc-range]');
  const linesEl = root.querySelector('[data-calc-lines]');
  const submit = root.querySelector('[data-calc-submit]');
  const areaOut = root.querySelector('[data-area-out]');
  const shown = { value: 0 };
  let current = null;

  // предвыбор услуги из адреса: ?service=cleaning|anticor
  const preset = new URLSearchParams(location.search).get('service');
  if (preset && form.querySelector(`input[name="service"][value="${preset}"]`)) {
    form.querySelector(`input[name="service"][value="${preset}"]`).checked = true;
  }

  const val = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value;
  const checkedAll = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

  function compute() {
    const service = val('service');
    if (service === 'anticor') {
      const a = prices.anticor;
      const car = byId(a.cars, val('car')) || a.cars[0];
      const material = byId(a.materials, val('material')) || a.materials[0];
      const zones = checkedAll('zone').map((id) => byId(a.zones, id)).filter(Boolean);
      const extras = checkedAll('extra').map((id) => byId(a.extras, id)).filter(Boolean);
      const k = car.coef * material.coef;
      const lines = zones.map((z) => ({ label: z.label, value: z.price * k }));
      extras.forEach((x) => lines.push({ label: x.label, value: x.price }));
      const total = lines.reduce((s, l) => s + l.value, 0);
      return {
        service,
        serviceLabel: 'Антикоррозийная обработка',
        params: [
          ['Тип авто', car.label],
          ['Материал', material.label],
          ['Зоны', zones.map((z) => z.label.toLowerCase()).join(', ') || 'не выбраны'],
          ...(extras.length ? [['Дополнительно', extras.map((x) => x.label.toLowerCase()).join(', ')]] : []),
        ],
        lines,
        total,
        empty: !zones.length && !extras.length,
      };
    }

    const cl = prices.cleaning;
    const dirt = byId(cl.dirt, val('dirt')) || cl.dirt[0];
    const mode = val('mode') || 'parts';
    let lines = [];
    let detail = '';
    if (mode === 'parts') {
      cl.parts.forEach((pt) => {
        const q = Math.max(0, parseInt(form.querySelector(`input[name="part:${pt.id}"]`)?.value || '0', 10) || 0);
        if (q) lines.push({ label: `${pt.label} × ${q}`, value: pt.price * q * dirt.coef });
      });
      detail = lines.map((l) => l.label).join(', ') || 'не выбраны';
    } else {
      const area = parseFloat(form.querySelector('input[name="area"]').value) || 0;
      lines.push({ label: `Площадь ${String(area).replace('.', ',')} м²`, value: area * cl.area.pricePerM2 * dirt.coef });
      detail = `${String(area).replace('.', ',')} м²`;
    }
    let total = lines.reduce((s, l) => s + l.value, 0);
    if (total > 0 && total < cl.minOrder) {
      lines.push({ label: 'Минимальный заказ', value: cl.minOrder - total });
      total = cl.minOrder;
    }
    return {
      service: 'cleaning',
      serviceLabel: 'Лазерная очистка металла',
      params: [
        [mode === 'parts' ? 'Детали' : 'Площадь', detail],
        ['Что удаляем', dirt.label],
      ],
      lines,
      total,
      empty: total === 0,
    };
  }

  function render() {
    current = compute();
    const total = round(current.total);

    // число «докручивается» до нового значения
    gsap.to(shown, {
      value: total,
      duration: env.reducedMotion ? 0 : 0.9,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => (totalEl.textContent = fmt(shown.value)),
    });
    if (!env.reducedMotion) gsap.fromTo(totalEl, { color: '#ffb27a' }, { color: '#f9f9f9', duration: 0.8, overwrite: 'auto' });

    const r = (prices.rangePercent || 0) / 100;
    rangeEl.textContent = current.empty ? 'Выберите параметры' : r ? `от ${fmt(round(total * (1 - r)))} до ${fmt(round(total * (1 + r)))} ${prices.currency}` : '';

    linesEl.innerHTML = current.lines.length
      ? current.lines.map((l) => `<li><span>${l.label}</span><b>${fmt(round(l.value))}</b></li>`).join('')
      : '<li class="summary__empty">Пока ничего не выбрано</li>';

    submit.classList.toggle('is-disabled', current.empty);
    submit.setAttribute('aria-disabled', String(current.empty));
  }

  // ---------- переключение веток и режимов ----------
  function syncBranches(animate = true) {
    const service = val('service');
    root.querySelectorAll('[data-branch]').forEach((b) => {
      const on = b.dataset.branch === service;
      if (on && b.hidden) {
        b.hidden = false;
        if (animate && !env.reducedMotion) gsap.fromTo(b.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'expo.out' });
      } else if (!on) b.hidden = true;
    });
    const mode = val('mode') || 'parts';
    root.querySelectorAll('[data-mode]').forEach((m) => (m.hidden = m.dataset.mode !== mode));
  }

  // ---------- схема автомобиля ----------
  function syncMap() {
    if (!map) return;
    map.dataset.type = val('car') || 'sedan';
    const zones = new Set(checkedAll('zone'));
    map.querySelectorAll('[data-zone]').forEach((z) => z.classList.toggle('is-selected', zones.has(z.dataset.zone)));
    map.querySelectorAll('[data-zone-label]').forEach((z) => z.classList.toggle('is-selected', zones.has(z.dataset.zoneLabel)));
  }
  const toggleZone = (id) => {
    const input = form.querySelector(`input[name="zone"][value="${id}"]`);
    if (!input) return;
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const onMapClick = (e) => {
    const z = e.target.closest('[data-zone], [data-zone-label]');
    if (z) toggleZone(z.dataset.zone || z.dataset.zoneLabel);
  };
  const onMapOver = (e) => {
    const z = e.target.closest('[data-zone], [data-zone-label]');
    const id = z ? z.dataset.zone || z.dataset.zoneLabel : null;
    map.querySelectorAll('[data-zone], [data-zone-label]').forEach((el) => el.classList.toggle('is-hover', id && (el.dataset.zone || el.dataset.zoneLabel) === id));
  };
  map?.addEventListener('click', onMapClick);
  map?.addEventListener('pointerover', onMapOver);
  map?.addEventListener('pointerleave', () => onMapOver({ target: map }));

  // ---------- степперы и ползунок ----------
  const onClick = (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input');
    input.value = Math.min(99, Math.max(0, (parseInt(input.value, 10) || 0) + Number(btn.dataset.step)));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const onInput = (e) => {
    if (e.target.name === 'area' && areaOut) areaOut.innerHTML = `${String(e.target.value).replace('.', ',')} <small>м²</small>`;
    if (e.target.name === 'area') e.target.style.setProperty('--fill', `${((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100}%`);
    if (e.target.name === 'service' || e.target.name === 'mode') syncBranches();
    syncMap();
    render();
  };
  form.addEventListener('click', onClick);
  form.addEventListener('input', onInput);
  form.addEventListener('change', onInput);
  form.addEventListener('submit', (e) => e.preventDefault());

  // ---------- переход к записи ----------
  const onSubmit = (e) => {
    if (current?.empty) {
      e.preventDefault();
      e.stopPropagation(); // не даём Barba перейти на страницу записи
      gsap.fromTo(root.querySelector('.calc-branch:not([hidden])'), { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    try {
      sessionStorage.setItem(
        CALC_KEY,
        JSON.stringify({
          service: current.service,
          serviceLabel: current.serviceLabel,
          params: current.params,
          total: round(current.total),
          currency: prices.currency,
          demo: prices.demo,
          savedAt: Date.now(),
        }),
      );
    } catch {}
  };
  submit.addEventListener('click', onSubmit);

  const area = form.querySelector('input[name="area"]');
  if (area) area.style.setProperty('--fill', `${((area.value - area.min) / (area.max - area.min)) * 100}%`);
  syncBranches(false);
  syncMap();
  render();

  return () => {
    map?.removeEventListener('click', onMapClick);
    map?.removeEventListener('pointerover', onMapOver);
    form.removeEventListener('click', onClick);
    form.removeEventListener('input', onInput);
    form.removeEventListener('change', onInput);
    submit.removeEventListener('click', onSubmit);
    gsap.killTweensOf(shown);
  };
}
