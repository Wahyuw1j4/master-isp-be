-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "kabupaten_kota" TEXT,
ADD COLUMN     "kecamatan" TEXT,
ADD COLUMN     "kelurahan" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "province" TEXT;
