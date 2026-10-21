from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_pet_or_404
from app.models import MedicalRecord, Pet
from app.schemas import RecordCreate, RecordOut, RecordUpdate

router = APIRouter(prefix="/api/pets/{pet_id}/records", tags=["records"])


def get_record_or_404(pet_id: int, record_id: int, db: Session) -> MedicalRecord:
    record = db.get(MedicalRecord, record_id)
    if not record or record.pet_id != pet_id:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return record


@router.get("", response_model=list[RecordOut])
def list_records(pet: Pet = Depends(get_pet_or_404), db: Session = Depends(get_db)):
    return (
        db.query(MedicalRecord)
        .filter(MedicalRecord.pet_id == pet.id)
        .order_by(MedicalRecord.visit_date, MedicalRecord.id)
        .all()
    )


@router.post("", response_model=RecordOut, status_code=201)
def create_record(
    body: RecordCreate,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    record = MedicalRecord(pet_id=pet.id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{record_id}", response_model=RecordOut)
def update_record(
    record_id: int,
    body: RecordUpdate,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    record = get_record_or_404(pet.id, record_id, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: int,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    record = get_record_or_404(pet.id, record_id, db)
    db.delete(record)
    db.commit()
