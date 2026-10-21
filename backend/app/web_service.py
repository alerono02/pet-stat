import httpx
from fastapi import HTTPException

from app.config import settings


def call(path: str, payload: dict) -> dict:
    """POST к web-сервису; недоступность и ошибки превращаем в 502."""
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(f"{settings.web_service_url}{path}", json=payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Web service unavailable") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Web service error")
    return resp.json()
