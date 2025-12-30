
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { RegisterRequest, LoginRequest } from '../types/auth.type'

const prisma = new PrismaClient()

export class AuthService {
  async register(data: RegisterRequest) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name
      }
    })

    return user
  }

  async login(data: LoginRequest) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.password)

    if (!validPassword) {
      throw new Error('Invalid email or password')
    }

    return user
  }
}
