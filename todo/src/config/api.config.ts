// API Configuration - Sare API URLs yaha centralized hain
// Environment variables se BASE_URL le rahe hain, agar nahi hai to localhost use karenge

// Backend Selector Flag
// false = Node.js (Fastify) running on port 8080
// true = Python (FastAPI) running on port 8000
export const USE_FASTAPI = true; // Default to Python Backend for this workspace

// Backend ka base URL logic
// Agar USE_FASTAPI true hai to Python URL, nahi to Node URL
// Environment variables config se le rahe hain
const NODE_URL = import.meta.env.VITE_API_URL_NODE || 'http://localhost:8080';
const PYTHON_URL = import.meta.env.VITE_API_URL_PYTHON || 'http://localhost:8000';

const DEFAULT_URL = USE_FASTAPI ? PYTHON_URL : NODE_URL;
export const API_BASE_URL = DEFAULT_URL;

// Sare API endpoints ek jagah define kiye hain
export const API_ENDPOINTS = {
  // Health check endpoint
  PING: '/ping',
  
  // Todo endpoints
  TODOS: {
    GET_ALL: '/todos',           // Sare todos get karne ke liye
    CREATE: '/todos',            // Naya todo create karne ke liye
    UPDATE: (id: number) => `/todos/${id}`,  // Todo update karne ke liye
    DELETE: (id: number) => `/todos/${id}`,  // Todo delete karne ke liye
  }
}
