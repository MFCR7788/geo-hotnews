/**
 * 图片上传 API
 * POST /api/upload/image
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadToImgBB, parseBase64Image } from '../services/imgUpload.js';

const router = Router();

// 上传图片（需要登录）
router.post('/image', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, filename } = req.body as {
      image: string;
      filename?: string;
    };

    if (!image) {
      res.status(400).json({ error: '请提供图片数据' });
      return;
    }

    // 处理 Base64 数据
    const base64Data = parseBase64Image(image);
    const name = filename || `logo-${Date.now()}.jpg`;

    // 上传到 ImgBB
    const result = await uploadToImgBB(base64Data, name);

    res.json({
      success: true,
      url: result.url,
      deleteUrl: result.deleteUrl
    });
  } catch (error: any) {
    console.error('[Upload] 上传图片失败:', error);
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

export default router;
