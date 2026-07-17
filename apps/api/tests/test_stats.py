"""Tests for /stats: win-rate breakdowns, streaks, tiebreak and deciding-set records.

All stats are derived on read from matches/sets; the fixture below builds a
known sequence of results so each aggregate can be checked against a
hand-computed expectation.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient


def _opponent(client: TestClient, last_name: str = "Nadal") -> int:
    return client.post("/opponents", json={"last_name": last_name}).json()["id"]


def _club(client: TestClient, name: str = "Club A", **overrides: Any) -> int:
    return client.post("/clubs", json={"name": name, **overrides}).json()["id"]


def _club_with_courts(
    client: TestClient, name: str, surfaces: list[str]
) -> tuple[int, dict[str, int]]:
    """Create a club with one court per surface; return (club_id, {surface: court_id})."""
    courts = [{"surface": surface, "environment": "Outdoor"} for surface in surfaces]
    body = client.post("/clubs", json={"name": name, "courts": courts}).json()
    return body["id"], {c["surface"]: c["id"] for c in body["courts"]}


def _tournament(client: TestClient, name: str = "Club Open", **overrides: Any) -> int:
    payload = {"name": name, "tournament_type": "Knockout Tournament", **overrides}
    return client.post("/tournaments", json=payload).json()["id"]


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


# ---------------------------------------------------------------------------
# Overall win-rate and breakdowns
# ---------------------------------------------------------------------------


@pytest.fixture()
def win_rate_fixture(client: TestClient) -> dict[str, int]:
    """4 matches: 3 wins, 1 loss, split across two surfaces and two opponents."""
    nadal = _opponent(client, "Nadal")
    federer = _opponent(client, "Federer")
    club, courts = _club_with_courts(client, "Home Club", ["Clay", "Hard"])
    tournament = _tournament(client)

    _match(client, nadal, "2026-01-05", "6-4", court_id=courts["Clay"], club_id=club)
    _match(client, nadal, "2026-01-12", "6-3", court_id=courts["Clay"], club_id=club)
    _match(
        client,
        federer,
        "2026-02-10",
        "6-4",
        court_id=courts["Hard"],
        club_id=club,
        tournament_id=tournament,
    )
    _match(
        client,
        federer,
        "2026-02-20",
        "3-6",
        court_id=courts["Hard"],
        club_id=club,
        tournament_id=tournament,
    )
    return {"nadal": nadal, "federer": federer, "club": club, "tournament": tournament}


def test_overall_win_rate(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate").json()
    assert body == {"matches": 4, "wins": 3, "losses": 1, "win_rate": 0.75}


def test_overall_win_rate_no_matches(client: TestClient) -> None:
    body = client.get("/stats/win-rate").json()
    assert body == {"matches": 0, "wins": 0, "losses": 0, "win_rate": None}


def test_win_rate_excludes_scheduled_matches(
    client: TestClient, win_rate_fixture: dict[str, int]
) -> None:
    client.post(
        "/matches",
        json={"match_date": "2026-03-01", "opponent_id": win_rate_fixture["nadal"]},
    )
    body = client.get("/stats/win-rate").json()
    assert body["matches"] == 4  # the scheduled match isn't counted


def test_win_rate_by_surface(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate/by-surface").json()
    by_surface = {row["surface"]: row for row in body}
    assert by_surface["Clay"] == {
        "surface": "Clay",
        "matches": 2,
        "wins": 2,
        "losses": 0,
        "win_rate": 1.0,
    }
    assert by_surface["Hard"] == {
        "surface": "Hard",
        "matches": 2,
        "wins": 1,
        "losses": 1,
        "win_rate": 0.5,
    }


def test_win_rate_by_opponent(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate/by-opponent").json()
    by_opponent = {row["opponent_id"]: row for row in body}
    assert by_opponent[win_rate_fixture["nadal"]]["matches"] == 2
    assert by_opponent[win_rate_fixture["nadal"]]["win_rate"] == 1.0
    assert by_opponent[win_rate_fixture["federer"]]["matches"] == 2
    assert by_opponent[win_rate_fixture["federer"]]["win_rate"] == 0.5
    assert by_opponent[win_rate_fixture["nadal"]]["opponent_name"] == "Nadal"


def test_win_rate_by_club(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate/by-club").json()
    assert body == [
        {
            "club_id": win_rate_fixture["club"],
            "club_name": "Home Club",
            "matches": 4,
            "wins": 3,
            "losses": 1,
            "win_rate": 0.75,
        }
    ]


def test_win_rate_by_tournament(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate/by-tournament").json()
    assert body == [
        {
            "tournament_id": win_rate_fixture["tournament"],
            "tournament_name": "Club Open",
            "matches": 2,
            "wins": 1,
            "losses": 1,
            "win_rate": 0.5,
        }
    ]


def test_win_rate_by_period_month(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate/by-period", params={"granularity": "month"}).json()
    by_period = {row["period"]: row for row in body}
    assert by_period["2026-01"]["matches"] == 2
    assert by_period["2026-01"]["win_rate"] == 1.0
    assert by_period["2026-02"]["matches"] == 2
    assert by_period["2026-02"]["win_rate"] == 0.5


def test_win_rate_by_period_season(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    tournament_with_season = _tournament(client, "Winter League", season="2026 Winter")
    _match(
        client,
        win_rate_fixture["nadal"],
        "2026-03-01",
        "6-0",
        tournament_id=tournament_with_season,
    )
    body = client.get("/stats/win-rate/by-period", params={"granularity": "season"}).json()
    assert body == [
        {
            "period": "2026 Winter",
            "matches": 1,
            "wins": 1,
            "losses": 0,
            "win_rate": 1.0,
        }
    ]


def test_win_rate_filters_by_opponent(client: TestClient, win_rate_fixture: dict[str, int]) -> None:
    body = client.get("/stats/win-rate", params={"opponent_id": win_rate_fixture["federer"]}).json()
    assert body == {"matches": 2, "wins": 1, "losses": 1, "win_rate": 0.5}


def test_win_rate_filters_by_date_range(
    client: TestClient, win_rate_fixture: dict[str, int]
) -> None:
    body = client.get(
        "/stats/win-rate", params={"date_from": "2026-02-01", "date_to": "2026-02-28"}
    ).json()
    assert body == {"matches": 2, "wins": 1, "losses": 1, "win_rate": 0.5}


# ---------------------------------------------------------------------------
# Streaks
# ---------------------------------------------------------------------------


@pytest.fixture()
def streak_fixture(client: TestClient) -> int:
    """W L W W W L W, in chronological order -> longest win streak 3, current streak L1... W1.

    Sequence (oldest -> newest): W, L, W, W, W, L, W
    - longest win streak = 3 (matches 3-5)
    - longest loss streak = 1
    - current streak = W, length 1 (the most recent match)
    """
    opponent = _opponent(client)
    results = ["6-0", "0-6", "6-1", "6-2", "6-3", "1-6", "6-4"]
    for i, score in enumerate(results):
        _match(client, opponent, f"2026-01-{i + 1:02d}", score)
    return opponent


def test_longest_streaks(client: TestClient, streak_fixture: int) -> None:
    body = client.get("/stats/streaks").json()
    assert body["longest_win_streak"] == 3
    assert body["longest_loss_streak"] == 1


def test_current_streak(client: TestClient, streak_fixture: int) -> None:
    body = client.get("/stats/streaks").json()
    assert body["current_streak_type"] == "Win"
    assert body["current_streak_length"] == 1


def test_current_streak_multi_match(client: TestClient) -> None:
    opponent = _opponent(client)
    for i, score in enumerate(["0-6", "6-0", "6-1", "6-2"]):
        _match(client, opponent, f"2026-02-{i + 1:02d}", score)
    body = client.get("/stats/streaks").json()
    assert body["current_streak_type"] == "Win"
    assert body["current_streak_length"] == 3
    assert body["longest_win_streak"] == 3
    assert body["longest_loss_streak"] == 1


def test_streaks_no_matches(client: TestClient) -> None:
    body = client.get("/stats/streaks").json()
    assert body == {
        "current_streak_type": None,
        "current_streak_length": 0,
        "longest_win_streak": 0,
        "longest_loss_streak": 0,
    }


def test_streaks_respect_date_ordering_not_insertion_order(client: TestClient) -> None:
    """Insert out of chronological order; streaks must follow match_date, not id."""
    opponent = _opponent(client)
    _match(client, opponent, "2026-03-03", "6-0")  # 3rd chronologically: Win
    _match(client, opponent, "2026-03-01", "6-0")  # 1st chronologically: Win
    _match(client, opponent, "2026-03-02", "0-6")  # 2nd chronologically: Loss
    body = client.get("/stats/streaks").json()
    assert body["current_streak_type"] == "Win"
    assert body["current_streak_length"] == 1
    assert body["longest_win_streak"] == 1
    assert body["longest_loss_streak"] == 1


# ---------------------------------------------------------------------------
# Tiebreak and deciding-set records
# ---------------------------------------------------------------------------


@pytest.fixture()
def tiebreak_fixture(client: TestClient) -> int:
    opponent = _opponent(client)
    # Tiebreak set won (7-6), straight-sets win overall.
    _match(client, opponent, "2026-01-01", "7-6 6-4")
    # Tiebreak set lost (6-7) within a match that's ultimately won via a decider.
    _match(client, opponent, "2026-01-02", "6-7 6-3 6-2")
    # No tiebreaks at all.
    _match(client, opponent, "2026-01-03", "6-0 6-0")
    return opponent


def test_tiebreak_record(client: TestClient, tiebreak_fixture: int) -> None:
    body = client.get("/stats/tiebreaks").json()
    assert body == {"played": 2, "wins": 1, "losses": 1, "win_rate": 0.5}


def test_tiebreak_record_no_tiebreaks(client: TestClient) -> None:
    opponent = _opponent(client)
    _match(client, opponent, "2026-01-01", "6-0 6-0")
    body = client.get("/stats/tiebreaks").json()
    assert body == {"played": 0, "wins": 0, "losses": 0, "win_rate": None}


@pytest.fixture()
def deciding_set_fixture(client: TestClient) -> int:
    opponent = _opponent(client)
    _match(client, opponent, "2026-01-01", "6-4")  # straight sets, no decider
    _match(client, opponent, "2026-01-02", "6-4 3-6 6-2")  # decider, won
    _match(client, opponent, "2026-01-03", "6-4 3-6 2-6")  # decider, lost
    return opponent


def test_deciding_set_record(client: TestClient, deciding_set_fixture: int) -> None:
    body = client.get("/stats/deciding-sets").json()
    assert body == {"played": 2, "wins": 1, "losses": 1, "win_rate": 0.5}


def test_deciding_set_record_no_deciders(client: TestClient) -> None:
    opponent = _opponent(client)
    _match(client, opponent, "2026-01-01", "6-4 6-3")
    body = client.get("/stats/deciding-sets").json()
    assert body == {"played": 0, "wins": 0, "losses": 0, "win_rate": None}


# ---------------------------------------------------------------------------
# Games ratio and matches-per-month
# ---------------------------------------------------------------------------


def test_games_ratio(client: TestClient) -> None:
    opponent = _opponent(client)
    _match(client, opponent, "2026-01-01", "6-4 6-4")  # 12-8
    _match(client, opponent, "2026-01-02", "4-6")  # 4-6, loss
    body = client.get("/stats/games").json()
    assert body == {"games_won": 16, "games_lost": 14, "ratio": pytest.approx(16 / 14)}


def test_games_ratio_no_matches(client: TestClient) -> None:
    body = client.get("/stats/games").json()
    assert body == {"games_won": 0, "games_lost": 0, "ratio": None}


def test_matches_per_month(client: TestClient) -> None:
    opponent = _opponent(client)
    _match(client, opponent, "2026-01-05", "6-0")
    _match(client, opponent, "2026-01-20", "6-0")
    _match(client, opponent, "2026-02-01", "6-0")
    body = client.get("/stats/matches-per-month").json()
    assert body == [
        {"period": "2026-01", "matches": 2},
        {"period": "2026-02", "matches": 1},
    ]
