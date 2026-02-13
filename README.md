# MediaLedger

A self-hosted monitoring and management dashboard for **Jellyfin** and **Emby** media servers. Track playback sessions, detect account sharing, manage user access, and automate administrative tasks.

## Features

- **Real-time Dashboard** - Active streams, server status, top users, and popular content at a glance
- **Session History** - Full playback history with search, sorting, filtering, and CSV export
- **Library Tracking** - Monitor library contents, watched progress, and recently added items
- **User Management** - Tags, bulk actions, notes, per-user audit logs, device tracking, and sortable user lists
- **Sharing Detection** - IP analysis, concurrent stream detection, cross-server correlation, configurable severity scoring, and sortable/filterable results
- **Cross-Server User Linking** - Auto-detect linked accounts by username across servers with admin confirm/unlink
- **Alert Rules** - Detect concurrent streams, new devices, inactive users, watch thresholds, and sharing score violations
- **Automation Engine** - Auto-respond to user behavior with actions like kill sessions, disable users, tag, or notify
- **Invite System** - Template-based invite codes with auto-provisioning, library restrictions, and expiry
- **Stripe Integration** - Link subscriptions to user access with automatic enable/disable via webhooks
- **GeoIP Mapping** - Visualize session locations on an interactive Leaflet map
- **Content Insights** - Unwatched content, completion rates, popularity rankings, sortable tables, and listening patterns
- **Media Requests** - Track content requests with fulfillment detection, sortable/filterable list with stats
- **Admin Digest** - Weekly HTML email summarizing activity, alerts, and operational health
- **Notification Agents** - Discord, Gotify, ntfy, email (SMTP), and generic webhook support
- **Server Health** - Live transcode load, bandwidth estimates, and system information
- **Stale Session Cleanup** - Background reaper for orphaned sessions with pinger-side hardening

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Query, Zustand |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Scheduling | APScheduler |
| Auth | JWT (python-jose) + bcrypt |
| Deployment | Docker, Docker Compose, GitHub Actions (GHCR) |

## Quick Start

### Docker Compose (recommended)

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```bash
   # Required
   DB_PASSWORD=your_secure_password
   SECRET_KEY=$(openssl rand -hex 32)
   ```

3. Start the stack:
   ```bash
   docker compose up -d
   ```

4. Open `http://localhost:3000` and create your admin account.

5. Add your first server under **Servers** in the sidebar.

### Development

```bash
# Start dev environment with hot reload
docker compose -f docker-compose.dev.yml up -d

# Backend: http://localhost:8000 (API docs at /docs)
# Frontend: http://localhost:5173
```

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | *(required)* | PostgreSQL password |
| `SECRET_KEY` | *(required)* | JWT signing key |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warning, error) |
| `TZ` | `Etc/UTC` | Container timezone |
| `COMPLETION_THRESHOLD_PCT` | `85.0` | % watched to count as completed |
| `GEOIP_DB_PATH` | `/config/data/GeoLite2-City.mmdb` | Path to MaxMind GeoIP database |
| `STRIPE_API_KEY` | *(empty)* | Stripe secret key for subscription management |
| `STRIPE_WEBHOOK_SECRET` | *(empty)* | Stripe webhook signing secret |

### GeoIP Setup

Download the free [GeoLite2 City database](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) from MaxMind and place the `.mmdb` file in your config volume at `data/GeoLite2-City.mmdb`.

### Stripe Webhooks

Point your Stripe webhook to `https://your-domain/api/stripe/webhook` with these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Architecture

```
medialedger/
├── backend/
│   ├── app/
│   │   ├── activity/       # Session polling & processing
│   │   ├── alerts/         # Alert rule evaluation engine
│   │   ├── automation/     # Automation rule engine
│   │   ├── background/     # APScheduler jobs
│   │   ├── media_servers/  # Jellyfin/Emby API clients
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── notifications/  # Multi-agent notification dispatcher
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── schemas/        # Pydantic response/request schemas
│   │   └── sharing_engine/ # Account sharing detection
│   └── alembic/            # Database migrations
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API client functions
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # React Query hooks
│   │   ├── pages/          # Route page components
│   │   ├── stores/         # Zustand state stores
│   │   └── types/          # TypeScript interfaces
│   └── public/             # Static assets
├── docker-compose.yml      # Production deployment
├── docker-compose.dev.yml  # Development environment
└── .github/workflows/      # CI/CD pipeline
```

### Background Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| Poll servers | 5s | Fetch active sessions from all servers |
| Sync users | 30min | Sync user lists from media servers |
| Sync libraries | 1hr | Sync library metadata and items |
| Evaluate alerts | 5min | Check alert rules against current state |
| Run automation | 5min | Evaluate and execute automation rules |
| Sharing analysis | 6hr | Run full sharing detection analysis |
| User expiry | 1hr | Disable expired users, send reminders |
| Weekly digest | Mon 8AM UTC | Compile and send admin digest email |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search input on current page |
| `Esc` | Close sidebar (mobile) or blur active input |

## License

Private project. All rights reserved.
