-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "metaData" JSONB;

-- CreateTable
CREATE TABLE "public"."ticket_subscription" (
    "ticket_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "customer_id" TEXT,
    "subject_problem" TEXT NOT NULL,
    "customer_report" TEXT,
    "technician_update_desc" TEXT,
    "work_by" TEXT,
    "open_by" TEXT,
    "open_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "ticket_close_date" TIMESTAMP(3),
    "status" TEXT DEFAULT 'open',
    "picture_from_customer" TEXT,
    "picture_from_technician" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submit_by" TEXT,
    "handle_by_team" TEXT,

    CONSTRAINT "ticket_subscription_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "public"."ticket_site" (
    "mt_site_id" TEXT NOT NULL,
    "site_type" TEXT,
    "problem_report" TEXT NOT NULL,
    "problem_picture" TEXT,
    "solve_picture" TEXT,
    "status" TEXT DEFAULT 'open',
    "solved_at" TIMESTAMP(3),
    "submit_by" TEXT,
    "handle_by_team" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_site_pkey" PRIMARY KEY ("mt_site_id")
);

-- CreateTable
CREATE TABLE "public"."ticket_site_detail" (
    "maintenance_site_detail_id" TEXT NOT NULL,
    "mt_site_id" TEXT,
    "site_id" TEXT NOT NULL,
    "solved_picture" TEXT,
    "technician_report" TEXT,
    "solved_at" TIMESTAMP(3),
    "solved_by" TEXT,
    "status" TEXT DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_site_detail_pkey" PRIMARY KEY ("maintenance_site_detail_id")
);

-- CreateIndex
CREATE INDEX "ticket_subscription_subscription_id_idx" ON "public"."ticket_subscription"("subscription_id");

-- CreateIndex
CREATE INDEX "ticket_subscription_customer_id_idx" ON "public"."ticket_subscription"("customer_id");

-- CreateIndex
CREATE INDEX "ticket_subscription_created_by_idx" ON "public"."ticket_subscription"("created_by");

-- CreateIndex
CREATE INDEX "ticket_subscription_submit_by_idx" ON "public"."ticket_subscription"("submit_by");

-- CreateIndex
CREATE INDEX "ticket_subscription_handle_by_team_idx" ON "public"."ticket_subscription"("handle_by_team");

-- CreateIndex
CREATE INDEX "ticket_site_mt_site_id_idx" ON "public"."ticket_site"("mt_site_id");

-- CreateIndex
CREATE INDEX "ticket_site_created_by_idx" ON "public"."ticket_site"("created_by");

-- CreateIndex
CREATE INDEX "ticket_site_detail_mt_site_id_idx" ON "public"."ticket_site_detail"("mt_site_id");

-- CreateIndex
CREATE INDEX "ticket_site_detail_site_id_idx" ON "public"."ticket_site_detail"("site_id");

-- CreateIndex
CREATE INDEX "ticket_site_detail_solved_by_idx" ON "public"."ticket_site_detail"("solved_by");

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_submit_by_fkey" FOREIGN KEY ("submit_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_work_by_fkey" FOREIGN KEY ("work_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site" ADD CONSTRAINT "ticket_site_submit_by_fkey" FOREIGN KEY ("submit_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site" ADD CONSTRAINT "ticket_site_handle_by_team_fkey" FOREIGN KEY ("handle_by_team") REFERENCES "public"."technitian_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site_detail" ADD CONSTRAINT "ticket_site_detail_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."ticket_site"("mt_site_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site_detail" ADD CONSTRAINT "ticket_site_detail_solved_by_fkey" FOREIGN KEY ("solved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
