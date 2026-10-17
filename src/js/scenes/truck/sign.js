import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

/** SVGLoader не понимает градиенты и currentColor — подставляем белый, цвет зададим сами. */
const plainSvg = (t) => t.replace(/fill="url\([^)]*\)"/g, 'fill="#ffffff"').replace(/currentColor/g, '#ffffff');

// Фирменный градиент знака (совпадает с assets/logo.svg): белый → небесный → голубой → оранжевый
const STOPS = [
  [0, '#ffffff'],
  [0.3, '#87ceeb'],
  [0.62, '#007bff'],
  [1, '#e85002'],
];
const MARK_X0 = 994.31;
const MARK_X1 = 1175.73;

function gradientColor(t, out) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (t <= b) return out.set(ca).lerp(new THREE.Color(cb), (t - a) / (b - a));
  }
  return out.set(STOPS[STOPS.length - 1][1]);
}

/**
 * Светящаяся вывеска-логотип для задней стенки кузова: знак (градиент) сверху, надпись под ним.
 * Лицевые грани — «самосветящиеся» (MeshBasic с яркими цветами → bloom), борта — тёмный металл.
 * Вывеска смотрит в сторону +z, поворачивается снаружи.
 */
export function buildSign(svgText, { quality = 'high', markWidth = 1.3, wordWidth = 2.0 } = {}) {
  const data = new SVGLoader().parse(plainSvg(svgText));
  const opts = {
    depth: 14,
    bevelEnabled: true,
    bevelThickness: 1.4,
    bevelSize: 0.9,
    bevelSegments: quality === 'high' ? 2 : 1,
    curveSegments: quality === 'high' ? 6 : 4,
  };
  const markGeos = [];
  const letterGeos = [];
  for (const path of data.paths) {
    const cls = path.userData?.node?.getAttribute?.('class') || '';
    const shapes = SVGLoader.createShapes(path);
    if (!shapes.length) continue;
    if (cls.includes('logo__mark')) markGeos.push(new THREE.ExtrudeGeometry(shapes, opts));
    else if (cls.includes('logo__letter')) letterGeos.push(new THREE.ExtrudeGeometry(shapes, opts));
  }
  if (!markGeos.length) throw new Error('В logo.svg не найден знак (class="logo__mark")');

  const union = (geos) => {
    const box = new THREE.Box3();
    geos.forEach((g) => {
      g.computeBoundingBox();
      box.union(g.boundingBox);
    });
    return box;
  };
  /** Центрируем набор геометрий вокруг общей рамки и масштабируем до нужной ширины (SVG: Y вниз, поэтому flip). */
  const place = (geos, width, box) => {
    const S = width / (box.max.x - box.min.x);
    const cx = (box.min.x + box.max.x) / 2;
    const cy = (box.min.y + box.max.y) / 2;
    geos.forEach((g) => {
      g.translate(-cx, -cy, -opts.depth / 2);
      g.scale(S, -S, -S);
    });
    return S;
  };

  const markBox = union(markGeos);
  const letterBox = union(letterGeos);
  const markS = place(markGeos, markWidth, markBox.clone());
  const wordS = letterGeos.length ? place(letterGeos, wordWidth, letterBox.clone()) : 1;

  // знак: цвета вершин по градиенту (значения > 1 — свечение)
  const glow = 1.35;
  const c = new THREE.Color();
  const markCx = (markBox.min.x + markBox.max.x) / 2;
  for (const g of markGeos) {
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const svgX = pos.getX(i) / markS + markCx;
      gradientColor((svgX - MARK_X0) / (MARK_X1 - MARK_X0), c);
      colors.set([c.r * glow, c.g * glow, c.b * glow], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  const faceMark = new THREE.MeshBasicMaterial({ vertexColors: true });
  const faceWord = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.55) });
  const side = new THREE.MeshStandardMaterial({ color: 0x1b222b, metalness: 0.7, roughness: 0.35 });

  const group = new THREE.Group();
  const markHeight = (markBox.max.y - markBox.min.y) * markS;
  const wordHeight = letterGeos.length ? (letterBox.max.y - letterBox.min.y) * wordS : 0;
  const gap = 0.16;
  const total = markHeight + (wordHeight ? gap + wordHeight : 0);
  const markMeshes = markGeos.map((g) => new THREE.Mesh(g, [faceMark, side]));
  const mark = new THREE.Group();
  mark.add(...markMeshes);
  mark.position.y = total / 2 - markHeight / 2;
  group.add(mark);
  if (letterGeos.length) {
    const word = new THREE.Group();
    word.add(...letterGeos.map((g) => new THREE.Mesh(g, [faceWord, side])));
    word.position.y = -total / 2 + wordHeight / 2;
    group.add(word);
  }
  group.userData.size = { width: Math.max(markWidth, wordWidth), height: total };
  return group;
}
