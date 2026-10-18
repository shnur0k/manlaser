import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Грузовой фургон из примитивов (метры). Нос смотрит в +X, борт к камере — +Z, задние дверцы — на -X.
 * Кузов собран из панелей и открыт сзади: внутри тёмная обшивка, рёбра, светодиодные полосы.
 * Возвращает { group, setDoors(t), interior } — t: 0 закрыты … 1 открыты.
 */

// Размеры (м)
const BOX = { x0: -3.65, x1: 0.95, y0: 1.1, y1: 3.55, w: 2.4 }; // кузов
const WALL = 0.1;
const GROUND_CLEARANCE = 0.52; // радиус колеса

/** Текстура-наклейка на борт кузова: брендовая полоса, логотип и подпись. */
export function makeSideDecal(logoSvg) {
  const W = 2400;
  const H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const draw = (logo) => {
    g.clearRect(0, 0, W, H);
    // нижняя полоса: фирменный градиент
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#87ceeb');
    grad.addColorStop(0.62, '#007bff');
    grad.addColorStop(1, '#e85002');
    g.fillStyle = grad;
    g.fillRect(0, 590, W, 92);
    g.fillStyle = '#e85002';
    g.fillRect(0, 700, W, 14);
    g.fillStyle = '#007bff';
    g.fillRect(0, 730, W * 0.62, 8);
    // логотип и подпись
    if (logo) g.drawImage(logo, 150, 150, 1330, 183);
    g.fillStyle = '#2a3038';
    g.font = '600 76px "Nunito Variable", "Nunito", system-ui, sans-serif';
    g.textBaseline = 'alphabetic';
    g.fillText('Лазерное оборудование CNMLaser', 156, 470);
    g.fillStyle = '#007bff';
    g.font = '800 92px "Unbounded Variable", "Unbounded", system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillText('manlaser.by', W - 150, 330);
    g.textAlign = 'left';
    tex.needsUpdate = true;
  };
  draw(null);

  // логотип рисуем с тёмной надписью (на белом борту белые буквы не видны)
  const svg = logoSvg
    .replace('<svg ', '<svg width="1480" height="204" ')
    .replace(/<path class="logo__letter"/g, '<path class="logo__letter" fill="#0b0f14"');
  const img = new Image();
  img.onload = () => draw(img);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return tex;
}

