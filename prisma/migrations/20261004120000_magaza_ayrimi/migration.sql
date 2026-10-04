-- DropIndex
DROP INDEX "Coupon_code_key";

-- DropIndex
DROP INDEX "Customer_email_key";

-- DropIndex
DROP INDEX "LegalDocument_kind_publishedAt_idx";

-- DropIndex
DROP INDEX "LegalDocument_kind_version_key";

-- DropIndex
DROP INDEX "NewsletterSubscriber_email_key";

-- DropIndex
DROP INDEX "SmsSubscriber_phone_key";

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "DiscountRule" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "LegalDocument" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "ProductTrash" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "ShippingZone" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- AlterTable
ALTER TABLE "SmsSubscriber" ADD COLUMN     "store" TEXT NOT NULL DEFAULT 'mixle';

-- CreateIndex
CREATE INDEX "Cart_store_idx" ON "Cart"("store");

-- CreateIndex
CREATE INDEX "Category_store_idx" ON "Category"("store");

-- CreateIndex
CREATE INDEX "Collection_store_idx" ON "Collection"("store");

-- CreateIndex
CREATE INDEX "Coupon_store_idx" ON "Coupon"("store");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_store_code_key" ON "Coupon"("store", "code");

-- CreateIndex
CREATE INDEX "Customer_store_idx" ON "Customer"("store");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_store_email_key" ON "Customer"("store", "email");

-- CreateIndex
CREATE INDEX "DiscountRule_store_idx" ON "DiscountRule"("store");

-- CreateIndex
CREATE INDEX "LegalDocument_store_kind_publishedAt_idx" ON "LegalDocument"("store", "kind", "publishedAt");

-- CreateIndex
CREATE INDEX "LegalDocument_store_idx" ON "LegalDocument"("store");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_store_kind_version_key" ON "LegalDocument"("store", "kind", "version");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_store_idx" ON "NewsletterSubscriber"("store");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_store_email_key" ON "NewsletterSubscriber"("store", "email");

-- CreateIndex
CREATE INDEX "Order_store_idx" ON "Order"("store");

-- CreateIndex
CREATE INDEX "Page_store_idx" ON "Page"("store");

-- CreateIndex
CREATE INDEX "Product_store_idx" ON "Product"("store");

-- CreateIndex
CREATE INDEX "ProductTrash_store_idx" ON "ProductTrash"("store");

-- CreateIndex
CREATE INDEX "ShippingZone_store_idx" ON "ShippingZone"("store");

-- CreateIndex
CREATE INDEX "SmsSubscriber_store_idx" ON "SmsSubscriber"("store");

-- CreateIndex
CREATE UNIQUE INDEX "SmsSubscriber_store_phone_key" ON "SmsSubscriber"("store", "phone");

