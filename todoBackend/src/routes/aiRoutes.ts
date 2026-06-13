import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authMiddleware'
import {
  aiSplit,
  aiCoach,
  aiBossLore,
  aiBriefing,
  aiParseTask,
  aiStatus,
  checkRateLimit,
  incrementRateLimit,
  TodoSummary,
} from '../services/aiService'

export default async function aiRoutes(fastify: FastifyInstance) {
  const withAuth = { onRequest: [authenticate] }

  fastify.get('/ai/status', withAuth, async (request, reply) => {
    const user = request.user as { id: number }
    return reply.send(aiStatus(user.id))
  })

  fastify.post<{ Body: { text: string; parentId?: number } }>(
    '/ai/split',
    withAuth,
    async (request, reply) => {
      const user = request.user as { id: number }
      try {
        checkRateLimit(user.id)
        incrementRateLimit(user.id)
        const { text } = request.body
        if (!text?.trim()) return reply.status(400).send({ error: 'Text is required' })
        return reply.send(await aiSplit(text.trim()))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI split failed'
        const status = message.includes('limit') ? 429 : 500
        return reply.status(status).send({ error: message })
      }
    }
  )

  fastify.post<{ Body: { todos: TodoSummary[]; focusTaskId?: number } }>(
    '/ai/coach',
    withAuth,
    async (request, reply) => {
      const user = request.user as { id: number }
      try {
        checkRateLimit(user.id)
        incrementRateLimit(user.id)
        const { todos, focusTaskId } = request.body
        return reply.send(await aiCoach(todos ?? [], focusTaskId))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI coach failed'
        const status = message.includes('limit') ? 429 : message.includes('No incomplete') ? 400 : 500
        return reply.status(status).send({ error: message })
      }
    }
  )

  fastify.post<{ Body: { taskText: string; subtaskCount: number; progress: number } }>(
    '/ai/boss-lore',
    withAuth,
    async (request, reply) => {
      const user = request.user as { id: number }
      try {
        checkRateLimit(user.id)
        incrementRateLimit(user.id)
        const { taskText, subtaskCount, progress } = request.body
        if (!taskText?.trim()) return reply.status(400).send({ error: 'taskText is required' })
        return reply.send(await aiBossLore(taskText.trim(), subtaskCount ?? 0, progress ?? 0))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI boss lore failed'
        const status = message.includes('limit') ? 429 : 500
        return reply.status(status).send({ error: message })
      }
    }
  )

  fastify.post<{ Body: { todos: TodoSummary[]; userName?: string } }>(
    '/ai/briefing',
    withAuth,
    async (request, reply) => {
      const user = request.user as { id: number }
      try {
        checkRateLimit(user.id)
        incrementRateLimit(user.id)
        const { todos, userName } = request.body
        return reply.send(await aiBriefing(todos ?? [], userName ?? 'there'))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI briefing failed'
        const status = message.includes('limit') ? 429 : 500
        return reply.status(status).send({ error: message })
      }
    }
  )

  fastify.post<{ Body: { input: string } }>(
    '/ai/parse-task',
    withAuth,
    async (request, reply) => {
      const user = request.user as { id: number }
      try {
        checkRateLimit(user.id)
        incrementRateLimit(user.id)
        const { input } = request.body
        if (!input?.trim()) return reply.status(400).send({ error: 'Input is required' })
        return reply.send(await aiParseTask(input.trim()))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI parse failed'
        const status = message.includes('limit') ? 429 : 500
        return reply.status(status).send({ error: message })
      }
    }
  )
}
