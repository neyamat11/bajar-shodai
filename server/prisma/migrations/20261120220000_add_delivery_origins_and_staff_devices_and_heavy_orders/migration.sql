-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "extraDeliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "heavyOrderNote" TEXT,
ADD COLUMN     "isHeavyOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originPointId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryOrigin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffDevice_pushToken_key" ON "StaffDevice"("pushToken");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_originPointId_fkey" FOREIGN KEY ("originPointId") REFERENCES "DeliveryOrigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDevice" ADD CONSTRAINT "StaffDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default origin: Kalibari, Shahrasti
INSERT INTO "DeliveryOrigin" ("id", "name", "nameBn", "latitude", "longitude", "isDefault", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Kalibari, Shahrasti', 'কালীবাড়ি, শাহরাস্তি', 23.1017, 91.0918, true, true, NOW(), NOW());
