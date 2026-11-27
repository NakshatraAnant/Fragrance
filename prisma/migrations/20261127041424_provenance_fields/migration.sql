/*
  Warnings:

  - Added the required column `subtitle` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveredAt" DATETIME;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "sourceName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "collectionId" TEXT,
    "categoryId" TEXT NOT NULL,
    "conceptId" TEXT,
    "format" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "moods" TEXT NOT NULL DEFAULT '',
    "occasions" TEXT NOT NULL DEFAULT '',
    "seasons" TEXT NOT NULL DEFAULT '',
    "intensity" TEXT NOT NULL DEFAULT 'MODERATE',
    "gender" TEXT,
    "giftSuitability" TEXT,
    "replenishment" TEXT,
    "channels" TEXT NOT NULL DEFAULT '',
    "isDiscoverySet" BOOLEAN NOT NULL DEFAULT false,
    "isGiftSet" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "merchRank" INTEGER NOT NULL DEFAULT 100,
    "nameStatus" TEXT NOT NULL DEFAULT 'WORKING_NAME',
    "claimsStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "longevityNote" TEXT,
    "projectionNote" TEXT,
    "ingredientsDeclaration" TEXT,
    "allergenDeclaration" TEXT,
    "regulatoryNotes" TEXT,
    "contentsNote" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "sourceRef" TEXT,
    "launchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "ScentConcept" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("allergenDeclaration", "brandId", "categoryId", "channels", "claimsStatus", "collectionId", "conceptId", "contentsNote", "createdAt", "deletedAt", "description", "format", "gender", "giftSuitability", "id", "ingredientsDeclaration", "intensity", "isDiscoverySet", "isFeatured", "isGiftSet", "isNew", "launchedAt", "longevityNote", "merchRank", "moods", "name", "nameStatus", "occasions", "projectionNote", "regulatoryNotes", "replenishment", "seasons", "seoDescription", "seoTitle", "shortDescription", "slug", "sourceRef", "status", "updatedAt") SELECT "allergenDeclaration", "brandId", "categoryId", "channels", "claimsStatus", "collectionId", "conceptId", "contentsNote", "createdAt", "deletedAt", "description", "format", "gender", "giftSuitability", "id", "ingredientsDeclaration", "intensity", "isDiscoverySet", "isFeatured", "isGiftSet", "isNew", "launchedAt", "longevityNote", "merchRank", "moods", "name", "nameStatus", "occasions", "projectionNote", "regulatoryNotes", "replenishment", "seasons", "seoDescription", "seoTitle", "shortDescription", "slug", "sourceRef", "status", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_brandId_status_idx" ON "Product"("brandId", "status");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_conceptId_idx" ON "Product"("conceptId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
