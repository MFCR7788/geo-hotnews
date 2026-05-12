import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { SearchResult } from '../types.js';

const chinaSearchAxios = axios.create({ timeout: 15000 });

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

class RateLimiter {
  private lastRequestTime = 0;
  private minInterval: number;
  constructor(minIntervalMs: number = 5000) { this.minInterval = minIntervalMs; }
  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minInterval) await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    this.lastRequestTime = Date.now();
  }
}

const sogouLimiter = new RateLimiter(3000);
const bilibiliLimiter = new RateLimiter(2000);
const weiboLimiter = new RateLimiter(5000);
const baiduLimiter = new RateLimiter(5000);
const douyinLimiter = new RateLimiter(5000);
const zhihuLimiter = new RateLimiter(5000);
const toutiaoLimiter = new RateLimiter(5000);

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function searchSogou(query: string): Promise<SearchResult[]> {
  await sogouLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://www.sogou.com/web', {
      params: { query, ie: 'utf-8' },
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
      timeout: 15000, maxRedirects: 5
    });
    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];
    $('.vrwrap, .rb').each((_, element) => {
      const titleElement = $(element).find('h3 a, .vr-title a, .vrTitle a').first();
      const title = titleElement.text().trim();
      let url = titleElement.attr('href') || '';
      if (url.startsWith('/link?url=')) url = `https://www.sogou.com${url}`;
      const snippet = $(element).find('.space-txt, .str-text-info, .str_info, .text-layout').text().trim() || $(element).find('p').first().text().trim();
      if (title && url && !title.includes('大家还在搜')) {
        results.push({ title, content: snippet || title, url, source: 'sogou' as const });
      }
    });
    console.log(`Sogou search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Sogou search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

interface BilibiliSearchResponse { code: number; data?: { result?: BilibiliVideoResult[] }; }
interface BilibiliVideoResult { aid: number; bvid: string; title: string; description: string; author: string; mid: number; pic: string; play: number; favorites: number; review: number; danmaku: number; like: number; pubdate: number; tag: string; }
interface BilibiliUserSearchResponse { code: number; data?: { result?: BilibiliUserResult[] }; }
interface BilibiliUserResult { mid: number; uname: string; usign: string; fans: number; videos: number; upic: string; official_verify: { type: number; desc: string; }; }
interface BilibiliSpaceResponse { code: number; data?: { list?: { vlist?: BilibiliSpaceVideo[] }; }; }
interface BilibiliSpaceVideo { aid: number; bvid: string; title: string; description: string; author: string; mid: number; pic: string; play: number; favorites: number; review: number; comment: number; danmaku: number; created: number; }

export async function searchBilibili(query: string): Promise<SearchResult[]> {
  await bilibiliLimiter.wait();
  try {
    const buvid3 = `${crypto.randomUUID()}infoc`;
    const threeDaysAgo = Math.floor((Date.now() - 3 * 24 * 3600 * 1000) / 1000);
    const response = await chinaSearchAxios.get<BilibiliSearchResponse>(
      'https://api.bilibili.com/x/web-interface/search/type',
      {
        params: { keyword: query, search_type: 'video', order: 'pubdate', page: 1, pagesize: 20 },
        headers: { 'User-Agent': getRandomUserAgent(), 'Referer': 'https://search.bilibili.com/', 'Accept': 'application/json', 'Cookie': `buvid3=${buvid3}` },
        timeout: 15000
      }
    );
    if (response.data.code !== 0 || !response.data.data?.result) return [];
    const results: SearchResult[] = response.data.data.result
      .filter(video => video.pubdate >= threeDaysAgo)
      .map(video => ({
        title: video.title.replace(/<\/?em[^>]*>/g, ''),
        content: video.description || video.title.replace(/<\/?em[^>]*>/g, ''),
        url: `https://www.bilibili.com/video/${video.bvid}`,
        source: 'bilibili' as const,
        sourceId: video.bvid,
        publishedAt: new Date(video.pubdate * 1000),
        viewCount: video.play,
        likeCount: video.like,
        commentCount: video.review,
        danmakuCount: video.danmaku,
        author: { name: video.author, username: String(video.mid) }
      }));
    console.log(`Bilibili search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Bilibili search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function searchBilibiliUser(keyword: string): Promise<BilibiliUserResult | null> {
  await bilibiliLimiter.wait();
  try {
    const response = await axios.get<BilibiliUserSearchResponse>('https://api.bilibili.com/x/web-interface/search/type', {
      params: { keyword, search_type: 'bili_user', page: 1, pagesize: 5 },
      headers: { 'User-Agent': getRandomUserAgent(), 'Referer': 'https://search.bilibili.com/', 'Accept': 'application/json' },
      timeout: 15000
    });
    if (response.data.code !== 0 || !response.data.data?.result?.length) return null;
    const exactMatch = response.data.data.result.find(u => u.uname === keyword || u.uname.toLowerCase() === keyword.toLowerCase());
    if (exactMatch) return exactMatch;
    const topResult = response.data.data.result[0];
    if (topResult.fans > 1000 && topResult.uname.includes(keyword)) return topResult;
    return null;
  } catch (error) { return null; }
}

export async function getBilibiliUserVideos(mid: number): Promise<SearchResult[]> {
  await bilibiliLimiter.wait();
  try {
    const response = await axios.get<BilibiliSpaceResponse>('https://api.bilibili.com/x/space/arc/search', {
      params: { mid, pn: 1, ps: 10, order: 'pubdate' },
      headers: { 'User-Agent': getRandomUserAgent(), 'Referer': `https://space.bilibili.com/${mid}`, 'Accept': 'application/json' },
      timeout: 15000
    });
    if (response.data.code !== 0 || !response.data.data?.list?.vlist) return [];
    const threeDaysAgo = Math.floor((Date.now() - 3 * 24 * 3600 * 1000) / 1000);
    return response.data.data.list.vlist
      .filter(v => v.created >= threeDaysAgo)
      .map(video => ({
        title: video.title, content: video.description || video.title,
        url: `https://www.bilibili.com/video/${video.bvid}`, source: 'bilibili' as const,
        sourceId: video.bvid, publishedAt: new Date(video.created * 1000),
        viewCount: video.play, commentCount: video.comment || video.review, danmakuCount: video.danmaku,
        author: { name: video.author, username: String(video.mid) }
      }));
  } catch (error) { return []; }
}

