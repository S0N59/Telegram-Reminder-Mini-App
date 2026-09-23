export interface YouTubeVideoInfo {
  id: string;
  title: string;
  url: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

/**
 * Resolves a channel identifier (UC..., @handle, or URL) into a standard channelId (UC...)
 */
export async function resolveYouTubeChannelId(identifier: string, apiKey?: string): Promise<string> {
  const clean = identifier.trim();

  // Already a Channel ID (UC...)
  if (/^UC[\w-]{22}$/.test(clean)) {
    return clean;
  }

  // Handle extracted from URL or @handle
  let handle = clean;
  if (clean.includes('youtube.com/')) {
    const match = clean.match(/@([\w.-]+)/);
    if (match) handle = `@${match[1]}`;
  }
  if (!handle.startsWith('@') && !clean.includes('UC')) {
    handle = `@${handle}`;
  }

  // Try YouTube API with forHandle if API Key available
  if (apiKey && handle.startsWith('@')) {
    try {
      const handleName = handle.replace(/^@/, '');
      const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handleName)}&key=${apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.items && data.items.length > 0) {
          return data.items[0].id;
        }
      }
    } catch (err) {
      console.warn('[YOUTUBE] API handle resolution failed, trying web fallback:', err);
    }
  }

  // Public Web Scraping Fallback for @handle
  try {
    const targetUrl = handle.startsWith('@')
      ? `https://www.youtube.com/${handle}`
      : `https://www.youtube.com/@${handle}`;
    
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      // Match channelId from meta tag or JSON
      const idMatch = html.match(/"channelId":"(UC[\w-]{22})"/);
      if (idMatch) return idMatch[1];
      const metaMatch = html.match(/itemprop="channelId"\s+content="(UC[\w-]{22})"/);
      if (metaMatch) return metaMatch[1];
      const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/);
      if (rssMatch) return rssMatch[1];
    }
  } catch (err) {
    console.warn('[YOUTUBE] Handle scrape fallback error:', err);
  }

  // If starts with UC, return as is
  const directMatch = clean.match(/UC[\w-]{22}/);
  if (directMatch) return directMatch[0];

  throw new Error(`Could not resolve YouTube channel ID from "${identifier}". Please enter your Channel ID (starts with UC...).`);
}

/**
 * Fetches the latest uploaded videos for a channel.
 * Uses YouTube Data API v3 if API key provided, otherwise public RSS XML feed.
 */
export async function fetchLatestYouTubeVideos(channelId: string, apiKey?: string): Promise<YouTubeVideoInfo[]> {
  // Method 1: YouTube Data API v3 (PlaylistItems on Uploads playlist UU...)
  if (apiKey) {
    try {
      const uploadsPlaylistId = 'UU' + channelId.substring(2);
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5&key=${apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.items && Array.isArray(data.items)) {
          return data.items.map((item: any) => {
            const snip = item.snippet || {};
            const videoId = snip.resourceId?.videoId || item.id;
            const thumbs = snip.thumbnails || {};
            const thumbUrl = thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            return {
              id: videoId,
              title: snip.title || 'Untitled Video',
              url: `https://youtu.be/${videoId}`,
              description: snip.description || '',
              thumbnailUrl: thumbUrl,
              channelTitle: snip.channelTitle || '',
              publishedAt: snip.publishedAt || new Date().toISOString(),
            };
          });
        }
      }
    } catch (err) {
      console.warn('[YOUTUBE] API fetch failed, trying RSS feed:', err);
    }
  }

  // Method 2: Public YouTube RSS Feed (Zero quota, 100% reliable)
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`YouTube RSS returned status ${res.status}`);
    }

    const xml = await res.text();
    return parseYouTubeRssFeed(xml);
  } catch (err: any) {
    console.error('[YOUTUBE] Failed to fetch videos:', err);
    throw new Error(`Could not fetch videos from YouTube: ${err.message}`);
  }
}

/**
 * Parses YouTube XML Atom feed into YouTubeVideoInfo array
 */
function parseYouTubeRssFeed(xml: string): YouTubeVideoInfo[] {
  const videos: YouTubeVideoInfo[] = [];

  // Extract author channel title
  let authorTitle = '';
  const authorMatch = xml.match(/<author>[\s\S]*?<name>(.*?)<\/name>/);
  if (authorMatch) {
    authorTitle = authorMatch[1].trim();
  }

  // Split into <entry> blocks
  const entries = xml.split('<entry>').slice(1);
  for (const entry of entries) {
    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
    const thumbMatch = entry.match(/<media:thumbnail\s+url="(.*?)"/);

    if (videoIdMatch) {
      const videoId = videoIdMatch[1].trim();
      const title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : 'Untitled Video';
      const publishedAt = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();
      const description = descMatch ? decodeXmlEntities(descMatch[1].trim()) : '';
      const thumbUrl = thumbMatch ? thumbMatch[1].trim() : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      videos.push({
        id: videoId,
        title,
        url: `https://youtu.be/${videoId}`,
        description,
        thumbnailUrl: thumbUrl,
        channelTitle: authorTitle,
        publishedAt,
      });
    }
  }

  return videos;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Default post template for YouTube videos
 */
export const DEFAULT_YOUTUBE_POST_TEMPLATE = `🎬 <b>{title}</b>

{description}

👉 <b>Watch now on YouTube:</b>
{url}`;

/**
 * Renders a post template with video variables
 */
export function renderYouTubePostTemplate(
  template: string,
  video: YouTubeVideoInfo,
  maxDescriptionLength: number = 300
): string {
  const cleanDesc = (video.description || '').trim();
  const truncatedDesc = cleanDesc.length > maxDescriptionLength
    ? cleanDesc.substring(0, maxDescriptionLength).trim() + '...'
    : cleanDesc;

  let rendered = template
    .replace(/\{title\}/gi, escapeHtml(video.title))
    .replace(/\{url\}/gi, video.url)
    .replace(/\{description\}/gi, escapeHtml(truncatedDesc))
    .replace(/\{thumbnail\}/gi, video.thumbnailUrl)
    .replace(/\{channel\}/gi, escapeHtml(video.channelTitle));

  return rendered;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
