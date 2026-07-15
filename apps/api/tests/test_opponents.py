from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Match


def test_create_opponent(client: TestClient) -> None:
    response = client.post(
        "/opponents", json={"last_name": "Nadal", "name": "Rafael", "handedness": "L"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["last_name"] == "Nadal"
    assert body["handedness"] == "L"
    assert "id" in body
    assert "created_at" in body


def test_create_opponent_requires_last_name(client: TestClient) -> None:
    response = client.post("/opponents", json={"name": "Rafael"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["message"] == "Validation error"
    assert body["error"]["details"]


def test_create_opponent_rejects_invalid_enum(client: TestClient) -> None:
    response = client.post("/opponents", json={"last_name": "Nadal", "handedness": "sideways"})
    assert response.status_code == 422


def test_get_opponent(client: TestClient) -> None:
    created = client.post("/opponents", json={"last_name": "Nadal"}).json()
    response = client.get(f"/opponents/{created['id']}")
    assert response.status_code == 200
    assert response.json()["last_name"] == "Nadal"


def test_get_opponent_not_found(client: TestClient) -> None:
    response = client.get("/opponents/999")
    assert response.status_code == 404
    assert response.json() == {"error": {"message": "Opponent 999 not found", "details": None}}


def test_list_opponents_pagination(client: TestClient) -> None:
    for last_name in ["Nadal", "Federer", "Djokovic", "Alcaraz"]:
        client.post("/opponents", json={"last_name": last_name})

    response = client.get("/opponents", params={"limit": 2, "offset": 0})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert body["limit"] == 2
    assert body["offset"] == 0
    assert len(body["items"]) == 2

    next_page = client.get("/opponents", params={"limit": 2, "offset": 2}).json()
    assert len(next_page["items"]) == 2


def test_list_opponents_rejects_invalid_pagination(client: TestClient) -> None:
    response = client.get("/opponents", params={"limit": 0})
    assert response.status_code == 422


def test_list_opponents_search_matches_last_or_first_name(client: TestClient) -> None:
    client.post("/opponents", json={"last_name": "Nadal", "name": "Rafael"})
    client.post("/opponents", json={"last_name": "Federer", "name": "Roger"})

    response = client.get("/opponents", params={"search": "nad"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["last_name"] == "Nadal"

    response = client.get("/opponents", params={"search": "roger"})
    assert response.json()["total"] == 1


def test_update_opponent(client: TestClient) -> None:
    created = client.post("/opponents", json={"last_name": "Nadal"}).json()

    response = client.patch(f"/opponents/{created['id']}", json={"nationality": "Spain"})
    assert response.status_code == 200
    body = response.json()
    assert body["nationality"] == "Spain"
    assert body["last_name"] == "Nadal"


def test_update_opponent_not_found(client: TestClient) -> None:
    response = client.patch("/opponents/999", json={"nationality": "Spain"})
    assert response.status_code == 404


def test_update_opponent_rejects_invalid_value(client: TestClient) -> None:
    created = client.post("/opponents", json={"last_name": "Nadal"}).json()
    response = client.patch(f"/opponents/{created['id']}", json={"last_name": ""})
    assert response.status_code == 422


def test_delete_opponent(client: TestClient) -> None:
    created = client.post("/opponents", json={"last_name": "Nadal"}).json()

    response = client.delete(f"/opponents/{created['id']}")
    assert response.status_code == 204

    assert client.get(f"/opponents/{created['id']}").status_code == 404


def test_delete_opponent_not_found(client: TestClient) -> None:
    response = client.delete("/opponents/999")
    assert response.status_code == 404


def test_delete_opponent_with_matches_conflicts(client: TestClient, db_session: Session) -> None:
    created = client.post("/opponents", json={"last_name": "Nadal"}).json()
    db_session.add(Match(match_date=date(2026, 7, 14), opponent_id=created["id"]))
    db_session.commit()

    response = client.delete(f"/opponents/{created['id']}")
    assert response.status_code == 409
    assert response.json()["error"]["message"] == (
        f"Opponent {created['id']} has matches and cannot be deleted"
    )
