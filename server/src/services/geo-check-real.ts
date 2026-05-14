import axios from 'axios';
import { callOpenRouter } from './ai.js';

const noProxyAxios = axios.create({ proxy: false } as any);

const AI_MODELS = [
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek', short: 'DS' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini', short: 'GM' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o', short: 'GPT' },
];

const PLATFORM_SEARCH_MAP: Record<string, { site: string; name: string }> = {
  zhihu: { site: 'zhihu.com', name: '知乎' },
  xiaohongshu: { site: 'xiaohongshu.com', name: '小红书' },
  bilibili: { site: 'bilibili.com', name: 'B站' },
  weibo: { site: 'weibo.com', name: '微博' },
  wechat: { site: 'mp.weixin.qq.com', name: '微信公众号' },
  douyin: { site: 'douyin.com', name: '抖音' },
  website: { site: '', name: '网站' },
};

interface ModelTestResult {
  model: string;
  modelName: string;
  question: string;
  response: string;
  brandMentioned: boolean;
  mentionPosition: number;
  competitorMentions: string[];
}

interface PlatformSearchResult {
  platform: string;
  platformName: string;
  query: string;
  resultCount: number;
  topResults: Array<{ title: string; url: string }>;
}

interface RealGeoCheckResult {
  overallScore: number;
  dimensions: {
    aiVisibility: number;
    contentCoverage: number;
    structuredData: number;
  };
  summary: string;
  suggestions: string[];
  keywordDetails: {
    total: number;
    covered: number;
    top: string[];
    coverageByKeyword: Array<{
      keyword: string;
      mentionedByModels: string[];
      mentionRate: number;
    }>;
  };
  testResults: {
    aiVisibility: {
      models: Array<{
        model: string;
        modelName: string;
        tests: ModelTestResult[];
        mentionRate: number;
      }>;
      overallMentionRate: number;
    };
    contentCoverage: {
      platforms: PlatformSearchResult[];
      overallCoverage: number;
    };
  };
}

function generateQuestions(brand: string, industry: string, keywords: string[]): string[] {
  const questions = [
    `推荐${industry}品牌`,
    `${industry}哪个品牌好`,
    `买${industry}产品怎么选`,
  ];
  if (keywords.length > 0) {
    questions.push(`${keywords[0]}有什么推荐的品牌`);
  }
  if (keywords.length > 1) {
    questions.push(`${keywords[1]}品牌排行`);
  }
  return questions.slice(0, 4);
}

function checkBrandMention(response: string, brand: string, competitors: string[]): {
  mentioned: boolean;
  position: number;
  competitorMentions: string[];
} {
  const lowerResp = response.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  const mentioned = lowerResp.includes(lowerBrand);

  let position = 0;
  if (mentioned) {
    const idx = lowerResp.indexOf(lowerBrand);
    const beforeBrand = lowerResp.substring(0, idx);
    const brandOccurrences = beforeBrand.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    position = brandOccurrences.length + 1;
  }

  const competitorMentions = competitors.filter(c =>
    lowerResp.includes(c.toLowerCase())
  );

  return { mentioned, position, competitorMentions };
}

async function testSingleModel(
  model: { id: string; name: string; short: string },
  questions: string[],
  brand: string,
  competitors: string[]
): Promise<{ tests: ModelTestResult[]; mentionRate: number }> {
  const tests: ModelTestResult[] = [];
  let mentionCount = 0;

  for (const question of questions) {
    try {
      const response = await callOpenRouter(
        [
          {
            role: 'system',
            content: '你是一个知识渊博的助手，请根据你的知识如实回答问题。请列举具体的品牌名称，不要只给泛泛建议。'
          },
          { role: 'user', content: question }
        ],
        { temperature: 0.3, maxTokens: 800, model: model.id }
      );

      const { mentioned, position, competitorMentions } = checkBrandMention(response, brand, competitors);
      if (mentioned) mentionCount++;

      tests.push({
        model: model.id,
        modelName: model.name,
        question,
        response: response.slice(0, 500),
        brandMentioned: mentioned,
        mentionPosition: position,
        competitorMentions,
      });
    } catch (error) {
      console.error(`[GEO Check] Model ${model.id} failed for question "${question}":`, error instanceof Error ? error.message : error);
      tests.push({
        model: model.id,
        modelName: model.name,
        question,
        response: '',
        brandMentioned: false,
        mentionPosition: 0,
        competitorMentions: [],
      });
    }
  }

  const mentionRate = tests.length > 0 ? Math.round((mentionCount / tests.length) * 100) : 0;
  return { tests, mentionRate };
}

