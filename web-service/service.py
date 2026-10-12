from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="Feeding Norm Service")


def calculate(species: str, weight_kg: float, age_months: int) -> dict:
    """Норма кормления по весу и возрасту."""
    if species not in ("dog", "cat"):
        raise ValueError("unknown species")
    if weight_kg <= 0:
        raise ValueError("weight must be > 0")
    if age_months < 0:
        raise ValueError("age must be >= 0")

    if species == "dog":
        if age_months < 4:
            life_stage, k = "щенок", 3.0
        elif age_months < 12:
            life_stage, k = "щенок", 2.0
        elif age_months < 84:
            life_stage, k = "взрослый", 1.6
        else:
            life_stage, k = "пожилой", 1.2
    else:
        if age_months < 12:
            life_stage, k = "котёнок", 2.5
        elif age_months < 84:
            life_stage, k = "взрослый", 1.2
        else:
            life_stage, k = "пожилой", 1.1

    rer = 70 * (weight_kg**0.75)
    daily_kcal = round(rer * k)
    daily_grams = round(daily_kcal / 3.5)

    if age_months < 4:
        meals_per_day = 4
    elif age_months < 12:
        meals_per_day = 3
    else:
        meals_per_day = 2

    return {
        "daily_kcal": daily_kcal,
        "daily_grams": daily_grams,
        "meals_per_day": meals_per_day,
        "life_stage": life_stage,
    }


class FeedingRequest(BaseModel):
    species: str
    weight_kg: float = Field(..., gt=0)
    age_months: int = Field(..., ge=0)

    @field_validator("species")
    @classmethod
    def species_ok(cls, v: str) -> str:
        if v not in ("dog", "cat"):
            raise ValueError("species must be dog or cat")
        return v


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/feeding-norm")
def feeding_norm(body: FeedingRequest):
    return calculate(body.species, body.weight_kg, body.age_months)
