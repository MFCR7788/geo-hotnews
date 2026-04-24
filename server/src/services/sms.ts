/**
 * 阿里云短信服务
 */

import crypto from 'crypto';

interface SendSmsResult {
  success: boolean;
  message?: string;
  requestId?: string;
}

const SMS_CONFIG = {
  accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
  signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
  endpoint: 'dysmsapi.aliyuncs.com',
  version: '2017-05-25'
};

function percentEncode(str: string): string {
  const encode = encodeURIComponent(str);
  return encode
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function generateSignature(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  let canonicalString = '';
  for (const key of sortedKeys) {
    canonicalString += `&${percentEncode(key)}=${percentEncode(params[key])}`;
  }
  canonicalString = canonicalString.substring(1);
  
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalString)}`;
  const hmac = crypto.createHmac('sha1', `${secret}&`);
  return hmac.update(stringToSign).digest('base64');
}

export async function sendVerificationCode(phone: string, code: string): Promise<SendSmsResult> {
  if (!SMS_CONFIG.accessKeyId || !SMS_CONFIG.accessKeySecret || !SMS_CONFIG.signName) {
    console.warn('阿里云短信配置未完成，使用模拟发送');
    console.log(`[短信模拟] 向 ${phone} 发送验证码: ${code}`);
    return { success: true, message: '短信已发送（模拟）' };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const timestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  
  const params: Record<string, string> = {
    AccessKeyId: SMS_CONFIG.accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: SMS_CONFIG.signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: SMS_CONFIG.templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: timestamp,
    Version: SMS_CONFIG.version
  };

  const signature = generateSignature(params, SMS_CONFIG.accessKeySecret);
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
  
  const url = `https://${SMS_CONFIG.endpoint}/?${queryString}&Signature=${percentEncode(signature)}`;

  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.Code === 'OK') {
      console.log(`[短信] 成功发送验证码到 ${phone}`);
      return { 
        success: true, 
        message: '短信发送成功',
        requestId: result.RequestId 
      };
    } else {
      console.error(`[短信] 发送失败: ${result.Message}`);
      return { 
        success: false, 
        message: result.Message || '短信发送失败' 
      };
    }
  } catch (error) {
    console.error('[短信] 请求异常:', error);
    return { success: false, message: '短信发送失败' };
  }
}

export function generateVerificationCode(length: number = 6): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
