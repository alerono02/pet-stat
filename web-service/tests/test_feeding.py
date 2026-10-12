import pytest
from fastapi.testclient import TestClient

from service import app, calculate

client = TestClient(app)


def test_puppy_gets_more_than_adult():
    puppy = calculate("dog", 10.0, 3)
    adult = calculate("dog", 10.0, 24)
    assert puppy["daily_kcal"] > adult["daily_kcal"]
    assert puppy["life_stage"] == "щенок"
    assert adult["life_stage"] == "взрослый"


def test_dog_age_boundaries():
    assert calculate("dog", 10.0, 3)["life_stage"] == "щенок"
    assert calculate("dog", 10.0, 3)["meals_per_day"] == 4

    at_4 = calculate("dog", 10.0, 4)
    assert at_4["life_stage"] == "щенок"
    assert at_4["meals_per_day"] == 3

    at_11 = calculate("dog", 10.0, 11)
    assert at_11["life_stage"] == "щенок"

    at_12 = calculate("dog", 10.0, 12)
    assert at_12["life_stage"] == "взрослый"
    assert at_12["meals_per_day"] == 2

    at_83 = calculate("dog", 10.0, 83)
    assert at_83["life_stage"] == "взрослый"

    at_84 = calculate("dog", 10.0, 84)
    assert at_84["life_stage"] == "пожилой"


def test_cat_age_boundaries():
    kitten = calculate("cat", 3.0, 6)
    assert kitten["life_stage"] == "котёнок"
    assert kitten["meals_per_day"] == 3

    adult = calculate("cat", 3.0, 12)
    assert adult["life_stage"] == "взрослый"

    senior = calculate("cat", 3.0, 84)
    assert senior["life_stage"] == "пожилой"


def test_api_422_bad_weight():
    r = client.post(
        "/feeding-norm",
        json={"species": "dog", "weight_kg": 0, "age_months": 12},
    )
    assert r.status_code == 422


def test_api_422_negative_age():
    r = client.post(
        "/feeding-norm",
        json={"species": "dog", "weight_kg": 5, "age_months": -1},
    )
    assert r.status_code == 422


def test_api_422_unknown_species():
    r = client.post(
        "/feeding-norm",
        json={"species": "bird", "weight_kg": 5, "age_months": 12},
    )
    assert r.status_code == 422


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_calculate_raises_on_bad_input():
    with pytest.raises(ValueError):
        calculate("bird", 5.0, 12)
    with pytest.raises(ValueError):
        calculate("dog", 0, 12)
    with pytest.raises(ValueError):
        calculate("dog", 5.0, -1)
