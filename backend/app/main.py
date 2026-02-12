from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.engine import init_db, dispose_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Scheduler import deferred to avoid circular imports
    from app.background.scheduler import start_scheduler, shutdown_scheduler

    await start_scheduler()
    yield
    await shutdown_scheduler()
    await dispose_db()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routers import (
        alerts, audit, auth, automation, dashboard, digest, geoip, graphs,
        insights, invites, libraries, notifications, recently_added, requests,
        server_health, servers, sessions, sharing, stripe_billing, tags,
        users, webhooks,
    )

    # Public routes (no auth required)
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])

    # Protected routes (auth enforced via get_current_user dependency if password is set)
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(servers.router, prefix="/api/servers", tags=["servers"])
    app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
    app.include_router(libraries.router, prefix="/api/libraries", tags=["libraries"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
    app.include_router(sharing.router, prefix="/api/sharing", tags=["sharing"])
    app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(graphs.router, prefix="/api/graphs", tags=["graphs"])
    app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
    app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
    app.include_router(recently_added.router, prefix="/api/recently-added", tags=["recently-added"])
    app.include_router(audit.router, prefix="/api", tags=["audit"])
    app.include_router(automation.router, prefix="/api/automation", tags=["automation"])
    app.include_router(geoip.router, prefix="/api/geoip", tags=["geoip"])
    app.include_router(digest.router, prefix="/api/digest", tags=["digest"])
    app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
    app.include_router(invites.router, prefix="/api/invites", tags=["invites"])
    app.include_router(server_health.router, prefix="/api/server-health", tags=["server-health"])
    app.include_router(stripe_billing.router, prefix="/api/stripe", tags=["stripe"])

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
