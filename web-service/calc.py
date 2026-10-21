import calendar
import re
from datetime import date, timedelta

SPECIES = ("dog", "cat")
ACTIVITY_K = {"low": 0.85, "normal": 1.0, "high": 1.2}
FOOD_TYPES = ("dry", "wet", "mixed")
# ккал на 1 г корма: сухой ~350 ккал/100 г, влажный ~90 ккал/100 г
KCAL_PER_GRAM = {"dry": 3.5, "wet": 0.9}
# доля питьевой воды относительно рациона на сухом корме
WATER_FACTOR = {"dry": 1.0, "mixed": 0.8, "wet": 0.6}
WATER_ML_PER_KG = {"dog": 60, "cat": 50}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _check(species: str, weight_kg: float | None, age_months: int) -> None:
    if species not in SPECIES:
        raise ValueError("unknown species")
    if weight_kg is not None and weight_kg <= 0:
        raise ValueError("weight must be > 0")
    if age_months < 0:
        raise ValueError("age must be >= 0")


def _check_food(food_type: str) -> None:
    if food_type not in FOOD_TYPES:
        raise ValueError("unknown food type")


def life_stage_and_k(species: str, age_months: int) -> tuple[str, float]:
    if species == "dog":
        if age_months < 4:
            return "щенок", 3.0
        if age_months < 12:
            return "щенок", 2.0
        if age_months < 84:
            return "взрослый", 1.6
        return "пожилой", 1.2
    if age_months < 12:
        return "котёнок", 2.5
    if age_months < 84:
        return "взрослый", 1.2
    return "пожилой", 1.1


def meals_for_age(age_months: int) -> int:
    if age_months < 4:
        return 4
    if age_months < 12:
        return 3
    return 2


def food_grams(kcal: float, food_type: str) -> int:
    if food_type == "mixed":
        half = kcal / 2
        return round(half / KCAL_PER_GRAM["dry"] + half / KCAL_PER_GRAM["wet"])
    return round(kcal / KCAL_PER_GRAM[food_type])


def calculate(
    species: str,
    weight_kg: float,
    age_months: int,
    neutered: bool = False,
    activity: str = "normal",
    food_type: str = "dry",
) -> dict:
    """Норма кормления по весу и возрасту (с поправками для взрослых)."""
    _check(species, weight_kg, age_months)
    _check_food(food_type)
    if activity not in ACTIVITY_K:
        raise ValueError("unknown activity")

    life_stage, k = life_stage_and_k(species, age_months)
    # кастрация и активность учитываем только у взрослых животных
    if age_months >= 12:
        if neutered:
            k *= 0.9
        k *= ACTIVITY_K[activity]

    rer = 70 * (weight_kg**0.75)
    daily_kcal = round(rer * k)
    return {
        "daily_kcal": daily_kcal,
        "daily_grams": food_grams(daily_kcal, food_type),
        "meals_per_day": meals_for_age(age_months),
        "life_stage": life_stage,
        "rer_kcal": round(rer),
        "food_type": food_type,
    }


def water_norm(species: str, weight_kg: float, food_type: str = "dry") -> dict:
    """Суточная потребность в питьевой воде."""
    _check(species, weight_kg, 0)
    _check_food(food_type)
    ml = round(weight_kg * WATER_ML_PER_KG[species] * WATER_FACTOR[food_type])
    return {"daily_ml": ml, "daily_liters": round(ml / 1000, 2), "food_type": food_type}


def human_age(species: str, age_months: int, weight_kg: float | None = None) -> dict:
    """Возраст питомца в пересчёте на человеческие годы."""
    _check(species, weight_kg, age_months)
    years = age_months / 12
    total = 15 * min(years, 1) + 9 * min(max(years - 1, 0), 1)
    if years > 2:
        if species == "cat":
            per_year = 4
        elif weight_kg is None or weight_kg <= 25:
            per_year = 4 if weight_kg is not None and weight_kg < 10 else 5
        else:
            per_year = 6
        total += (years - 2) * per_year
    stage, _ = life_stage_and_k(species, age_months)
    return {"human_years": round(total, 1), "life_stage": stage}


def _add_months(d: date, months: int) -> date:
    index = d.year * 12 + d.month - 1 + months
    year, month = divmod(index, 12)
    month += 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _status(due: date, today: date) -> str:
    if due < today:
        return "past"
    if due <= today + timedelta(days=30):
        return "soon"
    return "later"


def vaccination_schedule(species: str, birth_date: date, today: date | None = None) -> dict:
    """Рекомендуемый календарь вакцинации (ориентировочный)."""
    if species not in SPECIES:
        raise ValueError("unknown species")
    today = today or date.today()
    if birth_date > today:
        raise ValueError("birth date is in the future")

    core = "DHPPi" if species == "dog" else "FVRCP"
    plan = [
        (f"Комплексная ({core}), 1-я доза", birth_date + timedelta(weeks=8), "8 недель"),
        (f"Комплексная ({core}), 2-я доза", birth_date + timedelta(weeks=12), "12 недель"),
        ("Бешенство", birth_date + timedelta(weeks=12), "12 недель"),
        ("Ревакцинация (комплексная и бешенство)", _add_months(birth_date, 12), "12 месяцев"),
    ]
    # ежегодная ревакцинация: ближайшая годовщина, начиная со 2-го года
    years = 2
    annual = _add_months(birth_date, 12 * years)
    while annual < today:
        years += 1
        annual = _add_months(birth_date, 12 * years)
    plan.append(("Ежегодная ревакцинация", annual, f"{years} г."))

    items = [
        {"name": name, "due_date": due.isoformat(), "age": label, "status": _status(due, today)}
        for name, due, label in plan
    ]
    items.sort(key=lambda i: i["due_date"])
    upcoming = next((i for i in items if i["status"] != "past"), None)
    return {"items": items, "next_due": upcoming}


def meal_plan(
    species: str,
    weight_kg: float,
    age_months: int,
    first_meal: str = "08:00",
    last_meal: str = "20:00",
    neutered: bool = False,
    activity: str = "normal",
    food_type: str = "dry",
) -> dict:
    """Расписание кормлений: порции равномерно между первым и последним приёмом."""
    if not TIME_RE.match(first_meal) or not TIME_RE.match(last_meal):
        raise ValueError("time must be HH:MM")
    start = int(first_meal[:2]) * 60 + int(first_meal[3:])
    end = int(last_meal[:2]) * 60 + int(last_meal[3:])
    if end <= start:
        raise ValueError("last meal must be later than first")

    norm = calculate(species, weight_kg, age_months, neutered, activity, food_type)
    n = norm["meals_per_day"]
    step = (end - start) / (n - 1)
    meals = []
    for i in range(n):
        minutes = round(start + step * i)
        meals.append(
            {
                "time": f"{minutes // 60:02d}:{minutes % 60:02d}",
                "grams": round(norm["daily_grams"] / n),
                "kcal": round(norm["daily_kcal"] / n),
            }
        )
    return {
        "meals": meals,
        "meals_per_day": n,
        "daily_grams": norm["daily_grams"],
        "daily_kcal": norm["daily_kcal"],
    }
