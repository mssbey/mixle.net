-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "store" TEXT NOT NULL DEFAULT 'mixle',
    "variantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAlert_store_notifiedAt_idx" ON "StockAlert"("store", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockAlert_variantId_email_key" ON "StockAlert"("variantId", "email");

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
