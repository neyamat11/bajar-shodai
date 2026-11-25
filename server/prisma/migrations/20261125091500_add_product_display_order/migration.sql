-- AlterTable
ALTER TABLE "Product" ADD COLUMN "displayOrder" INTEGER;

-- CreateIndex
CREATE INDEX "Product_categoryId_displayOrder_idx" ON "Product"("categoryId", "displayOrder");

-- CreateIndex
CREATE INDEX "Product_displayOrder_idx" ON "Product"("displayOrder");
