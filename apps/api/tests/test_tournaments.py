from datetime import date
from typing import Any

import pytest
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


def test_list_tournaments_filters_by_club(client: TestClient) -> None:
    club = client.post("/clubs", json={"name": "Riverside"}).json()
    client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Knockout Tournament",
            "club_id": club["id"],
        },
    )
    client.post(
        "/tournaments", json={"name": "Spring Cup", "tournament_type": "Knockout Tournament"}
    )

    response = client.get("/tournaments", params={"club_id": club["id"]})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Winter Open"


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


def test_create_tournament_with_icon_round_trips(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Knockout Tournament",
            "icon": "icon:trophy:highlight",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["icon"] == "icon:trophy:highlight"

    response = client.patch(f"/tournaments/{created['id']}", json={"icon": "emoji:🏆"})
    assert response.status_code == 200
    assert response.json()["icon"] == "emoji:🏆"


def test_create_tournament_with_organiser_round_trips(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Knockout Tournament",
            "organiser": "Riverside Tennis Club",
        },
    )
    assert response.status_code == 201
    created = response.json()
    assert created["organiser"] == "Riverside Tennis Club"

    fetched = client.get(f"/tournaments/{created['id']}").json()
    assert fetched["organiser"] == "Riverside Tennis Club"


def test_organiser_defaults_to_null(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()
    assert created["organiser"] is None


def test_update_tournament_sets_and_clears_organiser(client: TestClient) -> None:
    created = client.post(
        "/tournaments", json={"name": "Winter Open", "tournament_type": "Knockout Tournament"}
    ).json()

    response = client.patch(f"/tournaments/{created['id']}", json={"organiser": "Jane Doe"})
    assert response.status_code == 200
    assert response.json()["organiser"] == "Jane Doe"

    response = client.patch(f"/tournaments/{created['id']}", json={"organiser": None})
    assert response.status_code == 200
    assert response.json()["organiser"] is None


def test_create_tournament_rejects_overlong_organiser(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Knockout Tournament",
            "organiser": "x" * 121,
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "fmt",
    [
        "Best of 3",
        "Best of 5",
        "1 Set",
        "Tie Break",
        "Super Tie Break",
        "Round robin, then knockout",
    ],
)
def test_create_tournament_accepts_format_values(client: TestClient, fmt: str) -> None:
    response = client.post(
        "/tournaments",
        json={"name": "Winter Open", "tournament_type": "Knockout Tournament", "format": fmt},
    )
    assert response.status_code == 201
    created = response.json()
    assert created["format"] == fmt

    fetched = client.get(f"/tournaments/{created['id']}").json()
    assert fetched["format"] == fmt


def test_create_tournament_rejects_overlong_format(client: TestClient) -> None:
    response = client.post(
        "/tournaments",
        json={
            "name": "Winter Open",
            "tournament_type": "Knockout Tournament",
            "format": "x" * 81,
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "icon",
    [
        "not-an-encoding",
        "icon:not-a-real-icon:highlight",
        "icon:trophy:hotpink",
        "emoji:",
    ],
)
def test_create_tournament_rejects_invalid_icon(client: TestClient, icon: str) -> None:
    response = client.post(
        "/tournaments",
        json={"name": "Winter Open", "tournament_type": "Knockout Tournament", "icon": icon},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Standings
# ---------------------------------------------------------------------------


def _opponent(client: TestClient, last_name: str, name: str | None = None) -> int:
    payload: dict[str, Any] = {"last_name": last_name}
    if name is not None:
        payload["name"] = name
    return client.post("/opponents", json=payload).json()["id"]


def _match(client: TestClient, opponent_id: int, match_date: str, score: str, **overrides: Any):
    payload: dict[str, Any] = {
        "match_date": match_date,
        "opponent_id": opponent_id,
        "score": score,
        **overrides,
    }
    response = client.post("/matches", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_get_tournament_standings_not_found(client: TestClient) -> None:
    response = client.get("/tournaments/999/standings")
    assert response.status_code == 404


def test_tournament_standings_empty(client: TestClient) -> None:
    tournament = client.post(
        "/tournaments", json={"name": "Winter League", "tournament_type": "Ranking League"}
    ).json()
    response = client.get(f"/tournaments/{tournament['id']}/standings")
    assert response.status_code == 200
    assert response.json() == []


def test_tournament_standings_aggregates_per_opponent(client: TestClient) -> None:
    tournament = client.post(
        "/tournaments", json={"name": "Winter League", "tournament_type": "Ranking League"}
    ).json()["id"]
    nadal = _opponent(client, "Nadal", "Rafael")
    federer = _opponent(client, "Federer", "Roger")

    # vs Nadal: two matches, 1 win (6-4 6-4) and 1 loss (4-6 4-6).
    _match(client, nadal, "2026-01-01", "6-4 6-4", tournament_id=tournament)
    _match(client, nadal, "2026-01-08", "4-6 4-6", tournament_id=tournament)
    # vs Federer: one win, straight sets.
    _match(client, federer, "2026-01-15", "6-2 6-3", tournament_id=tournament)
    # A friendly against Nadal outside the tournament must not be counted.
    _match(client, nadal, "2026-02-01", "6-0 6-0")

    body = client.get(f"/tournaments/{tournament}/standings").json()
    by_opponent = {row["opponent_id"]: row for row in body}

    assert by_opponent[nadal] == {
        "opponent_id": nadal,
        "opponent_name": "Rafael Nadal",
        "played": 2,
        "wins": 1,
        "losses": 1,
        "win_rate": 0.5,
        "sets_won": 2,
        "sets_lost": 2,
        "games_won": 20,
        "games_lost": 20,
    }
    assert by_opponent[federer] == {
        "opponent_id": federer,
        "opponent_name": "Roger Federer",
        "played": 1,
        "wins": 1,
        "losses": 0,
        "win_rate": 1.0,
        "sets_won": 2,
        "sets_lost": 0,
        "games_won": 12,
        "games_lost": 5,
    }

    # Federer (1-0, 100%) ranks above Nadal (1-1, 50%).
    assert [row["opponent_id"] for row in body] == [federer, nadal]


def test_tournament_standings_excludes_scheduled_matches(client: TestClient) -> None:
    tournament = client.post(
        "/tournaments", json={"name": "Winter League", "tournament_type": "Ranking League"}
    ).json()["id"]
    nadal = _opponent(client, "Nadal")
    client.post(
        "/matches",
        json={"match_date": "2026-01-01", "opponent_id": nadal, "tournament_id": tournament},
    )

    body = client.get(f"/tournaments/{tournament}/standings").json()
    assert body == []
