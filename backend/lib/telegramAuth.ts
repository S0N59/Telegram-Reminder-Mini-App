import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface TelegramUser { id: number; username?: string; first_name?: string; last_name?: string; }

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function requireTelegramUser(req: VercelRequest, res: VercelResponse): TelegramUser | null {
  const header = req.headers['x-telegram-init-data'];
  const initData = Array.isArray(header) ? header[0] : header;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData || !token) return reject(res);

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    const rawUser = params.get('user');
    params.delete('hash');
    if (!hash || !rawUser || !Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > MAX_AUTH_AGE_SECONDS) return reject(res);

    const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const expected = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    if (hash.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) return reject(res);

    const user = JSON.parse(rawUser) as TelegramUser;
    return Number.isSafeInteger(user.id) && user.id > 0 ? user : reject(res);
  } catch {
    return reject(res);
  }
}

function reject(res: VercelResponse): null {
  res.status(401).json({ error: 'Telegram authorization required' });
  return null;
}

export function setApiCors(res: VercelResponse, methods: string): void {
  res.setHeader('Access-Control-Allow-Origin', process.env.WEBAPP_URL || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
}
