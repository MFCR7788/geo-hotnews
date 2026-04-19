import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { sortHotspots } from '../utils/sortHotspots.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 热点列表：需要登录（只看自己关键词匹配的热点）
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      source, 
      importance,
      keywordId,
      isReal,
      timeRange,
      timeFrom,
      timeTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (source) where.source = source;
    if (importance) where.importance = importance;
    if (isReal !== undefined && isReal !== '') {
      where.isReal = isReal === 'true';
    }

    // 用户隔离：通过 keyword.userId 过滤
    // 如果指定了 keywordId，先验证该关键词是否属于当前用户
    if (keywordId) {
      const kw = await prisma.keyword.findFirst({
        where: { id: keywordId as string, userId: req.user!.userId }
      });
      if (!kw) {
        return res.status(403).json({ error: '无权访问该关键词的热点' });
      }
      where.keywordId = keywordId;
    } else {
      // 不指定 keywordId 时，只看当前用户所有关键词的热点
      const userKeywords = await prisma.keyword.findMany({
        where: { userId: req.user!.userId },
        select: { id: true }
      });
      const keywordIds = userKeywords.map(k => k.id);

      if (keywordIds.length === 0) {
        // 用户没有关键词，返回空
        return res.json({
          data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
        });
      }

      where.keywordId = { in: keywordIds };
    }

    // 时间范围筛选
    if (timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (timeRange) {
        case '1h':
          dateFrom = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'today':
          dateFrom = new Date(now);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
    } else if (timeFrom || timeTo) {
      where.createdAt = {};
      if (timeFrom) where.createdAt.gte = new Date(timeFrom as string);
      if (timeTo) where.createdAt.lte = new Date(timeTo as string);
    }

    // 排序处理
    let orderBy: any;
    const sort = sortBy as string;
    const order = (sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const needsMemorySort = sort === 'importance' || sort === 'hot';

    switch (sort) {
      case 'publishedAt':
        orderBy = [{ publishedAt: order }, { createdAt: 'desc' }];
        break;
      case 'relevance':
        orderBy = { relevance: order };
        break;
      case 'importance':
      case 'hot':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { createdAt: order };
        break;
    }

    const [rawHotspots, total] = await Promise.all([
      prisma.hotspot.findMany({
        where,
        orderBy,
        ...(needsMemorySort ? {} : { skip, take: limitNum }),
        include: {
          keyword: {
            select: { id: true, text: true, category: true }
          }
        }
      }),
      prisma.hotspot.count({ where })
    ]);

    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sort, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    res.json({
      data: hotspots,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 热点统计（当前用户的）
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 当前用户的关键词
    const userKeywords = await prisma.keyword.findMany({
      where: { userId: req.user!.userId },
      select: { id: true }
    });
    const keywordIds = userKeywords.map(k => k.id);

    if (keywordIds.length === 0) {
      return res.json({ total: 0, today: 0, urgent: 0, bySource: {} });
    }

    const baseWhere = { keywordId: { in: keywordIds } };

    const [
      totalHotspots,
      todayHotspots,
      urgentHotspots,
      sourceStats
    ] = await Promise.all([
      prisma.hotspot.count({ where: baseWhere }),
      prisma.hotspot.count({ where: { ...baseWhere, createdAt: { gte: today } } }),
      prisma.hotspot.count({ where: { ...baseWhere, importance: 'urgent' } }),
      prisma.hotspot.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { source: true }
      })
    ]);

    res.json({
      total: totalHotspots,
      today: todayHotspots,
      urgent: urgentHotspots,
      bySource: sourceStats.reduce((acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
        acc[item.source] = item._count.source;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 获取单个热点
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id as string },
      include: { keyword: true }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    // 验证是否属于当前用户的关键词
    if (hotspot.keywordId) {
      const kw = await prisma.keyword.findFirst({
        where: { id: hotspot.keywordId, userId: req.user!.userId }
      });
      if (!kw) {
        return res.status(403).json({ error: '无权访问该热点' });
      }
    }

    res.json(hotspot);
  } catch (error) {
    console.error('Error fetching hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch hotspot' });
  }
});

// 手动搜索热点
router.post('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query, sources = ['twitter', 'bing'] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const { searchBing } = await import('../services/search.js');
    const { analyzeContent } = await import('../services/ai.js');

    const results: any[] = [];

    if (sources.includes('bing')) {
      try {
        const webResults = await searchBing(query);
        results.push(...webResults);
      } catch (error) {
        console.error('Bing search failed:', error);
      }
    }

    const analyzedResults = await Promise.all(
      results.slice(0, 10).map(async (item) => {
        try {
          const analysis = await analyzeContent(item.title + ' ' + item.content, query);
          return { ...item, analysis };
        } catch {
          return { ...item, analysis: null };
        }
      })
    );

    res.json({ results: analyzedResults });
  } catch (error) {
    console.error('Error searching hotspots:', error);
    res.status(500).json({ error: 'Failed to search hotspots' });
  }
});

// 删除热点（只能删自己关键词的热点）
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id as string }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    if (hotspot.keywordId) {
      const kw = await prisma.keyword.findFirst({
        where: { id: hotspot.keywordId, userId: req.user!.userId }
      });
      if (!kw) {
        return res.status(403).json({ error: '无权删除该热点' });
      }
    }

    await prisma.hotspot.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
});

export default router;
