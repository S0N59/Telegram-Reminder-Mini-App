// API storage for reminders - uses backend instead of localStorage
import type { Reminder } from '../types/reminder';
import { config } from '../config';

const API_URL = config.backendUrl;

// API functions - save to Supabase via backend
export const saveReminderAPI = async (reminder: Reminder): Promise<Reminder> => {
  try {
    const response = await fetch(`${API_URL}/api/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: reminder.id,
        text: reminder.text,
        date: reminder.date,
        time: reminder.time,
        userId: reminder.userId,
        priority: reminder.priority || 'MEDIUM',
        repeat: reminder.repeat || 'NONE',
        customWeekdays: reminder.customWeekdays,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save reminder');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving reminder to API:', error);
    // Fallback to localStorage if API fails
    saveReminderLocal(reminder);
    return reminder;
  }
};

export const getRemindersAPI = async (userId: number): Promise<Reminder[]> => {
  try {
    const response = await fetch(`${API_URL}/api/reminders?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reminders');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching reminders from API:', error);
    // Fallback to localStorage if API fails
    return getRemindersLocal().filter(r => r.userId === userId);
  }
};

export const deleteReminderAPI = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/reminders?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete reminder');
    }
  } catch (error) {
    console.error('Error deleting reminder from API:', error);
    // Fallback to localStorage if API fails
    deleteReminderLocal(id);
  }
};

export const updateReminderAPI = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/reminders?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update reminder');
    }
  } catch (error) {
    console.error('Error updating reminder in API:', error);
    // Fallback to localStorage if API fails
    updateReminderLocal(id, updates);
  }
};

// LocalStorage fallback functions
const STORAGE_KEY = 'telegram_reminders';

export const saveReminderLocal = (reminder: Reminder): void => {
  const reminders = getRemindersLocal();
  const existingIndex = reminders.findIndex(r => r.id === reminder.id);
  
  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
  } else {
    reminders.push(reminder);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
};

export const getRemindersLocal = (): Reminder[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const deleteReminderLocal = (id: string): void => {
  const reminders = getRemindersLocal();
  const filtered = reminders.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const updateReminderLocal = (id: string, updates: Partial<Reminder>): void => {
  const reminders = getRemindersLocal();
  const index = reminders.findIndex(r => r.id === id);
  if (index >= 0) {
    reminders[index] = { ...reminders[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }
};
