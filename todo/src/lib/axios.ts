import axios, { type AxiosInstance } from 'axios'
import {
  API_BASE_URL,
  AI_BASE_URL,
  AI_FALLBACK_URL,
  BACKEND_MODE,
} from '../config/api.config'

function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )
}

function createClient(baseURL: string, timeout = 10000): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout,
  })
  attachInterceptors(client)
  return client
}

/** Core API — todos, auth, admin */
export const apiClient = createClient(API_BASE_URL)

/** AI API — FastAPI in hybrid/fastapi mode, Fastify in fastify-only mode */
export const aiClient = createClient(AI_BASE_URL, 45000)

/** Fallback AI client (Fastify heuristics) when hybrid + FastAPI is down */
export const aiFallbackClient =
  BACKEND_MODE === 'hybrid' && AI_FALLBACK_URL !== AI_BASE_URL
    ? createClient(AI_FALLBACK_URL, 15000)
    : null

export default apiClient
