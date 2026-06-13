import { PrismaClient } from '@prisma/client'

/** Applies admin schema changes idempotently (safe on every startup). */
export async function ensureAdminSchema(): Promise<void> {
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserGroup" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT NOT NULL DEFAULT '#6366f1',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserGroup_name_key" ON "UserGroup"("name");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserGroupMember" (
        "userId" INTEGER NOT NULL,
        "groupId" INTEGER NOT NULL,
        CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("userId", "groupId")
      );
    `)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_groupId_fkey"
          FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)

    console.log('✅ Admin schema verified (role, groups)')
  } catch (err) {
    console.error('⚠️ Admin schema bootstrap failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}
