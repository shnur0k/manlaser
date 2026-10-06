import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMaterial } from '../lib/patch.js';

// Фирменный градиент знака (из assets/logo.svg); последний цвет чуть светлее чёрного, чтобы «хвост» читался в 3D
const STOPS = [
  [0, '#dec390'],
  [0.05, '#e0b279'],
  [0.25, '#e7772a'],
  [0.34, '#eb610b'],
  [0.69, '#c11718'],
  [0.78, '#891011'],
  [1, '#3a0606'],
];
const MARK_X0 = 994.31;
const MARK_X1 = 1175.73;

function gradientColor(t, out) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (t <= b) {
      const k = (t - a) / (b - a);
      return out.set(ca).lerp(new THREE.Color(cb), k);
    }
  }
  return out.set(STOPS[STOPS.length - 1][1]);
}

/** Шейдерная «проявка» с раскалённой кромкой: uReveal 0 → 1. */
function dissolve(material, key) {
  const uniforms = { uReveal: { value: 0 } };
  return patchMaterial(material, {
    key,
    octaves: 2,
    uniforms,
    varyings: 'varying vec3 vL;',
    vertex: 'vL = position;',
    fragmentHead: 'float d_edge;',
    alpha: /* glsl */ `
      float dn = ml_snoise(vL * 4.5) * 0.5 + 0.5;
      float thr = uReveal * 1.25 - 0.12;
      if (dn > thr) discard;
      d_edge = 1.0 - smoothstep(0.0, 0.07, thr - dn);
    `,
    emissive: 'totalEmissiveRadiance += vec3(1.0, 0.45, 0.1) * d_edge * 5.0 * step(uReveal, 0.999);',
  });
}

