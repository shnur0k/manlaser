import * as THREE from 'three';
import { debug } from '../../core/debug.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Заменяет NaN и отрицательные значения нулём и ограничивает яркость сверху (до bloom). */
const SANITIZE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 r = c.rgb;
      r.x = (r.x == r.x) ? r.x : 0.0;
      r.y = (r.y == r.y) ? r.y : 0.0;
      r.z = (r.z == r.z) ? r.z : 0.0;
      gl_FragColor = vec4(clamp(r, 0.0, 12.0), 1.0);
    }`,
};

/** Обрезает цвет до 0…1 (LDR) перед FXAA. */
const CLAMP_LDR = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: SANITIZE.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
    }`,
};

/**
 * База для 3D-сцен: рендерер, камера, окружение для отражений металла, bloom (на мощных устройствах)
 * и адаптивное качество — если кадр рисуется дольше ~22 мс, снижаем разрешение, затем выключаем bloom.
 */
export function createStage(canvas, { quality = 'high', fov = 35, envIntensity = 0.35, exposure = 1, bloom = {}, background = 0x000000, toneMapping = THREE.ACESFilmicToneMapping } = {}) {
  const high = quality === 'high';
  const useComposer = high && debug.bloom !== false; // ?bloom=0 — без свечения
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.setClearColor(background, 1);
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.info.autoReset = false; // считаем вызовы за весь кадр, включая постобработку (для счётчика ?perf=1)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = envIntensity;

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.03, 120);
  const baseFov = fov;

  const maxRatio = Math.min(window.devicePixelRatio || 1, debug.dpr ?? (high ? 1.25 : 1));
  let ratio = maxRatio;
  let composer = null;
  let bloomPass = null;
  let fxaaPass = null;

  if (useComposer) {
    // без MSAA ×4 (дорого на высоком разрешении): сглаживание делает быстрый FXAA в конце цепочки
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    // защита от «битых» пикселей (NaN, отрицательные и бесконечные значения): на некоторых видеокартах Mac они расползаются
    // через размытие bloom цветными и тёмными точками
    composer.addPass(new ShaderPass(SANITIZE));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom.strength ?? 0.9, bloom.radius ?? 0.6, bloom.threshold ?? 0.85);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    // без тон-мэппинга после OutputPass остаются значения > 1; FXAA считает яркость по ним и даёт шум — обрезаем до 0…1
    composer.addPass(new ShaderPass(CLAMP_LDR));
    fxaaPass = new ShaderPass(FXAAShader);
    composer.addPass(fxaaPass);
  }

  let width = 1;
  let height = 1;
  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
      fxaaPass?.material.uniforms.resolution.value.set(1 / (width * ratio), 1 / (height * ratio));
    }
  }
  resize();

  // адаптивное качество
  let slowFrames = 0;
  function adapt(dt) {
    if (dt > 0.022 && dt < 0.25) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > 40) {
      slowFrames = 0;
      if (ratio > 0.76) {
        ratio = Math.max(0.75, ratio - 0.25);
        resize();
      } else if (composer) {
        composer.dispose();
        composer = null;
      }
    }
  }

  function render(dt = 0.016) {
    renderer.info.reset();
    adapt(dt);
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
  }

  /** Горизонтальный «охват» кадра сохраняется на узких экранах (портрет) — увеличиваем вертикальный FOV. */
  function fitFov(designFov = baseFov) {
    const aspect = width / height;
    const design = 16 / 9;
    if (aspect >= design * 0.85) return designFov;
    const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(designFov) / 2) * design);
    const fit = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect));
    return Math.min(70, THREE.MathUtils.lerp(designFov, fit, 0.55));
  }

  function dispose() {
    scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => {
        Object.values(m).forEach((v) => v?.isTexture && v.dispose());
        m.dispose();
      });
    });
    envTexture.dispose();
    pmrem.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    renderer,
    scene,
    camera,
    resize,
    render,
    fitFov,
    dispose,
    get size() {
      return { width, height };
    },
    /** Сведения для счётчика ?perf=1. */
    info() {
      const i = renderer.info;
      return { width: Math.round(width * ratio), height: Math.round(height * ratio), ratio: +ratio.toFixed(2), quality, bloom: Boolean(composer), calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
    },
  };
}

/** Мягкая круглая текстура для частиц. */
export function softDot(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Мягкое пятно света для аддитивных ореолов: НЕПРОЗРАЧНЫЙ холст, яркость в градациях серого (центр белый, край чёрный).
 * Прозрачный холст (как у softDot) в Safari при загрузке в текстуру «разпремультиплицируется» с шумом по каналам —
 * при цветной подсветке это даёт россыпь разноцветных точек.
 */
export function softGlow(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgb(255,255,255)');
  grad.addColorStop(0.35, 'rgb(120,120,120)');
  grad.addColorStop(0.7, 'rgb(28,28,28)');
  grad.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Ключевые кадры: пара соседних кадров для прогресса p и плавный коэффициент t между ними. */
export function keyframes(list, p) {
  if (p <= list[0].p) return { a: list[0], b: null, t: 0 };
  if (p >= list[list.length - 1].p) return { a: list[list.length - 1], b: null, t: 0 };
  let i = 0;
  while (i < list.length - 1 && list[i + 1].p < p) i++;
  const a = list[i];
  const b = list[i + 1];
  const t = (p - a.p) / (b.p - a.p);
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return { a, b, t: e };
}

export const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
