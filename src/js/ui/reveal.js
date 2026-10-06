import { gsap, ScrollTrigger, SplitText } from '../lib/gsap.js';
import { env } from '../core/env.js';

/**
 * Появление контента при скролле внутри контейнера страницы:
 *  [data-split]          — заголовок появляется по словам (data-split="chars" — по буквам);
 *  [data-reveal]         — плавное появление снизу (data-reveal="scale" — «раскрытие» картинки);
 *  [data-stagger] > *    — дети появляются по очереди;
 *  [data-count]          — счётчик цифр;
 *  [data-parallax]       — лёгкий параллакс;
 *  [data-steps] .step    — подсветка шагов по мере прокрутки.
 * Возвращает { start, destroy }: анимации стартуют, когда страница открылась после перехода.
 */
export function initReveals(root) {
  const splits = [];
  const triggers = [];
  let started = false;
  const reduced = env.reducedMotion || document.documentElement.classList.contains('reveal-off');

  const formatNumber = (n) => Math.round(n).toLocaleString('ru-RU');

  if (reduced) {
    root.querySelectorAll('[data-split]').forEach((el) => (el.style.visibility = 'visible'));
    return { start() {}, destroy() {} };
  }

  // Подготовка (до открытия страницы): режем заголовки, выставляем начальные состояния
  root.querySelectorAll('[data-split]').forEach((el) => {
    const byChars = el.dataset.split === 'chars';
    const split = SplitText.create(el, {
      type: byChars ? 'words,chars' : 'words',
      mask: byChars ? 'words' : 'words',
      wordsClass: 'split-word',
      charsClass: 'split-char',
      aria: 'auto',
    });
    splits.push(split);
    gsap.set(byChars ? split.chars : split.words, { yPercent: 115 });
    gsap.set(el, { visibility: 'visible' });
    el._split = { targets: byChars ? split.chars : split.words, byChars };
  });

  root.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.dataset.reveal === 'scale') gsap.set(el, { opacity: 0, clipPath: 'inset(8% 8% 8% 8% round 28px)', scale: 1.04 });
    else gsap.set(el, { opacity: 0, y: 36 });
  });
  root.querySelectorAll('[data-stagger]').forEach((el) => gsap.set(el.children, { opacity: 0, y: 40 }));

  function start() {
    if (started) return;
    started = true;

    root.querySelectorAll('[data-split]').forEach((el) => {
      const { targets, byChars } = el._split;
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () =>
            gsap.to(targets, {
              yPercent: 0,
              duration: byChars ? 1 : 1.1,
              ease: 'expo.out',
              stagger: byChars ? 0.018 : 0.06,
            }),
        }),
      );
    });

    root.querySelectorAll('[data-reveal]').forEach((el) => {
      const scale = el.dataset.reveal === 'scale';
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () =>
            gsap.to(
              el,
              scale
                ? { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }
                : { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: 0.1 },
            ),
        }),
      );
    });

    root.querySelectorAll('[data-stagger]').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => gsap.to(el.children, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }),
        }),
      );
    });

    root.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      if (!Number.isFinite(target)) return;
      el.textContent = '0';
      const obj = { v: 0 };
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              v: target,
              duration: target > 999 ? 2.2 : 1.6,
              ease: 'power3.out',
              onUpdate: () => (el.textContent = formatNumber(obj.v)),
            }),
        }),
      );
    });

    root.querySelectorAll('[data-parallax]').forEach((el) => {
      const media = el.querySelector('img, .media__ph') || el;
      gsap.set(media, { scale: 1.12 });
      triggers.push(
        gsap.fromTo(media, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
          .scrollTrigger,
      );
    });

    root.querySelectorAll('[data-steps] .step').forEach((step) => {
      triggers.push(ScrollTrigger.create({ trigger: step, start: 'top 65%', end: 'bottom 35%', toggleClass: 'is-active' }));
    });

    ScrollTrigger.refresh();
  }

  function destroy() {
    triggers.forEach((t) => t?.kill());
    splits.forEach((s) => s.revert());
  }

  return { start, destroy };
}
