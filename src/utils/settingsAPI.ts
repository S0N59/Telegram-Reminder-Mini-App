import { config } from '../config';
import { getUserData } from './telegram';
import { telegramApiHeaders } from './api';

const API_URL = config.backendUrl;

export interface NotificationButtonsConfig {
  statusToggle: boolean;
  edit: boolean;
  snooze15: boolean;
  dismissMsg: boolean;
  deleteTask: boolean;
  openApp: boolean;
}

export interface NotificationConfig {
  textStyle: 'default' | 'spoiler' | 'quote' | 'monospace';
  showTime: boolean;
  showPriority: boolean;
  showStatus: boolean;
  showCreator: boolean;
  buttons: NotificationButtonsConfig;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  textStyle: 'default',
  showTime: true,
  showPriority: true,
  showStatus: true,
  showCreator: true,
  buttons: {
    statusToggle: true,
    edit: true,
    snooze15: false,
    dismissMsg: false,
    deleteTask: true,
    openApp: false,
  },
};

export interface UserSettings {
  notionToken?: string;
  notionDatabaseId?: string;
  totalCreated?: number;
  totalCompleted?: number;
  totalDeleted?: number;
  notificationConfig?: NotificationConfig | null;
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
      totalCompleted: data.total_completed || 0,
      totalDeleted: data.total_deleted || 0,
      notificationConfig: data.notification_config
        ? (typeof data.notification_config === 'string' ? JSON.parse(data.notification_config) : data.notification_config)
        : null,
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
      headers: telegramApiHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        userId: user.id,
        notionToken: settings.notionToken,
        notionDatabaseId: settings.notionDatabaseId,
        notificationConfig: settings.notificationConfig,
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return false;
  }
};
