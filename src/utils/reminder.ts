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
      console.log('[subscribe] Got', reminders.length, 'reminders from API');
      // API already filters by userId and done=false — pass through directly
      callback(reminders);
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
    userId,
    priority: formData.priority || 'MEDIUM',
    repeat: formData.repeat || 'NONE',
    customWeekdays: formData.customWeekdays,
    confirmRequired: formData.confirmRequired || false,
    reRemindInterval: formData.reRemindInterval || 5,
    category: formData.category,
    assignedTo: formData.assignedTo,
    assignedToChatId: formData.assignedToChatId,
    creatorName: formData.creatorName,
    groupId: formData.groupId,
  };
};

// Collapses group reminders sharing the same groupId into a unified single card model
export function unifyGroupReminders(rawReminders: Reminder[] = [], currentUserId?: number): Reminder[] {
  if (!Array.isArray(rawReminders)) return [];
  const groupMap = new Map<string, Reminder[]>();
  const singleList: Reminder[] = [];

  for (const r of rawReminders) {
    if (!r) continue;
    if (r.groupId) {
      const list = groupMap.get(r.groupId) || [];
      list.push(r);
      groupMap.set(r.groupId, list);
    } else {
      singleList.push(r);
    }
  }

  const result: Reminder[] = [...singleList];

  groupMap.forEach((groupItems, groupId) => {
    if (!groupItems || groupItems.length === 0) return;

    // Find personal record of current user if present, else default to first
    const myRecord = groupItems.find(r => 
      r.assignedToChatId ? r.assignedToChatId === currentUserId : (r.userId === currentUserId && !r.assignedToChatId)
    ) || groupItems[0];

    const participants = groupItems.map(item => {
      const isMe = currentUserId
        ? (item.assignedToChatId ? item.assignedToChatId === currentUserId : (item.userId === currentUserId && !item.assignedToChatId))
        : false;

      const rawName = item.assignedTo ? item.assignedTo.replace(/^@/, '') : (item.creatorName || 'Friend');
      const displayName = isMe ? 'You' : (rawName || 'Friend');

      const isDone = item.done || item.status === 'done';
      const status = (item.status || (isDone ? 'done' : 'todo')) as 'todo' | 'in_progress' | 'done';

      return {
        id: item.id,
        userId: item.assignedToChatId || item.userId,
        name: displayName,
        username: item.assignedTo || '',
        status,
        done: isDone,
        isMe,
      };
    });

    // Entire group is done only if ALL participants have completed their part
    const allDone = participants.length > 0 && participants.every(p => p.done || p.status === 'done');
    const anyInProgress = participants.some(p => p.status === 'in_progress' || p.done);
    const groupStatus = allDone ? 'done' : anyInProgress ? 'in_progress' : 'todo';

    const unified: Reminder = {
      ...myRecord,
      groupId,
      groupParticipants: participants,
      status: groupStatus,
      done: allDone,
    };

    result.push(unified);
  });

  return result;
}

