-- Rename CategoryScope enum values: ORGANIZATION -> FIXED, SHOP -> VARIABLE
ALTER TYPE "CategoryScope" RENAME VALUE 'ORGANIZATION' TO 'FIXED';
ALTER TYPE "CategoryScope" RENAME VALUE 'SHOP' TO 'VARIABLE';

-- Update default value on Category table
ALTER TABLE "Category" ALTER COLUMN "scope" SET DEFAULT 'VARIABLE';
