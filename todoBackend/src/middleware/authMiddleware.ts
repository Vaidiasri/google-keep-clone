import { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const payload = request.user as { id?: number; email?: string; sub?: string }
  const userId = payload.id
  if (!userId) {
    return reply.status(401).send({ error: 'Invalid token' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    let role = (user as { role?: string } | null)?.role

    if (!role) {
      const rows = await prisma.$queryRaw<{ role: string }[]>`
        SELECT role FROM "User" WHERE id = ${userId} LIMIT 1
      `
      role = rows[0]?.role
    }

    if (role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    ;(request as FastifyRequest & { adminUser: { id: number; role: string } }).adminUser = {
      id: userId,
      role: 'ADMIN',
    }
  } catch {
    return reply.status(500).send({ error: 'Admin auth check failed — restart the backend server.' })
  }
}
