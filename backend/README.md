# Telegram Reminders Backend API

Backend API for Telegram Reminders Mini App using Vercel Serverless Functions, Supabase, and Telegram Bot API.

## 🚀 Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from @BotFather
- `SCHEDULER_API_KEY` (optional) - API key for securing the scheduler endpoint

### 3. Local Development

```bash
npm run dev
```

This will start Vercel dev server on `http://localhost:3000`

### 4. Deploy to Vercel

```bash
# Install Vercel CLI globally (if not already installed)
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables
```

## 📡 API Endpoints

### GET /api/reminders?userId={userId}
Get all active reminders for a user.

**Query Parameters:**
- `userId` (required) - Telegram user ID

**Response:**
```json
[
  {
    "id": "1234567890",
    "text": "Meeting at 3pm",
    "date": "2024-01-15",
    "time": "15:00",
    "userId": 123456789,
    "createdAt": 1705320000000,
    "done": false,
    "sent": false
  }
]
```

### POST /api/reminders
Create a new reminder.

**Request Body:**
```json
{
  "id": "1234567890",
  "text": "Meeting at 3pm",
  "date": "2024-01-15",
  "time": "15:00",
  "userId": 123456789,
  "priority": "MEDIUM",
  "repeat": "NONE"
}
```

### PUT /api/reminders?id={reminderId}
Update a reminder.

**Query Parameters:**
- `id` (required) - Reminder ID

**Request Body:**
```json
{
  "text": "Updated reminder text",
  "done": true
}
```

### DELETE /api/reminders?id={reminderId}
Delete a reminder.

**Query Parameters:**
- `id` (required) - Reminder ID

### POST /api/check-reminders
Check for due reminders and send notifications. Called by GitHub Actions scheduler.

**Headers (optional):**
- `x-api-key` - API key if SCHEDULER_API_KEY is set

**Response:**
```json
{
  "message": "Reminder check completed",
  "checked": 5,
  "sent": 4,
  "failed": 1,
  "timestamp": "2024-01-15T15:00:00.000Z"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T15:00:00.000Z"
}
```

## 🔒 Security

- Bot token is stored in environment variables (never exposed to frontend)
- CORS is enabled for all endpoints
- Optional API key authentication for scheduler endpoint
- All database operations use Supabase with proper authentication

## 📦 Dependencies

- `@supabase/supabase-js` - Supabase client
- `telegraf` - Telegram Bot API client
- `@vercel/node` - Vercel serverless functions runtime

## 🗄️ Database Schema

The backend expects a `reminders` table in Supabase with the following structure:

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
  snoozed_until BIGINT
);
```

## 🚨 Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection issues)
