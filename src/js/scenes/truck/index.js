import * as THREE from 'three';
import { createStage, softDot, smoothstep } from '../lib/stage.js';
import { buildTruck } from './truck.js';
import { buildSign } from './sign.js';
import logoSvg from '../../../../assets/logo.svg?raw';

/**
 * 3D-сцена главной (Three.js). Прогресс скролла p:
 * Подписи: 01 «Привезём по всей Беларуси» (профиль и обход), 02 «Запустим и обучим» (дверцы открываются), 03 «Оборудование, которым мы работаем сами» (внутри кузова).
 *   0.00–0.12  грузовик на белом фоне, строго в профиль;
 *   0.12–0.58  камера плавно обходит фургон и разворачивается к задним дверцам;
 *   0.52–0.72  дверцы открываются, внутри — светящийся логотип;
 *   0.72–1.00  камера подъезжает и входит в кузов: кадр целиком заполняет тёмный интерьер с логотипом.
 * Подписи к шагам — в разметке страницы (content/pages.json → home.scene).
 * Только для компьютера: на телефонах и планшетах вместо сцены показывается постер со знаком.
 */

// Ключевые кадры камеры: позиция, точка взгляда, угол обзора
const CAM = [
  { p: 0.0, pos: [-1.5, 1.9, 17.6], look: [-1.5, 2.2, 0], fov: 28 },
  { p: 0.12, pos: [-1.7, 1.95, 17.0], look: [-1.5, 2.15, 0], fov: 28 },
  { p: 0.3, pos: [-8.0, 2.5, 13.6], look: [-0.9, 2.05, 0], fov: 30 },
  { p: 0.45, pos: [-12.4, 2.6, 8.0], look: [-2.4, 2.05, 0.3], fov: 32 },
  { p: 0.58, pos: [-12.6, 2.1, 1.6], look: [-3.6, 1.88, 0], fov: 33 },
  { p: 0.7, pos: [-10.6, 2.0, 0.0], look: [-3.6, 1.92, 0], fov: 35 },
  { p: 0.82, pos: [-6.8, 2.15, 0.0], look: [-1.5, 2.3, 0], fov: 42 },
  { p: 0.92, pos: [-4.8, 2.1, 0.0], look: [0.9, 2.0, 0], fov: 46 },
  { p: 1.0, pos: [-3.5, 2.0, 0.0], look: [0.9, 1.85, 0], fov: 46 },
];

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
  key.position.set(4, 11, 7);
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
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.35);
  fill.position.set(-7, 4, -4);
  scene.add(fill);

  // земля: невидимая плоскость, на которую падает только тень (фон остаётся чисто белым)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // мягкая контактная тень под машиной
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 3.4),
    new THREE.MeshBasicMaterial({ map: dot, color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(-0.1, 0.01, 0);
  scene.add(blob);

  // ---------- фургон и вывеска внутри ----------
  const sign = buildSign(logoSvg, { quality, markWidth: 1.1, wordWidth: 1.7 });
  const truck = buildTruck({ quality, logoSvg, sign });
  scene.add(truck.group);

  // свет внутри кузова: тёплый-белый сверху и голубой отсвет от вывески
  const { interior } = truck;
  const lamp = new THREE.PointLight(0xdbe8ff, 0, 7, 2);
  lamp.position.set(interior.cx - 0.4, interior.y1 - 0.25, 0);
  scene.add(lamp);
  const glowLight = new THREE.PointLight(0x2a8cff, 0, 6, 2);
  glowLight.position.set(interior.x1 - 0.9, interior.cy + 0.1, 0);
  scene.add(glowLight);
  // ореол за вывеской
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.4),
    new THREE.MeshBasicMaterial({ map: dot, color: new THREE.Color(0.1, 0.45, 1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.position.set(interior.x1 - 0.015, interior.cy + 0.1, 0);
  halo.rotation.y = -Math.PI / 2;
  scene.add(halo);

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
    // лёгкий параллакс за курсором и «дыхание» камеры (внутри кузова параллакс слабее — стены близко)
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    const k = 1 - smoothstep(0.82, 0.95, p) * 0.7;
    camPos.x += pointerSmooth.x * 0.1 * k;
    camPos.y += -pointerSmooth.y * 0.07 * k;
    camPos.y += Math.sin(time * 0.6) * 0.01;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.updateProjectionMatrix();
  }

  // ---------- цикл ----------
  let ready = false;
  function update(p, dt) {
    time += dt;

    const open = smoothstep(0.52, 0.72, p);
    truck.setDoors(open);

    // внутри светлеет по мере открытия дверец
    const lit = smoothstep(0.5, 0.8, p);
    lamp.intensity = lit * 4;
    glowLight.intensity = lit * 6;
    // когда камера в кузове, «солнце» и окружение приглушаем: интерьер светится собственными лампами
    const inside = smoothstep(0.8, 0.93, p);
    key.intensity = 1.35 * (1 - inside * 0.92);
    fill.intensity = 0.35 * (1 - inside);
    hemi.intensity = 0.55 * (1 - inside * 0.7);
    scene.environmentIntensity = 0.45 * (1 - inside * 0.75);
    halo.material.opacity = lit * 0.75;

    // тень под машиной пропадает, когда камера уже в кузове
    blob.material.opacity = 0.28 * (1 - smoothstep(0.85, 0.95, p));

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
