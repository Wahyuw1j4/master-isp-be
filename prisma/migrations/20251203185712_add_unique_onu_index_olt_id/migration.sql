/*
  Warnings:

  - A unique constraint covering the columns `[onu_index,olt_id]` on the table `uncfg_c320` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uncfg_c320_onu_index_olt_id_key" ON "public"."uncfg_c320"("onu_index", "olt_id");
