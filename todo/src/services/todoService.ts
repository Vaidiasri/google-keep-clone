// Axios client import kar rahe hain
import apiClient from '../lib/axios'
// API endpoints import kar rahe hain
import { API_ENDPOINTS } from '../config/api.config'

// Types import kar rahe hain
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types';

// Todo API Service - Sare todo-related API calls yaha hain
export const todoApi = {
  // Sare todos get karne ka function
  getAllTodos: async (): Promise<Todo[]> => {
    // GET request bhej rahe hain
    const response = await apiClient.get<Todo[]>(API_ENDPOINTS.TODOS.GET_ALL)
    // Response data return kar rahe hain
    return response.data
  },

  // Naya todo create karne ka function
  createTodo: async (data: CreateTodoRequest): Promise<Todo> => {
    // POST request bhej rahe hain with data
    const response = await apiClient.post<Todo>(API_ENDPOINTS.TODOS.CREATE, data)
    // Created todo return kar rahe hain
    return response.data
  },

  // Todo update karne ka function (done status toggle)
  updateTodo: async (id: number, data: UpdateTodoRequest): Promise<Todo> => {
    // PUT request bhej rahe hain
    const response = await apiClient.put<Todo>(
      API_ENDPOINTS.TODOS.UPDATE(id),  // Dynamic URL with ID
      data
    )
    // Updated todo return kar rahe hain
    return response.data
  },

  // Todo delete karne ka function
  deleteTodo: async (id: number): Promise<void> => {
    // DELETE request bhej rahe hain
    await apiClient.delete(API_ENDPOINTS.TODOS.DELETE(id))
    // Delete mein response data nahi hota (204 No Content)
  },
}
