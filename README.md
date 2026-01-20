# 🔔 Telegram Reminder Mini App

A modern Telegram Mini App for creating and managing reminders with **24/7 automatic notifications** - even when the app is closed!

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

## ✨ Features

- 🎨 **Modern, minimalist design** - Clean UI optimized for mobile
- 📱 **Full mobile optimization** - Touch-friendly interface
- 🔔 **24/7 Notifications** - Works even when app is closed
- ⏰ **Minute-by-minute checking** - Never miss a reminder
- 🎯 **Telegram WebApp SDK** - Native Telegram integration
- 💾 **Cloud storage** - Reminders stored securely in Supabase
- 🌈 **Theme support** - Adapts to Telegram's light/dark theme
- 📅 **Calendar picker** - Easy date selection
- 🌍 **Multi-language ready** - i18n support built-in

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Telegram      │────▶│   Frontend      │────▶│   Backend       │
│   Mini App      │     │   (React/Vite)  │     │   (Vercel)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │   cron-job.org  │──────────────┤
                        │   (Scheduler)   │              │
                        └─────────────────┘              │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Telegram      │◀────│   Supabase      │
                        │   Bot API       │     │   (Database)    │
                        └─────────────────┘     └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Telegram WebApp SDK** | Telegram integration |

### Backend
| Technology | Purpose |
|------------|---------|
| **TypeScript** | API logic |
| **Vercel Serverless** | API hosting |
| **Supabase** | PostgreSQL database |
| **Telegraf** | Telegram Bot API |

### External Services
| Service | Purpose |
|---------|---------|
| **cron-job.org** | Scheduled reminder checks (every minute) |
| **Telegram Bot API** | Send notifications |

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Telegram Bot (create via [@BotFather](https://t.me/BotFather))
- Supabase account
- Vercel account

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/Telegram-Reminder-Mini-App.git
cd Telegram-Reminder-Mini-App
```

### 2. Install dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Environment Setup

Create `.env.local` in the root directory:
```env
VITE_BACKEND_URL=https://your-backend.vercel.app
VITE_USE_BACKEND=true
```

Create `.env.local` in the `backend/` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SCHEDULER_API_KEY=your_random_api_key
```

### 4. Database Setup

Run this SQL in your Supabase SQL editor:
```sql
CREATE TABLE reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT NOT NULL,
  text TEXT NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(5) NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for simplicity (or configure policies)
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
```

## 🚀 Development

```bash
# Start frontend dev server
npm run dev

# The app will be available at http://localhost:5173
```

## 🌐 Deployment

### Frontend (Firebase/Vercel/Netlify)
```bash
npm run build
# Deploy the dist/ folder
```

### Backend (Vercel)
```bash
cd backend
vercel --prod
```

### Scheduler (cron-job.org)
1. Create account at [cron-job.org](https://cron-job.org)
2. Add new cron job:
   - URL: `https://your-backend.vercel.app/api/check-reminders`
   - Schedule: Every minute (`* * * * *`)
   - Headers: `x-api-key: your_scheduler_api_key`

## 📁 Project Structure

```
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── Calendar.tsx    # Date picker
│   │   ├── ReminderForm.tsx    # Create reminder form
│   │   ├── ReminderList.tsx    # Display reminders
│   │   ├── ThemeToggle.tsx     # Dark/light toggle
│   │   └── LanguageToggle.tsx  # Language selector
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities
│   │   ├── telegram.ts     # Telegram WebApp helpers
│   │   ├── reminder.ts     # Reminder CRUD operations
│   │   └── theme.ts        # Theme management
│   ├── config.ts           # App configuration
│   ├── i18n.ts             # Internationalization
│   ├── App.tsx             # Main component
│   └── main.tsx            # Entry point
│
├── backend/                # Backend source
│   ├── api/                # Vercel serverless functions
│   │   ├── health.ts       # Health check endpoint
│   │   ├── reminders.ts    # CRUD API for reminders
│   │   └── check-reminders.ts  # Scheduler endpoint
│   ├── lib/                # Shared libraries
│   │   ├── supabase.ts     # Database client
│   │   └── telegram.ts     # Bot client
│   └── vercel.json         # Vercel configuration
│
├── dist/                   # Built frontend (production)
└── index.html              # HTML entry point
```

## 🔔 How Notifications Work

1. **User creates a reminder** → Stored in Supabase with date & time
2. **cron-job.org** runs every minute → Calls `/api/check-reminders`
3. **Backend checks database** → Finds reminders due at current time
4. **Telegram Bot sends message** → Beautiful formatted notification
5. **Reminder marked as sent** → Won't be sent again

### Notification Format
```
━━━━━━━━━━━━━━━━━━━━━
⏰ REMINDER
━━━━━━━━━━━━━━━━━━━━━

📝 Your reminder text

📅 Jan 20, 2026  •  🕐 15:30

━━━━━━━━━━━━━━━━━━━━━
✨ Stay on track!
━━━━━━━━━━━━━━━━━━━━━
```

## 🔐 Security

- ✅ Bot token stored only in Vercel environment variables
- ✅ API key authentication for scheduler endpoint
- ✅ No sensitive data in frontend code
- ✅ `.env.local` files ignored by git

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/reminders` | GET | Get user's reminders |
| `/api/reminders` | POST | Create reminder |
| `/api/reminders` | PUT | Update reminder |
| `/api/reminders` | DELETE | Delete reminder |
| `/api/check-reminders` | GET | Check & send due reminders |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for your own purposes!

---

Made with ❤️ for Telegram
