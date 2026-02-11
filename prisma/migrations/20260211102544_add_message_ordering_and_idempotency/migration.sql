/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sentAt` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "sentAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'SENT';

-- CreateIndex
CREATE UNIQUE INDEX "Message_clientId_key" ON "Message"("clientId");

-- CreateIndex
CREATE INDEX "Message_serverId_sentAt_sequence_idx" ON "Message"("serverId", "sentAt", "sequence");

-- CreateIndex
CREATE INDEX "Message_clientId_idx" ON "Message"("clientId");
