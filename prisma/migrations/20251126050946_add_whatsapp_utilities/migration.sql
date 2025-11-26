-- CreateEnum
CREATE TYPE "public"."ScopeType" AS ENUM ('oidc', 'app');

-- CreateEnum
CREATE TYPE "public"."ScopeKind" AS ENUM ('scope', 'superScope');

-- CreateEnum
CREATE TYPE "public"."wa_session_status" AS ENUM ('CONNECTING', 'OPEN', 'CLOSED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "public"."wa_key_type" AS ENUM ('PREKEY', 'SESSION', 'SENDER_KEY', 'APP_STATE_SYNC', 'IDENTITY', 'OTHERS');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT,
    "metaData" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scopes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_scopes" (
    "roleId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,

    CONSTRAINT "role_scopes_pkey" PRIMARY KEY ("roleId","scopeId")
);

-- CreateTable
CREATE TABLE "public"."user_scopes" (
    "userId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,

    CONSTRAINT "user_scopes_pkey" PRIMARY KEY ("userId","scopeId")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "ktp_number" TEXT,
    "ktp_photo" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "province" TEXT,
    "kabupaten_kota" TEXT,
    "kecamatan" TEXT,
    "kelurahan" TEXT,
    "postal_code" TEXT,
    "oid_identifier" TEXT,
    "serial_number" TEXT,
    "mac_address" TEXT,
    "status" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "odc_id" TEXT,
    "olt_id" TEXT,
    "odp_id" TEXT,
    "is_static_ip" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "odp_distance" INTEGER,
    "pppoe_username" TEXT,
    "pppoe_password" TEXT,
    "home_photo" TEXT,
    "location_note" TEXT,
    "cpe_photo" TEXT,
    "speed_test_photo" TEXT,
    "form_installation" TEXT,
    "description" TEXT,
    "installation_date" TIMESTAMP(3),
    "installation_by_team_id" TEXT,
    "installation_by_user_id" TEXT,
    "created_by" TEXT,
    "next_invoice_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onus" (
    "id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "oid_identifier" TEXT NOT NULL,
    "serial" TEXT,
    "name" TEXT,
    "mac_address" TEXT,
    "description" TEXT,
    "onu_index" INTEGER,

    CONSTRAINT "onus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."snmp_values" (
    "id" TEXT NOT NULL,
    "onu_id" TEXT NOT NULL,
    "metric_key" TEXT NOT NULL,
    "oid" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snmp_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oid_map" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "metric_key" TEXT NOT NULL,
    "oid" TEXT NOT NULL,
    "values" JSONB,
    "formula" TEXT,

    CONSTRAINT "oid_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."olt" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "brand" VARCHAR(100),
    "type" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "read_community" VARCHAR(100),
    "write_community" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."odc" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "olt_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."odp" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "odc_id" TEXT NOT NULL,
    "olt_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fiber_route" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "polyline" JSONB[],
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiber_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "total_invoice" DOUBLE PRECISION NOT NULL,
    "has_tax" BOOLEAN NOT NULL DEFAULT false,
    "tax" DOUBLE PRECISION,
    "grand_total" DOUBLE PRECISION NOT NULL,
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "receive_by" TEXT,
    "approved_by" TEXT,
    "pg_id" TEXT,
    "pg_ref" TEXT,
    "pg_created" TIMESTAMP(3),
    "no_va" TEXT,
    "qris" TEXT,
    "payment_amount" DOUBLE PRECISION,
    "status" TEXT DEFAULT 'unpaid',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "payment_proof" TEXT,
    "last_invoice_sent_date" TIMESTAMP(3),
    "subscription_id" TEXT,
    "sku" TEXT,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_detail" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "invoice_no" TEXT NOT NULL,
    "status" TEXT,
    "index_month" INTEGER,
    "date" TIMESTAMP(3),
    "billing_name" TEXT NOT NULL,
    "billing_description" TEXT,
    "billing_price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_tenchnitian" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" VARCHAR(255),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_tenchnitian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technitian_team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "leader" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technitian_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technitian_team_member" (
    "member_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technitian_team_member_pkey" PRIMARY KEY ("member_id")
);

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
    "status" TEXT DEFAULT 'Open',
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
    "status" TEXT DEFAULT 'Open',
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

-- CreateTable
CREATE TABLE "public"."whatsapp_account" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "phone_number" TEXT,
    "is_business" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_session" (
    "id" TEXT NOT NULL,
    "account_id" TEXT,
    "name" TEXT NOT NULL,
    "status" "public"."wa_session_status" NOT NULL DEFAULT 'CONNECTING',
    "qr_raw" TEXT,
    "qr_updated_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3),
    "disconnected_at" TIMESTAMP(3),
    "last_conn_update_at" TIMESTAMP(3),
    "webhook_url" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_creds" (
    "session_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_creds_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_key" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "public"."wa_key_type" NOT NULL,
    "key_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" TEXT,

    CONSTRAINT "whatsapp_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_message_log" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "message_id" TEXT,
    "message" JSONB NOT NULL,
    "status" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scopes_name_key" ON "public"."scopes"("name");

-- CreateIndex
CREATE INDEX "role_scopes_roleId_idx" ON "public"."role_scopes"("roleId");

-- CreateIndex
CREATE INDEX "role_scopes_scopeId_idx" ON "public"."role_scopes"("scopeId");

-- CreateIndex
CREATE INDEX "user_scopes_userId_idx" ON "public"."user_scopes"("userId");

-- CreateIndex
CREATE INDEX "user_scopes_scopeId_idx" ON "public"."user_scopes"("scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sid_key" ON "public"."sessions"("sid");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_sid_idx" ON "public"."sessions"("sid");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_expiresAt_idx" ON "public"."sessions"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "public"."customers"("name");

-- CreateIndex
CREATE INDEX "services_name_idx" ON "public"."services"("name");

-- CreateIndex
CREATE INDEX "subscriptions_installation_by_team_id_idx" ON "public"."subscriptions"("installation_by_team_id");

-- CreateIndex
CREATE INDEX "subscriptions_installation_by_user_id_idx" ON "public"."subscriptions"("installation_by_user_id");

-- CreateIndex
CREATE INDEX "subscriptions_created_by_idx" ON "public"."subscriptions"("created_by");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_idx" ON "public"."subscriptions"("customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_service_id_idx" ON "public"."subscriptions"("service_id");

-- CreateIndex
CREATE INDEX "subscriptions_odc_id_idx" ON "public"."subscriptions"("odc_id");

-- CreateIndex
CREATE INDEX "subscriptions_olt_id_idx" ON "public"."subscriptions"("olt_id");

-- CreateIndex
CREATE INDEX "subscriptions_odp_id_idx" ON "public"."subscriptions"("odp_id");

-- CreateIndex
CREATE INDEX "onus_olt_id_idx" ON "public"."onus"("olt_id");

-- CreateIndex
CREATE INDEX "onus_subscription_id_idx" ON "public"."onus"("subscription_id");

-- CreateIndex
CREATE INDEX "onus_serial_idx" ON "public"."onus"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "onus_olt_id_oid_identifier_key" ON "public"."onus"("olt_id", "oid_identifier");

-- CreateIndex
CREATE INDEX "snmp_values_onu_id_metric_key_created_at_idx" ON "public"."snmp_values"("onu_id", "metric_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "snmp_values_onu_id_created_at_idx" ON "public"."snmp_values"("onu_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "snmp_values_onu_id_metric_key_key" ON "public"."snmp_values"("onu_id", "metric_key");

-- CreateIndex
CREATE UNIQUE INDEX "oid_map_profile_metric_key_key" ON "public"."oid_map"("profile", "metric_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_no_key" ON "public"."invoice"("invoice_no");

-- CreateIndex
CREATE INDEX "invoice_customer_id_idx" ON "public"."invoice"("customer_id");

-- CreateIndex
CREATE INDEX "invoice_subscription_id_idx" ON "public"."invoice"("subscription_id");

-- CreateIndex
CREATE INDEX "invoice_invoice_no_idx" ON "public"."invoice"("invoice_no");

-- CreateIndex
CREATE INDEX "invoice_detail_invoice_no_idx" ON "public"."invoice_detail"("invoice_no");

-- CreateIndex
CREATE INDEX "invoice_detail_subscription_id_idx" ON "public"."invoice_detail"("subscription_id");

-- CreateIndex
CREATE INDEX "invoice_detail_index_month_idx" ON "public"."invoice_detail"("index_month");

-- CreateIndex
CREATE INDEX "technitian_team_member_team_id_idx" ON "public"."technitian_team_member"("team_id");

-- CreateIndex
CREATE INDEX "technitian_team_member_user_id_idx" ON "public"."technitian_team_member"("user_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_account_phone_number_key" ON "public"."whatsapp_account"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_session_name_key" ON "public"."whatsapp_session"("name");

-- CreateIndex
CREATE INDEX "whatsapp_key_session_id_type_idx" ON "public"."whatsapp_key"("session_id", "type");

-- CreateIndex
CREATE INDEX "whatsapp_key_key_id_idx" ON "public"."whatsapp_key"("key_id");

-- CreateIndex
CREATE INDEX "whatsapp_key_scope_idx" ON "public"."whatsapp_key"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_key_session_id_type_key_id_scope_key" ON "public"."whatsapp_key"("session_id", "type", "key_id", "scope");

-- CreateIndex
CREATE INDEX "whatsapp_message_log_session_id_created_at_idx" ON "public"."whatsapp_message_log"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_message_log_jid_idx" ON "public"."whatsapp_message_log"("jid");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_scopes" ADD CONSTRAINT "role_scopes_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_scopes" ADD CONSTRAINT "role_scopes_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "public"."scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_scopes" ADD CONSTRAINT "user_scopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_scopes" ADD CONSTRAINT "user_scopes_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "public"."scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_odc_id_fkey" FOREIGN KEY ("odc_id") REFERENCES "public"."odc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_odp_id_fkey" FOREIGN KEY ("odp_id") REFERENCES "public"."odp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_installation_by_team_id_fkey" FOREIGN KEY ("installation_by_team_id") REFERENCES "public"."technitian_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_installation_by_user_id_fkey" FOREIGN KEY ("installation_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onus" ADD CONSTRAINT "onus_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onus" ADD CONSTRAINT "onus_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."snmp_values" ADD CONSTRAINT "snmp_values_onu_id_fkey" FOREIGN KEY ("onu_id") REFERENCES "public"."onus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."odc" ADD CONSTRAINT "odc_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."odp" ADD CONSTRAINT "odp_odc_id_fkey" FOREIGN KEY ("odc_id") REFERENCES "public"."odc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."odp" ADD CONSTRAINT "odp_olt_id_fkey" FOREIGN KEY ("olt_id") REFERENCES "public"."olt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_detail" ADD CONSTRAINT "invoice_detail_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_detail" ADD CONSTRAINT "invoice_detail_invoice_no_fkey" FOREIGN KEY ("invoice_no") REFERENCES "public"."invoice"("invoice_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technitian_team_member" ADD CONSTRAINT "technitian_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."technitian_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technitian_team_member" ADD CONSTRAINT "technitian_team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_submit_by_fkey" FOREIGN KEY ("submit_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_work_by_fkey" FOREIGN KEY ("work_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site" ADD CONSTRAINT "ticket_site_submit_by_fkey" FOREIGN KEY ("submit_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site" ADD CONSTRAINT "ticket_site_handle_by_team_fkey" FOREIGN KEY ("handle_by_team") REFERENCES "public"."technitian_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site_detail" ADD CONSTRAINT "ticket_site_detail_mt_site_id_fkey" FOREIGN KEY ("mt_site_id") REFERENCES "public"."ticket_site"("mt_site_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_site_detail" ADD CONSTRAINT "ticket_site_detail_solved_by_fkey" FOREIGN KEY ("solved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_session" ADD CONSTRAINT "whatsapp_session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."whatsapp_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_creds" ADD CONSTRAINT "whatsapp_creds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_key" ADD CONSTRAINT "whatsapp_key_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_message_log" ADD CONSTRAINT "whatsapp_message_log_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
