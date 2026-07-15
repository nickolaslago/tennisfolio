from fastapi.testclient import TestClient


def test_create_club(client: TestClient) -> None:
    response = client.post(
        "/clubs",
        json={"name": "Riverside Tennis Club", "surface": "Clay", "environment": "Outdoor"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Riverside Tennis Club"
    assert body["surface"] == "Clay"
    assert "id" in body


def test_create_club_requires_name(client: TestClient) -> None:
    response = client.post("/clubs", json={"city": "London"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["message"] == "Validation error"
    assert body["error"]["details"]


def test_create_club_rejects_invalid_enum(client: TestClient) -> None:
    response = client.post("/clubs", json={"name": "Riverside", "surface": "Ice"})
    assert response.status_code == 422


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
