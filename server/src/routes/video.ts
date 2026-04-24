import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/video
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { platform, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;
    const where: any = { userId: req.user!.userId };
    if (platform) where.platform = String(platform);
    if (status) where.status = String(status);

    const [videos, total] = await Promise.all([
      prisma.videoAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.videoAsset.count({ where }),
    ]);
    res.json({ videos, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET /api/video/stats/overview
router.get('/stats/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const [total, byPlatform, byStatus] = await Promise.all([
      prisma.videoAsset.count({ where: { userId: req.user!.userId } }),
      prisma.videoAsset.groupBy({ by: ['platform'], where: { userId: req.user!.userId }, _count: { id: true } }),
      prisma.videoAsset.groupBy({ by: ['status'], where: { userId: req.user!.userId }, _count: { id: true } }),
    ]);
    res.json({
      total,
      byPlatform: byPlatform.map(p => ({ platform: p.platform, count: p._count.id })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/video/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const video = await prisma.videoAsset.findFirst({ where: { id: String(req.params.id), userId: req.user!.userId } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// POST /api/video
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, fileUrl, coverUrl, duration, platform, tags, metadata } = req.body;
    const video = await prisma.videoAsset.create({
      data: {
        userId: req.user!.userId,
        title,
        description,
        fileUrl,
        coverUrl,
        duration: duration ? parseInt(duration) : null,
        platform: platform || 'local',
        tags: tags ? JSON.stringify(tags) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        status: fileUrl ? 'ready' : 'uploading',
      },
    });
    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT /api/video/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, coverUrl, platform, status, tags, metadata } = req.body;
    const video = await prisma.videoAsset.update({
      where: { id: String(req.params.id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(platform && { platform }),
        ...(status && { status }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      },
    });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE /api/video/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.videoAsset.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

export default router;