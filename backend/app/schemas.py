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


class RecordCreate(BaseModel):
    visit_date: date
    diagnosis: str | None = None
    treatment: str | None = None
    vaccination: str | None = None
    notes: str | None = None


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
