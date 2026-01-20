# 🔔 Telegram Reminder Mini App

A beautiful, full-featured reminder application built as a Telegram Mini App. Create reminders, get notified 24/7, and manage everything directly within Telegram.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

## ✨ Features

### Core Features
- 📝 **Create Reminders** - Set text, date, and time for your reminders
- 🔔 **24/7 Notifications** - Get notified even when the app is closed
- ✏️ **Edit Reminders** - Modify existing reminders anytime
- 🗑️ **Delete Reminders** - Remove reminders from the app or directly from Telegram notifications
- 🧹 **Clear Passed Reminders** - Bulk delete all past reminders with one click

### Confirmation Required Reminders
- ✅ **Confirmation Mode** - Create reminders that require explicit confirmation
- 🔄 **Auto Re-remind** - If not confirmed, get re-notified at your chosen interval (5, 10, 15, 30, or 60 minutes)
- 🛑 **Smart Stop** - Confirming any notification stops all future re-reminders

### Customization
- 🌐 **Multi-language** - English and Russian support
- 🎨 **Accent Colors** - Choose from Blue, Red, Yellow, Green, or Purple
- 💾 **Persistent Settings** - Your preferences are saved automatically

### User Experience
- 📱 **Mobile-First Design** - Optimized for Telegram's mobile interface
- 🌙 **Auto Theme** - Adapts to Telegram's light/dark theme
- 📏 **Auto-expanding Input** - Text field grows as you type
- ⏰ **Smart Time Display** - Shows "Today", "Tomorrow", or relative time

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend      │     │   Database      │
│   (Firebase)    │────▶│   (Vercel)      │────▶│   (Supabase)    │
│   React + Vite  │     │   Node.js APIs  │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Telegram Bot   │
                        │  (Notifications)│
                        └─────────────────┘
                               ▲
                               │
                        ┌─────────────────┐
                        │   Cron Service  │
                        │  (cron-job.org) │
                        └─────────────────┘
```

## 📁 Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── ReminderForm    # Create/edit reminder form
│   │   ├── ReminderList    # Display reminders
│   │   └── Settings        # App settings modal
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   ├── i18n.ts             # Translations
│   └── App.tsx             # Main app component
│
├── backend/                # Backend APIs (Vercel)
│   ├── api/
│   │   ├── health.ts       # Health check endpoint
│   │   ├── reminders.ts    # CRUD operations
│   │   ├── check-reminders.ts  # Notification sender
│   │   └── webhook.ts      # Telegram button handler
│   └── vercel.json         # Vercel configuration
│
└── dist/                   # Built frontend files
```

## 🚀 Deployment Guide

### Prerequisites
- Node.js 18+
- Telegram Bot (create via [@BotFather](https://t.me/BotFather))
- [Supabase](https://supabase.com) account (free tier works)
- [Vercel](https://vercel.com) account (free tier works)
- [Firebase](https://firebase.google.com) account (free tier works)
- [cron-job.org](https://cron-job.org) account (free)

### 1. Database Setup (Supabase)

Create a new project in Supabase, then run this SQL:

```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'MEDIUM',
  repeat_type TEXT DEFAULT 'NONE',
  custom_weekdays INTEGER[],
  resend_count INTEGER DEFAULT 0,
  max_resend INTEGER DEFAULT 3,
  next_run_at BIGINT,
  snoozed_until BIGINT,
  confirm_required BOOLEAN DEFAULT FALSE,
  re_remind_interval INTEGER DEFAULT 5,
  confirmed BOOLEAN DEFAULT FALSE,
  last_sent_at BIGINT
);

-- Indexes for performance
CREATE INDEX idx_reminders_user_date ON reminders(user_id, date, time);
CREATE INDEX idx_reminders_done ON reminders(done) WHERE done = FALSE;

-- Disable RLS for simplicity (or configure policies as needed)
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
```

### 2. Backend Deployment (Vercel)

```bash
cd backend
npm install
npx vercel --prod
```

Set these environment variables in Vercel Dashboard:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `TELEGRAM_BOT_TOKEN` - Your bot token from BotFather

### 3. Frontend Deployment (Firebase)

Update `src/config.ts` with your backend URL:
```typescript
export const config = {
  backendUrl: 'https://your-backend.vercel.app'
};
```

Then deploy:
```bash
npm install
npm run build
npx firebase deploy --only hosting
```

### 4. Telegram Bot Setup

1. Set the webhook (replace with your values):
```
https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-backend.vercel.app/api/webhook
```

2. Set the Mini App URL in BotFather:
   - Send `/mybots` → Select bot → Bot Settings → Menu Button
   - Set URL to your Firebase hosting URL

### 5. Cron Job Setup (cron-job.org)

Create a cron job that runs **every minute**:
- URL: `https://your-backend.vercel.app/api/check-reminders`
- Schedule: `* * * * *` (every minute)
- Method: GET

## 🔧 Local Development

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npx vercel dev
```

## 🔒 Security Notes

- Never commit your `.env` files or tokens to git
- Use environment variables for all secrets
- The bot token should be kept private
- Supabase RLS can be enabled for production

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/reminders` | GET | Get user's reminders |
| `/api/reminders` | POST | Create reminder |
| `/api/reminders?id=` | PUT | Update reminder |
| `/api/reminders?id=` | DELETE | Delete reminder |
| `/api/check-reminders` | GET | Send due notifications |
| `/api/webhook` | POST | Handle Telegram callbacks |

## 🌍 Timezone

The app is configured for **UTC+4 (Armenia timezone)**. To change:
1. Edit `backend/api/check-reminders.ts`
2. Modify `USER_TIMEZONE_OFFSET` constant

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for Telegram
