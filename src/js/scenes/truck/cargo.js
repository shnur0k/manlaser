import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Груз в кузове: станок лазерной резки ближе к дверцам и упакованные коробки у передней стенки.
 * Координаты — как у фургона (нос +X, дверцы −X): floor — верх пола кузова, x0/x1 — задний и передний край отсека, z — половина ширины.
 */

/** Наклейка с логотипом (тёмные буквы на светлом фоне), рисуется на canvas. */
function logoLabel(logoSvg, { w = 1024, h = 256, bg = '#ffffff', lines = [], barcode = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const logoH = lines.length ? h * 0.22 : h * 0.52;
  const draw = (logo) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const lw = logoH * 7.25; // пропорции logo.svg (740 × 102)
    const top = lines.length ? h * 0.12 : (h - logoH) / 2;
    if (logo) g.drawImage(logo, (w - lw) / 2, top, lw, logoH);
    g.fillStyle = '#2a3038';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((t, i) => {
      g.font = `700 ${Math.round(h * 0.1)}px "Nunito Variable", "Nunito", system-ui, sans-serif`;
      g.fillText(t, w / 2, h * (0.5 + i * 0.13));
    });
    if (barcode) {
      for (let x = w * 0.2, i = 0; x < w * 0.8; i++) {
        const bw = (i * 7) % 3 === 0 ? 6 : 3;
        g.fillRect(x, h * 0.72, bw, h * 0.17);
        x += bw + ((i * 5) % 4) + 3;
      }
    }
    tex.needsUpdate = true;
  };
  draw(null);
  const svg = logoSvg
    .replace('<svg ', '<svg width="1480" height="204" ')
    .replace(/<path class="logo__letter"/g, '<path class="logo__letter" fill="#0b0f14"')
    .replace('stop-color="#ffffff"', 'stop-color="#6cc0e6"');
  const img = new Image();
  img.onload = () => draw(img);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return tex;
}

