import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Bot token not configured' });
    }

    const { Telegraf } = await import('telegraf');
    const bot = new Telegraf(token);

    // 1. Get user profile photos
    const photos = await bot.telegram.getUserProfilePhotos(parseInt(userId as string), 0, 1);
    
    if (photos.total_count === 0 || !photos.photos[0] || photos.photos[0].length === 0) {
      // User has no avatar, redirect to a generic placeholder
      return res.redirect(302, 'https://ui-avatars.com/api/?name=User&background=random');
    }

    // 2. Get the smallest available photo to save bandwidth (index 0 is usually smallest)
    const fileId = photos.photos[0][0].file_id;

    // 3. Get the file path
    const file = await bot.telegram.getFile(fileId);
    
    if (!file.file_path) {
      return res.redirect(302, 'https://ui-avatars.com/api/?name=User&background=random');
    }

    // 4. Fetch the image from Telegram servers
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const imageResponse = await fetch(fileUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Send back to client with heavy caching (Vercel Edge CDN will cache it)
    res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200'); // Cache for 24 hours
    
    return res.send(buffer);
  } catch (error) {
    console.error('[AVATAR] Error:', error);
    // On error, serve a fallback
    return res.redirect(302, 'https://ui-avatars.com/api/?name=Error&background=ff0000');
  }
}
