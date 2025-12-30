import { FastifyInstance } from 'fastify'
import { AuthController } from '../controllers/authController'
import { registerSchema, loginSchema } from '../schemas/todoAuth'

const authController = new AuthController()

export default async function authRoutes(fastify: FastifyInstance) {
    // Register Route
    fastify.post('/register', { 
        schema: registerSchema 
    }, authController.register.bind(authController))

    // Login Route
    fastify.post('/login', { 
        schema: loginSchema 
    }, authController.login.bind(authController))
}