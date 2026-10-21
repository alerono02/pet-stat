from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app import web_service
from app.deps import age_months, get_pet_or_404
from app.models import Pet
from app.schemas import HumanAgeOut, MealPlanOut, VaccinationOut, WaterNormOut

router = APIRouter(prefix="/api/pets/{pet_id}", tags=["care"])

FoodType = Literal["dry", "wet", "mixed"]
Activity = Literal["low", "normal", "high"]
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


@router.get("/water-norm", response_model=WaterNormOut)
def water_norm(pet: Pet = Depends(get_pet_or_404), food_type: FoodType = "dry"):
    data = web_service.call(
        "/water-norm",
        {"species": pet.species, "weight_kg": float(pet.weight_kg), "food_type": food_type},
    )
    return WaterNormOut(pet_id=pet.id, name=pet.name, **data)


@router.get("/human-age", response_model=HumanAgeOut)
def human_age(pet: Pet = Depends(get_pet_or_404)):
    months = age_months(pet.birth_date)
    data = web_service.call(
        "/human-age",
        {"species": pet.species, "age_months": months, "weight_kg": float(pet.weight_kg)},
    )
    return HumanAgeOut(pet_id=pet.id, name=pet.name, age_months=months, **data)


@router.get("/vaccination-schedule", response_model=VaccinationOut)
def vaccination_schedule(pet: Pet = Depends(get_pet_or_404)):
    data = web_service.call(
        "/vaccination-schedule",
        {"species": pet.species, "birth_date": pet.birth_date.isoformat()},
    )
    return VaccinationOut(pet_id=pet.id, name=pet.name, **data)


@router.get("/meal-plan", response_model=MealPlanOut)
def meal_plan(
    pet: Pet = Depends(get_pet_or_404),
    first_meal: str = Query("08:00", pattern=TIME_PATTERN),
    last_meal: str = Query("20:00", pattern=TIME_PATTERN),
    neutered: bool = False,
    activity: Activity = "normal",
    food_type: FoodType = "dry",
):
    if last_meal <= first_meal:
        raise HTTPException(status_code=422, detail="Последний приём должен быть позже первого")
    data = web_service.call(
        "/meal-plan",
        {
            "species": pet.species,
            "weight_kg": float(pet.weight_kg),
            "age_months": age_months(pet.birth_date),
            "first_meal": first_meal,
            "last_meal": last_meal,
            "neutered": neutered,
            "activity": activity,
            "food_type": food_type,
        },
    )
    return MealPlanOut(pet_id=pet.id, name=pet.name, **data)
