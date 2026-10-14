-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "appleSub" TEXT,
ADD COLUMN     "consents" JSONB,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "googleSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_store_googleSub_key" ON "Customer"("store", "googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_store_appleSub_key" ON "Customer"("store", "appleSub");
