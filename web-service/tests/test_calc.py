from datetime import date

import pytest
from fastapi.testclient import TestClient

import calc
from service import app

client = TestClient(app)


# --- норма кормления: поправки ---


def test_defaults_match_basic_norm():
    base = calc.calculate("dog", 10.0, 24)
    same = calc.calculate("dog", 10.0, 24, False, "normal", "dry")
    assert base == same
    assert base["daily_grams"] == round(base["daily_kcal"] / 3.5)


def test_neutered_adult_eats_less():
    assert calc.calculate("cat", 4.0, 24, neutered=True)["daily_kcal"] < calc.calculate(
        "cat", 4.0, 24
    )["daily_kcal"]


def test_activity_changes_adult_norm():
    low = calc.calculate("dog", 10.0, 24, activity="low")["daily_kcal"]
    normal = calc.calculate("dog", 10.0, 24)["daily_kcal"]
    high = calc.calculate("dog", 10.0, 24, activity="high")["daily_kcal"]
    assert low < normal < high


def test_puppy_ignores_neutered_and_activity():
    plain = calc.calculate("dog", 5.0, 3)
    tuned = calc.calculate("dog", 5.0, 3, neutered=True, activity="low")
    assert plain["daily_kcal"] == tuned["daily_kcal"]


def test_wet_food_needs_more_grams_than_dry():
    dry = calc.calculate("cat", 4.0, 24, food_type="dry")
    wet = calc.calculate("cat", 4.0, 24, food_type="wet")
    mixed = calc.calculate("cat", 4.0, 24, food_type="mixed")
    assert dry["daily_kcal"] == wet["daily_kcal"] == mixed["daily_kcal"]
    assert dry["daily_grams"] < mixed["daily_grams"] < wet["daily_grams"]


def test_feeding_unknown_options_rejected():
    with pytest.raises(ValueError):
        calc.calculate("dog", 5, 12, activity="extreme")
    with pytest.raises(ValueError):
        calc.calculate("dog", 5, 12, food_type="bones")


# --- вода ---


def test_water_scales_with_weight_and_food():
    assert calc.water_norm("dog", 10)["daily_ml"] == 600
    assert calc.water_norm("cat", 4)["daily_ml"] == 200
    assert calc.water_norm("cat", 4, "wet")["daily_ml"] < 200
    assert calc.water_norm("dog", 10)["daily_liters"] == 0.6


# --- возраст в человеческих годах ---


def test_human_age_known_points():
    assert calc.human_age("cat", 12)["human_years"] == 15.0
    assert calc.human_age("cat", 24)["human_years"] == 24.0
    assert calc.human_age("cat", 72)["human_years"] == 40.0
    assert calc.human_age("dog", 0)["human_years"] == 0.0


def test_human_age_dog_size_matters():
    small = calc.human_age("dog", 96, 5)["human_years"]
    large = calc.human_age("dog", 96, 40)["human_years"]
    assert small < large


# --- вакцинация ---


def test_vaccination_puppy_statuses():
    today = date(2026, 10, 21)
    res = calc.vaccination_schedule("dog", date(2026, 8, 1), today)
    names = [i["name"] for i in res["items"]]
    assert any("1-я доза" in n for n in names)
    assert any("Бешенство" in n for n in names)
    first = res["items"][0]
    assert first["status"] == "past"  # 8 недель уже прошли
    assert res["next_due"]["due_date"] >= today.isoformat()


def test_vaccination_adult_next_is_annual():
    today = date(2026, 10, 21)
    res = calc.vaccination_schedule("cat", date(2020, 3, 5), today)
    assert res["next_due"]["name"] == "Ежегодная ревакцинация"
    assert res["next_due"]["due_date"] == "2027-03-05"


def test_vaccination_soon_flag():
    res = calc.vaccination_schedule("cat", date(2020, 11, 1), date(2026, 10, 21))
    assert res["next_due"]["status"] == "soon"


def test_vaccination_future_birth_rejected():
    with pytest.raises(ValueError):
        calc.vaccination_schedule("dog", date(2030, 1, 1), date(2026, 1, 1))


def test_vaccination_leap_day_birthday():
    res = calc.vaccination_schedule("dog", date(2020, 2, 29), date(2026, 10, 21))
    assert res["next_due"]["due_date"] == "2027-02-28"


# --- расписание кормлений ---


def test_meal_plan_two_meals_default_times():
    plan = calc.meal_plan("dog", 10, 24)
    assert [m["time"] for m in plan["meals"]] == ["08:00", "20:00"]
    assert sum(m["grams"] for m in plan["meals"]) in (plan["daily_grams"] - 1, plan["daily_grams"], plan["daily_grams"] + 1)


def test_meal_plan_puppy_four_meals_even_spacing():
    plan = calc.meal_plan("dog", 3, 2)
    assert [m["time"] for m in plan["meals"]] == ["08:00", "12:00", "16:00", "20:00"]


def test_meal_plan_bad_times():
    with pytest.raises(ValueError):
        calc.meal_plan("dog", 10, 24, "25:00", "20:00")
    with pytest.raises(ValueError):
        calc.meal_plan("dog", 10, 24, "20:00", "08:00")


# --- HTTP ---


def test_api_new_endpoints_ok():
    assert client.post("/water-norm", json={"species": "dog", "weight_kg": 10}).json()["daily_ml"] == 600
    assert client.post("/human-age", json={"species": "cat", "age_months": 24}).json()["human_years"] == 24.0
    r = client.post("/vaccination-schedule", json={"species": "dog", "birth_date": "2026-09-01", "today": "2026-10-21"})
    assert r.status_code == 200 and r.json()["items"]
    r = client.post("/meal-plan", json={"species": "cat", "weight_kg": 4, "age_months": 24})
    assert r.status_code == 200 and len(r.json()["meals"]) == 2


def test_api_feeding_norm_accepts_options():
    r = client.post(
        "/feeding-norm",
        json={"species": "dog", "weight_kg": 10, "age_months": 24, "neutered": True, "activity": "low", "food_type": "wet"},
    )
    assert r.status_code == 200
    assert r.json()["food_type"] == "wet"


@pytest.mark.parametrize(
    "path,body",
    [
        ("/water-norm", {"species": "dog", "weight_kg": 0}),
        ("/water-norm", {"species": "bird", "weight_kg": 5}),
        ("/human-age", {"species": "dog", "age_months": -1}),
        ("/vaccination-schedule", {"species": "dog", "birth_date": "not-a-date"}),
        ("/vaccination-schedule", {"species": "dog", "birth_date": "2999-01-01"}),
        ("/meal-plan", {"species": "dog", "weight_kg": 5, "age_months": 12, "first_meal": "9am"}),
        ("/meal-plan", {"species": "dog", "weight_kg": 5, "age_months": 12, "first_meal": "20:00", "last_meal": "08:00"}),
        ("/feeding-norm", {"species": "dog", "weight_kg": 5, "age_months": 12, "activity": "x"}),
    ],
)
def test_api_bad_input_is_422(path, body):
    assert client.post(path, json=body).status_code == 422
