import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '../middleware/authMiddleware'

const prisma = new PrismaClient()

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  mfa_enabled: true,
  groups: {
    select: {
      group: { select: { id: true, name: true, color: true } },
    },
  },
  _count: { select: { todos: true } },
} as const

const todoInclude = {
  subTodos: {
    include: {
      subTodos: {
        include: { subTodos: true },
      },
    },
  },
} as const

function mapUser(user: {
  id: number
  email: string
  name: string | null
  role: string
  mfa_enabled: boolean
  groups: { group: { id: number; name: string; color: string } }[]
  _count: { todos: number }
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mfa_enabled: user.mfa_enabled,
    taskCount: user._count.todos,
    groups: user.groups.map((g) => g.group),
  }
}

async function getUserTodos(userId: number) {
  return prisma.todo.findMany({
    where: { userId, parentId: null },
    orderBy: { createdAt: 'desc' },
    include: todoInclude,
  })
}

export default async function adminRoutes(fastify: FastifyInstance) {
  const adminOnly = { onRequest: [requireAdmin] }

  // ── Users ──────────────────────────────────────────────────────────────

  fastify.get('/admin/users', adminOnly, async (_request, reply) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: userSelect,
      })
      return reply.send(users.map(mapUser))
    } catch (err) {
      fastify.log.error(err)
      try {
        const users = await prisma.user.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, email: true, name: true, _count: { select: { todos: true } } },
        })
        return reply.send(
          users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: 'USER' as const,
            mfa_enabled: false,
            taskCount: u._count.todos,
            groups: [],
          }))
        )
      } catch (fallbackErr) {
        fastify.log.error(fallbackErr)
        return reply.status(500).send({ error: 'Failed to fetch users' })
      }
    }
  })

  fastify.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    adminOnly,
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10)
        const user = await prisma.user.findUnique({ where: { id }, select: userSelect })
        if (!user) return reply.status(404).send({ error: 'User not found' })
        return reply.send(mapUser(user))
      } catch {
        return reply.status(500).send({ error: 'Failed to fetch user' })
      }
    }
  )

  fastify.post<{
    Body: { email: string; name?: string; password?: string; role?: string; groupIds?: number[] }
  }>('/admin/users', adminOnly, async (request, reply) => {
    try {
      const { email, name, role = 'USER', groupIds = [] } = request.body
      if (!email?.trim()) {
        return reply.status(400).send({ error: 'Email is required' })
      }

      const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
      if (existing) {
        return reply.status(400).send({ error: 'User with this email already exists' })
      }

      const rawPassword =
        request.body.password?.trim() || Math.random().toString(36).slice(2, 12)
      const hashed = await bcrypt.hash(rawPassword, 10)

      const user = await prisma.user.create({
        data: {
          email: email.trim(),
          name: name?.trim() || null,
          password: hashed,
          role: role === 'ADMIN' ? 'ADMIN' : 'USER',
          groups: {
            create: groupIds.map((groupId) => ({ groupId })),
          },
        },
        select: userSelect,
      })

      return reply.status(201).send({
        message: 'User created successfully.',
        temp_password: request.body.password ? undefined : rawPassword,
        user: mapUser(user),
      })
    } catch {
      return reply.status(500).send({ error: 'Failed to create user' })
    }
  })

  fastify.patch<{
    Params: { id: string }
    Body: {
      role?: string
      name?: string
      email?: string
      password?: string
      groupIds?: number[]
    }
  }>('/admin/users/:id', adminOnly, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10)
      const { role, name, email, password, groupIds } = request.body

      if (email?.trim()) {
        const clash = await prisma.user.findFirst({
          where: { email: email.trim(), NOT: { id } },
        })
        if (clash) return reply.status(400).send({ error: 'Email already in use' })
      }

      const data: Record<string, unknown> = {}
      if (role) data.role = role === 'ADMIN' ? 'ADMIN' : 'USER'
      if (name !== undefined) data.name = name.trim() || null
      if (email?.trim()) data.email = email.trim()
      if (password?.trim()) data.password = await bcrypt.hash(password.trim(), 10)

      await prisma.user.update({ where: { id }, data })

      if (groupIds !== undefined) {
        await prisma.userGroupMember.deleteMany({ where: { userId: id } })
        if (groupIds.length) {
          await prisma.userGroupMember.createMany({
            data: groupIds.map((groupId) => ({ userId: id, groupId })),
          })
        }
      }

      const user = await prisma.user.findUnique({ where: { id }, select: userSelect })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(mapUser(user))
    } catch {
      return reply.status(404).send({ error: 'User not found' })
    }
  })

  fastify.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    adminOnly,
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10)
        await prisma.todo.deleteMany({ where: { userId: id } })
        await prisma.userGroupMember.deleteMany({ where: { userId: id } })
        await prisma.user.delete({ where: { id } })
        return reply.send({ message: 'User deleted successfully' })
      } catch {
        return reply.status(404).send({ error: 'User not found' })
      }
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/admin/users/:id/todos',
    adminOnly,
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10)
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } })
        if (!user) return reply.status(404).send({ error: 'User not found' })
        const todos = await getUserTodos(id)
        return reply.send({ user, todos })
      } catch {
        return reply.status(500).send({ error: 'Failed to fetch user tasks' })
      }
    }
  )

  // ── All tasks (filter by userId or groupId) ────────────────────────────

  fastify.get<{ Querystring: { userId?: string; groupId?: string } }>(
    '/admin/todos',
    adminOnly,
    async (request, reply) => {
      try {
        const userId = request.query.userId ? parseInt(request.query.userId, 10) : undefined
        const groupId = request.query.groupId ? parseInt(request.query.groupId, 10) : undefined

        let userIds: number[] | undefined
        if (groupId) {
          const members = await prisma.userGroupMember.findMany({
            where: { groupId },
            select: { userId: true },
          })
          userIds = members.map((m: { userId: number }) => m.userId)
          if (userIds.length === 0) return reply.send([])
        } else if (userId) {
          userIds = [userId]
        }

        const todos = await prisma.todo.findMany({
          where: {
            parentId: null,
            ...(userIds && userIds.length > 0 ? { userId: { in: userIds } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          include: {
            ...todoInclude,
            user: { select: { id: true, email: true, name: true } },
          },
        })

        return reply.send(todos)
      } catch {
        return reply.status(500).send({ error: 'Failed to fetch tasks' })
      }
    }
  )

  // ── Groups ─────────────────────────────────────────────────────────────

  fastify.get('/admin/groups', adminOnly, async (_request, reply) => {
    try {
      const groups = await prisma.userGroup.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { members: true } },
          members: {
            select: {
              user: { select: { id: true, email: true, name: true, role: true } },
            },
          },
        },
      })
      return reply.send(
        groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          color: g.color,
          memberCount: g._count.members,
          members: g.members.map((m) => m.user),
        }))
      )
    } catch (err) {
      fastify.log.error(err)
      return reply.send([])
    }
  })

  fastify.post<{ Body: { name: string; description?: string; color?: string } }>(
    '/admin/groups',
    adminOnly,
    async (request, reply) => {
      try {
        const { name, description, color } = request.body
        if (!name?.trim()) return reply.status(400).send({ error: 'Group name is required' })

        const group = await prisma.userGroup.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || '#6366f1',
          },
        })
        return reply.status(201).send({ ...group, memberCount: 0, members: [] })
      } catch {
        return reply.status(400).send({ error: 'Group name already exists' })
      }
    }
  )

  fastify.patch<{
    Params: { id: string }
    Body: { name?: string; description?: string; color?: string }
  }>('/admin/groups/:id', adminOnly, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10)
      const { name, description, color } = request.body
      const group = await prisma.userGroup.update({
        where: { id },
        data: {
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description.trim() || null } : {}),
          ...(color ? { color } : {}),
        },
      })
      return reply.send(group)
    } catch {
      return reply.status(404).send({ error: 'Group not found' })
    }
  })

  fastify.delete<{ Params: { id: string } }>(
    '/admin/groups/:id',
    adminOnly,
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10)
        await prisma.userGroupMember.deleteMany({ where: { groupId: id } })
        await prisma.userGroup.delete({ where: { id } })
        return reply.send({ message: 'Group deleted successfully' })
      } catch {
        return reply.status(404).send({ error: 'Group not found' })
      }
    }
  )

  fastify.put<{ Params: { id: string }; Body: { userIds: number[] } }>(
    '/admin/groups/:id/members',
    adminOnly,
    async (request, reply) => {
      try {
        const groupId = parseInt(request.params.id, 10)
        const { userIds } = request.body

        await prisma.userGroupMember.deleteMany({ where: { groupId } })
        if (userIds?.length) {
          await prisma.userGroupMember.createMany({
            data: userIds.map((userId) => ({ userId, groupId })),
          })
        }

        const group = await prisma.userGroup.findUnique({
          where: { id: groupId },
          include: {
            _count: { select: { members: true } },
            members: { select: { user: { select: { id: true, email: true, name: true, role: true } } } },
          },
        })
        if (!group) return reply.status(404).send({ error: 'Group not found' })

        return reply.send({
          id: group.id,
          name: group.name,
          description: group.description,
          color: group.color,
          memberCount: group._count.members,
          members: group.members.map((m) => m.user),
        })
      } catch {
        return reply.status(500).send({ error: 'Failed to update group members' })
      }
    }
  )
}