export async function searchWeibo(query: string): Promise<SearchResult[]> {
  await weiboLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://weibo.com/ajax/side/hotSearch', {
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'application/json', 'Referer': 'https://weibo.com/' },
      timeout: 15000
    });
    if (response.data?.ok !== 1 || !response.data?.data?.realtime) return [];
    const hotItems = response.data.data.realtime;
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    for (const item of hotItems) {
      const word = (item.note || item.word || '').toLowerCase();
      const isMatch = queryWords.some(qw => word.includes(qw) || qw.includes(word)) || word.includes(queryLower) || queryLower.includes(word);
      if (isMatch) {
        const topicName = item.note || item.word;
        results.push({
          title: `微博热搜: ${topicName}`,
          content: `微博热搜话题「${topicName}」，热度 ${item.num?.toLocaleString() || '未知'}`,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + topicName + '#')}`,
          source: 'weibo' as const,
          viewCount: item.num || 0
        });
      }
    }
    console.log(`Weibo hot search: ${results.length} matches for "${query}"`);
    return results;
  } catch (error) {
    console.error('Weibo hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function searchBaiduHot(query: string): Promise<SearchResult[]> {
  await baiduLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://top.baidu.com/board?tab=realtime', {
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
      timeout: 15000
    });
    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    $('.category-wrap_iQLoo .c-single-text-ellipsis').each((_, el) => {
      const title = $(el).text().trim();
      if (!title) return;
      const titleLower = title.toLowerCase();
      const isMatch = queryWords.some(qw => titleLower.includes(qw) || qw.includes(titleLower)) || titleLower.includes(queryLower);
      if (isMatch) {
        const parent = $(el).closest('a');
        const href = parent.attr('href') || '';
        results.push({
          title: `百度热搜: ${title}`,
          content: title,
          url: href.startsWith('http') ? href : `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
          source: 'baidu' as const
        });
      }
    });
    if (results.length === 0) {
      let count = 0;
      $('.category-wrap_iQLoo .c-single-text-ellipsis').each((_, el) => {
        if (count >= 5) return false;
        const title = $(el).text().trim();
        if (!title) return;
        const parent = $(el).closest('a');
        const href = parent.attr('href') || '';
        results.push({
          title: `百度热搜: ${title}`,
          content: title,
          url: href.startsWith('http') ? href : `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
          source: 'baidu' as const
        });
        count++;
      });
    }
    console.log(`Baidu hot search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Baidu hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function searchDouyinHot(query: string): Promise<SearchResult[]> {
  await douyinLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://www.douyin.com/aweme/v1/web/hot/search/list/', {
      params: { device_platform: 'webapp', aid: '6383' },
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'application/json', 'Referer': 'https://www.douyin.com/' },
      timeout: 15000
    });
    const wordList = response.data?.data?.word_list;
    if (!Array.isArray(wordList)) return [];
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    for (const item of wordList) {
      const word = (item.word || '').toLowerCase();
      const isMatch = queryWords.some(qw => word.includes(qw) || qw.includes(word)) || word.includes(queryLower);
      if (isMatch) {
        results.push({
          title: `抖音热搜: ${item.word}`,
          content: `抖音热搜话题「${item.word}」，热度 ${item.hot_value || '未知'}`,
          url: `https://www.douyin.com/search/${encodeURIComponent(item.word)}`,
          source: 'douyin' as const,
          viewCount: item.hot_value || 0
        });
      }
    }
    console.log(`Douyin hot search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Douyin hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function searchZhihuHot(query: string): Promise<SearchResult[]> {
  await zhihuLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total', {
      params: { limit: 50 },
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'application/json', 'Referer': 'https://www.zhihu.com/hot' },
      timeout: 15000
    });
    const data = response.data?.data || [];
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    for (const item of data) {
      const target = item.target;
      if (!target) continue;
      const title = target.title || '';
      const titleLower = title.toLowerCase();
      const isMatch = queryWords.some(qw => titleLower.includes(qw) || qw.includes(titleLower)) || titleLower.includes(queryLower);
      if (isMatch) {
        results.push({
          title: `知乎热榜: ${title}`,
          content: target.excerpt || title,
          url: `https://www.zhihu.com/question/${target.id}`,
          source: 'zhihu' as const,
          viewCount: target.visits_count || 0
        });
      }
    }
    console.log(`Zhihu hot search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Zhihu hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function searchToutiaoHot(query: string): Promise<SearchResult[]> {
  await toutiaoLimiter.wait();
  try {
    const response = await chinaSearchAxios.get('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
      headers: { 'User-Agent': getRandomUserAgent(), 'Accept': 'application/json', 'Referer': 'https://www.toutiao.com/' },
      timeout: 15000
    });
    const data = response.data?.data || [];
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    for (const item of data) {
      const title = (item.Title || '').toString();
      const label = (item.Label || '').toString();
      const combined = (title + ' ' + label).toLowerCase();
      const isMatch = queryWords.some(qw => combined.includes(qw) || qw.includes(combined)) || combined.includes(queryLower);
      if (isMatch) {
        const hotValue = typeof item.HotValue === 'string' ? parseInt(item.HotValue.replace(/,/g, '')) : (item.HotValue as number) || 0;
        results.push({
          title: `头条热搜: ${title}`,
          content: label || title,
          url: item.Url || `https://www.toutiao.com/search?keyword=${encodeURIComponent(title)}`,
          source: 'toutiao' as const,
          viewCount: hotValue
        });
      }
    }
    console.log(`Toutiao hot search for "${query}": found ${results.length} results from ${data.length} total`);
    return results;
  } catch (error) {
    console.error('Toutiao hot search error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export interface AccountInfo {
  platform: 'bilibili' | 'weibo';
  name: string; id: string; followers: number; verified: boolean; description: string; avatar?: string;
}

export async function detectAndFetchAccount(keyword: string): Promise<{ accounts: AccountInfo[]; results: SearchResult[] }> {
  const accounts: AccountInfo[] = [];
  const results: SearchResult[] = [];
  try {
    const biliUser = await searchBilibiliUser(keyword);
    if (biliUser) {
      accounts.push({ platform: 'bilibili', name: biliUser.uname, id: String(biliUser.mid), followers: biliUser.fans, verified: biliUser.official_verify?.type >= 0, description: biliUser.usign, avatar: biliUser.upic });
      const userVideos = await getBilibiliUserVideos(biliUser.mid);
      results.push(...userVideos);
    }
  } catch (error) { console.error('Bilibili account detection error:', error instanceof Error ? error.message : error); }
  return { accounts, results };
}

export async function searchAllChina(query: string, resultsPerSource: number = 5): Promise<SearchResult[]> {
  const limit = Math.max(1, Math.min(20, resultsPerSource));
  const results = await Promise.allSettled([
    searchSogou(query),
    searchBilibili(query),
    searchWeibo(query),
    searchBaiduHot(query),
    searchDouyinHot(query),
    searchZhihuHot(query),
    searchToutiaoHot(query)
  ]);
  const allResults: SearchResult[] = [];
  const sourceNames = ['Sogou', 'Bilibili', 'Weibo', 'Baidu', 'Douyin', 'Zhihu', 'Toutiao'];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const limitedResults = result.value.slice(0, limit);
      allResults.push(...limitedResults);
      console.log(`  ${sourceNames[index]}: ${limitedResults.length} results`);
    } else {
      console.warn(`  ${sourceNames[index]} search failed:`, result.reason);
    }
  });
  return allResults;
}
