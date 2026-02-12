from app.media_servers.base import MediaServerClient
from app.media_servers.emby import EmbyClient
from app.media_servers.jellyfin import JellyfinClient

_clients: dict[str, MediaServerClient] = {}


def create_client(server_type: str, base_url: str, api_key: str, server_id: str) -> MediaServerClient:
    if server_type == "emby":
        return EmbyClient(base_url, api_key, server_id)
    elif server_type == "jellyfin":
        return JellyfinClient(base_url, api_key, server_id)
    raise ValueError(f"Unknown server type: {server_type}")


async def get_client(server_id: str, server_type: str, base_url: str, api_key: str) -> MediaServerClient:
    """Get or create a cached client for a server."""
    if server_id not in _clients:
        _clients[server_id] = create_client(server_type, base_url, api_key, server_id)
    return _clients[server_id]


def invalidate_client(server_id: str):
    """Remove a cached client (e.g. when server config changes)."""
    _clients.pop(server_id, None)
