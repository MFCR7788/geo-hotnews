// 认证中间件
import { Request, Response, NextFunction } from 'express';
import { verifyToken, verifyTokenWithError, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../db.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * 普通认证中间件
 * 验证 Access Token，设置 req.user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证 Token', code: 'no_token' });
    return;
  }

  const token = authHeader.slice(7);
  const { payload, error } = verifyTokenWithError(token);

  if (!payload) {
    if (error === 'token_expired') {
      res.status(401).json({ error: '登录已过期，请重新登录', code: 'token_expired' });
    } else {
      res.status(401).json({ error: '无效的认证 Token', code: 'token_invalid' });
    }
    return;
  }

  req.user = payload;
  next();
}

/**
 * 管理员认证中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: '需要管理员权限' });
      return;
    }
    next();
  });
}

/**
 * GEO权限检查中间件
 * 允许 admin 和 user 角色访问GEO相关功能
 */
export function requireGeoAccess(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const allowedRoles = ['admin', 'user'];
    if (!allowedRoles.includes(req.user?.role || '')) {
      res.status(403).json({ error: '无GEO功能访问权限' });
      return;
    }
    next();
  });
}

/**
 * 可选认证中间件（不强制登录）
 * 如果有 Token 则设置 req.user，否则继续
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * 检查用户是否被封禁
 */
export async function checkNotBanned(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: '未认证' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { isBanned: true },
  });

  if (user?.isBanned) {
    res.status(403).json({ error: '账号已被封禁' });
    return;
  }

  next();
}
