import Dysmsapi from '@alicloud/dysmsapi20170525';
import OpenApi from '@alicloud/openapi-client';
import Util from '@alicloud/tea-util';

interface SendSmsResult {
  success: boolean;
  message?: string;
  requestId?: string;
}

const Client = Dysmsapi.default || Dysmsapi;
const SendSmsRequest = Dysmsapi.SendSmsRequest;

let smsClient: InstanceType<typeof Client> | null = null;

function getSmsClient(): InstanceType<typeof Client> | null {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    return null;
  }

  if (!smsClient) {
    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com',
    });
    smsClient = new Client(config);
  }

  return smsClient;
}

export async function sendVerificationCode(phone: string, code: string): Promise<SendSmsResult> {
  const client = getSmsClient();
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!client || !signName || !templateCode || !SendSmsRequest) {
    console.warn('[SMS] 阿里云短信未配置，使用模拟发送模式');
    console.log(`[SMS][模拟] 手机号尾号: ${phone.slice(-4)}, 验证码: ${code}`);
    return { success: true, message: '短信已发送（模拟模式）' };
  }

  const sendSmsRequest = new SendSmsRequest({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ code }),
  });

  const runtime = new Util.RuntimeOptions({
    connectTimeout: 10000,
    readTimeout: 10000,
  });

  try {
    const result = await client.sendSmsWithOptions(sendSmsRequest, runtime);

    if (result.body?.code === 'OK') {
      console.log(`[SMS] 验证码发送成功 - 手机号尾号: ${phone.slice(-4)}`);
      return {
        success: true,
        message: '短信发送成功',
        requestId: result.body?.requestId,
      };
    } else {
      console.error(`[SMS] 发送失败 - Code: ${result.body?.code}, Message: ${result.body?.message}`);
      return {
        success: false,
        message: result.body?.message || '短信发送失败',
      };
    }
  } catch (error) {
    console.error('[SMS] 请求异常:', error);
    return { success: false, message: '短信发送失败，请稍后重试' };
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
