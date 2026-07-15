from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Match, Opponent


def test_create_tournament(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={"name": "Winter Open", "tournament_type": "Knockout Tournament"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Winter Open"
    assert body["tournament_type"] == "Knockout Tournament"
    assert "id" in body


def test_create_tournament_requires_name(client: TestClient) -> None:
    response = client.post("/tournaments", json={"tournament_type": "Knockout Tournament"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["message"] == "Validation error"
    assert body["error"]["details"]


def test_create_tournament_requires_tournament_type(client: TestClient) -> None:
    response = client.post("/tournaments", json={"name": "Winter Open"})
    assert response.status_code == 422


def test_create_tournament_rejects_invalid_enum(client: TestClient) -> None:
    response = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Round Robin"}
    )
    assert response.status_code == 422


def test_create_tournament_with_club(client: TestClient) -> None:
    club = client.post("/clubs", json={"name": "Riverside"}).json()

    response = client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Ranking League",
            "club_id": club["id"],
        },
    )
    assert response.status_code == 201
    assert response.json()["club_id"] == club["id"]


def test_create_tournament_rejects_unknown_club(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={"name": "Winter Open", "tournament_type": "Knockout Tournament", "club_id": 999},
    )
    assert response.status_code == 404
    assert response.json() == {"error": {"message": "Club 999 not found", "details": None}}


def test_get_tournament(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()
    response = client.get(f"/tournaments/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Winter Open"


def test_get_tournament_not_found(client: TestClient) -> None:
    response = client.get("/tournaments/999")
    assert response.status_code == 404
    assert response.json() == {"error": {"message": "Tournament 999 not found", "details": None}}


def test_list_tournaments_pagination(client: TestClient) -> None:
    for name in ["Winter Open", "Spring Cup", "Summer League", "Autumn Classic"]:
        client.post("/tournaments", json={"name": name, "tournament_type": "Knockout Tournament"})

    response = client.get("/tournaments", params={"limit": 2, "offset": 0})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert body["limit"] == 2
    assert len(body["items"]) == 2


def test_list_tournaments_rejects_invalid_pagination(client: TestClient) -> None:
    response = client.get("/tournaments", params={"offset": -1})
    assert response.status_code == 422


def test_list_tournaments_search_matches_name(client: TestClient) -> None:
    client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    )
    client.post(
        "/tournaments", json={"name": "Spring Cup", "tournament_type": "Knockout Tournament"}
    )

    response = client.get("/tournaments", params={"search": "winter"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Winter Open"


def test_list_tournaments_filters_by_type(client: TestClient) -> None:
    client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    )
    client.post("/tournaments", json={"name": "Spring League", "tournament_type": "Ranking League"})

    response = client.get("/tournaments", params={"tournament_type": "Ranking League"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Spring League"


def test_list_tournaments_rejects_invalid_type_filter(client: TestClient) -> None:
    response = client.get("/tournaments", params={"tournament_type": "Round Robin"})
    assert response.status_code == 422


def test_update_tournament(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()

    response = client.patch(f"/tournaments/{created['id']}", json={"season": "2026"})
    assert response.status_code == 200
    body = response.json()
    assert body["season"] == "2026"
    assert body["name"] == "Winter Open"


def test_update_tournament_not_found(client: TestClient) -> None:
    response = client.patch("/tournaments/999", json={"season": "2026"})
    assert response.status_code == 404


def test_update_tournament_rejects_invalid_value(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()
    response = client.patch(f"/tournaments/{created['id']}", json={"name": ""})
    assert response.status_code == 422


def test_update_tournament_rejects_unknown_club(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()

    response = client.patch(f"/tournaments/{created['id']}", json={"club_id": 999})
    assert response.status_code == 404
    assert response.json() == {"error": {"message": "Club 999 not found", "details": None}}


def test_update_tournament_sets_club(client: TestClient) -> None:
    club = client.post("/clubs", json={"name": "Riverside"}).json()
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()

    response = client.patch(f"/tournaments/{created['id']}", json={"club_id": club["id"]})
    assert response.status_code == 200
    assert response.json()["club_id"] == club["id"]


def test_delete_tournament(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()

    response = client.delete(f"/tournaments/{created['id']}")
    assert response.status_code == 204

    assert client.get(f"/tournaments/{created['id']}").status_code == 404


def test_delete_tournament_not_found(client: TestClient) -> None:
    response = client.delete("/tournaments/999")
    assert response.status_code == 404


def test_delete_tournament_with_matches_sets_match_tournament_null(
    client: TestClient, db_session: Session
) -> None:
    opponent = Opponent(last_name="Nadal")
    db_session.add(opponent)
    db_session.flush()

    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()
    match = Match(
        match_date=date(2026, 7, 14), opponent_id=opponent.id, tournament_id=created["id"]
    )
    db_session.add(match)
    db_session.commit()

    response = client.delete(f"/tournaments/{created['id']}")
    assert response.status_code == 204

    db_session.refresh(match)
    assert match.tournament_id is None
