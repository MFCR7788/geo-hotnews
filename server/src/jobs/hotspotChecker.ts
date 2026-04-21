import { Server } from 'socket.io';
import { prisma } from '../db.js';
import { searchTwitter } from '../services/twitter.js';
import { searchBing, searchHackerNews, deduplicateResults, normalizeUrlForDedup } from '../services/search.js';
import { searchSogou, searchBilibili, searchWeibo, detectAndFetchAccount } from '../services/chinaSearch.js';
import { searchZhihu, searchZhihuKeyword, searchToutiao, searchRSSFeeds } from '../services/newsSources.js';
import { analyzeContent, expandKeyword, preMatchKeyword } from '../services/ai.js';
import { sendHotspotEmail } from '../services/email.js';
import type { SearchResult } from '../types.js';

// 新鲜度过滤：丢弃超过指定小时数的内容
const MAX_AGE_HOURS = 7 * 24; // 7天

function filterByFreshness(results: SearchResult[]): SearchResult[] {
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000);
  return results.filter(item => {
    if (!item.publishedAt) return true;
    return item.publishedAt >= cutoff;
  });
}

// 按来源优先级排序
function prioritizeResults(results: SearchResult[]): SearchResult[] {
  const priorityMap: Record<string, number> = {
    twitter: 1,
    weibo: 2,
    zhihu: 2,
    toutiao: 3,
    '36kr': 3,
    huxiu: 3,
    sspai: 4,
    ifanr: 4,
    ithome: 4,
    infoq: 4,
    'mit-tr': 4,
    cls: 4,
    thepaper: 4,
    'custom-rss': 4,
    bilibili: 5,
    hackernews: 5,
    sogou: 6,
    bing: 7,
    google: 8,
    duckduckgo: 9
  };
  return [...results].sort((a, b) => {
    return (priorityMap[a.source] || 99) - (priorityMap[b.source] || 99);
  });
}

