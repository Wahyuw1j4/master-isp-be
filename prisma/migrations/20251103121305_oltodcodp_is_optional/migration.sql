-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_odc_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_odp_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_olt_id_fkey";

-- AlterTable
ALTER TABLE "public"."subscriptions" ALTER COLUMN "odc_id" DROP NOT NULL,
ALTER COLUMN "olt_id" DROP NOT NULL,
ALTER COLUMN "odp_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_odc_id_fkey" FOREIGN KEY ("odc_id") REFERENCES "public"."odc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_odp_id_fkey" FOREIGN KEY ("odp_id") REFERENCES "public"."odp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
