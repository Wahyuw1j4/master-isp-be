/*
  Warnings:

  - You are about to alter the column `total_invoice` on the `invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `tax` on the `invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `grand_total` on the `invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `payment_amount` on the `invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Made the column `tax` on table `invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."invoice" ALTER COLUMN "total_invoice" SET DEFAULT 0,
ALTER COLUMN "total_invoice" SET DATA TYPE INTEGER,
ALTER COLUMN "tax" SET NOT NULL,
ALTER COLUMN "tax" SET DEFAULT 0,
ALTER COLUMN "tax" SET DATA TYPE INTEGER,
ALTER COLUMN "grand_total" SET DEFAULT 0,
ALTER COLUMN "grand_total" SET DATA TYPE INTEGER,
ALTER COLUMN "payment_amount" SET DATA TYPE INTEGER;
