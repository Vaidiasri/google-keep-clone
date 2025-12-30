// Prisma Client import kar rahe hain
import { PrismaClient } from '@prisma/client'

// Global object ko type-safe banane ke liye
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Prisma client ka singleton instance
// Agar pehle se global mein hai to wohi use karo, nahi to naya banao
export const prisma = globalForPrisma.prisma || new PrismaClient()

// Development mein global object mein save kar do
// Isse hot-reload par naye instances nahi banenge (memory leak nahi hoga)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Default export
export default prisma
