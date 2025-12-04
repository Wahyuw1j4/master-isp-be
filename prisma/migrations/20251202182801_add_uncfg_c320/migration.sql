/*
  Warnings:

  - Added the required column `notif_identifier` to the `notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."notification" ADD COLUMN     "notif_identifier" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."uncfg_c320" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "onu_index" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uncfg_c320_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."uncfg_c320" ADD CONSTRAINT "uncfg_c320_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
