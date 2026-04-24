// Database seed script - restores test data after schema migration
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Starting database seed...');

  // 1. Create system user
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@local' },
    update: {},
    create: {
      id: SYSTEM_USER_ID,
      email: 'system@local',
      password: '$2a$12$placeholder', // Not a real password, just for migration
      name: 'System',
      role: 'admin',
      isBanned: false,
      isEmailVerified: true,
    },
  });
  console.log('System user created:', systemUser.email);

  // 2. Load keywords from backup
  const keywordsBackup = JSON.parse(
    readFileSync(join(__dirname, '../prisma/keywords_backup.json'), 'utf-8')
  );

  // Create a map from old keyword text to new KeywordLibrary ID
  const keywordLibraryIdMap = new Map<string, string>();

  for (const kw of keywordsBackup) {
    // 首先添加到全局词库
    const keywordInLib = await prisma.keywordLibrary.upsert({
      where: { text: kw.text },
      update: {},
      create: {
        text: kw.text,
        category: kw.category,
      },
    });
    keywordLibraryIdMap.set(kw.text, keywordInLib.id);
    
    // 创建用户订阅关系
    await prisma.userKeyword.upsert({
      where: {
        userId_keywordId: {
          userId: SYSTEM_USER_ID,
          keywordId: keywordInLib.id,
        }
      },
      update: {
        isActive: kw.isActive === 1,
      },
      create: {
        userId: SYSTEM_USER_ID,
        keywordId: keywordInLib.id,
        isActive: kw.isActive === 1,
      },
    });
    
    // 更新词库用户计数
    await prisma.keywordLibrary.update({
      where: { id: keywordInLib.id },
      data: { userCount: { increment: 1 } },
    });
    
    console.log('  Keyword:', kw.text);
  }
  console.log(`${keywordsBackup.length} keywords restored to library`);

  // 3. Load hotspots from backup
  const hotspotsBackup = JSON.parse(
    readFileSync(join(__dirname, '../prisma/hotspots_backup.json'), 'utf-8')
  );

  let imported = 0;
  let skipped = 0;

  for (const hs of hotspotsBackup) {
    try {
      // Map old keyword text to new KeywordLibrary ID
      let newKeywordId: string | null = null;
      if (hs.keywordText) {
        newKeywordId = keywordLibraryIdMap.get(hs.keywordText) || null;
      }

      await prisma.hotspot.create({
        data: {
          title: hs.title,
          content: hs.content,
          url: hs.url,
          source: hs.source,
          sourceId: hs.sourceId,
          isReal: hs.isReal === 1,
          relevance: hs.relevance || 0,
          relevanceReason: hs.relevanceReason,
          keywordMentioned: hs.keywordMentioned ? (hs.keywordMentioned === 1 ? true : null) : null,
          importance: hs.importance || 'low',
          summary: hs.summary,
          viewCount: hs.viewCount,
          likeCount: hs.likeCount,
          retweetCount: hs.retweetCount,
          replyCount: hs.replyCount,
          commentCount: hs.commentCount,
          quoteCount: hs.quoteCount,
          danmakuCount: hs.danmakuCount,
          authorName: hs.authorName,
          authorUsername: hs.authorUsername,
          authorAvatar: hs.authorAvatar,
          authorFollowers: hs.authorFollowers,
          authorVerified: hs.authorVerified ? (hs.authorVerified === 1 ? true : false) : null,
          publishedAt: hs.publishedAt ? new Date(hs.publishedAt) : null,
          keywordId: newKeywordId,
        },
      });
      imported++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Duplicate URL+source, skip
        skipped++;
      } else {
        console.error('Error importing hotspot:', hs.title?.slice(0, 50), error.message);
        skipped++;
      }
    }
  }
  console.log(`${imported} hotspots imported, ${skipped} skipped (duplicates)`);

  // 4. Load plans from backup
  const plansBackup = JSON.parse(
    readFileSync(join(__dirname, '../prisma/plans_backup.json'), 'utf-8')
  );

  for (const plan of plansBackup) {
    await prisma.plan.upsert({
      where: { planId: plan.planId },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        limits: JSON.stringify(plan.limits),
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
      create: {
        planId: plan.planId,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        limits: JSON.stringify(plan.limits),
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
    });
    console.log('  Plan:', plan.name);
  }
  console.log(`${plansBackup.length} plans restored`);

  // 5. Create some test notifications
  const hotspots = await prisma.hotspot.findMany({ take: 3 });
  for (const hs of hotspots) {
    await prisma.notification.create({
      data: {
        type: 'hotspot',
        title: `热点发现: ${hs.title.slice(0, 30)}...`,
        content: hs.summary || hs.content.slice(0, 100),
        hotspotId: hs.id,
        userId: SYSTEM_USER_ID,
      },
    });
  }
  console.log('Sample notifications created');

  console.log('\nDatabase seed completed!');
  console.log(`   - 1 system user`);
  console.log(`   - ${keywordsBackup.length} keywords in library`);
  console.log(`   - ${imported} hotspots`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
