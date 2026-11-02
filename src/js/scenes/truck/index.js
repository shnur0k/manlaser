import * as THREE from 'three';
import { createStage, softDot, smoothstep } from '../lib/stage.js';
import { buildTruck } from './truck.js';
import { buildSign } from './sign.js';
import { buildCargo } from './cargo.js';
import logoSvg from '../../../../assets/logo.svg?raw';

/**
 * 3D-сцена главной (Three.js). Прогресс скролла p:
 *   0.00–0.05  на белом фоне — крупный объёмный знак manlaser (без надписи);
 *   0.05–0.30  слева выезжает фургон, тормозит и останавливается по центру, закрывая логотип (камера отъезжает);
 *              как только знак закрыт, он пропадает — при облёте камерой его уже нет;
 *   0.38–0.72  камера обходит фургон и разворачивается к задним дверцам;
 *   0.64–0.82  дверцы открываются: в кузове станок лазерной резки и упакованные коробки;
 *   0.82–1.00  камера чуть подаётся вперёд и сдвигает кузов вправо — слева остаётся место для финальной подписи.
 * Подписи: 01 «Привезём по всей Беларуси» (фургон приезжает), 02 «Запустим и обучим» (дверцы открываются),
 * 03 «Оборудование, которым мы работаем сами» (финал) — в разметке страницы (content/pages.json → home.scene).
 * Фургон едет слева направо (нос +X), задние дверцы — на −X; в финале камера смотрит в кузов с −X.
 * Только для компьютера: на телефонах и планшетах вместо сцены показывается постер со знаком.
 */

// Ключевые кадры камеры: позиция, точка взгляда, угол обзора
const CAM = [
  { p: 0.0, pos: [-1.35, 2.33, 7.6], look: [-1.35, 2.33, -3.2], fov: 28 },
  { p: 0.05, pos: [-1.35, 2.3, 8.0], look: [-1.35, 2.3, -3.2], fov: 28 },
  { p: 0.3, pos: [-0.7, 1.95, 18.4], look: [-0.7, 1.45, 0], fov: 28 },
  { p: 0.38, pos: [-0.8, 1.95, 18.2], look: [-0.8, 1.45, 0], fov: 28 },
  { p: 0.5, pos: [-8.0, 2.5, 13.6], look: [-1.0, 2.05, 0], fov: 30 },
  { p: 0.6, pos: [-12.4, 2.6, 8.0], look: [-2.4, 2.05, 0.3], fov: 32 },
  { p: 0.7, pos: [-12.6, 2.2, 1.6], look: [-3.6, 1.9, 0], fov: 33 },
  { p: 0.82, pos: [-11.2, 2.5, -0.2], look: [-3.6, 2.0, -0.2], fov: 35 },
  { p: 1.0, pos: [-14.4, 3.6, 0.3], look: [-3.0, 2.1, -1.95], fov: 34 },
];

// Въезд фургона: на каком отрезке прогресса и откуда (м по X)
const DRIVE = { from: 0.05, to: 0.3, x: -17 };
const LOGO_HIDE = 0.3; // знак полностью закрыт фургоном — убираем его
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Монотонная кубическая интерполяция (PCHIP): гладкая (скорость непрерывна), без заносов за ключевые значения.
 */
