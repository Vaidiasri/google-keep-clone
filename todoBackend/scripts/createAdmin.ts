/**
 * Create or update an admin user in the Fastify (Prisma) database.
 *
 * Usage:
 *   npx ts-node scripts/createAdmin.ts
 *   npx ts-node scripts/createAdmin.ts admin@test.com mypassword
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] ?? 'admin@test.com'
  const password = process.argv[3] ?? 'admin123'
  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: 'ADMIN', mfa_enabled: false },
    create: {
      email,
      password: hashed,
      name: 'Admin',
      role: 'ADMIN',
      mfa_enabled: false,
    },
  })

  console.log('\n' + '='.repeat(50))
  console.log('ADMIN USER READY')
  console.log('='.repeat(50))
  console.log(`Email:    ${user.email}`)
  console.log(`Password: ${password}`)
  console.log(`Role:     ${user.role}`)
  console.log('='.repeat(50))
  console.log('\nLog in at http://localhost:5173/login')
  console.log('Then open Manage Users from the sidebar or go to /admin\n')
}

main()
  .catch((err) => {
    console.error('Failed:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
