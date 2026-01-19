// Утилиты для планирования напоминаний
// ВАЖНО: Отправка уведомлений теперь происходит ТОЛЬКО через backend (GitHub Actions)
// Этот файл оставлен для совместимости, но frontend больше НЕ отправляет уведомления

import type { Reminder } from '../types/reminder';
import { getReminders } from './reminder';

// Frontend scheduler отключен - backend обрабатывает все уведомления
export const startReminderScheduler = () => {
  console.log('📱 Frontend reminder scheduler disabled - backend handles notifications via GitHub Actions');
  console.log('✅ Your reminders will be sent automatically even when the app is closed!');
};

export const stopReminderScheduler = () => {
  // No-op - scheduler is handled by backend
};

// Получить ближайшее напоминание (для отображения в UI)
export const getNextReminder = async (): Promise<Reminder | null> => {
  const reminders = await getReminders();
  if (reminders.length === 0) return null;

  const now = new Date();
  let nextReminder: Reminder | null = null;
  let minDiff = Infinity;

  for (const reminder of reminders) {
    const reminderDate = new Date(reminder.date + 'T' + reminder.time + ':00');
    const diff = reminderDate.getTime() - now.getTime();
    
    // Только будущие напоминания
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextReminder = reminder;
    }
  }

  return nextReminder;
};
