/**
 * Счётчик производительности (?perf=1): FPS, время кадра, сколько уходит на 3D-сцену, размер холста, число объектов.
 * Нужен, чтобы понять, что именно тормозит на конкретном устройстве.
 */
export function initPerf() {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:99999;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.82);color:#9fe;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none;max-width:90vw';
  document.body.appendChild(el);

  let frames = 0;
  let last = performance.now();
  let acc = 0;
  let worst = 0;
  let slow = 0;
  let stamp = performance.now();
  const tick = (now) => {
    const dt = now - last;
    last = now;
    frames++;
    acc += dt;
    worst = Math.max(worst, dt);
    if (dt > 33) slow++;
    if (now - stamp >= 1000) {
      const p = window.__mlPerf || {};
      const info = p.scene?.info?.();
      const fps = Math.round((frames * 1000) / (now - stamp));
      const lines = [
        `FPS ${fps}   кадр ${(acc / frames).toFixed(1)} мс   худший ${Math.round(worst)} мс   медленных >33мс: ${slow}`,
        `сцена (CPU): ${p.update != null ? p.update.toFixed(1) : '—'} мс/кадр${p.rendered != null ? `   отрисовано ${p.rendered}/с` : ''}`,
      ];
      if (info) lines.push(`холст ${info.width}×${info.height}   DPR ${info.ratio}   качество ${info.quality}   bloom ${info.bloom ? 'вкл' : 'выкл'}`, `вызовов ${info.calls}   треугольников ${info.tris}   геометрий ${info.geometries}   текстур ${info.textures}`);
      else lines.push('3D-сцена: не запущена (пока грузится, на другой странице или выключена)');
      lines.push(`экран ${innerWidth}×${innerHeight}  devicePixelRatio ${devicePixelRatio}  ядер ${navigator.hardwareConcurrency || '?'}  память ${navigator.deviceMemory || '?'} ГБ`);
      el.textContent = lines.join('\n');
      frames = 0;
      acc = 0;
      worst = 0;
      slow = 0;
      stamp = now;
      if (p) p.rendered = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
