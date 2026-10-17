import { ScrollTrigger } from '../lib/gsap.js';
import { initReveals } from '../ui/reveal.js';
import { initMagnetic, initTilt, initAccordions, initImages, initTagFilter } from '../ui/interactions.js';
import { initMarquee } from '../ui/marquee.js';
import { initHours } from '../ui/hours.js';

/**
 * Жизненный цикл содержимого страницы (контейнера Barba).
 * Скрипт конкретной страницы лежит в src/js/pages/<namespace>.js и грузится только на ней
 * (так Three.js и тяжёлые сцены не попадают на остальные страницы).
 * Модуль страницы экспортирует default (container) => ({ start?, destroy? }) | cleanupFn.
 */
const pageModules = import.meta.glob('../pages/*.js');
let current = null;

export async function mountPage(container) {
  const cleanups = [];
  const reveals = initReveals(container);
  cleanups.push(reveals.destroy, initMagnetic(container), initTilt(container), initAccordions(container), initImages(container), initTagFilter(container), initMarquee(container), initHours(container));

  let api = null;
  const loader = pageModules[`../pages/${container.dataset.barbaNamespace}.js`];
  if (loader) {
    try {
      const mod = await loader();
      api = (await mod.default?.(container)) || null;
    } catch (err) {
      console.error('[manlaser] Ошибка в скрипте страницы:', err);
    }
  }
  if (typeof api === 'function') cleanups.push(api);
  else if (api?.destroy) cleanups.push(() => api.destroy());

  current = { container, cleanups };
  return {
    start() {
      reveals.start();
      api?.start?.();
    },
  };
}

export function unmountPage() {
  if (!current) return;
  const { container, cleanups } = current;
  cleanups.forEach((fn) => {
    try {
      fn?.();
    } catch (err) {
      console.error(err);
    }
  });
  ScrollTrigger.getAll().forEach((st) => {
    const t = st.trigger;
    if (t && container.contains(t)) st.kill();
  });
  current = null;
}