export function buildTruck({ quality = 'high', logoSvg = '', sign = null } = {}) {
  const high = quality === 'high';
  const group = new THREE.Group();

  const m = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xdfe5ec, roughness: 0.34, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    cab: new THREE.MeshPhysicalMaterial({ color: 0xd9e0e8, roughness: 0.3, metalness: 0.08, clearcoat: 0.9, clearcoatRoughness: 0.08 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.55, metalness: 0.35 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.92, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc4cad2, roughness: 0.35, metalness: 0.45 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1624, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x007bff, roughness: 0.4, metalness: 0.2 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe85002, roughness: 0.4, metalness: 0.2 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xc4160d, roughness: 0.3, emissive: 0x6a0600, emissiveIntensity: 0.7 }),
    head: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0xdde8ff, emissiveIntensity: 0.6 }),
    liner: new THREE.MeshStandardMaterial({ color: 0x151a21, roughness: 0.8, metalness: 0.25 }),
    rib: new THREE.MeshStandardMaterial({ color: 0x262d36, roughness: 0.6, metalness: 0.5 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.7, metalness: 0.2 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.5) }),
    ledBlue: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.7, 2.2) }),
  };
  const add = (geo, mat, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, high ? 3 : 1, r);
  const boxLen = BOX.x1 - BOX.x0;
  const boxH = BOX.y1 - BOX.y0;
  const boxCx = (BOX.x0 + BOX.x1) / 2;
  const boxCy = (BOX.y0 + BOX.y1) / 2;

  // ---------- рама и подвеска ----------
  add(new THREE.BoxGeometry(6.9, 0.2, 0.95), m.dark, -0.1, 0.92, 0);
  add(rbox(0.16, 0.2, 2.3, 0.04), m.dark, -3.78, 0.78, 0); // задний противоподкатный брус
  add(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 20).rotateZ(Math.PI / 2), m.dark, 0.35, 0.78, 0.5); // топливный бак
  add(new THREE.BoxGeometry(0.1, 0.1, 2.0), m.dark, -2.15, 0.62, 0); // задняя ось
  add(new THREE.BoxGeometry(0.1, 0.1, 2.0), m.dark, 2.4, 0.62, 0); // передняя ось

  // ---------- колёса ----------
  const wheelParts = {
    tire: new THREE.CylinderGeometry(GROUND_CLEARANCE, GROUND_CLEARANCE, 0.3, high ? 48 : 28).rotateX(Math.PI / 2),
    rim: new THREE.CylinderGeometry(0.33, 0.33, 0.31, high ? 32 : 18).rotateX(Math.PI / 2),
    hub: new THREE.CylinderGeometry(0.13, 0.13, 0.34, 16).rotateX(Math.PI / 2),
    bolt: new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6).rotateX(Math.PI / 2),
  };
  const wheel = (x, z) => {
    const w = new THREE.Group();
    w.position.set(x, GROUND_CLEARANCE, z);
    add(wheelParts.tire, m.rubber, 0, 0, 0, w);
    add(wheelParts.rim, m.metal, 0, 0, 0, w);
    add(wheelParts.hub, m.dark, 0, 0, 0, w);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(wheelParts.bolt, m.metal, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0, w);
    }
    group.add(w);
  };
  for (const s of [1, -1]) {
    wheel(2.4, s * 1.0);
    wheel(-2.15, s * 0.72);
    wheel(-2.15, s * 1.03);
    // брызговики за задними колёсами
    add(new THREE.BoxGeometry(0.03, 0.42, 0.5), m.rubber, -2.75, 0.62, s * 0.9);
  }

  // ---------- кузов (панели; сзади открыт) ----------
  // Пол и крыша чуть шире, длиннее и выступают за борта (на 1–2 см): так ни одна внешняя грань не лежит
  // в одной плоскости с гранью соседней панели — иначе по краям «мигают» полигоны (z-fighting).
  const lip = 0.02;
  add(rbox(boxLen + lip, WALL + lip, BOX.w + lip), m.dark, boxCx, BOX.y0 + (WALL - lip) / 2, 0); // пол (снизу выступает на 2 см)
  add(rbox(boxLen + lip, WALL + lip, BOX.w + lip), m.paint, boxCx, BOX.y1 - (WALL - lip) / 2, 0); // крыша (сверху выступает на 2 см)
  for (const s of [1, -1]) add(rbox(boxLen, boxH, WALL), m.paint, boxCx, boxCy, s * (BOX.w / 2 - WALL / 2)); // борта
  // передняя стенка — только между бортами и между полом и крышей, без наложения на них
  add(rbox(WALL, boxH - 2 * (WALL - lip), BOX.w - 2 * WALL, 0.01), m.paint, BOX.x1 - WALL / 2, boxCy, 0);

  // наклейки на бортах (брендовая полоса, логотип, подпись)
  const decalTex = makeSideDecal(logoSvg);
  const decalMat = new THREE.MeshStandardMaterial({ map: decalTex, transparent: true, roughness: 0.4, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2 });
  const decalW = 3.9;
  const decalH = decalW / 3;
  for (const s of [1, -1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(decalW, decalH), decalMat);
    d.position.set(-1.05, BOX.y0 + decalH / 2 + 0.14, s * (BOX.w / 2 + 0.004));
    if (s < 0) d.rotation.y = Math.PI;
    d.receiveShadow = true;
    group.add(d);
  }

  // ---------- внутренняя обшивка ----------
  const inner = { x0: BOX.x0, x1: BOX.x1 - WALL, y0: BOX.y0 + WALL + 0.03, y1: BOX.y1 - WALL - 0.03, z: BOX.w / 2 - WALL - 0.03 };
  const innerLen = inner.x1 - inner.x0;
  const innerH = inner.y1 - inner.y0;
  const innerCx = (inner.x0 + inner.x1) / 2;
  const innerCy = (inner.y0 + inner.y1) / 2;
  const liner = (w, h, mat, pos, rot) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    p.position.set(...pos);
    p.rotation.set(...rot);
    p.receiveShadow = true;
    group.add(p);
  };
  liner(innerLen, innerH, m.liner, [innerCx, innerCy, inner.z], [0, Math.PI, 0]); // левая стена (z+), смотрит внутрь
  liner(innerLen, innerH, m.liner, [innerCx, innerCy, -inner.z], [0, 0, 0]);
  liner(innerLen, inner.z * 2, m.liner, [innerCx, inner.y1, 0], [Math.PI / 2, 0, 0]); // потолок
  liner(innerLen, inner.z * 2, m.floor, [innerCx, inner.y0, 0], [-Math.PI / 2, 0, 0]); // пол
  liner(inner.z * 2, innerH, m.liner, [inner.x1 - 0.002, innerCy, 0], [0, -Math.PI / 2, 0]); // передняя стена
  // рёбра на стенах
  const ribGeo = new THREE.BoxGeometry(0.05, innerH, 0.04);
  for (let x = inner.x0 + 0.5; x < inner.x1 - 0.2; x += 0.75) {
    for (const s of [1, -1]) add(ribGeo, m.rib, x, innerCy, s * (inner.z - 0.02));
  }
  // светодиодные полосы на потолке и вдоль пола
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(innerLen - 0.2, 0.02, 0.08), m.led, innerCx, inner.y1 - 0.012, s * 0.55);
    add(new THREE.BoxGeometry(innerLen - 0.3, 0.012, 0.03), m.ledBlue, innerCx, inner.y0 + 0.008, s * (inner.z - 0.08));
  }

  // вывеска на передней стене
  if (sign) {
    sign.position.set(inner.x1 - 0.02, innerCy + 0.1, 0);
    sign.rotation.y = -Math.PI / 2;
    group.add(sign);
  }

  // ---------- кабина ----------
  const cabW = 2.3;
  const cabShape = new THREE.Shape();
  cabShape.moveTo(1.08, 1.1);
  cabShape.lineTo(1.08, 3.05);
  cabShape.lineTo(2.45, 3.05);
  cabShape.lineTo(3.0, 2.22);
  cabShape.lineTo(3.4, 2.06);
  cabShape.lineTo(3.44, 1.1);
  cabShape.lineTo(3.3, 0.98);
  cabShape.lineTo(1.4, 0.98);
  cabShape.lineTo(1.08, 1.1);
  const cabGeo = new THREE.ExtrudeGeometry(cabShape, {
    depth: cabW - 0.12,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: high ? 4 : 2,
    curveSegments: 6,
  });
  cabGeo.translate(0, 0, -(cabW - 0.12) / 2);
  add(cabGeo, m.cab, 0, 0, 0);

  // лобовое стекло по скату
  {
    const a = new THREE.Vector2(2.46, 2.98);
    const b = new THREE.Vector2(2.99, 2.26);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const ang = Math.atan2(dir.y, dir.x);
    const nrm = new THREE.Vector2(-Math.sin(ang), Math.cos(ang)).multiplyScalar(0.1);
    const mid = a.clone().add(b).multiplyScalar(0.5).add(nrm);
    const g = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 1.95), m.glass);
    g.position.set(mid.x, mid.y, 0);
    g.rotation.z = ang;
    group.add(g);
  }
  // боковые стёкла, дверной шов, ручка, полосы
  const sideGlass = new THREE.Shape();
  sideGlass.moveTo(1.3, 2.0);
  sideGlass.lineTo(1.3, 2.9);
  sideGlass.lineTo(2.4, 2.9);
  sideGlass.lineTo(2.9, 2.2);
  sideGlass.lineTo(2.9, 2.0);
  sideGlass.lineTo(1.3, 2.0);
  const sideGlassGeo = new THREE.ShapeGeometry(sideGlass);
  const zFace = cabW / 2 + 0.02; // накладки на боку кабины отстоят от неё минимум на 1 см
  for (const s of [1, -1]) {
    const sg = new THREE.Mesh(sideGlassGeo, m.glass);
    sg.position.z = s * zFace;
    if (s < 0) sg.rotation.y = Math.PI;
    group.add(sg);
    add(new THREE.BoxGeometry(0.02, 1.45, 0.012), m.dark, 1.28, 1.72, s * zFace); // шов двери (задний)
    add(new THREE.BoxGeometry(0.02, 1.45, 0.012), m.dark, 2.95, 1.55, s * zFace); // шов двери (передний)
    add(new THREE.BoxGeometry(0.2, 0.03, 0.04), m.metal, 1.45, 1.78, s * (zFace + 0.014)); // ручка
    add(new THREE.BoxGeometry(2.1, 0.05, 0.012), m.blue, 2.2, 1.28, s * zFace); // полосы на кабине
    add(new THREE.BoxGeometry(2.1, 0.02, 0.012), m.orange, 2.2, 1.2, s * zFace);
    // зеркало
    add(new THREE.BoxGeometry(0.05, 0.05, 0.28), m.dark, 2.55, 2.45, s * 1.28);
    add(rbox(0.1, 0.44, 0.1, 0.03), m.dark, 2.55, 2.4, s * 1.43);
    // фара и поворотник
    add(rbox(0.07, 0.2, 0.36, 0.03), m.head, 3.44, 1.62, s * 0.78);
    add(new THREE.BoxGeometry(0.06, 0.08, 0.16), m.orange, 3.44, 1.36, s * 0.92);
    // задний фонарь
    add(rbox(0.05, 0.55, 0.14, 0.02), m.tail, BOX.x0 - 0.02, 1.85, s * (BOX.w / 2 - 0.08));
  }
  // решётка радиатора и бампер
  add(rbox(0.06, 0.5, 1.3, 0.03), m.dark, 3.45, 1.62, 0);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.02, 0.02, 1.2), m.metal, 3.485, 1.43 + i * 0.1, 0);
  add(rbox(0.3, 0.3, 2.3, 0.07), m.dark, 3.4, 0.9, 0);
  add(new THREE.BoxGeometry(0.02, 0.2, 0.6), m.metal, 3.56, 0.9, 0); // номерной знак
  // кабина: «ступенька» и порог
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.5, 0.06, 0.2), m.dark, 1.8, 0.96, s * 1.16);

  // ---------- задние дверцы ----------
  const doorW = BOX.w / 2;
  const doorThick = 0.08;
  const doorMats = [
    m.dark, // +x (внутренняя сторона)
    m.paint, // -x (наружная)
    m.paint, // +y
    m.paint, // -y
    m.paint, // +z
    m.paint, // -z
  ];
  const doorGeo = new THREE.BoxGeometry(doorThick, boxH, doorW - 0.01);
  const doors = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(BOX.x0 - doorThick / 2 - 0.005, boxCy, s * (BOX.w / 2));
    const mesh = new THREE.Mesh(doorGeo, doorMats);
    mesh.position.z = -s * (doorW / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    // наружная отделка двери: полоса и ручка-запор
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, doorW - 0.1), m.blue);
    stripe.position.set(-doorThick / 2 - 0.004, -boxH / 2 + 0.55, -s * (doorW / 2));
    pivot.add(stripe);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, doorW - 0.1), m.orange);
    stripe2.position.set(-doorThick / 2 - 0.004, -boxH / 2 + 0.43, -s * (doorW / 2));
    pivot.add(stripe2);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 10), m.metal);
    handle.position.set(-doorThick / 2 - 0.04, 0, -s * (doorW - 0.12));
    pivot.add(handle);
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), m.metal);
    for (const dy of [-0.4, 0.4]) {
      const b = bracket.clone();
      b.position.set(-doorThick / 2 - 0.02, dy, -s * (doorW - 0.12));
      pivot.add(b);
    }
    group.add(pivot);
    doors.push({ pivot, side: s });
  }

  /** t: 0 — закрыты, 1 — открыты (~112°). Дверцы идут с небольшой задержкой друг за другом. */
  function setDoors(t) {
    const ease = (v) => v * v * (3 - 2 * v);
    doors.forEach(({ pivot, side }, i) => {
      const k = ease(Math.max(0, Math.min(1, (t - i * 0.12) / 0.88)));
      pivot.rotation.y = side * k * THREE.MathUtils.degToRad(112);
    });
  }
  setDoors(0);

  return {
    group,
    setDoors,
    interior: { x0: inner.x0, x1: inner.x1, y0: inner.y0, y1: inner.y1, z: inner.z, cx: innerCx, cy: innerCy },
  };
}
