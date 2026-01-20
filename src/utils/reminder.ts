// Reminder utilities - Backend API integration
// NO TIMEZONE CONVERSION - store and display exactly what user enters
import type { Reminder, ReminderFormData, ReminderPayload } from '../types/reminder';
import { 
  saveReminderAPI,
  getRemindersAPI,
  deleteReminderAPI,
  updateReminderAPI,
  getRemindersLocal
} from './reminderStorage';
import { getUserData } from './telegram';

// Save reminder (via Backend API) - NO timezone conversion
export const saveReminder = async (reminder: Reminder): Promise<string> => {
  // Save exactly as entered by user (local time)
  await saveReminderAPI(reminder);
  return reminder.id;
};

// Get all user reminders - NO timezone conversion
export const getReminders = async (): Promise<Reminder[]> => {
  const user = getUserData();
  if (!user?.id) {
    return getRemindersLocal();
  }
  
  // Return exactly as stored (local time)
  return await getRemindersAPI(user.id);
};

// Subscribe to reminder changes (poll API)
export const subscribeToReminders = (
  userId: number,
  callback: (reminders: Reminder[]) => void
): (() => void) => {
  const updateReminders = async () => {
    try {
      const reminders = await getRemindersAPI(userId);
      // Filter active reminders for this user - NO conversion
      const userReminders = reminders.filter(r => r.userId === userId && !r.done);
      callback(userReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      const localReminders = getRemindersLocal().filter(r => r.userId === userId && !r.done);
      callback(localReminders);
    }
  };
  
  updateReminders();
  const interval = setInterval(updateReminders, 5000);
  
  return () => clearInterval(interval);
};

// Update reminder
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  await updateReminderAPI(id, updates);
};

// Delete reminder
export const deleteReminder = async (id: string): Promise<void> => {
  await deleteReminderAPI(id);
};

// Mark reminder as done
export const markReminderDone = async (id: string): Promise<void> => {
  await updateReminder(id, { done: true });
};

// Get reminders by user
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
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  const timeStr = formatTime(formData.hours, formData.minutes);
  
  return {
    text: formData.text.trim(),
    date: dateStr,
    time: timeStr,
    userId,
    initData
  };
};

// Create reminder - NO timezone conversion
export const createReminder = (
  formData: ReminderFormData,
  userId?: number
): Reminder => {
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  const timeStr = formatTime(formData.hours, formData.minutes);
  
  return {
    id: Date.now().toString(),
    text: formData.text.trim(),
    date: dateStr,
    time: timeStr,
    createdAt: Date.now(),
    userId
  };
};
