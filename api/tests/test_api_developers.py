"""Tests for the developer-facing OpenAPI mirror + Postman collection."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def test_openapi_mirror_returns_valid_schema() -> None:
    r = client.get("/api/v1/openapi.json")
    assert r.status_code == 200
    body = r.json()
    assert "paths" in body
    assert "info" in body
    assert "/api/v1/health" in body["paths"]


def test_postman_collection_is_valid_v21() -> None:
    r = client.get("/api/v1/postman.json")
    assert r.status_code == 200
    body = r.json()
    assert body["info"]["schema"].endswith("collection.json")
    assert isinstance(body["item"], list)
    assert len(body["item"]) > 0
    # Each item is a folder with sub-items
    for folder in body["item"]:
        assert "name" in folder
        assert "item" in folder
        assert isinstance(folder["item"], list)


def test_postman_includes_base_url_variable() -> None:
    r = client.get("/api/v1/postman.json")
    body = r.json()
    keys = {v["key"] for v in body["variable"]}
    assert "base_url" in keys


def test_postman_health_endpoint_is_listed() -> None:
    r = client.get("/api/v1/postman.json")
    body = r.json()
    all_urls = []
    for folder in body["item"]:
        for item in folder["item"]:
            all_urls.append(item["request"]["url"]["raw"])
    assert any("/api/v1/health" in u for u in all_urls)


def test_postman_post_endpoints_have_body() -> None:
    r = client.get("/api/v1/postman.json")
    body = r.json()
    posts = []
    for folder in body["item"]:
        for item in folder["item"]:
            if item["request"]["method"] == "POST":
                posts.append(item)
    # /api/v1/recommend and /api/v1/simulate are both POSTs and should have a body
    assert len(posts) >= 2
    for p in posts:
        assert "body" in p["request"]
        assert p["request"]["body"]["mode"] == "raw"
