/**
 * 数据迁移脚本：从旧架构迁移到新架构
 *
 * 旧架构：User -> Keyword (每个用户独立的关键词副本)
 * 新架构：KeywordLibrary (全局词库) + UserKeyword (用户订阅关系)
 *
 * 使用方法：npx tsx prisma/migrateKeywords.ts
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用绝对路径
const SERVER_DIR = path.resolve(__dirname, '..');
const DEV_DB_PATH = `file:${path.join(SERVER_DIR, 'prisma', 'dev.db')}`;
const BACKUP_DB_PATH = path.join(SERVER_DIR, 'prisma', 'dev.db.bak.20260420');

async function migrate() {
  console.log('🔄 开始迁移关键词数据...\n');

  // 连接当前数据库
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DEV_DB_PATH
      }
    }
  });

  // 连接备份数据库（读取旧数据）
  const backupDb = new Database(BACKUP_DB_PATH, { readonly: true });

  try {
    // 1. 检查当前是否已有数据
    const existingCount = await prisma.keywordLibrary.count();
    if (existingCount > 0) {
      console.log(`⚠️  KeywordLibrary 中已有 ${existingCount} 条记录，跳过迁移`);
      console.log('如需重新迁移，请先清空 KeywordLibrary 和 UserKeyword 表\n');
      return;
    }

    // 2. 从备份数据库读取旧关键词数据
    const oldKeywords = backupDb.prepare(`
      SELECT k.id as old_keyword_id, k.text, k.category, k.userId, k.isActive
      FROM Keyword k
    `).all() as Array<{
      old_keyword_id: string;
      text: string;
      category: string | null;
      userId: string;
      isActive: number;
    }>;

    console.log(`📊 发现 ${oldKeywords.length} 条旧关键词记录\n`);

    if (oldKeywords.length === 0) {
      console.log('✅ 没有需要迁移的关键词数据\n');
      return;
    }

    // 3. 按关键词文本分组（合并重复的关键词）
    const keywordGroups = new Map<string, {
      texts: string[];
      userIds: Set<string>;
      categories: (string | null)[];
      isActiveFlags: boolean[];
    }>();

    for (const kw of oldKeywords) {
      if (!keywordGroups.has(kw.text)) {
        keywordGroups.set(kw.text, {
          texts: [],
          userIds: new Set(),
          categories: [],
          isActiveFlags: []
        });
      }
      const group = keywordGroups.get(kw.text)!;
      group.userIds.add(kw.userId);
      if (kw.category && !group.categories.includes(kw.category)) {
        group.categories.push(kw.category);
      }
      group.isActiveFlags.push(Boolean(kw.isActive));
    }

    console.log(`📦 发现 ${keywordGroups.size} 个唯一关键词\n`);

    // 4. 创建 KeywordLibrary 记录并建立映射
    const keywordIdMap = new Map<string, string>(); // oldKeywordId -> newKeywordLibraryId

    for (const [text, group] of keywordGroups) {
      // 插入到 KeywordLibrary
      const libraryEntry = await prisma.keywordLibrary.create({
        data: {
          text,
          category: group.categories[0] || null,
          userCount: group.userIds.size
        }
      });

      console.log(`  ✅ 创建词库: "${text}" (userCount: ${group.userIds.size})`);

      // 找出这些关键词对应的新ID
      // 由于旧表可能有多条相同文本的记录（不同用户），我们需要找到对应的旧ID
      for (const kw of oldKeywords) {
        if (kw.text === text) {
          keywordIdMap.set(kw.old_keyword_id, libraryEntry.id);
        }
      }
    }

    // 5. 创建 UserKeyword 订阅关系
    console.log('\n📝 创建用户订阅关系...\n');

    for (const kw of oldKeywords) {
      const newKeywordId = keywordIdMap.get(kw.old_keyword_id);
      if (!newKeywordId) continue;

      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: kw.userId }
      });

      if (!user) {
        console.log(`  ⚠️  用户 ${kw.userId} 不存在，跳过关键词 "${kw.text}"`);
        continue;
      }

      // 检查是否已存在订阅关系
      const existing = await prisma.userKeyword.findUnique({
        where: {
          userId_keywordId: {
            userId: kw.userId,
            keywordId: newKeywordId
          }
        }
      });

      if (existing) {
        console.log(`  ⏭️  订阅关系已存在: 用户 ${user.email} -> "${kw.text}"`);
        continue;
      }

      await prisma.userKeyword.create({
        data: {
          userId: kw.userId,
          keywordId: newKeywordId,
          isActive: Boolean(kw.isActive)
        }
      });

      console.log(`  ✅ 订阅: ${user.email} -> "${kw.text}"`);
    }

    // 6. 验证迁移结果
    console.log('\n📊 迁移结果统计:\n');

    const newLibraryCount = await prisma.keywordLibrary.count();
    const newSubscriptionCount = await prisma.userKeyword.count();

    console.log(`  • KeywordLibrary: ${newLibraryCount} 条`);
    console.log(`  • UserKeyword:   ${newSubscriptionCount} 条\n`);

    // 7. 展示迁移后的数据
    console.log('📋 迁移后的关键词库:\n');

    const allKeywords = await prisma.keywordLibrary.findMany({
      include: {
        userKeywords: {
          include: {
            user: {
              select: { email: true }
            }
          }
        }
      }
    });

    for (const kw of allKeywords) {
      const users = kw.userKeywords.map(uk => uk.user.email).join(', ');
      console.log(`  • "${kw.text}" (${kw.category || '未分类'}) - 订阅用户: ${users || '无'}`);
    }

    console.log('\n🎉 迁移完成!\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    backupDb.close();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
