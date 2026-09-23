import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

/**
 * Hidden admin monitoring/statistics endpoint with Visual Dashboard
 * Access: GET /api/admin-stats?key=<ADMIN_SECRET>
 * 
 * Returns:
 * - HTML Visual Dashboard by default in browsers
 * - JSON if format=json or header Accept is application/json
 */

const ADMIN_SECRET = process.env.ADMIN_STATS_KEY || 'noro_monitor_2024_secret';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Secret key check
  const { key, format } = req.query;
  if (!key || key !== ADMIN_SECRET) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const db = getDb();

    // 1. All registered users
    const usersResult = await db.query(`
      SELECT user_id, username, first_name, last_name, registered_at
      FROM bot_users
      ORDER BY registered_at DESC
    `);

    // 2. Connection counts per user
    const connectionsResult = await db.query(`
      SELECT user_id_1 as user_id, COUNT(*) as friend_count
      FROM user_connections
      GROUP BY user_id_1
      ORDER BY friend_count DESC
    `);
    const connectionMap = new Map<string, number>();
    for (const row of connectionsResult.rows) {
      connectionMap.set(String(row.user_id), parseInt(row.friend_count));
    }

    // 3. Reminder counts per user
    const reminderStatsResult = await db.query(`
      SELECT 
        user_id,
        COUNT(*) as total_reminders,
        COUNT(*) FILTER (WHERE status = 'done' OR done = true) as done_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE (status = 'todo' OR status IS NULL) AND (done = false OR done IS NULL)) as active_count,
        MAX(created_at) as last_reminder_created,
        MIN(created_at) as first_reminder_created
      FROM reminders
      GROUP BY user_id
      ORDER BY total_reminders DESC
    `);
    const reminderMap = new Map<string, any>();
    for (const row of reminderStatsResult.rows) {
      reminderMap.set(String(row.user_id), {
        total: parseInt(row.total_reminders),
        done: parseInt(row.done_count),
        inProgress: parseInt(row.in_progress_count),
        active: parseInt(row.active_count),
        lastCreated: row.last_reminder_created ? Number(row.last_reminder_created) : null,
        firstCreated: row.first_reminder_created ? Number(row.first_reminder_created) : null,
      });
    }

    // 4. Total reminders in system
    const totalRemindersResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'done' OR done = true) as done,
        COUNT(*) FILTER (WHERE (status = 'todo' OR status IS NULL) AND (done = false OR done IS NULL)) as active,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
      FROM reminders
    `);

    // 5. Total connections
    const totalConnectionsResult = await db.query(`
      SELECT COUNT(*) as total FROM user_connections
    `);

    // 6. Assigned (shared) reminders
    const sharedRemindersResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM reminders 
      WHERE assigned_to IS NOT NULL AND assigned_to != ''
    `);

    // 7. Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentResult = await db.query(`
      SELECT COUNT(*) as recent_reminders 
      FROM reminders 
      WHERE created_at > $1
    `, [sevenDaysAgo]);

    // 8. User settings (Notion integrations)
    let notionUsersCount = 0;
    try {
      const notionResult = await db.query(`
        SELECT COUNT(*) as total 
        FROM user_settings 
        WHERE notion_token IS NOT NULL AND notion_token != ''
      `);
      notionUsersCount = parseInt(notionResult.rows[0]?.total || '0');
    } catch {
      // ignore
    }

    // Build per-user report
    const users = usersResult.rows.map((u: any) => {
      const uid = String(u.user_id);
      const reminders = reminderMap.get(uid) || { total: 0, done: 0, inProgress: 0, active: 0, lastCreated: null, firstCreated: null };
      const friendCount = connectionMap.get(uid) || 0;

      return {
        userId: String(u.user_id),
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        registeredAt: u.registered_at ? Number(u.registered_at) : null,
        friends: friendCount,
        reminders: reminders,
      };
    });

    const systemTotals = totalRemindersResult.rows[0];

    const data = {
      generatedAt: new Date().toISOString(),
      system: {
        totalUsers: usersResult.rows.length,
        totalConnections: Math.floor(parseInt(totalConnectionsResult.rows[0]?.total || '0') / 2),
        totalReminders: parseInt(systemTotals?.total || '0'),
        activeReminders: parseInt(systemTotals?.active || '0'),
        doneReminders: parseInt(systemTotals?.done || '0'),
        inProgressReminders: parseInt(systemTotals?.in_progress || '0'),
        sharedReminders: parseInt(sharedRemindersResult.rows[0]?.total || '0'),
        remindersLast7Days: parseInt(recentResult.rows[0]?.recent_reminders || '0'),
        notionIntegrations: notionUsersCount,
      },
      users,
    };

    // If client explicitly requested JSON (query param format=json or header Accept is json and NOT html)
    const wantsJson = format === 'json' || (req.headers.accept?.includes('application/json') && !req.headers.accept?.includes('text/html'));
    if (wantsJson) {
      return res.status(200).json(data);
    }

    // Otherwise render visual dashboard HTML
    const html = renderDashboardHtml(data, String(key));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    console.error('[ADMIN-STATS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function renderDashboardHtml(data: any, key: string): string {
  const jsonString = JSON.stringify(data);
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Yerevan' });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remigram • Мониторинг</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.25);
      --green: #10b981;
      --yellow: #f59e0b;
      --purple: #8b5cf6;
      --text: #f3f4f6;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 24px 16px;
      line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    .header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 28px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      background: #34d399;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .btn {
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      border: none;
      font-family: inherit;
    }
    .btn-primary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid var(--card-border);
    }
    .btn-primary:hover { background: #334155; }
    .btn-accent {
      background: var(--accent);
      color: #fff;
    }
    .btn-accent:hover { background: #2563eb; }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 18px;
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      border-color: #334155;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    .metric-blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .metric-purple::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
    .metric-green::before { background: linear-gradient(90deg, #10b981, #34d399); }
    .metric-amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .metric-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .metric-icon { font-size: 18px; opacity: 0.9; }
    .metric-value {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .metric-sub {
      font-size: 12px;
      color: var(--text-dim);
    }

    /* Table Section */
    .section-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-count {
      font-size: 13px;
      background: #1e293b;
      padding: 2px 10px;
      border-radius: 999px;
      color: var(--text-muted);
      border: 1px solid var(--card-border);
    }
    .search-box {
      position: relative;
      min-width: 260px;
    }
    .search-input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 10px 14px 10px 38px;
      border-radius: 10px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus { border-color: var(--accent); }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      font-size: 14px;
      pointer-events: none;
    }

    /* Table */
    .table-wrap {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #0d1322;
      padding: 14px 16px;
      font-weight: 700;
      color: var(--text-muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--card-border);
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #1a2336;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(30, 41, 59, 0.4); }

    /* User Cell */
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #334155, #1e293b);
      color: #93c5fd;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(148, 163, 184, 0.15);
      flex-shrink: 0;
    }
    .user-name { font-weight: 700; color: #fff; line-height: 1.2; }
    .user-handle {
      color: #60a5fa;
      font-size: 12px;
      text-decoration: none;
      display: inline-block;
      margin-top: 2px;
      font-family: 'JetBrains Mono', monospace;
    }
    .user-handle:hover { text-decoration: underline; }
    .user-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-dim);
      display: block;
      margin-top: 2px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
    }
    .badge-friends {
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
    .badge-active {
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-done {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-zero {
      background: rgba(100, 116, 139, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(100, 116, 139, 0.25);
    }

    .reminders-breakdown {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .stat-pill {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .stat-pill.todo { background: #1e293b; color: #cbd5e1; }
    .stat-pill.done { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-pill.prog { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

    .date-text {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .date-rel {
      font-size: 11px;
      color: var(--text-dim);
      display: block;
    }

    /* Footer */
    .footer {
      margin-top: 36px;
      text-align: center;
      font-size: 12px;
      color: var(--text-dim);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .table-wrap { overflow-x: auto; }
      th, td { padding: 10px 12px; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .header { flex-direction: column; align-items: flex-start; }
      .search-box { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">⚡</div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;">
            <h1 class="brand-title">Remigram</h1>
            <span class="brand-badge"><span class="pulse-dot"></span> Живой мониторинг</span>
          </div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">
            Скрытая панель статистики системы • Обновлено: <span id="update-time">${now}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" onclick="location.reload()">🔄 Обновить</button>
        <a class="btn btn-primary" href="?key=${key}&format=json" target="_blank">{ } Сырой JSON</a>
      </div>
    </header>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card metric-blue">
        <div class="metric-header">
          <span class="metric-title">Пользователи</span>
          <span class="metric-icon">👥</span>
        </div>
        <div class="metric-value">${data.system.totalUsers}</div>
        <div class="metric-sub">Всего в базе bot_users</div>
      </div>

      <div class="metric-card metric-purple">
        <div class="metric-header">
          <span class="metric-title">Связи друзей</span>
          <span class="metric-icon">🔗</span>
        </div>
        <div class="metric-value">${data.system.totalConnections}</div>
        <div class="metric-sub">Двусторонних контактов</div>
      </div>

      <div class="metric-card metric-green">
        <div class="metric-header">
          <span class="metric-title">Всего напоминаний</span>
          <span class="metric-icon">📝</span>
        </div>
        <div class="metric-value">${data.system.totalReminders}</div>
        <div class="metric-sub">Активных: ${data.system.activeReminders} • Готово: ${data.system.doneReminders}</div>
      </div>

      <div class="metric-card metric-amber">
        <div class="metric-header">
          <span class="metric-title">Активность (7 дней)</span>
          <span class="metric-icon">⚡</span>
        </div>
        <div class="metric-value">${data.system.remindersLast7Days}</div>
        <div class="metric-sub">Новых напоминаний за неделю</div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="section-header">
      <div class="section-title">
        <span>Пользователи системы</span>
        <span class="section-count" id="users-count">${data.users.length}</span>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="search" class="search-input" placeholder="Поиск по имени, username или ID..." oninput="filterUsers()">
      </div>
    </div>

    <div class="table-wrap">
      <table id="users-table">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>ID Telegram</th>
            <th>Друзей</th>
            <th>Напоминания</th>
            <th>Регистрация</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map((u: any) => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Без имени';
            const initial = (u.firstName || u.username || '?').charAt(0).toUpperCase();
            const dateStr = u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            const timeStr = u.registeredAt ? new Date(u.registeredAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
            const totalR = u.reminders.total;
            const activeR = u.reminders.active;
            const doneR = u.reminders.done;
            const inProgR = u.reminders.inProgress;

            return `
            <tr class="user-row" data-search="${(name + ' ' + (u.username || '') + ' ' + u.userId).toLowerCase()}">
              <td>
                <div class="user-cell">
                  <div class="user-avatar">${initial}</div>
                  <div>
                    <div class="user-name">${escapeHtml(name)}</div>
                    ${u.username ? `<a class="user-handle" href="https://t.me/${u.username}" target="_blank">@${escapeHtml(u.username)}</a>` : `<span style="color:var(--text-dim);font-size:12px;">без username</span>`}
                  </div>
                </div>
              </td>
              <td>
                <span class="user-id">${u.userId}</span>
              </td>
              <td>
                <span class="badge ${u.friends > 0 ? 'badge-friends' : 'badge-zero'}">
                  👥 ${u.friends}
                </span>
              </td>
              <td>
                ${totalR === 0 ? `<span class="badge badge-zero">0</span>` : `
                  <div class="reminders-breakdown">
                    <span class="stat-pill todo" title="Всего">${totalR} всего</span>
                    ${activeR > 0 ? `<span class="stat-pill todo" style="color:#60a5fa;" title="Активно">⚡ ${activeR}</span>` : ''}
                    ${doneR > 0 ? `<span class="stat-pill done" title="Завершено">✓ ${doneR}</span>` : ''}
                    ${inProgR > 0 ? `<span class="stat-pill prog" title="В процессе">⏳ ${inProgR}</span>` : ''}
                  </div>
                `}
              </td>
              <td>
                <span class="date-text">${dateStr}</span>
                <span class="date-rel">${timeStr}</span>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <footer class="footer">
      <span>🔒 Скрытый мониторинг Remigram</span>
      <span>•</span>
      <span>Доступ только по ключу</span>
    </footer>
  </div>

  <script>
    function filterUsers() {
      const q = document.getElementById('search').value.toLowerCase().trim();
      const rows = document.querySelectorAll('.user-row');
      let visible = 0;
      rows.forEach(row => {
        const text = row.getAttribute('data-search') || '';
        const match = !q || text.includes(q);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      document.getElementById('users-count').innerText = visible;
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
