# 🔔 Telegram Reminder Mini App

A powerful, beautiful reminder application built as a Telegram Mini App. Create reminders, receive 24/7 notifications directly in Telegram, and manage everything with an intuitive interface.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Deployment Guide](#-deployment-guide)
- [Local Development](#-local-development)
- [Configuration](#-configuration)
- [Security](#-security)

---

## ✨ Features

### 📝 Reminder Management
| Feature | Description |
|---------|-------------|
| **Create Reminders** | Set reminder text, date, and time with an intuitive form |
| **Edit Reminders** | Modify any existing reminder's details |
| **Delete Reminders** | Remove reminders from app or directly from Telegram notifications |
| **Auto-expanding Input** | Text field grows automatically as you type longer messages |
| **Date Validation** | Prevents selecting past dates |
| **Character Counter** | Shows remaining characters (max 200) |

### 🔔 Notification System
| Feature | Description |
|---------|-------------|
| **24/7 Notifications** | Receive reminders even when the app is closed |
| **Beautiful Format** | Notifications include emoji, formatted text, date & time |
| **Interactive Buttons** | Confirm or Delete reminders directly from notifications |
| **Timezone Support** | Configured for UTC+4 (Armenia), easily customizable |

### ✅ Confirmation Required Reminders
| Feature | Description |
|---------|-------------|
| **Toggle Mode** | Enable "Confirmation Required" for important reminders |
| **Auto Re-remind** | If not confirmed, get notified again at chosen interval |
| **Interval Options** | 5, 10, 15, 30, or 60 minutes |
| **Smart Stop** | Confirming ANY notification stops all future re-reminders |
| **Visual Feedback** | "Confirm" button changes to "Delete" after confirmation |

### ⚙️ Settings & Customization
| Feature | Description |
|---------|-------------|
| **Language Support** | English 🇺🇸 and Russian 🇷🇺 |
| **Accent Colors** | Blue 💙, Red ❤️, Yellow 💛, Green 💚, Purple 💜 |
| **Persistent Preferences** | Settings saved automatically per user |
| **Auto Theme** | Adapts to Telegram's light/dark mode |

### 📱 User Experience
| Feature | Description |
|---------|-------------|
| **Mobile-First Design** | Optimized for Telegram's mobile interface |
| **Next Reminder Banner** | Shows upcoming reminder at the top |
| **Clear Passed Reminders** | Bulk delete all past reminders with one tap |
| **Smart Time Display** | Shows "Today", "Tomorrow", "in 2h 30m", etc. |
| **Smooth Animations** | Polished transitions and interactions |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                      TELEGRAM MINI APP                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Frontend (React + Vite)                    │  │
│  │                    Hosted on Firebase                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │  │
│  │  │ ReminderForm│ │ReminderList │ │       Settings          │ │  │
│  │  │  - Create   │ │  - Display  │ │  - Language (EN/RU)     │ │  │
│  │  │  - Edit     │ │  - Delete   │ │  - Accent Color         │ │  │
│  │  │  - Confirm  │ │  - Edit     │ │  - Auto-save            │ │  │
│  │  │    Toggle   │ │  - Clear    │ │                         │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ HTTPS API Calls
┌────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Vercel Serverless)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      API Endpoints                            │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │  │
│  │  │  /api/      │ │   /api/     │ │      /api/              │ │  │
│  │  │  reminders  │ │   check-    │ │      webhook            │ │  │
│  │  │  - GET      │ │   reminders │ │  - Handle Telegram      │ │  │
│  │  │  - POST     │ │  - Send     │ │    button clicks        │ │  │
│  │  │  - PUT      │ │    notifs   │ │  - Confirm/Delete       │ │  │
│  │  │  - DELETE   │ │  - Re-remind│ │    actions              │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
           │                    │                      │
           ▼                    ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    SUPABASE      │  │   TELEGRAM BOT   │  │   CRON SERVICE   │
│   (PostgreSQL)   │  │      API         │  │  (cron-job.org)  │
│                  │  │                  │  │                  │
│  - Store data    │  │  - Send messages │  │  - Every minute  │
│  - Query reminders│  │  - Inline buttons│  │  - Trigger check │
│  - Real-time     │  │  - Delete msgs   │  │  - 24/7 running  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow

1. **Creating a Reminder:**
   ```
   User → Mini App → POST /api/reminders → Supabase → Success Response
   ```

2. **Sending Notifications:**
   ```
   Cron (every min) → GET /api/check-reminders → Query Supabase → 
   → Find due reminders → Send via Telegram Bot API → Update DB
   ```

3. **Button Interactions:**
   ```
   User clicks button → Telegram → POST /api/webhook → 
   → Parse action → Update Supabase → Edit/Delete Telegram message
   ```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type safety |
| **Vite** | Fast build tool & dev server |
| **CSS3** | Custom styling with CSS variables |
| **Firebase Hosting** | Static file hosting |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **TypeScript** | Type safety |
| **Vercel Serverless** | API hosting |
| **Telegraf** | Telegram Bot library |

### Database & Services
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database |
| **Telegram Bot API** | Send notifications |
| **cron-job.org** | Scheduled task runner |

---

## 📁 Project Structure

```
Telegram-Reminder-Mini-App/
│
├── 📂 src/                          # Frontend source code
│   ├── 📂 components/               # React components
│   │   ├── ReminderForm.tsx         # Create/edit reminder form
│   │   ├── ReminderForm.css         # Form styles
│   │   ├── ReminderList.tsx         # Display all reminders
│   │   ├── ReminderList.css         # List styles
│   │   ├── Settings.tsx             # Settings modal
│   │   └── Settings.css             # Settings styles
│   │
│   ├── 📂 utils/                    # Utility functions
│   │   ├── telegram.ts              # Telegram WebApp integration
│   │   ├── reminder.ts              # Reminder operations
│   │   ├── reminderStorage.ts       # API communication
│   │   ├── reminderScheduler.ts     # Frontend scheduler (disabled)
│   │   └── theme.ts                 # Theme management
│   │
│   ├── 📂 types/                    # TypeScript definitions
│   │   ├── reminder.ts              # Reminder types
│   │   └── telegram.d.ts            # Telegram WebApp types
│   │
│   ├── App.tsx                      # Main app component
│   ├── App.css                      # Global styles
│   ├── main.tsx                     # Entry point
│   ├── config.ts                    # Configuration
│   ├── i18n.ts                      # Translations (EN/RU)
│   └── vite-env.d.ts                # Vite types
│
├── 📂 backend/                      # Backend source code
│   ├── 📂 api/                      # Serverless functions
│   │   ├── health.ts                # Health check endpoint
│   │   ├── reminders.ts             # CRUD operations
│   │   ├── check-reminders.ts       # Notification sender
│   │   └── webhook.ts               # Telegram callback handler
│   │
│   ├── vercel.json                  # Vercel configuration
│   ├── package.json                 # Backend dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── SUPABASE_SETUP.sql           # Database schema
│
├── 📂 dist/                         # Built frontend (auto-generated)
│
├── index.html                       # HTML template
├── package.json                     # Frontend dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite configuration
├── firebase.json                    # Firebase config
├── env.example                      # Environment template
└── README.md                        # This file
```

---

## 📡 API Reference

### Base URL
```
https://your-backend.vercel.app/api
```

### Endpoints

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

#### `GET /reminders?userId={userId}`
Get all active reminders for a user.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | number | Yes | Telegram user ID |

**Response:**
```json
[
  {
    "id": "1705750800000",
    "text": "Call mom",
    "date": "2024-01-20",
    "time": "15:00",
    "createdAt": 1705750800000,
    "userId": 123456789,
    "done": false,
    "sent": false,
    "priority": "MEDIUM",
    "repeat": "NONE",
    "confirmRequired": false,
    "reRemindInterval": 5,
    "confirmed": false,
    "lastSentAt": null
  }
]
```

---

#### `POST /reminders`
Create a new reminder.

**Body:**
```json
{
  "text": "Call mom",
  "date": "2024-01-20",
  "time": "15:00",
  "userId": 123456789,
  "priority": "MEDIUM",
  "repeat": "NONE",
  "confirmRequired": false,
  "reRemindInterval": 5
}
```

**Response:** Created reminder object

---

#### `PUT /reminders?id={id}`
Update an existing reminder.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | Reminder ID |

**Body:** Partial reminder object with fields to update

**Response:** Updated reminder object

---

#### `DELETE /reminders?id={id}`
Delete a reminder.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | Reminder ID |

**Response:**
```json
{
  "success": true,
  "message": "Reminder deleted"
}
```

---

#### `GET /check-reminders`
Check and send due notifications. Called by cron job.

**Response:**
```json
{
  "message": "Reminder check completed",
  "checked": 5,
  "sent": 2,
  "failed": 0,
  "reReminded": 1,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

#### `POST /webhook`
Handle Telegram callback queries (button clicks).

**Body:** Telegram Update object

**Actions:**
| Callback Data | Action |
|---------------|--------|
| `confirm_{id}` | Mark reminder as confirmed, show Delete button |
| `delete_{id}` | Delete reminder and remove message |

---

## 🗄 Database Schema

### Table: `reminders`

```sql
CREATE TABLE reminders (
  -- Primary identification
  id TEXT PRIMARY KEY,                    -- Unique reminder ID (timestamp-based)
  
  -- Core fields
  text TEXT NOT NULL,                     -- Reminder text (max 200 chars)
  date TEXT NOT NULL,                     -- Date in YYYY-MM-DD format
  time TEXT NOT NULL,                     -- Time in HH:MM format
  user_id BIGINT NOT NULL,                -- Telegram user ID
  created_at BIGINT NOT NULL,             -- Creation timestamp
  
  -- Status flags
  done BOOLEAN DEFAULT FALSE,             -- Is reminder completed?
  sent BOOLEAN DEFAULT FALSE,             -- Has notification been sent?
  
  -- Optional features
  priority TEXT DEFAULT 'MEDIUM',         -- HIGH, MEDIUM, LOW
  repeat_type TEXT DEFAULT 'NONE',        -- NONE, DAILY, WEEKLY, MONTHLY
  custom_weekdays INTEGER[],              -- For custom repeat [0-6]
  
  -- Re-send logic
  resend_count INTEGER DEFAULT 0,         -- Times re-sent
  max_resend INTEGER DEFAULT 3,           -- Max re-send attempts
  next_run_at BIGINT,                     -- Next scheduled run
  snoozed_until BIGINT,                   -- Snooze end time
  
  -- Confirmation required feature
  confirm_required BOOLEAN DEFAULT FALSE, -- Needs confirmation?
  re_remind_interval INTEGER DEFAULT 5,   -- Re-remind interval (minutes)
  confirmed BOOLEAN DEFAULT FALSE,        -- Has been confirmed?
  last_sent_at BIGINT                     -- Last notification timestamp
);

-- Performance indexes
CREATE INDEX idx_reminders_user_date ON reminders(user_id, date, time);
CREATE INDEX idx_reminders_done ON reminders(done) WHERE done = FALSE;
CREATE INDEX idx_reminders_confirm ON reminders(confirm_required, confirmed) 
  WHERE confirm_required = TRUE AND confirmed = FALSE;
```

---

## 🚀 Deployment Guide

### Prerequisites

- Node.js 18+
- Accounts on: [Telegram](https://telegram.org), [Supabase](https://supabase.com), [Vercel](https://vercel.com), [Firebase](https://firebase.google.com), [cron-job.org](https://cron-job.org)

### Step 1: Create Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot` and follow prompts
3. Save the **Bot Token** (keep it secret!)

### Step 2: Setup Database (Supabase)

1. Create new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the SQL from `backend/SUPABASE_SETUP.sql`
4. Copy **Project URL** and **anon key** from Settings → API

### Step 3: Deploy Backend (Vercel)

```bash
cd backend
npm install
npx vercel login
npx vercel --prod
```

Add environment variables in Vercel Dashboard:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
```

### Step 4: Deploy Frontend (Firebase)

1. Update `src/config.ts`:
```typescript
export const config = {
  backendUrl: 'https://your-backend.vercel.app'
};
```

2. Deploy:
```bash
npm install
npm run build
npx firebase login
npx firebase init hosting  # Select 'dist' as public directory
npx firebase deploy --only hosting
```

### Step 5: Configure Telegram Bot

1. Set webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-backend.vercel.app/api/webhook
```

2. Set Mini App URL in @BotFather:
   - `/mybots` → Select bot → Bot Settings → Menu Button
   - Set URL to your Firebase hosting URL

### Step 6: Setup Cron Job

1. Go to [cron-job.org](https://cron-job.org)
2. Create new cron job:
   - URL: `https://your-backend.vercel.app/api/check-reminders`
   - Schedule: Every 1 minute (`* * * * *`)
   - Method: GET

---

## 💻 Local Development

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Backend
```bash
cd backend

# Install dependencies
npm install

# Start local dev server
npx vercel dev
```

---

## ⚙️ Configuration

### Timezone

Default: **UTC+4 (Armenia)**

To change, edit `backend/api/check-reminders.ts`:
```typescript
const USER_TIMEZONE_OFFSET = 4; // Change to your UTC offset
```

### Accent Colors

Available in `src/App.tsx`:
```typescript
const accentColorValues = {
  blue: { main: '#3390ec', light: 'rgba(51, 144, 236, 0.1)' },
  red: { main: '#ff3b30', light: 'rgba(255, 59, 48, 0.1)' },
  yellow: { main: '#ffcc00', light: 'rgba(255, 204, 0, 0.15)' },
  green: { main: '#34c759', light: 'rgba(52, 199, 89, 0.1)' },
  purple: { main: '#af52de', light: 'rgba(175, 82, 222, 0.1)' },
};
```

### Languages

Translations in `src/i18n.ts`:
- English (`en`)
- Russian (`ru`)

---

## 🔒 Security

### Best Practices Implemented

✅ Bot token stored only in backend environment variables  
✅ No secrets in frontend code  
✅ `.gitignore` excludes all `.env` files  
✅ CORS headers configured  
✅ Input validation on all endpoints  

### Environment Variables

**Never commit these files:**
- `.env`
- `.env.local`
- `.env.production`

Use `env.example` as a template.

---

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<div align="center">

Made with ❤️ for Telegram

**[⬆ Back to Top](#-telegram-reminder-mini-app)**

</div>
