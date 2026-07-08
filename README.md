# 🌌 Life OS

A full-stack, multi-tenant **Personal Life Operating System** — one private dashboard to manage your finances, tasks, habits, goals, calendar, diary, notes, and health, with an **AI assistant** grounded in your own data.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Node-Express-3c873a) ![stack](https://img.shields.io/badge/Neon-Postgres-00e599) ![stack](https://img.shields.io/badge/Drizzle-ORM-c5f74f) ![stack](https://img.shields.io/badge/Claude-sonnet--4--6-7C3AED)

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
| **AI Assistant** | Streaming (SSE) chat with Claude, context badge showing exactly what data was injected |

Plus: JWT auth with **refresh-token rotation**, soft deletes, rate limiting, dark mode, PWA, skeleton loaders, toasts, and full TypeScript typing everywhere.

---

## 🧱 Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, React Router v6, TanStack Query, Zustand, Recharts, TipTap, @hello-pangea/dnd, React Hook Form + Zod (PWA-ready)
- **Backend:** Node.js + Express (REST API, SSE streaming)
- **Database:** [Neon](https://neon.tech) serverless PostgreSQL + Drizzle ORM + Drizzle Kit, with **pgvector** for semantic note search
- **Cache/Sessions:** Redis ([Upstash](https://upstash.com) recommended) — with an automatic in-memory fallback for local dev
- **AI:** Anthropic Claude (`claude-sonnet-4-6`)
- **Auth:** JWT access tokens + bcrypt + rotating refresh tokens

---

## 📁 Structure

```
life-os/
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
│  │  └─ index.ts          # App entry point
│  ├─ drizzle.config.ts
│  └─ Dockerfile
├─ .env.example
└─ README.md
```

---

## 🚀 Setup

### 1. Prerequisites
- Node.js 20+
- A **Neon** project (free tier is fine) → grab the pooled connection string
- *(Optional)* An **Upstash Redis** database → `rediss://…` URL
- *(Optional)* An **Anthropic API key** → the AI chat runs in an offline demo mode without one

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
(and `ANTHROPIC_API_KEY` for real AI answers).

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
| `ANTHROPIC_API_KEY` | server | Claude API key (optional — enables real AI) |
| `PORT` | server | API port (default `4000`) |
| `CLIENT_URL` | server | Allowed CORS origin (default `http://localhost:5173`) |
| `VITE_API_URL` | client | API base URL (default proxies `/api` to `:4000`) |

---

## 🐳 Deploy

**Server (Docker):**
```bash
cd server
docker build -t life-os-server .
docker run -p 4000:4000 --env-file .env life-os-server
```

**Client:** build static assets and host anywhere (Vercel, Netlify, Cloudflare Pages):
```bash
cd client
npm run build      # outputs client/dist
```
Set `VITE_API_URL` to your deployed API origin before building.

---

## 🧠 How the AI context works

On every `POST /api/ai/chat`, the server runs Drizzle queries to gather a live snapshot —
last 10 tasks, today's habit completion, this month's finance summary, last 5 diary moods,
and recent health logs — builds a grounded system prompt, and streams Claude's reply back
over **Server-Sent Events**. The UI shows a **context badge** listing exactly what was sent.

> Semantic note search uses a local, dependency-free 1536-dim embedding stored in a pgvector
> column (HNSW / cosine). Swap `server/src/services/embedding.service.ts` for a hosted
> embeddings API for higher-quality results — the schema is unchanged.

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
