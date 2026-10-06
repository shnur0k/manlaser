import * as THREE from 'three';
import { patchMaterial } from '../lib/patch.js';

/**
 * Автомобиль на подъёмнике в тёмном боксе. Днище покрывается антикором по uCoat 0→1 (спереди назад).
 * Машина условная, собрана из примитивов — её можно заменить видео/кадрами (см. README).
 */
export const CAR = {
  position: new THREE.Vector3(0, 0.95, -6.5), // низ кузова на высоте 0.95 м над нулём сцены
  floorY: -0.9,
  length: 4.5,
  width: 1.76,
};

function bodyShape() {
  // боковой профиль кузова (x — вдоль машины, перед в +x), низ на y = 0.12
  const s = new THREE.Shape();
  const y0 = 0.12;
  s.moveTo(2.26, y0);
  s.lineTo(1.79, y0);
  s.absarc(1.36, y0, 0.43, 0, Math.PI, false);
  s.lineTo(-0.93, y0);
  s.absarc(-1.36, y0, 0.43, 0, Math.PI, false);
  s.lineTo(-2.25, y0);
  s.quadraticCurveTo(-2.34, 0.3, -2.3, 0.52);
  s.lineTo(-2.2, 0.78);
  s.quadraticCurveTo(-1.9, 0.86, -1.42, 0.86);
  s.quadraticCurveTo(-1.05, 1.28, -0.75, 1.34);
  s.lineTo(0.42, 1.36);
  s.quadraticCurveTo(0.7, 1.32, 1.12, 0.9);
  s.quadraticCurveTo(1.8, 0.82, 2.22, 0.72);
  s.quadraticCurveTo(2.36, 0.55, 2.33, 0.38);
  s.closePath();
  return s;
}

function greenhouseShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.32, 0.9);
  s.quadraticCurveTo(-1.0, 1.24, -0.74, 1.29);
  s.lineTo(0.4, 1.31);
  s.quadraticCurveTo(0.66, 1.27, 1.02, 0.92);
  s.closePath();
  return s;
}

