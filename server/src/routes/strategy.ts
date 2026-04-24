import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/strategy
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    const where: any = { userId: req.user!.userId };
    if (status) where.status = String(status);
    if (category) where.category = String(category);

    const strategies = await prisma.strategy.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { phases: true, kols: true } } },
    });
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// GET /api/strategy/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const strategy = await prisma.strategy.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
      include: { phases: { orderBy: { sortOrder: 'asc' } }, kols: true },
    });
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// POST /api/strategy
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, category, platform, description, startDate, endDate, budget, keywords, contentPillars, platforms } = req.body;
    const strategy = await prisma.strategy.create({
      data: {
        userId: req.user!.userId,
        name,
        category: category || 'content',
        platform: platform || 'all',
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseInt(budget) : null,
        keywords: keywords ? JSON.stringify(keywords) : null,
        contentPillars: contentPillars ? JSON.stringify(contentPillars) : null,
        platforms: platforms ? JSON.stringify(platforms) : null,
      },
    });
    res.status(201).json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// PUT /api/strategy/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, category, platform, status, description, startDate, endDate, budget, keywords, contentPillars, platforms } = req.body;
    const strategy = await prisma.strategy.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(platform && { platform }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(budget !== undefined && { budget: budget ? parseInt(budget) : null }),
        ...(keywords !== undefined && { keywords: keywords ? JSON.stringify(keywords) : null }),
        ...(contentPillars !== undefined && { contentPillars: contentPillars ? JSON.stringify(contentPillars) : null }),
        ...(platforms !== undefined && { platforms: platforms ? JSON.stringify(platforms) : null }),
      },
    });
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// DELETE /api/strategy/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.strategy.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Strategy deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

// POST /api/strategy/:id/phases
router.post('/:id/phases', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, content, platforms, sortOrder } = req.body;
    const phase = await prisma.strategyPhase.create({
      data: {
        strategyId: String(req.params.id),
        name,
        content,
        platforms: platforms ? JSON.stringify(platforms) : null,
        sortOrder: sortOrder || 0,
      },
    });
    res.status(201).json(phase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add phase' });
  }
});

// PUT /api/strategy/phases/:phaseId
router.put('/phases/:phaseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, content, platforms, sortOrder } = req.body;
    const phase = await prisma.strategyPhase.update({
      where: { id: String(req.params.phaseId) },
      data: {
        ...(name && { name }),
        ...(content !== undefined && { content }),
        ...(platforms !== undefined && { platforms: platforms ? JSON.stringify(platforms) : null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json(phase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// DELETE /api/strategy/phases/:phaseId
router.delete('/phases/:phaseId', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.strategyPhase.delete({ where: { id: String(req.params.phaseId) } });
    res.json({ message: 'Phase deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete phase' });
  }
});

// POST /api/strategy/:id/kols
router.post('/:id/kols', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, platform, followers, cost, estimatedReach } = req.body;
    const kol = await prisma.strategyKol.create({
      data: {
        strategyId: String(req.params.id),
        name,
        platform,
        followers: followers ? parseInt(followers) : 0,
        cost: cost ? parseInt(cost) : 0,
        estimatedReach: estimatedReach ? parseInt(estimatedReach) : 0,
      },
    });
    res.status(201).json(kol);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add KOL' });
  }
});

// PUT /api/strategy/kols/:kolId
router.put('/kols/:kolId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, actualReach, engagement } = req.body;
    const kol = await prisma.strategyKol.update({
      where: { id: String(req.params.kolId) },
      data: {
        ...(status && { status }),
        ...(actualReach !== undefined && { actualReach: parseInt(actualReach) }),
        ...(engagement !== undefined && { engagement: parseFloat(engagement) }),
      },
    });
    res.json(kol);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KOL' });
  }
});

// DELETE /api/strategy/kols/:kolId
router.delete('/kols/:kolId', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.strategyKol.delete({ where: { id: String(req.params.kolId) } });
    res.json({ message: 'KOL deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete KOL' });
  }
});

export default router;