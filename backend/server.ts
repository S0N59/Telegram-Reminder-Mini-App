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
import broadcastHandler from './api/broadcast.js';
import aiHandler from './api/ai.js';
import channelsHandler from './api/channels.js';
import adminStatsHandler from './api/admin-stats.js';
import uploadHandler from './api/upload.js';
import emojiHandler from './api/emoji.js';
import youtubeHandler from './api/youtube.js';
import { checkYouTubeUploads } from './services/youtubeScheduler.js';

const app = express();

// Middleware
app.use(cors());
// Media uploads arrive as raw bytes, so they must bypass the JSON parser.
app.use('/api/upload', express.raw({ type: () => true, limit: '52mb' }));
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
app.all('/api/broadcast', adaptVercel(broadcastHandler));
app.all('/api/ai', adaptVercel(aiHandler));
app.all('/api/channels', adaptVercel(channelsHandler));
app.all('/api/admin-stats', adaptVercel(adminStatsHandler));
app.all('/api/upload', adaptVercel(uploadHandler));
app.all('/api/emoji', adaptVercel(emojiHandler));
app.all('/api/youtube', adaptVercel(youtubeHandler));
app.use('/api/youtube', adaptVercel(youtubeHandler));


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

    // Run YouTube Uploads Check
    await checkYouTubeUploads().catch(e => console.error('[SCHEDULER] YouTube check error:', e));
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
