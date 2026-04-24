-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "formattedBody" TEXT,
    "platform" TEXT NOT NULL,
    "industry" TEXT,
    "brandName" TEXT,
    "keywords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "images" TEXT,
    "metadata" TEXT,
    "complianceScore" INTEGER DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specs" TEXT,
    "tags" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "competitors" TEXT,
    "interval" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitorTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "recommendCount" INTEGER NOT NULL DEFAULT 0,
    "rankPosition" INTEGER,
    "sentiment" TEXT,
    "isMentioned" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "topContent" TEXT,
    "trend" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'all',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" INTEGER,
    "engagement" DOUBLE PRECISION,
    "roi" DOUBLE PRECISION,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT,
    "contentPillars" TEXT,
    "platforms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyPhase" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "platforms" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyKol" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "actualReach" INTEGER,
    "engagement" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyKol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "coverUrl" TEXT,
    "duration" INTEGER,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "competitors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "overallScore" INTEGER,
    "dimensions" TEXT,
    "summary" TEXT,
    "suggestions" TEXT,
    "keywordDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GeoReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeEntry_userId_category_idx" ON "KnowledgeEntry"("userId", "category");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_userId_brand_idx" ON "KnowledgeEntry"("userId", "brand");

-- CreateIndex
CREATE INDEX "MonitorRecord_taskId_platform_idx" ON "MonitorRecord"("taskId", "platform");

-- CreateIndex
CREATE INDEX "MonitorRecord_taskId_createdAt_idx" ON "MonitorRecord"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Strategy_userId_status_idx" ON "Strategy"("userId", "status");

-- CreateIndex
CREATE INDEX "VideoAsset_userId_platform_idx" ON "VideoAsset"("userId", "platform");

-- CreateIndex
CREATE INDEX "VideoAsset_userId_status_idx" ON "VideoAsset"("userId", "status");

-- CreateIndex
CREATE INDEX "GeoReport_userId_createdAt_idx" ON "GeoReport"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorTask" ADD CONSTRAINT "MonitorTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorRecord" ADD CONSTRAINT "MonitorRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MonitorTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyPhase" ADD CONSTRAINT "StrategyPhase_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyKol" ADD CONSTRAINT "StrategyKol_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoReport" ADD CONSTRAINT "GeoReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
