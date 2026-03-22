import sys
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient as HttpxAsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import routes.auth as auth_routes


class MockResponse:
    def __init__(self, status_code: int, payload: dict, text: str = ""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        return self._payload


def build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_routes.zoho_router)
    return app


@pytest.fixture(autouse=True)
def reset_zoho_state(monkeypatch):
    monkeypatch.setattr(auth_routes, "ZOHO_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(auth_routes, "ZOHO_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setattr(auth_routes, "ZOHO_REDIRECT_URI", "https://example.com/oauth/callback")
    auth_routes._LOGGED_ZOHO_REFRESH_TOKEN_FINGERPRINTS.clear()


@pytest.mark.asyncio
async def test_zoho_callback_logs_refresh_token_once(capsys, monkeypatch):
    calls = []

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, data=None):
            calls.append({"url": url, "data": data})
            return MockResponse(
                200,
                {
                    "refresh_token": "refresh-123",
                    "access_token": "access-123",
                },
            )

    monkeypatch.setattr(auth_routes.httpx, "AsyncClient", MockAsyncClient)

    app = build_test_app()
    transport = ASGITransport(app=app)

    async with HttpxAsyncClient(transport=transport, base_url="http://testserver") as client:
        first_response = await client.get("/oauth/callback", params={"code": "abc123"})
        second_response = await client.get("/oauth/callback", params={"code": "abc123"})

    assert first_response.status_code == 200
    assert first_response.json()["success"] is True
    assert "Check backend logs for refresh token" in first_response.json()["message"]

    assert second_response.status_code == 200
    assert "already logged" in second_response.json()["message"]

    assert calls == [
        {
            "url": "https://accounts.zoho.com/oauth/v2/token",
            "data": {
                "code": "abc123",
                "client_id": "test-client-id",
                "client_secret": "test-client-secret",
                "redirect_uri": "https://example.com/oauth/callback",
                "grant_type": "authorization_code",
            },
        },
        {
            "url": "https://accounts.zoho.com/oauth/v2/token",
            "data": {
                "code": "abc123",
                "client_id": "test-client-id",
                "client_secret": "test-client-secret",
                "redirect_uri": "https://example.com/oauth/callback",
                "grant_type": "authorization_code",
            },
        },
    ]

    output = capsys.readouterr().out
    assert output.count("[Zoho OAuth] REFRESH TOKEN: refresh-123") == 1
    assert "[Zoho OAuth] ACCESS TOKEN: access-123" in output
    assert "skipping duplicate token log" in output


@pytest.mark.asyncio
async def test_zoho_callback_requires_code():
    app = build_test_app()
    transport = ASGITransport(app=app)

    async with HttpxAsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/oauth/callback")

    assert response.status_code == 400
    assert response.json() == {"error": "No code provided"}


@pytest.mark.asyncio
async def test_zoho_callback_surfaces_exchange_errors(monkeypatch):
    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, data=None):
            return MockResponse(400, {"error": "invalid_code"}, text="invalid_code")

    monkeypatch.setattr(auth_routes.httpx, "AsyncClient", MockAsyncClient)

    app = build_test_app()
    transport = ASGITransport(app=app)

    async with HttpxAsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/oauth/callback", params={"code": "bad-code"})

    assert response.status_code == 500
    assert response.json() == {"error": "Zoho token exchange failed: invalid_code"}
