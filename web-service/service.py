from datetime import date
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import calc
from calc import calculate

app = FastAPI(title="Pet Care Service")

Species = Literal["dog", "cat"]
FoodType = Literal["dry", "wet", "mixed"]
Activity = Literal["low", "normal", "high"]


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


class FeedingRequest(BaseModel):
    species: Species
    weight_kg: float = Field(..., gt=0)
    age_months: int = Field(..., ge=0)
    neutered: bool = False
    activity: Activity = "normal"
    food_type: FoodType = "dry"


class WaterRequest(BaseModel):
    species: Species
    weight_kg: float = Field(..., gt=0)
    food_type: FoodType = "dry"


class HumanAgeRequest(BaseModel):
    species: Species
    age_months: int = Field(..., ge=0)
    weight_kg: float | None = Field(None, gt=0)


class VaccinationRequest(BaseModel):
    species: Species
    birth_date: date
    today: date | None = None


class MealPlanRequest(FeedingRequest):
    first_meal: str = "08:00"
    last_meal: str = "20:00"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/feeding-norm")
def feeding_norm(body: FeedingRequest):
    return calculate(
        body.species,
        body.weight_kg,
        body.age_months,
        body.neutered,
        body.activity,
        body.food_type,
    )


@app.post("/water-norm")
def water_norm(body: WaterRequest):
    return calc.water_norm(body.species, body.weight_kg, body.food_type)


@app.post("/human-age")
def human_age(body: HumanAgeRequest):
    return calc.human_age(body.species, body.age_months, body.weight_kg)


@app.post("/vaccination-schedule")
def vaccination_schedule(body: VaccinationRequest):
    return calc.vaccination_schedule(body.species, body.birth_date, body.today)


@app.post("/meal-plan")
def meal_plan(body: MealPlanRequest):
    return calc.meal_plan(
        body.species,
        body.weight_kg,
        body.age_months,
        body.first_meal,
        body.last_meal,
        body.neutered,
        body.activity,
        body.food_type,
    )
