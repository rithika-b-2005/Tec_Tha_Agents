-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT,
    "voiceText" TEXT,
    "style" TEXT NOT NULL DEFAULT 'cinematic',
    "duration" INTEGER NOT NULL DEFAULT 3,
    "voiceId" TEXT NOT NULL DEFAULT '21m00Tcm4TlvDq8ikWAM',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "replicateId" TEXT,
    "videoUrl" TEXT,
    "audioPath" TEXT,
    "finalPath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);
