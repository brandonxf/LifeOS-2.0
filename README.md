# 🌌 Life OS

A full-stack, multi-tenant **Personal Life Operating System** — one private dashboard to manage your finances, tasks, habits, goals, calendar, diary, notes, and health, with an **AI assistant** grounded in your own data. Add friends to share habits, team up on tasks, and see each other's progress in an activity feed.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Node-Express-3c873a) ![stack](https://img.shields.io/badge/Neon-Postgres-00e599) ![stack](https://img.shields.io/badge/Drizzle-ORM-c5f74f) ![stack](https://img.shields.io/badge/AI-NVIDIA%20%2F%20Claude-76b900)

---

## ✨ Features

| Module | Highlights |
|--------|-----------|
| **Dashboard** | Widget grid: balance, tasks, habit ring, goals, upcoming events, 7-day health, quick-AI bar |
| **Finance** | Income/expense tracking, category pie + monthly bar charts, budgets with progress |
| **Tasks** | Kanban board with drag-and-drop, list view, priority/tag filters, optimistic updates |
| **Habits & Goals** | GitHub-style contribution heatmaps, one-click completion, streaks, goal progress + countdowns |
| **Calendar** | Custom month/week views, click-to-add, color-coded events, today highlighted |
| **Diary** | TipTap rich-text editor, 1–5 mood selector, tags, monthly mood chart |
| **Notes** | Masonry grid, pinning, markdown, client-side **and** semantic (pgvector) search |
| **Health** | Log workouts / water / sleep / weight, 7-day summary cards + per-metric line charts |
| **Friends & Social** | Add friends with a short invite code (no public directory/search); invite friends to a habit or task — each accepts before it shows up on their side |
| **Shared Habits** | Habit heatmap fills per-day by *fraction of the team* that completed it, not all-or-nothing; each member's current streak shown next to their avatar |
| **Team Tasks** | Assign a task to one or more friends; any active assignee can move it through the board, only the owner edits/deletes it |
| **Activity Feed** | See friends complete a shared habit/task, or a private habit they've opted to broadcast via "Share my progress with friends" — react with a 👏 |
| **AI Assistant** | Streaming (SSE) chat, context badge showing exactly what data was injected — runs on NVIDIA NIM (free) by default, falls back to Anthropic Claude, then an offline demo mode with neither key set |

Plus: JWT auth with **refresh-token rotation**, soft deletes, rate limiting, dark mode, PWA, skeleton loaders, toasts, near-real-time polling refresh on every friends/habits/tasks/feed screen, and full TypeScript typing everywhere.

---

