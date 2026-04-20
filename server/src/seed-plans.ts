import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化套餐数据...');

  // 删除旧数据
  await prisma.subscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.usage.deleteMany();
  await prisma.device.deleteMany();
  await prisma.plan.deleteMany();

  // 创建套餐
  const plans = [
    {
      planId: 'free',
      name: '免费版',
      description: '适合轻度用户试用体验',
      priceMonthly: 0,
      priceYearly: 0,
      limits: JSON.stringify({
        keywordLimit: 3,
        aiAnalysisLimit: 50,
        hotspotDays: 7,
        devices: 0,
        sources: 3,
        emailNotify: false,
        dailyDigest: false,
        priorityQueue: false
      }),
      isActive: true,
      sortOrder: 1
    },
    {
      planId: 'pro',
      name: '专业版',
      description: '适合独立创作者和自媒体人',
      priceMonthly: 2900,  // ¥29
      priceYearly: 19900,  // ¥199
      limits: JSON.stringify({
        keywordLimit: 20,
        aiAnalysisLimit: 500,
        hotspotDays: 30,
        devices: 3,
        sources: 999,
        emailNotify: true,
        dailyDigest: false,
        priorityQueue: false
      }),
      isActive: true,
      sortOrder: 2
    },
    {
      planId: 'enterprise',
      name: '企业版',
      description: '适合团队协作和专业运营',
      priceMonthly: 9900,  // ¥99
      priceYearly: 69900,  // ¥699
      limits: JSON.stringify({
        keywordLimit: 999999,
        aiAnalysisLimit: 999999,
        hotspotDays: 180,
        devices: 10,
        sources: 999,
        emailNotify: true,
        dailyDigest: true,
        priorityQueue: true
      }),
      isActive: true,
      sortOrder: 3
    }
  ];

  for (const plan of plans) {
    await prisma.plan.create({ data: plan });
    console.log(`✅ 创建套餐: ${plan.name}`);
  }

  console.log('\n🌟 套餐初始化完成!');
  console.log('   - 免费版: 3个关键词, 50次AI/月, 7天热点保留');
  console.log('   - 专业版: 20个关键词, 500次AI/月, 30天热点保留');
  console.log('   - 企业版: 无限关键词, 无限AI, 180天热点保留');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
