import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { runHotspotCheck } from '../jobs/hotspotChecker.js';
import type { Server } from 'socket.io';

// 供 index.ts 注入 io 实例
let _io: Server | null = null;
export function setKeywordIo(io: Server) {
  _io = io;
}

const router = Router();

// ============ 全局词库 API（公开访问）===========

// 获取全局关键词库（所有关键词，供用户选择）
router.get('/library', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    
    const where: any = {};
    if (search) {
      where.text = { contains: search as string };
    }
    if (category) {
      where.category = category as string;
    }

    const keywords = await prisma.keywordLibrary.findMany({
      where,
      orderBy: [
        { userCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    });
    
    res.json(keywords);
  } catch (error) {
    console.error('Error fetching keyword library:', error);
    res.status(500).json({ error: 'Failed to fetch keyword library' });
  }
});

// 添加新关键词到全局词库（需要认证）
router.post('/library', requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, category } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '关键词文本必填' });
    }

    const existing = await prisma.keywordLibrary.findUnique({
      where: { text: text.trim() }
    });

    if (existing) {
      return res.json(existing);
    }

    const newKeyword = await prisma.keywordLibrary.create({
      data: {
        text: text.trim(),
        category: category?.trim() || null
      }
    });

    res.status(201).json(newKeyword);

    if (_io) {
      runHotspotCheck(_io).catch(err => console.error('Hotspot check after new keyword failed:', err));
    }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '关键词已存在' });
    }
    console.error('Error creating keyword in library:', error);
    res.status(500).json({ error: 'Failed to create keyword' });
  }
});

// ============ 相似词搜索 API（需要认证，排除已订阅）===========

router.get('/similar', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 1) {
      return res.json([]);
    }

    const subscribed = await prisma.userKeyword.findMany({
      where: { userId: req.user!.userId },
      select: { keywordId: true }
    });
    const subscribedIds = new Set(subscribed.map(s => s.keywordId));

    const results = await prisma.keywordLibrary.findMany({
      where: {
        OR: [
          { text: { startsWith: q, mode: 'insensitive' } },
          { text: { contains: q, mode: 'insensitive' } },
        ]
      },
      orderBy: [
        { userCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    });

    const ranked = results
      .filter(kw => !subscribedIds.has(kw.id))
      .map(kw => {
        const lowerText = kw.text.toLowerCase();
        const lowerQ = q.toLowerCase();
        let score = 0;
        if (lowerText === lowerQ) score = 100;
        else if (lowerText.startsWith(lowerQ)) score = 80;
        else if (lowerText.includes(lowerQ)) score = 60;
        else score = 40;
        score += Math.min(kw.userCount * 2, 20);
        return { ...kw, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json(ranked.map(({ score, ...kw }) => kw));
  } catch (error) {
    console.error('Error searching similar keywords:', error);
    res.status(500).json({ error: 'Failed to search similar keywords' });
  }
});

// ============ 用户订阅管理 API（需要认证）===========

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userKeywords = await prisma.userKeyword.findMany({
      where: { userId: req.user!.userId },
      include: {
        keyword: {
          include: {
            _count: {
              select: { hotspots: true }
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    const result = userKeywords.map(uk => ({
      id: uk.id,
      keywordId: uk.keywordId,
      text: uk.keyword.text,
      category: uk.keyword.category,
      isActive: uk.isActive,
      addedAt: uk.addedAt,
      hotspotCount: uk.keyword._count.hotspots,
      userCount: uk.keyword.userCount
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching user keywords:', error);
    res.status(500).json({ error: 'Failed to fetch user keywords' });
  }
});

router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const { keywordId, text, category } = req.body;
    let keywordLibraryId = keywordId;

    if (!keywordLibraryId) {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: '关键词文本必填' });
      }

      let keywordInLib = await prisma.keywordLibrary.findUnique({
        where: { text: text.trim() }
      });

      if (!keywordInLib) {
        keywordInLib = await prisma.keywordLibrary.create({
          data: {
            text: text.trim(),
            category: category?.trim() || null
          }
        });
      }

      keywordLibraryId = keywordInLib.id;
    }

    const existing = await prisma.userKeyword.findUnique({
      where: {
        userId_keywordId: {
          userId: req.user!.userId,
          keywordId: keywordLibraryId
        }
      }
    });

    if (existing) {
      return res.json({ 
        id: existing.id,
        keywordId: existing.keywordId,
        isActive: existing.isActive,
        alreadySubscribed: true 
      });
    }

    const userKeyword = await prisma.userKeyword.create({
      data: {
        userId: req.user!.userId,
        keywordId: keywordLibraryId,
        isActive: true
      },
      include: {
        keyword: true
      }
    });

    await prisma.keywordLibrary.update({
      where: { id: keywordLibraryId },
      data: { userCount: { increment: 1 } }
    });

    res.status(201).json({
      id: userKeyword.id,
      keywordId: userKeyword.keywordId,
      text: userKeyword.keyword.text,
      category: userKeyword.keyword.category,
      isActive: userKeyword.isActive,
      addedAt: userKeyword.addedAt
    });

    if (_io) {
      runHotspotCheck(_io).catch(err => console.error('Hotspot check after subscribe failed:', err));
    }
  } catch (error) {
    console.error('Error subscribing keyword:', error);
    res.status(500).json({ error: 'Failed to subscribe keyword' });
  }
});

router.delete('/unsubscribe/:keywordId', requireAuth, async (req: Request, res: Response) => {
  try {
    const keywordId = req.params.keywordId as string;

    const existing = await prisma.userKeyword.findUnique({
      where: {
        userId_keywordId: {
          userId: req.user!.userId,
          keywordId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: '订阅不存在' });
    }

    await prisma.userKeyword.delete({
      where: { id: existing.id }
    });

    await prisma.keywordLibrary.update({
      where: { id: keywordId },
      data: { userCount: { decrement: 1 } }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unsubscribing keyword:', error);
    res.status(500).json({ error: 'Failed to unsubscribe keyword' });
  }
});

router.patch('/toggle/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const userKeyword = await prisma.userKeyword.findUnique({
      where: { id },
      include: { keyword: true }
    });

    if (!userKeyword || userKeyword.userId !== req.user!.userId) {
      return res.status(404).json({ error: '订阅不存在' });
    }

    const updated = await prisma.userKeyword.update({
      where: { id },
      data: { isActive: !userKeyword.isActive },
      include: { keyword: true }
    });

    res.json({
      id: updated.id,
      keywordId: updated.keywordId,
      text: updated.keyword.text,
      isActive: updated.isActive
    });
  } catch (error) {
    console.error('Error toggling keyword:', error);
    res.status(500).json({ error: 'Failed to toggle keyword' });
  }
});

export default router;
