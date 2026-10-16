import { gsap, ScrollTrigger } from '../lib/gsap.js';
import { env } from '../core/env.js';
import { Sparks } from '../fx/sparks.js';
import { paintQueue } from '../fx/metal-texture.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * «До/после» под курсором: слой «после» открывается слева от курсора, по границе — луч.
 * На телефонах — перетаскивание пальцем по горизонтали или нажатие (переключает «до» ↔ «после»),
 * с клавиатуры — фокус на карточке.
 */
function initBeforeAfter(el, { initial = 0 } = {}) {
  const state = { v: initial };
  const apply = () => el.style.setProperty('--x', `${state.v.toFixed(2)}%`);
  const move = gsap.quickTo(state, 'v', { duration: env.reducedMotion ? 0 : 0.45, ease: 'power3.out', onUpdate: apply });
  apply();

  const pct = (e) => clamp01((e.clientX - el.getBoundingClientRect().left) / el.offsetWidth) * 100;
  const setOn = (on) => el.classList.toggle('is-on', on);
  let touchDown = null; // { x } пока палец на карточке

  const onEnter = (e) => {
    if (e.pointerType === 'touch') return;
    setOn(true);
    move(pct(e));
  };
  const onMove = (e) => {
    if (e.pointerType === 'touch') {
      if (!touchDown) return;
      touchDown.moved = touchDown.moved || Math.abs(e.clientX - touchDown.x) > 6;
    }
    setOn(true);
    move(pct(e));
  };
  const onLeave = (e) => {
    if (e.pointerType === 'touch') return;
    setOn(false);
    move(initial);
  };
  const onDown = (e) => {
    if (e.pointerType !== 'touch') return;
    touchDown = { x: e.clientX, moved: false };
  };
  const onUp = (e) => {
    if (e.pointerType !== 'touch' || !touchDown) return;
    // короткое касание — переключаем «до» ↔ «после», перетаскивание — оставляем где отпустили
    if (!touchDown.moved) {
      setOn(true);
      move(state.v > 50 ? 0 : 100);
    }
    touchDown = null;
  };
  const onFocus = () => {
    setOn(true);
    move(100);
  };
  const onBlur = () => {
    setOn(false);
    move(initial);
  };

  const events = { pointerenter: onEnter, pointermove: onMove, pointerleave: onLeave, pointerdown: onDown, pointerup: onUp, pointercancel: onUp, focus: onFocus, blur: onBlur };
  for (const [name, fn] of Object.entries(events)) el.addEventListener(name, fn);

  return () => {
    for (const [name, fn] of Object.entries(events)) el.removeEventListener(name, fn);
    gsap.killTweensOf(state);
  };
}

/** Закреплённая сцена: луч лазера идёт по ржавой пластине и оставляет за собой чистый металл. */
function initPlateScene(root) {
  const plate = root.querySelector('[data-plate]');
  const sparksCanvas = root.querySelector('[data-plate-sparks]');
  const caps = [...root.querySelectorAll('[data-plate-cap]')].map((el) => ({ el, from: parseFloat(el.dataset.from), to: parseFloat(el.dataset.to) }));
  const bar = root.querySelector('[data-plate-bar]');
  const readout = root.querySelector('[data-plate-readout]');
  if (!plate) return null;

  // спокойный режим: без закрепления, «после» открывается по наведению
  if (env.reducedMotion) {
    root.classList.add('is-static');
    return initBeforeAfter(plate, { initial: 50 });
  }

  const sparks = sparksCanvas ? new Sparks(sparksCanvas, { gravity: 900, max: 260 }) : null;
  let lastSweep = 0;

  function apply(p) {
    // 0–0.1 — «до», 0.1–0.88 — луч идёт слева направо, дальше — «после»
    const sweep = clamp01((p - 0.1) / 0.78);
    plate.style.setProperty('--x', `${(sweep * 100).toFixed(2)}%`);
    plate.style.setProperty('--beam', sweep > 0.004 && sweep < 0.996 ? '1' : '0');
    plate.style.setProperty('--tag-before', clamp01(1 - sweep * 4).toFixed(2));
    plate.style.setProperty('--tag-after', clamp01((sweep - 0.8) * 5).toFixed(2));
    bar?.style.setProperty('--p', p.toFixed(3));
    if (readout) readout.textContent = `${String(Math.round(sweep * 100)).padStart(3, '0')}`;

    for (const c of caps) {
      const o = Math.min(clamp01((p - c.from) / 0.04 + (c.from <= 0 ? 1 : 0)), clamp01((c.to - p) / 0.04 + (c.to >= 1 ? 1 : 0)));
      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      c.el.style.transform = `translateY(${((1 - o) * (p < (c.from + c.to) / 2 ? 18 : -18)).toFixed(1)}px)`;
    }

    // искры из точки, где луч касается металла: чем быстрее скролл, тем больше
    const delta = Math.abs(sweep - lastSweep);
    lastSweep = sweep;
    if (sparks && delta > 0.0005 && sweep > 0.004 && sweep < 0.996) {
      const w = plate.clientWidth;
      const h = plate.clientHeight;
      const n = Math.min(9, 1 + Math.round(delta * 500));
      for (let i = 0; i < 3; i++) {
        sparks.emit(sweep * w, h * (0.12 + Math.random() * 0.76), Math.ceil(n / 3), { angle: -0.5, spread: 1.3, speed: [160, 640], life: [0.3, 0.75] });
      }
    }
  }

  const len = () => window.innerHeight * (env.mobile ? 2.2 : 2.6);
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

/** Страница «Лазерная очистка»: сцена «до → после», карточки «до/после», текстуры металла. */
export default function cleaning(container) {
  const cleanups = [];

  // сначала сцена (она на виду), потом карточки
  const canvases = [...container.querySelectorAll('canvas[data-tex]')];
  cleanups.push(paintQueue(canvases));

  const plateRoot = container.querySelector('[data-plate-scene]');
  if (plateRoot) cleanups.push(initPlateScene(plateRoot));
  container.querySelectorAll('.object [data-ba]').forEach((card) => cleanups.push(initBeforeAfter(card)));

  return () => cleanups.forEach((fn) => fn?.());
}
