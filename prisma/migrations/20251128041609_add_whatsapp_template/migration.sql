-- CreateTable
CREATE TABLE "public"."whatsapp_template_variable" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_template" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "message_type" "public"."WhatsappMessageType" NOT NULL DEFAULT 'TEXT',
    "account_id" TEXT,
    "example_vars" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_template_variable_template_id_idx" ON "public"."whatsapp_template_variable"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_variable_template_id_key_key" ON "public"."whatsapp_template_variable"("template_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_code_key" ON "public"."whatsapp_template"("code");

-- CreateIndex
CREATE INDEX "whatsapp_template_account_id_idx" ON "public"."whatsapp_template"("account_id");

-- CreateIndex
CREATE INDEX "whatsapp_template_code_idx" ON "public"."whatsapp_template"("code");

-- AddForeignKey
ALTER TABLE "public"."whatsapp_template_variable" ADD CONSTRAINT "whatsapp_template_variable_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_template" ADD CONSTRAINT "whatsapp_template_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."whatsapp_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
