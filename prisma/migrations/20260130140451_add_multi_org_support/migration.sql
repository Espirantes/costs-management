-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "CostEntry_year_month_costItemId_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "CostEntry" ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

-- Data Migration: Create default organization and shops
DO $$
DECLARE
  org_id TEXT;
  shop_cz_id TEXT;
  shop_sk_id TEXT;
  shop_pl_id TEXT;
  shop_at_id TEXT;
BEGIN
  -- Generate CUID-like IDs (using simple UUID for now)
  org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');
  shop_cz_id := 'shop_' || replace(gen_random_uuid()::text, '-', '');
  shop_sk_id := 'shop_' || replace(gen_random_uuid()::text, '-', '');
  shop_pl_id := 'shop_' || replace(gen_random_uuid()::text, '-', '');
  shop_at_id := 'shop_' || replace(gen_random_uuid()::text, '-', '');

  -- Insert default organization
  INSERT INTO "Organization" (id, name, "createdAt", "updatedAt")
  VALUES (org_id, 'Online Empire', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  -- Insert initial shops (CZ, SK, PL, AT)
  INSERT INTO "Shop" (id, name, "organizationId", "sortOrder", "createdAt", "updatedAt")
  VALUES
    (shop_cz_id, 'CZ', org_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (shop_sk_id, 'SK', org_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (shop_pl_id, 'PL', org_id, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (shop_at_id, 'AT', org_id, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  -- Migrate all existing categories to organization-level (shopId = NULL)
  UPDATE "Category" SET "organizationId" = org_id WHERE "organizationId" IS NULL;

  -- Migrate all existing cost entries to CZ shop (default)
  UPDATE "CostEntry" SET "shopId" = shop_cz_id WHERE "shopId" IS NULL;

  -- Add all existing users to the organization
  INSERT INTO "OrganizationUser" (id, "userId", "organizationId", role, "createdAt", "updatedAt")
  SELECT
    'orguser_' || replace(gen_random_uuid()::text, '-', ''),
    u.id,
    org_id,
    CASE
      WHEN u.role = 'ADMIN' THEN 'OWNER'::"OrgRole"
      ELSE 'MEMBER'::"OrgRole"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "User" u;

  -- Update audit logs with organization context
  UPDATE "AuditLog" SET "organizationId" = org_id WHERE "organizationId" IS NULL;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Shop_organizationId_idx" ON "Shop"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_organizationId_name_key" ON "Shop"("organizationId", "name");

-- CreateIndex
CREATE INDEX "OrganizationUser_userId_idx" ON "OrganizationUser"("userId");

-- CreateIndex
CREATE INDEX "OrganizationUser_organizationId_idx" ON "OrganizationUser"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUser_userId_organizationId_key" ON "OrganizationUser"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Category_organizationId_idx" ON "Category"("organizationId");

-- CreateIndex
CREATE INDEX "Category_shopId_idx" ON "Category"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_name_shopId_key" ON "Category"("organizationId", "name", "shopId");

-- CreateIndex
CREATE INDEX "CostEntry_shopId_idx" ON "CostEntry"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "CostEntry_year_month_shopId_costItemId_key" ON "CostEntry"("year", "month", "shopId", "costItemId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make organizationId and shopId required after data migration
ALTER TABLE "Category" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CostEntry" ALTER COLUMN "shopId" SET NOT NULL;

