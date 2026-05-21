# HackJudge

A production-ready hackathon judging platform built as a Turborepo monorepo. Organizers set up events through a guided form wizard — no YAML, no code required. Judges score teams from their phones via magic-link authentication.

---

## Features

### For Organizers
- **7-step form wizard** — create a fully configured event without touching any config files
- **Criteria presets** — one-click rubrics for Standard Hackathon, Design-focused, or Business/Impact events
- **Bulk import** — paste a CSV to add all teams and judges at once
- **Live dashboard** — real-time heatmap of judging progress, per-judge stats, completion %
- **Judge access panel** — QR codes and magic links for every judge, send with one click
- **Tie handling** — automatic (higher average) or allow judges to re-score on tie

### For Judges
- **Mobile-first portal** — works on any phone, no app install needed
- **Magic link auth** — scan QR or open link, enter token, start judging
- **Numeric & rubric scoring** — supports both free-form scores and structured rubrics
- **Progress tracking** — see how many teams are left, which are done

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Framework | Next.js 14 (App Router) |
| API | Next.js API Routes |
| Database | MongoDB Atlas via Prisma |
| Styling | Tailwind CSS + Framer Motion |
| Auth | JWT (organizers) + Magic Links (judges) |
| Config validation | Zod schema (`packages/config-engine`) |

---

## Monorepo Structure

```
apps/
  web/        Next.js app — organizer dashboard, judge portal, and API routes
packages/
  db/         Prisma client + schema
  shared/     Shared UI components + utilities
  config-engine/  Zod-based event config validator
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm 9.x
- MongoDB Atlas account (free tier works)

### Setup

```bash
git clone https://github.com/radheshpai87/HackJudge.git
cd HackJudge
pnpm install
```

Create a `.env` file in the project root:

```
DATABASE_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hackjudge
JWT_SECRET=your-secret-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

Generate the Prisma client:

```bash
cd packages/db && pnpm prisma generate && cd ../..
```

### Run

```bash
./start.sh
```

- **Web dashboard:** http://localhost:3000
- **Judge portal:** http://localhost:3000/events/{slug}/judge
- **LAN access (for judges on phones):** http://<your-ip>:3000/events/{slug}/judge

Default organizer login: `organizer@hackjudge.dev` / `hackjudge-demo`

---

## Creating an Event

1. Log in at `/login`
2. Go to **New Event** and fill in the 7-step wizard:
   - Event name & description
   - Tracks (categories)
   - Scoring criteria (or pick a preset)
   - Teams (manual or CSV paste)
   - Judges (manual or CSV paste)
   - Settings (assignment mode, tie handling)
   - Review & create
3. After creation, share QR codes or magic links with judges

### CSV Bulk Import Format

**Teams:**
```
Team Name, Leader Name, Table#, Track Name
Team Alpha, Alice, 12, AI Track
Team Beta, Bob, 5, Web Track
```

**Judges:**
```
Name, Email, Track Name (optional)
Alice Judge, alice@example.com, AI Track
Bob Judge, bob@example.com
```

---

## Judge Flow

1. Organizer shares magic link or QR code
2. Judge opens `/events/{slug}/judge?email=...` on phone
3. Requests magic link — token is logged to the server console in dev mode
4. Enters token and is authenticated
5. Scores each assigned team
6. Portal shows real-time progress

---

## API Endpoints

All API routes are served by the Next.js App Router under `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Organizer login |
| POST | `/api/auth/magic-link` | Request judge magic link |
| GET | `/api/auth/verify` | Verify magic link |
| POST | `/api/events` | Create event from YAML config |
| GET | `/api/events/:slug` | Get event config + status |
| GET | `/api/events/:slug/judges` | List judges |
| GET | `/api/events/:slug/judges/me` | Judge profile + assignments |
| POST | `/api/events/:slug/scores/submit` | Submit a score |
| GET | `/api/events/:slug/results` | Get results + leaderboard |
| GET | `/api/events/:slug/results/export/xlsx` | Export results as Excel |
| GET | `/api/events/:slug/results/export/pdf` | Export results as PDF |
| GET | `/api/events/:slug/results/export/csv` | Export results as CSV |

---

## Deployment

### Vercel (Recommended)

A `vercel.json` is included with the build configuration. Deploy with:

```bash
vercel
```

Make sure to add `DATABASE_URL` and `JWT_SECRET` in your Vercel project environment variables.

### Railway / Render / Fly.io

For platforms that run a persistent container, update `railway.toml` (or equivalent) to build and start the Next.js app:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install --frozen-lockfile && pnpm --filter @hackjudge/db prisma generate && pnpm turbo build --filter=@hackjudge/web"

[deploy]
startCommand = "pnpm --filter @hackjudge/web start"
```

### VPS / Self-Hosted

Build and run directly on any Linux server:

```bash
pnpm install
pnpm --filter @hackjudge/db prisma generate
pnpm turbo build --filter=@hackjudge/web
pnpm --filter @hackjudge/web start
```

---

## Excel Export

Results export includes:
- **Overall** sheet — ranked leaderboard across all tracks
- **Per-track** sheets — track-specific rankings
- **Detailed** sheet — criteria score breakdown per team

---

## License

MIT
