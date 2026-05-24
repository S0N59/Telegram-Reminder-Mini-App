# 🔔 Telegram Reminder Mini App

A powerful, beautiful reminder application built as a Telegram Mini App. Create reminders, receive 24/7 notifications directly in Telegram, and manage everything with an intuitive interface and **Notion Dashboard** synchronization.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Notion](https://img.shields.io/badge/Notion-000000?style=flat&logo=notion&logoColor=white)

---

## ✨ Features (v2.0)

### 📊 Task Status Lifecycle
| Status | Emoji | Description |
|--------|-------|-------------|
| **To Do** | ⚪ | Default state for new tasks |
| **In Progress** | 🟡 | Active tasks you are working on |
| **Done** | 🟢 | Completed tasks |
| **Archive** | 📁 | Tasks deleted from Telegram/Supabase but kept in Notion history |

### 📓 Notion Dashboard Sync
| Feature | Description |
|---------|-------------|
| **Auto-Sync** | Every reminder created is automatically added to your Notion Database |
| **Live Updates** | Changing status in Telegram (In Progress/Done) instantly updates Notion |
| **Persistence** | Deleting a task in the bot moves it to the "Archive" status in Notion instead of deleting it, preserving your history |

### 🔔 Interactive Notification UI
| Feature | Description |
|---------|-------------|
| **Sequential Flow** | Buttons change dynamically: `In Progress` → `Done` → `Reopen` |
| **Smart Time** | Shows relative time (e.g., "Today at 14:30", "Tomorrow at 10:00") |
| **Clean Format** | Modern HTML-based layout with visual separators and clear priority labels |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                           │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                      TELEGRAM MINI APP                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Frontend (React + Vite)                   │  │
│  │                    Hosted on Firebase                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ HTTPS API Calls
┌────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Vercel Serverless)                   │
│  ┌───────────────────────────┐      ┌───────────────────────────┐  │
│  │      API Endpoints        │      │      Services             │  │
│  │ - /api/reminders (CRUD)   │      │ - Notion Service          │  │
│  │ - /api/check-reminders    │ <──> │ - Telegram Bot Service    │  │
│  │ - /api/webhook (Callbacks)│      │ - Smart Time Utility      │  │
│  └───────────────────────────┘      └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
           │                    │                      │
           ▼                    ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    SUPABASE      │  │   TELEGRAM BOT   │  │     NOTION       │
│   (PostgreSQL)   │  │      API         │  │   (Dashboard)    │
│                  │  │                  │  │                  │
│ - Active tasks   │  │ - Notifications  │  │ - Task Archive   │
│ - User State     │  │ - Interactive    │  │ - Status Sync    │
│ - Status tracking│  │ - Callback Query │  │ - History        │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 📁 Project Structure

```
Telegram-Reminder-Mini-App/
│
├── 📂 src/                          # Frontend source code (React)
├── 📂 backend/                      # Backend source code (Node.js)
│   ├── 📂 api/                      # Serverless functions (Vercel)
│   └── 📂 services/                 # Notion & Telegram logic
├── 📂 dist/                         # Built frontend
├── index.html                       # HTML template
├── package.json                     # Dependencies
└── README.md                        # This file
```

---

## 🗄 Database Schema (Updated)

### Table: `reminders`

```sql
ALTER TABLE reminders ADD COLUMN status TEXT DEFAULT 'todo';
ALTER TABLE reminders ADD COLUMN notion_page_id TEXT;
```

---

## 🚀 Deployment Guide

### Prerequisites
- Node.js 18+
- Accounts on: Telegram, Supabase, Vercel, Firebase, Notion

### Step 1: Notion Setup
1. Create an Internal Integration at [developers.notion.com](https://developers.notion.com)
2. Create a Database with these columns:
   - **Task Name** (Title)
   - **Status** (Status: To Do, In Progress, Done, Archive)
   - **Due Date** (Date)
   - **Priority** (Select: High 🔥, Medium ⏳, Low 🧊)
   - **Category** (Select)
3. Share the Database with your Integration.

### Step 2: Backend (Vercel)
```bash
cd backend
npm install
npx vercel --prod
```
Add environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `NOTION_TOKEN`, `NOTION_DATABASE_ID`.

### Step 3: Frontend (Firebase)
```bash
npm install
npm run build
npx firebase deploy
```

---

## ⚙️ Configuration

### Timezone
Default: **UTC+4 (Armenia)**. Edit `backend/api/check-reminders.ts` to change.

### Accent Colors
Customizable in `src/App.tsx` and `Settings.tsx`.

---

## 📄 License
MIT License. Made with ❤️ for Telegram.

**[⬆ Back to Top](#-telegram-reminder-mini-app)**
