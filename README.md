# HackJudge

A production-ready, config-driven hackathon judging platform built as a Turborepo monorepo.

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Mobile    │◄────►│    API      │◄────►│  Web (Next) │
│ (Expo/RN)   │      │  (Express)  │      │  (Dashboard)│
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
                    ┌───────┴───────┐
                    │  PostgreSQL   │
                    │   (Prisma)    │
                    └───────────────┘
```

## Prerequisites

- Node.js >= 20
- pnpm 9.x
- Docker & docker-compose

## Quick Start

```bash
git clone <repo>
cd hackjudge
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- API: http://localhost:3001
- Dashboard: http://localhost:3000

## CLI

```bash
npx hackjudge init [event-name]
npx hackjudge validate [path]
npx hackjudge deploy [path] --env <saas|self>
npx hackjudge results <slug>
npx hackjudge export <slug> --format <pdf|csv|xlsx>
```

## event.yaml Example

See `packages/cli/templates/event.yaml` after running `hackjudge init`.

## Self-Hosting

1. Set all env vars from `apps/api/.env.example`
2. Build: `docker compose up --build`
3. Reverse proxy with nginx to ports 3000 (web) and 3001 (api)

## Webhook Verification

```javascript
const crypto = require("crypto");
const signature = req.headers["x-hackjudge-signature"];
const hash = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
if (signature !== `sha256=${hash}`) throw new Error("Invalid signature");
```

## Excel Export

Results can be exported as `.xlsx` via:
- API: `GET /api/v1/events/{slug}/results/export/xlsx`
- CLI: `hackjudge export <slug> --format xlsx`

The Excel file contains:
- **Overall** sheet: ranked leaderboard
- **Per-track** sheets: track-specific rankings
- **Detailed** sheet: criteria breakdown per team
