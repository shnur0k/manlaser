/** Возможности устройства: от них зависит, какие эффекты включать. */
const mq = (q) => window.matchMedia(q);

const connection = navigator.connection || {};

// ?motion=1 в адресе — принудительно включить все эффекты (для проверки), ?motion=0 — выключить
const params = new URLSearchParams(location.search);
if (params.has('motion')) sessionStorage.setItem('ml-motion', params.get('motion'));
const forced = sessionStorage.getItem('ml-motion');

// «Лёгкая» версия сайта (без 3D на главной и т. п.) — для сенсорных устройств: телефон и планшет,
// в любом положении и в режиме «версия для компьютера». Определяется по устройству, а не по ширине окна,
// поэтому при повороте экрана не меняется. ?lite=1 / ?lite=0 — принудительно (проверка на компьютере).
if (params.has('lite')) sessionStorage.setItem('ml-lite', params.get('lite'));
const liteForced = sessionStorage.getItem('ml-lite');
const lite = liteForced === '1' ? true : liteForced === '0' ? false : mq('(hover: none), (pointer: coarse)').matches;
document.documentElement.classList.toggle('is-lite', lite);

export const env = {
  lite,
  reducedMotion: forced === '1' ? false : forced === '0' ? true : mq('(prefers-reduced-motion: reduce)').matches,
  touch: mq('(hover: none), (pointer: coarse)').matches,
  saveData: Boolean(connection.saveData),
  cores: navigator.hardwareConcurrency || 8,
  memory: navigator.deviceMemory || 8,
};

/** Слабое устройство — упрощённые сцены вместо полноценного 3D. */
env.lowEnd = env.saveData || env.cores <= 4 || env.memory <= 4 || (env.lite && env.cores <= 6);

/** Можно ли запускать тяжёлую графику (Three.js). */
env.allowHeavy = !env.reducedMotion && !env.lowEnd;

mq('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
  env.reducedMotion = e.matches;
});
