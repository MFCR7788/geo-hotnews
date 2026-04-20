/**
 * 虎皮椒支付服务
 * 接入文档：https://www.xorpay.com/docs
 */

const API_BASE = process.env.XORPAY_MODE === 'live'
  ? 'https://api.xorpay.com/api'
  : 'https://api.sandbox.xorpay.com/api';

interface XorPayOrder {
  appid: string;
  out_trade_no: string;
  total_fee: string;
  title: string;
  pay_type: 'wechat' | 'alipay';
  notify_url: string;
  return_url?: string;
  sign: string;
}

/**
 * 生成虎皮椒签名
 */
export function generateSign(params: Record<string, string | number>): string {
  const crypto = require('crypto');
  // 虎皮椒使用 app_secret 作为签名密钥
  const appKey = process.env.XORPAY_APP_SECRET || process.env.XORPAY_APP_KEY || '';

  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== undefined && params[k] !== '')
    .map(k => `${k}=${params[k]}`)
    .join('&') + appKey;

  return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * 验证虎皮椒回调签名
 */
export function verifyXorPayCallback(params: Record<string, string>): boolean {
  const { sign, ...rest } = params;
  if (!sign) return false;

  const expectedSign = generateSign(rest as Record<string, string | number>);
  return sign.toLowerCase() === expectedSign.toLowerCase();
}

/**
 * 创建虎皮椒支付订单
 */
export async function createXorPayOrder(options: {
  orderNo: string;
  amount: number;
  title: string;
  payChannel: 'wechat' | 'alipay';
  returnUrl?: string;
}): Promise<{ payUrl: string; qrCode?: string }> {
  const appId = process.env.XORPAY_APP_ID;
  const appKey = process.env.XORPAY_APP_SECRET || process.env.XORPAY_APP_KEY;
  const callbackUrl = process.env.XORPAY_CALLBACK_URL;

  if (!appId || !appKey) {
    throw new Error('虎皮椒未配置，请检查环境变量');
  }

  // 沙箱模式返回模拟支付链接
  if (process.env.XORPAY_MODE === 'sandbox') {
    console.log('[XorPay] 沙箱模式 - 模拟支付链接');
    return {
      payUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/sandbox-success?orderNo=${options.orderNo}`,
      qrCode: undefined
    };
  }

  const params: Record<string, string | number> = {
    appid: appId,
    out_trade_no: options.orderNo,
    total_fee: options.amount.toString(),
    title: options.title,
    pay_type: options.payChannel,
    notify_url: callbackUrl || '',
    return_url: options.returnUrl || ''
  };

  params.sign = generateSign(params);

  const formData = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  try {
    const response = await fetch(`${API_BASE}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const result = await response.json() as { code: number; url?: string; qrcode?: string; msg?: string };

    if (result.code !== 1) {
      throw new Error(result.msg || '虎皮椒下单失败');
    }

    return {
      payUrl: result.url || '',
      qrCode: result.qrcode
    };
  } catch (error) {
    console.error('[XorPay] 创建订单失败:', error);
    throw error;
  }
}

/**
 * 查询虎皮椒订单状态
 */
export async function queryXorPayOrder(orderNo: string): Promise<{
  status: string;
  tradeNo?: string;
  paidAt?: string;
}> {
  if (process.env.XORPAY_MODE === 'sandbox') {
    return { status: 'TRADE_SUCCESS' };
  }

  const appId = process.env.XORPAY_APP_ID;
  const appKey = process.env.XORPAY_APP_SECRET || process.env.XORPAY_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('虎皮椒未配置');
  }

  const params: Record<string, string | number> = {
    appid: appId,
    out_trade_no: orderNo
  };

  params.sign = generateSign(params);

  const formData = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  try {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const result = await response.json() as { code: number; status?: string; trade_no?: string; paytime?: string };

    if (result.code !== 1) {
      return { status: 'TRADE_FAIL' };
    }

    return {
      status: result.status || 'TRADE_SUCCESS',
      tradeNo: result.trade_no,
      paidAt: result.paytime
    };
  } catch (error) {
    console.error('[XorPay] 查询订单失败:', error);
    throw error;
  }
}
