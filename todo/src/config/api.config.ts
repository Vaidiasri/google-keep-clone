// API Configuration — supports Fastify, FastAPI, or hybrid (both at once)

export type BackendMode = 'fastify' | 'fastapi' | 'hybrid'

const NODE_URL = import.meta.env.VITE_API_URL_NODE || 'http://localhost:8080'
const PYTHON_URL = import.meta.env.VITE_API_URL_PYTHON || 'http://localhost:8000'

/** @deprecated use BACKEND_MODE — kept for backward compatibility */
export const USE_FASTAPI = import.meta.env.VITE_USE_FASTAPI === 'true'

function resolveBackendMode(): BackendMode {
  const mode = import.meta.env.VITE_BACKEND_MODE as string | undefined
  if (mode === 'fastify' || mode === 'fastapi' || mode === 'hybrid') return mode
  // Legacy: VITE_USE_FASTAPI=true → all requests on FastAPI
  if (USE_FASTAPI) return 'fastapi'
  // Legacy: VITE_AI_USE_FASTAPI=true → hybrid without renaming env var
  if (import.meta.env.VITE_AI_USE_FASTAPI === 'true') return 'hybrid'
  return 'fastify'
}

export const BACKEND_MODE = resolveBackendMode()

/** Todos, auth, admin — Fastify in fastify/hybrid, FastAPI in fastapi mode */
export const API_BASE_URL =
  BACKEND_MODE === 'fastapi' ? PYTHON_URL : NODE_URL

/** AI routes — FastAPI in fastapi/hybrid, Fastify in fastify-only mode */
export const AI_BASE_URL =
  BACKEND_MODE === 'fastify' ? NODE_URL : PYTHON_URL

/** Fastify URL used as AI fallback when hybrid + FastAPI is unreachable */
export const AI_FALLBACK_URL = NODE_URL

export const BACKEND_LABELS: Record<BackendMode, string> = {
  fastify: 'Fastify (Node :8080)',
  fastapi: 'FastAPI (Python :8000)',
  hybrid: 'Hybrid — Fastify todos + FastAPI AI',
}

export const API_ENDPOINTS = {
  PING: '/ping',

  TODOS: {
    GET_ALL: '/todos',
    CREATE: '/todos',
    UPDATE: (id: number) => `/todos/${id}`,
    DELETE: (id: number) => `/todos/${id}`,
  },

  AI: {
    STATUS: '/ai/status',
    SPLIT: '/ai/split',
    COACH: '/ai/coach',
    BOSS_LORE: '/ai/boss-lore',
    BRIEFING: '/ai/briefing',
    PARSE_TASK: '/ai/parse-task',
  },
}
