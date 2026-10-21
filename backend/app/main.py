from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.routers import care, pets, records, stats, weights


@asynccontextmanager
async def lifespan(_: FastAPI):
    # добавляет недостающие таблицы, если база создана по старой схеме
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Pets API", lifespan=lifespan)

app.include_router(pets.router)
app.include_router(records.router)
app.include_router(weights.router)
app.include_router(stats.router)
app.include_router(care.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
