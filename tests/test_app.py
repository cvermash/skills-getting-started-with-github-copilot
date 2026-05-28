# Tests follow Arrange-Act-Assert (AAA) pattern for clarity

def test_get_activities(client):
    # Arrange: client fixture provides TestClient and activities are in default state

    # Act
    resp = client.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data


def test_signup_and_unregister(client):
    # Arrange
    email = "testuser@example.com"
    activity = "Chess Club"

    # Act: signup
    r = client.post(f"/activities/{activity}/signup?email={email}")

    # Assert signup succeeded
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Act: duplicate signup
    r2 = client.post(f"/activities/{activity}/signup?email={email}")

    # Assert duplicate rejected
    assert r2.status_code == 400

    # Act: unregister
    r3 = client.post(f"/activities/{activity}/unregister?email={email}")

    # Assert unregister succeeded
    assert r3.status_code == 200
    assert "Unregistered" in r3.json().get("message", "")

    # Act: unregister again
    r4 = client.post(f"/activities/{activity}/unregister?email={email}")

    # Assert 404
    assert r4.status_code == 404
