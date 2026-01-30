-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('ORGANIZATION', 'SHOP');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "scope" "CategoryScope" NOT NULL DEFAULT 'SHOP';

-- AlterTable
ALTER TABLE "CostEntry" ALTER COLUMN "shopId" DROP NOT NULL;
