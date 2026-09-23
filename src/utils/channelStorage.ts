import { config } from '../config';
import { telegramApiHeaders } from './api';

const API_URL = config.backendUrl;

export interface LinkedChannel {
  id: string;
  user_id?: number;
  chat_id: number | string;
  title: string;
  username: string | null;
  chat_type: 'channel' | 'group' | 'supergroup';
  created_at?: number;
}

export const fetchLinkedChannels = async (userId: number): Promise<LinkedChannel[]> => {
  try {
    const res = await fetch(`${API_URL}/api/channels?userId=${userId}`, { headers: telegramApiHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch channels: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching linked channels:', error);
    return [];
  }
};

export const linkChannelAPI = async (
  userId: number,
  chatIdentifier: string
): Promise<{ ok: boolean; channel?: LinkedChannel; error?: string }> => {
  try {
    const res = await fetch(`${API_URL}/api/channels`, {
      method: 'POST',
      headers: telegramApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userId, chatIdentifier }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to link channel' };
    }

    return { ok: true, channel: data.channel };
  } catch (error: any) {
    console.error('Error linking channel:', error);
    return { ok: false, error: error.message || 'Network error' };
  }
};

export const unlinkChannelAPI = async (id: string, userId: number): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/api/channels?id=${encodeURIComponent(id)}&userId=${userId}`, {
      method: 'DELETE', headers: telegramApiHeaders(),
    });
    return res.ok;
  } catch (error) {
    console.error('Error unlinking channel:', error);
    return false;
  }
};

/**
 * Uploads a local file (phone or desktop) to Telegram through the backend and
 * returns the permanent file_id that can be reused when publishing the post.
 */
export const uploadMediaFileAPI = async (
  file: File,
  type: 'photo' | 'video' | 'audio'
): Promise<{ ok: boolean; fileId?: string; previewUrl?: string; error?: string }> => {
  try {
    const query = new URLSearchParams({
      type,
      name: file.name || `upload-${type}`,
      mime: file.type || 'application/octet-stream',
    });

    const res = await fetch(`${API_URL}/api/upload?${query.toString()}`, {
      method: 'POST',
      headers: telegramApiHeaders({ 'Content-Type': 'application/octet-stream' }),
      body: file,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.fileId) {
      return { ok: false, error: data?.error || `Upload failed (${res.status})` };
    }

    return {
      ok: true,
      fileId: data.fileId,
      previewUrl: `${API_URL}${data.previewUrl}`,
    };
  } catch (error: any) {
    console.error('Error uploading media file:', error);
    return { ok: false, error: error?.message || 'Network error during upload' };
  }
};

export const publishPostAPI = async (params: {
  userId: number;
  channelId: string;
  htmlContent: string;
  fallbackHtml?: string;
  media?: any[];
  buttons?: any[][];
  silent?: boolean;
}): Promise<{ ok: boolean; messageId?: number; error?: string; channelTitle?: string }> => {
  try {
    const res = await fetch(`${API_URL}/api/channels`, {
      method: 'POST',
      headers: telegramApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'publish',
        userId: params.userId,
        channelId: params.channelId,
        htmlContent: params.htmlContent,
        fallbackHtml: params.fallbackHtml,
        media: params.media,
        buttons: params.buttons,
        silent: params.silent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to publish post' };
    }

    return { ok: true, messageId: data.messageId, channelTitle: data.channelTitle };
  } catch (error: any) {
    console.error('Error publishing post:', error);
    return { ok: false, error: error.message || 'Network error' };
  }
};
