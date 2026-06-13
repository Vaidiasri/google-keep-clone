import apiClient from '../lib/axios'
import type { Todo } from '../types/todo.types'

export interface AdminGroup {
  id: number
  name: string
  description: string | null
  color: string
  memberCount?: number
  members?: { id: number; email: string; name: string | null; role: string }[]
}

export interface AdminUser {
  id: number
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  mfa_enabled: boolean
  taskCount: number
  groups: { id: number; name: string; color: string }[]
}

export interface AdminTodo extends Todo {
  user?: { id: number; email: string; name: string | null }
}

export const adminApi = {
  getUsers: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),

  getUser: (id: number) => apiClient.get<AdminUser>(`/admin/users/${id}`).then((r) => r.data),

  createUser: (data: {
    email: string
    name?: string
    password?: string
    role?: string
    groupIds?: number[]
  }) => apiClient.post('/admin/users', data).then((r) => r.data),

  updateUser: (
    id: number,
    data: {
      name?: string
      email?: string
      password?: string
      role?: string
      groupIds?: number[]
    }
  ) => apiClient.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`),

  getUserTodos: (id: number) =>
    apiClient
      .get<{ user: { id: number; email: string; name: string | null }; todos: Todo[] }>(
        `/admin/users/${id}/todos`
      )
      .then((r) => r.data),

  getAllTodos: (params?: { userId?: number; groupId?: number }) =>
    apiClient
      .get<AdminTodo[]>('/admin/todos', { params })
      .then((r) => r.data),

  getGroups: () => apiClient.get<AdminGroup[]>('/admin/groups').then((r) => r.data),

  createGroup: (data: { name: string; description?: string; color?: string }) =>
    apiClient.post<AdminGroup>('/admin/groups', data).then((r) => r.data),

  updateGroup: (id: number, data: { name?: string; description?: string; color?: string }) =>
    apiClient.patch<AdminGroup>(`/admin/groups/${id}`, data).then((r) => r.data),

  deleteGroup: (id: number) => apiClient.delete(`/admin/groups/${id}`),

  setGroupMembers: (groupId: number, userIds: number[]) =>
    apiClient.put<AdminGroup>(`/admin/groups/${groupId}/members`, { userIds }).then((r) => r.data),
}
