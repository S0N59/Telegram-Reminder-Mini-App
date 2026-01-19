// Утилиты для работы с напоминаниями через Backend API
import type { Reminder, ReminderFormData, ReminderPayload } from '../types/reminder';
import { 
  saveReminderAPI,
  getRemindersAPI,
  deleteReminderAPI,
  updateReminderAPI,
  getRemindersLocal
} from './reminderStorage';
import { getUserData } from './telegram';

// Сохранить напоминание (через Backend API)
export const saveReminder = async (reminder: Reminder): Promise<string> => {
  await saveReminderAPI(reminder);
  return reminder.id;
};

// Получить все напоминания пользователя (через Backend API)
export const getReminders = async (): Promise<Reminder[]> => {
  const user = getUserData();
  if (!user?.id) {
    return getRemindersLocal();
  }
  return getRemindersAPI(user.id);
};

// Подписаться на изменения напоминаний (poll API)
export const subscribeToReminders = (
  userId: number,
  callback: (reminders: Reminder[]) => void
): (() => void) => {
  // Poll API every 5 seconds
  const updateReminders = async () => {
    try {
      const reminders = await getRemindersAPI(userId);
      // Filter only active reminders for this user
      const userReminders = reminders.filter(r => r.userId === userId && !r.done);
      callback(userReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      // Fallback to localStorage
      const localReminders = getRemindersLocal().filter(r => r.userId === userId && !r.done);
      callback(localReminders);
    }
  };
  
  updateReminders();
  const interval = setInterval(updateReminders, 5000);
  
  return () => clearInterval(interval);
};

// Обновить напоминание (через Backend API)
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  await updateReminderAPI(id, updates);
};

// Удалить напоминание (через Backend API)
export const deleteReminder = async (id: string): Promise<void> => {
  await deleteReminderAPI(id);
};

// Пометить как выполненное
export const markReminderDone = async (id: string): Promise<void> => {
  await updateReminder(id, { done: true });
};

// Получить напоминания пользователя (фильтр по userId)
export const getRemindersByUser = async (userId: number): Promise<Reminder[]> => {
  return getRemindersAPI(userId);
};

export const formatTime = (hours: string, minutes: string): string => {
  const h = hours.padStart(2, '0');
  const m = minutes.padStart(2, '0');
  return `${h}:${m}`;
};

export const createReminderPayload = (
  formData: ReminderFormData,
  userId: number,
  initData: string
): ReminderPayload => {
  // Ensure date is formatted correctly
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  return {
    text: formData.text.trim(),
    date: dateStr,
    time: formatTime(formData.hours, formData.minutes),
    userId,
    initData
  };
};

export const createReminder = (
  formData: ReminderFormData,
  userId?: number
): Reminder => {
  // Ensure date is formatted correctly
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  return {
    id: Date.now().toString(),
    text: formData.text.trim(),
    date: dateStr,
    time: formatTime(formData.hours, formData.minutes),
    createdAt: Date.now(),
    userId
  };
};
