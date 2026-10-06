import * as THREE from 'three';
import { createStage, softDot, keyframes, smoothstep } from '../lib/stage.js';
import { Sparks3D, Mist, createDust } from '../lib/particles.js';
import { buildPart } from './part.js';
import { buildCar, CAR } from './car.js';
import { buildLogo } from './logo.js';
import logoSvg from '../../../../assets/logo.svg?raw';

/**
 * 3D-сцена главной (Three.js). Прогресс скролла p:
 *   0.00–0.36  ржавая деталь, лазер проходит по ней, ржавчина сгорает, летят искры;
 *   0.36–0.46  пролёт камеры под автомобиль на подъёмнике;
 *   0.46–0.76  днище покрывается антикором;
 *   0.76–1.00  камера отъезжает, из искр собирается логотип.
 * Подписи к шагам — в разметке страницы (content/pages.json → home.scene).
 */

// Ключевые кадры камеры: позиция, точка взгляда, угол обзора
const CAM = [
  // деталь по центру кадра; камера лишь слегка следует за фронтом очистки
  { p: 0.0, pos: [0.0, 0.34, 4.0], look: [0.0, -0.02, 0], fov: 34 },
  { p: 0.08, pos: [-0.45, 0.32, 3.1], look: [-0.35, -0.02, 0], fov: 34 },
  { p: 0.22, pos: [0.05, 0.28, 2.9], look: [0.0, -0.02, 0], fov: 33 },
  { p: 0.35, pos: [0.5, 0.2, 2.9], look: [0.35, -0.02, 0], fov: 33 },
  { p: 0.4, pos: [1.35, 0.55, 0.4], look: [1.0, 0.7, -4.5], fov: 42 },
  // под машиной — между стойками подъёмника (стойки на z = -5.14 и -7.86)
  { p: 0.47, pos: [1.8, -0.42, -5.75], look: [0.85, 0.95, -6.55], fov: 50 },
  { p: 0.62, pos: [0.55, -0.48, -5.85], look: [-0.25, 0.95, -6.55], fov: 52 },
  { p: 0.76, pos: [-0.75, -0.42, -5.8], look: [-1.5, 0.95, -6.55], fov: 50 },
  { p: 0.86, pos: [0.0, 1.35, 3.4], look: [0.0, 1.25, -3.0], fov: 40 },
  // логотип выше центра кадра — снизу место для подписи и кнопок
  { p: 1.0, pos: [0.0, 1.62, 4.9], look: [0.0, 1.55, 0.2], fov: 36 },
];

export async function createScene(canvas, { quality = 'high', onReady } = {}) {
  const stage = createStage(canvas, { quality, fov: 34, envIntensity: 0.32, exposure: 1.05, bloom: { strength: 0.62, radius: 0.45, threshold: 0.9 } });
  const { scene, camera } = stage;
  const high = quality === 'high';
  const dot = softDot();

  scene.fog = new THREE.FogExp2(0x000000, 0.055);

  // ---------- общий свет ----------
  scene.add(new THREE.HemisphereLight(0x1c2430, 0x070302, 0.35));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
  key.position.set(2.5, 3.5, 4);
  const rim = new THREE.DirectionalLight(0xff5a14, 2.6);
  rim.position.set(-3.5, 1.6, -2.5);
  const cool = new THREE.DirectionalLight(0x6f8cff, 0.22);
  cool.position.set(3, -1, -2);
  scene.add(key, rim, cool);

  // ---------- объекты ----------
  const part = buildPart({ quality, dot });
  part.group.rotation.set(-0.1, -0.3, 0.03);
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
    const { a, b, t } = keyframes(CAM, p);
    if (!b) {
      camPos.fromArray(a.pos);
      camLook.fromArray(a.look);
      camera.fov = stage.fitFov(a.fov);
    } else {
      camPos.lerpVectors(va.fromArray(a.pos), vb.fromArray(b.pos), t);
      camLook.lerpVectors(va.fromArray(a.look), vb.fromArray(b.look), t);
      camera.fov = stage.fitFov(THREE.MathUtils.lerp(a.fov, b.fov, t));
    }
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
    const beam = smoothstep(0.06, 0.34, p);
    const laserOn = smoothstep(0.05, 0.075, p) * (1 - smoothstep(0.34, 0.37, p));
    part.group.visible = p < 0.86;
    const contact = part.update(beam, laserOn, time);
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
