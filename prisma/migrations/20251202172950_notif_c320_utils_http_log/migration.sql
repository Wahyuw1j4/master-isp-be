-- CreateTable
CREATE TABLE "public"."notification" (
    "id" TEXT NOT NULL,
    "notif_id" TEXT NOT NULL,
    "loading" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vlan_c320" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "profile_name" TEXT NOT NULL,
    "tag_mode" TEXT NOT NULL,
    "vlan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vlan_c320_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tcont_c320" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "profile_name" TEXT NOT NULL,
    "fbw" INTEGER NOT NULL,
    "abw" INTEGER NOT NULL,
    "mbw" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tcont_c320_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."traffic_c320" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "profile_name" TEXT NOT NULL,
    "sir" INTEGER NOT NULL,
    "pir" INTEGER NOT NULL,
    "cbs" TEXT NOT NULL,
    "pbs" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traffic_c320_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."http_log" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "body" TEXT,
    "response" TEXT,
    "status" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "http_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."vlan_c320" ADD CONSTRAINT "vlan_c320_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tcont_c320" ADD CONSTRAINT "tcont_c320_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."traffic_c320" ADD CONSTRAINT "traffic_c320_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
