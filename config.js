/**
 * Глобальные настройки сайта (поведение и эффекты).
 * Тексты, цены, контакты — НЕ здесь, а в папке /content.
 */
export default {
  // Переход между страницами: 'laser' — лазерный разрез, 'molecules' — фирменная
  // «молекулярная» сетка, 'heat' — шторка из фирменного градиента, 'fade' — простой.
  transition: 'laser',

  // Интро с прорисовкой логотипа: показывается один раз за сессию браузера.
  intro: {
    enabled: true,
    oncePerSession: true,
  },

  // Форма записи. send: false — заявка только проверяется и показывается экран успеха,
  // никуда не отправляется (отправку в Telegram / Viber / WhatsApp / почту подключим позже).
  booking: {
    send: false,
  },

  cursor: true, // кастомный курсор (на сенсорных экранах отключается сам)
  smoothScroll: true, // плавный скролл Lenis
  grain: true, // плёночное зерно поверх сайта

  /**
   * 3D-сцены. Для каждой сцены режим:
   *  '3d'     — Three.js (по умолчанию);
   *  'frames' — последовательность кадров /public/frames/<scene>/frame_0001.webp …
   *  'video'  — mp4, перематывается скроллом.
   * На слабых устройствах и при prefers-reduced-motion '3d' автоматически
   * заменяется на 'fallback' (если заданы кадры/видео — используются они, иначе статичная картинка).
   */
  scenes: {
    home: {
      mode: '3d',
      frames: { path: '/frames/home/', count: 240, pad: 4, ext: 'webp' },
      video: { src: '/video/home.mp4' },
    },
    cleaning: {
      mode: '3d',
      frames: { path: '/frames/cleaning/', count: 160, pad: 4, ext: 'webp' },
      video: { src: '/video/cleaning.mp4' },
    },
    anticor: {
      mode: '3d',
      frames: { path: '/frames/anticor/', count: 160, pad: 4, ext: 'webp' },
      video: { src: '/video/anticor.mp4' },
    },
  },
};
