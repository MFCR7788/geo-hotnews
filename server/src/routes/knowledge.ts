import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/knowledge
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category, brand, search } = req.query;
    const where: any = { userId: req.user!.userId };
    if (category) where.category = String(category);
    if (brand) where.brand = { contains: String(brand), mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { brand: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const entries = await prisma.knowledgeEntry.findMany({ where, orderBy: { updatedAt: 'desc' } });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

// GET /api/knowledge/categories
router.get('/categories', requireAuth, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.knowledgeEntry.groupBy({
      by: ['category'],
      where: { userId: req.user!.userId },
      _count: { id: true },
    });
    res.json(categories.map(c => ({ category: c.category, count: c._count.id })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/knowledge/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const entry = await prisma.knowledgeEntry.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// POST /api/knowledge
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { brand, category, subCategory, name, description, specs, tags, source } = req.body;
    const entry = await prisma.knowledgeEntry.create({
      data: {
        userId: req.user!.userId,
        brand,
        category,
        subCategory,
        name,
        description,
        specs: specs ? JSON.stringify(specs) : null,
        tags: tags ? JSON.stringify(tags) : null,
        source,
      },
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// PUT /api/knowledge/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { brand, category, subCategory, name, description, specs, tags, source } = req.body;
    const entry = await prisma.knowledgeEntry.update({
      where: { id: String(req.params.id) },
      data: {
        ...(brand && { brand }),
        ...(category && { category }),
        ...(subCategory !== undefined && { subCategory }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(specs && { specs: JSON.stringify(specs) }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(source !== undefined && { source }),
      },
    });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/knowledge/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.knowledgeEntry.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// POST /api/knowledge/batch
router.post('/batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const { entries } = req.body as { entries: any[] };
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array' });
    const created = await prisma.$transaction(
      entries.map(e => prisma.knowledgeEntry.create({
        data: {
          userId: req.user!.userId,
          brand: e.brand,
          category: e.category,
          subCategory: e.subCategory,
          name: e.name,
          description: e.description,
          specs: e.specs ? JSON.stringify(e.specs) : null,
          tags: e.tags ? JSON.stringify(e.tags) : null,
          source: e.source,
        },
      }))
    );
    res.status(201).json({ created: created.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch import' });
  }
});

export default router;