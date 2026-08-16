import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import handlers
import healthHandler from './api/health.js';
import remindersHandler from './api/reminders.js';
import checkRemindersHandler from './api/check-reminders.js';
import webhookHandler from './api/webhook.js';
import contactsHandler from './api/contacts.js';
import settingsHandler from './api/settings.js';
import avatarHandler from './api/avatar.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create an adapter for Vercel functions
const adaptVercel = (handler: any) => {
  return async (req: express.Request, res: express.Response) => {
    // Basic mapping of VercelRequest to Express Request
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Error in handler:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
};

// Routes
app.all('/api/health', adaptVercel(healthHandler));
app.all('/api/reminders', adaptVercel(remindersHandler));
app.all('/api/check-reminders', adaptVercel(checkRemindersHandler));
app.all('/api/webhook', adaptVercel(webhookHandler));
app.all('/api/contacts', adaptVercel(contactsHandler));
app.all('/api/settings', adaptVercel(settingsHandler));
app.all('/api/avatar', adaptVercel(avatarHandler));

const PORT = process.env.PORT || 3000;

// ── Automatic Reminder Scheduler ──
// On Vercel this was triggered by vercel.json cron. On VPS we use setInterval.
const SCHEDULER_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

async function runScheduledCheck() {
  try {
    // Create mock req/res to invoke the existing handler
    const mockReq = { method: 'GET', query: {}, headers: {} } as any;
    let statusCode = 0;
    let responseBody: any = null;
    const mockRes = {
      status(code: number) { statusCode = code; return this; },
      json(body: any) { responseBody = body; return this; },
      setHeader() { return this; },
      end() { return this; },
      headersSent: false,
    } as any;

    await checkRemindersHandler(mockReq, mockRes);

    const sent = responseBody?.newSent || 0;
    const reReminded = responseBody?.reReminded || 0;
    const failed = responseBody?.failed || 0;
    if (sent > 0 || reReminded > 0 || failed > 0) {
      console.log(`[SCHEDULER] ✅ Sent: ${sent}, Re-reminded: ${reReminded}, Failed: ${failed}`);
    }
  } catch (error) {
    console.error('[SCHEDULER] ❌ Error during scheduled check:', error);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Reminder Bot Backend running on port ${PORT}`);

  // Start the reminder scheduler
  setInterval(runScheduledCheck, SCHEDULER_INTERVAL_MS);
  console.log(`⏰ Reminder scheduler started (every ${SCHEDULER_INTERVAL_MS / 1000}s)`);

  // Run once immediately on startup
  setTimeout(runScheduledCheck, 5000);
});
