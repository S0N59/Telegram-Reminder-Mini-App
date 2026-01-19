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

# Telegram Bot Token (use your existing bot token)
TELEGRAM_BOT_TOKEN=8329415132:AAF1yjg8l3Frjaq0PKv0WfTeeC8qweZ9PyU

# Optional: API Key for scheduler security
SCHEDULER_API_KEY=your_optional_secret_key_here
```

### 3. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 4. Create Database Table

In Supabase SQL Editor, run:

```sql
-- Create reminders table
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

-- Create indexes for better performance
CREATE INDEX idx_reminders_user_date ON reminders(user_id, date, time);
CREATE INDEX idx_reminders_done ON reminders(done) WHERE done = FALSE;
```

### 5. Test Locally

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No (first time)
# - Project name? telegram-reminders-backend
# - Directory? ./
# - Override settings? No
```

### 7. Set Environment Variables in Vercel

After deployment:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
   - `TELEGRAM_BOT_TOKEN` = 8329415132:AAF1yjg8l3Frjaq0PKv0WfTeeC8qweZ9PyU
   - `SCHEDULER_API_KEY` = (optional, generate a random string)

5. **Redeploy** your project (Vercel will automatically redeploy when you add env vars)

### 8. Get Your Backend URL

After deployment, Vercel will give you a URL like:
```
https://telegram-reminders-backend.vercel.app
```

Your API endpoints will be:
- `https://your-project.vercel.app/api/reminders`
- `https://your-project.vercel.app/api/check-reminders`
- `https://your-project.vercel.app/api/health`

### 9. Update Frontend Configuration

Update your frontend `.env` file:

```env
# Remove the bot token (security!)
# VITE_BOT_TOKEN=  # Don't use this anymore!

# Use backend instead
VITE_BACKEND_URL=https://your-project.vercel.app/api
VITE_USE_BACKEND=true
```

## Testing

### Test Health Endpoint
```bash
curl https://your-project.vercel.app/api/health
```

### Test Create Reminder
```bash
curl -X POST https://your-project.vercel.app/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test reminder",
    "date": "2024-01-20",
    "time": "15:00",
    "userId": 123456789
  }'
```

### Test Get Reminders
```bash
curl "https://your-project.vercel.app/api/reminders?userId=123456789"
```

## Troubleshooting

### Error: Missing Supabase environment variables
- Make sure `.env.local` exists in the `backend` folder
- Check that all variables are set correctly

### Error: Missing TELEGRAM_BOT_TOKEN
- Verify your bot token is correct
- Make sure it's set in Vercel environment variables

### Database connection errors
- Check your Supabase URL and key
- Verify the `reminders` table exists
- Check Supabase project is active

### CORS errors
- The API already has CORS enabled
- Make sure you're using the correct backend URL in frontend

## Next Steps

1. ✅ Backend is set up
2. ⏭️ Set up GitHub Actions scheduler (Step 5)
3. ⏭️ Update frontend to use backend API (Step 6)
