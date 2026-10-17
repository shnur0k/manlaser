import { createScrollScene } from '../scenes/scroll-scene.js';

/** Главная: закреплённая 3D-сцена «грузовик в профиль → поворот к дверцам → дверцы открываются → логотип». */
export default function home(container) {
  const root = container.querySelector('[data-scene-root="home"]');
  if (!root) return null;
  const scene = createScrollScene(root, {
    name: 'home',
    load3d: () => import('../scenes/truck/index.js'),
    length: 5,
    mobileLength: 3.4,
    hold: 0.1, // задержка на кадре с логотипом
    darkAt: 0.87, // с этого момента камера внутри кузова — фон тёмный, подписи белые
  });
  // пока сцена светлая (3D, не статичный режим), шапка поверх неё рисуется тёмными буквами (html.home-light, см. equipment.css)
  const html = document.documentElement;
  const sync = () => html.classList.toggle('home-light', root.dataset.mode === '3d' && !root.classList.contains('is-static'));
  const mo = new MutationObserver(sync);
  mo.observe(root, { attributes: true, attributeFilter: ['class', 'data-mode'] });
  sync();
  return {
    start: () => scene.start(),
    destroy: () => {
      mo.disconnect();
      html.classList.remove('home-light');
      scene.destroy();
    },
  };
}
