/*
  Warnings:

  - You are about to drop the `BusinessInfo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "buyerRegister" DROP CONSTRAINT "buyerRegister_businessInfoId_fkey";

-- DropTable
DROP TABLE "BusinessInfo";

-- CreateTable
CREATE TABLE "businessInfo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "businessLogo" TEXT,
    "tradeLicense" TEXT,
    "userNationalId" TEXT,

    CONSTRAINT "businessInfo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "buyerRegister" ADD CONSTRAINT "buyerRegister_businessInfoId_fkey" FOREIGN KEY ("businessInfoId") REFERENCES "businessInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
