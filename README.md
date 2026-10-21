# Учёт домашних животных

Лабораторная работа: многокомпонентное приложение для учёта питомцев, медкарты, дневника веса и расчёта нормы кормления.

## Архитектура

```
Browser -> frontend (nginx:80, React)
              | /api
           backend (FastAPI:8000)
              |-- SQL --> db (postgres:16)
              \-- HTTP --> web-service (FastAPI:8001)
```

Все сервисы в одной bridge-сети Docker Compose. Наружу открыт только frontend: `3000:80`.

## Сервисы

| Сервис | Порт внутри | Назначение |
|---|---|---|
| frontend | 80 | SPA (React) + nginx-прокси `/api` |
| backend | 8000 | REST API питомцев, медкарты, дневника веса и статистики |
| web-service | 8001 | Расчёты: кормление, вода, возраст, вакцинация, расписание |
| db | 5432 | PostgreSQL 16 |

## Запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Приложение: http://localhost:3000

Страницы:
- `/` — главная: статистика, состав по видам, последние приёмы
- `/pets` — список питомцев: поиск, фильтр по виду, сортировка, пагинация, добавление
- `/pets/:id` — карточка питомца: редактирование, медкарта (добавление, правка, удаление), дневник веса с графиком, расчёт нормы кормления (тип корма, активность, стерилизация), вкладка «Уход» (возраст в человеческих годах, календарь вакцинации)
- `/feeding` — расчёт нормы кормления для выбранного питомца

Если база уже создана по старой схеме, недостающая таблица `weight_logs` создаётся backend при старте. Чтобы получить новые тестовые данные, пересоздайте volume: `docker compose down -v`.

Остановка:

```bash
docker compose down        # остановить контейнеры
docker compose down -v     # остановить и удалить volume с данными
```

## Эндпоинты

**backend**

- `GET /api/health`
- `GET /api/stats` — сводка для главной страницы
- `GET /api/pets` — параметры `q`, `species`, `sort` (`name|age|weight|id`), `order`, `page`, `page_size`; ответ `{items, total, page, page_size}`
- `POST /api/pets`
- `GET /api/pets/{id}`
- `PUT /api/pets/{id}`
- `DELETE /api/pets/{id}`
- `GET /api/pets/{id}/records`
- `POST /api/pets/{id}/records`
- `PUT /api/pets/{id}/records/{record_id}`
- `DELETE /api/pets/{id}/records/{record_id}`
- `GET /api/pets/{id}/weights`
- `POST /api/pets/{id}/weights` — текущий вес питомца берётся из последней записи
- `DELETE /api/pets/{id}/weights/{weight_id}`
- `GET /api/pets/{id}/feeding-norm` — параметры `food_type` (`dry|wet|mixed`), `activity` (`low|normal|high`), `neutered`
- `GET /api/pets/{id}/water-norm` — параметр `food_type`
- `GET /api/pets/{id}/human-age`
- `GET /api/pets/{id}/vaccination-schedule`
- `GET /api/pets/{id}/meal-plan` — параметры `first_meal`, `last_meal` (`HH:MM`) и те же, что у `feeding-norm`

**web-service**

- `GET /health`
- `POST /feeding-norm` — тело: `{species, weight_kg, age_months, neutered?, activity?, food_type?}`
- `POST /water-norm` — `{species, weight_kg, food_type?}`
- `POST /human-age` — `{species, age_months, weight_kg?}`
- `POST /vaccination-schedule` — `{species, birth_date}`
- `POST /meal-plan` — как `feeding-norm` плюс `first_meal?`, `last_meal?`

## Формула кормления

- RER = 70 · weight_kg^0.75
- daily_kcal = round(RER · k)
- daily_grams = round(daily_kcal / 3.5) (сухой корм ≈ 350 ккал/100 г)

Поправки для взрослых (от 12 мес.): стерилизация ×0.9, активность низкая ×0.85 / высокая ×1.2. Тип корма меняет граммы: сухой 350 ккал/100 г, влажный 90 ккал/100 г, смешанный — половина ккал на каждый.

Коэффициент k зависит от вида и возраста (стадия жизни: щенок/котёнок, взрослый, пожилой). Число приёмов пищи: младше 4 мес. — 4; младше 12 — 3; иначе 2.

## Тесты

```bash
cd backend && pip install -r requirements.txt && python -m pytest
cd web-service && pip install -r requirements.txt && python -m pytest
```

## Структура репозитория

```
docker-compose.yml
.env.example
.gitignore
README.md
frontend/     # React + Vite → nginx
backend/      # FastAPI + SQLAlchemy
web-service/  # FastAPI, расчёт нормы
db/init.sql   # схема и seed-данные
```
