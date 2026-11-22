# Taza AI

**Taza AI** («таза» — «чистый» по-казахски) — гражданская эко-платформа для Атырау.
Житель фотографирует экологическую проблему, ИИ помогает её описать и доводит
человека от «увидел проблему» до готового текста официального обращения в eOtinish.

> Учебный проект по экологии. Построен поверх опенсорс-проекта CleanCity (MIT),
> см. раздел [«Основано на»](#основано-на).

## Быстрый старт (локально)

```bash
npm install
npm run dev        # API → http://localhost:5050, сайт → http://localhost:5173
```

Без `MONGODB_URI` сервер в режиме разработки сам поднимает временную MongoDB в памяти
(данные пропадают после перезапуска) и добавляет 12 демо-жалоб. Ключи и настройки — в [`.env.example`](.env.example);
скопируй его в `backend/.env` и заполни.

## Стек

- **Язык:** TypeScript (фронт и бэк)
- **Фронтенд:** React 19, Vite 7, React Router 7, Leaflet / react-leaflet, Tailwind v4,
  [shadcn/ui](https://ui.shadcn.com) (Radix), lucide-react, react-i18next
- **Бэкенд:** Node.js, Express, Multer, sharp (запуск через `tsx`)
- **База:** MongoDB Atlas (free M0)
- **Деплой:** Vercel (фронт) + Render (API)

## Структура

Два пакета в одном репозитории (npm workspaces): сайт и API независимы, у каждого свой `package.json`.

```
frontend/               сайт: React + Vite (деплой на Vercel)
  src/
    components/
      ui/               компоненты shadcn/ui (Button, Badge, Card, Drawer, …)
      common/           общие: иконки, бейджи, фильтр категорий, галерея
      layout/           верхняя панель, нижняя навигация, футер, PageLayout
      map/              экран карты, шторка, контролы, маркеры, слои
      reports/          карточка, детали и форма жалобы, обращение, подтверждения
      air/              качество воздуха: AQI, ветер, график 48 ч, ИИ-план
      fires/            слой тепловых аномалий и панель со сводкой
    pages/              страницы «Жалобы», «Воздух», «Статистика», «О проекте»
    context/            общее состояние жалоб (ReportsProvider, useReports)
    hooks/              useMediaQuery, useAir, useFires, useSlow
    lib/                API-клиент, категории, форматирование, утилиты
    i18n/               переводы kk / ru / en
    styles/             tokens.css, base.css (стили семантических тегов), map.css
    types/              общие типы TypeScript
  public/               favicon
backend/                API: Express на TypeScript (деплой на Render)
  index.ts              точка входа и маршруты
  ai/                   Gemini: клиент с запасными моделями, анализ фото (F1), обращение (F2), план по воздуху (F3)
  air/                  Open-Meteo: качество воздуха и ветер для Атырау (F3)
  firms/                NASA FIRMS: тепловые аномалии по Атырауской области (F4)
  seed/                 демо-жалобы и рисунки к ним
  cache.ts              кэш в памяти (Open-Meteo 15 мин, FIRMS 3 ч)
docs/                   DEPLOY.md, DECISIONS.md
render.yaml, vercel.json  конфиги деплоя
```

Команды запускаются из корня репозитория: `npm run dev` (оба пакета вместе), `npm run build`
(сайт), `npm run server` (API), `npm run seed`. Каждый пакет можно запускать и отдельно:
`npm run dev -w frontend`, `npm run dev -w backend`.

В каждой папке есть `index.ts`, импорт идёт через неё: `import { ReportCard } from "@/components/reports"`.

Проверки: `npm run typecheck`, `npm run lint`, `npm run build`.

### Демо-данные

12 придуманных жалоб с пометкой «Демо» (места условные, вместо фото — рисунки).
Локально появляются сами. Для настоящей базы (Atlas):

```bash
npm run seed              # добавить, если их ещё нет
npm run seed -- --reset   # пересоздать
npm run seed -- --remove  # удалить
```

## Деплой (бесплатно)

**Vercel** (сайт) + **Render** (API) + **MongoDB Atlas** (база) + **Supabase Storage** (фото).
Пошаговая инструкция с регистрацией — в [`docs/DEPLOY.md`](docs/DEPLOY.md).

> ⚠️ **Бесплатный Render засыпает** после 15 минут без запросов. Первый запрос после сна
> идёт до минуты — сайт показывает «Сервер просыпается…». Перед показом откройте сайт заранее.
> Диск Render тоже бесплатный и временный, поэтому фото хранятся в Supabase Storage.

| Где | Переменные |
|---|---|
| Render | `MONGODB_URI`, `GEMINI_API_KEY`, `FIRMS_MAP_KEY`, `CORS_ORIGINS`, `PUBLIC_SITE_URL`, `S3_*` (остальное задаёт `render.yaml`) |
| Vercel | `VITE_API_URL` — адрес сервиса Render без слэша в конце |

## Данные

- Качество воздуха и погода: [Open-Meteo.com](https://open-meteo.com/) (модель
  [Copernicus CAMS](https://atmosphere.copernicus.eu/)), лицензия
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Тепловые аномалии: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (VIIRS 375 м NRT, LANCE/ESDIS)
- Карта: © участники [OpenStreetMap](https://www.openstreetmap.org/copyright)

## Основано на

Этот проект — доработка **CleanCity** от [Robibiruk](https://github.com/Robibiruk):
<https://github.com/Robibiruk/clean-city>, лицензия **MIT**.
В README оригинала заявлена MIT, но файла лицензии не было — он добавлен в [`LICENSE`](LICENSE)
с копирайтом оригинального автора.

Первый коммит репозитория (`chore: import CleanCity source`) — это исходный код CleanCity
без изменений, поэтому всё, что добавлено поверх, видно в истории git.

**Взято из CleanCity:** карта на Leaflet с маркерами, форма жалобы с загрузкой до 5 фото
и сжатием, лента жалоб с фильтрами, «я тоже это вижу», статистика, Express API
с MongoDB, хранилище фото (диск или S3), конфиги Vercel и Render.

**Мои доработки:**

- [x] Порт API 5050 (на macOS 5000 занят AirPlay), секреты в `backend/.env`
- [x] Временная MongoDB в памяти для локальной разработки без Atlas
- [x] Тёмная тема и новый дизайн (map-first, glass-карточки, нижняя шторка, кнопка «Сообщить»)
- [x] Карта по центру Атырау, тёмный слой по умолчанию, маркеры с размером и цветом по severity
- [x] Локализация kk / ru / en (react-i18next), шрифт Inter с казахскими буквами
- [x] Эко-категории вместо исходных (свалка, сжигание, нефтепродукты, вода, выбросы, животные, деревья)
- [x] Страницы «Статистика» и «О проекте»
- [x] Переход на TypeScript (фронт и сервер), компоненты shadcn/ui, семантическая вёрстка
- [x] Глобальные стили для семантических тегов без CSS-классов (`frontend/src/styles/base.css`)
- [x] Лимит фото 5 МБ и проверка MIME на сервере
- [x] F1: ИИ-анализ жалобы (Gemini, JSON-схема), правка черновика ИИ, режим без ИИ, лимит 10 запросов/мин
- [x] F2: черновик обращения в eOtinish (ru/kk), статусы, подтверждение устранения тремя жителями с фото «после»
- [x] F3: качество воздуха и ветер (Open-Meteo, кэш 15 мин), график US AQI на 48 ч, личный ИИ-план
- [x] F4: спутниковые тепловые аномалии NASA FIRMS (VIIRS, 7 дней, кэш 3 ч) слоем на карте и недельная ИИ-сводка
- [x] Доработка: демо-данные, состояния загрузки и ошибок, «сервер просыпается», проверка kk/en, страница «О проекте»
- [x] Конфиги деплоя: `render.yaml`, `vercel.json` (CSP), инструкция `docs/DEPLOY.md`
- [ ] Материалы для защиты

Спорные технические решения записаны в [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Лицензия

MIT — см. [`LICENSE`](LICENSE).