export function buildCar({ quality }) {
  const root = new THREE.Group();
  const car = new THREE.Group();
  car.position.copy(CAR.position);
  root.add(car);

  // ---------- материалы ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.85, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x7d8086, roughness: 0.28, metalness: 1 });
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.75, metalness: 0.55 });

  const coatUniforms = {
    uCoat: { value: 0 },
    uTime: { value: 0 },
    uXmin: { value: CAR.position.x - CAR.length / 2 },
    uXmax: { value: CAR.position.x + CAR.length / 2 },
  };
  const coat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.3, envMapIntensity: 0.35 }), {
    key: 'coat',
    octaves: quality === 'high' ? 4 : 3,
    uniforms: coatUniforms,
    varyings: 'varying vec3 vW;',
    vertex: 'vW = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    fragmentHead: 'float c_coat; float c_wet; float c_h; float c_n;',
    color: /* glsl */ `
      float coord = (uXmax - vW.x) / (uXmax - uXmin);
      float n = ml_fbm(vW * 2.6);
      c_n = ml_snoise(vW * 22.0);
      float front = uCoat * 1.18 - 0.08;
      float d = front - coord + n * 0.05 + c_n * 0.012;
      c_coat = smoothstep(0.0, 0.012, d);
      c_wet = smoothstep(0.0, 0.008, d) * (1.0 - smoothstep(0.03, 0.16, d));
      // грязное днище с ржавыми пятнами
      vec3 grime = mix(vec3(0.035, 0.03, 0.026), vec3(0.075, 0.064, 0.052), smoothstep(-0.5, 0.5, n));
      grime = mix(grime, vec3(0.26, 0.095, 0.028), smoothstep(-0.05, 0.5, n + c_n * 0.25) * 0.9);
      // антикор: глубокий чёрный с лёгким тёплым оттенком
      vec3 coatC = vec3(0.012, 0.011, 0.011) + vec3(0.01, 0.006, 0.003) * (c_n * 0.5 + 0.5);
      diffuseColor.rgb = mix(grime, coatC, c_coat);
      c_h = mix(n * 0.8 + c_n * 0.25, c_n * 0.06, c_coat);
    `,
    roughness: /* glsl */ `
      roughnessFactor = mix(0.92, 0.58 + c_n * 0.06, c_coat);
      roughnessFactor = mix(roughnessFactor, 0.12, c_wet);
    `,
    metalness: 'metalnessFactor = mix(0.12, 0.0, c_coat);',
    normal: 'normal = ml_bump(-vViewPosition, normal, c_h, mix(0.03, 0.008, c_coat));',
  });

  const add = (geo, mat, x, y, z, parent = car) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ---------- кузов ----------
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape(), { depth: CAR.width - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: quality === 'high' ? 5 : 2, curveSegments: quality === 'high' ? 24 : 12 });
  bodyGeo.translate(0, 0, -(CAR.width - 0.12) / 2);
  add(bodyGeo, paint, 0, 0, 0);
  const ghGeo = new THREE.ExtrudeGeometry(greenhouseShape(), { depth: CAR.width - 0.26, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
  ghGeo.translate(0, 0, -(CAR.width - 0.26) / 2);
  add(ghGeo, glass, 0, 0.012, 0);

  // ---------- днище ----------
  const W = CAR.width;
  add(new THREE.BoxGeometry(4.15, 0.05, W - 0.22), coat, 0, 0.1, 0); // пол
  [-1, 1].forEach((side) => {
    add(new THREE.BoxGeometry(4.2, 0.12, 0.13), coat, 0, 0.03, side * 0.52); // лонжероны
    add(new THREE.BoxGeometry(2.42, 0.17, 0.14), coat, -0.0, 0.07, side * (W / 2 - 0.08)); // пороги
  });
  [1.85, 0.95, -0.25, -1.8].forEach((x) => add(new THREE.BoxGeometry(0.11, 0.09, W - 0.32), coat, x, 0.04, 0)); // поперечины
  const tunnel = add(new THREE.CylinderGeometry(0.17, 0.17, 2.3, 20, 1, true, 0, Math.PI), coat, 0.45, 0.08, 0);
  tunnel.rotation.z = Math.PI / 2; // ось вдоль машины, выпуклостью вверх
  add(new THREE.BoxGeometry(0.75, 0.2, 0.86, 2, 2, 2), coat, -1.0, -0.02, -0.18); // бак
  add(new THREE.BoxGeometry(0.95, 0.24, 1.15), coat, 1.65, 0.0, 0); // низ моторного отсека
  add(new THREE.BoxGeometry(0.42, 0.1, 0.3), exhaustMat, 1.55, -0.16, 0.1); // поддон

  // подкрылки (половинки цилиндров)
  [1.36, -1.36].forEach((x) =>
    [-1, 1].forEach((side) => {
      const arch = add(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 24, 1, true, -Math.PI / 2, Math.PI), coat, x, 0.12, side * (W / 2 - 0.2));
      arch.rotation.x = -Math.PI / 2; // ось вдоль оси колеса, оболочка над колесом
    }),
  );

  // выхлоп
  const exhaustPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.6, -0.12, 0.12),
    new THREE.Vector3(0.9, -0.08, 0.06),
    new THREE.Vector3(-0.2, -0.1, 0.06),
    new THREE.Vector3(-1.5, -0.1, 0.3),
    new THREE.Vector3(-2.25, -0.04, 0.42),
  ]);
  add(new THREE.TubeGeometry(exhaustPath, 64, 0.033, 10, false), exhaustMat, 0, 0, 0);
  const muffler = add(new THREE.CapsuleGeometry(0.11, 0.42, 6, 14), exhaustMat, -1.75, -0.08, 0.34);
  muffler.rotation.z = Math.PI / 2;
  const cat = add(new THREE.CapsuleGeometry(0.07, 0.26, 6, 12), exhaustMat, 0.95, -0.09, 0.07);
  cat.rotation.z = Math.PI / 2;

  // ---------- колёса и подвеска ----------
  const tireGeo = new THREE.TorusGeometry(0.255, 0.085, quality === 'high' ? 16 : 10, quality === 'high' ? 40 : 24);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.17, 28);
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 14);
  const armGeo = new THREE.BoxGeometry(0.42, 0.035, 0.06);
  [1.36, -1.36].forEach((x) =>
    [-1, 1].forEach((side) => {
      const wheel = new THREE.Group();
      wheel.position.set(x, -0.02, side * (W / 2 - 0.12));
      const tire = new THREE.Mesh(tireGeo, rubber);
      const r = new THREE.Mesh(rimGeo, rim);
      r.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(hubGeo, exhaustMat);
      hub.rotation.x = Math.PI / 2;
      wheel.add(tire, r, hub);
      car.add(wheel);
      const arm = add(armGeo, exhaustMat, x, 0.0, side * (W / 2 - 0.38));
      arm.rotation.y = Math.PI / 2;
    }),
  );

  // ---------- подъёмник ----------
  const liftMat = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.5, metalness: 0.7 });
  const accent = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.7, 0.12), toneMapped: false });
  const lift = new THREE.Group();
  lift.position.set(0.15, 0, CAR.position.z);
  root.add(lift);
  const postH = 4.6;
  [-1, 1].forEach((side) => {
    const z = side * 1.36;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, postH, 0.3), liftMat);
    post.position.set(0, CAR.floorY + postH / 2, z);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, postH * 0.82, 0.04), accent);
    stripe.position.set(0.135, CAR.floorY + postH / 2, z);
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.36), liftMat);
    carriage.position.set(0, CAR.position.y - 0.18, z);
    lift.add(post, stripe, carriage);
    // рычаги к порогам
    [-1, 1].forEach((dir) => {
      const tx = dir * 0.95 - 0.15;
      const tz = side * (W / 2 - 0.1);
      const len = Math.hypot(tx, tz - z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.12), liftMat);
      arm.position.set(tx / 2, CAR.position.y - 0.08, (z + tz) / 2);
      arm.rotation.y = -Math.atan2(tz - z, tx);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 16), rubber);
      pad.position.set(tx, CAR.position.y - 0.035, tz);
      lift.add(arm, pad);
    });
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 2.98), liftMat);
  beam.position.set(0, CAR.floorY + postH - 0.12, 0);
  lift.add(beam);

  // ---------- бокс ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.42, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = CAR.floorY;
  root.add(floor);
  // разметка под подъёмником
  const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.16, 0.03), toneMapped: false });
  [-1, 1].forEach((side) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.05), markMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, CAR.floorY + 0.002, CAR.position.z + side * 1.75);
    root.add(m);
  });
  // световые линии на потолке
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.05, 1.9), toneMapped: false });
  [-1.7, 0, 1.7].forEach((z) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.03, 0.09), stripMat);
    strip.position.set(0, 4.3, CAR.position.z + z);
    root.add(strip);
  });

  // ---------- свет ----------
  const top = new THREE.DirectionalLight(0xdfe6ff, 1.1);
  top.position.set(1, 6, CAR.position.z + 2);
  top.target.position.copy(CAR.position);
  const under1 = new THREE.SpotLight(0xffffff, 8, 7, 0.75, 0.7, 2);
  under1.position.set(0.6, CAR.floorY + 0.2, CAR.position.z + 0.9);
  under1.target.position.set(0.2, CAR.position.y, CAR.position.z);
  const under2 = new THREE.SpotLight(0xff6a1a, 9, 7, 0.8, 0.8, 2);
  under2.position.set(-1.6, CAR.floorY + 0.3, CAR.position.z - 1.2);
  under2.target.position.set(-0.5, CAR.position.y, CAR.position.z);
  root.add(top, top.target, under1, under1.target, under2, under2.target);

  // распылитель антикора
  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.4, metalness: 0.8 }));
  gunBody.position.y = -0.25;
  const gunTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.38, 0.07), toneMapped: false }));
  gun.add(gunBody, gunTip);
  root.add(gun);

  const gunPos = new THREE.Vector3();
  /** coat 0..1 — доля покрытого днища; возвращает позицию сопла распылителя (мир) или null. */
  function update(coatValue, time, active) {
    coatUniforms.uCoat.value = coatValue;
    coatUniforms.uTime.value = time;
    const frontX = CAR.position.x + CAR.length / 2 - (coatValue * 1.18 - 0.08) * CAR.length;
    gun.visible = active > 0.01;
    gunPos.set(frontX + 0.12, CAR.position.y - 0.55 + Math.sin(time * 2.2) * 0.04, CAR.position.z + Math.sin(time * 1.3) * 0.45);
    gun.position.copy(gunPos);
    gun.rotation.z = -0.25;
    return gun.visible ? gunPos : null;
  }

  return { group: root, car, update };
}
