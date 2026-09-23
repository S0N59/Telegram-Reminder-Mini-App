// backend/services/gemini.ts
// AI Service abstraction — Gemini 2.5 Flash Provider
// This service ONLY parses natural language → structured data.
// It does NOT create reminders, access DB, or make business decisions.

export interface AITask {
  text: string;
  time: string | null;
  time_period: 'morning' | 'afternoon' | 'evening' | 'night' | null;
}

export interface AIDate {
  type: 'absolute' | 'relative' | null;
  value: string | null;
}

export interface AIRecipient {
  type: 'self' | 'person';
  name: string | null;
}

export interface AIRecurrence {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';
  days: number[];
}

export interface AIReminderIntent {
  intent: 'create_reminders' | 'unknown';
  tasks: AITask[];
  date: AIDate;
  recipients: AIRecipient[];
  recurrence: AIRecurrence;
  missing_information: string[];
  confidence: number;
}

const SYSTEM_PROMPT = `You are the natural language parser for Remigram, a reminder app.

Your ONLY responsibility: understand the user's message and extract structured reminder intent.

STRICT RULES:
- Do NOT create reminders
- Do NOT access databases or external services
- Do NOT identify users by IDs
- Do NOT execute any actions
- Do NOT invent or guess missing information — leave it null
- Do NOT make business decisions
- Return ONLY the JSON schema below, nothing else

EXTRACT:
- Individual tasks (split compound requests into separate tasks)
- Date (absolute YYYY-MM-DD, or relative: "tomorrow", "today", "next_monday", "in_3_days", "next_week", etc.)
- Time per task (HH:mm 24h format) or time_period (morning/afternoon/evening/night)
- Recipients (self = the user themselves, person = named someone else)
- Recurrence (none/daily/weekly/monthly/weekdays)
- Missing information (list fields that are absent: "date", "time", "text")

IMPORTANT for multi-task parsing:
- "remind me to buy milk, call mom and check server" -> 3 separate tasks
- "tomorrow at 9 check server, at 10 call mom" -> 2 tasks with different times, shared date
- Tasks inherit shared date/recipients unless specified per-task

IMPORTANT for time periods:
- morning -> "morning"
- afternoon / lunch -> "afternoon"
- evening / tonight -> "evening"
- night -> "night"

IMPORTANT for relative dates:
- today -> "today"
- tomorrow -> "tomorrow"
- day after tomorrow -> "in_2_days"
- in N days -> "in_N_days"
- next week -> "next_week"
- next month -> "next_month"
- on friday -> "next_friday"
- every day -> recurrence daily
- weekdays -> recurrence weekdays

Return exactly this JSON structure (no markdown, no explanation, just JSON):
{
  "intent": "create_reminders",
  "tasks": [
    {
      "text": "task description",
      "time": "HH:mm or null",
      "time_period": "morning|afternoon|evening|night or null"
    }
  ],
  "date": {
    "type": "absolute|relative|null",
    "value": "YYYY-MM-DD or relative string or null"
  },
  "recipients": [
    {
      "type": "self|person",
      "name": "string or null"
    }
  ],
  "recurrence": {
    "frequency": "none|daily|weekly|monthly|weekdays",
    "days": []
  },
  "missing_information": [],
  "confidence": 0.0
}

If you cannot parse the intent at all, return intent: "unknown" with empty tasks.`;

async function callGeminiAPI(
  apiKey: string,
  userText: string,
  currentDate: string
): Promise<AIReminderIntent> {
  // Use the lightest available model to minimize token cost
  // gemini-3.5-flash-lite is the cheapest model available for this API key
  let model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  // Always override old/deprecated/heavy models with the lite version
  if (!model.includes('lite')) {
    model = 'gemini-3.5-flash-lite';
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Current date: ${currentDate}\n\nUser message: "${userText}"`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    let parsed: AIReminderIntent;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid JSON from Gemini');
      }
    }

    return sanitizeIntent(parsed);
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Gemini API timeout (15s)');
    }
    throw error;
  }
}

function sanitizeIntent(raw: any): AIReminderIntent {
  return {
    intent: raw?.intent === 'create_reminders' ? 'create_reminders' : 'unknown',
    tasks: Array.isArray(raw?.tasks)
      ? raw.tasks.map((t: any) => ({
          text: String(t?.text || '').trim(),
          time: t?.time && /^\d{2}:\d{2}$/.test(t.time) ? t.time : null,
          time_period: ['morning', 'afternoon', 'evening', 'night'].includes(t?.time_period)
            ? t.time_period
            : null,
        })).filter((t: any) => t.text.length > 0)
      : [],
    date: {
      type: ['absolute', 'relative'].includes(raw?.date?.type) ? raw.date.type : null,
      value: raw?.date?.value ? String(raw.date.value) : null,
    },
    recipients: Array.isArray(raw?.recipients)
      ? raw.recipients.map((r: any) => ({
          type: r?.type === 'person' ? 'person' : 'self',
          name: r?.name ? String(r.name).trim() : null,
        }))
      : [{ type: 'self', name: null }],
    recurrence: {
      frequency: ['none', 'daily', 'weekly', 'monthly', 'weekdays'].includes(raw?.recurrence?.frequency)
        ? raw.recurrence.frequency
        : 'none',
      days: Array.isArray(raw?.recurrence?.days) ? raw.recurrence.days : [],
    },
    missing_information: Array.isArray(raw?.missing_information) ? raw.missing_information : [],
    confidence: typeof raw?.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0,
  };
}

const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60 * 1000;

// Daily limit: 3 AI requests per user per calendar day
const dailyLimitMap = new Map<number, { count: number; date: string }>();
const DAILY_LIMIT = 3;

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export function checkDailyLimit(userId: number): { allowed: boolean; remaining: number } {
  const today = getTodayDate();
  const entry = dailyLimitMap.get(userId);

  if (!entry || entry.date !== today) {
    dailyLimitMap.set(userId, { count: 1, date: today });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: DAILY_LIMIT - entry.count };
}

export async function parseReminderIntent(
  userText: string,
  userId: number,
  currentDate: string
): Promise<{ success: true; data: AIReminderIntent } | { success: false; error: string; code: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'AI service not configured', code: 'no_api_key' };
  }

  if (!checkRateLimit(userId)) {
    return { success: false, error: 'Too many requests. Try again in a minute.', code: 'rate_limited' };
  }

  // Check daily limit
  const daily = checkDailyLimit(userId);
  if (!daily.allowed) {
    return {
      success: false,
      error: 'You have used all 3 free AI requests for today. Resets at midnight.',
      code: 'daily_limit_reached',
    };
  }

  if (!userText || userText.trim().length < 2) {
    return { success: false, error: 'Text is too short', code: 'too_short' };
  }

  try {
    const intent = await callGeminiAPI(apiKey, userText.trim(), currentDate);
    return { success: true, data: intent };
  } catch (error: any) {
    console.error('[GEMINI] Error:', error.message);
    // Undo the daily count since the request failed
    const entry = dailyLimitMap.get(userId);
    if (entry && entry.count > 0) entry.count--;

    if (error.message?.includes('timeout')) {
      return { success: false, error: 'AI is taking too long. Try again.', code: 'timeout' };
    }

    return { success: false, error: error.message || 'AI service temporarily unavailable', code: 'ai_error' };
  }
}

