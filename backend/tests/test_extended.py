from datetime import date, timedelta

from tests.test_api import _pet_payload


def _make_pet(client, **overrides):
    r = client.post("/api/pets", json=_pet_payload(**overrides))
    assert r.status_code == 201
    return r.json()


def _make_record(client, pet_id, **overrides):
    data = {"visit_date": "2026-01-10", "diagnosis": "ОРВИ"}
    data.update(overrides)
    r = client.post(f"/api/pets/{pet_id}/records", json=data)
    assert r.status_code == 201
    return r.json()


# --- список питомцев: поиск, фильтры, сортировка, страницы ---


def test_list_returns_envelope(client):
    _make_pet(client)
    r = client.get("/api/pets")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert len(body["items"]) == 1


def test_list_search_by_name_owner_breed(client):
    _make_pet(client, name="Rex", owner_name="Ivanov", breed="Lab")
    _make_pet(client, name="Murka", owner_name="Petrova", breed="Siam")
    assert client.get("/api/pets", params={"q": "rex"}).json()["total"] == 1
    assert client.get("/api/pets", params={"q": "PETROVA"}).json()["total"] == 1
    assert client.get("/api/pets", params={"q": "siam"}).json()["total"] == 1
    assert client.get("/api/pets", params={"q": "zzz"}).json()["items"] == []


def test_list_filter_by_species(client):
    _make_pet(client, name="A", species="dog")
    _make_pet(client, name="B", species="cat")
    body = client.get("/api/pets", params={"species": "cat"}).json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "B"


def test_list_bad_species_is_422(client):
    assert client.get("/api/pets", params={"species": "bird"}).status_code == 422


def test_list_sort_by_weight_and_name(client):
    _make_pet(client, name="B", weight_kg=5)
    _make_pet(client, name="A", weight_kg=20)
    by_weight = client.get(
        "/api/pets", params={"sort": "weight", "order": "desc"}
    ).json()["items"]
    assert [p["name"] for p in by_weight] == ["A", "B"]
    by_name = client.get("/api/pets", params={"sort": "name"}).json()["items"]
    assert [p["name"] for p in by_name] == ["A", "B"]


def test_list_sort_by_age_oldest_first(client):
    _make_pet(client, name="Young", birth_date="2025-01-01")
    _make_pet(client, name="Old", birth_date="2015-01-01")
    items = client.get("/api/pets", params={"sort": "age", "order": "desc"}).json()[
        "items"
    ]
    assert [p["name"] for p in items] == ["Old", "Young"]


def test_list_bad_sort_is_422(client):
    assert client.get("/api/pets", params={"sort": "color"}).status_code == 422


def test_list_pagination(client):
    for i in range(5):
        _make_pet(client, name=f"P{i}")
    first = client.get("/api/pets", params={"page_size": 2, "page": 1}).json()
    last = client.get("/api/pets", params={"page_size": 2, "page": 3}).json()
    assert first["total"] == 5
    assert len(first["items"]) == 2
    assert len(last["items"]) == 1
    beyond = client.get("/api/pets", params={"page_size": 2, "page": 9}).json()
    assert beyond["items"] == []


def test_list_bad_paging_is_422(client):
    assert client.get("/api/pets", params={"page": 0}).status_code == 422
    assert client.get("/api/pets", params={"page_size": 0}).status_code == 422
    assert client.get("/api/pets", params={"page_size": 101}).status_code == 422


# --- один питомец ---


