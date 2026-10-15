import * as THREE from 'three';
import { createStage, softDot, smoothstep } from '../lib/stage.js';
import { Sparks3D, Mist, createDust } from '../lib/particles.js';
import { buildPart } from './part.js';
import { buildCar, CAR } from './car.js';
import { buildLogo } from './logo.js';
import logoSvg from '../../../../assets/logo.svg?raw';

/**
 * 3D-сцена главной (Three.js). Прогресс скролла p:
 *   0.00–0.05  чистый знак логотипа в анфас по центру;
 *   0.05–0.17  знак покрывается коррозией;
 *   0.17–0.36  лазер проходит по знаку, ржавчина сгорает, летят искры;
 *   0.36–0.46  пролёт камеры под автомобиль на подъёмнике;
 *   0.46–0.76  днище покрывается антикором;
 *   0.76–1.00  камера отъезжает, из искр собирается логотип.
 * Подписи к шагам — в разметке страницы (content/pages.json → home.scene).
 */

// Ключевые кадры камеры: позиция, точка взгляда, угол обзора
const CAM = [
  // деталь по центру кадра; камера лишь слегка следует за фронтом очистки
  // вход на сайт: знак строго по центру, в анфас; затем камера чуть сближается и уходит вбок за лазером
  // знак чуть выше центра кадра (взгляд камеры опущен), под ним остаётся место для текста и кнопок
  { p: 0.0, pos: [0.0, -0.18, 3.7], look: [0.0, -0.18, 0], fov: 34 },
  { p: 0.16, pos: [0.0, -0.04, 3.3], look: [0.0, -0.12, 0], fov: 34 },
  { p: 0.24, pos: [0.0, 0.28, 3.1], look: [0.0, -0.02, 0], fov: 33 },
  { p: 0.35, pos: [0.2, 0.2, 3.1], look: [0.15, -0.02, 0], fov: 33 },
  // от знака к машине — почти по прямой: камера плавно ныряет вперёд и сразу разворачивается к днищу
  { p: 0.41, pos: [1.75, -0.05, -1.2], look: [0.75, 0.5, -3.3], fov: 42 },
  // под машиной — между стойками подъёмника (стойки на z = -5.14 и -7.86)
  { p: 0.47, pos: [1.8, -0.42, -5.75], look: [0.85, 0.95, -6.55], fov: 50 },
  { p: 0.62, pos: [0.55, -0.48, -5.85], look: [-0.25, 0.95, -6.55], fov: 52 },
  { p: 0.76, pos: [-0.75, -0.42, -5.8], look: [-1.5, 0.95, -6.55], fov: 50 },
  // от машины к финальному логотипу — тоже по прямой: выезд из-под машины в сторону и назад к центру
  { p: 0.81, pos: [-0.37, 0.46, -1.2], look: [-0.75, 1.1, -4.8], fov: 45 },
  { p: 0.88, pos: [0.0, 1.35, 3.4], look: [0.0, 1.25, -3.0], fov: 40 },
  // логотип выше центра кадра — снизу место для подписи и кнопок
  { p: 1.0, pos: [0.0, 1.62, 4.9], look: [0.0, 1.55, 0.2], fov: 36 },
];