function pchip(xs, ys) {
  const n = xs.length;
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const m = new Array(n).fill(0);
  if (n === 2) m[0] = m[1] = d[0];
  else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1];
        const w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    const end = (h0, h1, d0, d1) => {
      let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(v) !== Math.sign(d0)) v = 0;
      else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0;
      return v;
    };
    m[0] = end(h[0], h[1], d[0], d[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
const camXs = CAM.map((k) => k.p);
const camFns = {
  pos: [0, 1, 2].map((c) => pchip(camXs, CAM.map((k) => k.pos[c]))),
  look: [0, 1, 2].map((c) => pchip(camXs, CAM.map((k) => k.look[c]))),
  fov: pchip(camXs, CAM.map((k) => k.fov)),
};

export async function createScene(canvas, { quality = 'high', onReady } = {}) {
  // белый фон: тон-мэппинг выключен, иначе белое станет серым; bloom реагирует только на яркое (> 1.15) — белый фон не светится
  const stage = createStage(canvas, {
    quality,
    fov: 28,
    envIntensity: 0.45,
    exposure: 1,
    background: 0xffffff,
    toneMapping: THREE.NoToneMapping,
    bloom: { strength: 0.42, radius: 0.55, threshold: 1.15 },
  });
  const { scene, camera, renderer } = stage;
  const high = quality === 'high';
  const dot = softDot();

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  // ---------- свет: студия на белом ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9d1da, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-4, 11, 7); // свет сверху со стороны задних дверец
  key.castShadow = true;
  key.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.07;
  key.shadow.radius = 4;
  scene.add(key, key.target); // свет едет вместе с фургоном — тень остаётся чёткой (рамка карты теней небольшая)
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.35);
  fill.position.set(-7, 4, -4);
  scene.add(fill);

  // земля: невидимая плоскость, на которую падает только тень (фон остаётся чисто белым)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01; // чуть ниже колёс: плоскость с тенью не должна лежать в одной плоскости с низом шин
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- знак на старте: висит над землёй за кузовом там, где остановится фургон (снизу между колёсами его не видно) ----------
  const logo = buildSign(logoSvg, { quality, markWidth: 3.0, word: false, light: true });
  const logoY = 2.33;
  // знак несимметричный (справа «хвостик»): сдвигаем его так, чтобы по центру экрана (под надписью «Листайте») был средний нижний круг, а не середина рамки
  logo.position.set(-1.35 + 0.19, logoY, -3.2);
  scene.add(logo);

  // ---------- фургон с грузом ----------
  // rig — фургон целиком (кузов, свет внутри, контактная тень); едет вдоль X
  const rig = new THREE.Group();
  scene.add(rig);
  const truck = buildTruck({ quality, logoSvg });
  rig.add(truck.group);
  const { interior } = truck;
  const cargo = buildCargo({ quality, logoSvg, floor: interior.y0, x0: interior.x0, x1: interior.x1, z: interior.z });
  truck.group.add(cargo.group);

  // мягкая контактная тень под машиной
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 3.4),
    new THREE.MeshBasicMaterial({ map: dot, color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(-0.1, 0.004, 0);
  rig.add(blob);

  // свет внутри кузова: над станком, над коробками и у дверец — включается, когда дверцы открываются
  const lamps = [
    { color: 0xe6efff, max: 4, x: interior.cx - 0.6 },
    { color: 0xfff3e2, max: 3, x: interior.x1 - 0.7 },
    { color: 0xffffff, max: 2.5, x: interior.x0 + 0.5 },
  ].map(({ color, max, x }) => {
    const l = new THREE.PointLight(color, 0, 6, 2);
    l.position.set(x, interior.y1 - 0.3, 0);
    l.userData.max = max;
    truck.group.add(l);
    return l;
  });

  // ---------- камера ----------
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  let time = 0;

  function placeCamera(p, dt) {
    camPos.set(camFns.pos[0](p), camFns.pos[1](p), camFns.pos[2](p));
    camLook.set(camFns.look[0](p), camFns.look[1](p), camFns.look[2](p));
    camera.fov = stage.fitFov(camFns.fov(p));
    // лёгкий параллакс за курсором и «дыхание» камеры
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    camPos.x += pointerSmooth.x * 0.1;
    camPos.y += -pointerSmooth.y * 0.07;
    camPos.y += Math.sin(time * 0.6) * 0.01;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.updateProjectionMatrix();
  }

  // ---------- цикл ----------
  let ready = false;
  function update(p, dt) {
    time += dt;

    // въезд: фургон тормозит до остановки, колёса крутятся по пройденному пути
    const drive = easeOutCubic(THREE.MathUtils.clamp((p - DRIVE.from) / (DRIVE.to - DRIVE.from), 0, 1));
    const rx = DRIVE.x * (1 - drive);
    rig.position.x = rx;
    const roll = -Math.abs(rx - DRIVE.x) / 0.52; // пройденный путь / радиус колеса
    truck.wheels.forEach((w) => (w.rotation.z = roll));
    // при торможении нос чуть «клюёт» и возвращается после остановки
    truck.group.rotation.z = -0.008 * smoothstep(0.12, 0.27, p) * (1 - smoothstep(0.29, 0.37, p));
    // при облёте свет плавно переходит на другой борт: на въезде освещён борт к камере, в финале тень уходит вправо за кузов, а не под подпись слева
    key.position.set(-4 + rx, 11, 7 - 14 * smoothstep(0.4, 0.8, p));
    key.target.position.set(rx, 0, 0);

    // знак: лёгкое покачивание; пропадает, как только фургон его закрыл
    logo.visible = p < LOGO_HIDE;
    logo.position.y = logoY + Math.sin(time * 0.8) * 0.015;

    truck.setDoors(smoothstep(0.64, 0.82, p));
    const lit = smoothstep(0.62, 0.84, p);
    lamps.forEach((l) => (l.intensity = lit * l.userData.max));

    placeCamera(p, dt);
    stage.render(dt);

    if (!ready) {
      ready = true;
      onReady?.();
    }
  }

  function resize() {
    stage.resize();
  }
  resize();

  // компиляция шейдеров заранее, чтобы не было рывка при первом кадре
  placeCamera(0, 0.016);
  stage.renderer.compile(scene, camera);
  update(0, 0.016);

  return {
    update,
    resize,
    info: () => stage.info(),
    setPointer(x, y) {
      pointer.set(x, y);
    },
    destroy() {
      stage.dispose();
      dot.dispose();
    },
  };
}
