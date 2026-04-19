-- Migration: Add user authentication system
-- This migration adds multi-tenant user support to the existing database
-- Run with: npx prisma migrate resolve --applied 20260418230000_add_user_auth

-- Step 1: Create system admin user (temporary for migration)
CREATE TABLE "_prisma_new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isBanned" INTEGER NOT NULL DEFAULT 0,
    "isEmailVerified" INTEGER NOT NULL DEFAULT 0,
    "emailVerifyToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Insert system user (temporary, will be replaced)
INSERT INTO "_prisma_new_User" ("id", "email", "password", "name", "role", "isBanned", "isEmailVerified", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'system@local', '$2a$12$placeholder', 'System', 'admin', 0, 1, datetime('now'), datetime('now'));

-- Step 2: Create UserSettings table
CREATE TABLE "_prisma_new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "logoUrl" TEXT,
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "themeColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "sourcePrefs" TEXT NOT NULL DEFAULT 'twitter,weibo,zhihu,toutiao,bilibili',
    "defaultImportance" TEXT NOT NULL DEFAULT '',
    "defaultTimeRange" TEXT NOT NULL DEFAULT '7d',
    "defaultSortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "defaultSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "defaultSource" TEXT NOT NULL DEFAULT '',
    "showOnlyReal" INTEGER NOT NULL DEFAULT 0,
    "notifyEmail" INTEGER NOT NULL DEFAULT 1,
    "notifyWeb" INTEGER NOT NULL DEFAULT 1,
    "notifyHighOnly" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 3: Create RefreshToken table
CREATE TABLE "_prisma_new_RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "_prisma_new_User"("id") ON DELETE CASCADE
);

-- Step 4: Add userId to Keyword (with default)
CREATE TABLE "_prisma_new_Keyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);

-- Copy existing keywords with system user
INSERT INTO "_prisma_new_Keyword" ("id", "text", "category", "isActive", "createdAt", "updatedAt", "userId")
SELECT "id", "text", "category", "isActive", "createdAt", "updatedAt", '00000000-0000-0000-0000-000000000001' FROM "Keyword";

-- Step 5: Add userId to Notification (with default)
CREATE TABLE "_prisma_new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" INTEGER NOT NULL DEFAULT 0,
    "hotspotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);

-- Copy existing notifications with system user
INSERT INTO "_prisma_new_Notification" ("id", "type", "title", "content", "isRead", "hotspotId", "createdAt", "userId")
SELECT "id", "type", "title", "content", "isRead", "hotspotId", "createdAt", '00000000-0000-0000-0000-000000000001' FROM "Notification";

-- Step 6: Drop old tables and rename new ones
DROP TABLE "Notification";
ALTER TABLE "_prisma_new_Notification" RENAME TO "Notification";

DROP TABLE "Keyword";
ALTER TABLE "_prisma_new_Keyword" RENAME TO "Keyword";

-- Step 7: Create proper tables for User system (replace temp tables)
DROP TABLE "_prisma_new_UserSettings";
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "logoUrl" TEXT,
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "themeColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "sourcePrefs" TEXT NOT NULL DEFAULT 'twitter,weibo,zhihu,toutiao,bilibili',
    "defaultImportance" TEXT NOT NULL DEFAULT '',
    "defaultTimeRange" TEXT NOT NULL DEFAULT '7d',
    "defaultSortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "defaultSortOrder" TEXT NOT NULL DEFAULT 'desc',
    "defaultSource" TEXT NOT NULL DEFAULT '',
    "showOnlyReal" INTEGER NOT NULL DEFAULT 0,
    "notifyEmail" INTEGER NOT NULL DEFAULT 1,
    "notifyWeb" INTEGER NOT NULL DEFAULT 1,
    "notifyHighOnly" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

DROP TABLE "_prisma_new_RefreshToken";
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

DROP TABLE "_prisma_new_User";
-- Re-create User table properly
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isBanned" INTEGER NOT NULL DEFAULT 0,
    "isEmailVerified" INTEGER NOT NULL DEFAULT 0,
    "emailVerifyToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Insert system admin user
INSERT INTO "User" ("id", "email", "password", "name", "role", "isBanned", "isEmailVerified", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'system@local', '$2a$12$placeholder', 'System', 'admin', 0, 1, datetime('now'), datetime('now'));

-- Step 8: Add foreign keys
-- For Keyword: userId references User
-- For Notification: userId references User
-- SQLite doesn't enforce foreign keys by default, Prisma handles this in app layer

-- Step 9: Create indexes
CREATE UNIQUE INDEX "Keyword_text_userId_key" ON "Keyword"("text", "userId");
CREATE INDEX "Keyword_userId_idx" ON "Keyword"("userId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
