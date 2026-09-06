/*
  Warnings:

  - Added the required column `localId` to the `OptionValue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localId` to the `ProductOption` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OptionValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OptionValue" ("id", "label", "optionId", "position") SELECT "id", "label", "optionId", "position" FROM "OptionValue";
DROP TABLE "OptionValue";
ALTER TABLE "new_OptionValue" RENAME TO "OptionValue";
CREATE INDEX "OptionValue_optionId_position_idx" ON "OptionValue"("optionId", "position");
CREATE UNIQUE INDEX "OptionValue_optionId_localId_key" ON "OptionValue"("optionId", "localId");
CREATE TABLE "new_ProductOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductOption" ("id", "name", "position", "productId") SELECT "id", "name", "position", "productId" FROM "ProductOption";
DROP TABLE "ProductOption";
ALTER TABLE "new_ProductOption" RENAME TO "ProductOption";
CREATE INDEX "ProductOption_productId_position_idx" ON "ProductOption"("productId", "position");
CREATE UNIQUE INDEX "ProductOption_productId_localId_key" ON "ProductOption"("productId", "localId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
