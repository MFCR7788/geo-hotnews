/**
 * 修复热点关联脚本：将旧 keywordId 映射到新的 KeywordLibrary
 *
 * 使用方法：npx tsx prisma/fixHotspotKeywordIds.ts
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..');
const DEV_DB_PATH = `file:${path.join(SERVER_DIR, 'prisma', 'dev.db')}`;

async function fixHotspotKeywordIds() {
  console.log('🔧 开始修复热点关联...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DEV_DB_PATH
      }
    }
  });

  // 旧 Keyword ID -> 新 KeywordLibrary ID 的映射
  // 基于相同文本的关键词
  const keywordMapping: Record<string, string> = {
    '3e41e558-b162-4bc4-871c-f098fded7379': 'a06f7f5c-2ba1-4695-b22c-385b4dd7822e', // AI资讯
    '102f26d6-7670-47ba-b19b-917a08734242': 'b04c8394-d6e5-4309-ba0f-3ab662f9d93b', // 冲锋衣
  };

  try {
    // 1. 统计需要修复的热点数量
    const hotspotsWithOldIds = await prisma.hotspot.count({
      where: {
        keywordId: {
          in: Object.keys(keywordMapping)
        }
      }
    });

    console.log(`📊 发现 ${hotspotsWithOldIds} 条热点需要修复关联\n`);

    if (hotspotsWithOldIds === 0) {
      console.log('✅ 没有需要修复的热点数据\n');
      return;
    }

    // 2. 逐条更新热点
    let updated = 0;
    for (const [oldId, newId] of Object.entries(keywordMapping)) {
      const result = await prisma.hotspot.updateMany({
        where: { keywordId: oldId },
        data: { keywordId: newId }
      });
      updated += result.count;
      console.log(`  ✅ 更新 ${result.count} 条热点: ${oldId.slice(0, 8)}... -> ${newId.slice(0, 8)}...`);
    }

    console.log(`\n📊 总共更新了 ${updated} 条热点关联\n`);

    // 3. 验证修复结果
    console.log('📋 修复后的热点关联：\n');

    const hotspots = await prisma.hotspot.findMany({
      where: {
        keywordId: {
          in: Object.values(keywordMapping)
        }
      },
      include: {
        keyword: {
          select: { id: true, text: true }
        }
      },
      take: 5
    });

    for (const h of hotspots) {
      console.log(`  • "${h.title.slice(0, 40)}..."`);
      console.log(`    -> 关键词: ${h.keyword?.text || '未关联'}`);
    }

    console.log('\n🎉 修复完成!\n');

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixHotspotKeywordIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
