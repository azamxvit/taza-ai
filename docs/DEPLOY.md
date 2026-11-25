# Деплой Taza AI (бесплатно)

Схема: **Vercel** (сайт) → **Render** (API на Express) → **MongoDB Atlas** (база) +
**Supabase Storage** (фото). Всё на бесплатных тарифах. Займёт около 40 минут.

> ⚠️ **Render free засыпает.** Если 15 минут никто не заходил, сервер «засыпает», и первый
> запрос после этого идёт **до минуты** (на сайте будет «Сервер просыпается…»). Перед защитой
> откройте сайт за 2–3 минуты, чтобы он проснулся.

Ключи вводите **только в панелях Render и Vercel**, никогда не в код и не в чат.

---

## 0. Код на GitHub

Репозиторий: `https://github.com/azamxvit/taza-ai`. Render и Vercel забирают код оттуда
и пересобирают сайт при каждом `git push` в ветку `main`.

## 1. MongoDB Atlas — база данных

1. Зарегистрируйтесь на <https://www.mongodb.com/cloud/atlas/register> (можно через Google).
2. **Create a cluster** → тариф **M0 (Free)** → провайдер AWS, регион **Frankfurt (eu-central-1)** → Create.
3. **Database Access** → **Add New Database User**: имя `taza`, пароль — кнопка *Autogenerate*,
   **скопируйте пароль**. Роль: *Read and write to any database*.
4. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`).
   У бесплатного Render нет постоянного IP, поэтому иначе он не подключится.
5. **Database** → **Connect** → **Drivers** → скопируйте строку вида
   `mongodb+srv://taza:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   и замените `<db_password>` на пароль из шага 3. Это **MONGODB_URI**.

## 2. Supabase Storage — фото

Диск бесплатного Render стирается при каждом перезапуске (а он перезапускается после сна),
поэтому без этого шага загруженные фото пропадут.

1. Зарегистрируйтесь на <https://supabase.com> → **New project** → регион **Central EU (Frankfurt)**.
   Пароль базы Supabase нам не нужен (используем только хранилище).
2. **Storage** → **New bucket** → имя `photos`, включите **Public bucket** → Create.
3. В настройках Storage найдите **S3 Connection** (Project Settings → Storage):
   - включите S3, скопируйте **Endpoint** → это **S3_ENDPOINT**
     (вида `https://<ref>.supabase.co/storage/v1/s3`);
   - скопируйте **Region** → это **S3_REGION** (например `eu-central-1`);
   - **New access key** → скопируйте **Access key ID** и **Secret access key**
     → это **S3_ACCESS_KEY_ID** и **S3_SECRET_ACCESS_KEY** (секрет показывается один раз).
4. **S3_PUBLIC_URL** = `https://<ref>.supabase.co/storage/v1/object/public/photos`
   (`<ref>` — тот же код проекта, что в Endpoint).

## 3. Render — сервер (API)

1. Зарегистрируйтесь на <https://render.com> **через GitHub**.
2. **New** → **Blueprint** → выберите репозиторий `azamxvit/taza-ai`. Render прочитает `render.yaml`.
3. Render попросит значения секретов. Заполните:

   | Переменная | Значение |
   |---|---|
   | `MONGODB_URI` | строка из шага 1 |
   | `GEMINI_API_KEY` | ваш ключ Gemini (тот же, что в `backend/.env`) |
   | `FIRMS_MAP_KEY` | ваш ключ NASA FIRMS |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | из шага 2 |
   | `CORS_ORIGINS`, `PUBLIC_SITE_URL` | пока `http://localhost:5173`, заменим в шаге 5 |

4. **Apply**. Сборка идёт 3–5 минут. Адрес сервиса будет вида
   `https://taza-ai-api.onrender.com` (если имя занято — с суффиксом).
5. Проверка: откройте `https://<ваш-адрес>.onrender.com/api/health` → должно быть
   `{"ok":true,"mongo":true,...}`. Демо-жалобы не добавляются (`SEED_DEMO=0`); если нужны
   для показа — поставьте `1` или выполните `npm run seed`.

## 4. Vercel — сайт

1. Зарегистрируйтесь на <https://vercel.com> **через GitHub**.
2. **Add New…** → **Project** → **Import** `azamxvit/taza-ai`. Framework определится как **Vite**.
3. **Environment Variables**: `VITE_API_URL` = адрес Render из шага 3 **без слэша в конце**,
   например `https://taza-ai-api.onrender.com`.
4. **Deploy**. Через 1–2 минуты будет адрес вида `https://taza-ai.vercel.app`.

## 5. Связать сайт и сервер

Render → сервис `taza-ai-api` → **Environment**:

- `CORS_ORIGINS` = адрес Vercel, например `https://taza-ai.vercel.app` (без слэша);
- `PUBLIC_SITE_URL` = тот же адрес.

**Save Changes** — Render перезапустит сервис (1–2 минуты).

## 6. Проверка

- Сайт открывается, на карте 12 демо-жалоб.
- «Воздух» показывает AQI, спутниковый слой — тепловые аномалии.
- Новая жалоба с фото: ИИ составляет черновик, после публикации фото открывается
  (адрес фото начинается с `https://<ref>.supabase.co/...`).
- Обращение в eOtinish генерируется, ссылка на карточку ведёт на сайт Vercel.

## Если что-то не работает

| Симптом | Причина |
|---|---|
| «Нет связи с сервером» | Render ещё просыпается (подождите минуту) или неверный `VITE_API_URL` (после исправления — Redeploy в Vercel) |
| В консоли браузера `CORS` | `CORS_ORIGINS` на Render не совпадает с адресом сайта буква в букву |
| `/api/health` → `mongo: false` или ошибка | неверный `MONGODB_URI` или не открыт доступ `0.0.0.0/0` в Atlas |
| Фото пропадают через время | не заданы `S3_*` (в логах Render будет предупреждение `[storage]`) |
| Картинки не грузятся (ошибка 404 на `…supabase.co/…jpg`) | в `S3_PUBLIC_URL` указан только корень проекта. Нужно `https://<ref>.supabase.co/storage/v1/object/public/photos`; при запуске с Atlas и S3 сервер автоматически обновит ссылки на старые демо-иллюстрации |
| ИИ «перегружен» | бесплатный Gemini иногда отвечает 503 — повторите через минуту |

## Лимиты бесплатных тарифов

- **Render**: 750 часов в месяц на аккаунт — хватает на один сервис круглосуточно; сон после 15 минут.
- **Atlas M0**: 512 МБ — тысячи жалоб (фото хранятся не в базе).
- **Supabase**: 1 ГБ хранилища.
- **Gemini free**: ограничение запросов в минуту и в день; данные могут использоваться Google
  для обучения — поэтому мы отправляем только фото и описание проблемы.
- **NASA FIRMS**: 5000 запросов за 10 минут; у нас один запрос раз в 3 часа.
