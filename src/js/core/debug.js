/**
 * Отладочные переключатели в адресе (для поиска причины лагов на конкретном устройстве):
 *   ?perf=1        — счётчик FPS и нагрузки в углу экрана;
 *   ?q=low | high  — принудительное качество 3D-сцены;
 *   ?dpr=1         — потолок плотности пикселей холста (0.75, 1, 1.25 …);
 *   ?bloom=0       — без свечения (bloom) и FXAA;
 *   ?aurora=0      — без фона-пятен первого экрана;
 *   ?cap=30        — рисовать сцену не чаще N кадров в секунду.
 * Работают на главной при прямом открытии адреса: /?perf=1&q=low
 */
const q = new URLSearchParams(location.search);
const num = (k) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
const flag = (k) => (q.has(k) ? q.get(k) !== '0' : undefined);

export const debug = {
  perf: q.has('perf') && q.get('perf') !== '0',
  quality: q.get('q') === 'low' || q.get('q') === 'high' ? q.get('q') : undefined,
  dpr: num('dpr'),
  bloom: flag('bloom'),
  aurora: flag('aurora'),
  cap: num('cap'),
};

if (debug.aurora === false) document.documentElement.classList.add('no-aurora');
