import { config } from '../config';
import { getUserData } from './telegram';

const API_URL = config.backendUrl;

export interface UserSettings {
  notionToken?: string;
  notionDatabaseId?: string;
  totalCreated?: number;
  totalDeleted?: number;
}

export const fetchUserSettings = async (): Promise<UserSettings> => {
  const user = getUserData();
  if (!user?.id) {
    return {};
  }

  try {
    const response = await fetch(`${API_URL}/api/settings?userId=${user.id}`);
    if (!response.ok) {
      if (response.status === 404) return {};
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();
    return {
      notionToken: data.notion_token,
      notionDatabaseId: data.notion_database_id,
      totalCreated: data.total_created || 0,
      totalDeleted: data.total_deleted || 0
    };
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    return {};
  }
};

export const saveUserSettings = async (settings: UserSettings): Promise<boolean> => {
  const user = getUserData();
  if (!user?.id) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        notionToken: settings.notionToken,
        notionDatabaseId: settings.notionDatabaseId
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return false;
  }
};
