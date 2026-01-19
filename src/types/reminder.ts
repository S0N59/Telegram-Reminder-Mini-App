// Типы для напоминаний
export type RepeatType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type PriorityType = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Reminder {
  id: string;
  text: string;
  date: string; // Формат YYYY-MM-DD
  time: string; // Формат HH:mm
  createdAt: number; // timestamp
  userId?: number; // ID пользователя из Telegram
  sent?: boolean; // Отправлено ли напоминание
  // Новые поля
  priority?: PriorityType;
  repeat?: RepeatType;
  customWeekdays?: number[]; // 0-6 для CUSTOM (0 = воскресенье)
  done?: boolean;
  resendCount?: number;
  maxResend?: number;
  nextRunAt?: number; // timestamp следующего выполнения
  snoozedUntil?: number; // timestamp до которого отложено
}

export interface ReminderFormData {
  text: string;
  date: string; // Формат YYYY-MM-DD (computed from year, month, day)
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  priority?: PriorityType;
  repeat?: RepeatType;
  customWeekdays?: number[];
}

export interface ReminderPayload {
  text: string;
  date: string;
  time: string;
  userId: number;
  initData: string;
}
