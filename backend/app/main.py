from datetime import date

import httpx
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import MedicalRecord, Pet
from app.schemas import (
    FeedingNormOut,
    PetCreate,
    PetOut,
    PetUpdate,
    RecordCreate,
    RecordOut,
)

app = FastAPI(title="Pets API")


def age_months(birth: date, today: date | None = None) -> int:
    today = today or date.today()
    months = (today.year - birth.year) * 12 + (today.month - birth.month)
    if today.day < birth.day:
        months -= 1
    return max(0, months)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/pets", response_model=list[PetOut])
def list_pets(db: Session = Depends(get_db)):
    return db.query(Pet).order_by(Pet.id).all()


@app.post("/api/pets", response_model=PetOut, status_code=201)
def create_pet(body: PetCreate, db: Session = Depends(get_db)):
    pet = Pet(**body.model_dump())
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@app.put("/api/pets/{pet_id}", response_model=PetOut)
def update_pet(pet_id: int, body: PetUpdate, db: Session = Depends(get_db)):
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(pet, key, value)
    db.commit()
    db.refresh(pet)
    return pet


@app.delete("/api/pets/{pet_id}", status_code=204)
def delete_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    db.delete(pet)
    db.commit()


@app.get("/api/pets/{pet_id}/records", response_model=list[RecordOut])
def list_records(pet_id: int, db: Session = Depends(get_db)):
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return (
        db.query(MedicalRecord)
        .filter(MedicalRecord.pet_id == pet_id)
        .order_by(MedicalRecord.visit_date)
        .all()
    )


@app.post("/api/pets/{pet_id}/records", response_model=RecordOut, status_code=201)
def create_record(pet_id: int, body: RecordCreate, db: Session = Depends(get_db)):
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    record = MedicalRecord(pet_id=pet_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/pets/{pet_id}/feeding-norm", response_model=FeedingNormOut)
def feeding_norm(pet_id: int, db: Session = Depends(get_db)):
    pet = db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    months = age_months(pet.birth_date)
    payload = {
        "species": pet.species,
        "weight_kg": float(pet.weight_kg),
        "age_months": months,
    }

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(f"{settings.web_service_url}/feeding-norm", json=payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Web service unavailable") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Web service error")

    data = resp.json()
    return FeedingNormOut(
        pet_id=pet.id,
        name=pet.name,
        weight_kg=float(pet.weight_kg),
        age_months=months,
        daily_kcal=data["daily_kcal"],
        daily_grams=data["daily_grams"],
        meals_per_day=data["meals_per_day"],
        life_stage=data["life_stage"],
    )
