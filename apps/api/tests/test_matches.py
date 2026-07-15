"""Tests for /matches: derivation, one-transaction writes with rollback, filters."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Match, Set


def _opponent(client: TestClient, last_name: str = "Nadal") -> int:
    return client.post("/opponents", json={"last_name": last_name}).json()["id"]


def _club(client: TestClient, name: str = "Roland Garros") -> int:
    return client.post("/clubs", json={"name": name}).json()["id"]


def _tournament(client: TestClient, name: str = "Club Open") -> int:
    response = client.post(
        "/tournaments", json={"name": name, "tournament_type": "Knockout Tournament"}
    )
    return response.json()["id"]


def _match_payload(opponent_id: int, **overrides: Any) -> dict[str, Any]:
    return {"match_date": "2026-07-14", "opponent_id": opponent_id, **overrides}


def _count(db_session: Session, model: type) -> int:
    return db_session.scalar(select(func.count()).select_from(model)) or 0


# ---------------------------------------------------------------------------
# Derivation: result, score string, and set breakdown are computed on read
# ---------------------------------------------------------------------------


def test_create_one_set_win_from_score(client: TestClient) -> None:
    response = client.post("/matches", json=_match_payload(_opponent(client), score="6-4"))
    assert response.status_code == 201
    body = response.json()
    assert body["result"] == "Win"
    assert body["score"] == "6-4"
    assert body["status"] == "played"
    assert body["sets"] == [
        {"set_no": 1, "games_won": 6, "games_lost": 4, "tiebreak": False, "result": "Win"}
    ]


def test_create_one_set_loss_from_score(client: TestClient) -> None:
    body = client.post("/matches", json=_match_payload(_opponent(client), score="4-6")).json()
    assert body["result"] == "Loss"
    assert body["sets"][0]["result"] == "Loss"


def test_create_three_set_match_with_super_tiebreak(client: TestClient) -> None:
    score = "6-4 3-6 10-7"
    body = client.post("/matches", json=_match_payload(_opponent(client), score=score)).json()
    assert body["result"] == "Win"
    assert body["score"] == score
    assert [s["set_no"] for s in body["sets"]] == [1, 2, 3]
    assert [s["result"] for s in body["sets"]] == ["Win", "Loss", "Win"]
    assert [s["tiebreak"] for s in body["sets"]] == [False, False, True]


def test_create_three_set_loss(client: TestClient) -> None:
    body = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 3-6 4-6")
    ).json()
    assert body["result"] == "Loss"


def test_create_three_set_sweep(client: TestClient) -> None:
    body = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-0 6-1 6-2")
    ).json()
    assert body["result"] == "Win"
    assert all(s["result"] == "Win" for s in body["sets"])


def test_create_five_set_match_with_tiebreak_sets(client: TestClient) -> None:
    score = "7-6 4-6 6-3 3-6 7-6"
    body = client.post("/matches", json=_match_payload(_opponent(client), score=score)).json()
    assert body["result"] == "Win"
    assert body["score"] == score
    assert len(body["sets"]) == 5
    assert [s["tiebreak"] for s in body["sets"]] == [True, False, False, False, True]


def test_create_five_set_loss(client: TestClient) -> None:
    body = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 4-6 6-3 3-6 8-10")
    ).json()
    assert body["result"] == "Loss"
    assert body["sets"][4]["tiebreak"] is True


def test_tiebreak_flag_7_6_but_not_7_5(client: TestClient) -> None:
    tiebreak = client.post("/matches", json=_match_payload(_opponent(client), score="7-6")).json()
    assert tiebreak["sets"][0]["tiebreak"] is True

    no_tiebreak = client.post(
        "/matches", json=_match_payload(_opponent(client), score="7-5")
    ).json()
    assert no_tiebreak["sets"][0]["tiebreak"] is False


def test_create_from_nested_sets_derives_same_data(client: TestClient) -> None:
    sets = [
        {"games_won": 6, "games_lost": 4},
        {"games_won": 3, "games_lost": 6},
        {"games_won": 10, "games_lost": 7},
    ]
    response = client.post("/matches", json=_match_payload(_opponent(client), sets=sets))
    assert response.status_code == 201
    body = response.json()
    assert body["result"] == "Win"
    assert body["score"] == "6-4 3-6 10-7"
    assert body["status"] == "played"
    assert [s["tiebreak"] for s in body["sets"]] == [False, False, True]


def test_create_from_nested_sets_loss(client: TestClient) -> None:
    sets = [{"games_won": 4, "games_lost": 6}]
    body = client.post("/matches", json=_match_payload(_opponent(client), sets=sets)).json()
    assert body["result"] == "Loss"
    assert body["score"] == "4-6"


def test_derived_data_not_stored_redundantly(client: TestClient, db_session: Session) -> None:
    created = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 3-6 10-7")
    ).json()

    match = db_session.get(Match, created["id"])
    assert match is not None
    assert not hasattr(match, "result")
    assert not hasattr(match, "score")

    body = client.get(f"/matches/{created['id']}").json()
    assert body["result"] == "Win"
    assert body["score"] == "6-4 3-6 10-7"
    assert len(body["sets"]) == 3


def test_match_type_derived_from_tournament(client: TestClient) -> None:
    opponent_id = _opponent(client)
    friendly = client.post("/matches", json=_match_payload(opponent_id, score="6-4")).json()
    assert friendly["match_type"] == "Friendly"

    competitive = client.post(
        "/matches",
        json=_match_payload(opponent_id, score="6-4", tournament_id=_tournament(client)),
    ).json()
    assert competitive["match_type"] == "Competitive"


# ---------------------------------------------------------------------------
# Input validation and transactional rollback
# ---------------------------------------------------------------------------


def test_create_rejects_score_and_sets_together(client: TestClient) -> None:
    response = client.post(
        "/matches",
        json=_match_payload(
            _opponent(client), score="6-4", sets=[{"games_won": 6, "games_lost": 4}]
        ),
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "score",
    [
        "7-7",  # a set cannot end level
        "6-4 6-4",  # even set counts cannot decide a winner
        "9-7",  # not a valid set score
        "10-7 6-4 6-4",  # super-tiebreak only as the deciding set
        "10-9",  # super-tiebreak must be won by two past 10
        "6-4 6-4 6-4 6-4 6-4",  # best-of-5 clinched after three sets
        "",  # empty score
    ],
)
def test_create_invalid_score_rolls_back_everything(
    client: TestClient, db_session: Session, score: str
) -> None:
    response = client.post("/matches", json=_match_payload(_opponent(client), score=score))
    assert response.status_code == 422
    assert _count(db_session, Match) == 0
    assert _count(db_session, Set) == 0


def test_create_winner_must_win_final_set(client: TestClient, db_session: Session) -> None:
    response = client.post("/matches", json=_match_payload(_opponent(client), score="6-4 6-4 4-6"))
    assert response.status_code == 422
    assert "final set" in response.json()["error"]["message"]
    assert _count(db_session, Match) == 0
    assert _count(db_session, Set) == 0


def test_create_invalid_nested_set_rolls_back_everything(
    client: TestClient, db_session: Session
) -> None:
    sets = [
        {"games_won": 6, "games_lost": 4},
        {"games_won": 3, "games_lost": 6},
        {"games_won": 9, "games_lost": 7},  # invalid third set
    ]
    response = client.post("/matches", json=_match_payload(_opponent(client), sets=sets))
    assert response.status_code == 422
    assert _count(db_session, Match) == 0
    assert _count(db_session, Set) == 0


def test_create_rejects_negative_nested_set(client: TestClient) -> None:
    response = client.post(
        "/matches",
        json=_match_payload(_opponent(client), sets=[{"games_won": -6, "games_lost": 4}]),
    )
    assert response.status_code == 422


def test_create_rejects_empty_sets_list(client: TestClient, db_session: Session) -> None:
    response = client.post("/matches", json=_match_payload(_opponent(client), sets=[]))
    assert response.status_code == 422
    assert _count(db_session, Match) == 0


def test_create_unknown_opponent_404(client: TestClient, db_session: Session) -> None:
    response = client.post("/matches", json=_match_payload(999, score="6-4"))
    assert response.status_code == 404
    assert _count(db_session, Match) == 0


def test_create_unknown_club_404(client: TestClient) -> None:
    response = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4", club_id=999)
    )
    assert response.status_code == 404


def test_create_unknown_tournament_404(client: TestClient) -> None:
    response = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4", tournament_id=999)
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Scheduled matches and completing them later
# ---------------------------------------------------------------------------


def test_create_scheduled_match(client: TestClient) -> None:
    response = client.post("/matches", json=_match_payload(_opponent(client)))
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "scheduled"
    assert body["result"] is None
    assert body["score"] is None
    assert body["sets"] == []


def test_complete_scheduled_match_with_score(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client))).json()

    response = client.patch(f"/matches/{created['id']}", json={"score": "6-4 3-6 10-7"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "played"
    assert body["result"] == "Win"
    assert body["score"] == "6-4 3-6 10-7"
    assert len(body["sets"]) == 3


def test_complete_scheduled_match_with_nested_sets(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client))).json()

    response = client.patch(
        f"/matches/{created['id']}", json={"sets": [{"games_won": 4, "games_lost": 6}]}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "played"
    assert body["result"] == "Loss"


def test_update_replaces_sets_wholesale(client: TestClient, db_session: Session) -> None:
    created = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 3-6 10-7")
    ).json()

    response = client.patch(f"/matches/{created['id']}", json={"score": "6-3"})
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == "6-3"
    assert len(body["sets"]) == 1
    assert _count(db_session, Set) == 1  # no leftover rows from the old score


def test_update_with_invalid_score_keeps_original_sets(
    client: TestClient, db_session: Session
) -> None:
    created = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 3-6 10-7")
    ).json()

    response = client.patch(f"/matches/{created['id']}", json={"score": "7-7"})
    assert response.status_code == 422

    body = client.get(f"/matches/{created['id']}").json()
    assert body["score"] == "6-4 3-6 10-7"
    assert body["status"] == "played"
    assert _count(db_session, Set) == 3


def test_update_clearing_score_reverts_to_scheduled(
    client: TestClient, db_session: Session
) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client), score="6-4")).json()

    response = client.patch(f"/matches/{created['id']}", json={"score": None})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "scheduled"
    assert body["result"] is None
    assert body["score"] is None
    assert body["sets"] == []
    assert _count(db_session, Set) == 0


def test_update_rejects_score_and_sets_together(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client))).json()
    response = client.patch(
        f"/matches/{created['id']}",
        json={"score": "6-4", "sets": [{"games_won": 6, "games_lost": 4}]},
    )
    assert response.status_code == 422


def test_update_other_fields_leaves_score_alone(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client), score="6-4")).json()

    response = client.patch(f"/matches/{created['id']}", json={"notes": "windy day"})
    assert response.status_code == 200
    body = response.json()
    assert body["notes"] == "windy day"
    assert body["score"] == "6-4"
    assert body["result"] == "Win"


def test_update_rejects_null_opponent(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client))).json()
    response = client.patch(f"/matches/{created['id']}", json={"opponent_id": None})
    assert response.status_code == 422


def test_update_unknown_related_row_404(client: TestClient) -> None:
    created = client.post("/matches", json=_match_payload(_opponent(client))).json()
    assert client.patch(f"/matches/{created['id']}", json={"club_id": 999}).status_code == 404
    assert client.patch(f"/matches/{created['id']}", json={"opponent_id": 999}).status_code == 404


def test_update_match_not_found(client: TestClient) -> None:
    assert client.patch("/matches/999", json={"notes": "x"}).status_code == 404


# ---------------------------------------------------------------------------
# Get / delete
# ---------------------------------------------------------------------------


def test_get_match_not_found(client: TestClient) -> None:
    response = client.get("/matches/999")
    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Match 999 not found"


def test_delete_match_removes_sets(client: TestClient, db_session: Session) -> None:
    created = client.post(
        "/matches", json=_match_payload(_opponent(client), score="6-4 3-6 10-7")
    ).json()
    assert _count(db_session, Set) == 3

    response = client.delete(f"/matches/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"/matches/{created['id']}").status_code == 404
    assert _count(db_session, Set) == 0


def test_delete_match_not_found(client: TestClient) -> None:
    assert client.delete("/matches/999").status_code == 404


# ---------------------------------------------------------------------------
# List: filters (alone and combined), pagination, ordering
# ---------------------------------------------------------------------------


@pytest.fixture()
def filter_fixture(client: TestClient) -> dict[str, int]:
    """Six matches spread over opponents, clubs, tournaments, surfaces and dates."""
    nadal = _opponent(client, "Nadal")
    federer = _opponent(client, "Federer")
    club_a = _club(client, "Club A")
    club_b = _club(client, "Club B")
    tournament = _tournament(client)

    matches = [
        # date, opponent, club, tournament, surface, score
        ("2026-01-10", nadal, club_a, None, "Clay", "6-4"),
        ("2026-02-15", nadal, club_b, tournament, "Hard", "3-6 6-4 10-8"),
        ("2026-03-20", federer, club_a, tournament, "Grass", "4-6"),
        ("2026-04-25", federer, club_b, None, "Clay", "6-3 6-2 6-2"),
        ("2026-05-30", nadal, None, None, None, "7-6"),
        ("2026-06-05", federer, club_a, None, "Clay", None),  # scheduled
    ]
    for match_date, opponent_id, club_id, tournament_id, surface, score in matches:
        payload: dict[str, Any] = {"match_date": match_date, "opponent_id": opponent_id}
        if club_id is not None:
            payload["club_id"] = club_id
        if tournament_id is not None:
            payload["tournament_id"] = tournament_id
        if surface is not None:
            payload["surface"] = surface
        if score is not None:
            payload["score"] = score
        assert client.post("/matches", json=payload).status_code == 201

    return {
        "nadal": nadal,
        "federer": federer,
        "club_a": club_a,
        "club_b": club_b,
        "tournament": tournament,
    }


def test_list_no_filters_returns_all(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches").json()
    assert body["total"] == 6
    assert len(body["items"]) == 6


def test_list_orders_most_recent_first(client: TestClient, filter_fixture: dict[str, int]) -> None:
    dates = [item["match_date"] for item in client.get("/matches").json()["items"]]
    assert dates == sorted(dates, reverse=True)


def test_list_filter_opponent(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"opponent_id": filter_fixture["nadal"]}).json()
    assert body["total"] == 3
    assert all(item["opponent_id"] == filter_fixture["nadal"] for item in body["items"])


def test_list_filter_club(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"club_id": filter_fixture["club_a"]}).json()
    assert body["total"] == 3
    assert all(item["club_id"] == filter_fixture["club_a"] for item in body["items"])


def test_list_filter_tournament(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"tournament_id": filter_fixture["tournament"]}).json()
    assert body["total"] == 2
    assert all(item["match_type"] == "Competitive" for item in body["items"])


def test_list_filter_surface(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"surface": "Clay"}).json()
    assert body["total"] == 3
    assert all(item["surface"] == "Clay" for item in body["items"])


def test_list_filter_status_played(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"status": "played"}).json()
    assert body["total"] == 5
    assert all(item["result"] is not None for item in body["items"])


def test_list_filter_status_scheduled(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"status": "scheduled"}).json()
    assert body["total"] == 1
    assert body["items"][0]["result"] is None
    assert body["items"][0]["sets"] == []


def test_list_filter_date_from(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"date_from": "2026-04-25"}).json()
    assert body["total"] == 3  # inclusive lower bound


def test_list_filter_date_to(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get("/matches", params={"date_to": "2026-02-15"}).json()
    assert body["total"] == 2  # inclusive upper bound


def test_list_filter_date_range(client: TestClient, filter_fixture: dict[str, int]) -> None:
    body = client.get(
        "/matches", params={"date_from": "2026-02-01", "date_to": "2026-04-30"}
    ).json()
    assert body["total"] == 3
    assert all("2026-02-01" <= item["match_date"] <= "2026-04-30" for item in body["items"])


def test_list_filters_combined(client: TestClient, filter_fixture: dict[str, int]) -> None:
    params = {
        "opponent_id": filter_fixture["federer"],
        "surface": "Clay",
        "status": "played",
    }
    body = client.get("/matches", params=params).json()
    assert body["total"] == 1
    assert body["items"][0]["match_date"] == "2026-04-25"

    params = {
        "opponent_id": filter_fixture["nadal"],
        "club_id": filter_fixture["club_b"],
        "tournament_id": filter_fixture["tournament"],
        "date_from": "2026-01-01",
        "date_to": "2026-12-31",
        "status": "played",
        "surface": "Hard",
    }
    body = client.get("/matches", params=params).json()
    assert body["total"] == 1
    assert body["items"][0]["score"] == "3-6 6-4 10-8"


def test_list_filters_combined_can_exclude_everything(
    client: TestClient, filter_fixture: dict[str, int]
) -> None:
    params = {"opponent_id": filter_fixture["nadal"], "surface": "Grass"}
    body = client.get("/matches", params=params).json()
    assert body["total"] == 0
    assert body["items"] == []


def test_list_pagination(client: TestClient, filter_fixture: dict[str, int]) -> None:
    first = client.get("/matches", params={"limit": 4, "offset": 0}).json()
    assert first["total"] == 6
    assert first["limit"] == 4
    assert first["offset"] == 0
    assert len(first["items"]) == 4

    second = client.get("/matches", params={"limit": 4, "offset": 4}).json()
    assert len(second["items"]) == 2

    ids = [i["id"] for i in first["items"]] + [i["id"] for i in second["items"]]
    assert len(set(ids)) == 6


def test_list_pagination_with_filter(client: TestClient, filter_fixture: dict[str, int]) -> None:
    params = {"opponent_id": filter_fixture["nadal"], "limit": 2, "offset": 2}
    body = client.get("/matches", params=params).json()
    assert body["total"] == 3  # total reflects the filter, not the page
    assert len(body["items"]) == 1


def test_list_rejects_invalid_pagination(client: TestClient) -> None:
    assert client.get("/matches", params={"limit": 0}).status_code == 422
    assert client.get("/matches", params={"offset": -1}).status_code == 422


def test_list_rejects_invalid_enum_filters(client: TestClient) -> None:
    assert client.get("/matches", params={"surface": "Moon"}).status_code == 422
    assert client.get("/matches", params={"status": "abandoned"}).status_code == 422