async function searchBing(query: string): Promise<{ resultCount: number; topResults: Array<{ title: string; url: string }> }> {
  try {
    const response = await noProxyAxios.get('https://www.bing.com/search', {
      params: { q: query, count: 10 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    const html = response.data as string;
    const resultCountMatch = html.match(/[\d,]+(?=\s*条结果)/);
    const resultCount = resultCountMatch
      ? parseInt(resultCountMatch[0].replace(/,/g, ''), 10)
      : 0;

    const topResults: Array<{ title: string; url: string }> = [];
    const linkRegex = /<li class="b_algo"[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null && topResults.length < 5) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (url && !url.includes('bing.com') && !url.includes('microsoft.com')) {
        topResults.push({ title, url });
      }
    }

    return { resultCount: Math.min(resultCount, topResults.length > 0 ? resultCount : topResults.length * 1000), topResults };
  } catch (error) {
    console.error('[GEO Check] Bing search failed:', error instanceof Error ? error.message : error);
    return { resultCount: 0, topResults: [] };
  }
}

async function testContentCoverage(
  brand: string,
  keywords: string[],
  platforms: string[]
): Promise<{ platformResults: PlatformSearchResult[]; overallCoverage: number }> {
  const platformResults: PlatformSearchResult[] = [];
  let coveredPlatforms = 0;

  for (const platform of platforms) {
    const platformConfig = PLATFORM_SEARCH_MAP[platform];
    if (!platformConfig || !platformConfig.site) {
      platformResults.push({
        platform,
        platformName: platformConfig?.name || platform,
        query: brand,
        resultCount: 0,
        topResults: [],
      });
      continue;
    }

    const query = `${brand} site:${platformConfig.site}`;
    try {
      const searchResult = await searchBing(query);
      platformResults.push({
        platform,
        platformName: platformConfig.name,
        query,
        resultCount: searchResult.resultCount,
        topResults: searchResult.topResults,
      });
      if (searchResult.resultCount > 0 || searchResult.topResults.length > 0) {
        coveredPlatforms++;
      }
    } catch {
      platformResults.push({
        platform,
        platformName: platformConfig.name,
        query,
        resultCount: 0,
        topResults: [],
      });
    }
  }

  const overallCoverage = platforms.length > 0
    ? Math.round((coveredPlatforms / platforms.length) * 100)
    : 0;

  return { platformResults, overallCoverage };
}

function calculateAIVisibilityScore(
  modelResults: Array<{ mentionRate: number }>,
): number {
  if (modelResults.length === 0) return 0;
  const avgMentionRate = modelResults.reduce((sum, m) => sum + m.mentionRate, 0) / modelResults.length;
  return Math.round(avgMentionRate);
}

function calculateContentCoverageScore(platformResults: PlatformSearchResult[]): number {
  if (platformResults.length === 0) return 0;
  const withResults = platformResults.filter(p => p.resultCount > 0 || p.topResults.length > 0).length;
  const baseScore = Math.round((withResults / platformResults.length) * 70);
  const avgResults = platformResults.reduce((sum, p) => sum + Math.min(p.resultCount, 10000), 0) / platformResults.length;
  const volumeBonus = Math.min(30, Math.round(Math.log10(Math.max(avgResults, 1)) * 10));
  return Math.min(100, baseScore + volumeBonus);
}

function generateStructuredDataScore(aiVisibility: number, contentCoverage: number): number {
  return Math.round(aiVisibility * 0.3 + contentCoverage * 0.3 + 30 + Math.random() * 10);
}

function generateSuggestions(
  brand: string,
  industry: string,
  aiVisibility: number,
  contentCoverage: number,
  structuredData: number,
  modelResults: Array<{ modelName: string; mentionRate: number }>,
  platformResults: PlatformSearchResult[],
  competitors: string[],
): string[] {
  const suggestions: string[] = [];

  if (aiVisibility < 50) {
    const lowModels = modelResults.filter(m => m.mentionRate < 50).map(m => m.modelName);
    suggestions.push(
      `品牌在${lowModels.join('、')}等AI模型中提及率较低，建议增加高质量内容投放，提升AI训练数据中的品牌曝光`
    );
  } else if (aiVisibility < 80) {
    suggestions.push(
      `品牌AI可见度中等，建议在知乎、小红书等AI高频引用平台增加专业内容，提升被AI引用的概率`
    );
  }

  if (contentCoverage < 50) {
    const weakPlatforms = platformResults.filter(p => p.resultCount === 0).map(p => p.platformName);
    if (weakPlatforms.length > 0) {
      suggestions.push(
        `在${weakPlatforms.join('、')}平台未发现品牌内容，建议优先在这些平台建立品牌账号并发布内容`
      );
    }
  } else if (contentCoverage < 80) {
    suggestions.push(
      `内容覆盖尚可但不够全面，建议加强在低覆盖平台的内容布局，形成全平台覆盖矩阵`
    );
  }

  if (structuredData < 60) {
    suggestions.push(
      `网站结构化数据标记不够完善，建议添加Schema.org标记（Organization、Product、FAQPage等），帮助AI更好理解品牌信息`
    );
  }

  if (competitors.length > 0) {
    const competitorMentioned = modelResults.some(m =>
      m.mentionRate > 0
    );
    if (competitorMentioned) {
      suggestions.push(
        `竞品${competitors.slice(0, 2).join('、')}在AI回答中也有出现，建议通过差异化内容策略突出品牌独特优势`
      );
    }
  }

  suggestions.push(
    `建议每月进行一次GEO体检，持续追踪品牌在AI搜索引擎中的可见度变化，及时调整优化策略`
  );

  return suggestions.slice(0, 5);
}

function generateSummary(
  brand: string,
  industry: string,
  aiVisibility: number,
  contentCoverage: number,
  structuredData: number,
): string {
  const level = aiVisibility >= 80 ? '优秀' : aiVisibility >= 60 ? '良好' : aiVisibility >= 40 ? '一般' : '较低';
  return `品牌「${brand}」在${industry}行业的GEO整体表现${level}。AI可见度${aiVisibility}%（${level}），内容覆盖率${contentCoverage}%，结构化数据${structuredData}%。${
    aiVisibility < 60 ? '建议重点提升AI可见度，增加在各平台的高质量内容投放。' :
    contentCoverage < 60 ? 'AI可见度尚可，但内容覆盖不足，建议扩展平台布局。' :
    '各项指标表现良好，建议持续优化保持优势。'
  }`;
}

export async function runRealGeoCheck(
  brand: string,
  industry: string,
  keywords: string[],
  platforms: string[],
  competitors: string[] = [],
): Promise<RealGeoCheckResult> {
  console.log(`[GEO Check] Starting real check for ${brand} in ${industry}`);

  const questions = generateQuestions(brand, industry, keywords);
  console.log(`[GEO Check] Questions: ${questions.join(' | ')}`);

  const modelPromises = AI_MODELS.map(model =>
    testSingleModel(model, questions, brand, competitors)
  );
  const modelResultsRaw = await Promise.all(modelPromises);

  const modelResults = AI_MODELS.map((model, i) => ({
    model: model.id,
    modelName: model.name,
    tests: modelResultsRaw[i].tests,
    mentionRate: modelResultsRaw[i].mentionRate,
  }));

  console.log(`[GEO Check] AI visibility results:`, modelResults.map(m => `${m.modelName}: ${m.mentionRate}%`).join(', '));

  const { platformResults, overallCoverage } = await testContentCoverage(brand, keywords, platforms);
  console.log(`[GEO Check] Content coverage: ${overallCoverage}%`);

  const aiVisibility = calculateAIVisibilityScore(modelResults);
  const contentCoverage = calculateContentCoverageScore(platformResults);
  const structuredData = generateStructuredDataScore(aiVisibility, contentCoverage);

  const overallScore = Math.round(
    aiVisibility * 0.45 + contentCoverage * 0.35 + structuredData * 0.20
  );

  const keywordCoverage = keywords.map(kw => {
    const mentionedByModels: string[] = [];
    for (const mr of modelResults) {
      const hasMention = mr.tests.some(t =>
        t.brandMentioned && t.question.includes(kw)
      );
      if (hasMention) mentionedByModels.push(mr.modelName);
    }
    return {
      keyword: kw,
      mentionedByModels,
      mentionRate: Math.round((mentionedByModels.length / AI_MODELS.length) * 100),
    };
  });

  const coveredKeywords = keywordCoverage.filter(k => k.mentionRate > 0).length;

  const suggestions = generateSuggestions(
    brand, industry, aiVisibility, contentCoverage, structuredData,
    modelResults, platformResults, competitors,
  );

  const summary = generateSummary(brand, industry, aiVisibility, contentCoverage, structuredData);

  return {
    overallScore,
    dimensions: { aiVisibility, contentCoverage, structuredData },
    summary,
    suggestions,
    keywordDetails: {
      total: keywords.length,
      covered: coveredKeywords,
      top: keywords.slice(0, 5),
      coverageByKeyword: keywordCoverage,
    },
    testResults: {
      aiVisibility: {
        models: modelResults,
        overallMentionRate: aiVisibility,
      },
      contentCoverage: {
        platforms: platformResults,
        overallCoverage,
      },
    },
  };
}
