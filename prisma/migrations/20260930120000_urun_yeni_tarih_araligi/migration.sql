-- Ürünün "Yeni" damgası için tarih aralığı (ikisi de boşsa süresiz).
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "newFrom" TIMESTAMP(3),
ADD COLUMN "newUntil" TIMESTAMP(3);
