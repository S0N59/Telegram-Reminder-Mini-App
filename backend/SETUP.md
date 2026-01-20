# Backend Setup Guide

## Quick Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `backend` folder:

```bash
cd backend
touch .env.local
```

Add your credentials to `.env.local`:

```env
# Supabase Configuration (from your Supabase project)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Telegram Bot Token (get from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional: API Key for scheduler security
SCHEDULER_API_KEY=your_random_secret_key
```

### 3. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 4. Create Database Table

In Supabase SQL Editor, run the SQL from `SUPABASE_SETUP.sql`

### 5. Deploy to Vercel

```bash
cd backend
npx vercel --prod
```

### 6. Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add all variables from step 2

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/reminders?userId=123` - Get reminders
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders?id=123` - Update reminder
- `DELETE /api/reminders?id=123` - Delete reminder
- `GET /api/check-reminders` - Trigger reminder check (called by cron)
