# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands must be run from the `todo/` subdirectory (the Vite project root).

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Type-check (tsc -b) then Vite production build
npm run lint       # ESLint across all src files
npm run preview    # Serve the production build locally
npx tsc --noEmit   # Type-check only, no emit — use to verify changes before committing
```

There are no tests in this project.

## Backend Configuration

The frontend talks to one of two backends, controlled via `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_FASTAPI` | `false` | Set to `"true"` to use the Python backend |
| `VITE_API_URL_NODE` | `http://localhost:8080` | Node.js / Fastify backend |
| `VITE_API_URL_PYTHON` | `http://localhost:8000` | Python / FastAPI backend |

The flag is read in `src/config/api.config.ts`. The Python backend is the primary one in active use. Auth tokens come from `localStorage` key `"token"`; user object is under `"user"`.

## Architecture

### Provider Stack (`main.tsx`)
```
ThemeProvider          ← dark/light/system, writes .dark to <html>
  AuthProvider         ← JWT token + user in localStorage
    App (BrowserRouter)
      Toaster          ← shadcn toast portal
```

### Routing (`App.tsx`)
- `/login`, `/register` — `PublicRoute` (redirect to `/` if already authed)
- `/` — `ProtectedRoute` → `NestedTodo` (main task board)
- `/admin` — `ProtectedRoute` → `AdminUsers` (role check is API-enforced, not frontend-enforced)
- `*` → redirects to `/`

### Data Flow
All API calls go through `src/lib/axios.ts` — a single Axios instance that:
- Attaches `Authorization: Bearer <token>` from localStorage on every request
- On 401: clears `token`/`user` from localStorage and hard-redirects to `/login`
- Per-request `Authorization` override is used for MFA temp tokens (do not mutate `apiClient.defaults.headers`)

Todo CRUD lives in `src/services/todoService.ts`. All endpoints are defined in `src/config/api.config.ts`.

### State Architecture (`NestedTodo.tsx`)
The main page is a single large component that owns all todo state and passes an `actions` object (typed as `TodoActions`) down to three render components:
- `TodoCard` — board/grid view card (level 0 only)
- `NestedItem` — recursive subtask renderer inside cards (level 1+)
- `TodoListItem` — recursive list view renderer

`TodoActions` includes `getPriority` / `cyclePriority` from `usePriority` hook (localStorage-backed, no API). Avoid lifting this into a context — keep it local to `NestedTodo`.

### Key Hooks
| Hook | Location | Purpose |
|---|---|---|
| `useAuth` | `context/AuthContext` | user, token, login(), logout() |
| `useTheme` | `context/ThemeContext` | theme, toggle(), isDark |
| `usePriority` | `hooks/usePriority` | per-task priority in localStorage |
| `useKeyboardShortcuts` | `hooks/useKeyboardShortcuts` | global hotkeys (N, /, G+B, G+L, ?, Esc) |

### UI Components
All base components (`Button`, `Input`, `Card`, `Dialog`, `Checkbox`, `Progress`, `Badge`, `Table`, `DropdownMenu`, `Toast`) are shadcn/ui wrappers in `src/components/ui/`. Do not add logic to these files.

### Dark Mode
The CSS already defines a complete `.dark` class with oklch CSS variables in `src/index.css`. Add `dark:` Tailwind variants for any new hardcoded colors (`bg-white`, `text-slate-900`, etc.). The `ThemeProvider` toggles the `dark` class on `document.documentElement`.

### MFA Login Flow
Login has three stages managed by `authStage` state: `LOGIN` → `MFA_SETUP` → `MFA_VERIFY`. The `MFASetup` component handles the QR code scan flow. All MFA API calls must pass the temp token as a per-request header, not via `apiClient.defaults`.
