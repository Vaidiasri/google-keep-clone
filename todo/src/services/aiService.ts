import type { AxiosInstance } from 'axios'
import { aiClient, aiFallbackClient } from '../lib/axios'
import { API_ENDPOINTS, BACKEND_MODE } from '../config/api.config'
import type {
  AISplitResponse,
  AICoachResponse,
  AIBossLoreResponse,
  AIBriefingResponse,
  AIParseTaskResponse,
  AIStatusResponse,
  TodoSummary,
} from '../types/ai.types'

export class AIRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIRateLimitError'
  }
}

const handleAIError = (err: unknown): never => {
  const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
  if (axiosErr.response?.status === 429) {
    throw new AIRateLimitError(
      axiosErr.response.data?.error ?? 'Daily AI limit reached.'
    )
  }
  throw err
}

const shouldFallback = (err: unknown): boolean => {
  if (BACKEND_MODE !== 'hybrid' || !aiFallbackClient) return false
  const axiosErr = err as { response?: { status?: number }; code?: string }
  if (!axiosErr.response) return true // network / timeout
  const status = axiosErr.response.status ?? 0
  return status === 404 || status === 502 || status === 503 || status >= 500
}

async function withAIFallback<T>(
  fn: (client: AxiosInstance) => Promise<T>
): Promise<T> {
  try {
    return await fn(aiClient)
  } catch (err) {
    if (shouldFallback(err) && aiFallbackClient) {
      try {
        return await fn(aiFallbackClient)
      } catch {
        return handleAIError(err)
      }
    }
    return handleAIError(err)
  }
}

export const aiApi = {
  status: async (): Promise<AIStatusResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.get<AIStatusResponse>(API_ENDPOINTS.AI.STATUS)
      return res.data
    })
  },

  split: async (text: string, parentId?: number): Promise<AISplitResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.post<AISplitResponse>(API_ENDPOINTS.AI.SPLIT, {
        text,
        parentId,
      })
      return res.data
    })
  },

  coach: async (
    todos: TodoSummary[],
    focusTaskId?: number
  ): Promise<AICoachResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.post<AICoachResponse>(API_ENDPOINTS.AI.COACH, {
        todos,
        focusTaskId,
      })
      return res.data
    })
  },

  bossLore: async (
    taskText: string,
    subtaskCount: number,
    progress: number
  ): Promise<AIBossLoreResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.post<AIBossLoreResponse>(
        API_ENDPOINTS.AI.BOSS_LORE,
        { taskText, subtaskCount, progress }
      )
      return res.data
    })
  },

  briefing: async (
    todos: TodoSummary[],
    userName: string
  ): Promise<AIBriefingResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.post<AIBriefingResponse>(
        API_ENDPOINTS.AI.BRIEFING,
        { todos, userName }
      )
      return res.data
    })
  },

  parseTask: async (input: string): Promise<AIParseTaskResponse> => {
    return withAIFallback(async (client) => {
      const res = await client.post<AIParseTaskResponse>(
        API_ENDPOINTS.AI.PARSE_TASK,
        { input }
      )
      return res.data
    })
  },
}
