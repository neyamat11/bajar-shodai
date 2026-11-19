-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MedicineType" AS ENUM ('OTC', 'PRESCRIPTION_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MedicineMeta" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "genericSlug" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "type" "MedicineType" NOT NULL DEFAULT 'OTC',
    "unitsPerStrip" INTEGER NOT NULL DEFAULT 10,
    "medexUrl" TEXT,
    "medexId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "mrpUnit" DECIMAL(10,2),
    "mrpStrip" DECIMAL(10,2),
    "mrpBox" DECIMAL(10,2),
    "packSizeInfo" TEXT,
    "discountMode" TEXT NOT NULL DEFAULT 'GLOBAL',
    "discountValue" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MedicineMeta_productId_key" ON "MedicineMeta"("productId");
CREATE INDEX IF NOT EXISTS "MedicineMeta_genericName_idx" ON "MedicineMeta"("genericName");
CREATE INDEX IF NOT EXISTS "MedicineMeta_genericSlug_idx" ON "MedicineMeta"("genericSlug");
CREATE INDEX IF NOT EXISTS "MedicineMeta_manufacturer_idx" ON "MedicineMeta"("manufacturer");
CREATE INDEX IF NOT EXISTS "MedicineMeta_dosageForm_idx" ON "MedicineMeta"("dosageForm");
CREATE INDEX IF NOT EXISTS "MedicineMeta_type_idx" ON "MedicineMeta"("type");
CREATE INDEX IF NOT EXISTS "MedicineMeta_discountMode_idx" ON "MedicineMeta"("discountMode");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MedicineMeta" ADD CONSTRAINT "MedicineMeta_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
