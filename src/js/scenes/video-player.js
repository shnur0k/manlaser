/**
 * Режим 'video': mp4 без звука, текущее время зависит от прогресса скролла.
 * Для плавной перемотки видео должно быть закодировано с частыми ключевыми кадрами (см. README).
 */
export async function createVideoPlayer(root, { src } = {}, { onReady } = {}) {
  if (!src) throw new Error('Не задан video.src в config.js');
  const video = document.createElement('video');
  video.className = 'scene__video';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.src = src;
  root.querySelector('.scene__stage').appendChild(video);

  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error(`Видео не загрузилось: ${src}`)), { once: true });
  });
  onReady?.();

  let wanted = 0;
  let seeking = false;
  const seek = () => {
    if (seeking || !video.duration) return;
    const t = wanted * (video.duration - 0.05);
    if (Math.abs(video.currentTime - t) < 1 / 60) return;
    seeking = true;
    video.currentTime = t;
  };
  video.addEventListener('seeked', () => {
    seeking = false;
    seek();
  });

  return {
    update(p) {
      wanted = p;
      seek();
    },
    resize() {},
    destroy() {
      video.removeAttribute('src');
      video.load();
      video.remove();
    },
  };
}
