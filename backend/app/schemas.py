from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class PetCreate(BaseModel):
    name: str = Field(..., min_length=1)
    species: str
    breed: str | None = None
    birth_date: date
    weight_kg: float = Field(..., gt=0)
    owner_name: str | None = None

    @field_validator("species")
    @classmethod
    def species_ok(cls, v: str) -> str:
        if v not in ("dog", "cat"):
            raise ValueError("species must be dog or cat")
        return v

    @field_validator("birth_date")
    @classmethod
    def birth_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("birth_date cannot be in the future")
        return v


class PetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    species: str | None = None
    breed: str | None = None
    birth_date: date | None = None
    weight_kg: float | None = Field(None, gt=0)
    owner_name: str | None = None

    @field_validator("species")
    @classmethod
    def species_ok(cls, v: str | None) -> str | None:
        if v is not None and v not in ("dog", "cat"):
            raise ValueError("species must be dog or cat")
        return v

    @field_validator("birth_date")
    @classmethod
    def birth_not_future(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("birth_date cannot be in the future")
        return v


class PetOut(BaseModel):
    id: int
    name: str
    species: str
    breed: str | None
    birth_date: date
    weight_kg: Decimal
    owner_name: str | None

    model_config = {"from_attributes": True}


class PetDetailOut(PetOut):
    age_months: int


class PetListOut(BaseModel):
    items: list[PetOut]
    total: int
    page: int
    page_size: int


def _not_future(v: date) -> date:
    if v > date.today():
        raise ValueError("дата не может быть в будущем")
    return v


class RecordCreate(BaseModel):
    visit_date: date
    diagnosis: str | None = None
    treatment: str | None = None
    vaccination: str | None = None
    notes: str | None = None

    _visit_not_future = field_validator("visit_date")(_not_future)


class RecordUpdate(BaseModel):
    visit_date: date | None = None
    diagnosis: str | None = None
    treatment: str | None = None
    vaccination: str | None = None
    notes: str | None = None

    @field_validator("visit_date")
    @classmethod
    def visit_ok(cls, v: date | None) -> date:
        if v is None:
            raise ValueError("дата приёма обязательна")
        return _not_future(v)


class RecordOut(BaseModel):
    id: int
    pet_id: int
    visit_date: date
    diagnosis: str | None
    treatment: str | None
    vaccination: str | None
    notes: str | None

    model_config = {"from_attributes": True}


class FeedingNormOut(BaseModel):
    pet_id: int
    name: str
    weight_kg: float
    age_months: int
    daily_kcal: int
    daily_grams: int
    meals_per_day: int
    life_stage: str
    rer_kcal: int | None = None
    food_type: str = "dry"


class WaterNormOut(BaseModel):
    pet_id: int
    name: str
    daily_ml: int
    daily_liters: float
    food_type: str


class HumanAgeOut(BaseModel):
    pet_id: int
    name: str
    age_months: int
    human_years: float
    life_stage: str


class VaccinationItem(BaseModel):
    name: str
    due_date: date
    age: str
    status: str


class VaccinationOut(BaseModel):
    pet_id: int
    name: str
    items: list[VaccinationItem]
    next_due: VaccinationItem | None


class MealOut(BaseModel):
    time: str
    grams: int
    kcal: int


class MealPlanOut(BaseModel):
    pet_id: int
    name: str
    meals: list[MealOut]
    meals_per_day: int
    daily_grams: int
    daily_kcal: int


class WeightCreate(BaseModel):
    logged_on: date
    weight_kg: float = Field(..., gt=0, le=999.99)

    _logged_not_future = field_validator("logged_on")(_not_future)


class WeightOut(BaseModel):
    id: int
    pet_id: int
    logged_on: date
    weight_kg: Decimal

    model_config = {"from_attributes": True}


class RecentRecordOut(BaseModel):
    id: int
    pet_id: int
    pet_name: str
    visit_date: date
    diagnosis: str | None
    vaccination: str | None


class StatsOut(BaseModel):
    total_pets: int
    by_species: dict[str, int]
    avg_weight_kg: float | None
    records_total: int
    recent_records: list[RecentRecordOut]
