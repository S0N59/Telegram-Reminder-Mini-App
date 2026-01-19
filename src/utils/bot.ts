// Утилиты для отправки уведомлений через Backend API
// ВАЖНО: Bot Token хранится ТОЛЬКО на backend - это безопасно!
// Frontend НЕ имеет доступа к bot token

import { config } from '../config';

export interface SendMessageParams {
  chatId: number;
  text: string;
}

// Отправка уведомления через Backend API
export const sendTelegramNotification = async (
  _chatId: number,
  _text: string
): Promise<boolean> => {
  // Уведомления отправляются автоматически через backend (GitHub Actions)
  // Эта функция оставлена для совместимости, но не используется напрямую
  console.log('Notification will be sent via backend scheduler');
  return true;
};

// Отправка уведомления через backend endpoint (если нужно вручную)
export const sendNotificationViaBackend = async (
  chatId: number,
  text: string,
  backendUrl?: string
): Promise<boolean> => {
  try {
    const url = backendUrl || config.backendUrl;
    const response = await fetch(`${url}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        text,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending notification via backend:', error);
    return false;
  }
};
