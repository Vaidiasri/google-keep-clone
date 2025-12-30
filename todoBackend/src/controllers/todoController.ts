// Fastify ke types import kar rahe hain
import { FastifyRequest, FastifyReply } from 'fastify'
// TodoService import kar rahe hain (database operations ke liye)
import { TodoService } from '../services/todoService'
// Request/Response types import kar rahe hain
import { CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types'

// TodoService ka instance bana rahe hain
const todoService = new TodoService()

// TodoController class - Ye sare HTTP requests handle karega
export class TodoController {
  // GET /todos - Sare todos get karne ka handler
  async getAllTodos(request: FastifyRequest, reply: FastifyReply) {
    try {
      // User ID nikalo token se
      const user = request.user as { id: number }
      
      // Service se sare todos fetch karo (user ID ke saath)
      const todos = await todoService.getAllTodos(user.id)
      // Response mein todos bhej do
      return reply.send(todos)
    } catch (error) {
      // Agar error aaye to 500 status code ke saath error message bhejo
      return reply.status(500).send({ error: 'Failed to fetch todos' })
    }
  }

  // POST /todos - Naya todo create karne ka handler
  async createTodo(
    request: FastifyRequest<{ Body: CreateTodoRequest }>,
    reply: FastifyReply
  ) {
    try {
      // User ID nikalo token se
      const user = request.user as { id: number }
      
      // Request body se text aur parentId nikalo
      const { text, parentId } = request.body
      
      // Validation: Text empty nahi hona chahiye
      if (!text || text.trim() === '') {
        // Agar empty hai to 400 (Bad Request) bhejo
        return reply.status(400).send({ error: 'Text is required' })
      }

      // Service se naya todo create karo (user ID pass karke)
      const todo = await todoService.createTodo(text, user.id, parentId)
      // 201 (Created) status ke saath naya todo bhejo
      return reply.status(201).send(todo)
    } catch (error) {
      // Agar error aaye to 500 status code ke saath error message bhejo
      return reply.status(500).send({ error: 'Failed to create todo' })
    }
  }

  // PUT /todos/:id - Todo update karne ka handler
  async updateTodo(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTodoRequest }>,
    reply: FastifyReply
  ) {
    try {
      // User ID nikalo
      const user = request.user as { id: number }
      
      // URL params se id nikalo aur number mein convert karo
      const id = parseInt(request.params.id)
      // Request body se text aur done status nikalo
      const { text, done } = request.body

      // Service se todo update karo (user ownership check ke saath)
      const todo = await todoService.updateTodo(id, user.id, { text, done })
      // Updated todo response mein bhejo
      return reply.send(todo)
    } catch (error) {
      // Agar error aaye to 500 status code ke saath error message bhejo
      return reply.status(500).send({ error: 'Failed to update todo' })
    }
  }

  // DELETE /todos/:id - Todo delete karne ka handler
  async deleteTodo(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      // User ID
      const user = request.user as { id: number }
      
      // URL params se id nikalo aur number mein convert karo
      const id = parseInt(request.params.id)
      // Service se todo delete karo (with ownership check)
      await todoService.deleteTodo(id, user.id)
      // 204 (No Content) status bhejo (successful deletion)
      return reply.status(204).send()
    } catch (error) {
      // Agar error aaye to 500 status code ke saath error message bhejo
      return reply.status(500).send({ error: 'Failed to delete todo' })
    }
  }
}
