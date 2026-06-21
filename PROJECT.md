# TaskFlow — Complete Project Documentation

> A hybrid full-stack todo & task management app with AI features, admin console, MFA authentication, gamification, and a custom theme system.

---

## Table of Contents

- [What Is TaskFlow?](#what-is-taskflow)
- [Live URLs](#live-urls)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Frontend Features](#frontend-features)
- [Backend Features](#backend-features)
- [AI Features](#ai-features)
- [Admin Console](#admin-console)
- [Authentication & Security](#authentication--security)
- [Theme System](#theme-system)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Folder Structure](#folder-structure)

---

## What Is TaskFlow?

TaskFlow is a full-stack task management application that goes beyond a simple todo list. It features:

- **Nested todos** — tasks within tasks, unlimited depth
- **Dual backend** — Node.js (Fastify) handles todos/auth/admin, Python (FastAPI) handles AI
- **AI assistant** — task splitting, daily briefing, focus coach, boss battle mode
- **Admin console** — manage users, groups, and all tasks across the platform
- **MFA authentication** — TOTP-based two-factor login with QR code
- **Theme studio** — customize colors, effects, fonts, and layout
- **Gamification** — boss battles, HP bars, particle effects, focus roulette

---

## Live URLs

| Service | URL |
|---|---|
| App | http://15.207.62.83 |
| Fastify API | http://15.207.62.83:8080/ping |
| FastAPI | http://15.207.62.83:8000/health |

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│                  Browser                     │
│           React 19 + TypeScript              │
│         Vite · Tailwind · shadcn/ui          │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐  ┌───────────────┐
│    Fastify    │  │    FastAPI    │
│  Node.js :8080│  │  Python :8000 │
│               │  │               │
│ • Auth        │  │ • Auth + MFA  │
│ • Todos       │  │ • Todos       │
│ • Admin       │  │ • Admin       │
│ • AI fallback │  │ • AI (primary)│
└───────┬───────┘  └───────┬───────┘
        │                  │
        └──────┬───────────┘
               ▼
      ┌─────────────────┐
      │   PostgreSQL     │
      │  (shared DB)     │
      └─────────────────┘
```

### Backend Mode

The frontend supports 3 backend modes set via `VITE_BACKEND_MODE`:

| Mode | Todos/Auth | AI Routes | Use When |
|---|---|---|---|
| `fastify` | Fastify :8080 | Fastify :8080 | Running Node only |
| `fastapi` | FastAPI :8000 | FastAPI :8000 | Running Python only |
| `hybrid` | Fastify :8080 | FastAPI :8000 | **Production (recommended)** |

In hybrid mode, if FastAPI AI is down, it automatically falls back to Fastify AI endpoints.

---

## Tech Stack

### Frontend (`todo/`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.2.4 | Build tool |
| Tailwind CSS | 4.1.17 | Utility-first styling |
| React Router | 7.10.1 | Client-side routing |
| Axios | 1.13.2 | HTTP client |
| Radix UI | 1.x | Accessible component primitives |
| shadcn/ui | — | Pre-built UI components |
| @dnd-kit | 6.3.1+ | Drag-and-drop |
| Lucide React | 0.556.0 | Icons |

### Fastify Backend (`todoBackend/`)

| Technology | Version | Purpose |
|---|---|---|
| Fastify | 5.6.2 | Web framework |
| TypeScript | 5.9.3 | Type safety |
| Prisma | 6.0.0 | PostgreSQL ORM |
| fastify-jwt | 4.1.3 | JWT authentication |
| bcryptjs | 3.0.3 | Password hashing |
| @fastify/cors | 11.2.0 | CORS middleware |

### FastAPI Backend (`todo-fast-api/`)

| Technology | Purpose |
|---|---|
| FastAPI | Web framework |
| Uvicorn | ASGI server |
| SQLAlchemy | PostgreSQL ORM |
| Pydantic | Schema validation |
| python-jose | JWT handling |
| passlib[bcrypt] | Password hashing |
| PyOTP | TOTP/MFA generation |
| qrcode | QR code for MFA setup |
| openai / google-generativeai | AI providers |
| fastapi-mail | Email service |

### Infrastructure

| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Shared database |
| Docker + Docker Compose | Container orchestration |
| nginx | Serve React SPA (port 80) |
| AWS EC2 t3.small | Hosting |
| GitHub Actions | CI/CD auto-deploy |

---

## Database Schema

```
┌─────────────────────────────────┐
│             User                │
├─────────────────────────────────┤
│ id          INT (PK)            │
│ email       TEXT (unique)       │
│ password    TEXT (bcrypt hash)  │
│ name        TEXT (optional)     │
│ role        TEXT (USER/ADMIN)   │
│ mfa_enabled BOOL (default false)│
│ mfa_secret  TEXT (optional)     │
└───────┬─────────────────┬───────┘
        │                 │
        │ 1:many          │ many:many
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│     Todo      │  │   UserGroup      │
├───────────────┤  ├──────────────────┤
│ id       INT  │  │ id          INT  │
│ text     TEXT │  │ name        TEXT │
│ done     BOOL │  │ description TEXT │
│ userId   INT  │  │ color       TEXT │
│ parentId INT  │  │ createdAt   TS   │
│ version  INT  │  └──────────────────┘
│ createdAt TS  │
│ updatedAt TS  │
└───────────────┘
  (self-referential
   for nested todos)
```

### Key Design Decisions

- **Todo.parentId** is self-referential — a todo can have a parent todo, enabling unlimited nesting depth
- **Todo.version** is used by FastAPI for ETag-based optimistic concurrency control
- **UserGroupMember** is a join table for the many-to-many User ↔ UserGroup relationship
- **JWT_SECRET must be identical** on both Fastify and FastAPI — they share the same auth tokens

---

## Frontend Features

### Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login (with MFA support) | Public |
| `/register` | Register new account | Public |
| `/` | Main task board (NestedTodo) | Auth required |
| `/admin` | Admin console | Admin role only |

### Task Board Views

The main page (`/`) has 3 views toggled via the sidebar:

**Board View (Grid)**
- Tasks displayed as cards in a responsive grid
- Each card shows task text, completion status, subtask count, progress bar
- Subtasks expand inside the card

**List View**
- Recursive list renderer
- Indent levels show nesting depth
- Inline checkbox + edit + delete

**Today's Focus View**
- Priority-sorted dashboard
- Shows only uncompleted tasks
- AI integration buttons visible here

### Nested Todos

- Create a subtask inside any task
- Subtasks can have their own subtasks — unlimited depth
- Progress bar on parent shows % of subtasks completed
- Deleting a parent deletes all its children (cascade)

### Drag-and-Drop

- Reorder tasks within the same level using `@dnd-kit`
- Drag handle visible on hover

### Priority System

- Each task has a priority: `none → low → medium → high`
- Cycle priority by clicking the priority badge
- Stored in `localStorage` (not database) — per-browser

---

## Backend Features

### Fastify (Node.js)

- Handles all todo CRUD operations
- Handles auth (register/login)
- Runs Prisma migrations on startup
- Has its own AI endpoints as fallback
- Admin endpoints for user/group management

### FastAPI (Python)

- Primary AI endpoint handler
- Full MFA support (QR code generation, TOTP verification)
- Policy-Based Access Control (PBAC) engine
- Two-layer caching:
  - **Identity Cache** — user roles/permissions (TTL-based)
  - **Resource Cache** — todo metadata (TTL-based)
- ETag versioning on todos (optimistic locking — prevents conflicting updates)
- Login history tracking (IP, user agent, status)
- Rate limiting on AI endpoints (default: 50 requests/user/day)

---

## AI Features

All AI features are available in the **Today's Focus** view and via keyboard shortcuts.

### Smart Split (`Ctrl+Shift+V`)

Paste a bullet list of tasks into the create input, press `Ctrl+Shift+V`, and it automatically splits them into individual todos.

```
Input:
• Buy groceries
• Call the dentist
• Finish report

→ Creates 3 separate todos instantly
```

Can use AI for smarter parsing when an API key is configured.

### Focus Coach

Click **"What should I focus on?"** — the AI analyzes your pending tasks and recommends the single most important one to work on next, with reasoning.

### Daily Briefing

Generates a personalized summary of:
- How many tasks you have
- What's highest priority
- Motivational message for the day

### Focus Roulette (`G+R`)

Randomly selects a task from your list with a fun animation. Combined with AI Coach for recommendation.

### Boss Battle Mode

When a task has subtasks:
- A **Boss HP bar** appears on the task card
- HP = percentage of incomplete subtasks
- As you complete subtasks, the boss loses HP
- **Boss Lore** button: AI generates a taunt/story for the boss based on the task name
- When all subtasks are done: **Boss Defeated** badge + particle burst animation

### AI Providers

| Provider | Config | Notes |
|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | Default, `gemini-2.0-flash` |
| OpenAI | `OPENAI_API_KEY` | Set `AI_PROVIDER=openai` |
| Heuristic | (no key) | Regex-based fallback, no API needed |

---

## Admin Console

Access at `/admin` — only visible to users with `role = 'ADMIN'`.

### Users Tab

- View all registered users with email, name, role, group membership, task count
- **Create user** — admin can create accounts with auto-generated passwords
- **Edit user** — change name, email, role (USER/ADMIN), password, group assignments
- **Delete user** — removes user and all their tasks
- Filter and search users

### Groups Tab

- Create user groups with custom names and color coding
- Assign multiple users to a group
- Update or delete groups
- Groups are used to filter tasks in the All Tasks tab

### All Tasks Tab

- View every task across all users
- Filter by user or by group
- See task hierarchy (parent/subtask relationships)
- Read-only view for auditing

---

## Authentication & Security

### Login Flow

```
1. Enter email + password
2. If MFA not set up → MFA Setup screen (scan QR code with authenticator app)
3. If MFA enabled → MFA Verify screen (enter 6-digit code)
4. Success → JWT token stored in localStorage
```

### JWT

- Tokens stored in `localStorage` under key `"token"`
- User object stored under `"user"`
- All API calls attach `Authorization: Bearer <token>` automatically
- On 401 response: token cleared + redirect to `/login`

### MFA (Two-Factor Authentication)

- Uses **TOTP** (Time-based One-Time Password) — compatible with Google Authenticator, Authy, etc.
- Setup: server generates a secret → QR code displayed → user scans with app
- Login: user enters 6-digit code from authenticator app
- Managed entirely by FastAPI

### Password Security

- Passwords hashed with **bcrypt** (cost factor 10)
- Never stored or transmitted in plain text

### CORS

- Configurable via `CORS_ORIGINS` environment variable
- In production: set to your domain (e.g. `https://app.yourdomain.com`)
- In development: `http://localhost:5173`

### Policy-Based Access Control (PBAC)

FastAPI implements a custom PBAC engine (`policy_engine.py`):

- **Actions**: CREATE, READ, UPDATE, DELETE
- **Resources**: TODO, USER
- **Conditions**: ownership check, role check, resource state
- Admins can access all resources; users can only access their own

---

## Theme System

### Theme Modes

- **Light** — white background, dark text
- **Dark** — dark background, light text
- **System** — follows OS preference

### Theme Studio

Click the palette icon to open the Theme Studio. Customize:

**Colors**
- Background color
- Accent/primary color
- Text color
- Success color

**Typography**
- System font (default)
- Monospace
- Serif
- Display

**Effects**
- Neon glow
- Glass blur (glassmorphism)
- Mesh gradients
- Animated gradients
- Starfield background
- Noise overlay

**Geometry**
- Border radius (sharp → rounded → pill)
- Gradient angle

**Preset Themes**
- Default
- Neon
- Glass
- Cyberpunk

All customizations apply instantly via CSS variables on `document.documentElement` and persist in `localStorage`.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `N` | Focus the create task input |
| `/` | Focus the search input |
| `?` | Open keyboard shortcuts modal |
| `G` then `B` | Switch to board/grid view |
| `G` then `L` | Switch to list view |
| `G` then `F` | Switch to Today's Focus view |
| `G` then `R` | Open Focus Roulette |
| `Ctrl+Shift+V` | Smart Split (while in create input) |
| `Esc` | Close any open modal or dialog |

---

## API Reference

### Fastify Endpoints (`:8080`)

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register new user |
| POST | `/login` | Login, returns JWT |

#### Todos
| Method | Endpoint | Description |
|---|---|---|
| GET | `/todos` | Get all todos for current user |
| POST | `/todos` | Create new todo |
| PUT | `/todos/:id` | Update todo (text, done, parentId) |
| DELETE | `/todos/:id` | Delete todo and subtasks |

#### AI (fallback)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/ai/status` | Check AI availability |
| POST | `/ai/split` | Smart split bullet list |
| POST | `/ai/coach` | Focus coach recommendation |
| POST | `/ai/boss-lore` | Generate boss taunt |
| POST | `/ai/briefing` | Daily briefing |
| POST | `/ai/parse-task` | NLP task parsing |

#### Admin (requires ADMIN role)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| POST | `/admin/users` | Create user |
| PATCH | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/users/:id/todos` | Get user's task tree |
| GET | `/admin/todos` | All tasks (filter by user/group) |
| GET | `/admin/groups` | List groups |
| POST | `/admin/groups` | Create group |
| PATCH | `/admin/groups/:id` | Update group |
| DELETE | `/admin/groups/:id` | Delete group |
| PUT | `/admin/groups/:id/members` | Set group members |

#### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/ping` | Health check → `{"status":"ok"}` |

---

### FastAPI Endpoints (`:8000`)

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register new user |
| POST | `/login` | Login, returns JWT |
| POST | `/auth/mfa/setup` | Generate MFA QR code |
| POST | `/auth/mfa/verify` | Verify and enable MFA |
| POST | `/auth/mfa/login` | Login with OTP code |

#### Todos
| Method | Endpoint | Description |
|---|---|---|
| GET | `/todos` | Get todos (cached) |
| POST | `/todos` | Create todo |
| PUT | `/todos/{id}` | Update todo (ETag versioning) |
| DELETE | `/todos/{id}` | Delete todo |

#### AI (rate limited)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/ai/status` | AI provider info + remaining quota |
| POST | `/ai/split` | Smart task splitting |
| POST | `/ai/coach` | Focus coach |
| POST | `/ai/boss-lore` | Boss taunt generation |
| POST | `/ai/briefing` | Daily briefing |
| POST | `/ai/parse-task` | NLP task parsing |

#### Admin
| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/users` | Create user |
| GET | `/admin/users` | List users (paginated) |
| PATCH | `/admin/users/{id}` | Update user |
| DELETE | `/admin/users/{id}` | Delete user |

#### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check → `{"status":"ok"}` |

---

## Environment Variables

### `.env.docker` (full stack)

```env
# Auth — MUST be identical on both backends
JWT_SECRET=your-long-random-secret

# AI
GEMINI_API_KEY=your-gemini-key
AI_PROVIDER=gemini                   # gemini or openai
AI_MODEL=gemini-2.0-flash
AI_MAX_REQUESTS_PER_USER_PER_DAY=50

# Database
POSTGRES_USER=todo
POSTGRES_PASSWORD=todo
POSTGRES_DB=todo

# CORS — comma-separated browser origins
CORS_ORIGINS=http://localhost,http://localhost:80

# Frontend build args
VITE_BACKEND_MODE=hybrid
VITE_API_URL_NODE=http://localhost:8080
VITE_API_URL_PYTHON=http://localhost:8000
```

---

## Folder Structure

```
google-keep-clone/
│
├── todo/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn base components
│   │   │   ├── TodoCard.tsx       # Board view card
│   │   │   ├── NestedItem.tsx     # Recursive subtask renderer
│   │   │   ├── TodoListItem.tsx   # List view renderer
│   │   │   ├── ThemeStudio.tsx    # Theme customizer
│   │   │   ├── SmartSplitModal.tsx
│   │   │   ├── FocusRouletteModal.tsx
│   │   │   └── BossHPBar.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx    # JWT + user state
│   │   │   └── ThemeContext.tsx   # Theme mode + custom theme
│   │   ├── hooks/
│   │   │   ├── usePriority.ts     # Per-task priority (localStorage)
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── pages/
│   │   │   ├── NestedTodo.tsx     # Main task board
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── admin/
│   │   │       ├── AdminUsers.tsx
│   │   │       ├── AdminUsersTab.tsx
│   │   │       ├── AdminGroupsTab.tsx
│   │   │       └── AdminTasksTab.tsx
│   │   ├── services/
│   │   │   └── todoService.ts     # All API calls
│   │   ├── lib/
│   │   │   └── axios.ts           # Axios instance with auth interceptor
│   │   └── config/
│   │       └── api.config.ts      # Backend URLs + mode config
│   ├── Dockerfile                 # Multi-stage: build + nginx
│   └── nginx.conf                 # SPA fallback routing
│
├── todoBackend/                   # Fastify Node.js backend
│   ├── src/
│   │   └── index.ts               # All routes + server setup
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # SQL migration files
│   ├── scripts/
│   │   └── createAdmin.ts         # One-time admin user creation
│   └── Dockerfile
│
├── todo-fast-api/                 # FastAPI Python backend
│   ├── main.py                    # All routes
│   ├── database.py                # SQLAlchemy setup
│   ├── modal/                     # SQLAlchemy models
│   │   ├── todo.py
│   │   └── user.py
│   ├── schema/                    # Pydantic schemas
│   │   ├── todo.py
│   │   ├── user.py
│   │   └── ai.py
│   ├── policy_engine.py           # PBAC engine
│   ├── policies.py                # Permission rules
│   ├── utils.py                   # JWT, auth helpers
│   ├── utils_cache.py             # Two-layer cache
│   ├── utils_email.py             # Email service
│   └── Dockerfile
│
├── docker-compose.yml             # Full stack definition
├── .env.docker.example            # Env template
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions CI/CD
├── infra/                         # AWS infrastructure templates
├── DEPLOYMENT_GUIDE.md            # How to deploy
└── PROJECT.md                     # This file
```

---

*TaskFlow — Built with React 19, Fastify, FastAPI, PostgreSQL, Docker · Deployed on AWS EC2*
