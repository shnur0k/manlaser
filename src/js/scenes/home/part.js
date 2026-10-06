import * as THREE from 'three';
import { patchMaterial } from '../lib/patch.js';

/**
 * Ржавая стальная деталь (тяга-«косточка» с отверстиями) + лазерная головка.
 * uBeam 0→1 — фронт очистки проходит по детали: ржавчина сгорает, открывается металл.
 */
const R = 0.38; // радиус «головок»
const C = 1.1; // центр головок по X
const WAIST = 0.21; // половина высоты перемычки

function partShape() {
  const s = new THREE.Shape();
  const x0 = C - Math.sqrt(R * R - WAIST * WAIST);
  const a = Math.atan2(WAIST, -(C - x0)); // угол точки касания на правой головке
  s.moveTo(-x0, WAIST);
  s.lineTo(x0, WAIST);
  s.absarc(C, 0, R, a, -a, true);
  s.lineTo(-x0, -WAIST);
  s.absarc(-C, 0, R, a - Math.PI, Math.PI - a, true);
  s.closePath();

  const hole = (x, y, r) => {
    const h = new THREE.Path();
    h.absarc(x, y, r, 0, Math.PI * 2, false);
    s.holes.push(h);
  };
  hole(-C, 0, 0.14);
  hole(C, 0, 0.14);
  hole(-0.32, 0, 0.045);
  hole(0.32, 0, 0.045);
  return s;
}

/** Полувысота профиля детали в точке x (для обрезки линии сканирования). */
export function profileHalfHeight(x) {
  const ax = Math.abs(x);
  if (ax > C + R) return 0;
  const inHead = Math.sqrt(Math.max(0, R * R - (ax - C) * (ax - C)));
  return Math.max(ax < C ? WAIST : 0, inHead);
}

