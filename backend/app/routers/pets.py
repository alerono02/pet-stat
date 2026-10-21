from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import web_service
from app.database import get_db
from app.deps import age_months, get_pet_or_404
from app.models import Pet, WeightLog
from app.schemas import (
    FeedingNormOut,
    PetCreate,
    PetDetailOut,
    PetListOut,
    PetOut,
    PetUpdate,
)

router = APIRouter(prefix="/api/pets", tags=["pets"])


def sync_pet_weight(db: Session, pet: Pet) -> None:
    """Текущий вес питомца = последняя запись дневника."""
    latest = (
        db.query(WeightLog)
        .filter(WeightLog.pet_id == pet.id)
        .order_by(WeightLog.logged_on.desc(), WeightLog.id.desc())
        .first()
    )
    if latest:
        pet.weight_kg = latest.weight_kg


@router.get("", response_model=PetListOut)
def list_pets(
    q: str | None = Query(None, max_length=100),
    species: Literal["dog", "cat"] | None = None,
    sort: Literal["name", "age", "weight", "id"] = "id",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Pet)
    if species:
        query = query.filter(Pet.species == species)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Pet.name).like(like),
                func.lower(func.coalesce(Pet.owner_name, "")).like(like),
                func.lower(func.coalesce(Pet.breed, "")).like(like),
            )
        )
    total = query.count()

    if sort == "age":
        # старше = раньше родился
        column = Pet.birth_date
        desc = order == "asc"
    else:
        column = {"name": func.lower(Pet.name), "weight": Pet.weight_kg, "id": Pet.id}[sort]
        desc = order == "desc"
    ordering = column.desc() if desc else column.asc()
    items = (
        query.order_by(ordering, Pet.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PetListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=PetOut, status_code=201)
def create_pet(body: PetCreate, db: Session = Depends(get_db)):
    pet = Pet(**body.model_dump())
    db.add(pet)
    db.flush()
    db.add(WeightLog(pet_id=pet.id, logged_on=date.today(), weight_kg=pet.weight_kg))
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetDetailOut)
def get_pet(pet: Pet = Depends(get_pet_or_404)):
    return PetDetailOut(
        **PetOut.model_validate(pet).model_dump(),
        age_months=age_months(pet.birth_date),
    )


@router.put("/{pet_id}", response_model=PetOut)
def update_pet(
    body: PetUpdate,
    pet: Pet = Depends(get_pet_or_404),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    new_weight = data.get("weight_kg")
    weight_changed = new_weight is not None and float(pet.weight_kg) != new_weight
    for key, value in data.items():
        setattr(pet, key, value)
    if weight_changed:
        db.add(WeightLog(pet_id=pet.id, logged_on=date.today(), weight_kg=new_weight))
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=204)
def delete_pet(pet: Pet = Depends(get_pet_or_404), db: Session = Depends(get_db)):
    db.delete(pet)
    db.commit()


@router.get("/{pet_id}/feeding-norm", response_model=FeedingNormOut)
def feeding_norm(
    pet: Pet = Depends(get_pet_or_404),
    neutered: bool = False,
    activity: Literal["low", "normal", "high"] = "normal",
    food_type: Literal["dry", "wet", "mixed"] = "dry",
):
    months = age_months(pet.birth_date)
    data = web_service.call(
        "/feeding-norm",
        {
            "species": pet.species,
            "weight_kg": float(pet.weight_kg),
            "age_months": months,
            "neutered": neutered,
            "activity": activity,
            "food_type": food_type,
        },
    )
    return FeedingNormOut(
        pet_id=pet.id,
        name=pet.name,
        weight_kg=float(pet.weight_kg),
        age_months=months,
        **{k: data[k] for k in ("daily_kcal", "daily_grams", "meals_per_day", "life_stage")},
        rer_kcal=data.get("rer_kcal"),
        food_type=data.get("food_type", food_type),
    )
