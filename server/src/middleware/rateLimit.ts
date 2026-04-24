import rateLimit from 'express-rate-limit';

// 注册限流：同一 IP 每分钟最多 3 次
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  message: { error: '注册太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

// 登录限流：同一 IP 每分钟最多 10 次（防暴力破解）
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

// 通用 API 限流：每分钟 100 次
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health', // 健康检查不限流
  validate: { keyGeneratorIpFallback: false },
});
