-- UserGroup tables
CREATE TABLE IF NOT EXISTS "UserGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserGroup_name_key" ON "UserGroup"("name");

CREATE TABLE IF NOT EXISTS "UserGroupMember" (
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("userId", "groupId")
);

ALTER TABLE "UserGroupMember" DROP CONSTRAINT IF EXISTS "UserGroupMember_userId_fkey";
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGroupMember" DROP CONSTRAINT IF EXISTS "UserGroupMember_groupId_fkey";
ALTER TABLE "UserGroupMember" ADD CONSTRAINT "UserGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
