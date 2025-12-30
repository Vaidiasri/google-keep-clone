// Axios import kar rahe hain (HTTP requests ke liye)
import axios from 'axios'
// API config import kar rahe hain
import { API_BASE_URL } from '../config/api.config'

// Axios instance bana rahe hain with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,  // Base URL set kar diya
  headers: {
    'Content-Type': 'application/json',  // JSON data bhejenge
  },
  timeout: 10000,  // 10 seconds timeout (agar response nahi aaya to error)
})

// Request interceptor - Har request se pehle ye chalega
apiClient.interceptors.request.use(
  (config) => {
    // Yaha par authentication token add kar sakte ho future mein
     const token = localStorage.getItem('token')
     if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    
    console.log(' API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    // Request error handle karo
    console.error(' Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Har response ke baad ye chalega
apiClient.interceptors.response.use(
  (response) => {
    // Successful response
    console.log(' API Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    // Error response handle karo
    console.error(' API Error:', error.response?.status, error.config?.url)
    
    // Different error status codes ke liye different handling
    if (error.response) {
      switch (error.response.status) {
        case 400:
          console.error('Bad Request:', error.response.data)
          break
        case 404:
          console.error('Not Found:', error.response.data)
          break
        case 500:
          console.error('Server Error:', error.response.data)
          break
        default:
          console.error('Error:', error.response.data)
      }
    } else if (error.request) {
      // Request bheja gaya lekin response nahi aaya
      console.error('No response received from server')
    } else {
      // Request setup mein hi error aa gaya
      console.error('Error setting up request:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// Axios instance export kar rahe hain
export default apiClient
