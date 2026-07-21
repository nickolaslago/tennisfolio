"""Tests for DELETE /data: wipes every user-data table."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_export import _seed_data, _snapshot

from app.models import Club, Court, Match, Opponent, Set, Tournament


def test_delete_all_data_empties_every_table(client: TestClient, db_session: Session) -> None:
    _seed_data(db_session)
    before = _snapshot(db_session)
    assert all(rows for rows in before.values())

    response = client.delete("/data")
    assert response.status_code == 204
    assert response.content == b""

    db_session.expire_all()
    assert db_session.query(Club).count() == 0
    assert db_session.query(Court).count() == 0
    assert db_session.query(Opponent).count() == 0
    assert db_session.query(Tournament).count() == 0
    assert db_session.query(Match).count() == 0
    assert db_session.query(Set).count() == 0


def test_delete_all_data_leaves_list_endpoints_empty(
    client: TestClient, db_session: Session
) -> None:
    _seed_data(db_session)

    response = client.delete("/data")
    assert response.status_code == 204

    for path in ("/clubs", "/opponents", "/tournaments", "/matches"):
        list_response = client.get(path)
        assert list_response.status_code == 200
        body = list_response.json()
        assert body["items"] == []
        assert body["total"] == 0


def test_delete_all_data_on_empty_database(client: TestClient) -> None:
    response = client.delete("/data")
    assert response.status_code == 204
