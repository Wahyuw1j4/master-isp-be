-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "is_static_ip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "odp_distance" INTEGER,
ADD COLUMN     "pppoe_password" TEXT,
ADD COLUMN     "pppoe_username" TEXT;

-- CreateIndex
CREATE INDEX "subscriptions_created_by_idx" ON "public"."subscriptions"("created_by");