def test_get_pet_detail(client):
    pet = _make_pet(client)
    r = client.get(f"/api/pets/{pet['id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Бобик"
    assert body["age_months"] > 0


def test_get_pet_404(client):
    assert client.get("/api/pets/999").status_code == 404


# --- медкарта: правка и удаление ---


def test_update_record(client):
    pet = _make_pet(client)
    rec = _make_record(client, pet["id"])
    r = client.put(
        f"/api/pets/{pet['id']}/records/{rec['id']}",
        json={"diagnosis": "Грипп", "treatment": "Покой"},
    )
    assert r.status_code == 200
    assert r.json()["diagnosis"] == "Грипп"
    assert r.json()["treatment"] == "Покой"
    assert r.json()["visit_date"] == "2026-01-10"


def test_delete_record(client):
    pet = _make_pet(client)
    rec = _make_record(client, pet["id"])
    r = client.delete(f"/api/pets/{pet['id']}/records/{rec['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/pets/{pet['id']}/records").json() == []


def test_record_of_another_pet_is_404(client):
    a = _make_pet(client, name="A")
    b = _make_pet(client, name="B")
    rec = _make_record(client, a["id"])
    assert client.put(
        f"/api/pets/{b['id']}/records/{rec['id']}", json={"notes": "x"}
    ).status_code == 404
    assert client.delete(f"/api/pets/{b['id']}/records/{rec['id']}").status_code == 404
    assert client.delete(f"/api/pets/{a['id']}/records/999").status_code == 404


def test_update_record_null_date_is_422(client):
    pet = _make_pet(client)
    rec = _make_record(client, pet["id"])
    r = client.put(
        f"/api/pets/{pet['id']}/records/{rec['id']}", json={"visit_date": None}
    )
    assert r.status_code == 422


def test_record_future_date_is_422(client):
    pet = _make_pet(client)
    future = (date.today() + timedelta(days=5)).isoformat()
    r = client.post(f"/api/pets/{pet['id']}/records", json={"visit_date": future})
    assert r.status_code == 422


# --- дневник веса ---


def test_new_pet_gets_initial_weight_log(client):
    pet = _make_pet(client, weight_kg=12.5)
    logs = client.get(f"/api/pets/{pet['id']}/weights").json()
    assert len(logs) == 1
    assert float(logs[0]["weight_kg"]) == 12.5


def test_add_weight_updates_pet_weight(client):
    pet = _make_pet(client, weight_kg=10)
    r = client.post(
        f"/api/pets/{pet['id']}/weights",
        json={"logged_on": date.today().isoformat(), "weight_kg": 11.2},
    )
    assert r.status_code == 201
    assert float(client.get(f"/api/pets/{pet['id']}").json()["weight_kg"]) == 11.2


def test_older_weight_does_not_override_current(client):
    pet = _make_pet(client, weight_kg=10)
    old = (date.today() - timedelta(days=30)).isoformat()
    client.post(
        f"/api/pets/{pet['id']}/weights", json={"logged_on": old, "weight_kg": 9.0}
    )
    assert float(client.get(f"/api/pets/{pet['id']}").json()["weight_kg"]) == 10.0
    logs = client.get(f"/api/pets/{pet['id']}/weights").json()
    assert [l["logged_on"] for l in logs] == sorted(l["logged_on"] for l in logs)


def test_delete_weight_restores_previous(client):
    pet = _make_pet(client, weight_kg=10)
    old = (date.today() - timedelta(days=30)).isoformat()
    client.post(
        f"/api/pets/{pet['id']}/weights", json={"logged_on": old, "weight_kg": 9.0}
    )
    new = client.post(
        f"/api/pets/{pet['id']}/weights",
        json={"logged_on": date.today().isoformat(), "weight_kg": 11.0},
    ).json()
    r = client.delete(f"/api/pets/{pet['id']}/weights/{new['id']}")
    assert r.status_code == 204
    assert float(client.get(f"/api/pets/{pet['id']}").json()["weight_kg"]) == 10.0


def test_delete_last_weight_keeps_pet_weight(client):
    pet = _make_pet(client, weight_kg=10)
    only = client.get(f"/api/pets/{pet['id']}/weights").json()[0]
    assert client.delete(f"/api/pets/{pet['id']}/weights/{only['id']}").status_code == 204
    assert float(client.get(f"/api/pets/{pet['id']}").json()["weight_kg"]) == 10.0


def test_weight_validation_and_404(client):
    pet = _make_pet(client)
    today = date.today().isoformat()
    future = (date.today() + timedelta(days=1)).isoformat()
    url = f"/api/pets/{pet['id']}/weights"
    assert client.post(url, json={"logged_on": today, "weight_kg": 0}).status_code == 422
    assert client.post(url, json={"logged_on": today, "weight_kg": -3}).status_code == 422
    assert client.post(url, json={"logged_on": future, "weight_kg": 5}).status_code == 422
    assert client.get("/api/pets/999/weights").status_code == 404
    assert client.post(
        "/api/pets/999/weights", json={"logged_on": today, "weight_kg": 5}
    ).status_code == 404
    assert client.delete(f"{url}/999").status_code == 404


def test_update_pet_weight_adds_log(client):
    pet = _make_pet(client, weight_kg=10)
    client.put(f"/api/pets/{pet['id']}", json={"weight_kg": 12})
    logs = client.get(f"/api/pets/{pet['id']}/weights").json()
    assert len(logs) == 2
    assert float(logs[-1]["weight_kg"]) == 12.0


def test_delete_pet_removes_weights(client):
    pet = _make_pet(client)
    client.delete(f"/api/pets/{pet['id']}")
    assert client.get(f"/api/pets/{pet['id']}/weights").status_code == 404


# --- статистика ---


def test_stats_empty(client):
    body = client.get("/api/stats").json()
    assert body["total_pets"] == 0
    assert body["by_species"] == {"dog": 0, "cat": 0}
    assert body["avg_weight_kg"] is None
    assert body["records_total"] == 0
    assert body["recent_records"] == []


def test_stats_counts(client):
    a = _make_pet(client, name="A", species="dog", weight_kg=10)
    _make_pet(client, name="B", species="cat", weight_kg=4)
    _make_pet(client, name="C", species="dog", weight_kg=7)
    for i in range(6):
        _make_record(client, a["id"], visit_date=f"2026-01-0{i + 1}")
    body = client.get("/api/stats").json()
    assert body["total_pets"] == 3
    assert body["by_species"] == {"dog": 2, "cat": 1}
    assert body["avg_weight_kg"] == 7.0
    assert body["records_total"] == 6
    recent = body["recent_records"]
    assert len(recent) == 5
    assert recent[0]["visit_date"] == "2026-01-06"
    assert recent[0]["pet_name"] == "A"
