-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "guestEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'taslak',
    "paymentStatus" TEXT NOT NULL DEFAULT 'bekliyor',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'hazırlanmadı',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "itemsSubtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "discountTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "taxTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "grandTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "refundedTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "billingAddress" JSONB NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "couponCode" TEXT,
    "couponSnapshot" JSONB,
    "surchargeMinor" INTEGER NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "shippingMethod" JSONB,
    "idempotencyKey" TEXT,
    "customerNote" TEXT,
    "adminNote" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consents" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "version" INTEGER NOT NULL DEFAULT 0,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "cancelledAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("adminNote", "billingAddress", "cancelledAt", "completedAt", "consents", "couponCode", "couponSnapshot", "createdAt", "currency", "customerId", "customerNote", "discountTotalMinor", "fulfillmentStatus", "grandTotalMinor", "guestEmail", "id", "ipAddress", "itemsSubtotalMinor", "orderNumber", "paidAt", "paymentStatus", "placedAt", "refundedTotalMinor", "shippingAddress", "shippingTotalMinor", "source", "status", "taxTotalMinor", "updatedAt", "userAgent", "version") SELECT "adminNote", "billingAddress", "cancelledAt", "completedAt", "consents", "couponCode", "couponSnapshot", "createdAt", "currency", "customerId", "customerNote", "discountTotalMinor", "fulfillmentStatus", "grandTotalMinor", "guestEmail", "id", "ipAddress", "itemsSubtotalMinor", "orderNumber", "paidAt", "paymentStatus", "placedAt", "refundedTotalMinor", "shippingAddress", "shippingTotalMinor", "source", "status", "taxTotalMinor", "updatedAt", "userAgent", "version" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_guestEmail_idx" ON "Order"("guestEmail");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
