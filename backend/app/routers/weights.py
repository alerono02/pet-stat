from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_pet_or_404
from app.models import Pet, WeightLog
from app.routers.pets import sync_pet_weight
from app.schemas import WeightCreate, WeightOut

router = APIRouter(prefix="/api/pets/{pet_id}/weights", tags=["weights"])


@router.get("", response_model=list[WeightOut])
def list_weights(pet: Pet = Depends(get_pet_or_404), db: Session = Depends(get_db)):
    return (
        db.query(WeightLog)
        .filter(WeightLog.pet_id == pet.id)
        .order_by(WeightLog.logged_on, WeightLog.id)
        .all()
    )


@router.post("", response_model=WeightOut, status_code=201)
def add_weight(
    body: WeightCreate,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    log = WeightLog(pet_id=pet.id, **body.model_dump())
    db.add(log)
    db.flush()
    sync_pet_weight(db, pet)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{weight_id}", status_code=204)
def delete_weight(
    weight_id: int,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    log = db.get(WeightLog, weight_id)
    if not log or log.pet_id != pet.id:
        raise HTTPException(status_code=404, detail="Запись веса не найдена")
    db.delete(log)
    db.flush()
    sync_pet_weight(db, pet)
    db.commit()
