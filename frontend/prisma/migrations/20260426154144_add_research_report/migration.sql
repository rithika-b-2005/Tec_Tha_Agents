-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "topic" TEXT,
    "region" TEXT NOT NULL DEFAULT 'Global',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sections" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);
