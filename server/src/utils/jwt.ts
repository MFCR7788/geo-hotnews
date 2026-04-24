// JWT 工具函数
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db.js';

// Access Token: 1小时有效期
export const ACCESS_TOKEN_EXPIRY = '1h';
// Refresh Token: 7天有效期
export const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * 获取 JWT Secret（强制环境变量，无默认值）
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  return secret;
}

/**
 * 生成 Access Token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    secret, 
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * 生成 Refresh Token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    secret, 
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * 验证 Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 创建一对 Token 并存入数据库
 */
export async function createAuthTokens(user: { id: string; email: string; role: string }): Promise<AuthTokens> {
  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 将 Refresh Token 存入数据库
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

/**
 * 使用 Refresh Token 换取新的 Access Token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  const payload = verifyToken(refreshToken);
  if (!payload) return null;

  // 检查数据库中是否存在该 token
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!stored || stored.expiresAt < new Date()) {
    // Token 过期或不存在
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    return null;
  }

  // 生成新的 Token 对
  const tokens = await createAuthTokens({
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  // 删除旧 Refresh Token（只能单次使用）
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  return tokens;
}

/**
 * 使所有 Refresh Token 失效（登出）
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

/**
 * 使单个 Refresh Token 失效
 */
export async function revokeToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
