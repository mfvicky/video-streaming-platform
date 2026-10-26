-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "audioChannels" INTEGER,
ADD COLUMN     "bitrate" INTEGER,
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "fileSizeBytes" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "processingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingJobId" TEXT,
ADD COLUMN     "processingLeaseUntil" TIMESTAMP(3),
ADD COLUMN     "videoCodec" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE INDEX "Video_status_processingLeaseUntil_idx" ON "Video"("status", "processingLeaseUntil");
