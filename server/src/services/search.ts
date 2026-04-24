import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult } from '../types.js';

// 不走系统代理的 axios 实例
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noProxyAxios = axios.create({ proxy: false } as any);

// User Agent 列表
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

// 频率限制器
class RateLimiter {
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 5000) {
    this.minInterval = minIntervalMs;
  }

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

const bingLimiter = new RateLimiter(5000);
const googleLimiter = new RateLimiter(10000);
const duckduckgoLimiter = new RateLimiter(3000);
const hackernewsLimiter = new RateLimiter(1000); // HN API 更宽松

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function searchBing(query: string): Promise<SearchResult[]> {
  await bingLimiter.wait();

  try {
    const response = await noProxyAxios.get('https://www.bing.com/search', {
      params: {
        q: query,
        count: 20
      },
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];

    $('li.b_algo').each((_, element) => {
      const titleElement = $(element).find('h2 a');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');
      const snippet = $(element).find('.b_caption p').text().trim();

      if (title && url && url.startsWith('http')) {
        results.push({
          title,
          content: snippet,
          url,
          source: 'bing'
        });
      }
    });

    console.log(`Bing search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Bing search error:', error);
    return [];
  }
}

export async function searchGoogle(query: string): Promise<SearchResult[]> {
  await googleLimiter.wait();

  try {
    const response = await noProxyAxios.get('https://www.google.com/search', {
      params: {
        q: query,
        num: 20,
        hl: 'en'
      },
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];

    $('div.g').each((_, element) => {
      const titleElement = $(element).find('h3').first();
      const title = titleElement.text().trim();
      const linkElement = $(element).find('a').first();
      const url = linkElement.attr('href');
      const snippet = $(element).find('.VwiC3b').text().trim();

      if (title && url && url.startsWith('http')) {
        results.push({
          title,
          content: snippet,
          url,
          source: 'google'
        });
      }
    });

    console.log(`Google search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Google search error:', error);
    return [];
  }
}

// DuckDuckGo 搜索（使用 HTML 版本）
export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  await duckduckgoLimiter.wait();

  try {
    const response = await noProxyAxios.get('https://html.duckduckgo.com/html/', {
      params: {
        q: query
      },
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];

    $('.result').each((_, element) => {
      const titleElement = $(element).find('.result__title a');
      const title = titleElement.text().trim();
      const rawUrl = titleElement.attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();

      // DuckDuckGo 使用重定向 URL，需要提取实际 URL
      let url = rawUrl;
      if (rawUrl && rawUrl.includes('uddg=')) {
        try {
          const urlParams = new URLSearchParams(rawUrl.split('?')[1]);
          url = decodeURIComponent(urlParams.get('uddg') || rawUrl);
        } catch {
          url = rawUrl;
        }
      }

      if (title && url && url.startsWith('http')) {
        results.push({
          title,
          content: snippet,
          url,
          source: 'duckduckgo'
        });
      }
    });

    console.log(`DuckDuckGo search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

// Hacker News API（官方免费 API）
interface HNSearchResult {
  hits: Array<{
    objectID: string;
    title: string;
    url: string | null;
    story_text: string | null;
    author: string;
    points: number;
    num_comments: number;
    created_at: string;
  }>;
}

export async function searchHackerNews(query: string): Promise<SearchResult[]> {
  await hackernewsLimiter.wait();

  try {
    // 使用 Algolia 提供的 HN 搜索 API
    const oneDayAgo = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
    const response = await noProxyAxios.get<HNSearchResult>('https://hn.algolia.com/api/v1/search', {
      params: {
        query: query,
        tags: 'story', // 只搜索故事，排除评论
        hitsPerPage: 20,
        numericFilters: `created_at_i>${oneDayAgo}` // 只搜最近24小时
      },
      timeout: 15000
    });

    const results: SearchResult[] = response.data.hits
      .filter(hit => hit.url || hit.story_text) // 确保有内容
      .map(hit => ({
        title: hit.title,
        content: hit.story_text || hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'hackernews' as const,
        sourceId: hit.objectID,
        publishedAt: new Date(hit.created_at),
        score: hit.points,
        commentCount: hit.num_comments,
        author: {
          name: hit.author,
          username: hit.author
        }
      }));

    console.log(`Hacker News search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Hacker News search error:', error);
    return [];
  }
}

// 标准化 URL 用于去重（支持微信等动态 URL）
export function normalizeUrlForDedup(url: string, source: string): string {
  // 搜狗跳转链接：提取目标 URL 参数
  if (source === 'sogou' && url.includes('sogou.com/link')) {
    try {
      const urlObj = new URL(url);
      const target = urlObj.searchParams.get('url');
      if (target) return normalizeUrlForDedup(target, source);
    } catch {}
  }

  // 微信文章
  if (source === 'wechat' || source === 'sogou' || url.includes('mp.weixin.qq.com')) {
    try {
      const urlObj = new URL(url);
      const base = urlObj.origin + urlObj.pathname;

      // 格式1: mp.weixin.qq.com/s?__biz=xxx&mid=xxx&idx=xxx&sn=xxx（标准微信链接）
      const biz = urlObj.searchParams.get('__biz') || urlObj.searchParams.get('biz');
      const mid = urlObj.searchParams.get('mid');
      const idx = urlObj.searchParams.get('idx');
      const sn = urlObj.searchParams.get('sn');

      if (biz && mid && idx && sn) {
        return `${base}?__biz=${biz}&mid=${mid}&idx=${idx}&sn=${sn}`;
      }

      // 格式2: 搜狗微信链接 mp.weixin.qq.com/s?src=11&timestamp=xxx&ver=xxx&signature=xxx
      // 用 signature 去重（同一篇文章 signature 相同，每次请求 timestamp 不同）
      const signature = urlObj.searchParams.get('signature');
      if (signature) {
        // signature 在不同 ver 版本间可能不同，但同一 ver 内唯一
        const ver = urlObj.searchParams.get('ver');
        return `${base}?signature=${signature}&ver=${ver || ''}`;
      }

      // 其他微信链接，去掉所有动态参数
      return base;
    } catch {
      return url;
    }
  }

  // Bilibili 视频：只保留 BV 号
  if (url.includes('bilibili.com/video/')) {
    const match = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
    if (match) return `https://www.bilibili.com/video/${match[1]}`;
  }
  
  // 标准处理：去除尾部斜杠、www 前缀、tracking 参数
  try {
    const urlObj = new URL(url);
    // 去除常见 tracking 参数
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'from', 'isFromMainSearch', 'new'];
    trackingParams.forEach(p => urlObj.searchParams.delete(p));
    const cleaned = urlObj.origin + urlObj.pathname + urlObj.search;
    return cleaned.replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://');
  } catch {
    return url.replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://');
  }
}

// 标准化标题用于去重：去除空白、标点、统一大小写
function normalizeTitleForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')           // 去除所有空白（含全角空格）
    .replace(/[，。！？、；：""''【】《》（）—…·\-.!,?;:'"()\[\]{}<>\/\\@#$%^&*+=|~`]/g, '') // 去除标点
    .slice(0, 50);                          // 取前50字符比较（避免尾部差异干扰）
}

// 去重工具函数（URL + 标题双重去重）
export function deduplicateResults(allResults: SearchResult[]): SearchResult[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  
  return allResults.filter(item => {
    // URL 去重
    const urlKey = normalizeUrlForDedup(item.url, item.source);
    if (seenUrls.has(urlKey)) {
      return false;
    }
    seenUrls.add(urlKey);

    // 标题去重
    const titleKey = normalizeTitleForDedup(item.title);
    if (titleKey.length >= 4 && seenTitles.has(titleKey)) {
      return false;
    }
    if (titleKey.length >= 4) {
      seenTitles.add(titleKey);
    }

    return true;
  });
}

// 聚合搜索（国际搜索引擎）
export async function searchAll(query: string): Promise<SearchResult[]> {
  const results = await Promise.allSettled([
    searchBing(query),
    searchHackerNews(query),
    searchGoogle(query),
    searchDuckDuckGo(query)
  ]);

  const allResults: SearchResult[] = [];
  const sourceNames = ['Bing', 'HackerNews', 'Google', 'DuckDuckGo'];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      console.warn(`${sourceNames[index]} search failed:`, result.reason);
    }
  });

  const uniqueResults = deduplicateResults(allResults);
  console.log(`Search aggregation for "${query}": ${allResults.length} total, ${uniqueResults.length} unique`);
  return uniqueResults;
}
