import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/authService'
import { LoginRequest, RegisterRequest } from '../types/auth.type'

const authService = new AuthService()

export class AuthController {
  
  // POST /register
  async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ) {
    try {
      const user = await authService.register(request.body)
      
      // Token generation (controller handles this as it's part of the response mechanism usually, or service can do it)
      // Here using fastify instance attached to request for jwt signing if available, 
      // but standard pattern usually puts token generation in controller or service.
      // Since fastify-jwt is a plugin, 'server.jwt.sign' is available on the request.server or request.jwt
      const token = request.server.jwt.sign({ id: user.id, email: user.email })

      return reply.status(201).send({ token, user: { id: user.id, email: user.email, name: user.name } })
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return reply.status(400).send({ error: error.message })
      }
      console.error('Register Error:', error) // Log actual error
      return reply.status(500).send({ error: 'Registration failed' })
    }
  }

  // POST /login
  async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) {
    try {
      const user = await authService.login(request.body)
      const token = request.server.jwt.sign({ id: user.id, email: user.email })
      return reply.send({ token, user: { id: user.id, email: user.email, name: user.name } })
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        return reply.status(401).send({ error: error.message })
      }
      console.error('Login Error:', error) // Log actual error
      return reply.status(500).send({ error: 'Login failed' })
    }
  }
}
