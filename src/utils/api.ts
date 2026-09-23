import { getInitData } from './telegram';

export const telegramApiHeaders = (headers: HeadersInit = {}): HeadersInit => {
  const initData = getInitData();
  return { ...headers, ...(initData ? { 'X-Telegram-Init-Data': initData } : {}) };
};
