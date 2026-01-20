// Reminder utilities - Backend API integration
import type { Reminder, ReminderFormData, ReminderPayload } from '../types/reminder';
import { 
  saveReminderAPI,
  getRemindersAPI,
  deleteReminderAPI,
  updateReminderAPI,
  getRemindersLocal
} from './reminderStorage';
import { getUserData } from './telegram';

// Convert local date/time to UTC for backend storage
const localToUTC = (dateStr: string, timeStr: string): { date: string; time: string } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create date in local timezone
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  // Get UTC components
  const utcYear = localDate.getUTCFullYear();
  const utcMonth = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(localDate.getUTCDate()).padStart(2, '0');
  const utcHours = String(localDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  
  return {
    date: `${utcYear}-${utcMonth}-${utcDay}`,
    time: `${utcHours}:${utcMinutes}`
  };
};

// Convert UTC date/time back to local for display
export const utcToLocal = (dateStr: string, timeStr: string): { date: string; time: string } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create date in UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  
  // Get local components
  const localYear = utcDate.getFullYear();
  const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(utcDate.getDate()).padStart(2, '0');
  const localHours = String(utcDate.getHours()).padStart(2, '0');
  const localMinutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  return {
    date: `${localYear}-${localMonth}-${localDay}`,
    time: `${localHours}:${localMinutes}`
  };
};

// Save reminder (via Backend API)
export const saveReminder = async (reminder: Reminder): Promise<string> => {
  await saveReminderAPI(reminder);
  return reminder.id;
};

// Get all user reminders (via Backend API) - converts UTC to local for display
export const getReminders = async (): Promise<Reminder[]> => {
  const user = getUserData();
  if (!user?.id) {
    return getRemindersLocal();
  }
  
  const reminders = await getRemindersAPI(user.id);
  
  // Convert UTC times to local for display
  return reminders.map(r => {
    const local = utcToLocal(r.date, r.time);
    return {
      ...r,
      date: local.date,
      time: local.time
    };
  });
};

// Subscribe to reminder changes (poll API)
export const subscribeToReminders = (
  userId: number,
  callback: (reminders: Reminder[]) => void
): (() => void) => {
  const updateReminders = async () => {
    try {
      const reminders = await getRemindersAPI(userId);
      // Convert UTC to local and filter active reminders
      const userReminders = reminders
        .filter(r => r.userId === userId && !r.done)
        .map(r => {
          const local = utcToLocal(r.date, r.time);
          return { ...r, date: local.date, time: local.time };
        });
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

// Update reminder (via Backend API)
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  await updateReminderAPI(id, updates);
};

// Delete reminder (via Backend API)
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
  
  // Convert to UTC for backend storage
  const utc = localToUTC(dateStr, timeStr);
  
  return {
    text: formData.text.trim(),
    date: utc.date,
    time: utc.time,
    userId,
    initData
  };
};

// Create reminder with UTC conversion for backend
export const createReminder = (
  formData: ReminderFormData,
  userId?: number
): Reminder => {
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  const timeStr = formatTime(formData.hours, formData.minutes);
  
  // Convert local time to UTC for storage
  const utc = localToUTC(dateStr, timeStr);
  
  return {
    id: Date.now().toString(),
    text: formData.text.trim(),
    date: utc.date,
    time: utc.time,
    createdAt: Date.now(),
    userId
  };
};
