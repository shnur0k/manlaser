# AGENTS.md — руководство для ИИ-агентов по проекту manlaser (сайт оборудования)

> Читай целиком перед любыми правками. Пользовательская документация (как править тексты, фото, товары) — в `README.md`.

## 1. Что это

**Сайт продажи и ремонта лазерного оборудования CNMLaser** — ремейк https://manlaser.by/ с новой структурой. Домен — **manlaser.by**, репозиторий — `shnur0k/manlaser`, папка проекта — `~/Documents/manlaser-equipment`.

**Парный сайт:** услуги (лазерная очистка и антикор автомобилей) — `manlaser-center.by`, репозиторий `shnur0k/manlaser-center`, папка `~/Documents/manlaser`. Это **отдельный проект**: факты и решения оттуда сюда автоматически не переходят. Ссылка между сайтами — `site.json → equipmentNote` (здесь она ведёт на сайт услуг; компонент `equipmentNote()`).

- Язык сайта, интерфейса, комментариев в коде и общения с владельцем — **русский**.
- Стиль: тёмный, кинематографичный, индустриальный; главная — светлая 3D-сцена, дальше тёмный сайт.
- Движок общий с сайтом услуг (Vite-плагин собирает страницы из `content/*.json` + шаблонов), но страницы, контент, палитра и 3D-сцена — свои.

### Решения владельца (не менять без его просьбы)

| Решение | Детали |
|---|---|
| **Структура** | Меню: Оборудование (выпадающее: 4 категории) · Ремонт и диагностика · Оплата и доставка · Блог · О нас (О компании, Контакты, Частые вопросы). |
| **Палитра** | Оранжевый `#E85002`, голубой `#007BFF`, небесный `#87CEEB`, чёрный, белый, серый `#646464`; градиент белый → небесный → голубой → оранжевый. Главный акцент интерфейса — голубой (`--accent`), оранжевый (`--orange`) — для цен, наличия и точек в градиенте. |
| **Каталог** | Одна страница `/oborudovanie/` с фильтром по 4 категориям (`?cat=…`) + страница каждого товара. Отдельных страниц категорий нет. |
| **Заказ** | Только заявка «Запросить цену» (`/zapros/`), корзины нет. Одна плавающая кнопка внизу справа; прячется, если в кадре другая ссылка на `/zapros/`. |
| **Отправка заявок** | **Выключена** (`config.js → booking.send: false`) — владелец попросил пока не подключать. |
| **Главная, компьютер** | 3D-сцена: грузовой фургон на белом фоне в профиль → камера обходит его и поворачивается к задним дверцам → дверцы открываются → внутри логотип manlaser → камера входит в кузов. |
| **Главная, телефон/планшет** | Без 3D: знак manlaser на голубом свечении, при прокрутке выезжает блок с кнопками (как на сайте услуг). |
| **Один контактный набор** | `site.json → contacts.main` (+ `cta.main`). |
| **Шрифты** | Nunito (текст) + Unbounded (заголовки, цифры), локально через `@fontsource-variable`. |

### Главное правило контента

**Не выдумывать факты.** Цены, характеристики, отзывы, реквизиты, которых нет в источниках, — только плейсхолдеры в квадратных скобках: `[ЦЕНА]`, `[УТОЧНИТЬ]`, `[РЕКВИЗИТЫ]`. На сайте они подсвечиваются пунктиром (функция `t()`). Пометка `⚠` — данные в источниках расходятся.

Источники фактов: `_source/equipment-site/content/*.json` (каталог, доставка, ремонт, FAQ, отзывы) — оттуда собран текущий `content/`. Сайт https://manlaser.by/ из окружения агента **не открывается** — не пытайся его фетчить.

### Известные вопросы к владельцу

- Viber и WhatsApp в `site.json → contacts.main` указаны на номер `+375 44 768-76-77` (как в источнике), а основной телефон — `+375 29 288-27-72`. Проверить, верно ли.
- Гарантия на станки резки (2 года или 1 год) и на источники Raycus (24 месяца) — расхождения в источниках, помечены `⚠`.
- У товаров нет фото (заглушки «Место для фото»), у многих — `[УТОЧНИТЬ]` в габаритах, питании и т. п.
- Нужны реквизиты юрлица, политика конфиденциальности (ссылка в форме).
- Статья блога про лазер и пескоструй — черновик (`draft: true`, `noindex`).

