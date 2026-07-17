"""Round-trip tests: export -> import via POST /import, and destructive replace semantics.

Reuses test_export.py's seed data and snapshot helpers so both tests are
asserting against the exact same "one of everything" dataset.
"""

from __future__ import annotations

import csv
import io
import json
import zipfile

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_export import _seed_data, _snapshot

from app.models import Club, Court


def test_csv_export_import_round_trips_through_the_endpoint(
    client: TestClient, db_session: Session
) -> None:
    _seed_data(db_session)
    before = _snapshot(db_session)
    assert all(rows for rows in before.values())

    export_response = client.get("/export/csv")
    assert export_response.status_code == 200

    import_response = client.post(
        "/import",
        files={"file": ("tennisfolio-export.zip", export_response.content, "application/zip")},
    )
    assert import_response.status_code == 200
    body = import_response.json()
    assert body["skipped"] == []
    assert body["clubs"] == 2
    assert body["courts"] == 1
    assert body["opponents"] == 2
    assert body["tournaments"] == 1
    assert body["matches"] == 3
    assert body["sets"] == 3

    db_session.expire_all()
    after = _snapshot(db_session)
    assert after == before


def test_json_export_import_round_trips_through_the_endpoint(
    client: TestClient, db_session: Session
) -> None:
    _seed_data(db_session)
    before = _snapshot(db_session)
    assert all(rows for rows in before.values())

    export_response = client.get("/export/json")
    assert export_response.status_code == 200

    import_response = client.post(
        "/import",
        files={
            "file": (
                "tennisfolio-export.json",
                export_response.content,
                "application/json",
            )
        },
    )
    assert import_response.status_code == 200
    body = import_response.json()
    assert body["skipped"] == []
    assert body["clubs"] == 2
    assert body["courts"] == 1
    assert body["opponents"] == 2
    assert body["tournaments"] == 1
    assert body["matches"] == 3
    assert body["sets"] == 3

    db_session.expire_all()
    after = _snapshot(db_session)
    assert after == before


def test_import_replaces_rather_than_merges(client: TestClient, db_session: Session) -> None:
    """Existing data must be wiped, not merged with, the imported data."""
    stale_club = Club(name="Stale Club")
    db_session.add(stale_club)
    db_session.commit()

    payload = {
        "exported_at": "2026-01-01T00:00:00",
        "clubs": [
            {
                "id": 1,
                "name": "Fresh Club",
                "city": None,
                "country": None,
            }
        ],
        "courts": [],
        "opponents": [],
        "tournaments": [],
        "matches": [],
    }
    response = client.post(
        "/import",
        files={"file": ("export.json", json.dumps(payload).encode(), "application/json")},
    )
    assert response.status_code == 200

    db_session.expire_all()
    clubs = list(db_session.query(Club).all())
    assert [c.name for c in clubs] == ["Fresh Club"]


def test_import_rejects_unrecognized_file(client: TestClient) -> None:
    response = client.post(
        "/import",
        files={"file": ("garbage.bin", b"not a zip or json", "application/octet-stream")},
    )
    assert response.status_code == 400


def test_import_rejects_empty_file(client: TestClient) -> None:
    response = client.post(
        "/import",
        files={"file": ("empty.json", b"", "application/json")},
    )
    assert response.status_code == 400


def test_import_rejects_csv_zip_missing_a_file(client: TestClient) -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr("clubs.csv", "club_id,name,city,country\n")
    response = client.post(
        "/import",
        files={"file": ("export.zip", buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 400


def test_import_rejects_json_missing_required_keys(client: TestClient) -> None:
    response = client.post(
        "/import",
        files={
            "file": (
                "export.json",
                json.dumps({"clubs": []}).encode(),
                "application/json",
            )
        },
    )
    assert response.status_code == 400


def test_import_skips_invalid_rows_and_reports_them(
    client: TestClient, db_session: Session
) -> None:
    buffer = io.BytesIO()

    def _csv(header: list[str], rows: list[list[str]]) -> str:
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(header)
        writer.writerows(rows)
        return out.getvalue()

    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr(
            "clubs.csv",
            _csv(
                ["club_id", "name", "city", "country"],
                [["clu-1", "Weird Club", "", ""]],
            ),
        )
        zf.writestr(
            "courts.csv",
            _csv(
                ["court_id", "club_id", "surface", "environment"],
                [["cou-1", "clu-1", "Volcanic", "Outdoor"]],
            ),
        )
        zf.writestr(
            "opponents.csv",
            _csv(
                [
                    "opponent_id",
                    "last_name",
                    "name",
                    "nationality",
                    "handeness",
                    "age_range",
                    "level",
                    "notes",
                ],
                [],
            ),
        )
        zf.writestr(
            "tournaments.csv",
            _csv(
                [
                    "tournament_id",
                    "name",
                    "season",
                    "tournament_type",
                    "format",
                    "club_id",
                    "start_date",
                    "end_date",
                    "notes",
                ],
                [],
            ),
        )
        zf.writestr(
            "matches.csv",
            _csv(
                [
                    "match_id",
                    "match_date",
                    "opponent_id",
                    "club_id",
                    "court_id",
                    "tournament_id",
                    "stage",
                    "duration_min",
                    "status",
                    "notes",
                ],
                [],
            ),
        )
        zf.writestr(
            "sets.csv",
            _csv(["set_id", "match_id", "set_no", "games_won", "games_lost", "tiebreak"], []),
        )

    response = client.post(
        "/import",
        files={"file": ("export.zip", buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 200
    body = response.json()
    # The club is valid and imported; the court with the bogus surface is skipped.
    assert body["clubs"] == 1
    assert body["courts"] == 0
    assert len(body["skipped"]) == 1
    assert "Volcanic" in body["skipped"][0]

    db_session.expire_all()
    assert db_session.query(Club).count() == 1
    assert db_session.query(Court).count() == 0
