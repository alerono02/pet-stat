# Учёт домашних животных

Лабораторная работа: многокомпонентное приложение для учёта питомцев, медкарты и расчёта нормы кормления.

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
| backend | 8000 | REST API питомцев и медкарты |
| web-service | 8001 | Расчёт нормы кормления |
| db | 5432 | PostgreSQL 16 |

## Запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Приложение: http://localhost:3000

Страницы:
- `/` — питомцы и медкарта
- `/feeding` — расчёт нормы кормления

Остановка:

```bash
docker compose down        # остановить контейнеры
docker compose down -v     # остановить и удалить volume с данными
```

## Эндпоинты

**backend**

- `GET /api/health`
- `GET /api/pets`
- `POST /api/pets`
- `PUT /api/pets/{id}`
- `DELETE /api/pets/{id}`
- `GET /api/pets/{id}/records`
- `POST /api/pets/{id}/records`
- `GET /api/pets/{id}/feeding-norm`

**web-service**

- `GET /health`
- `POST /feeding-norm` — тело: `{species, weight_kg, age_months}`

## Формула кормления

- RER = 70 · weight_kg^0.75
- daily_kcal = round(RER · k)
- daily_grams = round(daily_kcal / 3.5) (сухой корм ≈ 350 ккал/100 г)

Коэффициент k зависит от вида и возраста (стадия жизни: щенок/котёнок, взрослый, пожилой). Число приёмов пищи: младше 4 мес. — 4; младше 12 — 3; иначе 2.

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
