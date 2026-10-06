import { gsap } from '../lib/gsap.js';
import { Sparks } from '../fx/sparks.js';
import { paintQueue } from '../fx/metal-texture.js';

/** Рисует источник (canvas или img) в ctx так, чтобы он закрыл всю область (как object-fit: cover). */
function drawCover(ctx, src, w, h) {
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) return;
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k;
  const dh = sh * k;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * «Выжигание»: слой «после» открывается кистью там, где проведёт курсор (или палец).
 * Раскалённый след остаётся, пока курсор на карточке, и остывает после ухода.
 * Нажатие Enter / пробел или короткое касание — показать результат целиком.
 */
function initBurn(el) {
  const beforeEl = el.querySelector('.burn__layer--before')?.firstElementChild;
  const afterEl = el.querySelector('.burn__layer--after')?.firstElementChild;
  const view = el.querySelector('.burn__canvas');
  const sparkCanvas = el.querySelector('.burn__sparks');
  if (!beforeEl || !afterEl || !view) return null;

  const vctx = view.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');
  let w = 0;
  let h = 0;
  let k = 1; // отношение пикселей канваса к CSS-пикселям
  let radius = 40;
  let last = null;
  let active = false;
  let fade = 0; // сколько кадров ещё остывать
  let fadeTimer;
  let running = false;
  let sparks = null;
  let sparkX = 0;
  let sparkY = 0;

  function resize() {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.round(r.width * dpr);
    h = Math.round(r.height * dpr);
    k = w / r.width;
    view.width = mask.width = w;
    view.height = mask.height = h;
    radius = w * 0.15;
    sparks?.resize();
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  function render() {
    if (!w) return;
    vctx.globalCompositeOperation = 'source-over';
    vctx.clearRect(0, 0, w, h);
    drawCover(vctx, afterEl, w, h);
    vctx.globalCompositeOperation = 'destination-in';
    vctx.drawImage(mask, 0, 0);
  }

  function tick() {
    if (fade > 0) {
      mctx.globalCompositeOperation = 'destination-out';
      mctx.fillStyle = 'rgba(0,0,0,0.045)';
      mctx.fillRect(0, 0, w, h);
      fade -= 1;
      if (fade === 0) mctx.clearRect(0, 0, w, h);
    }
    render();
    if (!active && fade === 0) stop();
  }
  function start() {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  }
  function stop() {
    running = false;
    gsap.ticker.remove(tick);
  }

  function brush(x, y) {
    mctx.globalCompositeOperation = 'source-over';
    const g = mctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.96)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.arc(x, y, radius, 0, Math.PI * 2);
    mctx.fill();
  }

  function paintTo(e) {
    const r = el.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const x = cx * k;
    const y = cy * k;
    // факел следует за курсором
    el.style.setProperty('--tx', `${cx.toFixed(1)}px`);
    el.style.setProperty('--ty', `${cy.toFixed(1)}px`);
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      const step = radius * 0.3;
      const n = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= n; i++) brush(last.x + (dx * i) / n, last.y + (dy * i) / n);
    } else {
      brush(x, y);
    }
    last = { x, y };
    // искры — не на каждый пиксель, а через каждые ~14 px пути
    if (sparkCanvas && Math.hypot(cx - sparkX, cy - sparkY) > 14) {
      sparks ||= new Sparks(sparkCanvas, { gravity: 900, max: 140 });
      sparks.emit(cx, cy, 2, { angle: -Math.PI / 2.3, spread: 1.2, speed: [120, 480], life: [0.25, 0.6] });
      sparkX = cx;
      sparkY = cy;
    }
    start();
  }

  function enter() {
    clearTimeout(fadeTimer);
    fade = 0;
    active = true;
    el.classList.add('is-hot');
  }
  function leave() {
    active = false;
    last = null;
    el.classList.remove('is-hot');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      fade = 100;
      start();
    }, 700);
  }

  let touch = null;
  const onEnter = (e) => {
    if (e.pointerType === 'touch') return;
    enter();
    paintTo(e);
  };
  const onMove = (e) => {
    if (e.pointerType === 'touch' && !touch) return;
    if (!active) enter();
    if (touch) touch.moved = touch.moved || Math.abs(e.clientX - touch.x) > 6 || Math.abs(e.clientY - touch.y) > 6;
    paintTo(e);
  };
  const onLeave = (e) => {
    if (e.pointerType === 'touch') return;
    leave();
  };
  const onDown = (e) => {
    if (e.pointerType !== 'touch') return;
    touch = { x: e.clientX, y: e.clientY, moved: false };
    enter();
    paintTo(e);
  };
  const onUp = (e) => {
    if (e.pointerType !== 'touch' || !touch) return;
    // короткое касание — показать результат целиком (и обратно)
    if (!touch.moved) toggle();
    touch = null;
    leave();
  };
  const toggle = () => {
    const on = el.classList.toggle('is-revealed');
    el.setAttribute('aria-pressed', String(on));
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  el.setAttribute('aria-pressed', 'false');
  const events = { pointerenter: onEnter, pointermove: onMove, pointerleave: onLeave, pointerdown: onDown, pointerup: onUp, pointercancel: onUp, keydown: onKey };
  for (const [n, fn] of Object.entries(events)) el.addEventListener(n, fn);
  // картинка может догрузиться позже — перерисуем
  afterEl.addEventListener?.('load', render);
  beforeEl.addEventListener?.('load', render);

  return () => {
    for (const [n, fn] of Object.entries(events)) el.removeEventListener(n, fn);
    afterEl.removeEventListener?.('load', render);
    beforeEl.removeEventListener?.('load', render);
    clearTimeout(fadeTimer);
    ro.disconnect();
    stop();
    sparks?.destroy();
  };
}

/** Отзывы: сначала первые несколько, остальные — по кнопке «Показать ещё». */
function initReviews(container) {
  const grid = container.querySelector('[data-reviews]');
  const wrap = container.querySelector('[data-reviews-more]');
  const btn = container.querySelector('[data-reviews-button]');
  const count = container.querySelector('[data-reviews-count]');
  if (!grid || !wrap || !btn) return null;
  const cards = [...grid.children];
  const step = Number(grid.dataset.visible) || 6;
  let shown = step;
  if (cards.length <= step) return null;

  const apply = () => {
    cards.forEach((c, i) => {
      c.hidden = i >= shown;
    });
    if (count) count.textContent = `Показано ${Math.min(shown, cards.length)} из ${cards.length}`;
    wrap.hidden = false;
    btn.hidden = shown >= cards.length;
  };
  const onClick = () => {
    const prev = shown;
    shown = Math.min(cards.length, shown + step);
    apply();
    gsap.fromTo(cards.slice(prev, shown), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, clearProps: 'transform' });
  };
  btn.addEventListener('click', onClick);
  apply();
  return () => btn.removeEventListener('click', onClick);
}

/** Страница «Работы и отзывы»: галерея с «выжиганием», отзывы с подгрузкой. Фильтр галереи — общий (ui/interactions.js). */
export default function works(container) {
  const cleanups = [];
  cleanups.push(paintQueue(container.querySelectorAll('canvas[data-tex]')));
  container.querySelectorAll('[data-burn]').forEach((el) => cleanups.push(initBurn(el)));
  cleanups.push(initReviews(container));
  return () => cleanups.forEach((fn) => fn?.());
}
