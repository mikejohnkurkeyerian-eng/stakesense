from fastapi.testclient import TestClient

from stakesense.api.main import app


def test_health_returns_ok():
    r = TestClient(app).get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert "model_version" in body
