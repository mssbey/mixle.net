-- Ürün çöp kutusu: silinen ürünlerin geri yüklenebilir anlık görüntüsü.
-- CreateTable
CREATE TABLE "ProductTrash" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTrash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductTrash_deletedAt_idx" ON "ProductTrash"("deletedAt");
