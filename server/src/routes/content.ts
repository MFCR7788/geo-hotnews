import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateContent } from '../services/ai.js';

const router = Router();

// GET /api/geo/content/templates
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category, platform, contentType } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = String(category);
    if (platform) where.platform = String(platform);
    if (contentType) where.contentType = String(contentType);

    const templates = await prisma.contentTemplate.findMany({ where, orderBy: { usageCount: 'desc' } });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/content
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, platform, brand, search } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };
    if (status) where.status = String(status);
    if (platform) where.platform = String(platform);
    if (brand) where.brandName = { contains: String(brand) };
    if (search) where.title = { contains: String(search), mode: 'insensitive' };

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: { template: { select: { name: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.content.count({ where }),
    ]);
    res.json({ contents, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contents' });
  }
});

// GET /api/content/calendar/month
router.get('/calendar/month', requireAuth, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(String(year)), parseInt(String(month)) - 1, 1);
    const endDate = new Date(parseInt(String(year)), parseInt(String(month)), 0);
    const contents = await prisma.content.findMany({
      where: { userId: req.user!.userId, status: 'published', publishedAt: { gte: startDate, lte: endDate } },
      select: { id: true, title: true, platform: true, publishedAt: true },
    });
    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// GET /api/content/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
      include: { template: true },
    });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// POST /api/content (支持AI生成)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { templateId, title, body, formattedBody, platform, industry, brandName, keywords, images, metadata, useAI, templatePrompt, sellingPoints, competitors, tone, wordCount, customPrompt } = req.body;

    let finalTitle = title;
    let finalBody = body;
    let finalComplianceScore: number | null = null;

    // 如果需要AI生成
    if (useAI && brandName && industry && keywords && keywords.length > 0) {
      try {
        const result = await generateContent({
          brandName,
          industry,
          keywords,
          platforms: platform ? [platform] : ['xiaohongshu'],
          sellingPoints: sellingPoints || [],
          competitors: competitors || [],
          tone: tone || 'professional',
          wordCount: wordCount || 1500,
          customPrompt: customPrompt || '',
          templatePrompt: templatePrompt || '',
        });
        finalTitle = result.title || title || `${brandName} - ${industry}内容`;
        finalBody = result.body || body;
        finalComplianceScore = result.complianceScore;
        console.log(`[AI Content] Generated for ${brandName}: "${finalTitle}"`);
      } catch (aiError) {
        console.error('[AI Content] Generation failed:', aiError);
        // AI失败时使用用户输入的内容
        finalTitle = title || `${brandName} - ${industry}内容`;
        finalBody = body;
      }
    } else {
      finalTitle = title || `${brandName || '内容'} - ${industry || '通用'}内容`;
      finalBody = body || '';
    }

    const content = await prisma.content.create({
      data: {
        userId: req.user!.userId,
        templateId,
        title: finalTitle,
        body: finalBody,
        formattedBody,
        platform,
        industry,
        brandName,
        keywords: keywords ? JSON.stringify(keywords) : null,
        images: images ? JSON.stringify(images) : null,
        metadata: metadata ? JSON.stringify({
          ...(typeof metadata === 'object' ? metadata : {}),
          ...(finalComplianceScore !== null && { complianceScore: finalComplianceScore }),
          useAI: useAI || false,
        }) : (finalComplianceScore !== null ? JSON.stringify({ complianceScore: finalComplianceScore, useAI: useAI }) : null),
      },
    });
    if (templateId) {
      await prisma.contentTemplate.update({ where: { id: templateId }, data: { usageCount: { increment: 1 } } });
    }
    res.status(201).json({
      ...content,
      complianceScore: finalComplianceScore,
    });
  } catch (error) {
    console.error('[Content] Create failed:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// PUT /api/content/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.content.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Content not found' });
    const { title, body, formattedBody, platform, status, images, metadata } = req.body;
    const content = await prisma.content.update({
      where: { id: String(req.params.id) },
      data: {
        ...(title && { title }),
        ...(body && { body }),
        ...(formattedBody && { formattedBody }),
        ...(platform && { platform }),
        ...(status && { status }),
        ...(images && { images: JSON.stringify(images) }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
        ...(status === 'published' && { publishedAt: new Date() }),
      },
    });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// POST /api/content/:id/publish
router.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.update({
      where: { id: String(req.params.id) },
      data: { status: 'published', publishedAt: new Date() },
    });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish content' });
  }
});

// POST /api/content/:id/archive
router.post('/:id/archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.update({
      where: { id: String(req.params.id) },
      data: { status: 'archived' },
    });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive content' });
  }
});

// DELETE /api/content/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.content.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

export default router;