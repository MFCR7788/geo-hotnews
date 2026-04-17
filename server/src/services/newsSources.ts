/**
 * 新增数据源模块
 * - 知乎热榜（公开API）
 * - 36氪（RSS）
 * - 今日头条热榜（公开API）
 * - 澎湃新闻 RSS
 * - 虎嗅网 RSS
 * - 少数派 RSS
 * - 通用 RSS 订阅
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import RSSParser from 'rss-parser';
import type { SearchResult } from '../types.js';

// 不走系统代理的 axios 实例
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noProxyAxios = axios.create({ proxy: false } as any);

const rssParser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
});

// 频率限制器
class RateLimiter {
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 3000) {
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

const zhihuLimiter = new RateLimiter(3000);
const toutiaolimiter = new RateLimiter(3000);
const rssLimiter = new RateLimiter(1000);

// ============================================================
// 知乎热榜（网页抓取，备用）
// ============================================================

export async function searchZhihu(query: string): Promise<SearchResult[]> {
  await zhihuLimiter.wait();

  try {
    // 知乎热榜页面抓取
    const response = await noProxyAxios.get(
      'https://www.zhihu.com/hot',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://www.zhihu.com/'
        },
        timeout: 15000
      }
    );

    const $ = cheerio.load(response.data);
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    // 知乎热榜项目解析（新版知乎 HTML 结构）
    $('[data-za-extra-module]').each((_, el) => {
      const titleEl = $(el).find('h2').first() || $(el).find('[class*="title"]').first();
      const title = titleEl.text().trim();
      const aTag = $(el).find('a').first();
      const url = aTag.attr('href') || '';

      if (title && url) {
        const combined = title.toLowerCase();
        if (combined.includes(queryLower) || queryLower.split(' ').some(w => w.length > 1 && combined.includes(w))) {
          results.push({
            title: `🔥 知乎热榜：${title}`,
            content: title,
            url: url.startsWith('http') ? url : `https://www.zhihu.com${url}`,
            source: 'zhihu' as any
          });
        }
      }
    });

    console.log(`Zhihu hot for "${query}": ${results.length} matches`);
    return results;
  } catch (error) {
    console.error('Zhihu hot scrape error:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ============================================================
// 今日头条热榜（公开接口）
// ============================================================

interface ToutiaoItem {
  ClusterId?: number | string;
  Title?: string;
  LabelUrl?: string;
  Label?: string;
  Url?: string;
  HotValue?: number | string;
  Schema?: string;
  ClusterIdStr?: string;
  ClusterType?: number;
  QueryWord?: string;
  Image?: string;
}

export async function searchToutiao(query: string): Promise<SearchResult[]> {
  await toutiaolimiter.wait();

  try {
    // 头条热搜 API（注意：返回字段是大写开头）
    const response = await axios.get<{ data?: ToutiaoItem[] }>(
      'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.toutiao.com/'
        },
        timeout: 15000
      }
    );

    const data = response.data?.data || [];
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const item of data) {
      const title = (item.Title || '').toString();
      const label = (item.Label || '').toString();
      const combined = (title + ' ' + label).toLowerCase();

      if (combined.includes(queryLower) || queryLower.split(' ').some(w => w.length > 1 && combined.includes(w))) {
        const hotValue = typeof item.HotValue === 'string' 
          ? parseInt(item.HotValue.replace(/,/g, '')) 
          : (item.HotValue as number) || 0;
        results.push({
          title: `🔥 头条热搜：${title}`,
          content: label || title,
          url: item.Url || item.Schema || `https://www.toutiao.com/search?keyword=${encodeURIComponent(title)}`,
          source: 'toutiao' as any,
          viewCount: hotValue
        });
      }
    }

    console.log(`Toutiao hot search for "${query}": ${results.length} matches from ${data.length} total`);
    return results;
  } catch (error) {
    console.error('Toutiao hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ============================================================
// 通用 RSS 解析器
// ============================================================

export interface RSSFeed {
  name: string;
  url: string;
  source: string;
  category?: string;
}

// 内置精选 RSS 源（已验证可用）
export const PRESET_RSS_FEEDS: RSSFeed[] = [
  // 科技资讯
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', source: 'ifanr', category: '科技' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', source: 'ithome', category: '科技' },
  // AI/技术
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', source: 'mit-tr', category: 'AI' }
];

async function fetchRSSFeed(feed: RSSFeed, query: string): Promise<SearchResult[]> {
  await rssLimiter.wait();

  try {
    const parsedFeed = await rssParser.parseURL(feed.url);
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];
    const threeDaysAgo = Date.now() - 3 * 24 * 3600 * 1000;

    for (const item of parsedFeed.items || []) {
      const title = item.title || '';
      const content = item.contentSnippet || item.content || item.summary || '';
      const combined = (title + ' ' + content).toLowerCase();
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;

      // 时效性过滤：放宽到3天内的内容
      if (pubDate && pubDate.getTime() < threeDaysAgo) continue;

      // 关键词匹配
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
      const isMatch = combined.includes(queryLower) || queryWords.some(w => combined.includes(w));

      if (isMatch && item.link) {
        results.push({
          title: `[${feed.name}] ${title}`,
          content: content.slice(0, 300) || title,
          url: item.link,
          source: feed.source as any,
          publishedAt: pubDate || undefined,
          author: item.creator ? { name: item.creator } : undefined
        });
      }
    }

    if (results.length > 0) {
      console.log(`RSS [${feed.name}] matched ${results.length} articles for "${query}"`);
    }
    return results;
  } catch (error) {
    // 超时或网络问题静默处理（RSS源不稳定是常态）
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('timeout') && !msg.includes('ETIMEDOUT') && !msg.includes('ENOTFOUND')) {
      console.warn(`RSS fetch error [${feed.name}]:`, msg);
    }
    return [];
  }
}

/**
 * 搜索所有预设 RSS 源
 */
