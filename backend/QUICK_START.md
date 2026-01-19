# 🚀 Quick Start - Use Your Existing Bot Token

## Your Current Bot Token
```
8329415132:AAF1yjg8l3Frjaq0PKv0WfTeeC8qweZ9PyU
```

This token will be used in the backend (secure) and removed from frontend.

## Step-by-Step Setup

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env.local` File

Create `backend/.env.local` with your credentials:

```env
# Your Supabase credentials (get from Supabase dashboard → Settings → API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_from_supabase

# Your existing bot token (from env.example)
TELEGRAM_BOT_TOKEN=8329415132:AAF1yjg8l3Frjaq0PKv0WfTeeC8qweZ9PyU

# Optional: Generate a random string for scheduler security
SCHEDULER_API_KEY=generate_random_string_here
```

### 3. Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → paste as `SUPABASE_URL`
   - **anon public** key → paste as `SUPABASE_ANON_KEY`

### 4. Create Database Table

In Supabase, go to **SQL Editor** and run:

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

CREATE INDEX idx_reminders_user_date ON reminders(user_id, date, time);
CREATE INDEX idx_reminders_done ON reminders(done) WHERE done = FALSE;
```

### 5. Test Locally

```bash
npm run dev
```

Open: http://localhost:3000/api/health

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Follow prompts, then:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all 3 variables from your `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN` = `8329415132:AAF1yjg8l3Frjaq0PKv0WfTeeC8qweZ9PyU`
3. Redeploy (Vercel does this automatically)

### 7. Get Your Backend URL

After deployment, Vercel gives you a URL like:
```
https://telegram-reminders-backend-xyz.vercel.app
```

**Save this URL** - you'll need it for the frontend!

### 8. Update Frontend (Next Step)

After backend is deployed, update your frontend `.env`:

```env
# Remove bot token from frontend (security!)
# VITE_BOT_TOKEN=  # DELETE THIS LINE

# Add backend URL
VITE_BACKEND_URL=https://your-backend-url.vercel.app/api
VITE_USE_BACKEND=true
```

## ✅ Checklist

- [ ] Backend dependencies installed
- [ ] `.env.local` created with Supabase credentials
- [ ] Bot token added to `.env.local`
- [ ] Database table created in Supabase
- [ ] Local test successful (`/api/health` works)
- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Backend URL saved for frontend

## 🎯 What's Next?

1. ✅ Backend is ready
2. ⏭️ Set up GitHub Actions scheduler
3. ⏭️ Update frontend to use backend API

---

**Your bot token is now secure on the backend!** 🎉
