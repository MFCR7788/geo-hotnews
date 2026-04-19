// Database seed script - restores test data after schema migration
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Starting database seed...');

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
  console.log('✅ System user created:', systemUser.email);

  // 2. Load keywords from backup
  const keywordsBackup = JSON.parse(
    readFileSync(join(__dirname, '../prisma/keywords_backup.json'), 'utf-8')
  );

  // Create a map from old keyword ID to new keyword
  const keywordIdMap = new Map();

  for (const kw of keywordsBackup) {
    const keyword = await prisma.keyword.create({
      data: {
        text: kw.text,
        category: kw.category,
        isActive: kw.isActive === 1,
        userId: SYSTEM_USER_ID,
      },
    });
    keywordIdMap.set(kw.id, keyword.id);
    console.log('  📌 Keyword:', keyword.text);
  }
  console.log(`✅ ${keywordsBackup.length} keywords restored`);

  // 3. Load hotspots from backup
  const hotspotsBackup = JSON.parse(
    readFileSync(join(__dirname, '../prisma/hotspots_backup.json'), 'utf-8')
  );

  let imported = 0;
  let skipped = 0;

  for (const hs of hotspotsBackup) {
    try {
      // Map old keywordId to new keywordId
      const newKeywordId = hs.keywordId ? keywordIdMap.get(hs.keywordId) : null;

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
  console.log(`✅ ${imported} hotspots imported, ${skipped} skipped (duplicates)`);

  // 4. Create some test notifications
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
  console.log('✅ Sample notifications created');

  console.log('\n🎉 Database seed completed!');
  console.log(`   - 1 system user`);
  console.log(`   - ${keywordsBackup.length} keywords`);
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
