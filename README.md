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
(данные пропадают после перезапуска). Ключи и настройки — в [`.env.example`](.env.example);
скопируй его в `server/.env` и заполни.

## Стек

- **Язык:** TypeScript (фронт и бэк)
- **Фронтенд:** React 19, Vite 7, React Router 7, Leaflet / react-leaflet, Tailwind v4,
  [shadcn/ui](https://ui.shadcn.com) (Radix), lucide-react, react-i18next
- **Бэкенд:** Node.js, Express, Multer, sharp (запуск через `tsx`)
- **База:** MongoDB Atlas (free M0)
- **Деплой:** Vercel (фронт) + Render (API)

## Структура

```
server/                 Express API на TypeScript (index.ts — точка входа)
  ai/                   Gemini: клиент с запасными моделями, анализ фото (F1), обращение (F2), план по воздуху (F3)
  air/                  Open-Meteo: качество воздуха и ветер для Атырау (F3)
  firms/                NASA FIRMS: тепловые аномалии по Атырауской области (F4)
  cache.ts              кэш в памяти (Open-Meteo 15 мин, FIRMS 3 ч)
src/
  components/
    ui/                 компоненты shadcn/ui (Button, Badge, Card, Drawer, …)
    common/             общие: иконки, бейджи, фильтр категорий, галерея
    layout/             верхняя панель, нижняя навигация, футер, PageLayout
    map/                экран карты, шторка, контролы, маркеры, слои
    reports/            карточка, детали и форма жалобы, обращение, подтверждения
    air/                качество воздуха: AQI, ветер, график 48 ч, ИИ-план
    fires/              слой тепловых аномалий и панель со сводкой
  pages/                страницы «Жалобы», «Воздух», «Статистика», «О проекте»
  context/              общее состояние жалоб (ReportsProvider, useReports)
  hooks/                useMediaQuery, useAir, useFires
  lib/                  API-клиент, категории, форматирование, утилиты
  i18n/                 переводы kk / ru / en
  styles/               tokens.css, base.css (стили семантических тегов), map.css
  types/                общие типы TypeScript
```

В каждой папке есть `index.ts`, импорт идёт через неё: `import { ReportCard } from "@/components/reports"`.

Проверки: `npm run typecheck`, `npm run lint`, `npm run build`.

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

- [x] Порт API 5050 (на macOS 5000 занят AirPlay), секреты в `server/.env`
- [x] Временная MongoDB в памяти для локальной разработки без Atlas
- [x] Тёмная тема и новый дизайн (map-first, glass-карточки, нижняя шторка, кнопка «Сообщить»)
- [x] Карта по центру Атырау, тёмный слой по умолчанию, маркеры с размером и цветом по severity
- [x] Локализация kk / ru / en (react-i18next), шрифт Inter с казахскими буквами
- [x] Эко-категории вместо исходных (свалка, сжигание, нефтепродукты, вода, выбросы, животные, деревья)
- [x] Страницы «Статистика» и «О проекте»
- [x] Переход на TypeScript (фронт и сервер), компоненты shadcn/ui, семантическая вёрстка
- [x] Глобальные стили для семантических тегов без CSS-классов (`src/styles/base.css`)
- [x] Лимит фото 5 МБ и проверка MIME на сервере
- [x] F1: ИИ-анализ жалобы (Gemini, JSON-схема), правка черновика ИИ, режим без ИИ, лимит 10 запросов/мин
- [x] F2: черновик обращения в eOtinish (ru/kk), статусы, подтверждение устранения тремя жителями с фото «после»
- [x] F3: качество воздуха и ветер (Open-Meteo, кэш 15 мин), график US AQI на 48 ч, личный ИИ-план
- [x] F4: спутниковые тепловые аномалии NASA FIRMS (VIIRS, 7 дней, кэш 3 ч) слоем на карте и недельная ИИ-сводка
- [ ] Демо-данные, деплой, материалы для защиты

Спорные технические решения записаны в [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Лицензия

MIT — см. [`LICENSE`](LICENSE).
