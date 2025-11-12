-- AddForeignKey
ALTER TABLE "public"."ticket_subscription" ADD CONSTRAINT "ticket_subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
