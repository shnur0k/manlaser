import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial } from '../lib/patch.js';

/**
 * Автомобиль на подъёмнике в тёмном боксе. Днище покрывается антикором по uCoat 0→1 (спереди назад).
 * Машина условная (компактный кроссовер в духе Geely), собрана процедурно: плавный кузов — «лофт»
 * из скруглённых сечений, днище — набор деталей, склеенных в один меш (один вызов отрисовки).
 * Её можно заменить видео/кадрами (см. README).
 */
export const CAR = {
  position: new THREE.Vector3(0, 0.95, -6.5), // низ кузова на высоте 0.95 м над нулём сцены
  floorY: -0.9,
  length: 4.5,
  width: 1.76,
};

const WHEEL_X = 1.36; // колёса на x = ±1.36
const WHEEL_Y = -0.02;
const ARCH_R = 0.41; // радиус арки

// ---------- вспомогательные функции формы ----------

/** Гладкий профиль y(x) по опорным точкам (x по возрастанию). */
function profile(points) {
  const pts = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(320);
  return (x) => {
    if (x <= pts[0].x) return pts[0].y;
    if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].x <= x) lo = mid;
      else hi = mid;
    }
    const t = (x - pts[lo].x) / (pts[hi].x - pts[lo].x || 1);
    return pts[lo].y + (pts[hi].y - pts[lo].y) * t;
  };
}

const sgnPow = (v, p) => Math.sign(v) * Math.abs(v) ** p;

/**
 * Кузов «лофтом»: вдоль оси x идут сечения-«суперэллипсы» (скруглённый прямоугольник).
 * top/bottom — профили верха и низа, half — полуширина, ends — укорочение ширины к носу и корме
 * (в плане получается скруглённый нос). pick(sin) выбирает материал сегмента по высоте на сечении.
 */
function loft({ x0, x1, steps, ring, top, bottom, half, n = 3.4, crown = 0, endLen = 0.5, pick = () => 0 }) {
  const pos = [];
  const idxA = [];
  const idxB = [];
  // у носа и кормы ширина плавно сходит к нулю (скруглённый нос в плане)
  const taper = (x) => {
    if (endLen <= 0) return 1;
    const d = x >= 0 ? x1 - x : x - x0;
    if (d >= endLen) return 1;
    const u = 1 - Math.max(0, d) / endLen;
    return Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 1 / 2.4);
  };
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(Math.PI * t)); // сгущаем сечения к носу и корме
    const yt = top(x);
    const yb = Math.min(bottom(x), yt - 0.02);
    const cy = (yt + yb) / 2;
    const b = (yt - yb) / 2;
    const a = half(x) * taper(x);
    for (let j = 0; j < ring; j++) {
      const th = (j / ring) * Math.PI * 2 - Math.PI / 2; // с нижней точки, сначала в сторону +z
      const c = Math.cos(th);
      const s = Math.sin(th);
      const z = a * sgnPow(c, 2 / n);
      let y = cy + b * sgnPow(s, 2 / n);
      if (crown && s > 0) y += crown * s * (1 - (z / (a || 1)) ** 2);
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < ring; j++) {
      const j1 = (j + 1) % ring;
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + j1;
      const d = i * ring + j1;
      const sMid = Math.sin(((j + 0.5) / ring) * Math.PI * 2 - Math.PI / 2);
      const target = pick(sMid) === 0 ? idxA : idxB;
      target.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex([...idxA, ...idxB]);
  geo.addGroup(0, idxA.length, 0);
  geo.addGroup(idxA.length, idxB.length, 1);
  geo.computeVertexNormals();
  return geo;
}

