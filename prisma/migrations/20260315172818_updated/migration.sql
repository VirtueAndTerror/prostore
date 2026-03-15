-- AlterTable
ALTER TABLE "Cart" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '7 days';
