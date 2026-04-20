/**
 * ImgBB 图片上传服务
 * 文档：https://api.imgbb.com/
 */

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * 上传图片到 ImgBB
 * @param base64Data Base64 编码的图片数据（不含 data:image/xxx;base64, 前缀）
 * @param filename 文件名
 * @returns 图片 URL
 */
export async function uploadToImgBB(
  base64Data: string,
  filename: string = 'upload.jpg'
): Promise<{ url: string; deleteUrl: string }> {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error('ImgBB API Key 未配置');
  }

  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('image', base64Data);
  formData.append('name', filename);

  try {
    const response = await fetch(IMGBB_API_URL, {
      method: 'POST',
      body: formData
    });

    const result = await response.json() as {
      success: boolean;
      data?: {
        url: string;
        delete_url: string;
      };
      error?: {
        message: string;
      };
    };

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'ImgBB 上传失败');
    }

    return {
      url: result.data.url,
      deleteUrl: result.data.delete_url
    };
  } catch (error) {
    console.error('[ImgBB] 上传失败:', error);
    throw error;
  }
}

/**
 * 处理 Base64 图片数据（移除前缀）
 */
export function parseBase64Image(base64String: string): string {
  // 移除 data:image/xxx;base64, 前缀
  const match = base64String.match(/^data:image\/\w+;base64,(.+)$/);
  if (match) {
    return match[1];
  }
  return base64String;
}

/**
 * 将文件 Buffer 转换为 Base64
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
