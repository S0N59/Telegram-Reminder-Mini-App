// src/utils/aiParser.ts
// Client-side AI response parser.
// Converts Gemini structured output → ReminderFormData[] ready for existing Remigram flow.
// NO business logic duplication — only date/time resolution + contact matching.

import type { ReminderFormData } from '../types/reminder';
import type { BotContact } from './reminderStorage';

// ─── Types from backend (mirrored for typing) ───────────────────────────────

export interface AITask {
  text: string;
  time: string | null;
  time_period: 'morning' | 'afternoon' | 'evening' | 'night' | null;
}

export interface AIReminderIntent {
  intent: 'create_reminders' | 'unknown';
  tasks: AITask[];
  date: {
    type: 'absolute' | 'relative' | null;
    value: string | null;
  };
  recipients: Array<{ type: 'self' | 'person'; name: string | null }>;
  recurrence: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';
    days: number[];
  };
  missing_information: string[];
  confidence: number;
}

export interface ParseResult {
  reminders: ReminderFormData[];
  unresolved: string[];       // names of people not found in contacts
  missingFields: string[];    // 'date' | 'time' if missing from intent
}

// ─── Relative Date Resolution ───────────────────────────────────────────────

export function resolveRelativeDate(value: string, now: Date): string {
  const d = new Date(now);

  const v = value.toLowerCase().trim();

  if (v === 'today') {
    // keep today
  } else if (v === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  } else if (v === 'in_2_days') {
    d.setDate(d.getDate() + 2);
  } else if (/^in_(\d+)_days$/.test(v)) {
    const match = v.match(/^in_(\d+)_days$/);
    if (match) d.setDate(d.getDate() + parseInt(match[1]));
  } else if (v === 'next_week') {
    d.setDate(d.getDate() + 7);
  } else if (v === 'next_month') {
    d.setMonth(d.getMonth() + 1);
  } else if (/^next_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(v)) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const match = v.match(/^next_(\w+)$/);
    if (match) {
      const targetDay = dayNames.indexOf(match[1]);
      if (targetDay >= 0) {
        const current = d.getDay();
        let diff = targetDay - current;
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
      }
    }
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v; // already absolute
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Time Period → Time String ───────────────────────────────────────────────

export function timePeriodToTime(period: AITask['time_period']): string {
  switch (period) {
    case 'morning': return '09:00';
    case 'afternoon': return '14:00';
    case 'evening': return '20:00';
    case 'night': return '22:00';
    default: return '09:00';
  }
}

// ─── Contact Matching ────────────────────────────────────────────────────────

export function matchRecipients(
  aiRecipients: AIReminderIntent['recipients'],
  contacts: BotContact[]
): { matched: BotContact[]; unresolved: string[] } {
  const matched: BotContact[] = [];
  const unresolved: string[] = [];

  for (const r of aiRecipients) {
    if (r.type === 'self') continue; // self is always included implicitly

    const name = r.name?.toLowerCase().trim();
    if (!name) continue;

    // Try to find in contacts by first name, last name, or username
    const found = contacts.find(c => {
      const fn = (c.firstName || '').toLowerCase();
      const ln = (c.lastName || '').toLowerCase();
      const un = (c.username || '').toLowerCase();
      const full = `${fn} ${ln}`.trim();
      return fn === name || ln === name || un === name || full === name ||
        fn.startsWith(name) || un.startsWith(name);
    });

    if (found) {
      matched.push(found);
    } else {
      unresolved.push(r.name || 'Unknown');
    }
  }

  return { matched, unresolved };
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseAIResponse(
  intent: AIReminderIntent,
  contacts: BotContact[],
  currentUserId?: number
): ParseResult {
  const now = new Date();
  const missingFields: string[] = [...intent.missing_information];

  // Resolve date
  let resolvedDate: string | null = null;
  if (intent.date.type === 'absolute' && intent.date.value && /^\d{4}-\d{2}-\d{2}$/.test(intent.date.value)) {
    resolvedDate = intent.date.value;
  } else if (intent.date.type === 'relative' && intent.date.value) {
    resolvedDate = resolveRelativeDate(intent.date.value, now);
  }

  if (!resolvedDate) {
    if (!missingFields.includes('date')) missingFields.push('date');
    // Default to today so form can at least be pre-filled
    resolvedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const [year, month, day] = resolvedDate.split('-');

  // Match contacts
  const { matched: matchedContacts, unresolved } = matchRecipients(intent.recipients, contacts);

  // Determine recurrence
  let repeat: ReminderFormData['repeat'] = 'NONE';
  if (intent.recurrence.frequency === 'daily') repeat = 'DAILY';
  else if (intent.recurrence.frequency === 'weekly') repeat = 'WEEKLY';
  else if (intent.recurrence.frequency === 'monthly') repeat = 'MONTHLY';

  // Build one ReminderFormData per task
  const reminders: ReminderFormData[] = intent.tasks.map(task => {
    let timeStr = task.time;
    if (!timeStr && task.time_period) {
      timeStr = timePeriodToTime(task.time_period);
    }
    if (!timeStr) {
      if (!missingFields.includes('time')) missingFields.push('time');
      timeStr = '09:00'; // default
    }

    const [hours, minutes] = timeStr.split(':');

    const data: ReminderFormData = {
      text: task.text,
      date: resolvedDate!,
      year,
      month,
      day,
      hours,
      minutes,
      priority: 'MEDIUM',
      repeat,
      category: '',
      assignedTo: '',
    };

    // Add matched contacts as recipients
    if (matchedContacts.length > 0) {
      data.recipients = matchedContacts.map(c => ({
        username: c.username ? `@${c.username}` : [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Friend',
        chatId: c.userId,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || 'Friend',
      }));
      data.assignedTo = data.recipients[0]?.username || '';
      data.assignedToChatId = matchedContacts[0]?.userId;
    }

    return data;
  });

  return { reminders, unresolved, missingFields };
}
