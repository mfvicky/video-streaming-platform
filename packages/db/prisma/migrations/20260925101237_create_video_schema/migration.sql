-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "rawPath" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_creatorId_idx" ON "Video"("creatorId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
