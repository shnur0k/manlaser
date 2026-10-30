/**
 * Страница товара: вкладки «Описание · Характеристики · Функциональность».
 * Доступные вкладки по шаблону WAI-ARIA: стрелки влево/вправо, Home/End переключают вкладку.
 */
export default function product(container) {
  const root = container.querySelector('[data-tabs]');
  if (!root) return null;
  const tabs = [...root.querySelectorAll('[data-tab]')];
  const panels = [...root.querySelectorAll('[data-tab-panel]')];
  root.classList.add('is-ready'); // со скриптом показываем одну вкладку, без него — все разделы подряд

  function select(i, { focus = false } = {}) {
    tabs.forEach((tab, j) => {
      const on = i === j;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[j].classList.toggle('is-active', on);
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  select(Math.max(0, tabs.findIndex((x) => x.classList.contains('is-active'))));

  const onClick = (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) select(tabs.indexOf(tab));
  };
  const onKey = (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select((keys[e.key] + tabs.length) % tabs.length, { focus: true });
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKey);
  };
}
