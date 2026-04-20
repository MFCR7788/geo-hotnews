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

// 所有关键词路由都需要登录
router.use(requireAuth);

// ============ 全局词库 API ============

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

// 添加新关键词到全局词库
router.post('/library', async (req: Request, res: Response) => {
  try {
    const { text, category } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '关键词文本必填' });
    }

    // 检查是否已存在
    const existing = await prisma.keywordLibrary.findUnique({
      where: { text: text.trim() }
    });

    if (existing) {
      return res.json(existing); // 已存在直接返回
    }

    // 创建新关键词
    const newKeyword = await prisma.keywordLibrary.create({
      data: {
        text: text.trim(),
        category: category?.trim() || null
      }
    });

    res.status(201).json(newKeyword);

    // 新关键词入库后，触发一次扫描
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

// ============ 用户订阅管理 API ============

// 获取当前用户已订阅的关键词
router.get('/', async (req: Request, res: Response) => {
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

    // 格式化返回
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

// 订阅关键词
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { keywordId, text, category } = req.body;
    let keywordLibraryId = keywordId;

    // 如果没有 keywordId，则添加新关键词到词库
    if (!keywordLibraryId) {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: '关键词文本必填' });
      }

      // 查找或创建关键词库条目
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

    // 检查是否已订阅
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

    // 创建订阅关系
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

    // 更新词库中的用户计数
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

    // 订阅后触发扫描
    if (_io) {
      runHotspotCheck(_io).catch(err => console.error('Hotspot check after subscribe failed:', err));
    }
  } catch (error) {
    console.error('Error subscribing keyword:', error);
    res.status(500).json({ error: 'Failed to subscribe keyword' });
  }
});

// 取消订阅关键词
router.delete('/unsubscribe/:keywordId', async (req: Request, res: Response) => {
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

    // 更新词库中的用户计数
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

// 切换关键词开关状态
router.patch('/toggle/:id', async (req: Request, res: Response) => {
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
