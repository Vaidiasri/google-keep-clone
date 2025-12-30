// Fastify types import kar rahe hain
import { FastifyInstance } from 'fastify'
// TodoController import kar rahe hain (request handlers ke liye)
import { TodoController } from '../controllers/todoController'
// Validation schemas import kar rahe hain
import { 
  createTodoSchema,   // POST request validation
  updateTodoSchema,   // PUT request validation
  deleteTodoSchema,   // DELETE request validation
  getTodosSchema      // GET response validation
} from '../schemas/todoSchema'
// Types import kar rahe hain (controller ke saath sync karne ke liye)
import { CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types'
// Auth middleware import kar rahe hain
import { authenticate } from '../middleware/authMiddleware'

// TodoController ka instance bana rahe hain
const todoController = new TodoController()

// Todo routes register karne ka function

// Todo routes register karne ka function
export default async function todoRoutes(fastify: FastifyInstance) {
  // GET /todos - Sare todos get karne ka route
  fastify.get('/todos', { 
    schema: getTodosSchema,  // Response validation schema
    onRequest: [authenticate] // Authentication check
  }, todoController.getAllTodos.bind(todoController))

  // POST /todos - Naya todo create karne ka route
  fastify.post<{ Body: CreateTodoRequest }>('/todos', { 
    schema: createTodoSchema,  // Request/Response validation schema
    onRequest: [authenticate] // Authentication check
  }, todoController.createTodo.bind(todoController))

  // PUT /todos/:id - Todo update karne ka route
  fastify.put<{ Params: { id: string }; Body: UpdateTodoRequest }>('/todos/:id', { 
    schema: updateTodoSchema,  // Request validation schema
    onRequest: [authenticate] // Authentication check
  }, todoController.updateTodo.bind(todoController))

  // DELETE /todos/:id - Todo delete karne ka route
  fastify.delete<{ Params: { id: string } }>('/todos/:id', { 
    schema: deleteTodoSchema,  // Request validation schema
    onRequest: [authenticate] // Authentication check
  }, todoController.deleteTodo.bind(todoController))
}
