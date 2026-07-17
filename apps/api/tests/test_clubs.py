import pytest
from fastapi.testclient import TestClient


def test_create_club(client: TestClient) -> None:
    response = client.post(
        "/clubs",
        json={
            "name": "Riverside Tennis Club",
            "courts": [{"surface": "Clay", "environment": "Outdoor"}],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Riverside Tennis Club"
    assert len(body["courts"]) == 1
    assert body["courts"][0]["surface"] == "Clay"
    assert body["courts"][0]["environment"] == "Outdoor"
    assert "id" in body["courts"][0]
    assert "id" in body


def test_create_club_without_courts(client: TestClient) -> None:
    response = client.post("/clubs", json={"name": "Riverside"})
    assert response.status_code == 201
    assert response.json()["courts"] == []


def test_create_club_with_multiple_courts(client: TestClient) -> None:
    response = client.post(
        "/clubs",
        json={
            "name": "Big Club",
            "courts": [
                {"surface": "Clay", "environment": "Outdoor"},
                {"surface": "Hard", "environment": "Indoor"},
            ],
        },
    )
    assert response.status_code == 201
    body = response.json()
    surfaces = {(c["surface"], c["environment"]) for c in body["courts"]}
    assert surfaces == {("Clay", "Outdoor"), ("Hard", "Indoor")}


def test_create_club_rejects_duplicate_courts(client: TestClient) -> None:
    response = client.post(
        "/clubs",
        json={
            "name": "Dup Club",
            "courts": [
                {"surface": "Clay", "environment": "Outdoor"},
                {"surface": "Clay", "environment": "Outdoor"},
            ],
        },
    )
    assert response.status_code == 422


def test_create_club_requires_name(client: TestClient) -> None:
    response = client.post("/clubs", json={"city": "London"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["message"] == "Validation error"
    assert body["error"]["details"]


def test_create_club_rejects_invalid_enum(client: TestClient) -> None:
    response = client.post(
        "/clubs",
        json={"name": "Riverside", "courts": [{"surface": "Ice", "environment": "Indoor"}]},
    )
    assert response.status_code == 422


def test_update_club_courts_add_update_delete(client: TestClient) -> None:
    created = client.post(
        "/clubs",
        json={
            "name": "Evolving Club",
            "courts": [
                {"surface": "Clay", "environment": "Outdoor"},
                {"surface": "Grass", "environment": "Outdoor"},
            ],
        },
    ).json()
    courts = {c["surface"]: c for c in created["courts"]}

    # Keep+update the clay court, drop grass, add a new hard court.
    response = client.patch(
        f"/clubs/{created['id']}",
        json={
            "courts": [
                {"id": courts["Clay"]["id"], "surface": "Clay", "environment": "Indoor"},
                {"surface": "Hard", "environment": "Indoor"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    result = {(c["surface"], c["environment"]) for c in body["courts"]}
    assert result == {("Clay", "Indoor"), ("Hard", "Indoor")}
    # The kept court retained its id (updated in place, not recreated).
    clay = next(c for c in body["courts"] if c["surface"] == "Clay")
    assert clay["id"] == courts["Clay"]["id"]


def test_update_club_courts_omitted_leaves_them_untouched(client: TestClient) -> None:
    created = client.post(
        "/clubs",
        json={"name": "Stable Club", "courts": [{"surface": "Clay", "environment": "Outdoor"}]},
    ).json()

    response = client.patch(f"/clubs/{created['id']}", json={"city": "Paris"})
    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "Paris"
    assert len(body["courts"]) == 1


def test_update_club_courts_empty_list_clears_them(client: TestClient) -> None:
    created = client.post(
        "/clubs",
        json={"name": "Clearing Club", "courts": [{"surface": "Clay", "environment": "Outdoor"}]},
    ).json()

    response = client.patch(f"/clubs/{created['id']}", json={"courts": []})
    assert response.status_code == 200
    assert response.json()["courts"] == []


def test_get_club(client: TestClient) -> None:
    created = client.post("/clubs", json={"name": "Riverside"}).json()
    response = client.get(f"/clubs/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Riverside"


def test_get_club_not_found(client: TestClient) -> None:
    response = client.get("/clubs/999")
    assert response.status_code == 404
    assert response.json() == {"error": {"message": "Club 999 not found", "details": None}}


def test_list_clubs_pagination(client: TestClient) -> None:
    for name in ["Riverside", "Lakeside", "Hillcrest", "Meadowbrook"]:
        client.post("/clubs", json={"name": name})

    response = client.get("/clubs", params={"limit": 2, "offset": 0})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert body["limit"] == 2
    assert len(body["items"]) == 2


def test_list_clubs_rejects_invalid_pagination(client: TestClient) -> None:
    response = client.get("/clubs", params={"offset": -1})
    assert response.status_code == 422


def test_list_clubs_search_matches_name(client: TestClient) -> None:
    client.post("/clubs", json={"name": "Riverside Tennis Club"})
    client.post("/clubs", json={"name": "Lakeside Racquet Club"})

    response = client.get("/clubs", params={"search": "river"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Riverside Tennis Club"


def test_update_club(client: TestClient) -> None:
    created = client.post("/clubs", json={"name": "Riverside"}).json()

    response = client.patch(f"/clubs/{created['id']}", json={"city": "London"})
    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "London"
    assert body["name"] == "Riverside"


def test_update_club_not_found(client: TestClient) -> None:
    response = client.patch("/clubs/999", json={"city": "London"})
    assert response.status_code == 404


def test_update_club_rejects_invalid_value(client: TestClient) -> None:
    created = client.post("/clubs", json={"name": "Riverside"}).json()
    response = client.patch(f"/clubs/{created['id']}", json={"name": ""})
    assert response.status_code == 422


def test_delete_club(client: TestClient) -> None:
    created = client.post("/clubs", json={"name": "Riverside"}).json()

    response = client.delete(f"/clubs/{created['id']}")
    assert response.status_code == 204

    assert client.get(f"/clubs/{created['id']}").status_code == 404


def test_delete_club_not_found(client: TestClient) -> None:
    response = client.delete("/clubs/999")
    assert response.status_code == 404


def test_create_club_with_icon_round_trips(client: TestClient) -> None:
    response = client.post("/clubs", json={"name": "Riverside", "icon": "icon:map-pin:secondary"})
    assert response.status_code == 201
    created = response.json()
    assert created["icon"] == "icon:map-pin:secondary"

    response = client.patch(f"/clubs/{created['id']}", json={"icon": "emoji:🏟️"})
    assert response.status_code == 200
    assert response.json()["icon"] == "emoji:🏟️"


@pytest.mark.parametrize(
    "icon",
    [
        "not-an-encoding",
        "icon:not-a-real-icon:secondary",
        "icon:map-pin:hotpink",
        "emoji:",
    ],
)
def test_create_club_rejects_invalid_icon(client: TestClient, icon: str) -> None:
    response = client.post("/clubs", json={"name": "Riverside", "icon": icon})
    assert response.status_code == 422
