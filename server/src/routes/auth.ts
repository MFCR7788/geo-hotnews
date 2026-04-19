import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { createAuthTokens, refreshAccessToken, revokeAllUserTokens, revokeToken } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: '邮箱和密码必填' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: '密码至少6位' });
      return;
    }

    // 检查邮箱是否已存在
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: '该邮箱已被注册' });
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name?.trim() || null,
        settings: {
          create: {} // 自动创建默认设置
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // 生成 Token
    const tokens = await createAuthTokens(user);

    res.status(201).json({
      message: '注册成功',
      user,
      ...tokens
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: '邮箱和密码必填' });
      return;
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isBanned: true,
        settings: {
          select: {
            logoUrl: true,
            themeMode: true,
            themeColor: true,
            sourcePrefs: true,
            notifyEmail: true,
            notifyWeb: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({ error: '邮箱或密码不正确' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: '账号已被封禁，请联系管理员' });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: '邮箱或密码不正确' });
      return;
    }

    // 生成 Token
    const tokens = await createAuthTokens({ id: user.id, email: user.email, role: user.role });

    const { password: _pw, ...userWithoutPassword } = user;

    res.json({
      message: '登录成功',
      user: userWithoutPassword,
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * POST /api/auth/refresh
 * 刷新 Access Token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: '缺少 Refresh Token' });
      return;
    }

    const tokens = await refreshAccessToken(refreshToken);

    if (!tokens) {
      res.status(401).json({ error: 'Refresh Token 无效或已过期，请重新登录' });
      return;
    }

    res.json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: '刷新 Token 失败' });
  }
});

/**
 * POST /api/auth/logout
 * 登出（单设备）
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeToken(refreshToken);
    }
    res.json({ message: '已登出' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '登出失败' });
  }
});

/**
 * POST /api/auth/logout-all
 * 登出所有设备
 */
router.post('/logout-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await revokeAllUserTokens(req.user!.userId);
    res.json({ message: '已从所有设备登出' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: '登出失败' });
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        createdAt: true,
        settings: true
      }
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * PUT /api/auth/me
 * 更新当前用户信息
 */
router.put('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

/**
 * PUT /api/auth/change-password
 * 修改密码
 */
router.put('/change-password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: '原密码和新密码必填' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: '新密码至少6位' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { password: true }
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      res.status(401).json({ error: '原密码不正确' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashedPassword }
    });

    // 使所有 Token 失效，强制重新登录
    await revokeAllUserTokens(req.user!.userId);

    res.json({ message: '密码已修改，请重新登录' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

/**
 * POST /api/auth/forgot-password
 * 忘记密码（发送重置邮件）
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: '邮箱必填' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // 无论是否存在，都返回成功（防止邮箱枚举攻击）
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1小时有效期

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExp }
      });

      // TODO: 通过 SendGrid 发送重置邮件
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
      console.log(`[邮件] 发送密码重置链接到 ${email}: ${resetUrl}`);

      // 如已配置 SendGrid，可在此发送邮件
    }

    res.json({ message: '如果该邮箱已注册，重置链接已发送到您的邮箱' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: '发送重置邮件失败' });
  }
});

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token 和新密码必填' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: '密码至少6位' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() }
      }
    });

    if (!user) {
      res.status(400).json({ error: '重置链接无效或已过期' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null
      }
    });

    // 使所有 Token 失效
    await revokeAllUserTokens(user.id);

    res.json({ message: '密码已重置，请重新登录' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

/**
 * GET/PUT /api/auth/settings
 * 获取/更新用户个性化设置
 */
router.get('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!settings) {
      // 自动创建默认设置
      const created = await prisma.userSettings.create({
        data: { userId: req.user!.userId }
      });
      res.json(created);
      return;
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

router.put('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const allowedFields = [
      'logoUrl', 'themeMode', 'themeColor',
      'sourcePrefs', 'defaultImportance', 'defaultTimeRange',
      'defaultSortBy', 'defaultSortOrder', 'defaultSource',
      'showOnlyReal', 'notifyEmail', 'notifyWeb', 'notifyHighOnly'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, ...updateData },
      update: updateData
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: '更新设置失败' });
  }
});

export default router;
