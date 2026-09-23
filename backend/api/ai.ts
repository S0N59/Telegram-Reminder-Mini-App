import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseReminderIntent } from '../services/gemini.js';
import { requireTelegramUser, setApiCors } from '../lib/telegramAuth.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setApiCors(res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const telegramUser = requireTelegramUser(req, res);
  if (!telegramUser) return;

  const { text, userId, currentDate } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'text is required', code: 'missing_text' });
  }

  // Gracefully fallback if userId is missing or 0
  const effectiveUserId = telegramUser.id;

  const dateStr = typeof currentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(currentDate)
    ? currentDate
    : new Date().toISOString().slice(0, 10);

  const result = await parseReminderIntent(text, effectiveUserId, dateStr);

  if (!result.success) {
    return res.status(200).json(result);
  }

  return res.status(200).json(result);
}
