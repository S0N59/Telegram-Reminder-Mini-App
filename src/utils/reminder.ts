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

// Get user's timezone offset in hours (e.g., +4 for Armenia)
const getTimezoneOffset = (): number => {
  return -new Date().getTimezoneOffset() / 60;
};

// Convert local time to UTC for backend storage
const localToUTC = (dateStr: string, timeStr: string): { date: string; time: string } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Calculate UTC time by subtracting timezone offset
  const offset = getTimezoneOffset();
  let utcHours = hours - offset;
  let utcDay = day;
  let utcMonth = month;
  let utcYear = year;
  
  // Handle day overflow/underflow
  if (utcHours >= 24) {
    utcHours -= 24;
    utcDay += 1;
    // Handle month overflow
    const daysInMonth = new Date(year, month, 0).getDate();
    if (utcDay > daysInMonth) {
      utcDay = 1;
      utcMonth += 1;
      if (utcMonth > 12) {
        utcMonth = 1;
        utcYear += 1;
      }
    }
  } else if (utcHours < 0) {
    utcHours += 24;
    utcDay -= 1;
    // Handle month underflow
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear -= 1;
      }
      utcDay = new Date(utcYear, utcMonth, 0).getDate();
    }
  }
  
  return {
    date: `${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`,
    time: `${String(utcHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
};

// Convert UTC time back to local for display
const utcToLocal = (dateStr: string, timeStr: string): { date: string; time: string } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Calculate local time by adding timezone offset
  const offset = getTimezoneOffset();
  let localHours = hours + offset;
  let localDay = day;
  let localMonth = month;
  let localYear = year;
  
  // Handle day overflow/underflow
  if (localHours >= 24) {
    localHours -= 24;
    localDay += 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (localDay > daysInMonth) {
      localDay = 1;
      localMonth += 1;
      if (localMonth > 12) {
        localMonth = 1;
        localYear += 1;
      }
    }
  } else if (localHours < 0) {
    localHours += 24;
    localDay -= 1;
    if (localDay < 1) {
      localMonth -= 1;
      if (localMonth < 1) {
        localMonth = 12;
        localYear -= 1;
      }
      localDay = new Date(localYear, localMonth, 0).getDate();
    }
  }
  
  return {
    date: `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`,
    time: `${String(localHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
};

// Save reminder (via Backend API)
export const saveReminder = async (reminder: Reminder): Promise<string> => {
  await saveReminderAPI(reminder);
  return reminder.id;
};

// Get all user reminders - converts UTC to local for display
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
  
  // Convert local time to UTC for backend
  const utc = localToUTC(dateStr, timeStr);
  
  return {
    text: formData.text.trim(),
    date: utc.date,
    time: utc.time,
    userId,
    initData
  };
};

// Create reminder with UTC conversion
export const createReminder = (
  formData: ReminderFormData,
  userId?: number
): Reminder => {
  const dateStr = formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
  const timeStr = formatTime(formData.hours, formData.minutes);
  
  // Convert local time to UTC for storage
  const utc = localToUTC(dateStr, timeStr);
  
  console.log(`[Reminder] Local: ${dateStr} ${timeStr} → UTC: ${utc.date} ${utc.time} (offset: ${getTimezoneOffset()}h)`);
  
  return {
    id: Date.now().toString(),
    text: formData.text.trim(),
    date: utc.date,
    time: utc.time,
    createdAt: Date.now(),
    userId
  };
};