export function buildCargo({ quality = 'high', logoSvg = '', floor, x0, x1, z }) {
  const high = quality === 'high';
  const group = new THREE.Group();
  const m = {
    body: new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.42, metalness: 0.1 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2b3139, roughness: 0.5, metalness: 0.5 }),
    slat: new THREE.MeshStandardMaterial({ color: 0x59606a, roughness: 0.45, metalness: 0.7 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe85002, roughness: 0.38, metalness: 0.15 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x007bff, roughness: 0.4, metalness: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc4cad2, roughness: 0.3, metalness: 0.8 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc27a3a, roughness: 0.3, metalness: 0.85 }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.55, 1.05) }),
    beam: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.7, 2.2) }),
    card: new THREE.MeshStandardMaterial({ color: 0xc9a06b, roughness: 0.88 }),
    card2: new THREE.MeshStandardMaterial({ color: 0xbd925c, roughness: 0.88 }),
    tape: new THREE.MeshStandardMaterial({ color: 0x1f6fd6, roughness: 0.32, metalness: 0.05 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xcfae7b, roughness: 0.8 }),
  };
  const add = (geo, mat, x, y, zz, parent = group) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, zz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, high ? 2 : 1, r);
  // наклейка смотрит в сторону дверец (−X)
  const sticker = (tex, w, h, x, y, zz, parent = group) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    p.position.set(x, y, zz);
    p.rotation.y = -Math.PI / 2;
    p.receiveShadow = true;
    parent.add(p);
    return p;
  };

  // ---------- станок лазерной резки ----------
  const L = 2.4; // вдоль кузова
  const W = 1.5; // поперёк
  const cx = x0 + 0.25 + L / 2;
  const back = cx - L / 2; // торец к дверцам
  const F = floor;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.06, 0.12), m.frame, cx + sx * (L / 2 - 0.12), F + 0.03, sz * (W / 2 - 0.12));
  add(rbox(L, 0.7, W, 0.03), m.body, cx, F + 0.41, 0); // станина
  // фирменные полосы и швы дверок станины
  add(new THREE.BoxGeometry(0.012, 0.05, W - 0.16), m.blue, back - 0.006, F + 0.64, 0);
  add(new THREE.BoxGeometry(0.012, 0.018, W - 0.16), m.orange, back - 0.006, F + 0.59, 0);
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(L - 0.16, 0.05, 0.012), m.blue, cx, F + 0.64, s * (W / 2 + 0.006));
    add(new THREE.BoxGeometry(L - 0.16, 0.018, 0.012), m.orange, cx, F + 0.59, s * (W / 2 + 0.006));
    for (const dx of [-0.4, 0.4]) add(new THREE.BoxGeometry(0.012, 0.42, 0.006), m.frame, cx + dx, F + 0.33, s * (W / 2 + 0.004));
  }
  // рабочий стол: рама и ламели
  for (const s of [1, -1]) add(rbox(L, 0.12, 0.12), m.frame, cx, F + 0.82, s * (W / 2 - 0.06));
  for (const s of [1, -1]) add(rbox(0.12, 0.12, W - 0.24), m.frame, cx + s * (L / 2 - 0.06), F + 0.82, 0);
  const slatGeo = new THREE.BoxGeometry(0.012, 0.08, W - 0.24);
  for (let x = back + 0.2; x < cx + L / 2 - 0.15; x += 0.11) add(slatGeo, m.slat, x, F + 0.82, 0).castShadow = false;

  // портал с режущей головкой (ближе к дверцам — его видно из-за кузова)
  const gx = cx - 0.35;
  for (const s of [1, -1]) add(rbox(0.26, 0.44, 0.16), m.orange, gx, F + 1.1, s * (W / 2 - 0.02));
  add(rbox(0.3, 0.26, W + 0.12, 0.03), m.orange, gx, F + 1.45, 0); // балка
  add(new THREE.BoxGeometry(0.16, 0.05, W - 0.1), m.frame, gx + 0.04, F + 1.605, 0); // кабель-канал
  sticker(logoLabel(logoSvg, { w: 1024, h: 180 }), 0.86, 0.15, gx - 0.153, F + 1.45, -0.32);
  // каретка и головка
  const hz = 0.36;
  add(rbox(0.12, 0.34, 0.26), m.frame, gx - 0.2, F + 1.4, hz);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 20), m.steel, gx - 0.2, F + 1.1, hz);
  add(new THREE.CylinderGeometry(0.056, 0.056, 0.025, 20), m.beam, gx - 0.2, F + 1.2, hz).castShadow = false; // подсветка головки
  add(new THREE.CylinderGeometry(0.012, 0.032, 0.07, 16), m.copper, gx - 0.2, F + 0.915, hz); // сопло

  // пульт на стойке у угла станка
  const px = back + 0.02;
  const pz = -(W / 2) - 0.06;
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.8, 12), m.frame, px, F + 1.15, pz);
  const panel = new THREE.Group();
  panel.position.set(px - 0.02, F + 1.62, pz + 0.05);
  panel.rotation.y = 0.35;
  add(rbox(0.05, 0.3, 0.42, 0.015), m.frame, 0, 0, 0, panel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24), m.screen);
  scr.position.x = -0.027;
  scr.rotation.y = -Math.PI / 2;
  panel.add(scr);
  group.add(panel);

  // ---------- коробки у передней стенки ----------
  const label = logoLabel(logoSvg, { w: 640, h: 420, lines: ['CNMLaser', '↑ ↑'], barcode: true });
  /** Коробка: (cx, низ, cz), размеры, поворот; синяя лента сверху и на торце, наклейка на стороне к дверцам. */
  const box = (bx, by, bz, w, h, d, rot = 0, mat = m.card) => {
    const g = new THREE.Group();
    g.position.set(bx, by, bz);
    g.rotation.y = rot;
    add(rbox(w, h, d, 0.012), mat, 0, h / 2, 0, g);
    add(new THREE.BoxGeometry(w + 0.004, 0.004, 0.09), m.tape, 0, h + 0.001, 0, g).castShadow = false;
    add(new THREE.BoxGeometry(0.004, h * 0.28, 0.09), m.tape, -w / 2 - 0.001, h * 0.86, 0, g).castShadow = false;
    sticker(label, Math.min(0.34, d * 0.5), Math.min(0.34, d * 0.5) * (420 / 640), -w / 2 - 0.004, h * 0.45, -d * 0.2, g);
    group.add(g);
    return g;
  };
  // поддон
  const pxl = x1 - 0.65;
  const pzl = z - 0.62;
  add(rbox(1.0, 0.03, 1.1, 0.005), m.wood, pxl, F + 0.125, pzl);
  for (const dz of [-0.45, 0, 0.45]) add(new THREE.BoxGeometry(1.0, 0.1, 0.12), m.wood, pxl, F + 0.055, pzl + dz);
  box(pxl, F + 0.14, pzl, 0.9, 0.72, 1.0);
  box(pxl + 0.03, F + 0.86, pzl - 0.04, 0.6, 0.44, 0.66, 0.12, m.card2);
  // стопка без поддона
  box(x1 - 0.55, F, -z + 0.48, 0.72, 0.62, 0.74, -0.04, m.card2);
  box(x1 - 0.58, F + 0.62, -z + 0.5, 0.56, 0.46, 0.58, -0.14);

  return { group };
}
