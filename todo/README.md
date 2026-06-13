# TaskFlow

A nested todo app with gamification, AI coaching, custom themes, and an admin console. Built with React 19, TypeScript, Vite, and Tailwind CSS 4.

---

## Features

### Core

- Nested tasks with drag-and-drop reordering (board + list views)
- **Today's Focus** — priority-sorted dashboard of active tasks
- Per-task priority (none → low → medium → high → urgent)
- Search, progress tracking, and collapsible sidebar
- JWT auth with optional MFA (TOTP)

### Fun Stack

Toggle features from the sparkle icon in the header (Fun Settings):

| Feature | Description |
| --- | --- |
| **Boss Battle** | Parent tasks become bosses; HP drops as subtasks complete |
| **Focus Roulette** | Weighted random task picker |
| **Completion Burst** | Particle effects when subtasks are checked off |
| **Smart Split** | Paste a bullet list to create a parent + subtasks (regex or AI) |

### AI Stack

Requires a running AI backend (FastAPI in hybrid mode, or Fastify AI proxy):

| Feature | Description |
| --- | --- |
| **AI Focus Coach** | Recommends the next task with a reason and step-by-step plan |
| **Daily Briefing** | Morning summary with top priorities |
| **Boss Lore** | AI-generated taunts and defeat messages |
| **Smart Split (AI)** | LLM-powered task breakdown |
| **Natural Language Add** | Type a sentence in the create input to preview parsed tasks |

### Theme Studio

- Light / dark / system toggle
- Custom presets: neon gradients, glass blur, mesh, starfield, noise
- Theme applies across the main app **and** the Admin Console (`/admin`)

### Admin Console

Available to users with `role: ADMIN`:

- **Users** — create, edit, delete, assign groups, view any user's tasks
- **Groups** — organize users with color-coded groups
- **All Tasks** — filter tasks by user or group

---

## Quick Start

### 1. Install & configure

```bash
cd todo
npm install
cp .env.example .env   # or create .env manually — see below
npm run dev
```

App runs at **http://localhost:5173**

### 2. Start backends

**Recommended — hybrid mode** (todos/auth on Fastify, AI on FastAPI):

```bash
# Terminal 1 — Fastify (port 8080)
cd todoBackend
npm install
npx prisma generate
npm run dev

# Terminal 2 — FastAPI (port 8000)
cd todo-fast-api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set in `todo/.env`:

```env
VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=http://localhost:8080
VITE_API_URL_PYTHON=http://localhost:8000
```

### 3. Create an admin user (Fastify)

```bash
cd todoBackend
npm run create-admin
# Default: admin@test.com / admin123
```

Restart the Fastify server after first setup so admin schema migrations apply. Look for `✅ Admin schema verified` in the startup logs.

---

## Backend Modes

Configured via `VITE_BACKEND_MODE` in `.env`:

| Mode | Todos & Auth | AI Routes |
| --- | --- | --- |
| `fastify` | Fastify `:8080` | Fastify `:8080` |
| `fastapi` | FastAPI `:8000` | FastAPI `:8000` |
| `hybrid` | Fastify `:8080` | FastAPI `:8000` (falls back to Fastify if unreachable) |

See `src/config/api.config.ts` for URL resolution and `src/lib/axios.ts` for `apiClient` / `aiClient`.

---

## Keyboard Shortcuts

Press `?` in the app for the full list.

| Keys | Action |
| --- | --- |
| `N` | Focus create-task input |
| `/` | Focus search |
| `G` → `F` | Today's Focus view |
| `G` → `B` | Board view |
| `G` → `L` | List view |
| `G` → `R` | Focus Roulette |
| `Ctrl+Shift+V` | Smart Split (while in create input) |
| `Esc` | Close modals / cancel edit |

---

## Scripts

```bash
npm run dev       # Dev server (http://localhost:5173)
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
npx tsc --noEmit  # Type-check only
```

---

## Project Structure

```
todo/src/
├── components/
│   ├── admin/          # Admin Console tabs (users, groups, tasks)
│   ├── ai/             # Briefing, coach, NL preview
│   ├── fun/            # Roulette, boss HP, bursts, settings
│   └── ui/             # shadcn/ui primitives
├── context/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/              # Priority, shortcuts, fun/AI hooks
├── lib/                # axios, aiUtils, funUtils, themePresets
├── page/
│   ├── NestedTodo.tsx  # Main app
│   ├── AdminUsers.tsx  # Admin Console
│   ├── LogIn.tsx
│   └── Register.tsx
├── services/           # todoService, adminService, aiService
└── config/api.config.ts
```

---

## Routes

| Path | Access | Description |
| --- | --- | --- |
| `/` | Authenticated | Main task board |
| `/admin` | Admin role | Admin Console |
| `/login` | Public | Sign in |
| `/register` | Public | Create account |

---

## Environment Variables

```env
# Backend mode: fastify | fastapi | hybrid
VITE_BACKEND_MODE=hybrid

VITE_API_URL_NODE=http://localhost:8080
VITE_API_URL_PYTHON=http://localhost:8000
```

Legacy flags (`VITE_USE_FASTAPI`, `VITE_AI_USE_FASTAPI`) still work but `VITE_BACKEND_MODE` takes priority.

---

## Troubleshooting

**Admin Console shows "Could not load users"**

Restart Fastify after running `npx prisma generate`. The server auto-applies admin schema on startup.

**AI Coach says "Coach unavailable"**

Ensure FastAPI is running on port 8000 (hybrid mode) and `OPENAI_API_KEY` is set in `todo-fast-api/.env`.

**CORS errors**

Both backends allow `localhost:5173` in development. Confirm the correct ports are running.

---

## Related Docs

- [Root README](../README.md) — full monorepo overview
- [FUN_STACK_PLAN.md](./FUN_STACK_PLAN.md) — fun + AI feature spec
- [CLAUDE.md](./CLAUDE.md) — architecture notes for AI assistants
