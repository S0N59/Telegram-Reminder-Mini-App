import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN!;

if (!botToken) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

export const bot = new Telegraf(botToken);

/**
 * Send a notification to a Telegram user
 */
export async function sendTelegramNotification(
  chatId: number,
  text: string
): Promise<boolean> {
  try {
    await bot.telegram.sendMessage(chatId, `🔔 Напоминание:\n\n${text}`, {
      parse_mode: 'HTML',
    });
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}
