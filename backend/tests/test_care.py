from unittest.mock import MagicMock, patch

import httpx

from tests.test_api import _pet_payload


def _pet(client):
    return client.post("/api/pets", json=_pet_payload()).json()["id"]


def _fake_service(payload, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = payload
    client = MagicMock()
    client.__enter__.return_value = client
    client.__exit__.return_value = False
    client.post.return_value = resp
    return patch("app.web_service.httpx.Client", return_value=client), client


def test_water_norm_proxies_service(client):
    pet_id = _pet(client)
    ctx, mock = _fake_service({"daily_ml": 750, "daily_liters": 0.75, "food_type": "wet"})
    with ctx:
        r = client.get(f"/api/pets/{pet_id}/water-norm", params={"food_type": "wet"})
    assert r.status_code == 200
    assert r.json()["daily_ml"] == 750
    url, kwargs = mock.post.call_args[0][0], mock.post.call_args[1]
    assert url.endswith("/water-norm")
    assert kwargs["json"]["food_type"] == "wet"
    assert kwargs["json"]["weight_kg"] == 12.5


def test_human_age(client):
    pet_id = _pet(client)
    ctx, _ = _fake_service({"human_years": 33.0, "life_stage": "взрослый"})
    with ctx:
        r = client.get(f"/api/pets/{pet_id}/human-age")
    assert r.status_code == 200
    assert r.json()["human_years"] == 33.0
    assert r.json()["age_months"] > 0


def test_vaccination_schedule(client):
    pet_id = _pet(client)
    item = {"name": "Бешенство", "due_date": "2027-01-15", "age": "5 г.", "status": "later"}
    ctx, mock = _fake_service({"items": [item], "next_due": item})
    with ctx:
        r = client.get(f"/api/pets/{pet_id}/vaccination-schedule")
    assert r.status_code == 200
    assert r.json()["next_due"]["name"] == "Бешенство"
    assert mock.post.call_args[1]["json"]["birth_date"] == "2022-01-15"


def test_meal_plan_passes_options(client):
    pet_id = _pet(client)
    data = {
        "meals": [{"time": "09:00", "grams": 100, "kcal": 350}],
        "meals_per_day": 2,
        "daily_grams": 200,
        "daily_kcal": 700,
    }
    ctx, mock = _fake_service(data)
    with ctx:
        r = client.get(
            f"/api/pets/{pet_id}/meal-plan",
            params={"first_meal": "09:00", "last_meal": "21:00", "neutered": "true", "activity": "low"},
        )
    assert r.status_code == 200
    sent = mock.post.call_args[1]["json"]
    assert sent["first_meal"] == "09:00"
    assert sent["neutered"] is True
    assert sent["activity"] == "low"


def test_feeding_norm_passes_options(client):
    pet_id = _pet(client)
    data = {
        "daily_kcal": 500,
        "daily_grams": 555,
        "meals_per_day": 2,
        "life_stage": "взрослый",
        "rer_kcal": 440,
        "food_type": "wet",
    }
    ctx, mock = _fake_service(data)
    with ctx:
        r = client.get(f"/api/pets/{pet_id}/feeding-norm", params={"food_type": "wet", "neutered": "true"})
    assert r.status_code == 200
    assert r.json()["food_type"] == "wet"
    assert mock.post.call_args[1]["json"]["neutered"] is True


def test_care_404_for_missing_pet(client):
    for path in ("water-norm", "human-age", "vaccination-schedule", "meal-plan"):
        assert client.get(f"/api/pets/999/{path}").status_code == 404


def test_care_bad_query_is_422(client):
    pet_id = _pet(client)
    assert client.get(f"/api/pets/{pet_id}/water-norm", params={"food_type": "bones"}).status_code == 422
    assert client.get(f"/api/pets/{pet_id}/meal-plan", params={"activity": "x"}).status_code == 422


def test_care_502_when_service_down(client):
    pet_id = _pet(client)
    broken = MagicMock()
    broken.__enter__.return_value = broken
    broken.__exit__.return_value = False
    broken.post.side_effect = httpx.ConnectError("down")
    for path in ("water-norm", "human-age", "vaccination-schedule", "meal-plan"):
        with patch("app.web_service.httpx.Client", return_value=broken):
            assert client.get(f"/api/pets/{pet_id}/{path}").status_code == 502


def test_care_502_when_service_returns_error(client):
    pet_id = _pet(client)
    ctx, _ = _fake_service({}, status=500)
    with ctx:
        assert client.get(f"/api/pets/{pet_id}/human-age").status_code == 502


def test_meal_plan_bad_times_are_422_not_502(client):
    pet_id = _pet(client)
    url = f"/api/pets/{pet_id}/meal-plan"
    assert client.get(url, params={"first_meal": "9am"}).status_code == 422
    assert client.get(url, params={"first_meal": "25:00"}).status_code == 422
    assert client.get(url, params={"first_meal": "20:00", "last_meal": "08:00"}).status_code == 422
