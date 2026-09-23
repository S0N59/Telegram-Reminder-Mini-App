import { config } from '../config';
import { getUserData } from './telegram';
import { telegramApiHeaders } from './api';

const API_URL = config.backendUrl;

export interface YouTubeIntegrationConfig {
  id?: string;
  youtubeChannelId: string;
  youtubeApiKey?: string;
  targetChannelId?: string;
  postTemplate: string;
  attachThumbnail: boolean;
  includeWatchButton: boolean;
  autoPublish: boolean;
  isActive: boolean;
  lastVideoId?: string;
}

export interface YouTubeVideoPreview {
  id: string;
  title: string;
  url: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

export interface YouTubeTestResult {
  ok: boolean;
  channelId?: string;
  channelTitle?: string;
  latestVideo?: YouTubeVideoPreview;
  previewHtml?: string;
  error?: string;
}

export interface PendingYouTubePost {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  video_description: string;
  thumbnail_url: string | null;
  formatted_html: string;
  target_channel_id: string;
  status: 'pending' | 'published' | 'dismissed';
  created_at: number;
}

export const fetchYouTubeConfig = async (): Promise<YouTubeIntegrationConfig | null> => {
  const user = getUserData();
  if (!user?.id) return null;

  try {
    const res = await fetch(`${API_URL}/api/youtube?userId=${user.id}`, {
      headers: telegramApiHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.youtube_channel_id) return null;

    return {
      id: data.id,
      youtubeChannelId: data.youtube_channel_id,
      youtubeApiKey: data.youtube_api_key || '',
      targetChannelId: data.target_channel_id || '',
      postTemplate: data.post_template,
      attachThumbnail: data.attach_thumbnail !== false,
      includeWatchButton: data.include_watch_button !== false,
      autoPublish: !!data.auto_publish,
      isActive: data.is_active !== false,
      lastVideoId: data.last_video_id,
    };
  } catch (err) {
    console.error('Failed to fetch YouTube config:', err);
    return null;
  }
};

export const saveYouTubeConfig = async (
  cfg: YouTubeIntegrationConfig
): Promise<{ ok: boolean; error?: string }> => {
  const user = getUserData();
  if (!user?.id) return { ok: false, error: 'User not authenticated' };

  try {
    const res = await fetch(`${API_URL}/api/youtube`, {
      method: 'POST',
      headers: telegramApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        userId: user.id,
        ...cfg,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to save configuration' };
    }
    return { ok: true };
  } catch (err: any) {
    console.error('Failed to save YouTube config:', err);
    return { ok: false, error: err.message || 'Network error' };
  }
};

export const testYouTubeConnection = async (
  channelIdentifier: string,
  apiKey?: string,
  template?: string
): Promise<YouTubeTestResult> => {
  const user = getUserData();
  try {
    const res = await fetch(`${API_URL}/api/youtube/test`, {
      method: 'POST',
      headers: telegramApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        userId: user?.id,
        channelIdentifier,
        apiKey: apiKey?.trim() || undefined,
        template,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Connection failed' };
    }

    return data;
  } catch (err: any) {
    console.error('Failed to test YouTube connection:', err);
    return { ok: false, error: err.message || 'Network error' };
  }
};

export const disconnectYouTubeConfig = async (): Promise<boolean> => {
  const user = getUserData();
  if (!user?.id) return false;

  try {
    const res = await fetch(`${API_URL}/api/youtube?userId=${user.id}`, {
      method: 'DELETE',
      headers: telegramApiHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to disconnect YouTube:', err);
    return false;
  }
};

export const fetchPendingYouTubePost = async (
  pendingId: string
): Promise<PendingYouTubePost | null> => {
  const user = getUserData();
  if (!user?.id) return null;

  try {
    const res = await fetch(`${API_URL}/api/youtube/pending?userId=${user.id}&id=${encodeURIComponent(pendingId)}`, {
      headers: telegramApiHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch pending post:', err);
    return null;
  }
};
