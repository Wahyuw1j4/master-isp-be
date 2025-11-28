/*
  Warnings:

  - Added the required column `from_jid` to the `whatsapp_message_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message_type` to the `whatsapp_message_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_jid` to the `whatsapp_message_log` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `direction` on the `whatsapp_message_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."WhatsappDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "public"."WhatsappMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'CONTACT', 'LOCATION', 'BUTTON', 'OTHER');

-- AlterTable
ALTER TABLE "public"."whatsapp_message_log" ADD COLUMN     "from_jid" TEXT NOT NULL,
ADD COLUMN     "from_number" TEXT,
ADD COLUMN     "message_type" "public"."WhatsappMessageType" NOT NULL,
ADD COLUMN     "to_jid" TEXT NOT NULL,
ADD COLUMN     "to_number" TEXT,
DROP COLUMN "direction",
ADD COLUMN     "direction" "public"."WhatsappDirection" NOT NULL;

-- CreateIndex
CREATE INDEX "whatsapp_message_log_from_number_idx" ON "public"."whatsapp_message_log"("from_number");

-- CreateIndex
CREATE INDEX "whatsapp_message_log_to_number_idx" ON "public"."whatsapp_message_log"("to_number");
