import { createScrollScene } from '../scenes/scroll-scene.js';

/** Главная: закреплённая 3D-сцена «ржавчина → чистый металл → антикор → логотип». */
export default function home(container) {
  const root = container.querySelector('[data-scene-root="home"]');
  if (!root) return null;
  const scene = createScrollScene(root, {
    name: 'home',
    load3d: () => import('../scenes/home/index.js'),
    length: 4.2,
    mobileLength: 3.4,
  });
  return {
    start: () => scene.start(),
    destroy: () => scene.destroy(),
  };
}
