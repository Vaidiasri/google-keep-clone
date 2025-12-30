// Fastify framework import kar rahe hain (server banane ke liye)
import fastify from 'fastify'
// CORS plugin import kar rahe hain (frontend se connection ke liye)
import cors from '@fastify/cors'
// Todo routes import kar rahe hain
import todoRoutes from './routes/todoRoutes'
import authRoutes from './routes/authRoutes'
import fastifyJwt, { FastifyJWT } from 'fastify-jwt' // Correct import for fastify-jwt
import 'dotenv/config' // Dotenv config load kar rahe hain

// Fastify server instance bana rahe hain with logging enabled
const server = fastify({ logger: true })

// CORS register kar rahe hain
// Ye frontend ko allow karega backend se baat karne ke liye
server.register(cors, { 
  origin: true,  // Sabko allow kar rahe hain (development ke liye)
  // Production mein specific origin dena chahiye: origin: 'http://localhost:5173'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Sare HTTP methods allow kar rahe hain
  allowedHeaders: ['Content-Type', 'Authorization'],  // Headers jo allow hain
  credentials: true  // Cookies aur credentials allow kar rahe hain
})

server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'supersecretkey' // Fallback for safety
})

// Health check route - Server chal raha hai ya nahi check karne ke liye
server.get('/ping', async (request, reply) => {
  return { status: 'ok', message: 'pong' }
})

// Debug route - Database mein sare todos dekhne ke liye (including children)
server.get('/debug/all-todos', async (request, reply) => {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  
  const allTodos = await prisma.todo.findMany({
    orderBy: { id: 'asc' }
  })
  
  await prisma.$disconnect()
  return allTodos
})

// Test endpoint - Prisma include test karne ke liye
server.get('/debug/test-include', async (request, reply) => {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  
  console.log(' Testing Prisma include...')
  
  const todos = await prisma.todo.findMany({
    where: { parentId: null },
    include: {
      subTodos: true
    }
  })
  
  console.log(' Raw Prisma result:', JSON.stringify(todos, null, 2))
  console.log(' First todo subTodos:', todos[0]?.subTodos)
  
  await prisma.$disconnect()
  
  return {
    todosCount: todos.length,
    todos: todos,
    firstTodoHasSubTodos: todos[0] && 'subTodos' in todos[0],
    firstTodoSubTodosCount: todos[0]?.subTodos?.length || 0
  }
})

// Auth routes register kar rahe hain
server.register(authRoutes)


// Todo routes register kar rahe hain
// Ye sare /todos endpoints ko handle karega
server.register(todoRoutes)

// Server start karne ka function
const start = async () => {
  try {
    // Port 8080 par server listen karna shuru karo
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log(' Server started on http://localhost:8080')
  } catch (err) {
    // Agar error aaye to log karo aur process band kar do
    server.log.error(err)
    process.exit(1)
  }
}

// Server start karo
start()