## 🧱 Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, React Router v6, TanStack Query, Zustand, Recharts, TipTap, @hello-pangea/dnd, React Hook Form + Zod (PWA-ready)
- **Backend:** Node.js + Express (REST API, SSE streaming)
- **Database:** [Neon](https://neon.tech) serverless PostgreSQL + Drizzle ORM + Drizzle Kit, with **pgvector** for semantic note search
- **Cache/Sessions:** Redis ([Upstash](https://upstash.com) recommended) — with an automatic in-memory fallback for local dev
- **AI:** [NVIDIA NIM](https://build.nvidia.com) (free, OpenAI-compatible) by default, falls back to Anthropic Claude if only that key is set
- **Auth:** JWT access tokens + bcrypt + rotating refresh tokens

---

## 📁 Structure

```
life-os/
├─ api/
│  └─ index.ts             # Vercel Serverless Function entry — imports server/src/app.ts
├─ client/                 # React + Vite frontend
│  └─ src/
│     ├─ components/        # Layout, UI primitives, theme toggle
│     ├─ pages/            # One file per module + auth + settings
│     ├─ lib/              # api client, types, utils, query client
│     └─ store/            # Zustand (auth, ui)
├─ server/                 # Express backend
│  ├─ src/
│  │  ├─ db/
│  │  │  ├─ schema/        # Drizzle tables — one file per module
│  │  │  ├─ index.ts       # Neon + Drizzle client
│  │  │  ├─ migrate.ts     # pgvector bootstrap
│  │  │  └─ seed.ts        # Demo user + realistic data
│  │  ├─ routes/           # Express route handlers
│  │  ├─ middleware/       # auth, rateLimit, errorHandler
│  │  ├─ services/         # ai, notification, embedding
│  │  ├─ app.ts            # Builds the Express app (no .listen) — used by api/index.ts
│  │  └─ index.ts          # Local dev entry point (calls app.listen)
│  ├─ drizzle.config.ts
│  └─ Dockerfile           # Optional: self-host the API outside Vercel
├─ vercel.json              # Single deploy: static client + /api/* serverless function
├─ .env.example
└─ README.md
```

---

## 🚀 Setup

### 1. Prerequisites
- Node.js 20+
- A **Neon** project (free tier is fine) → grab the pooled connection string
- *(Optional)* An **Upstash Redis** database → `rediss://…` URL
- *(Optional)* An **NVIDIA API key** (free, [build.nvidia.com](https://build.nvidia.com)) or an **Anthropic API key** → the AI chat runs in an offline demo mode with neither one set

### 2. Clone & install
```bash
git clone <your-repo-url> life-os
cd life-os
npm install          # installs both workspaces (client + server)
```

### 3. Configure environment
```bash
cp .env.example server/.env
cp .env.example client/.env     # client only needs VITE_API_URL
```
Edit `server/.env` and set at least `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
(and `NVIDIA_API_KEY` or `ANTHROPIC_API_KEY` for real AI answers instead of the demo mock).

Generate strong secrets:
```bash
openssl rand -base64 48
```

### 4. Initialize the database
```bash
cd server
npx tsx src/db/migrate.ts     # enables the pgvector extension on Neon
npm run db:push               # pushes the Drizzle schema (drizzle-kit push)
npm run db:seed               # seeds the demo user + realistic data
```
> `db:push` asks for a y/n confirmation whenever a statement could be destructive,
> which fails outright in a non-interactive shell/CI ("Interactive prompts require
> a TTY"). Run it from a real terminal the first time, or apply the schema change
> as plain SQL yourself if you hit that — see the commits from the friends/social
> feature work for examples of the latter.

### 5. Run in dev
From the repo root:
```bash
npm run dev                   # starts server (:4000) and client (:5173) together
```
Open **http://localhost:5173** and log in with the demo account:

> **demo@lifeos.app** / **demo1234**

---

## 🔑 Environment Variables

| Var | Where | Description |
|-----|-------|-------------|
| `DATABASE_URL` | server | Neon pooled Postgres connection string |
| `REDIS_URL` | server | Upstash Redis URL (optional — falls back to memory) |
| `JWT_SECRET` | server | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | server | Secret reserved for refresh flows |
| `NVIDIA_API_KEY` | server | NVIDIA NIM key — primary AI provider (free models) |
| `NVIDIA_BASE_URL` | server | Defaults to `https://integrate.api.nvidia.com/v1` |
| `AI_MODEL` | server | NVIDIA model id (see `.env.example`) |
| `ANTHROPIC_API_KEY` | server | Claude API key — used only if `NVIDIA_API_KEY` is empty |
| `CLIENT_URL` | server | CORS allow-list, comma-separated (defense in depth — see below) |
| `PORT` | server | API port for local dev only (default `4000`) |
| `VITE_API_URL` | client | Only needed for the Android build (`.env.android`) — the web build uses relative `/api` |

---

## ▲ Deploy (Vercel — one project, client + API)

The whole app deploys as a **single Vercel project**: the client is built to static
assets and `/api/*` is served by one Serverless Function (`api/index.ts`, which
wraps the Express app in `server/src/app.ts`). Same domain for both, so the
browser never does a cross-origin request — no CORS, no cold-starting a
separate always-on server like Render.

1. In the Vercel dashboard, **New Project** → import this repo → set **Root
   Directory to the repo root** (not `client/`). `vercel.json` at the root
   already defines the install/build commands, output directory, the
   `/api/*` rewrite, and the function's `maxDuration`.
2. Add the server env vars above as **Environment Variables** on the project
   (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NVIDIA_API_KEY` at
   minimum). Do **not** set `VITE_API_URL` for this project — leaving it
   unset is what makes the client call same-origin `/api`.
3. Deploy. `/health` and `/api/*` are handled by the function; every other
   path falls back to `index.html` (client-side routing).
4. `CLIENT_URL` is mostly defense-in-depth now (same-origin requests skip
   CORS entirely), but set it to the project's `https://*.vercel.app` domain
   anyway in case something calls the API cross-origin later.
5. Once live, update `VITE_API_URL` in `client/.env.android` to that same
   domain and run `npm run build:android` before regenerating the APK — the
   native app isn't served from any origin, so it still needs an absolute URL.

**Alternative: self-host the API (Docker)** — only if you deploy the backend
somewhere other than Vercel:
```bash
cd server
docker build -t life-os-server .
docker run -p 4000:4000 --env-file .env life-os-server
```

---

## 🧠 How the AI context works

On every `POST /api/ai/chat`, the server runs Drizzle queries to gather a live snapshot —
last 10 tasks, today's habit completion, this month's finance summary, last 5 diary moods,
and recent health logs — builds a grounded system prompt, and streams the reply back over
**Server-Sent Events**. The UI shows a **context badge** listing exactly what was sent.
Provider is picked at request time (`server/src/services/ai.service.ts`): NVIDIA NIM if
`NVIDIA_API_KEY` is set, otherwise Anthropic Claude if `ANTHROPIC_API_KEY` is set, otherwise
a canned offline demo reply so the feature still works with zero keys configured.

> Semantic note search uses a local, dependency-free 1536-dim embedding stored in a pgvector
> column (HNSW / cosine). Swap `server/src/services/embedding.service.ts` for a hosted
> embeddings API for higher-quality results — the schema is unchanged.

---

## 🧑‍🤝‍🧑 Friends & Social

Friends are added by a short invite code (`friend_code` on `users`), not a public
search/directory — avoids exposing emails or a browsable list of accounts. Adding a
friend, joining a shared habit, and getting assigned to a task are all
**request → accept/decline**, never automatic, so nothing shows up on someone's
screen without their say-so. Schema: `friendships`, `habit_members`,
`task_assignees`, `activity_events` + `activity_reactions` (see
`server/src/db/schema/`).

The API deploys as a single Vercel Serverless Function, which doesn't hold
persistent connections — so instead of WebSockets, the Friends/Habits/Tasks/Activity
screens **poll**: main lists refetch every 5s and secondary lists (requests/invites)
every 10s while the screen is open and focused, plus an immediate refetch on window
focus (`client/src/lib/live.ts`). The shared rate limit was raised accordingly
(`server/src/middleware/rateLimit.ts`, 300 req / 5 min per user).

---

## 📜 Scripts

| Command | Location | Does |
|---------|----------|------|
| `npm run dev` | root | Run client + server together |
| `npm run db:push` | root/server | Push schema to Neon |
| `npm run db:seed` | root/server | Seed demo data |
| `npm run build` | root | Build both apps |

---

Made with 💜 — your life, organized.
