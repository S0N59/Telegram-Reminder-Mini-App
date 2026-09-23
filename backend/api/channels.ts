import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';
import { requireTelegramUser, setApiCors } from '../lib/telegramAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setApiCors(res, 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const telegramUser = requireTelegramUser(req, res);
  if (!telegramUser) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  try {
    const db = getDb();

    // Ensure user_channels table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_channels (
        id TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL,
        title TEXT NOT NULL,
        username TEXT,
        chat_type TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE (user_id, chat_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);
    `).catch(() => {});

    // 1. GET: List linked channels for a user
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { rows } = await db.query(
        `SELECT * FROM user_channels WHERE user_id = $1 ORDER BY created_at DESC`,
        [telegramUser.id]
      );

      return res.status(200).json(rows);
    }

    // 2. DELETE: Unlink channel
    if (req.method === 'DELETE') {
      const { id, userId } = req.query;
      if (!id || !userId) {
        return res.status(400).json({ error: 'id and userId are required' });
      }

      await db.query(
        `DELETE FROM user_channels WHERE id = $1 AND user_id = $2`,
        [id, telegramUser.id]
      );

      return res.status(200).json({ ok: true });
    }

    // 3. POST: Link a new channel or Publish post
    if (req.method === 'POST') {
      const action = req.query.action || req.body.action;

      // --- ACTION: PUBLISH ---
      if (action === 'publish') {
        const { userId, channelId, htmlContent, fallbackHtml, media, buttons, silent } = req.body;
        if (!userId || !channelId || !htmlContent) {
          return res.status(400).json({ error: 'userId, channelId, and htmlContent are required' });
        }

        // Verify channel ownership
        const { rows: channelRows } = await db.query(
          `SELECT * FROM user_channels WHERE id = $1 AND user_id = $2`,
          [channelId, telegramUser.id]
        );

        if (channelRows.length === 0) {
          return res.status(404).json({ error: 'Channel not found or not linked to this user' });
        }

        const channel = channelRows[0];
        const targetChatId = channel.chat_id;

        // Build inline_keyboard markup if buttons are present
        let replyMarkup: any = undefined;
        if (Array.isArray(buttons) && buttons.length > 0) {
          const inline_keyboard = buttons
            .map((row: any[]) =>
              row
                .filter((btn: any) => btn && btn.text && btn.url)
                .map((btn: any) => ({
                  text: btn.text,
                  url: btn.url,
                }))
            )
            .filter((row: any[]) => row.length > 0);

          if (inline_keyboard.length > 0) {
            replyMarkup = { inline_keyboard };
          }
        }

        const hasMedia = Array.isArray(media) && media.length > 0;
        // Files uploaded from the user's device are referenced by file_id, which
        // is not a URL and therefore cannot be embedded in rich HTML.
        const hasLocalMedia =
          hasMedia && media.some((item: any) => !/^https?:\/\//i.test(String(item?.url || '')));
        let tgRes: any = null;
        let tgData: any = null;

        const escapeAttr = (value: string) =>
          String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');

        const mediaToRichHtml = (items: any[]) =>
          items
            .map((item: any) => {
              const spoiler = item.isSpoiler ? ' tg-spoiler' : '';
              const src = escapeAttr(item.url);
              if (item.type === 'video') return `<video src="${src}"${spoiler}></video>`;
              if (item.type === 'audio') return `<audio src="${src}"></audio>`;
              return `<img src="${src}"${spoiler}/>`;
            })
            .join('');

        // Official Rich HTML for sendRichMessage (tables, math, hr, checklists, headings)
        let richHtml = String(htmlContent || '');
        richHtml = richHtml.replace(/\$\$([\s\S]*?)\$\$/g, '<tg-math-block>$1</tg-math-block>');
        richHtml = richHtml.replace(/\$([^$\n<]+)\$/g, '<tg-math>$1</tg-math>');
        if (hasMedia && !/<(img|video|audio)\b/i.test(richHtml)) {
          richHtml = mediaToRichHtml(media) + richHtml;
        }

        const classicHtml = String(fallbackHtml || htmlContent || '');

        if (!hasLocalMedia) {
          const richBody: any = {
            chat_id: targetChatId,
            rich_message: { html: richHtml },
            disable_notification: !!silent,
          };
          if (replyMarkup) richBody.reply_markup = replyMarkup;

          tgRes = await fetch(`https://api.telegram.org/bot${token}/sendRichMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(richBody),
          });
          tgData = await tgRes.json();
        }

        if (!tgData?.ok) {
          console.warn('[CHANNELS] sendRichMessage failed, using classic fallback...', tgData?.description);

          if (hasMedia && media.length === 1) {
            const item = media[0];
            let endpoint = 'sendPhoto';
            let mediaField = 'photo';
            if (item.type === 'video') {
              endpoint = 'sendVideo';
              mediaField = 'video';
            } else if (item.type === 'audio') {
              endpoint = 'sendAudio';
              mediaField = 'audio';
            }

            const reqBody: any = {
              chat_id: targetChatId,
              [mediaField]: item.url,
              caption: classicHtml.slice(0, 1024),
              parse_mode: 'HTML',
              disable_notification: !!silent,
            };
            if (item.type !== 'audio' && item.isSpoiler) reqBody.has_spoiler = true;
            if (replyMarkup) reqBody.reply_markup = replyMarkup;

            tgRes = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
            });
            tgData = await tgRes.json();
          } else if (hasMedia && media.length > 1) {
            const inputMedia = media.map((item: any, idx: number) => {
              const mObj: any = {
                type: item.type === 'video' ? 'video' : 'photo',
                media: item.url,
              };
              if (idx === 0 && classicHtml) {
                mObj.caption = classicHtml.slice(0, 1024);
                mObj.parse_mode = 'HTML';
              }
              if (item.isSpoiler) mObj.has_spoiler = true;
              return mObj;
            });

            tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetChatId,
                media: inputMedia,
                disable_notification: !!silent,
              }),
            });
            tgData = await tgRes.json();
          } else {
            const reqBody: any = {
              chat_id: targetChatId,
              text: classicHtml,
              parse_mode: 'HTML',
              disable_notification: !!silent,
            };
            if (replyMarkup) reqBody.reply_markup = replyMarkup;

            tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
            });
            tgData = await tgRes.json();
          }
        }

        // Auto-sanitize fallback on parse errors for maximum resilience
        if (!tgData?.ok && tgData?.description?.includes("can't parse entities")) {
          console.warn('[CHANNELS] HTML parse failed, sanitizing HTML and retrying...', tgData.description);
          const sanitized = classicHtml
            .replace(/<\/?(tg-math-block|tg-math|tg-map|tg-reference|aside|hr|mark|sub|sup)[^>]*>/gi, '')
            .replace(/<\/?(p|div|span(?!\s+class="tg-spoiler"))[^>]*>/gi, '')
            .replace(/<\/?(ul|ol|li)[^>]*>/gi, '')
            .replace(/<\/?(h[1-6]|table|tr|td|th|details|summary|figcaption)[^>]*>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n');

          if (hasMedia && media.length === 1) {
            const item = media[0];
            let endpoint = 'sendPhoto';
            let mediaField = 'photo';
            if (item.type === 'video') {
              endpoint = 'sendVideo';
              mediaField = 'video';
            } else if (item.type === 'audio') {
              endpoint = 'sendAudio';
              mediaField = 'audio';
            }

            const reqBody: any = {
              chat_id: targetChatId,
              [mediaField]: item.url,
              caption: sanitized.slice(0, 1024),
              parse_mode: 'HTML',
              disable_notification: !!silent,
            };
            if (item.type !== 'audio' && item.isSpoiler) reqBody.has_spoiler = true;
            if (replyMarkup) reqBody.reply_markup = replyMarkup;

            tgRes = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
            });
            tgData = await tgRes.json();
          } else {
            const reqBody: any = {
              chat_id: targetChatId,
              text: sanitized,
              parse_mode: 'HTML',
              disable_notification: !!silent,
            };
            if (replyMarkup) reqBody.reply_markup = replyMarkup;

            tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody),
            });
            tgData = await tgRes.json();
          }
        }

        if (!tgData?.ok) {
          return res.status(400).json({
            error: tgData?.description || 'Failed to post message to Telegram',
            tgError: tgData,
          });
        }

        return res.status(200).json({
          ok: true,
          messageId: tgData.result?.message_id,
          channelTitle: channel.title,
        });
      }

      // --- ACTION: LINK (DEFAULT) ---
      const { userId, chatIdentifier } = req.body;
      if (!userId || !chatIdentifier) {
        return res.status(400).json({ error: 'userId and chatIdentifier are required' });
      }

      let queryChatId = chatIdentifier.trim();
      if (typeof queryChatId === 'string' && !queryChatId.startsWith('@') && !queryChatId.startsWith('-')) {
        queryChatId = '@' + queryChatId;
      }

      // Step A: Check chat info via Telegram Bot API
      const chatInfoRes = await fetch(
        `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(queryChatId)}`
      );
      const chatInfo = (await chatInfoRes.json()) as any;

      if (!chatInfo.ok) {
        return res.status(400).json({
          error: `Bot could not find this channel/group. Make sure the bot is added to it first! (${chatInfo.description})`
        });
      }

      const chat = chatInfo.result;
      const validTypes = ['channel', 'group', 'supergroup'];
      if (!validTypes.includes(chat.type)) {
        return res.status(400).json({ error: 'Target must be a Telegram channel or group' });
      }

      // Step B: Check bot member status / permissions
      const botMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const botMe = (await botMeRes.json()) as any;
      const botId = botMe.result?.id;

      if (botId) {
        const memberRes = await fetch(
          `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chat.id}&user_id=${botId}`
        );
        const memberData = (await memberRes.json()) as any;
        if (memberData.ok) {
          const status = memberData.result.status;
          if (status !== 'administrator' && status !== 'creator' && chat.type === 'channel') {
            return res.status(400).json({
              error: 'The bot must be an Administrator in the channel with permission to post messages.'
            });
          }
        }
      }

      // Step C: Store in database
      const id = 'ch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const title = chat.title || chat.username || 'Telegram Group';
      const username = chat.username || null;
      const chatType = chat.type;
      const createdAt = Date.now();

      await db.query(
        `
        INSERT INTO user_channels (id, user_id, chat_id, title, username, chat_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, chat_id) DO UPDATE SET
          title = $4,
          username = $5,
          chat_type = $6
        RETURNING *
        `,
        [id, telegramUser.id, chat.id, title, username, chatType, createdAt]
      );

      return res.status(200).json({
        ok: true,
        channel: {
          id,
          userId: telegramUser.id,
          chatId: chat.id,
          title,
          username,
          chatType,
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Channels API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message || 'Unknown error' });
  }
}
