from datetime import date

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Pet


def get_pet_or_404(pet_id: int, db: Session = Depends(get_db)) -> Pet:
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    return pet


def age_months(birth: date, today: date | None = None) -> int:
    today = today or date.today()
    months = (today.year - birth.year) * 12 + (today.month - birth.month)
    if today.day < birth.day:
        months -= 1
    return max(0, months)
