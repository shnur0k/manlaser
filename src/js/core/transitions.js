import { gsap } from '../lib/gsap.js';
import { Sparks } from '../fx/sparks.js';

/**
 * Переходы между страницами. Режим выбирается в config.js → transition.
 * Каждый режим — пара async-функций: cover() закрывает экран, reveal() открывает новую страницу.
 */
export function createTransition(mode = 'laser') {
  const el = document.querySelector('[data-pt]');
  const top = el.querySelector('.pt__half--top');
  const bottom = el.querySelector('.pt__half--bottom');
  const beam = el.querySelector('.pt__beam span');
  const canvas = el.querySelector('[data-pt-canvas]');
  el.dataset.mode = mode;

  let sparks = null;
  const getSparks = () => {
    sparks ||= new Sparks(canvas);
    sparks.resize();
    return sparks;
  };

  // откуда начинается «молекулярный» переход — последний клик
  const origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener('pointerdown', (e) => {
    origin.x = e.clientX;
    origin.y = e.clientY;
  });

  const activate = () => el.classList.add('is-active');
  const deactivate = () => el.classList.remove('is-active');

  const laser = {
    async cover() {
      activate();
      const s = getSparks();
      const W = window.innerWidth;
      const y = window.innerHeight / 2;
      gsap.set(top, { yPercent: -101, clipPath: 'none' });
      gsap.set(bottom, { yPercent: 101 });
      gsap.set(beam, { scaleX: 0, scaleY: 1, opacity: 1 });
      const tl = gsap.timeline();
      tl.to(beam, {
        scaleX: 1,
        duration: 0.55,
        ease: 'power2.inOut',
        onUpdate() {
          const x = gsap.getProperty(beam, 'scaleX') * W;
          s.emit(x, y, 3, { angle: -Math.PI / 2, spread: 1.3, speed: [180, 720], life: [0.3, 0.8] });
        },
      }).to([top, bottom], { yPercent: 0, duration: 0.62, ease: 'expo.inOut' }, 0.28);
      await tl;
    },
    async reveal() {
      const s = getSparks();
      const W = window.innerWidth;
      const y = window.innerHeight / 2;
      const tl = gsap.timeline({ onComplete: deactivate });
      tl.to(beam, { scaleY: 3.5, duration: 0.14, ease: 'power2.out' })
        .add(() => {
          for (let i = 0; i <= 14; i++) s.emit((W / 14) * i, y, 5, { spread: Math.PI, speed: [150, 600], life: [0.3, 0.7] });
        }, 0.08)
        .to(top, { yPercent: -101, duration: 0.95, ease: 'expo.inOut' }, 0.06)
        .to(bottom, { yPercent: 101, duration: 0.95, ease: 'expo.inOut' }, 0.06)
        .to(beam, { opacity: 0, scaleY: 0, duration: 0.5, ease: 'power2.in' }, 0.22);
      await tl;
    },
  };

  const heat = {
    async cover() {
      activate();
      gsap.set(top, { yPercent: 0, clipPath: 'inset(0% 100% 0% 0%)' });
      await gsap.to(top, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.inOut' });
    },
    async reveal() {
      await gsap.to(top, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.85, ease: 'expo.inOut', onComplete: deactivate });
    },
  };

  const fade = {
    async cover() {
      activate();
      gsap.set(top, { yPercent: 0, clipPath: 'none', height: '100%', opacity: 0 });
      await gsap.to(top, { opacity: 1, duration: 0.3, ease: 'power1.out' });
    },
    async reveal() {
      await gsap.to(top, { opacity: 0, duration: 0.4, ease: 'power1.in', onComplete: deactivate });
      gsap.set(top, { clearProps: 'height,opacity' });
    },
  };

  // «Молекулярная» сетка из брендбука: узлы растут и смыкаются, потом «разрушаются»
  const molecules = (() => {
    const ctx2d = canvas.getContext('2d');
    let nodes = [];
    const SX = 60;
    const SY = 32;
    const R = 36;
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const maxD = Math.hypot(Math.max(origin.x, W - origin.x), Math.max(origin.y, H - origin.y));
      nodes = [];
      for (let r = 0, y = 0; y <= H + SY; r++, y += SY) {
        for (let x = r % 2 ? SX / 2 : 0; x <= W + SX; x += SX) {
          nodes.push({ x, y, d: Math.hypot(x - origin.x, y - origin.y) / maxD, rnd: Math.random() });
        }
      }
      return { W, H };
    };
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const clamp = (t) => Math.max(0, Math.min(1, t));
    const draw = (p, breaking, size) => {
      ctx2d.clearRect(0, 0, size.W, size.H);
      for (const n of nodes) {
        const t = breaking ? clamp((p - n.rnd * 0.55) / 0.45) : clamp((p - n.d * 0.55) / 0.45);
        const k = breaking ? 1 - ease(t) : ease(t);
        if (k <= 0) continue;
        // связи с нижними соседями
        if (!breaking || n.rnd > 0.35) {
          ctx2d.strokeStyle = `rgba(232,80,2,${0.55 * k})`;
          ctx2d.lineWidth = 1.2 + 10 * k;
          ctx2d.beginPath();
          ctx2d.moveTo(n.x, n.y);
          ctx2d.lineTo(n.x + SX / 2, n.y + SY);
          ctx2d.moveTo(n.x, n.y);
          ctx2d.lineTo(n.x - SX / 2, n.y + SY);
          ctx2d.stroke();
        }
        ctx2d.fillStyle = '#060606';
        ctx2d.beginPath();
        ctx2d.arc(n.x, n.y, R * k, 0, Math.PI * 2);
        ctx2d.fill();
        if (k < 0.98) {
          ctx2d.strokeStyle = `rgba(241,96,1,${0.9 * (1 - k)})`;
          ctx2d.lineWidth = 1.5;
          ctx2d.stroke();
        }
      }
    };
    return {
      async cover() {
        activate();
        gsap.set([top, bottom], { yPercent: -101 });
        const size = build();
        const st = { p: 0 };
        await gsap.to(st, { p: 1, duration: 0.95, ease: 'power2.inOut', onUpdate: () => draw(st.p, false, size) });
        // гарантированно залить экран
        ctx2d.fillStyle = '#060606';
        ctx2d.fillRect(0, 0, size.W, size.H);
      },
      async reveal() {
        const size = { W: window.innerWidth, H: window.innerHeight };
        const st = { p: 0 };
        await gsap.to(st, { p: 1, duration: 1, ease: 'power2.inOut', onUpdate: () => draw(st.p, true, size) });
        ctx2d.clearRect(0, 0, size.W, size.H);
        deactivate();
      },
    };
  })();

  const modes = { laser, heat, fade, molecules };
  return modes[mode] || laser;
}
