-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "onu_number" INTEGER,
ADD COLUMN     "traffic_profile" TEXT,
ADD COLUMN     "vlan" INTEGER,
ADD COLUMN     "vlan_profile" TEXT;
