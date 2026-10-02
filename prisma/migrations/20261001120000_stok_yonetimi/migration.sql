-- Stok Yönetimi: varyant bazında stok takibi / elle stok durumu / ağırlık,
-- ürün bazında kargo sınıfı.
ALTER TABLE "Variant" ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Variant" ADD COLUMN "inStock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Variant" ADD COLUMN "weightGrams" INTEGER;
ALTER TABLE "Product" ADD COLUMN "shippingClass" TEXT NOT NULL DEFAULT '';
