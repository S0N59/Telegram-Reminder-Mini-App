# GitHub Actions Setup for Automatic Reminder Notifications

## What This Does

GitHub Actions will automatically call your backend API **every minute** to check for due reminders and send Telegram notifications. This means:
- ✅ Reminders work 24/7 even when the app is closed
- ✅ No need to keep the browser open
- ✅ Completely free (GitHub Actions free tier)

## Setup Instructions

### 1. Push Your Code to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Add the Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the secret:
   - **Name**: `SCHEDULER_API_KEY`
   - **Value**: `42ccd8eb8e30d9733d7dcc547c9678902447c32ddbe2df635b9f66abb11f7b6b`

### 3. Enable GitHub Actions

1. Go to your repository's **Actions** tab
2. If prompted, enable Actions for your repository
3. The workflow will start running automatically every minute

### 4. Verify It's Working

1. Go to **Actions** tab in your repository
2. You should see "Check Reminders" workflow
3. Click on a recent run to see the logs
4. You should see output like:
   ```
   Checking reminders at Mon Jan 20 2026 12:00:00 UTC
   Response: {"message":"No reminders due at this time","checked":0,"sent":0}
   HTTP Code: 200
   ```

## Manual Test

You can manually trigger the workflow:

1. Go to **Actions** → **Check Reminders**
2. Click **Run workflow** → **Run workflow**

## Troubleshooting

### Workflow Not Running
- Make sure Actions are enabled for your repository
- Check that the workflow file is in `.github/workflows/check-reminders.yml`

### 401 Unauthorized Error
- Verify the `SCHEDULER_API_KEY` secret is set correctly
- Make sure it matches the key in your Vercel environment variables

### No Reminders Being Sent
- Check that reminders exist in the database
- Verify the date and time format matches (YYYY-MM-DD and HH:mm)
- Check Vercel logs for any errors

## API Endpoint

The workflow calls:
```
POST https://backend-9asrt4ke5-norayrs-projects-a813a9d8.vercel.app/api/check-reminders
Header: x-api-key: YOUR_SCHEDULER_API_KEY
```

## Costs

- **GitHub Actions**: Free for public repos, 2000 minutes/month for private repos
- **Vercel**: Free tier includes serverless function invocations
- **Supabase**: Free tier includes database operations
- **Total Cost**: $0/month 🎉