export function buildPart({ quality, dot }) {
  const group = new THREE.Group();

  const geo = new THREE.ExtrudeGeometry(partShape(), {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.02,
    bevelSegments: quality === 'high' ? 4 : 2,
    curveSegments: quality === 'high' ? 56 : 28,
  });
  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;

  const uniforms = {
    uBeam: { value: 0 },
    uActive: { value: 0 },
    uTime: { value: 0 },
    uMin: { value: bb.min.clone() },
    uMax: { value: bb.max.clone() },
  };

  const material = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.2 }), {
    key: 'rust',
    octaves: quality === 'high' ? 4 : 3,
    uniforms,
    varyings: 'varying vec3 vLocal;',
    vertex: 'vLocal = position;',
    fragmentHead: /* glsl */ `
      float g_clean; float g_hot; float g_h; float g_n2; float g_brush; float g_d;
    `,
    color: /* glsl */ `
      vec3 bp = (vLocal - uMin) / (uMax - uMin);
      float coord = bp.x * 0.82 + (1.0 - bp.y) * 0.18;
      float n1 = ml_fbm(vLocal * 3.4);
      g_n2 = ml_snoise(vLocal * 15.0);
      float front = uBeam * 1.16 - 0.08;
      g_d = front - coord + n1 * 0.055;
      g_clean = smoothstep(0.0, 0.018, g_d);
      g_hot = exp(-pow(g_d / 0.016, 2.0)) * uActive;

      // ржавчина: тёмная окалина + рыжие хлопья
      float rm = smoothstep(-0.45, 0.6, n1 + g_n2 * 0.25);
      vec3 rust = mix(vec3(0.075, 0.03, 0.014), vec3(0.36, 0.13, 0.04), rm);
      rust = mix(rust, vec3(0.55, 0.24, 0.07), smoothstep(0.5, 0.95, g_n2) * 0.55);
      rust *= 0.75 + 0.25 * smoothstep(-0.3, 0.3, ml_snoise(vLocal * 40.0));

      // чистая сталь со шлифовкой вдоль детали
      g_brush = ml_snoise(vec3(vLocal.x * 1.5, vLocal.y * 90.0, vLocal.z * 90.0)) * 0.5 + 0.5;
      vec3 steel = vec3(0.56, 0.57, 0.6) * (0.86 + g_brush * 0.22);
      // цвета побежалости сразу за фронтом
      float tint = smoothstep(0.0, 0.02, g_d) * exp(-g_d * 16.0);
      steel = mix(steel, vec3(0.72, 0.5, 0.24), tint * 0.55);
      steel = mix(steel, vec3(0.28, 0.32, 0.62), smoothstep(0.02, 0.05, g_d) * exp(-g_d * 26.0) * 0.4);

      diffuseColor.rgb = mix(rust, steel, g_clean);
      // рельеф: ржавые раковины, на чистом металле — лёгкая «оспинка» после ржавчины
      g_h = mix(n1 * 0.7 + g_n2 * 0.3, (1.0 - smoothstep(-0.25, 0.45, n1)) * 0.18 + g_n2 * 0.04, g_clean);
    `,
    roughness: /* glsl */ `
      roughnessFactor = mix(0.92 - g_n2 * 0.05, 0.2 + g_brush * 0.14, g_clean);
    `,
    metalness: /* glsl */ `
      metalnessFactor = mix(0.12, 1.0, g_clean);
    `,
    normal: /* glsl */ `
      normal = ml_bump(-vViewPosition, normal, g_h, mix(0.05, 0.012, g_clean));
    `,
    emissive: /* glsl */ `
      float flick = 0.7 + 0.3 * ml_snoise(vec3(vLocal.xy * 34.0, uTime * 9.0));
      totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * g_hot * 4.5 * flick;
      totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * pow(g_hot, 5.0) * 5.0;
      // тлеющие точки на ржавчине у самого фронта
      float ember = smoothstep(0.82, 0.98, g_n2) * exp(-pow((g_d + 0.035) / 0.03, 2.0)) * uActive;
      totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * ember * 4.0;
    `,
  });

  const mesh = new THREE.Mesh(geo, material);
  group.add(mesh);

  // крепление-подставка
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.8 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), darkSteel);
  post.position.set(0, -0.55, -0.02);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), darkSteel);
  base.position.set(0, -0.8, 0);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.24), darkSteel);
  jaw.position.set(0, -0.38, 0);
  group.add(post, base, jaw);

  // ---------- лазерная головка ----------
  const rig = new THREE.Group();
  const nozzle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.34, 24), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.35, metalness: 0.9 }));
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.17; // корпус позади сопла (сопло смотрит на деталь по +Z)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 10, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.25), toneMapped: false }));
  nozzle.add(body, ring);
  rig.add(nozzle);

  // веер луча (головка → линия сканирования)
  const fanGeo = new THREE.BufferGeometry();
  fanGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  fanGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array([0, 1, 1]), 1));
  const fanMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uA: { value: 0 } },
    vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; varying float vT; void main(){ gl_FragColor = vec4(vec3(1.0,0.42,0.08) * (0.15 + vT * vT * 0.9) * uA, 1.0); }',
  });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.frustumCulled = false;
  rig.add(fan);

  // яркая линия сканирования на поверхности
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  lineGeo.setIndex([0, 1, 2, 2, 1, 3]);
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const scanLine = new THREE.Mesh(lineGeo, lineMat);
  scanLine.frustumCulled = false;
  rig.add(scanLine);

  // ядро луча до текущей точки
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.2, 0.8), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.frustumCulled = false;
  rig.add(core);

  // свечение в точке контакта
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(1.6, 0.6, 0.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.scale.setScalar(0.12);
  rig.add(glow);

  const light = new THREE.PointLight(0xff6a1a, 0, 3.5, 2);
  rig.add(light);
  group.add(rig);

  // ---------- обновление ----------
  const size = new THREE.Vector3().subVectors(bb.max, bb.min);
  const frontZ = bb.max.z + 0.003;
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const S = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const worldS = new THREE.Vector3();
  const worldN = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  const toLocal = (bx, by, out) => out.set(bb.min.x + bx * size.x, bb.min.y + by * size.y, frontZ);

  /**
   * beam — 0..1 положение фронта, active — 0..1 включён ли лазер.
   * Возвращает точку контакта и нормаль в мировых координатах (для искр) или null.
   */
  function update(beam, active, time) {
    uniforms.uBeam.value = beam;
    uniforms.uActive.value = active;
    uniforms.uTime.value = time;

    const on = active > 0.01;
    rig.visible = on;
    if (!on) {
      light.intensity = 0;
      return null;
    }

    // линия фронта в нормированных координатах: bx*0.82 + (1-by)*0.18 = front
    const front = beam * 1.16 - 0.08;
    const bxTop = front / 0.82; // при by = 1
    const bxBottom = (front - 0.18) / 0.82; // при by = 0
    const midX = bb.min.x + ((bxTop + bxBottom) / 2) * size.x;
    const half = profileHalfHeight(midX);
    const byMin = Math.max(0, (-half - bb.min.y) / size.y);
    const byMax = Math.min(1, (half - bb.min.y) / size.y);
    const lerpX = (by) => bxBottom + (bxTop - bxBottom) * by;
    if (half <= 0.001 || byMax <= byMin) {
      rig.visible = false;
      light.intensity = 0;
      return null;
    }
    toLocal(lerpX(byMin), byMin, A);
    toLocal(lerpX(byMax), byMax, B);

    // быстрое сканирование вверх-вниз, как у ручного лазера
    const s = 0.5 + 0.5 * Math.sin(time * 23.0);
    S.lerpVectors(A, B, s);

    // головка: спереди-сверху от линии
    tip.set((A.x + B.x) / 2 + 0.18, (A.y + B.y) / 2 + 0.42, frontZ + 0.62);
    nozzle.position.copy(tip);
    nozzle.lookAt(group.localToWorld(tmp.lerpVectors(A, B, 0.5)));

    const fp = fanGeo.attributes.position.array;
    fp.set([tip.x, tip.y, tip.z, A.x, A.y, A.z, B.x, B.y, B.z]);
    fanGeo.attributes.position.needsUpdate = true;
    fanMat.uniforms.uA.value = 0.55 * active;

    // полоска шириной w вдоль линии
    const dir = tmp.subVectors(B, A).normalize();
    const w = 0.006;
    const nx = -dir.y * w;
    const ny = dir.x * w;
    lineGeo.attributes.position.array.set([A.x + nx, A.y + ny, frontZ, A.x - nx, A.y - ny, frontZ, B.x + nx, B.y + ny, frontZ, B.x - nx, B.y - ny, frontZ]);
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = active;

    // ядро луча от головки к точке
    const len = tip.distanceTo(S);
    core.position.lerpVectors(tip, S, 0.5);
    core.scale.set(1, len, 1);
    core.quaternion.setFromUnitVectors(up, tmp.subVectors(S, tip).normalize());
    core.material.opacity = active;

    glow.position.copy(S);
    glow.position.z += 0.01;
    const flicker = 0.75 + Math.random() * 0.25;
    glow.material.opacity = active * flicker;
    light.position.set(S.x, S.y, S.z + 0.12);
    light.intensity = 1.6 * active * flicker;

    worldS.copy(S).applyMatrix4(group.matrixWorld);
    normalMatrix.getNormalMatrix(group.matrixWorld);
    worldN.set(0, 0, 1).applyMatrix3(normalMatrix).normalize();
    return { point: worldS, normal: worldN };
  }

  return { group, mesh, update };
}
