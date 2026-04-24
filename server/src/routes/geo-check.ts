import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeGeoReport } from '../services/ai.js';

const router = Router();

// GET /api/geo-check/reports
router.get('/reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      prisma.geoReport.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.geoReport.count({ where: { userId: req.user!.userId } }),
    ]);
    res.json({ reports, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/geo-check/reports/:id
router.get('/reports/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const report = await prisma.geoReport.findFirst({
      where: { id: String(req.params.id), userId: req.user!.userId },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/geo-check/check
router.post('/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const { brand, industry, platforms, keywords, competitors } = req.body;

    const report = await prisma.geoReport.create({
      data: {
        userId: req.user!.userId,
        brand,
        industry,
        platforms: JSON.stringify(platforms || []),
        keywords: JSON.stringify(keywords || []),
        competitors: competitors ? JSON.stringify(competitors) : null,
        status: 'running', // 状态改为 running 表示正在分析
      },
    });

    // 异步调用 AI 分析（不阻塞响应）
    analyzeGeoReport(brand, industry, keywords || [], platforms || [], competitors)
      .then(async (result) => {
        try {
          await prisma.geoReport.update({
            where: { id: report.id },
            data: {
              status: 'completed',
              overallScore: result.overallScore,
              dimensions: JSON.stringify(result.dimensions),
              summary: result.summary,
              suggestions: JSON.stringify(result.suggestions),
              keywordDetails: JSON.stringify(result.keywordDetails),
              completedAt: new Date(),
            },
          });
          console.log(`[GEO Check] Report ${report.id} completed for ${brand}: score=${result.overallScore}`);
        } catch (e) {
          console.error('[GEO Check] Failed to update report:', e);
        }
      })
      .catch(async (error) => {
        console.error('[GEO Check] AI analysis failed:', error);
        try {
          await prisma.geoReport.update({
            where: { id: report.id },
            data: {
              status: 'failed',
              summary: 'AI分析失败，请稍后重试',
            },
          });
        } catch (e) {
          console.error('[GEO Check] Failed to update report status:', e);
        }
      });

    res.status(201).json(report);
  } catch (error) {
    console.error('[GEO Check] Create failed:', error);
    res.status(500).json({ error: 'Failed to create check task' });
  }
});

// DELETE /api/geo-check/reports/:id
router.delete('/reports/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.geoReport.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;