## 2. Команды и окружение

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # → dist/, каждая страница — отдельный index.html
npm run preview
```

- ОС владельца — macOS. Для встроенного браузера есть `.claude/launch.json` (`manlaser-equipment-dev`, порт 5180; у сайта услуг 5173).
- Для правки JSON надёжнее node-скрипт (`fs` + `JSON.parse/stringify`).

### Как проверять в браузере

- У владельца включено «уменьшение движения» → сайт уходит в спокойный режим (без Lenis, без 3D, без появлений). Эффекты смотреть с **`?motion=1`** (запоминается в `sessionStorage`), выключить — `?motion=0`.
- Лёгкая версия (телефон): `?lite=1`, вернуть компьютерную — `?lite=0` (**запоминается**: после проверки `?lite=1` 3D не загрузится, пока не откроешь `?lite=0`).
- Встроенный браузер рисует мало кадров/с, у него не работают IntersectionObserver и обычный тикер сцены — кадры 3D смотри так: `document.querySelector('[data-scene-root]').__set(p)` (p = 0…1, только в dev), и подожди пару секунд (холст проявляется CSS-переходом). Кадры: 0 — профиль, 0.3 — обход, 0.5 — вид сзади, 0.63 — дверцы открываются, 0.76 — открыты, 0.86 — коридор к логотипу, 1 — финал.
- `canvas.toDataURL()` сразу после `__set(p)` в том же вызове отдаёт кадр сцены (так сделан `public/images/og.jpg`).
- Быстрая проверка всех маршрутов: `fetch(url, {headers:{accept:'text/html'}})` из консоли страницы.
- Перед завершением задачи прогоняй `npm run build` и убедись, что нет ошибок.

## 3. Архитектура

### 3.1. Сборка страниц

HTML-файлов страниц в репозитории **нет**. Их генерирует Vite-плагин `build/plugin.js` из **контента** (`content/*.json`, `content/blog/*.md`) и **шаблонов** (`src/templates/**`, функции, возвращающие строки).

```
content/*.json ─┐
assets/logo.svg ─┼─► build/content.js (loadContent) ─► build/routes.js (buildRoutes) ─► src/templates/index.js (renderPage)
content/blog/*.md┘                                                                        └─► layout.js + pages/*.js
```

- **dev:** middleware рендерит страницу на каждый запрос, отдаёт с `Cache-Control: no-store`. URL без слэша → 301 на `/…/`. Неизвестный URL → 404.
- **build:** каждая страница — виртуальный вход `<root>/<url>/index.html`, плюс `404.html`, `sitemap.xml`, `robots.txt`.
- Правка `content/*` или `assets/logo.svg` → полная перезагрузка страницы. Правка шаблонов перезапускает dev-сервер.

> ⚠ **Подводный камень:** после серии быстрых правок шаблонов сервер может закешировать промежуточную версию → «Ошибка сборки страницы: X is not defined», хотя код верный. Решение: перезапустить dev-сервер (`preview_stop` + `preview_start`).

### 3.2. Маршруты (`build/routes.js`)

| URL | Шаблон | namespace (Barba / JS-модуль) |
|---|---|---|
| `/` | `home` (pages/home.js) | `home` → `src/js/pages/home.js` |
| `/oborudovanie/` | `equipmentHub` (pages/equipment.js) | `equipment` → фильтр категорий |
| `/oborudovanie/<slug>/` | `product` — по одной на товар из `equipment.json` | `product` |
| `/remont/` | `repair` | `repair` |
| `/oplata-i-dostavka/` | `delivery` | `delivery` |
| `/zapros/` | `request` | `request` → `src/js/pages/request.js` (форма) |
| `/blog/`, `/blog/<slug>/` | `blogList`, `blogPost` (pages/misc.js) | `blog`, `post` |
| `/o-nas/`, `/kontakty/`, `/voprosy/` | `about`, `contacts`, `faqHub` | `about`, `contacts`, `faq` |
| `/_photos/` (только dev) | `photos` | `photos` |
| 404 | `notFound` | `not-found` |

Новая страница: маршрут в `buildRoutes`, функция шаблона в `src/templates/pages/*.js`, экспорт в `pages/index.js`; при необходимости модуль `src/js/pages/<namespace>.js`.

### 3.3. Шаблоны (`src/templates/`)

- `index.js` — `renderPage(route, content)`: `ctx` (`c` — весь контент, `site`, `route`, `contact`, `logo`, `logoMark` — только знак, `logoWord` — только надпись, `media()`), вызывает шаблон, оборачивает в `layout`.
- Шаблон страницы возвращает строку **или** `{ body, schema?: [], head?, noFooter?, cta? }`. Блок-призыв `ctaBand` рисует сам `layout.js` перед футером (вручную не вставлять). Свой заголовок/кнопки — `cta: { title, text, primary, secondary }`, скрыть (форма заявки) — `cta: false`.
- `lib.js` — **всегда** экранируй данные: `esc()` — простой текст, `t()` — текст + подсветка `[плейсхолдеров]` и `⚠`, `rich()` — как `t()`, плюс `*слово*` → акцент.
- `components.js` — `button`, `eyebrow`, `sectionHead`, `pageHero`, `productCard`, `stockBadge`, `specTable`, `crumbs`, `marquee`, `equipmentNote`, `features`, `steps`, `faq`, `counters`, `reviewCard`, `messengerLinks`, `phoneLink`, `ctaBand`, `section`.
- `media.js` — `media(map, key, opts)`: фото из `content/media.json`; если `src: null` — заглушка «Место для фото».
- `schema.js` — Schema.org: `business` (LocalBusiness + Store), `breadcrumbs`, `product` (Offer, если в цене есть BYN), `faqPage`, `article`.
- `partials/` — `header.js` (меню из `site.json → nav`; пункты с `items` — выпадающие), `mobile-menu.js`, `footer.js`, `chrome.js`, `contact-blocks.js`.
- `icons.js` — inline SVG-иконки. Новые иконки добавляй сюда.
- Общий код шаблонов и браузера: `src/js/lib/contacts.js`, `src/js/lib/nav.js`.

### 3.4. Клиентский JS (`src/js/`)

Точка входа — `main.js`. Порядок: env → Lenis → шапка, меню, плавающие кнопки, курсор → `boot()` → `mountPage` → `initRouter()` (Barba).

- **`core/page.js`** — жизненный цикл контейнера Barba. `mountPage` запускает общие модули (появления, магнитные кнопки, наклон карточек, аккордеоны, фильтр по тегам, бегущая строка, статус работы) и **модуль страницы** `src/js/pages/<namespace>.js`. Контракт: `export default (container) => ({ start?, destroy? }) | cleanupFn | null`. **Любые слушатели/таймеры обязаны убираться в cleanup.**
- **`core/env.js`** — `reducedMotion`, `touch`, `lowEnd`, **`lite`**. Два режима: *полный* (компьютер, 3D и анимации) и *лёгкий* (`html.is-lite`: любое сенсорное устройство). Определяется по устройству (`hover: none` / `pointer: coarse`), не по ширине окна.
- **`pages/equipment.js`** — фильтр каталога: кнопки `[data-cat]`, карточки с `data-tags="<id категории>"`, описания `[data-cat-info-for]`; выбор пишется в `?cat=`.
- **`pages/request.js`** — форма заявки: предвыбор `?product=<slug>`, маска телефона, проверка, черновик в `localStorage['ml-request-draft']`, анимация успеха. Отправка — `lib/booking.js` (пока заглушка).
- **`pages/home.js`** — запускает 3D-сцену; пока сцена светлая, ставит `html.home-light` (шапка с тёмными буквами, стили в `equipment.css`).
- Остальное — как раньше: `core/scroll.js` (Lenis, использовать `scrollTo()` вместо `window.scrollTo`), `core/transitions.js` (`laser` по умолчанию), `ui/*`, `lib/gsap.js`, `fx/sparks.js`.

Атрибуты анимаций в шаблонах: `data-split`, `data-reveal`, `data-stagger`, `data-count`, `data-parallax`, `data-steps`, `data-magnetic`, `data-tilt`, `data-cursor`.

### 3.5. 3D-сцена главной (`src/js/scenes/`)

- `scroll-scene.js` — общий модуль закреплённой сцены: пин ScrollTrigger, сглаженный прогресс, подписи `[data-scene-step data-from data-to]`, полоски `[data-scene-bar]`, режим из `config.js → scenes.home` (`'3d' | 'frames' | 'video'`; на лёгком устройстве — `mobileMode: 'static'`; при reduced motion / без WebGL / при ошибке — статичный режим `.is-static`). Опция `darkAt` — прогресс, после которого сцена тёмная (класс `is-dark`: подписи меняют цвет с чёрного на белый). Dev-хук `root.__set(p)`.
- `scenes/truck/` — Three.js-сцена (грузится динамически после `load`): `truck.js` (фургон из примитивов в метрах: нос +X, борт к камере +Z, дверцы на −X; кузов открыт сзади, внутри обшивка, рёбра, светодиодные полосы; `setDoors(t)`; наклейки на бортах рисуются на canvas), `sign.js` (светящийся 3D-логотип из `assets/logo.svg` на передней стенке кузова), `index.js` (свет, тени, путь камеры по ключевым кадрам `CAM` через PCHIP, анимация дверец и света по `p`).
- Прогресс: 0–0.12 профиль → 0.12–0.58 обход к задним дверцам → 0.52–0.72 дверцы открываются → 0.72–1 камера подъезжает и входит в кузов (в финале кадр целиком тёмный). Подписи — `content/pages.json → home.scene`; диапазоны показа — в `pages/home.js` (шаблон).
- Белый фон: `createStage(..., { background: 0xffffff, toneMapping: THREE.NoToneMapping })` — тон-мэппинг отключён, иначе белое станет серым; bloom с порогом 1.15 реагирует только на самосветящееся (логотип, диодные полосы). Когда камера в кузове, «солнце» и окружение приглушаются (в `update`), иначе боковые стены пересвечиваются.
- Общее: `scenes/lib/` (`stage.js` — рендерер, bloom, адаптивное качество; `patch.js`, `glsl.js`, `particles.js` — остались от прежней сцены, сейчас не используются).
- Постер лёгкой версии — `.scene__poster-mark` (знак `ctx.logoMark` на фирменном свечении, CSS в `equipment.css`); если в `media.json → home.hero-fallback` задан `src`, показывается он.

### 3.6. Каталог и заявка

- Данные: `content/equipment.json` — `categories`, `products` (`slug`, `category`, `name`, `type`, `power`, `price`, `stock`, `warranty`, `media`, `specs`, `url` — адрес `/oborudovanie/<slug>/`), `advantages`, `counters`, `industries`, `intro`. Страницы товаров, карточки и пункты формы строятся из него автоматически.
- Цена в `price` — строка как на старом сайте; Schema.org `Offer` строится, только если в ней есть «BYN».
- Кнопки «Запросить цену» ведут на `/zapros/?product=<slug>` (для ремонта — `product=repair`).

## 4. Контент (`content/`)

| Файл | Содержимое |
|---|---|
| `site.json` | название, URL, адрес, `hours` (+ `open/close/days/timezone` для статуса), email, `contacts.main`, `cta.main`, `nav`, `map`, `requisitesList`, `equipmentNote` |
| `pages.json` | SEO и заголовки страниц; `home.hero`, `home.scene` (подписи 3D), `home.marquee` |
| `equipment.json` | каталог (см. 3.6) |
| `repair.json`, `delivery.json` | страницы «Ремонт и диагностика», «Оплата и доставка» |
| `faq.json` | группы `equipment`, `repair` |
| `reviews.json` | отзывы покупателей (`equipment`) |
| `media.json` | места под фото: `src` (null = заглушка), `alt`, `want`, `ratio` |
| `blog/*.md` | статьи (front matter: `title`, `description`, `date`, `tags`, `cover`, `draft`) |

`config.js` — `transition`, `booking.send`, `cursor`, `smoothScroll`, `grain`, `scenes.home`.

## 5. Стили (`src/css/`)

`main.css` импортирует по порядку: шрифты → `tokens.css` → `base.css` → `components.css` → `header.css` → `chrome.css` → `sections.css` → `scene.css` → `calc.css` (**осталось от сайта услуг; из него используются только стили форм — `calc-step`, `chip-check`, `chip-select`; остальное мёртвое, можно вычистить**) → `equipment.css` (каталог, светлая сцена, постер) → `booking.css` (форма заявки) → `pages.css` → `glow.css` → `touch.css` → `mobile.css` → `a11y.css`.

Цвета — только через переменные из `tokens.css`: `--accent` (#007bff), `--accent-hot`, `--accent-deep`, `--sky`, `--orange`, `--white`, `--gray`…; градиенты `--grad-brand`, `--grad-heat`, `--grad-beam`. В CSS встречаются литералы `rgba(0, 123, 255, …)` (это `--accent`) — остались после перекраски.

### Правила дизайна (унаследованные, выстраданные)

- **Не использовать `text-indent`** на заголовках с `data-split`. **Без `text-shadow` на тексте внутри `data-split`** — маски SplitText обрезают свечение.
- **Контурный текст** (`-webkit-text-stroke`) у Unbounded — только с `paint-order: stroke fill`.
- **Касание и доступность** (`touch.css`, `a11y.css`): `:hover` — только внутри `@media (hover: hover)`; область нажатия на телефоне не меньше 44 px; `backdrop-filter` только у шапки и плашки меню; не добавлять новые `backdrop-filter` и `filter` на большие слои.
- Не трогать глобальное правило `prefers-reduced-motion` в `base.css`: бегущая строка намеренно работает на JS.
- В сетках на мобильных — `minmax(0, 1fr)`, а не `1fr`.
- Отступ от заголовка до содержимого — токен `--head-gap`; своих отступов под заголовками не задавать.
- Над каждым информационным блоком — тонкая линия-разделитель (`section()` добавляет её сам).
- Белая заливка с белым текстом на голубом (`#007bff`) даёт контраст 4:1 — на телефоне сплошные заливки темнее (`--orange-fill` в `mobile.css`, имя осталось историческим).
- Диагностика лагов: `/?perf=1` (+ `&q=low|high`, `&dpr=1`, `&bloom=0`, `&cap=30`).

## 6. Стиль кода

- Чистый JS (ES-модули), без TypeScript и фреймворков. Vite 7, GSAP, Lenis, Barba, Three r180.
- Комментарии — по-русски, коротко, объясняют «зачем». Подстраивайся под окружающий код (2 пробела, одинарные кавычки).
- Тексты интерфейса — в `content/*.json`, не хардкодить факты в JS.
- Каждый модуль страницы и UI-модуль возвращает функцию очистки.
- Не добавлять новые зависимости без необходимости.

## 7. Статус и план

**Готово:** палитра; структура и меню по схеме владельца; каталог (20 товаров, 4 категории) с фильтром и страницами товаров; ремонт и диагностика; оплата и доставка; заявка «Запросить цену» (без отправки); блог (1 черновик); о компании, контакты, FAQ; 3D-сцена грузовика (компьютер) и постер (телефон); favicon, иконки, превью для соцсетей (`public/images/og.jpg` — кадр сцены).

**Осталось:**
1. Фото товаров, сервиса и команды (сейчас заглушки) — `content/media.json`, `_photos` в dev показывает список.
2. Дозаполнить `[УТОЧНИТЬ]` в характеристиках, реквизиты, политику конфиденциальности; решить вопросы из раздела 1.
3. Подключить отправку заявок (config.js → booking.send), решить с владельцем куда.
4. Статьи блога (сейчас один черновик).
5. Вычистить мёртвый CSS (`calc.css`, `scene.css` — aurora/HUD/intro__title, `sections.css` — svc/works…) и неиспользуемые `scenes/lib/*`.
6. Публикация: `_deploy/deploy.yml` → `.github/workflows/deploy.yml`, Pages, домен `manlaser.by`.

Работай поэтапно; после каждого этапа сообщай владельцу, что проверить в браузере (ссылка с `?motion=1`). Если что-то неясно — спроси владельца, а не додумывай.

## 8. Карта файлов

```
AGENTS.md / CLAUDE.md   ← это руководство
README.md               ← для владельца
config.js               ← переключатели поведения
build/                  ← генератор страниц (plugin, routes, content, paths)
content/                ← все тексты и данные
assets/logo.svg         ← логотип (знак .logo__mark + буквы .logo__letter): шапка, футер, 3D-вывеска, наклейки на фургоне
public/                 ← favicon, иконки, images/og.jpg
src/templates/          ← layout, components, pages, partials
src/js/                 ← main, core/, ui/, pages/, scenes/ (scroll-scene, truck/, lib/), lib/, fx/
src/css/                ← стили
_source/                ← исходные материалы старого сайта (источник фактов, не трогать)
_deploy/                ← автодеплой (пока не подключён)
```
