-- DropForeignKey
ALTER TABLE "public"."invoice_detail" DROP CONSTRAINT "invoice_detail_invoice_no_fkey";

-- AddForeignKey
ALTER TABLE "public"."invoice_detail" ADD CONSTRAINT "invoice_detail_invoice_no_fkey" FOREIGN KEY ("invoice_no") REFERENCES "public"."invoice"("invoice_no") ON DELETE CASCADE ON UPDATE CASCADE;
