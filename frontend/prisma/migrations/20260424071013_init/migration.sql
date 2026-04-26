-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "platformAccess" TEXT[] DEFAULT ARRAY['ai-automation']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "title" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "linkedinUrl" TEXT,
    "score" INTEGER,
    "icpLabel" TEXT,
    "companyBio" TEXT,
    "automationOpportunity" TEXT,
    "leadContext" TEXT,
    "outreachLine" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "outreachStatus" TEXT,
    "needSignals" TEXT,
    "contactStatus" TEXT DEFAULT 'never',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "score" INTEGER,
    "icpLabel" TEXT,
    "companyBio" TEXT,
    "campaignIdea" TEXT,
    "contentAngle" TEXT,
    "adCopy" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "linkedinUrl" TEXT,
    "needSignals" TEXT,
    "contactStatus" TEXT DEFAULT 'never',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "score" INTEGER,
    "icpLabel" TEXT,
    "companyBio" TEXT,
    "painPoint" TEXT,
    "salesPitch" TEXT,
    "proposalSummary" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "linkedinUrl" TEXT,
    "needSignals" TEXT,
    "contactStatus" TEXT DEFAULT 'never',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
