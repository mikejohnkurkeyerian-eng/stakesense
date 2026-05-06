"""Developer-facing endpoints: OpenAPI mirror + Postman collection generator.

FastAPI exposes /openapi.json by default at the root. We mirror it at
/api/v1/openapi.json so the public versioned surface is stable, and we
generate a Postman v2.1 collection from the same schema.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1", tags=["developers"])


@router.get("/openapi.json")
def openapi_mirror(request: Request) -> dict[str, Any]:
    """Versioned mirror of the auto-generated FastAPI OpenAPI schema."""
    return request.app.openapi()


@router.get("/postman.json")
def postman_collection(request: Request) -> dict[str, Any]:
    """Postman v2.1 collection generated from the OpenAPI schema.

    Importable into Postman (or Insomnia, Hoppscotch) directly via URL.
    """
    schema = request.app.openapi()
    base_url = "{{base_url}}"

    folders: dict[str, dict[str, Any]] = {}

    for path, methods in schema.get("paths", {}).items():
        for method, op in methods.items():
            if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                continue
            tags = op.get("tags") or ["uncategorized"]
            folder_name = tags[0]
            folder = folders.setdefault(
                folder_name,
                {"name": folder_name, "item": []},
            )
            url_path = path.replace("{", ":").replace("}", "")
            request_item: dict[str, Any] = {
                "name": op.get("summary") or f"{method.upper()} {path}",
                "request": {
                    "method": method.upper(),
                    "header": [{"key": "Accept", "value": "application/json"}],
                    "url": {
                        "raw": f"{base_url}{url_path}",
                        "host": [base_url],
                        "path": [p for p in url_path.split("/") if p],
                    },
                    "description": op.get("description") or op.get("summary") or "",
                },
                "response": [],
            }

            body = op.get("requestBody", {}).get("content", {}).get("application/json", {})
            example = body.get("example") or body.get("schema", {}).get("example")
            if example is None and body.get("schema"):
                example = _example_from_schema(body["schema"], schema)
            if example is not None:
                import json as _json

                request_item["request"]["body"] = {
                    "mode": "raw",
                    "raw": _json.dumps(example, indent=2),
                    "options": {"raw": {"language": "json"}},
                }
                request_item["request"]["header"].append(
                    {"key": "Content-Type", "value": "application/json"}
                )

            folder["item"].append(request_item)

    return {
        "info": {
            "name": "stakesense API",
            "_postman_id": "stakesense-public-api",
            "description": (
                "Public REST API for stakesense — predictive Solana validator scoring. "
                "Set the {{base_url}} variable to https://stakesense.onrender.com."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": list(folders.values()),
        "variable": [
            {
                "key": "base_url",
                "value": "https://stakesense.onrender.com",
                "type": "string",
            }
        ],
    }


def _example_from_schema(schema_def: dict[str, Any], full: dict[str, Any]) -> Any:
    """Tiny fallback example builder for OpenAPI schemas without explicit examples."""
    if not isinstance(schema_def, dict):
        return None
    if "$ref" in schema_def:
        ref = schema_def["$ref"].split("/")[-1]
        target = full.get("components", {}).get("schemas", {}).get(ref, {})
        return _example_from_schema(target, full)
    t = schema_def.get("type")
    if t == "object":
        out: dict[str, Any] = {}
        for k, v in (schema_def.get("properties") or {}).items():
            out[k] = _example_from_schema(v, full)
        return out
    if t == "array":
        return [_example_from_schema(schema_def.get("items") or {}, full)]
    if t == "integer":
        return 0
    if t == "number":
        return 0.0
    if t == "boolean":
        return False
    return ""
