-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Video_creatorId_status_createdAt_idx" ON "Video"("creatorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