/** Копилка деталей: складываем геометрии с матрицами и склеиваем в одну. */
function collector() {
  const list = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const prep = (geo) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  };
  const push = (geo, matrix) => {
    const g = prep(geo);
    g.applyMatrix4(matrix);
    list.push(g);
  };
  return {
    add(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
      m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
      push(geo, m);
    },
    /** Балка между двумя точками. */
    bar(a, b, th = 0.04, tw = 0.05, geo = null) {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(len, 1, 1));
      push(geo || new THREE.BoxGeometry(1, th, tw), m);
    },
    /** Стержень (труба) между двумя точками. */
    rod(a, b, r = 0.02) {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1));
      push(new THREE.CylinderGeometry(r, r, 1, 10), m);
    },
    geometry: (geo) => list.push(prep(geo)),
    build: () => mergeGeometries(list),
  };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Винтовая пружина с осью вдоль y. */
function springGeo(radius, height, turns, wire = 0.011) {
  const pts = [];
  const n = turns * 14;
  for (let k = 0; k <= n; k++) {
    const phi = (k / n) * turns * Math.PI * 2;
    pts.push(V(Math.cos(phi) * radius, (k / n) * height, Math.sin(phi) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 5, false);
}

export function buildCar({ quality }) {
  const high = quality === 'high';
  const root = new THREE.Group();
  const car = new THREE.Group();
  car.position.copy(CAR.position);
  root.add(car);
  const W = CAR.width;

  // ---------- материалы ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.85, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x6d7076, roughness: 0.4, metalness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.7, metalness: 0.6 }); // выхлоп, пружины, диски
  const trim = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.55, metalness: 0.2 }); // решётка, накладки

  const coatUniforms = {
    uCoat: { value: 0 },
    uTime: { value: 0 },
    uXmin: { value: CAR.position.x - CAR.length / 2 },
    uXmax: { value: CAR.position.x + CAR.length / 2 },
  };
  const coat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.3, envMapIntensity: 0.35, side: THREE.DoubleSide }), {
    key: 'coat',
    octaves: high ? 4 : 3,
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

  // ---------- кузов: плавный лофт ----------
  const archBottom = (x) => {
    let y = 0;
    for (const xc of [WHEEL_X, -WHEEL_X]) {
      const dx = Math.abs(x - xc);
      if (dx < 0.385) y = Math.max(y, WHEEL_Y + Math.sqrt(ARCH_R * ARCH_R - dx * dx));
    }
    return y;
  };
  const bodyBase = profile([[-2.34, 0.3], [-2.22, 0.2], [-2.0, 0.12], [2.0, 0.12], [2.2, 0.17], [2.33, 0.29]]);
  const bodyBottom = (x) => Math.max(bodyBase(x), archBottom(x));
  const bodyTop = profile([[-2.34, 0.6], [-2.27, 0.8], [-2.0, 0.9], [-1.5, 0.93], [-0.5, 0.91], [0.6, 0.9], [1.25, 0.88], [1.8, 0.8], [2.15, 0.7], [2.33, 0.54]]);
  const bodyHalf = profile([[-2.4, 0.83], [-2.0, 0.875], [-1.0, 0.88], [1.0, 0.88], [2.0, 0.865], [2.4, 0.82]]);
  const bodyGeo = loft({
    x0: -2.34,
    x1: 2.33,
    steps: high ? 150 : 90,
    ring: high ? 64 : 36,
    top: bodyTop,
    bottom: bodyBottom,
    half: bodyHalf,
    n: 3.6,
    crown: 0.03,
    endLen: 0.62,
    pick: (s) => (s < -0.78 ? 0 : 1), // плоская нижняя часть сечения — днище (антикор), остальное — краска
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, [coat, paint]);
  car.add(bodyMesh);

  // остекление и крыша
  const roofTop = profile([[-1.8, 0.9], [-1.62, 1.08], [-1.3, 1.28], [-0.8, 1.4], [-0.1, 1.43], [0.5, 1.4], [0.9, 1.28], [1.3, 0.9]]);
  const glassGeo = loft({
    x0: -1.8,
    x1: 1.3,
    steps: high ? 90 : 50,
    ring: high ? 40 : 24,
    top: (x) => Math.max(roofTop(x), bodyTop(x) - 0.03),
    bottom: (x) => bodyTop(x) - 0.08,
    half: profile([[-1.9, 0.66], [-1.3, 0.74], [0, 0.76], [0.9, 0.74], [1.4, 0.66]]),
    n: 2.7,
    endLen: 0,
    pick: (s) => (s > 0.82 ? 1 : 0), // самая верхняя полоса — металлическая крыша
  });
  car.add(new THREE.Mesh(glassGeo, [glass, paint]));

  // детали кузова: зеркала, фары, решётка, накладка бампера
  const mirrorGeo = new RoundedBoxGeometry(0.16, 0.09, 0.1, 3, 0.035);
  [-1, 1].forEach((side) => {
    add(mirrorGeo, paint, 0.88, 0.99, side * 0.93).rotation.y = side * 0.2;
    add(new RoundedBoxGeometry(0.1, 0.08, 0.26, 3, 0.035), glass, 2.1, 0.62, side * 0.4).rotation.y = side * 0.5; // фары
    add(new RoundedBoxGeometry(0.1, 0.12, 0.28, 3, 0.04), glass, -2.18, 0.72, side * 0.46).rotation.y = side * 0.3; // фонари
  });
  add(new RoundedBoxGeometry(0.08, 0.14, 0.5, 3, 0.03), trim, 2.28, 0.5, 0); // решётка

  // ---------- днище (одним мешем, покрывается антикором) ----------
  const C = collector();
  // лонжероны с изгибом вверх у задней арки, пороги, поперечины
  [-1, 1].forEach((side) => {
    const z = side * 0.52;
    C.bar(V(2.1, 0.05, z), V(1.0, 0.05, z), 0.1, 0.12);
    C.bar(V(1.0, 0.05, z), V(-1.0, 0.045, z), 0.1, 0.12);
    C.bar(V(-1.0, 0.045, z), V(-1.75, 0.07, z), 0.09, 0.12);
    C.bar(V(-1.75, 0.07, z), V(-2.2, 0.15, z), 0.08, 0.1);
    C.add(new RoundedBoxGeometry(2.42, 0.09, 0.12, 3, 0.04), 0, 0.085, side * (W / 2 - 0.13)); // пороги
    C.add(new THREE.BoxGeometry(2.3, 0.025, 0.05), 0.1, 0.1, side * 0.2); // кромки тоннеля
  });
  [[1.95, 0.9], [0.75, W - 0.34], [-0.3, W - 0.34], [-1.95, 0.9]].forEach(([x, len]) => C.add(new RoundedBoxGeometry(0.11, 0.07, len, 2, 0.025), x, 0.05, 0));
  for (let k = 0; k < 6; k++) C.add(new THREE.BoxGeometry(0.03, 0.02, 0.5), 1.35 - k * 0.55, 0.098, -0.34 + (k % 2) * 0.68); // рёбра жёсткости пола
  // топливный бак с лентами
  C.add(new RoundedBoxGeometry(0.85, 0.2, 0.95, 4, 0.07), -0.85, -0.01, -0.05);
  [-1.1, -0.6].forEach((x) => C.add(new THREE.BoxGeometry(0.05, 0.215, 1.0), x, -0.01, -0.05));
  // тепловые экраны вдоль выхлопа
  C.add(new THREE.BoxGeometry(1.2, 0.012, 0.18), 0.35, 0.095, 0.1);
  C.add(new THREE.BoxGeometry(0.7, 0.012, 0.22), -1.65, 0.1, 0.34);

  // передний подрамник с поддоном и КПП
  const sf = [V(1.25, 0.02, -0.55), V(1.25, 0.02, 0.55), V(1.95, 0.02, 0.55), V(1.95, 0.02, -0.55)];
  sf.forEach((p, i) => C.bar(p, sf[(i + 1) % 4], 0.06, 0.07));
  C.bar(V(1.25, 0.02, -0.55), V(1.95, 0.02, 0.55), 0.04, 0.05); // раскосы
  C.bar(V(1.25, 0.02, 0.55), V(1.95, 0.02, -0.55), 0.04, 0.05);
  C.add(new RoundedBoxGeometry(0.62, 0.16, 0.42, 4, 0.06), 1.62, -0.04, -0.05); // поддон двигателя
  const bell = new THREE.CylinderGeometry(0.13, 0.15, 0.4, 20);
  C.add(bell, 1.5, -0.01, 0.38, Math.PI / 2, 0, 0); // коробка передач
  [-1, 1].forEach((side) => {
    const wz = side * (W / 2 - 0.12);
    // рычаги подвески
    C.bar(V(1.2, -0.02, side * 0.5), V(WHEEL_X - 0.05, -0.03, side * 0.7), 0.04, 0.06);
    C.bar(V(1.85, -0.02, side * 0.5), V(WHEEL_X + 0.03, -0.03, side * 0.7), 0.04, 0.06);
    // полуоси и ступицы
    C.rod(V(1.5, -0.01, side * 0.32), V(WHEEL_X, WHEEL_Y, wz - side * 0.1), 0.022);
    C.add(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 14), WHEEL_X, WHEEL_Y, wz - side * 0.08, Math.PI / 2, 0, 0);
    // стойки и пружины
    C.rod(V(WHEEL_X + 0.02, 0.0, side * 0.62), V(WHEEL_X + 0.02, 0.36, side * 0.62), 0.03);
    C.rod(V(-WHEEL_X, 0.0, side * 0.6), V(-WHEEL_X - 0.03, 0.34, side * 0.6), 0.028);
  });
  // стабилизатор и рулевая рейка
  C.rod(V(1.78, 0.0, -0.62), V(1.78, 0.0, 0.62), 0.016);
  C.rod(V(1.78, 0.0, -0.62), V(1.55, -0.02, -0.7), 0.016);
  C.rod(V(1.78, 0.0, 0.62), V(1.55, -0.02, 0.7), 0.016);
  C.rod(V(1.28, 0.03, -0.55), V(1.28, 0.03, 0.55), 0.028);
  // задняя балка подвески
  C.add(new RoundedBoxGeometry(0.09, 0.11, 1.4, 3, 0.03), -1.38, 0.0, 0);
  [-1, 1].forEach((side) => {
    C.bar(V(-0.98, 0.04, side * 0.58), V(-WHEEL_X, -0.02, side * 0.68), 0.05, 0.07);
    C.bar(V(-WHEEL_X, 0.0, side * 0.7), V(-WHEEL_X, 0.0, side * 0.55), 0.06, 0.06);
  });
  C.add(new THREE.BoxGeometry(0.08, 0.1, 0.4), -1.38, -0.02, 0); // дифференциал-«кожух» (имитация)
  // болты на подрамнике, балках и лонжеронах
  const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6);
  for (let k = 0; k < 26; k++) {
    const t = k / 25;
    C.add(boltGeo, 2.0 - t * 3.9, 0.0, (k % 2 ? 1 : -1) * 0.52);
  }
  sf.forEach((p) => C.add(boltGeo, p.x, 0.0, p.z));
  const coatGeo = C.build();
  car.add(new THREE.Mesh(coatGeo, coat));

  // подкрылки (внутренние кожухи арок над колёсами)
  [WHEEL_X, -WHEEL_X].forEach((x) =>
    [-1, 1].forEach((side) => {
      const arch = add(new THREE.CylinderGeometry(ARCH_R + 0.01, ARCH_R + 0.01, 0.32, 28, 1, true, -Math.PI / 2, Math.PI), coat, x, WHEEL_Y, side * (W / 2 - 0.16));
      arch.rotation.x = -Math.PI / 2; // ось вдоль оси колеса, оболочка над колесом
    }),
  );

  // металл без антикора: выхлоп, пружины, тормозные диски, тормозные трубки
  const M = collector();
  const exhaustPath = new THREE.CatmullRomCurve3([V(1.55, -0.1, 0.12), V(1.0, -0.08, 0.1), V(0.1, -0.1, 0.08), V(-1.2, -0.1, 0.12), V(-1.8, -0.06, 0.3), V(-2.2, 0.0, 0.42)]);
  M.geometry(new THREE.TubeGeometry(exhaustPath, 72, 0.033, 10, false));
  const cat = new THREE.CapsuleGeometry(0.075, 0.28, 6, 12);
  const resonator = new THREE.CapsuleGeometry(0.085, 0.3, 6, 12);
  const muffler = new THREE.CapsuleGeometry(0.115, 0.5, 6, 14);
  M.add(cat, 0.95, -0.09, 0.1, 0, 0, Math.PI / 2);
  M.add(resonator, -0.5, -0.1, 0.1, 0, 0, Math.PI / 2);
  M.add(muffler, -1.78, -0.08, 0.34, 0, 0, Math.PI / 2);
  [0.2, -0.8, -1.5].forEach((x) => M.rod(V(x, -0.1, 0.1), V(x, 0.1, 0.1), 0.007)); // подвесы
  [-1, 1].forEach((side) => {
    M.add(springGeo(0.05, 0.3, 6), WHEEL_X + 0.02, 0.06, side * 0.62);
    M.add(springGeo(0.05, 0.28, 5), -WHEEL_X - 0.03, 0.06, side * 0.6);
    M.rod(V(2.0, 0.065, side * 0.64), V(-2.05, 0.1, side * 0.62), 0.006); // тормозные трубки
  });
  car.add(new THREE.Mesh(M.build(), steel));

  // ---------- колёса ----------
  const tireGeo = new THREE.LatheGeometry(
    [[0.2, -0.085], [0.215, -0.1], [0.27, -0.105], [0.315, -0.095], [0.338, -0.07], [0.342, 0], [0.338, 0.07], [0.315, 0.095], [0.27, 0.105], [0.215, 0.1], [0.2, 0.085]].map(([r, y]) => new THREE.Vector2(r, y)),
    high ? 48 : 28,
  );
  // детали колеса склеиваем по материалам: на колесо остаётся 4 меша вместо 11
  const RIM = collector();
  const TRIM = collector();
  const STEEL = collector();
  RIM.geometry(new THREE.CylinderGeometry(0.205, 0.205, 0.17, 32, 1, true));
  const spokeGeo = new THREE.BoxGeometry(0.17, 0.028, 0.055);
  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2;
    RIM.add(spokeGeo, Math.cos(ang) * 0.1, 0.06, Math.sin(ang) * 0.1, 0, -ang, 0);
  }
  RIM.add(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16), 0, 0.065, 0);
  TRIM.add(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 32), 0, 0.045, 0); // тёмная плоскость диска между спицами
  TRIM.add(new RoundedBoxGeometry(0.1, 0.09, 0.07, 2, 0.02), 0.12, -0.025, 0); // суппорт
  STEEL.add(new THREE.CylinderGeometry(0.17, 0.17, 0.022, 32), 0, -0.02, 0); // тормозной диск
  const rimGeo = RIM.build();
  const trimGeo = TRIM.build();
  const steelGeo = STEEL.build();
  [WHEEL_X, -WHEEL_X].forEach((x) =>
    [-1, 1].forEach((side) => {
      const wheel = new THREE.Group();
      wheel.position.set(x, WHEEL_Y, side * (W / 2 - 0.12));
      wheel.rotation.x = side * (Math.PI / 2); // ось колеса — вдоль z, лицевая сторона наружу
      wheel.scale.setScalar(1.08);
      wheel.add(new THREE.Mesh(tireGeo, rubber), new THREE.Mesh(rimGeo, rim), new THREE.Mesh(trimGeo, trim), new THREE.Mesh(steelGeo, steel));
      car.add(wheel);
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
