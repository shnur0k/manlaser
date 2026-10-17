import { gsap } from '../lib/gsap.js';

/**
 * Искры на canvas: короткие светящиеся штрихи с гравитацией и затуханием.
 * Используется в переходах между страницами и в эффектах «выжигания».
 */
export class Sparks {
  constructor(canvas, { gravity = 1400, drag = 0.985, max = 600 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gravity = gravity;
    this.drag = drag;
    this.max = max;
    this.particles = [];
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  resize() {
    const { canvas } = this;
    const rect = canvas.getBoundingClientRect();
    this.w = rect.width || window.innerWidth;
    this.h = rect.height || window.innerHeight;
    canvas.width = Math.round(this.w * this.dpr);
    canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Выпустить пучок искр из точки. angle/spread — в радианах (по умолчанию во все стороны). */
  emit(x, y, count = 12, { angle = -Math.PI / 2, spread = Math.PI, speed = [220, 900], life = [0.35, 0.9], size = [1, 2.2] } = {}) {
    for (let i = 0; i < count && this.particles.length < this.max; i++) {
      const a = angle + (Math.random() - 0.5) * spread * 2;
      const v = speed[0] + Math.random() * (speed[1] - speed[0]);
      const l = life[0] + Math.random() * (life[1] - life[0]);
      this.particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: l,
        age: 0,
        size: size[0] + Math.random() * (size[1] - size[0]),
      });
    }
    this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    gsap.ticker.add(this.tick);
  }

  stop() {
    this.running = false;
    gsap.ticker.remove(this.tick);
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  tick(_, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    const alive = [];
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.px = p.x;
      p.py = p.y;
      p.vx *= this.drag;
      p.vy = p.vy * this.drag + this.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const k = 1 - p.age / p.life; // 1 → 0
      // цвет остывает: белый → жёлто-оранжевый → красный
      const r = 255;
      const g = Math.round(90 + 150 * k * k);
      const b = Math.round(40 * k * k * k + 10);
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, k * 1.4)})`;
      ctx.lineWidth = p.size * (0.6 + k);
      ctx.beginPath();
      ctx.moveTo(p.px - p.vx * dt * 1.5, p.py - p.vy * dt * 1.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      alive.push(p);
    }
    this.particles = alive;
    ctx.globalCompositeOperation = 'source-over';
    if (!alive.length) this.stop();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.particles = [];
  }
}