export async function searchRSSFeeds(query: string, feedUrls?: string[]): Promise<SearchResult[]> {
  let feeds = PRESET_RSS_FEEDS;

  // 如果有自定义 RSS 源，合并进去
  if (feedUrls && feedUrls.length > 0) {
    const customFeeds: RSSFeed[] = feedUrls.map(url => ({
      name: url,
      url,
      source: 'custom-rss' as string,
      category: '自定义'
    }));
    feeds = [...feeds, ...customFeeds];
  }

  const results = await Promise.allSettled(feeds.map(feed => fetchRSSFeed(feed, query)));

  const allResults: SearchResult[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      console.warn(`RSS feed [${feeds[i].name}] failed:`, result.reason?.message);
    }
  });

  console.log(`RSS total: ${allResults.length} results for "${query}"`);
  return allResults;
}

// ============================================================
// 知乎搜索（关键词搜索，补充热榜）
// ============================================================
export async function searchZhihuKeyword(query: string): Promise<SearchResult[]> {
  await zhihuLimiter.wait();

  try {
    const response = await noProxyAxios.get(
      'https://www.zhihu.com/api/v4/search_v3',
      {
        params: {
          t: 'general',
          q: query,
          correction: 1,
          offset: 0,
          limit: 20,
          filter_fields: '',
          lc_idx: 0,
          show_all_topics: 0
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`,
          'x-requested-with': 'fetch'
        },
        timeout: 15000
      }
    );

    const items = response.data?.data || [];
    const results: SearchResult[] = [];

    for (const item of items) {
      const obj = item.object;
      if (!obj) continue;

      let title = '';
      let content = '';
      let url = '';
      let viewCount = 0;

      if (obj.type === 'question') {
        title = obj.title || '';
        content = obj.excerpt || '';
        url = `https://www.zhihu.com/question/${obj.id}`;
        viewCount = obj.answer_count || 0;
      } else if (obj.type === 'answer') {
        title = obj.question?.title || '';
        content = obj.excerpt || obj.content || '';
        url = `https://www.zhihu.com/question/${obj.question?.id}/answer/${obj.id}`;
        viewCount = obj.voteup_count || 0;
      } else if (obj.type === 'article') {
        title = obj.title || '';
        content = obj.excerpt || '';
        url = `https://zhuanlan.zhihu.com/p/${obj.id}`;
        viewCount = obj.voteup_count || 0;
      }

      if (title && url) {
        results.push({
          title: `[知乎] ${title}`,
          content: content.slice(0, 300) || title,
          url,
          source: 'zhihu' as any,
          publishedAt: obj.created_time ? new Date(obj.created_time * 1000) : undefined,
          viewCount,
          author: obj.author?.name ? { name: obj.author.name } : undefined
        });
      }
    }

    console.log(`Zhihu keyword search for "${query}": ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Zhihu keyword search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ============================================================
// 聚合：所有新增数据源
// ============================================================
export async function searchAllNewSources(query: string, customRSSFeeds?: string[]): Promise<SearchResult[]> {
  const results = await Promise.allSettled([
    searchZhihu(query),
    searchZhihuKeyword(query),
    searchToutiao(query),
    searchRSSFeeds(query, customRSSFeeds)
  ]);

  const allResults: SearchResult[] = [];
  const sourceNames = ['知乎热榜', '知乎搜索', '今日头条', 'RSS聚合'];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
      if (result.value.length > 0) {
        console.log(`  ${sourceNames[index]}: ${result.value.length} results`);
      }
    } else {
      console.warn(`  ${sourceNames[index]} failed:`, result.reason?.message);
    }
  });

  return allResults;
}