export function buildLogo(svgText, { quality, dot, width = 3.6 }) {
  const data = new SVGLoader().parse(svgText);
  const S = width / 740; // ширина viewBox логотипа — 740
  const cx = 1364;
  const cy = 51;
  const depth = 9;
  const opts = {
    depth,
    bevelEnabled: true,
    bevelThickness: 1.6,
    bevelSize: 0.8,
    bevelSegments: quality === 'high' ? 3 : 1,
    curveSegments: quality === 'high' ? 8 : 4,
  };
  const prep = (geo) => {
    geo.translate(-cx, -cy, -depth / 2);
    geo.scale(S, -S, -S); // SVG: ось Y вниз → переворачиваем (и Z, чтобы не вывернуть грани)
    geo.computeVertexNormals();
    return geo;
  };

  const group = new THREE.Group();
  const markGeos = [];
  const letterGeos = [];
  for (const path of data.paths) {
    const cls = path.userData?.node?.getAttribute?.('class') || '';
    const shapes = SVGLoader.createShapes(path);
    if (!shapes.length) continue;
    if (cls.includes('logo__mark')) markGeos.push(prep(new THREE.ExtrudeGeometry(shapes, opts)));
    else if (cls.includes('logo__letter')) letterGeos.push(prep(new THREE.ExtrudeGeometry(shapes, opts)));
  }
  if (!markGeos.length) throw new Error('В logo.svg не найден знак (class="logo__mark")');

  // знак — вершинные цвета по фирменному градиенту
  const markGeo = markGeos.length > 1 ? mergeGeometries(markGeos) : markGeos[0];
  const pos = markGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const svgX = pos.getX(i) / S + cx;
    gradientColor((svgX - MARK_X0) / (MARK_X1 - MARK_X0), c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  markGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const markMat = dissolve(new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x220800 }), 'logo-mark');
  const mark = new THREE.Mesh(markGeo, markMat);
  group.add(mark);

  // буквы — каждая отдельно, чтобы прилетали по очереди
  const letters = letterGeos.map((g, i) => {
    g.computeBoundingBox();
    const center = new THREE.Vector3();
    g.boundingBox.getCenter(center);
    g.translate(-center.x, -center.y, -center.z);
    const mat = dissolve(new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, metalness: 0.25, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }), 'logo-letter');
    const m = new THREE.Mesh(g, mat);
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    pivot.add(m);
    pivot.userData = { home: center.clone(), index: i, mat };
    group.add(pivot);
    return pivot;
  });

  // ---------- частицы, из которых собирается логотип ----------
  const N = quality === 'high' ? 3200 : 1300;
  const sampler = new MeshSurfaceSampler(mark).build();
  const target = new Float32Array(N * 3);
  const start = new Float32Array(N * 3);
  const delay = new Float32Array(N);
  const seed = new Float32Array(N);
  const col = new Float32Array(N * 3);
  const tmp = new THREE.Vector3();
  const letterSamplers = letters.map((p) => ({ s: new MeshSurfaceSampler(p.children[0]).build(), off: p.userData.home }));
  for (let i = 0; i < N; i++) {
    const onMark = i < N * 0.55 || !letterSamplers.length;
    if (onMark) {
      sampler.sample(tmp);
      gradientColor((tmp.x / S + cx - MARK_X0) / (MARK_X1 - MARK_X0), c);
    } else {
      const ls = letterSamplers[i % letterSamplers.length];
      ls.s.sample(tmp);
      tmp.add(ls.off);
      c.setRGB(1, 0.9, 0.8);
    }
    target.set([tmp.x, tmp.y, tmp.z], i * 3);
    // старт — облако искр позади, со стороны машины
    const r = 2 + Math.random() * 5;
    const a = Math.random() * Math.PI * 2;
    start.set([Math.cos(a) * r * 0.9, (Math.random() - 0.4) * 3.2, -1.5 - Math.random() * 7], i * 3);
    delay[i] = Math.random() * 0.4 + (tmp.x / width + 0.5) * 0.12;
    seed[i] = Math.random();
    col.set([c.r * 2.2 + 0.3, c.g * 1.6 + 0.12, c.b * 1.2], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(target, 3));
  pg.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  pg.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    toneMapped: false,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 }, uMap: { value: dot }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aStart; attribute float aDelay; attribute float aSeed;
      uniform float uP; uniform float uTime; uniform float uFade; uniform float uScale;
      varying float vA; varying vec3 vC;
      void main(){
        float t = clamp((uP - aDelay) / 0.5, 0.0, 1.0);
        float e = 1.0 - pow(1.0 - t, 3.0);
        vec3 p = mix(aStart, position, e);
        float w = (1.0 - e);
        p += vec3(sin(aSeed*40.0 + uTime*1.4), cos(aSeed*23.0 + uTime*1.1), sin(aSeed*11.0 + uTime*0.8)) * w * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (3.0 + aSeed * 5.0) * (1.0 + w * 1.5) * uScale / -mv.z;
        vA = smoothstep(0.0, 0.08, uP - aDelay + 0.08) * uFade * (0.55 + 0.45 * e);
        vC = color * (1.0 + w * 0.8);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying float vA; varying vec3 vC;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; if (a < 0.004) discard; gl_FragColor = vec4(vC * a, a); }`,
  });
  const points = new THREE.Points(pg, pMat);
  points.frustumCulled = false;
  group.add(points);

  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();

  /** p — 0..1 прогресс сборки, time — секунды. */
  function update(p, time, dt) {
    const visible = p > 0.0001;
    group.visible = visible;
    if (!visible) return;
    pMat.uniforms.uP.value = p * 1.05;
    pMat.uniforms.uTime.value = time;
    // частицы гаснут, когда проявилось тело
    const solid = Math.max(0, Math.min(1, (p - 0.62) / 0.3));
    pMat.uniforms.uFade.value = 1 - solid * 0.88;
    markMat.userData.uniforms.uReveal.value = solid;

    letters.forEach((l) => {
      const { home, index, mat } = l.userData;
      const lp = Math.max(0, Math.min(1, (p - 0.5 - index * 0.035) / 0.32));
      const e = 1 - Math.pow(1 - lp, 3);
      l.position.set(home.x, home.y - (1 - e) * 0.25, home.z + (1 - e) * 1.4);
      l.rotation.set((1 - e) * 1.4, (1 - e) * (index % 2 ? 0.6 : -0.6), 0);
      mat.userData.uniforms.uReveal.value = e;
    });

    // лёгкий поворот за курсором
    smooth.lerp(pointer, 1 - Math.exp(-dt * 3));
    group.rotation.y = smooth.x * 0.18;
    group.rotation.x = smooth.y * 0.08;
  }

  return {
    group,
    update,
    setPointer: (x, y) => pointer.set(x, y),
    setPointScale: (s) => (pMat.uniforms.uScale.value = s),
  };
}
