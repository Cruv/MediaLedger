import logging
from datetime import datetime
from typing import Optional

from app.media_servers.base import MediaServerClient
from app.media_servers.models import (
    NormalizedLibrary,
    NormalizedLibraryItem,
    NormalizedServerInfo,
    NormalizedSession,
    NormalizedUser,
)

logger = logging.getLogger(__name__)


def _parse_dt(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _extract_provider_id(item: dict, provider: str) -> str | None:
    ids = item.get("ProviderIds") or {}
    return ids.get(provider)


def _extract_int_provider(item: dict, provider: str) -> int | None:
    val = _extract_provider_id(item, provider)
    if val:
        try:
            return int(val)
        except ValueError:
            pass
    return None


class JellyfinClient(MediaServerClient):
    """Jellyfin media server API client."""

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f'MediaBrowser Token="{self.api_key}"',
        }

    async def test_connection(self) -> NormalizedServerInfo:
        data = await self._get("/System/Info")
        return NormalizedServerInfo(
            server_name=data.get("ServerName", "Jellyfin"),
            server_id=data.get("Id", ""),
            version=data.get("Version", ""),
            os=data.get("OperatingSystem"),
        )

    async def get_sessions(self) -> list[NormalizedSession]:
        data = await self._get("/Sessions")
        sessions = []
        for s in data:
            now_playing = s.get("NowPlayingItem")
            if not now_playing:
                continue

            state = "playing"
            play_state = s.get("PlayState", {})
            if play_state.get("IsPaused"):
                state = "paused"

            transcode_info = None
            if now_playing.get("MediaStreams"):
                transcode_info = {
                    "video_codec": None,
                    "audio_codec": None,
                    "container": now_playing.get("Container"),
                }
                for stream in now_playing.get("MediaStreams", []):
                    if stream.get("Type") == "Video":
                        transcode_info["video_codec"] = stream.get("Codec")
                    elif stream.get("Type") == "Audio":
                        transcode_info["audio_codec"] = stream.get("Codec")

            sessions.append(
                NormalizedSession(
                    session_id=s.get("Id", ""),
                    user_id=s.get("UserId", ""),
                    username=s.get("UserName", ""),
                    item_id=now_playing.get("Id"),
                    item_title=now_playing.get("Name"),
                    item_type=now_playing.get("Type"),
                    series_title=now_playing.get("SeriesName"),
                    season_number=now_playing.get("ParentIndexNumber"),
                    episode_number=now_playing.get("IndexNumber"),
                    state=state,
                    position_ticks=play_state.get("PositionTicks", 0),
                    runtime_ticks=now_playing.get("RunTimeTicks"),
                    play_method=play_state.get("PlayMethod"),
                    device_name=s.get("DeviceName"),
                    device_id=s.get("DeviceId"),
                    client_name=s.get("Client"),
                    ip_address=s.get("RemoteEndPoint"),
                    transcode_info=transcode_info,
                    raw_json=s,
                )
            )
        return sessions

    async def get_users(self) -> list[NormalizedUser]:
        data = await self._get("/Users")
        users = []
        for u in data:
            policy = u.get("Policy", {})
            users.append(
                NormalizedUser(
                    user_id=u.get("Id", ""),
                    username=u.get("Name", ""),
                    is_admin=policy.get("IsAdministrator", False),
                    is_disabled=policy.get("IsDisabled", False),
                    last_login_at=_parse_dt(u.get("LastLoginDate")),
                    last_activity_at=_parse_dt(u.get("LastActivityDate")),
                    avatar_url=None,
                    raw_json=u,
                )
            )
        return users

    async def get_libraries(self) -> list[NormalizedLibrary]:
        data = await self._get("/Library/VirtualFolders")
        libraries = []
        for lib in data:
            lib_type = (lib.get("CollectionType") or "unknown").lower()
            type_map = {
                "movies": "movies",
                "tvshows": "tvshows",
                "music": "music",
                "homevideos": "homevideos",
                "books": "books",
                "photos": "photos",
                "mixed": "mixed",
            }
            libraries.append(
                NormalizedLibrary(
                    library_id=lib.get("ItemId", lib.get("Name", "")),
                    name=lib.get("Name", ""),
                    library_type=type_map.get(lib_type, lib_type),
                    item_count=0,
                )
            )
        return libraries

    async def get_library_items(
        self,
        library_id: str,
        item_type: Optional[str] = None,
        start_index: int = 0,
        limit: int = 100,
    ) -> tuple[list[NormalizedLibraryItem], int]:
        params: dict = {
            "ParentId": library_id,
            "Recursive": "true",
            "StartIndex": str(start_index),
            "Limit": str(limit),
            "Fields": "ProviderIds,DateCreated,PremiereDate,Genres,Overview,Path",
            "SortBy": "SortName",
            "SortOrder": "Ascending",
        }
        if item_type:
            params["IncludeItemTypes"] = item_type

        data = await self._get("/Items", params=params)
        total = data.get("TotalRecordCount", 0)
        items = []
        for item in data.get("Items", []):
            items.append(
                NormalizedLibraryItem(
                    item_id=item.get("Id", ""),
                    title=item.get("Name", ""),
                    item_type=item.get("Type", ""),
                    year=item.get("ProductionYear"),
                    parent_id=item.get("ParentId"),
                    grandparent_id=item.get("SeriesId"),
                    season_number=item.get("ParentIndexNumber"),
                    episode_number=item.get("IndexNumber"),
                    runtime_ticks=item.get("RunTimeTicks"),
                    added_at=_parse_dt(item.get("DateCreated")),
                    premiere_date=_parse_dt(item.get("PremiereDate")),
                    genres=item.get("Genres", []),
                    imdb_id=_extract_provider_id(item, "Imdb"),
                    tmdb_id=_extract_int_provider(item, "Tmdb"),
                    tvdb_id=_extract_int_provider(item, "Tvdb"),
                    thumb_url=None,
                    play_count=(item.get("UserData", {}) or {}).get("PlayCount", 0),
                    last_played_at=_parse_dt((item.get("UserData", {}) or {}).get("LastPlayedDate")),
                    raw_json=item,
                )
            )
        return items, total