export async function runHotspotCheck(io: Server): Promise<void> {
  console.log('Starting hotspot check...');

  // 获取所有激活的用户订阅
  const userKeywords = await prisma.userKeyword.findMany({
    where: { isActive: true },
    include: {
      keyword: true,
      user: true
    }
  });

  if (userKeywords.length === 0) {
    console.log('No active keyword subscriptions to monitor');
    return;
  }

  // 按关键词库分组去重（避免同一个关键词被多人订阅时重复扫描）
  const keywordGroups = new Map<string, typeof userKeywords>();
  for (const uk of userKeywords) {
    const existing = keywordGroups.get(uk.keywordId);
    if (existing) {
      existing.push(uk);
    } else {
      keywordGroups.set(uk.keywordId, [uk]);
    }
  }

  console.log(`Checking ${keywordGroups.size} unique keywords (${userKeywords.length} user subscriptions)...`);

  let newHotspotsCount = 0;

  for (const [keywordId, subscribers] of keywordGroups) {
    const keyword = subscribers[0].keyword; // 关键词库中的关键词
    console.log(`\nChecking keyword: "${keyword.text}" (${subscribers.length} users subscribed)`);

    try {
      // 检测账号
      const accountResult = await detectAndFetchAccount(keyword.text);
      
      if (accountResult.accounts.length > 0) {
        for (const acc of accountResult.accounts) {
          console.log(`  Found ${acc.platform} account: ${acc.name} (${acc.followers} followers)`);
        }
      }

      // 查询扩展
      const expandedKeywords = await expandKeyword(keyword.text);
      console.log(`  Expanded to ${expandedKeywords.length} variants: ${expandedKeywords.slice(0, 5).join(', ')}${expandedKeywords.length > 5 ? '...' : ''}`);

      // 多来源并行搜索
      const [
        twitterResults,
        bingResults,
        hackernewsResults,
        sogouResults,
        bilibiliResults,
        weiboResults,
        zhihuResults,
        zhihuKwResults,
        toutiaoResults,
        rssResults
      ] = await Promise.allSettled([
        searchTwitter(keyword.text),
        searchBing(keyword.text),
        searchHackerNews(keyword.text),
        searchSogou(keyword.text),
        searchBilibili(keyword.text),
        searchWeibo(keyword.text),
        searchZhihu(keyword.text),
        searchZhihuKeyword(keyword.text),
        searchToutiao(keyword.text),
        searchRSSFeeds(keyword.text)
      ]);

      const allResults: SearchResult[] = [];
      
      if (accountResult.results.length > 0) {
        allResults.push(...accountResult.results);
        console.log(`  AccountFetch: ${accountResult.results.length} results`);
      }

      const sources = [
        { name: 'Twitter', result: twitterResults },
        { name: 'Bing', result: bingResults },
        { name: 'HackerNews', result: hackernewsResults },
        { name: 'Sogou', result: sogouResults },
        { name: 'Bilibili', result: bilibiliResults },
        { name: 'Weibo', result: weiboResults },
        { name: '知乎热榜', result: zhihuResults },
        { name: '知乎搜索', result: zhihuKwResults },
        { name: '今日头条', result: toutiaoResults },
        { name: 'RSS聚合', result: rssResults }
      ];

      for (const source of sources) {
        if (source.result.status === 'fulfilled') {
          allResults.push(...source.result.value);
          console.log(`  ${source.name}: ${source.result.value.length} results`);
        } else {
          console.log(`  ${source.name}: failed - ${source.result.reason}`);
        }
      }

      // 去重、新鲜度过滤、优先级排序
      const uniqueResults = deduplicateResults(allResults);
      const freshResults = filterByFreshness(uniqueResults);
      const sortedResults = prioritizeResults(freshResults);
      console.log(`  Total: ${allResults.length} raw → ${uniqueResults.length} unique → ${freshResults.length} fresh`);

      // 处理配额
      let twitterProcessed = 0;
      let otherProcessed = 0;
      const TWITTER_QUOTA = 15;
      const OTHER_QUOTA = 20;

      for (const item of sortedResults) {
        if (item.source === 'twitter' && twitterProcessed >= TWITTER_QUOTA) continue;
        if (item.source !== 'twitter' && otherProcessed >= OTHER_QUOTA) continue;
        if (twitterProcessed + otherProcessed >= TWITTER_QUOTA + OTHER_QUOTA) break;

        try {
          // 检查是否已存在（URL 去重 + 标题去重）
          const normalizedUrl = normalizeUrlForDedup(item.url, item.source);
          const normalizedTitle = item.title
            .toLowerCase()
            .replace(/[\s\u3000]+/g, '')
            .replace(/[，。！？、；：""''【】《》（）—…·\-.!,?;:'"()\[\]{}<>\/\\@#$%^&*+=|~`]/g, '')
            .slice(0, 50);

          const existing = await prisma.hotspot.findFirst({
            where: {
              OR: [
                { url: normalizedUrl },
                { source: item.source, title: item.title },
                ...(normalizedTitle.length >= 4 ? [{
                  title: { contains: item.title.slice(0, 30), mode: 'insensitive' as const }
                }] : [])
              ]
            }
          });

          if (existing) {
            console.log(`  Duplicate skipped: ${item.title.slice(0, 30)}... (matched by ${existing.url === normalizedUrl ? 'URL' : 'title'})`);
            continue;
          }

          // AI 分析
          const fullText = item.title + '\n' + item.content;
          const preMatch = preMatchKeyword(fullText, expandedKeywords);
          const analysis = await analyzeContent(fullText, keyword.text, preMatch);

          // 过滤假内容
          if (!analysis.isReal) {
            console.log(`  Filtered fake/spam: ${item.title.slice(0, 30)}...`);
            continue;
          }

          // 相关性阈值
          if (analysis.relevance < 50) {
            console.log(`  Low relevance (${analysis.relevance}): ${item.title.slice(0, 30)}...`);
            continue;
          }

          if (!analysis.keywordMentioned && analysis.relevance < 65) {
            console.log(`  Keyword not mentioned & relevance < 65: ${item.title.slice(0, 30)}...`);
            continue;
          }

          // 保存热点到全局热点库
          const hotspot = await prisma.hotspot.create({
            data: {
              title: item.title,
              content: item.content,
              url: item.url,
              source: item.source,
              sourceId: item.sourceId || null,
              isReal: analysis.isReal,
              relevance: analysis.relevance,
              relevanceReason: analysis.relevanceReason || null,
              keywordMentioned: analysis.keywordMentioned ?? null,
              importance: analysis.importance,
              summary: analysis.summary,
              viewCount: item.viewCount || null,
              likeCount: item.likeCount || null,
              retweetCount: item.retweetCount || null,
              replyCount: item.replyCount || null,
              commentCount: item.commentCount || null,
              quoteCount: item.quoteCount || null,
              danmakuCount: item.danmakuCount || null,
              authorName: item.author?.name || null,
              authorUsername: item.author?.username || null,
              authorAvatar: item.author?.avatar || null,
              authorFollowers: item.author?.followers || null,
              authorVerified: item.author?.verified ?? null,
              publishedAt: item.publishedAt || null,
              keywordId: keywordId // 关联到关键词库
            }
          });

          newHotspotsCount++;
          if (item.source === 'twitter') twitterProcessed++;
          else otherProcessed++;
          console.log(`  New hotspot [${item.source}]: ${hotspot.title.slice(0, 40)}... (${analysis.importance})`);

          // 通知所有订阅该关键词的用户
          for (const subscriber of subscribers) {
            // 创建通知
            await prisma.notification.create({
              data: {
                type: 'hotspot',
                title: `发现新热点: ${hotspot.title.slice(0, 50)}`,
                content: analysis.summary || hotspot.content.slice(0, 100),
                hotspotId: hotspot.id,
                userId: subscriber.userId
              }
            });

            // WebSocket 通知
            io.to(`keyword:${keyword.text}`).emit('hotspot:new', hotspot);
            io.emit('notification', {
              type: 'hotspot',
              title: '发现新热点',
              content: hotspot.title,
              hotspotId: hotspot.id,
              importance: hotspot.importance
            });
          }

          // 邮件通知（仅对高重要级别）
          if (['high', 'urgent'].includes(analysis.importance)) {
            await sendHotspotEmail(hotspot);
          }

        } catch (error) {
          console.error(`  Error processing result:`, error);
        }
      }

      // 避免过快请求
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error checking keyword "${keyword.text}":`, error);
    }
  }

  console.log(`\nHotspot check completed. Found ${newHotspotsCount} new hotspots.`);
}
