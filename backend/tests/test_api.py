from datetime import date
from unittest.mock import MagicMock, patch

import httpx


def _pet_payload(**overrides):
    data = {
        "name": "Бобик",
        "species": "dog",
        "breed": "Дворняга",
        "birth_date": "2022-01-15",
        "weight_kg": 12.5,
        "owner_name": "Тестов Т.",
    }
    data.update(overrides)
    return data


def test_crud_pets(client):
    r = client.post("/api/pets", json=_pet_payload())
    assert r.status_code == 201
    pet = r.json()
    pet_id = pet["id"]
    assert pet["name"] == "Бобик"

    r = client.get("/api/pets")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.put(f"/api/pets/{pet_id}", json={"weight_kg": 13.0})
    assert r.status_code == 200
    assert float(r.json()["weight_kg"]) == 13.0

    r = client.delete(f"/api/pets/{pet_id}")
    assert r.status_code == 204

    r = client.get("/api/pets")
    assert r.json() == []


def test_404_pet(client):
    assert client.get("/api/pets/999/records").status_code == 404
    assert client.put("/api/pets/999", json={"name": "X"}).status_code == 404
    assert client.delete("/api/pets/999").status_code == 404
    assert client.get("/api/pets/999/feeding-norm").status_code == 404


def test_422_future_birth_date(client):
    future = (date.today().replace(year=date.today().year + 1)).isoformat()
    r = client.post("/api/pets", json=_pet_payload(birth_date=future))
    assert r.status_code == 422


def test_422_bad_species(client):
    r = client.post("/api/pets", json=_pet_payload(species="bird"))
    assert r.status_code == 422


def test_empty_medical_records(client):
    r = client.post("/api/pets", json=_pet_payload())
    pet_id = r.json()["id"]
    r = client.get(f"/api/pets/{pet_id}/records")
    assert r.status_code == 200
    assert r.json() == []


def test_create_medical_record(client):
    r = client.post("/api/pets", json=_pet_payload())
    pet_id = r.json()["id"]
    r = client.post(
        f"/api/pets/{pet_id}/records",
        json={"visit_date": "2026-01-10", "diagnosis": "ОРВИ"},
    )
    assert r.status_code == 201
    r = client.get(f"/api/pets/{pet_id}/records")
    assert len(r.json()) == 1


def test_feeding_norm_ok(client):
    r = client.post("/api/pets", json=_pet_payload())
    pet_id = r.json()["id"]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "daily_kcal": 500,
        "daily_grams": 143,
        "meals_per_day": 2,
        "life_stage": "взрослый",
    }

    with patch("app.main.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.__exit__.return_value = False
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        r = client.get(f"/api/pets/{pet_id}/feeding-norm")

    assert r.status_code == 200
    body = r.json()
    assert body["pet_id"] == pet_id
    assert body["name"] == "Бобик"
    assert body["daily_kcal"] == 500
    assert "age_months" in body


def test_feeding_norm_502_unavailable(client):
    r = client.post("/api/pets", json=_pet_payload())
    pet_id = r.json()["id"]

    with patch("app.main.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.__exit__.return_value = False
        mock_client.post.side_effect = httpx.ConnectError("down")
        mock_client_cls.return_value = mock_client

        r = client.get(f"/api/pets/{pet_id}/feeding-norm")

    assert r.status_code == 502


def test_feeding_norm_502_bad_status(client):
    r = client.post("/api/pets", json=_pet_payload())
    pet_id = r.json()["id"]

    mock_resp = MagicMock()
    mock_resp.status_code = 500

    with patch("app.main.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.__exit__.return_value = False
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        r = client.get(f"/api/pets/{pet_id}/feeding-norm")

    assert r.status_code == 502


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
