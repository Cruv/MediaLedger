from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.media_servers.models import (
    NormalizedLibrary,
    NormalizedLibraryItem,
    NormalizedServerInfo,
    NormalizedSession,
    NormalizedUser,
)


class MediaServerClient(ABC):
    """Abstract base class for Emby and Jellyfin API clients."""

    def __init__(self, base_url: str, api_key: str, server_id: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.server_id = server_id
        self._http: Optional[httpx.AsyncClient] = None

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self._get_headers(),
                timeout=30.0,
            )
        return self._http

    @abstractmethod
    def _get_headers(self) -> dict[str, str]:
        ...

    async def _get(self, path: str, params: dict | None = None) -> dict | list:
        resp = await self._get_http().get(path, params=params)
        resp.raise_for_status()
        return resp.json()

    @abstractmethod
    async def test_connection(self) -> NormalizedServerInfo:
        ...

    @abstractmethod
    async def get_sessions(self) -> list[NormalizedSession]:
        ...

    @abstractmethod
    async def get_users(self) -> list[NormalizedUser]:
        ...

    @abstractmethod
    async def get_libraries(self) -> list[NormalizedLibrary]:
        ...

    @abstractmethod
    async def get_library_items(
        self,
        library_id: str,
        item_type: Optional[str] = None,
        start_index: int = 0,
        limit: int = 100,
    ) -> tuple[list[NormalizedLibraryItem], int]:
        """Returns (items, total_count)."""
        ...

    async def _post(self, path: str, json: dict | None = None, params: dict | None = None) -> dict | list:
        resp = await self._get_http().post(path, json=json, params=params)
        resp.raise_for_status()
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()

    async def get_system_info(self) -> dict:
        """Get extended system info (health metrics)."""
        return await self._get("/System/Info")

    async def create_user(self, username: str, password: str) -> dict:
        """Create a new user on the media server. Returns raw API response."""
        return await self._post("/Users/New", json={"Name": username, "Password": password})

    async def set_user_policy(self, user_id: str, policy: dict) -> None:
        """Update a user's policy (library access, stream limits, etc.)."""
        resp = await self._get_http().post(
            f"/Users/{user_id}/Policy", json=policy
        )
        resp.raise_for_status()

    async def get_user_policy(self, user_id: str) -> dict:
        """Get a user's current policy."""
        data = await self._get(f"/Users/{user_id}")
        return data.get("Policy", {})

    async def close(self):
        if self._http and not self._http.is_closed:
            await self._http.aclose()
