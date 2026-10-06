import * as THREE from 'three';

/**
 * Искры: короткие раскалённые штрихи (LineSegments) + светящиеся «головки» (Points).
 * Цвета > 1 и toneMapped:false — чтобы bloom давал свечение.
 */
export class Sparks3D {
  constructor(max = 800, { gravity = -7.5, drag = 0.986, dot } = {}) {
    this.max = max;
    this.gravity = gravity;
    this.drag = drag;
    this.cursor = 0;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max).fill(1e9);

    this.linePos = new Float32Array(max * 6);
    this.lineCol = new Float32Array(max * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.lines.frustumCulled = false;

    this.headPos = new Float32Array(max * 3);
    this.headCol = new Float32Array(max * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.headPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('color', new THREE.BufferAttribute(this.headCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.heads = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 0.022, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true }),
    );
    this.heads.frustumCulled = false;

    this.object = new THREE.Group();
    this.object.add(this.lines, this.heads);
  }

  /** origin, dir — THREE.Vector3 (мировые координаты), dir — основное направление вылета. */
  emit(origin, dir, count, { speed = [1.2, 4.2], spread = 0.9, life = [0.35, 1.0] } = {}) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const s = speed[0] + Math.random() * (speed[1] - speed[0]);
      const rx = (Math.random() - 0.5) * 2 * spread;
      const ry = (Math.random() - 0.5) * 2 * spread + spread * 0.5;
      const rz = (Math.random() - 0.5) * 2 * spread;
      this.p[i * 3] = origin.x;
      this.p[i * 3 + 1] = origin.y;
      this.p[i * 3 + 2] = origin.z;
      this.v[i * 3] = (dir.x + rx) * s;
      this.v[i * 3 + 1] = (dir.y + ry) * s;
      this.v[i * 3 + 2] = (dir.z + rz) * s;
      this.life[i] = life[0] + Math.random() * (life[1] - life[0]);
      this.age[i] = 0;
    }
  }

  update(dt) {
    const { p, v, life, age, linePos, lineCol, headPos, headCol } = this;
    const drag = Math.pow(this.drag, dt * 60);
    for (let i = 0; i < this.max; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      age[i] += dt;
      if (age[i] >= life[i]) {
        lineCol.fill(0, i6, i6 + 6);
        headCol.fill(0, i3, i3 + 3);
        continue;
      }
      v[i3] *= drag;
      v[i3 + 1] = v[i3 + 1] * drag + this.gravity * dt;
      v[i3 + 2] *= drag;
      p[i3] += v[i3] * dt;
      p[i3 + 1] += v[i3 + 1] * dt;
      p[i3 + 2] += v[i3 + 2] * dt;

      const k = 1 - age[i] / life[i]; // 1 → 0, остывание
      const tail = 0.028;
      linePos[i6] = p[i3];
      linePos[i6 + 1] = p[i3 + 1];
      linePos[i6 + 2] = p[i3 + 2];
      linePos[i6 + 3] = p[i3] - v[i3] * tail;
      linePos[i6 + 4] = p[i3 + 1] - v[i3 + 1] * tail;
      linePos[i6 + 5] = p[i3 + 2] - v[i3 + 2] * tail;
      const r = 3.2 * k + 0.4;
      const g = 1.6 * k * k + 0.05;
      const b = 0.5 * k * k * k;
      lineCol[i6] = r;
      lineCol[i6 + 1] = g;
      lineCol[i6 + 2] = b;
      lineCol[i6 + 3] = r * 0.2;
      lineCol[i6 + 4] = g * 0.1;
      lineCol[i6 + 5] = 0;
      headPos[i3] = p[i3];
      headPos[i3 + 1] = p[i3 + 1];
      headPos[i3 + 2] = p[i3 + 2];
      headCol[i3] = r * 0.7;
      headCol[i3 + 1] = g * 0.6;
      headCol[i3 + 2] = b * 0.5;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;
    this.heads.geometry.attributes.position.needsUpdate = true;
    this.heads.geometry.attributes.color.needsUpdate = true;
  }
}

/** Туман распылителя антикора: мягкие частицы, поднимаются к днищу и растекаются. */
export class Mist {
  constructor(max = 400, { dot, color = new THREE.Color(0.2, 0.17, 0.14) } = {}) {
    this.max = max;
    this.cursor = 0;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1e9);
    this.life = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.object = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uMap: { value: dot }, uColor: { value: color }, uScale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aAlpha; attribute float aSize; uniform float uScale; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uScale / -mv.z; vA = aAlpha; }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
          void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; if(a < 0.003) discard; gl_FragColor = vec4(uColor, a); }`,
      }),
    );
    this.object.frustumCulled = false;
  }

  emit(origin, count, { up = 2.2, spread = 0.5 } = {}) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.p[i * 3] = origin.x + (Math.random() - 0.5) * 0.04;
      this.p[i * 3 + 1] = origin.y;
      this.p[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.04;
      this.v[i * 3] = (Math.random() - 0.5) * spread;
      this.v[i * 3 + 1] = up * (0.7 + Math.random() * 0.6);
      this.v[i * 3 + 2] = (Math.random() - 0.5) * spread;
      this.age[i] = 0;
      this.life[i] = 0.7 + Math.random() * 0.8;
    }
  }

  update(dt, ceilingY = Infinity) {
    for (let i = 0; i < this.max; i++) {
      const i3 = i * 3;
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      if (k >= 1) {
        this.alpha[i] = 0;
        continue;
      }
      this.p[i3] += this.v[i3] * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += this.v[i3 + 2] * dt;
      // упёрлись в днище — растекаемся
      if (this.p[i3 + 1] > ceilingY) {
        this.p[i3 + 1] = ceilingY;
        this.v[i3] *= 1.08;
        this.v[i3 + 2] *= 1.08;
        this.v[i3 + 1] = 0;
      }
      this.alpha[i] = Math.sin(Math.PI * k) * 0.16;
      this.size[i] = 16 + k * 70;
    }
    const a = this.object.geometry.attributes;
    a.position.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
    a.aSize.needsUpdate = true;
  }
}

/** Пылинки в воздухе — медленно дрейфуют, добавляют глубины. */
export function createDust(count, { dot, box = [10, 5, 14], center = [0, 1, -2] } = {}) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + (Math.random() - 0.5) * box[0];
    pos[i * 3 + 1] = center[1] + (Math.random() - 0.5) * box[1];
    pos[i * 3 + 2] = center[2] + (Math.random() - 0.5) * box[2];
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: dot }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ vec3 p = position;
        p.x += sin(uTime*0.15 + aSeed*40.0)*0.25; p.y += sin(uTime*0.11 + aSeed*17.0)*0.18; p.z += cos(uTime*0.13 + aSeed*23.0)*0.25;
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed*5.0) * uScale / -mv.z; vA = 0.25 + 0.35*sin(uTime*0.6 + aSeed*30.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying float vA;
      void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; gl_FragColor = vec4(vec3(1.0,0.72,0.5)*a*0.6, a); }`,
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  return { object: points, material };
}
