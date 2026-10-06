/** Возможности устройства: от них зависит, какие эффекты включать. */
const mq = (q) => window.matchMedia(q);

const connection = navigator.connection || {};

// ?motion=1 в адресе — принудительно включить все эффекты (для проверки), ?motion=0 — выключить
const params = new URLSearchParams(location.search);
if (params.has('motion')) sessionStorage.setItem('ml-motion', params.get('motion'));
const forced = sessionStorage.getItem('ml-motion');

export const env = {
  reducedMotion: forced === '1' ? false : forced === '0' ? true : mq('(prefers-reduced-motion: reduce)').matches,
  touch: mq('(hover: none), (pointer: coarse)').matches,
  saveData: Boolean(connection.saveData),
  cores: navigator.hardwareConcurrency || 8,
  memory: navigator.deviceMemory || 8,
  get mobile() {
    return window.innerWidth < 768;
  },
};

/** Слабое устройство — упрощённые сцены вместо полноценного 3D. */
env.lowEnd = env.saveData || env.cores <= 4 || env.memory <= 4 || (env.touch && window.innerWidth < 768 && env.cores <= 6);

/** Можно ли запускать тяжёлую графику (Three.js). */
env.allowHeavy = !env.reducedMotion && !env.lowEnd;

mq('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
  env.reducedMotion = e.matches;
});
