import rateLimit from 'express-rate-limit';

export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  message: { error: '注册太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});