/**
 * Монотонная кубическая интерполяция (PCHIP): гладкая (скорость непрерывна), без заносов за ключевые значения.
 * Раньше между ключевыми кадрами камера замедлялась до нуля и снова разгонялась — переходы выглядели «рывками».
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
  const stage = createStage(canvas, { quality, fov: 34, envIntensity: 0.32, exposure: 0.98, bloom: { strength: 0.34, radius: 0.5, threshold: 0.93 } });
  const { scene, camera } = stage;
  const high = quality === 'high';
  const dot = softDot();

  scene.fog = new THREE.FogExp2(0x000000, 0.055);

  // ---------- общий свет ----------
  scene.add(new THREE.HemisphereLight(0x1c2430, 0x070302, 0.35));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
  key.position.set(2.5, 3.5, 4);
  const rim = new THREE.DirectionalLight(0xff5a14, 1.4);
  rim.position.set(-3.5, 1.6, -2.5);
  const cool = new THREE.DirectionalLight(0x6f8cff, 0.22);
  cool.position.set(3, -1, -2);
  scene.add(key, rim, cool);

  // ---------- объекты ----------
  const part = buildPart({ quality, dot, svg: logoSvg });
    part.group.scale.setScalar(0.6);
  scene.add(part.group);
  part.group.updateMatrixWorld(true);

  const car = buildCar({ quality });
  scene.add(car.group);

  const logo = buildLogo(logoSvg, { quality, dot, width: 2.6 });
  logo.group.position.set(0, 1.95, 0.2);
  scene.add(logo.group);

  const sparks = new Sparks3D(high ? 1400 : 450, { dot });
  scene.add(sparks.object);
  const mist = new Mist(high ? 500 : 180, { dot });
  scene.add(mist.object);
  const dust = high ? createDust(420, { dot }) : null;
  if (dust) scene.add(dust.object);

  // ---------- камера ----------
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  let time = 0;

  function placeCamera(p, dt) {
    camPos.set(camFns.pos[0](p), camFns.pos[1](p), camFns.pos[2](p));
    camLook.set(camFns.look[0](p), camFns.look[1](p), camFns.look[2](p));
    camera.fov = stage.fitFov(camFns.fov(p));
    // вертикальный экран (телефон): отъезжаем, чтобы деталь и логотип помещались целиком
    const aspect = stage.size.width / stage.size.height;
    if (aspect < 1.2) {
      const k = Math.min(2.1, Math.pow(1.45 / aspect, 0.7));
      const w = 1 - smoothstep(0.36, 0.42, p) + smoothstep(0.78, 0.88, p);
      va.subVectors(camPos, camLook).multiplyScalar(1 + (k - 1) * w);
      camPos.copy(camLook).add(va);
    }
    // лёгкий параллакс за курсором и «дыхание» камеры
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    camPos.x += pointerSmooth.x * 0.12;
    camPos.y += -pointerSmooth.y * 0.06;
    camPos.y += Math.sin(time * 0.6) * 0.012;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.updateProjectionMatrix();
  }

  // ---------- цикл ----------
  let lastP = 0;
  let ready = false;
  const sparkDir = new THREE.Vector3();
  const upBias = new THREE.Vector3(0, 0.35, 0);

  function update(p, dt) {
    time += dt;
    const speed = Math.abs(p - lastP) / Math.max(dt, 1e-3); // как быстро листают
    lastP = p;

    // 1. лазерная очистка
    const rust = smoothstep(0.05, 0.17, p);
    const beam = smoothstep(0.18, 0.34, p);
    const laserOn = smoothstep(0.17, 0.19, p) * (1 - smoothstep(0.34, 0.37, p));
    // вход — строго анфас с лёгким «дыханием»; по мере очистки знак поворачивается, и виден объём
    const turn = smoothstep(0.06, 0.3, p);
    part.group.rotation.set(-0.1 * turn, -0.3 * turn + Math.sin(time * 0.5) * 0.03 * (1 - turn), 0.03 * turn);
    // когда камера ныряет к машине, очищенный знак плавно «схлопывается» (а не пролетает вплотную к объективу)
    part.group.scale.setScalar(0.6 * (1 - smoothstep(0.355, 0.392, p)) + 0.0001);
    part.group.visible = p < 0.4;
    const contact = part.update(beam, laserOn, time, rust);
    if (contact && laserOn > 0.2) {
      const rate = (high ? 160 : 60) + Math.min(speed * 900, high ? 520 : 160);
      const n = Math.floor(rate * dt + Math.random());
      sparkDir.copy(contact.normal).multiplyScalar(0.9).add(upBias);
      sparks.emit(contact.point, sparkDir, n, { speed: [1.2, 4.6], spread: 0.75, life: [0.3, 0.95] });
    }
    sparks.update(dt);

    // 2. антикор
    const coat = smoothstep(0.46, 0.75, p);
    const sprayOn = smoothstep(0.45, 0.47, p) * (1 - smoothstep(0.75, 0.78, p));
    car.group.visible = p > 0.3;
    const gun = car.update(coat, time, sprayOn);
    if (gun && sprayOn > 0.2) {
      mist.emit(gun, Math.floor((high ? 140 : 60) * dt + Math.random()), { up: 2.4, spread: 0.7 });
    }
    mist.update(dt, CAR.position.y + 0.02);

    // 3. логотип; машина уходит в темноту
    logo.group.visible = p > 0.76; // финальный логотип (десятки тысяч треугольников) рисуем только когда он собирается
    logo.update(smoothstep(0.78, 0.98, p), time, dt);
    scene.fog.density = 0.055 + smoothstep(0.78, 0.95, p) * 0.075;

    if (dust) dust.material.uniforms.uTime.value = time;

    placeCamera(p, dt);
    stage.render(dt);

    if (!ready) {
      ready = true;
      onReady?.();
    }
  }

  function resize() {
    stage.resize();
    const s = (stage.size.height * Math.min(window.devicePixelRatio || 1, 2)) / 900;
    logo.setPointScale(s);
    mist.object.material.uniforms.uScale.value = s;
    if (dust) dust.material.uniforms.uScale.value = s;
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
      logo.setPointer(x, y);
    },
    destroy() {
      stage.dispose();
      dot.dispose();
    },
  };
}
