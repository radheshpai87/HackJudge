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
- **Magic link auth** — scan QR or open link → enter token → start judging
- **Numeric & rubric scoring** — supports both free-form scores and structured rubrics
- **Progress tracking** — see how many teams are left, which are done

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API | Express + TypeScript |
| Database | MongoDB Atlas via Prisma |
| Web | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Auth | JWT (organizers) + Magic Links (judges) |
| Config validation | Zod schema (`packages/config-engine`) |

---

## Monorepo Structure

```
apps/
  api/        Express REST API
  web/        Next.js organizer dashboard + judge portal
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
cp apps/api/.env.example apps/api/.env
# Add your MongoDB connection string to apps/api/.env
```

Edit `apps/api/.env`:
```
DATABASE_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hackjudge
JWT_SECRET=your-secret-here
```

### Run

```bash
./start.sh
```

- **Web dashboard:** http://localhost:3000
- **API:** http://localhost:3001
- **Judge portal:** http://localhost:3000/events/{slug}/judge
- **LAN access (for judges on phones):** http://\<your-ip\>:3000/events/{slug}/judge

Default organizer login: `organizer@hackjudge.dev` / `hackjudge-demo`

---

## Creating an Event

1. Log in at `/login`
2. Go to **New Event** → fill in the 7-step wizard:
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
3. Requests magic link → token logged to API console (dev mode)
4. Enters token → authenticated
5. Scores each assigned team
6. Portal shows real-time progress

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Organizer login |
| POST | `/api/v1/auth/magic-link` | Request judge magic link |
| GET | `/api/v1/auth/verify/:token` | Verify magic link |
| POST | `/api/v1/events` | Create event from config |
| GET | `/api/v1/events/:slug` | Get event config + status |
| GET | `/api/v1/judges/me` | Judge profile + assignments |
| POST | `/api/v1/scores` | Submit a score |
| GET | `/api/v1/events/:slug/results` | Get results + leaderboard |
| GET | `/api/v1/events/:slug/results/export/xlsx` | Export results as Excel |

---

## Excel Export

Results export includes:
- **Overall** sheet — ranked leaderboard across all tracks
- **Per-track** sheets — track-specific rankings
- **Detailed** sheet — criteria score breakdown per team
