import pkg from './node_modules/pg/lib/index.js';
const { Pool } = pkg;

// Trigger release announcement directly via Telegram Bot API
const devBotToken = "8057285623:AAEk6Z-02fGvWJ9g76zC4z2E_v9V0tE_Xg4"; // dev bot token
const devDbUrl = "postgresql://postgres:hGkRrvlqYhGvWqvyTjZBNUvukNqKzBvO@junction.proxy.rlwy.net:45842/railway";

const releaseMessage = `✨ <b>Remigram Update</b> ✨\n\n` +
  `Мы обновили приложение, сделав его ещё быстрее, удобнее и безопаснее!\n\n` +
  `🛡 <b>Усиленная безопасность и приватность</b>\n` +
  `Все ваши напоминания теперь защищены современным шифрованием следующего поколения. Ваши личные данные и задачи полностью конфиденциальны.\n\n` +
  `🎨 <b>Новый дизайн и плавные анимации</b>\n` +
  `Обновлён интерфейс карточек в Inbox: минималистичный стиль, приятные микро-анимации завершения задач и удобное управление статусами.\n\n` +
  `👥 <b>Улучшенные напоминания друзьям</b>\n` +
  `Живой мониторинг выполнения: создатель видит статус задачи в реальном времени, а получатель может брать её в работу и отмечать выполнение в один клик.\n\n` +
  `📱 <b>Идеальное отображение на смартфонах</b>\n` +
  `Интерфейс оптимизирован под экраны мобильных устройств — навигация работает плавно и не перекрывает кнопки действий.\n\n` +
  `━━━━━━━━━━━━━━━\n` +
  `🚀 Откройте приложение, чтобы оценить обновление!`;

const replyMarkup = {
  inline_keyboard: [
    [
      {
        text: '🚀 Open Remigram',
        web_app: { url: 'https://frontend-dev-production-b4d9.up.railway.app' }
      }
    ]
  ]
};

async function broadcast() {
  const pool = new Pool({ connectionString: devDbUrl });
  try {
    const res = await pool.query(`
      SELECT DISTINCT user_id FROM (
        SELECT user_id FROM bot_users
        UNION
        SELECT user_id FROM user_settings
        UNION
        SELECT user_id FROM reminders
        UNION
        SELECT CAST(assigned_to_chat_id AS bigint) AS user_id FROM reminders WHERE assigned_to_chat_id IS NOT NULL
      ) all_users
      WHERE user_id IS NOT NULL
    `);

    const userIds = res.rows.map(r => Number(r.user_id)).filter(n => !isNaN(n) && n > 0);
    console.log(`Found ${userIds.length} users on dev line:`, userIds);

    let sent = 0;
    let failed = 0;

    for (const chatId of userIds) {
      try {
        console.log(`Sending to chatId: ${chatId}...`);
        const r = await fetch(`https://api.telegram.org/bot${devBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: releaseMessage,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });
        const d = await r.json();
        if (d.ok) {
          console.log(`✅ Successfully sent to ${chatId}`);
          sent++;
        } else {
          console.log(`❌ Failed to send to ${chatId}:`, d.description);
          failed++;
        }
      } catch (err) {
        console.log(`❌ Network error for ${chatId}:`, err.message);
        failed++;
      }
    }

    console.log(`\n🎉 Broadcast Finished! Sent: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error('Broadcast error:', err);
  } finally {
    await pool.end();
  }
}

broadcast();
